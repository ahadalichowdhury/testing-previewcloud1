import { Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import { LogsService } from "../services/logs.service";
import { LogType } from "../types/preview.types";
import { logger } from "../utils/logger";

const logsService = new LogsService();

/**
 * @swagger
 * /api/previews/{prNumber}/logs:
 *   get:
 *     summary: Get logs for a preview
 *     description: Retrieve logs for a specific preview environment with optional filtering
 *     tags: [Logs]
 *     parameters:
 *       - in: path
 *         name: prNumber
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pull request number
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [build, deploy, container, database, system]
 *         description: Filter by log type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of logs to return
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
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
 *                     $ref: '#/components/schemas/Log'
 *       400:
 *         description: Invalid PR number
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function getLogs(req: Request, res: Response): Promise<void> {
  try {
    const prNumber = parseInt(req.params.prNumber, 10);

    if (isNaN(prNumber)) {
      throw new AppError("Invalid PR number", 400);
    }

    const type = req.query.type as LogType | undefined;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 100;
    const offset = req.query.offset
      ? parseInt(req.query.offset as string, 10)
      : 0;

    const logs = await logsService.getLogsForPreview(prNumber, {
      type,
      limit,
      offset,
    });

    res.status(200).json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    logger.error("Failed to get logs:", error);
    throw error;
  }
}

/**
 * Get paginated logs
 */
export async function getPaginatedLogs(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const prNumber = parseInt(req.params.prNumber, 10);

    if (isNaN(prNumber)) {
      throw new AppError("Invalid PR number", 400);
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize
      ? parseInt(req.query.pageSize as string, 10)
      : 50;

    const result = await logsService.getPaginatedLogs(prNumber, page, pageSize);

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: {
        page,
        pageSize,
        total: result.total,
        pages: result.pages,
      },
    });
  } catch (error) {
    logger.error("Failed to get paginated logs:", error);
    throw error;
  }
}

/**
 * @swagger
 * /api/previews/{prNumber}/logs/stats:
 *   get:
 *     summary: Get log statistics
 *     description: Get count of logs by type for a preview
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
 *         description: Log statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 *             example:
 *               success: true
 *               data:
 *                 build: 45
 *                 deploy: 12
 *                 container: 189
 *                 database: 8
 *                 system: 6
 */
export async function getLogStats(req: Request, res: Response): Promise<void> {
  try {
    const prNumber = parseInt(req.params.prNumber, 10);

    if (isNaN(prNumber)) {
      throw new AppError("Invalid PR number", 400);
    }

    const stats = await logsService.getLogStats(prNumber);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Failed to get log stats:", error);
    throw error;
  }
}
