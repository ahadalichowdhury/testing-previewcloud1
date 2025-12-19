import mongoose, { Document, Schema } from "mongoose";
import { LogType } from "../types/preview.types";

export interface ILog extends Document {
  previewId: mongoose.Types.ObjectId;
  prNumber?: number; // Optional: only for pull request previews
  type: LogType;
  message: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const LogSchema = new Schema<ILog>(
  {
    previewId: {
      type: Schema.Types.ObjectId,
      ref: "Preview",
      required: true,
      index: true,
    },
    prNumber: {
      type: Number,
      required: false, // Optional: only for pull request previews
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(LogType),
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for efficient log queries
LogSchema.index({ previewId: 1, createdAt: -1 });
LogSchema.index({ prNumber: 1, createdAt: -1 });

// Set TTL for automatic log cleanup (30 days)
LogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export const Log = mongoose.model<ILog>("Log", LogSchema);
