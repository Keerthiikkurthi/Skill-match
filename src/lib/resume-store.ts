/**
 * Resume Store — backend-first with localStorage cache fallback.
 *
 * Primary store: backend database via API.
 * Fallback: localStorage cache when API is unreachable.
 */

import {
  apiSubmitAnalysis,
  apiGetAnalyses,
  apiDeleteAnalysis,
  type ApiAnalysis,
} from "./api";

export type ResumeAnalysis = ApiAnalysis;

const CACHE_KEY_PREFIX = "ra_analyses_";

function cacheKey(userId: string): string {
  return `${CACHE_KEY_PREFIX}${userId}`;
}

function loadCache(userId: string): ResumeAnalysis[] {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(userId)) || "[]");
  } catch {
    return [];
  }
}

function saveCache(userId: string, items: ResumeAnalysis[]): void {
  localStorage.setItem(cacheKey(userId), JSON.stringify(items));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch analyses from the backend and update the local cache.
 * Falls back to cache if the backend is unreachable.
 */
export async function getAnalyses(userId: string): Promise<{
  analyses: ResumeAnalysis[];
  fromCache: boolean;
}> {
  try {
    const analyses = await apiGetAnalyses();
    saveCache(userId, analyses);
    return { analyses, fromCache: false };
  } catch {
    const cached = loadCache(userId);
    return { analyses: cached, fromCache: true };
  }
}

/**
 * Submit a new analysis to the backend and cache the result.
 */
export async function addAnalysis(payload: {
  userId: string;
  resumeText: string;
  jobDescription?: string;
  fileName: string;
  source: "upload" | "camera";
}): Promise<ResumeAnalysis> {
  const result = await apiSubmitAnalysis({
    resumeText: payload.resumeText,
    jobDescription: payload.jobDescription,
    fileName: payload.fileName,
    source: payload.source,
  });

  // Update cache
  const cached = loadCache(payload.userId);
  saveCache(payload.userId, [result, ...cached]);

  return result;
}

/**
 * Delete an analysis from the backend and remove from cache.
 */
export async function deleteAnalysis(id: string, userId: string): Promise<void> {
  await apiDeleteAnalysis(id);
  const cached = loadCache(userId);
  saveCache(userId, cached.filter((a) => a.id !== id));
}
