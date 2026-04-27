import { Router, Response } from "express";
import axios from "axios";
import { z } from "zod";
import { Analysis } from "../models/Analysis";
import { requireAuth, AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";

const router = Router();
router.use(requireAuth);

const submitSchema = z.object({
  resumeText: z.string().min(1, "Resume text is required").max(50000),
  jobDescription: z.string().max(5000).optional(),
  fileName: z.string().max(255).default("resume"),
  source: z.enum(["upload", "camera"]).default("upload"),
});

// POST /analyses
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { resumeText, jobDescription, fileName, source } = parsed.data;
  const userId = req.userId!;

  // Call ML service
  let mlResult: {
    ats_score: number;
    matched_keywords: string[];
    missing_keywords: string[];
    semantic_similarity: number;
    feedback: string[];
    word_count: number;
  };

  try {
    const mlUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
    const response = await axios.post(
      `${mlUrl}/score`,
      { resume_text: resumeText, job_description: jobDescription || null },
      { timeout: 30000 }
    );
    mlResult = response.data;
  } catch (err: any) {
    console.warn("ML service unavailable, using fallback scorer:", err.message);
    mlResult = fallbackScore(resumeText, jobDescription);
  }

  try {
    const analysis = await Analysis.create({
      userId: new mongoose.Types.ObjectId(userId),
      fileName,
      source,
      score: mlResult.ats_score,
      jobDescription: jobDescription || null,
      matchedKeywords: mlResult.matched_keywords,
      missingKeywords: mlResult.missing_keywords,
      feedback: mlResult.feedback,
      wordCount: mlResult.word_count,
      semanticSimilarity: mlResult.semantic_similarity ?? null,
    });

    res.status(201).json(formatAnalysis(analysis));
  } catch (err: any) {
    console.error("Failed to save analysis:", err.message);
    res.status(500).json({ error: "Failed to save analysis" });
  }
});

// GET /analyses
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const analyses = await Analysis.find({
      userId: new mongoose.Types.ObjectId(req.userId!),
    }).sort({ createdAt: -1 });
    res.json(analyses.map(formatAnalysis));
  } catch (err: any) {
    console.error("Failed to fetch analyses:", err.message);
    res.status(500).json({ error: "Failed to fetch analyses" });
  }
});

// DELETE /analyses/:id
router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.userId!;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  try {
    const deleted = await Analysis.findOneAndDelete({
      _id: id,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!deleted) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    res.status(204).send();
  } catch (err: any) {
    console.error("Failed to delete analysis:", err.message);
    res.status(500).json({ error: "Failed to delete analysis" });
  }
});

function formatAnalysis(a: any) {
  return {
    id: a._id.toString(),
    userId: a.userId.toString(),
    fileName: a.fileName,
    source: a.source,
    score: a.score,
    jobDescription: a.jobDescription ?? null,
    matchedKeywords: a.matchedKeywords,
    missingKeywords: a.missingKeywords,
    feedback: a.feedback,
    wordCount: a.wordCount,
    semanticSimilarity: a.semanticSimilarity ?? null,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  };
}

function fallbackScore(resumeText: string, jobDescription?: string) {
  const STOP = new Set(["the","a","an","and","or","but","of","to","in","on","at","for","with","by","from","as","is","are","was","were","be","been","have","has","had","do","does","did","will","would","should","could","may","might","must","can","this","that","these","those","i","you","he","she","it","we","they","my","your","our","their"]);
  const tokenize = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
  const COMMON = ["experience","project","team","developed","managed","led","designed","built","created","implemented","skills","education","degree","certification","communication","leadership"];

  const resumeTokens = new Set(tokenize(resumeText));
  const wordCount = resumeText.trim().split(/\s+/).filter(Boolean).length;

  let target: string[];
  if (jobDescription && jobDescription.trim().length > 20) {
    const freq = new Map<string,number>();
    for (const t of tokenize(jobDescription)) freq.set(t,(freq.get(t)||0)+1);
    target = [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,25).map(([w])=>w);
  } else { target = COMMON; }

  const matched = target.filter(k => resumeTokens.has(k));
  const missing = target.filter(k => !resumeTokens.has(k));
  const kwScore = target.length ? (matched.length/target.length)*60 : 30;

  let fmt = 0; const feedback: string[] = [];
  if (wordCount >= 300 && wordCount <= 1000) fmt += 10;
  else if (wordCount < 300) { fmt += Math.max(0,(wordCount/300)*10); feedback.push(`Resume is short (${wordCount} words). Aim for 400–800 words.`); }
  else { fmt += 6; feedback.push(`Resume is lengthy (${wordCount} words). Consider trimming.`); }

  const sections = ["experience","education","skills","summary","projects"];
  const found = sections.filter(s => new RegExp(`\\b${s}\\b`,"i").test(resumeText));
  fmt += (found.length/sections.length)*10;
  if (found.length < 3) feedback.push(`Add clear section headers. Recommended: ${sections.join(", ")}.`);

  if (/[\w.\-]+@[\w.\-]+\.\w+/.test(resumeText)) fmt += 5; else feedback.push("Add a professional email address.");
  if (/(\+?\d[\d\s().\-]{7,})/.test(resumeText)) fmt += 5; else feedback.push("Include a contact phone number.");

  const verbs = ["led","built","designed","developed","launched","increased","improved","reduced","managed","created","delivered","implemented","optimized","achieved"];
  const hits = verbs.filter(v => new RegExp(`\\b${v}\\b`,"i").test(resumeText)).length;
  fmt += Math.min(10, hits*1.5);
  if (hits < 4) feedback.push("Use stronger action verbs (e.g., led, built, optimized).");

  if (missing.length > 0) feedback.unshift(`Consider adding key terms: ${missing.slice(0,5).join(", ")}.`);
  else if (matched.length > 0) feedback.unshift("Excellent keyword coverage!");

  return { ats_score: Math.round(Math.min(100, kwScore+fmt)), matched_keywords: matched, missing_keywords: missing, feedback, word_count: wordCount, semantic_similarity: 0 };
}

export default router;
