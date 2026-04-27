/**
 * API client for the Resume Analyzer backend.
 * All requests include the JWT token from localStorage.
 */

// In production on Vercel: API is served from /api (same domain, no CORS)
// In development: Vite proxy forwards /api/* to http://localhost:3001/api/*
// Set VITE_API_URL to override (e.g. for a separate backend deployment)
const BASE_URL = import.meta.env.VITE_API_URL || "";

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type ApiAnalysis = {
  id: string;
  userId: string;
  fileName: string;
  source: "upload" | "camera";
  score: number;
  jobDescription?: string | null;
  matchedKeywords: string[];
  missingKeywords: string[];
  feedback: string[];
  wordCount: number;
  semanticSimilarity?: number | null;
  createdAt: string;
};

export type AuthResponse = {
  token: string;
  user: ApiUser;
};

// ── Token management ──────────────────────────────────────────────────────────

const TOKEN_KEY = "ra_jwt";

// Clear any stale keys from the old localStorage-based implementation
const STALE_KEYS = ["ra_users", "ra_session", "ra_analyses"];
STALE_KEYS.forEach((k) => localStorage.removeItem(k));

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Base fetch wrapper ────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({ error: "Invalid server response" }));

  if (!res.ok) {
    // Clear stale token on 401 so the auth context redirects to sign in
    if (res.status === 401) {
      clearToken();
    }
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export async function apiSignUp(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function apiSignIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ── Profile endpoints ─────────────────────────────────────────────────────────

export async function apiGetProfile(): Promise<ApiUser> {
  return request<ApiUser>("/api/profile");
}

export async function apiUpdateProfile(
  updates: Partial<Pick<ApiUser, "name" | "email">>
): Promise<ApiUser> {
  return request<ApiUser>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

// ── Analyses endpoints ────────────────────────────────────────────────────────

export async function apiSubmitAnalysis(payload: {
  resumeText: string;
  jobDescription?: string;
  fileName: string;
  source: "upload" | "camera";
}): Promise<ApiAnalysis> {
  return request<ApiAnalysis>("/api/analyses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiGetAnalyses(): Promise<ApiAnalysis[]> {
  return request<ApiAnalysis[]>("/api/analyses");
}

export async function apiDeleteAnalysis(id: string): Promise<void> {
  return request<void>(`/api/analyses/${id}`, { method: "DELETE" });
}

// ── AI Features endpoints ─────────────────────────────────────────────────────

export async function apiInterviewQuestions(payload: {
  resumeText: string;
  jobDescription?: string;
  difficulty: "easy" | "medium" | "hard";
}) {
  return request<{
    role: string;
    difficulty: string;
    questions: Array<{ question: string; category: string; hint: string }>;
    tips: string[];
  }>("/api/ai/interview-questions", { method: "POST", body: JSON.stringify(payload) });
}

export async function apiRoleSuggestions(payload: {
  resumeText: string;
  targetRole?: string;
}) {
  return request<{
    detectedRole: string;
    overallAssessment?: string;
    mustHave: string[];
    niceToHave: string[];
    missingKeywords?: string[];
    actionVerbs: { used: string[]; missing: string[] };
    sections: { section: string; present: boolean; quality?: string; suggestion?: string }[];
    quickWins: string[];
  }>("/api/ai/role-suggestions", { method: "POST", body: JSON.stringify(payload) });
}

export async function apiRecruiterFeedback(payload: {
  resumeText: string;
  jobDescription?: string;
}) {
  return request<{
    role: string;
    verdict: string;
    callbackLikelihood: number;
    positives: string[];
    concerns: string[];
    suggestions: string[];
    firstImpression: string;
    standoutFactor?: string;
  }>("/api/ai/recruiter-feedback", { method: "POST", body: JSON.stringify(payload) });
}

export async function apiHeatmap(payload: { resumeText: string }) {
  return request<{
    role: string;
    overallScore: number;
    sections: { name: string; score: number; feedback: string; present: boolean }[];
    strongest: string;
    weakest: string;
    summary: string;
  }>("/api/ai/heatmap", { method: "POST", body: JSON.stringify(payload) });
}
