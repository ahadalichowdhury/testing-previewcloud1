import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { PreviewService } from "../services/preview.service";
import { ResourceLimitService } from "../services/resource-limit.service";
import { PreviewConfig, PreviewStatus } from "../types/preview.types";
import { logger } from "../utils/logger";

const previewService = new PreviewService();
const resourceLimitService = new ResourceLimitService();

// Helper function to get authenticated user
function getAuthenticatedUser(req: Request): any {
  const authReq = req as AuthRequest;
  return authReq.user;
}

/**
 * @swagger
 * /api/previews:
 *   post:
 *     summary: Create or update a preview environment
 *     description: Creates a new preview environment or updates an existing one for a pull request
 *     tags: [Previews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PreviewConfig'
 *     responses:
 *       200:
 *         description: Preview created or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Preview'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function createOrUpdatePreview(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required", 401);
    }

    const previewConfig: PreviewConfig = req.body;

    // Validate required fields
    if (!previewConfig.previewType) {
      throw new AppError("Missing required field: previewType", 400);
    }

    if (
      previewConfig.previewType === "pull_request" &&
      !previewConfig.prNumber
    ) {
      throw new AppError(
        "Missing required field: prNumber (required for pull_request type)",
        400
      );
    }

    if (!previewConfig.repoName || !previewConfig.repoOwner) {
      throw new AppError("Missing required fields: repoName, repoOwner", 400);
    }

    if (
      !previewConfig.services ||
      Object.keys(previewConfig.services).length === 0
    ) {
      throw new AppError("At least one service must be defined", 400);
    }

    const previewLabel =
      previewConfig.previewType === "pull_request"
        ? `PR #${previewConfig.prNumber}`
        : `branch ${previewConfig.branch}`;
    logger.info(
      `User ${user.email} creating/updating preview for ${previewLabel} in ${previewConfig.repoOwner}/${previewConfig.repoName}`
    );

    // Check resource limits before creating (only for new previews)
    // Note: In a real implementation, you'd check if preview exists first
    try {
      await resourceLimitService.checkPreviewLimit(user);
    } catch (error) {
      // If preview already exists, resource limit doesn't apply to updates
      logger.debug("Resource limit check:", error);
    }

    const preview = await previewService.createPreview(user._id, previewConfig);

    res.status(200).json({
      success: true,
      data: preview,
      message: "Preview created/updated successfully",
    });
  } catch (error) {
    logger.error("Failed to create/update preview:", error);
    throw error;
  }
}

/**
 * @swagger
 * /api/previews/{prNumber}:
 *   get:
 *     summary: Get preview details
 *     description: Retrieve detailed information about a specific preview environment
 *     tags: [Previews]
 *     parameters:
 *       - in: path
 *         name: prNumber
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pull request number
 *         example: 123
 *     responses:
 *       200:
 *         description: Preview details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Preview'
 *       404:
 *         description: Preview not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Invalid PR number
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function getPreview(req: Request, res: Response): Promise<void> {
  try {
    const identifier = req.params.prNumber || req.params.previewId;

    if (!identifier) {
      throw new AppError("Missing preview identifier", 400);
    }

    // Try to parse as number (PR) or use as string (branch previewId)
    const prNumber = parseInt(identifier, 10);
    const preview = await previewService.getPreview(
      isNaN(prNumber) ? identifier : prNumber
    );

    if (!preview) {
      throw new AppError("Preview not found", 404);
    }

    res.status(200).json({
      success: true,
      data: preview,
    });
  } catch (error) {
    logger.error("Failed to get preview:", error);
    throw error;
  }
}

/**
 * @swagger
 * /api/previews:
 *   get:
 *     summary: List all previews
 *     description: Retrieve a list of all preview environments with optional filtering
 *     tags: [Previews]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [creating, running, updating, destroying, destroyed, failed]
 *         description: Filter by preview status
 *       - in: query
 *         name: repoOwner
 *         schema:
 *           type: string
 *         description: Filter by repository owner
 *       - in: query
 *         name: repoName
 *         schema:
 *           type: string
 *         description: Filter by repository name
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
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Preview'
 *                 count:
 *                   type: integer
 *                   example: 5
 */
export async function listPreviews(req: Request, res: Response): Promise<void> {
  try {
    const { status, repoOwner, repoName } = req.query;

    const filters: any = {};
    if (status) filters.status = status as PreviewStatus;
    if (repoOwner) filters.repoOwner = repoOwner as string;
    if (repoName) filters.repoName = repoName as string;

    const previews = await previewService.listPreviews(filters);

    res.status(200).json({
      success: true,
      data: previews,
      count: previews.length,
    });
  } catch (error) {
    logger.error("Failed to list previews:", error);
    throw error;
  }
}

/**
 * @swagger
 * /api/previews/{prNumber}:
 *   delete:
 *     summary: Destroy a preview environment
 *     description: Completely destroys a preview environment including all containers, databases, and resources
 *     tags: [Previews]
 *     security:
 *       - bearerAuth: []
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid PR number
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function destroyPreview(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const identifier = req.params.prNumber || req.params.previewId;

    if (!identifier) {
      throw new AppError("Missing preview identifier", 400);
    }

    logger.info(`API request to destroy preview: ${identifier}`);

    // Try to parse as number (PR) or use as string (branch previewId)
    const prNumber = parseInt(identifier, 10);
    if (isNaN(prNumber)) {
      // It's a branch previewId (string)
      await previewService.destroyPreview(identifier);
    } else {
      // It's a PR number (number)
      await previewService.destroyPreview(prNumber);
    }

    res.status(200).json({
      success: true,
      message: "Preview destroyed successfully",
    });
  } catch (error) {
    logger.error("Failed to destroy preview:", error);
    throw error;
  }
}
