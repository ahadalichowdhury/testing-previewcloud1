import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { AppError } from "../middleware/errorHandler";
import { IUser, User } from "../models/User.model";
import { logger } from "../utils/logger";
import { emailService } from "./email.service";

export class AuthService {
  /**
   * Register a new user
   */
  async signup(data: {
    email: string;
    password: string;
    name: string;
  }): Promise<{ user: IUser; token: string }> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        throw new AppError("Email already registered", 400);
      }

      // Create user
      const user = await User.create({
        email: data.email,
        password: data.password,
        name: data.name,
        plan: "free",
      });

      // Generate email verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      // Send verification email
      await emailService.sendVerificationEmail(
        user.email,
        user.name,
        verificationToken
      );
      logger.info(`Verification email sent to ${user.email}`);

      // Generate JWT
      const token = this.generateJWT(user);

      logger.info(`User registered: ${user.email}`);

      return { user, token };
    } catch (error) {
      logger.error("Signup error:", error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(data: {
    email: string;
    password: string;
  }): Promise<{ user: IUser; token: string }> {
    try {
      // Find user with password field
      const user = await User.findOne({ email: data.email }).select(
        "+password"
      );

      if (!user) {
        throw new AppError("Invalid email or password", 401);
      }

      // Check password
      const isPasswordValid = await user.comparePassword(data.password);
      if (!isPasswordValid) {
        throw new AppError("Invalid email or password", 401);
      }

      // Generate JWT
      const token = this.generateJWT(user);

      logger.info(`User logged in: ${user.email}`);

      // Remove password from response
      user.password = undefined as any;

      return { user, token };
    } catch (error) {
      logger.error("Login error:", error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return user;
  }

  /**
   * Get user by API token
   */
  async getUserByApiToken(apiToken: string): Promise<IUser> {
    const user = await User.findOne({ apiToken });
    if (!user) {
      throw new AppError("Invalid API token", 401);
    }
    return user;
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<IUser> {
    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new AppError("Invalid or expired verification token", 400);
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    logger.info(`Email verified for user: ${user.email}`);

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.name);

    return user;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    const resetToken = user.generateResetPasswordToken();
    await user.save();

    // Send password reset email
    await emailService.sendPasswordResetEmail(
      user.email,
      user.name,
      resetToken
    );
    logger.info(`Password reset email sent to ${user.email}`);
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<IUser> {
    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    logger.info(`Password reset for user: ${user.email}`);

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: { name?: string; email?: string }
  ): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (data.name) user.name = data.name;
    if (data.email && data.email !== user.email) {
      // Check if new email is already taken
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        throw new AppError("Email already in use", 400);
      }
      user.email = data.email;
      user.emailVerified = false; // Re-verify email

      // Generate new verification token
      const verificationToken = user.generateEmailVerificationToken();
      logger.info(`New verification token: ${verificationToken}`);
    }

    await user.save();

    logger.info(`Profile updated for user: ${user.email}`);

    return user;
  }

  /**
   * Generate API token for user
   */
  async regenerateApiToken(userId: string): Promise<string> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    user.apiToken = user.generateApiToken();
    await user.save();

    logger.info(`API token regenerated for user: ${user.email}`);

    return user.apiToken;
  }

  /**
   * Generate JWT token
   */
  private generateJWT(user: IUser): string {
    return jwt.sign(
      {
        id: user._id,
        email: user.email,
        plan: user.plan,
      },
      config.jwtSecret,
      {
        expiresIn: "30d",
      }
    );
  }

  /**
   * Verify JWT token
   */
  verifyJWT(token: string): any {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (error) {
      throw new AppError("Invalid token", 401);
    }
  }
}
