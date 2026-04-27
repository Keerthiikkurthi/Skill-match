// ATS scoring heuristics — keyword matching + formatting checks

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","of","to","in","on","at","for","with","by","from","as","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","should","could","may","might","must","can","this","that","these","those","i","you","he","she","it","we","they","my","your","our","their","me","him","us","them","if","then","than","so","not","no","yes","also","into","about","over","under","up","down","out","off","more","most","some","any","all","each","every","other","such","just","very","too","only","own","same","new","old"
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

export function extractKeywords(text: string, limit = 30): string[] {
  const tokens = tokenize(text);
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

const COMMON_RESUME_KEYWORDS = [
  "experience","project","team","developed","managed","led","designed","built","created","implemented","collaborated","optimized","improved","analyzed","communication","leadership","problem","solving","skills","education","degree","university","certification"
];

export type ATSResult = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  feedback: string[];
  wordCount: number;
};

export function analyzeResume(resumeText: string, jobDescription?: string): ATSResult {
  const cleanResume = resumeText.trim();
  const wordCount = cleanResume.split(/\s+/).filter(Boolean).length;
  const resumeTokens = new Set(tokenize(cleanResume));

  let targetKeywords: string[];
  if (jobDescription && jobDescription.trim().length > 20) {
    targetKeywords = extractKeywords(jobDescription, 25);
  } else {
    targetKeywords = COMMON_RESUME_KEYWORDS;
  }

  const matched: string[] = [];
  const missing: string[] = [];
  for (const kw of targetKeywords) {
    if (resumeTokens.has(kw)) matched.push(kw);
    else missing.push(kw);
  }

  const keywordScore = targetKeywords.length
    ? (matched.length / targetKeywords.length) * 60
    : 30;

  // Formatting checks (40 points)
  let formattingScore = 0;
  const feedback: string[] = [];

  // Length check
  if (wordCount >= 300 && wordCount <= 1000) {
    formattingScore += 10;
  } else if (wordCount < 300) {
    feedback.push(`Resume is short (${wordCount} words). Aim for 400–800 words for stronger impact.`);
    formattingScore += Math.max(0, (wordCount / 300) * 10);
  } else {
    feedback.push(`Resume is lengthy (${wordCount} words). Consider trimming to under 1000 words.`);
    formattingScore += 6;
  }

  // Section detection
  const sections = ["experience", "education", "skills", "summary", "projects"];
  const foundSections = sections.filter((s) =>
    new RegExp(`\\b${s}\\b`, "i").test(cleanResume)
  );
  formattingScore += (foundSections.length / sections.length) * 10;
  if (foundSections.length < 3) {
    feedback.push(
      `Add clear section headers. Found: ${foundSections.join(", ") || "none"}. Recommended: ${sections.join(", ")}.`
    );
  }

  // Contact info
  const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(cleanResume);
  const hasPhone = /(\+?\d[\d\s().-]{7,})/.test(cleanResume);
  if (hasEmail) formattingScore += 5; else feedback.push("Add a professional email address.");
  if (hasPhone) formattingScore += 5; else feedback.push("Include a contact phone number.");

  // Action verbs
  const actionVerbs = ["led","built","designed","developed","launched","increased","improved","reduced","managed","created","delivered","implemented","optimized","achieved"];
  const verbHits = actionVerbs.filter((v) => new RegExp(`\\b${v}\\b`, "i").test(cleanResume)).length;
  formattingScore += Math.min(10, verbHits * 1.5);
  if (verbHits < 4) {
    feedback.push("Use stronger action verbs (e.g., led, built, optimized, delivered) to highlight impact.");
  }

  if (missing.length > 0) {
    feedback.unshift(
      `Consider adding ${Math.min(missing.length, 5)} key terms: ${missing.slice(0, 5).join(", ")}.`
    );
  }

  if (matched.length > 0 && missing.length === 0) {
    feedback.unshift("Excellent keyword coverage — your resume aligns well with the target role.");
  }

  const score = Math.round(Math.min(100, keywordScore + formattingScore));

  return {
    score,
    matchedKeywords: matched,
    missingKeywords: missing,
    feedback,
    wordCount,
  };
}
