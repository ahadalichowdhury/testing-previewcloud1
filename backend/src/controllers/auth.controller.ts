import { Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import { AuthService } from "../services/auth.service";
import { logger } from "../utils/logger";

const authService = new AuthService();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *           example:
 *             email: "developer@example.com"
 *             password: "SecurePass123!"
 *             name: "John Doe"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     token:
 *                       type: string
 *                     apiToken:
 *                       type: string
 *       400:
 *         description: Bad request
 */
export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      throw new AppError("Email, password, and name are required", 400);
    }

    if (password.length < 8) {
      throw new AppError("Password must be at least 8 characters", 400);
    }

    const { user, token } = await authService.signup({ email, password, name });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
        token,
        apiToken: user.apiToken,
      },
      message: "User created successfully. Please verify your email.",
    });
  } catch (error) {
    logger.error("Signup error:", error);
    throw error;
  }
}

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user and return JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *           example:
 *             email: "developer@example.com"
 *             password: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     token:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    const { user, token } = await authService.login({ email, password });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          emailVerified: user.emailVerified,
          apiToken: user.apiToken,
        },
        token,
      },
      message: "Login successful",
    });
  } catch (error) {
    logger.error("Login error:", error);
    throw error;
  }
}

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     description: Get the authenticated user's information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user;

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        emailVerified: user.emailVerified,
        apiToken: user.apiToken,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    logger.error("Get me error:", error);
    throw error;
  }
}

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email address
 *     description: Verify user's email using verification token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.body;

    if (!token) {
      throw new AppError("Verification token is required", 400);
    }

    const user = await authService.verifyEmail(token);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified,
      },
      message: "Email verified successfully",
    });
  } catch (error) {
    logger.error("Verify email error:", error);
    throw error;
  }
}

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Send password reset email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
export async function forgotPassword(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400);
    }

    await authService.requestPasswordReset(email);

    res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    logger.error("Forgot password error:", error);
    throw error;
  }
}

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     description: Reset user password using reset token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
export async function resetPassword(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new AppError("Token and new password are required", 400);
    }

    if (password.length < 8) {
      throw new AppError("Password must be at least 8 characters", 400);
    }

    await authService.resetPassword(token, password);

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now login.",
    });
  } catch (error) {
    logger.error("Reset password error:", error);
    throw error;
  }
}

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     description: Update authenticated user's profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
export async function updateProfile(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = (req as any).user;
    const { name, email } = req.body;

    const updatedUser = await authService.updateProfile(user._id, {
      name,
      email,
    });

    res.status(200).json({
      success: true,
      data: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        emailVerified: updatedUser.emailVerified,
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    logger.error("Update profile error:", error);
    throw error;
  }
}

/**
 * @swagger
 * /api/auth/api-token:
 *   post:
 *     summary: Regenerate API token
 *     description: Generate a new API token for the user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API token regenerated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     apiToken:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
export async function regenerateApiToken(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = (req as any).user;

    const newApiToken = await authService.regenerateApiToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        apiToken: newApiToken,
      },
      message: "API token regenerated successfully",
    });
  } catch (error) {
    logger.error("Regenerate API token error:", error);
    throw error;
  }
}

