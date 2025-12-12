import cron from "node-cron";
import { config } from "../config/env";
import { Preview } from "../models/Preview.model";
import { PreviewStatus } from "../types/preview.types";
import { logger } from "../utils/logger";
import { DockerService } from "./docker.service";
import { LogsService } from "./logs.service";
import { PreviewService } from "./preview.service";

export class CleanupScheduler {
  private previewService: PreviewService;
  private dockerService: DockerService;
  private logsService: LogsService;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.previewService = new PreviewService();
    this.dockerService = new DockerService();
    this.logsService = new LogsService();
  }

  /**
   * Start the cleanup scheduler
   */
  start(): void {
    // Run every interval specified in config (default: 30 minutes)
    const schedule = `*/${config.cleanupIntervalMinutes} * * * *`;

    this.task = cron.schedule(schedule, async () => {
      logger.info("Running cleanup scheduler...");
      await this.runCleanup();
    });

    logger.info(
      `Cleanup scheduler started (runs every ${config.cleanupIntervalMinutes} minutes)`
    );

    // Run immediately on start
    setTimeout(() => this.runCleanup(), 5000);
  }

  /**
   * Stop the cleanup scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      logger.info("Cleanup scheduler stopped");
    }
  }

  /**
   * Run cleanup tasks
   */
  private async runCleanup(): Promise<void> {
    try {
      await Promise.all([
        this.cleanupIdlePreviews(),
        this.cleanupDestroyedPreviews(),
        this.enforcePreviewLimit(),
        this.cleanupOrphanContainers(),
        this.cleanupOldLogs(),
      ]);

      logger.info("Cleanup completed successfully");
    } catch (error) {
      logger.error("Cleanup failed:", error);
    }
  }

  /**
   * Clean up idle previews (inactive for longer than configured timeout)
   */
  private async cleanupIdlePreviews(): Promise<void> {
    try {
      const idleThreshold = new Date();
      idleThreshold.setHours(
        idleThreshold.getHours() - config.idleTimeoutHours
      );

      const idlePreviews = await Preview.find({
        status: PreviewStatus.RUNNING,
        lastAccessedAt: { $lt: idleThreshold },
      });

      if (idlePreviews.length > 0) {
        logger.info(`Found ${idlePreviews.length} idle previews to cleanup`);

        for (const preview of idlePreviews) {
          try {
            logger.info(`Cleaning up idle preview: PR #${preview.prNumber}`);
            await this.previewService.destroyPreview(preview.prNumber);
          } catch (error) {
            logger.error(
              `Failed to cleanup idle preview PR #${preview.prNumber}:`,
              error
            );
          }
        }
      }
    } catch (error) {
      logger.error("Failed to cleanup idle previews:", error);
    }
  }

  /**
   * Clean up previews that are already marked as destroyed
   */
  private async cleanupDestroyedPreviews(): Promise<void> {
    try {
      const destroyedPreviews = await Preview.find({
        status: PreviewStatus.DESTROYED,
        updatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Older than 24 hours
      });

      if (destroyedPreviews.length > 0) {
        logger.info(
          `Found ${destroyedPreviews.length} destroyed previews to remove from database`
        );

        for (const preview of destroyedPreviews) {
          try {
            // Delete logs
            await this.logsService.deleteLogsForPreview(preview.prNumber);

            // Delete preview document
            await Preview.deleteOne({ _id: preview._id });

            logger.info(`Removed destroyed preview: PR #${preview.prNumber}`);
          } catch (error) {
            logger.error(
              `Failed to remove destroyed preview PR #${preview.prNumber}:`,
              error
            );
          }
        }
      }
    } catch (error) {
      logger.error("Failed to cleanup destroyed previews:", error);
    }
  }

  /**
   * Enforce max preview limit
   */
  private async enforcePreviewLimit(): Promise<void> {
    try {
      const count = await Preview.countDocuments({
        status: { $in: [PreviewStatus.RUNNING, PreviewStatus.CREATING] },
      });

      if (count > config.maxPreviews) {
        logger.warn(
          `Preview count (${count}) exceeds limit (${config.maxPreviews})`
        );

        // Find oldest previews to remove
        const excessCount = count - config.maxPreviews;
        const oldestPreviews = await Preview.find({
          status: { $in: [PreviewStatus.RUNNING, PreviewStatus.CREATING] },
        })
          .sort({ lastAccessedAt: 1 })
          .limit(excessCount);

        logger.info(
          `Cleaning up ${excessCount} oldest previews to enforce limit`
        );

        for (const preview of oldestPreviews) {
          try {
            await this.previewService.destroyPreview(preview.prNumber);
          } catch (error) {
            logger.error(
              `Failed to destroy preview PR #${preview.prNumber}:`,
              error
            );
          }
        }
      }
    } catch (error) {
      logger.error("Failed to enforce preview limit:", error);
    }
  }

  /**
   * Clean up orphan containers (containers not in database)
   */
  private async cleanupOrphanContainers(): Promise<void> {
    try {
      // Get all PreviewCloud-managed containers
      const containers = await this.dockerService.listContainersByLabel(
        "previewcloud.managed",
        "true"
      );

      if (containers.length === 0) {
        return;
      }

      logger.info(`Found ${containers.length} PreviewCloud containers`);

      for (const container of containers) {
        try {
          const prNumber = parseInt(
            container.Labels["previewcloud.pr"] || "0",
            10
          );

          if (!prNumber) {
            logger.warn(`Container ${container.Id} has no PR number label`);
            continue;
          }

          // Check if preview exists in database
          const preview = await Preview.findOne({ prNumber });

          if (!preview || preview.status === PreviewStatus.DESTROYED) {
            logger.info(
              `Found orphan container for PR #${prNumber}, removing...`
            );
            await this.dockerService.removeContainer(container.Id, true);
          }
        } catch (error) {
          logger.error(
            `Failed to cleanup orphan container ${container.Id}:`,
            error
          );
        }
      }
    } catch (error) {
      logger.error("Failed to cleanup orphan containers:", error);
    }
  }

  /**
   * Clean up old logs
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const deletedCount = await this.logsService.cleanupOldLogs(30);
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old logs`);
      }
    } catch (error) {
      logger.error("Failed to cleanup old logs:", error);
    }
  }

  /**
   * Prune Docker resources
   */
  async pruneDockerResources(): Promise<void> {
    try {
      logger.info("Pruning unused Docker resources...");
      await this.dockerService.pruneUnusedResources();
    } catch (error) {
      logger.error("Failed to prune Docker resources:", error);
    }
  }
}
