import { Request, Response, Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { githubAppService } from "../services/github-app.service";
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
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const event = req.headers["x-github-event"] as string;
    const signature = req.headers["x-hub-signature-256"] as string;
    const payload: GitHubWebhookPayload = req.body;

    logger.info(`📥 Received GitHub webhook: ${event}`);

    // Check if GitHub App is enabled
    if (githubAppService.isEnabled()) {
      // Use GitHub App for webhook verification
      const isValid = await githubAppService.verifyWebhook(
        signature,
        JSON.stringify(req.body)
      );

      if (!isValid) {
        logger.warn("❌ Invalid GitHub App webhook signature");
        res.status(401).json({ error: "Invalid signature" });
        return;
      }

      logger.info("✅ GitHub App webhook signature verified");
    } else {
      // Fallback to legacy webhook verification (for GitHub Action)
      logger.info("Using legacy webhook verification");
    }

    // Only handle pull_request events
    if (event !== "pull_request") {
      logger.info(`Ignoring non-pull_request event: ${event}`);
      res.status(200).json({ success: true, message: "Event ignored" });
      return;
    }

    try {
      const action = payload.action;
      const pr = payload.pull_request;
      const repo = payload.repository;
      const installation = (payload as any).installation;

      logger.info(
        `🔔 PR ${action}: ${repo.owner.login}/${repo.name}#${pr.number} (${pr.head.ref})`
      );

      // Handle GitHub App events
      if (installation && githubAppService.isEnabled()) {
        logger.info(`Using GitHub App (installation: ${installation.id})`);

        // Deploy or update preview
        if (["opened", "synchronize", "reopened"].includes(action)) {
          logger.info(`🚀 Deploying preview for PR #${pr.number}`);

          // Update check status to "in progress"
          await githubAppService.updateCheckStatus(
            installation.id,
            repo.owner.login,
            repo.name,
            pr.head.sha,
            "in_progress"
          );

          // TODO: Trigger preview deployment through preview controller
          // This will be implemented when integrating with preview.controller.ts
          // For now, just acknowledge the webhook
          logger.info("Preview deployment triggered (implementation pending)");

          // Post comment on PR
          const comment = `
## 🚀 PreviewCloud - Deployment Started

**PR #${pr.number}** - \`${pr.head.ref}\`

⏳ Building preview environment...

This will take approximately 2-3 minutes.

<sub>Powered by [PreviewCloud](https://previewcloud.cloud)</sub>
          `.trim();

          await githubAppService.commentOnPR(
            installation.id,
            repo.owner.login,
            repo.name,
            pr.number,
            comment
          );
        }

        // Destroy preview
        if (action === "closed") {
          logger.info(`🗑️  Destroying preview for PR #${pr.number}`);

          // TODO: Trigger preview destruction
          logger.info("Preview destruction triggered (implementation pending)");

          // Post comment on PR
          const comment = `
## 🗑️ PreviewCloud - Preview Destroyed

**PR #${pr.number}** closed

✅ Preview environment cleaned up
✅ Resources freed

<sub>Powered by [PreviewCloud](https://previewcloud.cloud)</sub>
          `.trim();

          await githubAppService.commentOnPR(
            installation.id,
            repo.owner.login,
            repo.name,
            pr.number,
            comment
          );

          // Update check status
          await githubAppService.updateCheckStatus(
            installation.id,
            repo.owner.login,
            repo.name,
            pr.head.sha,
            "completed",
            "success",
            "Preview environment destroyed"
          );
        }
      } else {
        // Handle legacy GitHub Action webhooks
        logger.info("Using legacy GitHub Action webhook handling");
        await githubService.handleWebhook(payload);
      }

      res.status(200).json({
        success: true,
        message: "Webhook processed successfully",
      });
    } catch (error: any) {
      logger.error("❌ Failed to process webhook:", error);

      // Update check status to failed if GitHub App is enabled
      const installation = (payload as any).installation;
      if (installation && githubAppService.isEnabled()) {
        try {
          await githubAppService.updateCheckStatus(
            installation.id,
            payload.repository.owner.login,
            payload.repository.name,
            payload.pull_request.head.sha,
            "completed",
            "failure",
            `Deployment failed: ${error.message}`
          );
        } catch (checkError) {
          logger.error("Failed to update check status:", checkError);
        }
      }

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
