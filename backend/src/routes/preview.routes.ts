import { Router } from "express";
import * as logsController from "../controllers/logs.controller";
import * as previewController from "../controllers/preview.controller";
import { verifyApiToken } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

/**
 * @swagger
 * /api/previews:
 *   post:
 *     summary: Create or update a preview environment
 *     tags: [Previews]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prNumber
 *               - repoOwner
 *               - repoName
 *               - branch
 *             properties:
 *               prNumber:
 *                 type: number
 *               repoOwner:
 *                 type: string
 *               repoName:
 *                 type: string
 *               branch:
 *                 type: string
 *               services:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Preview created/updated successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/",
  verifyApiToken,
  asyncHandler(previewController.createOrUpdatePreview)
);

/**
 * @swagger
 * /api/previews:
 *   get:
 *     summary: List all preview environments
 *     tags: [Previews]
 *     responses:
 *       200:
 *         description: List of previews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: number
 */
router.get("/", asyncHandler(previewController.listPreviews));

/**
 * @swagger
 * /api/previews/{previewId}/status:
 *   get:
 *     summary: Get preview status
 *     tags: [Previews]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: previewId
 *         required: true
 *         schema:
 *           type: string
 *         description: Preview ID (pr-{number} or branch-{name})
 *     responses:
 *       200:
 *         description: Preview status
 *       404:
 *         description: Preview not found
 */
router.get(
  "/:previewId/status",
  verifyApiToken,
  asyncHandler(previewController.getPreviewStatus)
);

/**
 * @swagger
 * /api/previews/{prNumber}:
 *   get:
 *     summary: Get preview environment details
 *     tags: [Previews]
 *     parameters:
 *       - in: path
 *         name: prNumber
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pull request number
 *     responses:
 *       200:
 *         description: Preview details
 *       404:
 *         description: Preview not found
 */
router.get("/:prNumber", asyncHandler(previewController.getPreview));

/**
 * @swagger
 * /api/previews/{prNumber}:
 *   delete:
 *     summary: Destroy a preview environment
 *     tags: [Previews]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: prNumber
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pull request number
 *     responses:
 *       200:
 *         description: Preview destroyed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Preview not found
 */
router.delete(
  "/:prNumber",
  verifyApiToken,
  asyncHandler(previewController.destroyPreview)
);

/**
 * @swagger
 * /api/previews/{prNumber}/logs:
 *   get:
 *     summary: Get preview logs
 *     tags: [Logs]
 *     parameters:
 *       - in: path
 *         name: prNumber
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pull request number
 *     responses:
 *       200:
 *         description: Preview logs
 *       404:
 *         description: Preview not found
 */
router.get("/:prNumber/logs", asyncHandler(logsController.getLogs));

/**
 * @swagger
 * /api/previews/{prNumber}/logs/paginated:
 *   get:
 *     summary: Get paginated preview logs
 *     tags: [Logs]
 *     parameters:
 *       - in: path
 *         name: prNumber
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Paginated logs
 */
router.get(
  "/:prNumber/logs/paginated",
  asyncHandler(logsController.getPaginatedLogs)
);

/**
 * @swagger
 * /api/previews/{prNumber}/logs/stats:
 *   get:
 *     summary: Get log statistics
 *     tags: [Logs]
 *     parameters:
 *       - in: path
 *         name: prNumber
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Log statistics
 */
router.get("/:prNumber/logs/stats", asyncHandler(logsController.getLogStats));

// Note: WebSocket routes are handled in index.ts with express-ws

export default router;
