import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { IUser, User } from "../models/User.model";
import { logger } from "../utils/logger";
import { AppError } from "./errorHandler";

export interface AuthRequest extends Request {
  user?: IUser;
}

/**
 * Authenticate user via JWT (for dashboard/frontend)
 */
export async function authenticateUser(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError("No authorization header provided", 401);
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      throw new AppError("No token provided", 401);
    }

    // Verify JWT
    const decoded = jwt.verify(token, config.jwtSecret) as any;

    // Get user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError("User not found", 401);
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    logger.error("Authentication error:", error);
    next(error);
  }
}

/**
 * Middleware to verify API token (for GitHub Actions/API)
 */
export async function verifyApiToken(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError("No authorization header provided", 401);
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      throw new AppError("No token provided", 401);
    }

    // Check if token starts with "pc_" (user API token)
    if (token.startsWith("pc_")) {
      // User API token - look up user
      const user = await User.findOne({ apiToken: token });
      if (!user) {
        throw new AppError("Invalid API token", 401);
      }
      req.user = user;
      next();
    } else {
      // Try JWT token
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as any;
        const user = await User.findById(decoded.id);
        if (!user) {
          throw new AppError("User not found", 401);
        }
        req.user = user;
        next();
      } catch (error) {
        throw new AppError("Invalid API token", 401);
      }
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to verify GitHub webhook signature
 */
export function verifyGitHubWebhook(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const signature = req.headers["x-hub-signature-256"] as string;

    if (!signature) {
      throw new AppError("No signature provided", 401);
    }

    const hmac = crypto.createHmac("sha256", config.githubWebhookSecret);
    const digest =
      "sha256=" + hmac.update(JSON.stringify(req.body)).digest("hex");

    if (signature !== digest) {
      logger.warn("Invalid GitHub webhook signature");
      throw new AppError("Invalid signature", 401);
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
export async function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        if (token.startsWith("pc_")) {
          // User API token
          const user = await User.findOne({ apiToken: token });
          if (user) {
            req.user = user;
          }
        } else {
          // JWT token
          const decoded = jwt.verify(token, config.jwtSecret) as any;
          const user = await User.findById(decoded.id);
          if (user) {
            req.user = user;
          }
        }
      } catch (error) {
        // Invalid token, but we don't fail - just proceed without auth
        logger.debug("Optional auth failed, proceeding without authentication");
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}
