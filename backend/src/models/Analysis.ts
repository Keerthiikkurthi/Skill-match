import mongoose, { Document, Schema } from "mongoose";

export interface IAnalysis extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  fileName: string;
  source: "upload" | "camera";
  score: number;
  jobDescription?: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  feedback: string[];
  wordCount: number;
  semanticSimilarity?: number;
  createdAt: Date;
}

const AnalysisSchema = new Schema<IAnalysis>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fileName: { type: String, required: true, maxlength: 255 },
    source: { type: String, enum: ["upload", "camera"], required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    jobDescription: { type: String, default: null },
    matchedKeywords: { type: [String], default: [] },
    missingKeywords: { type: [String], default: [] },
    feedback: { type: [String], default: [] },
    wordCount: { type: Number, default: 0 },
    semanticSimilarity: { type: Number, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const Analysis = mongoose.model<IAnalysis>("Analysis", AnalysisSchema);
