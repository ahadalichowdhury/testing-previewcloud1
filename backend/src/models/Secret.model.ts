import mongoose, { Document, Schema } from "mongoose";

export interface ISecret extends Document {
  previewId: mongoose.Types.ObjectId;
  prNumber: number;
  key: string;
  encryptedValue: string;
  createdAt: Date;
  updatedAt: Date;
}

const SecretSchema = new Schema<ISecret>(
  {
    previewId: {
      type: Schema.Types.ObjectId,
      ref: "Preview",
      required: true,
      index: true,
    },
    prNumber: {
      type: Number,
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
    },
    encryptedValue: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique secrets per preview
SecretSchema.index({ previewId: 1, key: 1 }, { unique: true });

export const Secret = mongoose.model<ISecret>("Secret", SecretSchema);
