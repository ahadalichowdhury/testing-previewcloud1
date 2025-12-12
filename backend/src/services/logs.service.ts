import { ILog, Log } from "../models/Log.model";
import { Preview } from "../models/Preview.model";
import { LogType } from "../types/preview.types";
import { logger } from "../utils/logger";

export class LogsService {
  /**
   * Create a log entry
   */
  async createLog(
    prNumber: number,
    type: LogType | string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<ILog> {
    try {
      // Get preview to get the ID
      const preview = await Preview.findOne({ prNumber });

      if (!preview) {
        // If preview doesn't exist yet, log to system logger only
        logger.debug(`Log for PR #${prNumber}: ${message}`);
        throw new Error(`Preview for PR #${prNumber} not found`);
      }

      const log = await Log.create({
        previewId: preview._id,
        prNumber,
        type,
        message,
        metadata,
      });

      logger.debug(`Log created for PR #${prNumber}`);
      return log;
    } catch (error) {
      logger.error("Failed to create log:", error);
      throw error;
    }
  }

  /**
   * Get logs for a preview
   */
  async getLogsForPreview(
    prNumber: number,
    options: {
      type?: LogType | string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ILog[]> {
    try {
      const query: any = { prNumber };

      if (options.type) {
        query.type = options.type;
      }

      const logs = await Log.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 100)
        .skip(options.offset || 0);

      return logs;
    } catch (error) {
      logger.error(`Failed to get logs for PR #${prNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get logs with pagination
   */
  async getPaginatedLogs(
    prNumber: number,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ logs: ILog[]; total: number; pages: number }> {
    try {
      const skip = (page - 1) * pageSize;

      const [logs, total] = await Promise.all([
        Log.find({ prNumber })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize),
        Log.countDocuments({ prNumber }),
      ]);

      const pages = Math.ceil(total / pageSize);

      return { logs, total, pages };
    } catch (error) {
      logger.error(`Failed to get paginated logs for PR #${prNumber}:`, error);
      throw error;
    }
  }

  /**
   * Stream logs (for WebSocket)
   */
  async streamLogs(
    prNumber: number,
    onLog: (log: ILog) => void
  ): Promise<void> {
    try {
      // Get existing logs first
      const existingLogs = await this.getLogsForPreview(prNumber, {
        limit: 100,
      });
      existingLogs.reverse().forEach(onLog);

      // Set up change stream for new logs
      const changeStream = Log.watch([
        { $match: { "fullDocument.prNumber": prNumber } },
      ]);

      changeStream.on("change", (change: any) => {
        if (change.operationType === "insert") {
          onLog(change.fullDocument);
        }
      });

      logger.info(`Started streaming logs for PR #${prNumber}`);
    } catch (error) {
      logger.error(`Failed to stream logs for PR #${prNumber}:`, error);
      throw error;
    }
  }

  /**
   * Delete logs for a preview
   */
  async deleteLogsForPreview(prNumber: number): Promise<void> {
    try {
      await Log.deleteMany({ prNumber });
      logger.info(`Deleted logs for PR #${prNumber}`);
    } catch (error) {
      logger.error(`Failed to delete logs for PR #${prNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get log statistics
   */
  async getLogStats(prNumber: number): Promise<Record<string, number>> {
    try {
      const stats = await Log.aggregate([
        { $match: { prNumber } },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
          },
        },
      ]);

      const result: Record<string, number> = {};
      stats.forEach((stat: any) => {
        result[stat._id] = stat.count;
      });

      return result;
    } catch (error) {
      logger.error(`Failed to get log stats for PR #${prNumber}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old logs (called by cleanup scheduler)
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await Log.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      logger.info(`Cleaned up ${result.deletedCount} old logs`);
      return result.deletedCount || 0;
    } catch (error) {
      logger.error("Failed to cleanup old logs:", error);
      throw error;
    }
  }
}
