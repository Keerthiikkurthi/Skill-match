"""
TF-IDF based keyword extraction and ATS scoring.
Pure Python — no scikit-learn dependency.
"""

import re
import math
from typing import List, Tuple

STOP_WORDS = {
    "the","a","an","and","or","but","of","to","in","on","at","for","with","by",
    "from","as","is","are","was","were","be","been","being","have","has","had",
    "do","does","did","will","would","should","could","may","might","must","can",
    "this","that","these","those","i","you","he","she","it","we","they","my",
    "your","our","their","me","him","us","them","if","then","than","so","not",
    "no","yes","also","into","about","over","under","up","down","out","off",
    "more","most","some","any","all","each","every","other","such","just","very",
    "too","only","own","same","new","old","its","his","her"
}

COMMON_RESUME_KEYWORDS = [
    "experience", "project", "team", "developed", "managed", "led", "designed",
    "built", "created", "implemented", "collaborated", "optimized", "improved",
    "analyzed", "communication", "leadership", "problem", "solving", "skills",
    "education", "degree", "university", "certification", "python", "java",
    "javascript", "sql", "data", "analysis", "machine", "learning", "software",
    "engineering", "development", "agile", "scrum", "git", "api", "cloud",
    "aws", "azure", "docker", "kubernetes", "react", "node"
]

ACTION_VERBS = [
    "led", "built", "designed", "developed", "launched", "increased", "improved",
    "reduced", "managed", "created", "delivered", "implemented", "optimized",
    "achieved", "coordinated", "established", "executed", "generated", "initiated",
    "introduced", "maintained", "negotiated", "operated", "organized", "planned",
    "produced", "provided", "resolved", "streamlined", "supervised", "trained"
]

SECTION_HEADERS = [
    "experience", "education", "skills", "summary", "projects",
    "objective", "certifications", "awards", "publications", "references"
]


def tokenize(text: str) -> List[str]:
    text = text.lower()
    text = re.sub(r"[^a-z0-9+#.\s\-]", " ", text)
    return [w for w in text.split() if len(w) > 1 and w not in STOP_WORDS]


def extract_keywords_tfidf(text: str, limit: int = 30) -> List[str]:
    """Extract top keywords by term frequency."""
    tokens = tokenize(text)
    if not tokens:
        return []
    freq: dict[str, int] = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1
    sorted_tokens = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    return [w for w, _ in sorted_tokens[:limit]]


def compute_keyword_score(
    resume_text: str,
    job_description: str | None
) -> Tuple[float, List[str], List[str]]:
    """Compute keyword match score (0–60 pts)."""
    resume_tokens = set(tokenize(resume_text))

    if job_description and len(job_description.strip()) > 20:
        target_keywords = extract_keywords_tfidf(job_description, limit=25)
    else:
        target_keywords = COMMON_RESUME_KEYWORDS

    matched = [kw for kw in target_keywords if kw in resume_tokens]
    missing = [kw for kw in target_keywords if kw not in resume_tokens]

    score = (len(matched) / len(target_keywords)) * 60.0 if target_keywords else 30.0
    return score, matched, missing


def compute_formatting_score(resume_text: str) -> Tuple[float, List[str]]:
    """Compute formatting quality score (0–40 pts)."""
    score = 0.0
    feedback: List[str] = []
    word_count = len(resume_text.strip().split())

    # Word count (0–10 pts)
    if 300 <= word_count <= 1000:
        score += 10
    elif word_count < 300:
        score += max(0.0, (word_count / 300) * 10)
        feedback.append(f"Resume is short ({word_count} words). Aim for 400–800 words.")
    else:
        score += 6
        feedback.append(f"Resume is lengthy ({word_count} words). Consider trimming to under 1000 words.")

    # Section headers (0–10 pts)
    found_sections = [s for s in SECTION_HEADERS if re.search(rf"\b{s}\b", resume_text, re.IGNORECASE)]
    score += (len(found_sections) / len(SECTION_HEADERS)) * 10
    if len(found_sections) < 3:
        missing_s = [s for s in ["experience", "education", "skills"] if s not in found_sections]
        if missing_s:
            feedback.append(f"Add clear section headers. Missing: {', '.join(missing_s)}.")

    # Contact info (0–10 pts)
    if re.search(r"[\w.\-]+@[\w.\-]+\.\w+", resume_text):
        score += 5
    else:
        feedback.append("Add a professional email address.")
    if re.search(r"(\+?\d[\d\s().\-]{7,})", resume_text):
        score += 5
    else:
        feedback.append("Include a contact phone number.")

    # Action verbs (0–10 pts)
    verb_hits = sum(1 for v in ACTION_VERBS if re.search(rf"\b{v}\b", resume_text, re.IGNORECASE))
    score += min(10.0, verb_hits * 1.5)
    if verb_hits < 4:
        feedback.append("Use stronger action verbs (e.g., led, built, optimized, delivered).")

    return score, feedback


def get_word_count(text: str) -> int:
    return len(text.strip().split())
