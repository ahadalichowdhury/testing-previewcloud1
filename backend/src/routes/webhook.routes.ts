import { Request, Response, Router } from "express";
import { verifyGitHubWebhook } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import {
  GitHubService,
  GitHubWebhookPayload,
} from "../services/github.service";
import { logger } from "../utils/logger";

const router = Router();
const githubService = new GitHubService();

/**
 * @swagger
 * /api/webhooks/github:
 *   post:
 *     summary: GitHub webhook handler
 *     description: Handles GitHub webhook events for pull requests
 *     tags: [Webhooks]
 *     security:
 *       - webhookSignature: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: GitHub webhook payload
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Invalid webhook signature
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/github",
  verifyGitHubWebhook,
  asyncHandler(async (req: Request, res: Response) => {
    const event = req.headers["x-github-event"] as string;
    const payload: GitHubWebhookPayload = req.body;

    logger.info(`Received GitHub webhook: ${event}`);

    // Only handle pull_request events
    if (event !== "pull_request") {
      logger.info(`Ignoring non-pull_request event: ${event}`);
      res.status(200).json({ success: true, message: "Event ignored" });
      return;
    }

    try {
      await githubService.handleWebhook(payload);

      res.status(200).json({
        success: true,
        message: "Webhook processed successfully",
      });
    } catch (error) {
      logger.error("Failed to process webhook:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process webhook",
      });
    }
  })
);

/**
 * @swagger
 * /api/webhooks/github:
 *   get:
 *     summary: Webhook endpoint health check
 *     description: Check if the GitHub webhook endpoint is ready to receive events
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Webhook endpoint is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "GitHub webhook endpoint is ready"
 */
router.get("/github", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "GitHub webhook endpoint is ready",
  });
});

export default router;
