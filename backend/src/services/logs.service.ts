import { ILog, Log } from "../models/Log.model";
import { Preview } from "../models/Preview.model";
import { LogType } from "../types/preview.types";
import { logger } from "../utils/logger";

export class LogsService {
  /**
   * Create a log entry
   */
  async createLog(
    previewId: string,
    type: LogType | string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<ILog> {
    try {
      // Get preview to get the ID
      const preview = await Preview.findOne({ previewId });

      if (!preview) {
        // If preview doesn't exist yet, log to system logger only
        logger.debug(`Log for preview ${previewId}: ${message}`);
        throw new Error(`Preview ${previewId} not found`);
      }

      const log = await Log.create({
        previewId: preview._id,
        prNumber: preview.prNumber || undefined, // Optional: only for pull request previews
        type,
        message,
        metadata,
      });

      logger.debug(`Log created for preview ${previewId}`);
      return log;
    } catch (error) {
      logger.error("Failed to create log:", error);
      throw error;
    }
  }

  /**
   * Get logs for a preview by previewId or prNumber (backward compatibility)
   */
  async getLogsForPreview(
    identifier: string | number,
    options: {
      type?: LogType | string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ILog[]> {
    try {
      // Find preview first to get its _id
      let preview;
      if (typeof identifier === "number") {
        preview = await Preview.findOne({ prNumber: identifier });
      } else {
        preview = await Preview.findOne({ previewId: identifier });
      }

      if (!preview) {
        return [];
      }

      const query: any = { previewId: preview._id };

      if (options.type) {
        query.type = options.type;
      }

      const logs = await Log.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 100)
        .skip(options.offset || 0);

      return logs;
    } catch (error) {
      logger.error(`Failed to get logs for preview ${identifier}:`, error);
      throw error;
    }
  }

  /**
   * Get logs with pagination by previewId or prNumber (backward compatibility)
   */
  async getPaginatedLogs(
    identifier: string | number,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ logs: ILog[]; total: number; pages: number }> {
    try {
      // Find preview first to get its _id
      let preview;
      if (typeof identifier === "number") {
        preview = await Preview.findOne({ prNumber: identifier });
      } else {
        preview = await Preview.findOne({ previewId: identifier });
      }

      if (!preview) {
        return { logs: [], total: 0, pages: 0 };
      }

      const skip = (page - 1) * pageSize;

      const [logs, total] = await Promise.all([
        Log.find({ previewId: preview._id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize),
        Log.countDocuments({ previewId: preview._id }),
      ]);

      const pages = Math.ceil(total / pageSize);

      return { logs, total, pages };
    } catch (error) {
      logger.error(
        `Failed to get paginated logs for preview ${identifier}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Stream logs (for WebSocket) by previewId or prNumber
   */
  async streamLogs(
    identifier: string | number,
    onLog: (log: ILog) => void
  ): Promise<void> {
    try {
      // Find preview first to get its _id
      let preview;
      if (typeof identifier === "number") {
        preview = await Preview.findOne({ prNumber: identifier });
      } else {
        preview = await Preview.findOne({ previewId: identifier });
      }

      if (!preview) {
        throw new Error(`Preview ${identifier} not found`);
      }

      // Get existing logs first
      const existingLogs = await this.getLogsForPreview(identifier, {
        limit: 100,
      });
      existingLogs.reverse().forEach(onLog);

      // Set up change stream for new logs
      const changeStream = Log.watch([
        { $match: { "fullDocument.previewId": preview._id } },
      ]);

      changeStream.on("change", (change: any) => {
        if (change.operationType === "insert") {
          onLog(change.fullDocument);
        }
      });

      logger.info(`Started streaming logs for preview ${identifier}`);
    } catch (error) {
      logger.error(`Failed to stream logs for preview ${identifier}:`, error);
      throw error;
    }
  }

  /**
   * Delete logs for a preview by previewId or prNumber
   */
  async deleteLogsForPreview(identifier: string | number): Promise<void> {
    try {
      // Find preview first to get its _id
      let preview;
      if (typeof identifier === "number") {
        preview = await Preview.findOne({ prNumber: identifier });
      } else {
        preview = await Preview.findOne({ previewId: identifier });
      }

      if (!preview) {
        return;
      }

      await Log.deleteMany({ previewId: preview._id });
      logger.info(`Deleted logs for preview ${identifier}`);
    } catch (error) {
      logger.error(`Failed to delete logs for preview ${identifier}:`, error);
      throw error;
    }
  }

  /**
   * Get log statistics by previewId or prNumber
   */
  async getLogStats(
    identifier: string | number
  ): Promise<Record<string, number>> {
    try {
      // Find preview first to get its _id
      let preview;
      if (typeof identifier === "number") {
        preview = await Preview.findOne({ prNumber: identifier });
      } else {
        preview = await Preview.findOne({ previewId: identifier });
      }

      if (!preview) {
        return {};
      }

      const stats = await Log.aggregate([
        { $match: { previewId: preview._id } },
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
      logger.error(`Failed to get log stats for preview ${identifier}:`, error);
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
