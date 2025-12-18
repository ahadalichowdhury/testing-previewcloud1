import mongoose, { Document, Schema } from "mongoose";
import {
  DatabaseType,
  PreviewStatus,
  PreviewType,
} from "../types/preview.types";

export interface IPreview extends Document {
  userId: mongoose.Types.ObjectId; // NEW: Owner of this preview
  organizationId?: mongoose.Types.ObjectId; // NEW: Optional organization
  previewType: PreviewType; // PR or BRANCH
  prNumber?: number; // Required for PR type, optional for BRANCH
  previewId: string; // Unique identifier: pr-{number} or branch-{branch-name}
  repoName: string;
  repoOwner: string;
  branch: string;
  commitSha: string;
  status: PreviewStatus;
  services: Array<{
    name: string;
    containerId: string;
    imageTag: string;
    port: number;
    url: string;
    status: string;
  }>;
  database?: {
    type: DatabaseType;
    name: string;
    connectionString: string;
  };
  urls: Map<string, string>;
  env: Map<string, string>;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
}

const PreviewSchema = new Schema<IPreview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    previewType: {
      type: String,
      enum: Object.values(PreviewType),
      required: true,
      index: true,
    },
    prNumber: {
      type: Number,
      required: false,
      index: true,
    },
    previewId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    repoName: {
      type: String,
      required: true,
    },
    repoOwner: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
    commitSha: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PreviewStatus),
      default: PreviewStatus.CREATING,
      index: true,
    },
    services: [
      {
        name: { type: String, required: true },
        containerId: { type: String, required: true },
        imageTag: { type: String, required: true },
        port: { type: Number },
        url: { type: String, required: true },
        status: { type: String, required: true },
      },
    ],
    database: {
      type: {
        type: String,
        enum: Object.values(DatabaseType),
      },
      name: String,
      connectionString: String,
    },
    urls: {
      type: Map,
      of: String,
      default: new Map(),
    },
    env: {
      type: Map,
      of: String,
      default: new Map(),
    },
    password: String,
    lastAccessedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for repo lookups
PreviewSchema.index({ repoOwner: 1, repoName: 1 });
PreviewSchema.index({ previewType: 1, branch: 1, repoOwner: 1, repoName: 1 });

export const Preview = mongoose.model<IPreview>("Preview", PreviewSchema);
