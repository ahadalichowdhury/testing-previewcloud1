import { Request, Response, Router } from "express";
import mongoose from "mongoose";
import { getDockerClient } from "../config/docker";
import { logger } from "../utils/logger";

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check system health
 *     description: Returns the health status of all PreviewCloud services
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Health'
 *             example:
 *               status: healthy
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *               services:
 *                 api: up
 *                 database: up
 *                 docker: up
 *       503:
 *         description: System is degraded or unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Health'
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const health: any = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        api: "up",
        database: "unknown",
        docker: "unknown",
      },
    };

    // Check MongoDB connection
    try {
      if (mongoose.connection.readyState === 1) {
        health.services.database = "up";
      } else {
        health.services.database = "down";
        health.status = "degraded";
      }
    } catch (error) {
      health.services.database = "down";
      health.status = "degraded";
    }

    // Check Docker connection
    try {
      const docker = getDockerClient();
      await docker.ping();
      health.services.docker = "up";
    } catch (error) {
      health.services.docker = "down";
      health.status = "degraded";
    }

    const statusCode = health.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
    });
  }
});

export default router;
