import { Router } from "express";
import {
  forgotPassword,
  getMe,
  login,
  regenerateApiToken,
  resetPassword,
  signup,
  updateProfile,
  verifyEmail,
} from "../controllers/auth.controller";
import { authenticateUser } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

// Public routes
router.post("/signup", asyncHandler(signup));
router.post("/login", asyncHandler(login));
router.post("/verify-email", asyncHandler(verifyEmail));
router.post("/forgot-password", asyncHandler(forgotPassword));
router.post("/reset-password", asyncHandler(resetPassword));

// Protected routes (require authentication)
router.get("/me", authenticateUser, asyncHandler(getMe));
router.put("/profile", authenticateUser, asyncHandler(updateProfile));
router.post("/api-token", authenticateUser, asyncHandler(regenerateApiToken));

export default router;
