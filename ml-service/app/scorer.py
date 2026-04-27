"""
Main scoring orchestrator — combines TF-IDF keyword scoring,
formatting analysis, and CNN semantic similarity into a final ATS score.
"""

import logging
from typing import Optional
from .models.tfidf_scorer import (
    compute_keyword_score,
    compute_formatting_score,
    get_word_count,
)
from .models.cnn_embedder import get_embedder

logger = logging.getLogger(__name__)

# Semantic bonus cap (points added on top of keyword + formatting)
SEMANTIC_BONUS_MAX = 15


def score_resume(resume_text: str, job_description: Optional[str] = None) -> dict:
    """
    Full ATS scoring pipeline.

    Returns:
        {
            ats_score: int (0–100),
            matched_keywords: list[str],
            missing_keywords: list[str],
            semantic_similarity: float (0.0–1.0),
            feedback: list[str],
            word_count: int,
        }
    """
    word_count = get_word_count(resume_text)

    # 1. TF-IDF keyword score (0–60 pts)
    keyword_score, matched_keywords, missing_keywords = compute_keyword_score(
        resume_text, job_description
    )

    # 2. Formatting score (0–40 pts)
    formatting_score, feedback = compute_formatting_score(resume_text)

    base_score = keyword_score + formatting_score

    # 3. CNN semantic similarity bonus (0–15 pts)
    semantic_similarity = 0.0
    semantic_bonus = 0.0

    if job_description and len(job_description.strip()) > 20:
        try:
            embedder = get_embedder()
            semantic_similarity = embedder.similarity(resume_text, job_description)
            semantic_bonus = semantic_similarity * SEMANTIC_BONUS_MAX
            logger.debug(f"Semantic similarity: {semantic_similarity:.3f}, bonus: {semantic_bonus:.1f}")
        except Exception as e:
            logger.warning(f"Semantic scoring failed, using TF-IDF only: {e}")
            semantic_similarity = 0.0
            semantic_bonus = 0.0

    # 4. Final score — capped at 100
    final_score = int(min(100, round(base_score + semantic_bonus)))

    # 5. Keyword feedback
    if missing_keywords:
        top_missing = missing_keywords[:5]
        feedback.insert(0, f"Consider adding key terms: {', '.join(top_missing)}.")
    elif matched_keywords:
        feedback.insert(0, "Excellent keyword coverage — your resume aligns well with the target role.")

    return {
        "ats_score": final_score,
        "matched_keywords": matched_keywords,
        "missing_keywords": missing_keywords,
        "semantic_similarity": round(semantic_similarity, 4),
        "feedback": feedback,
        "word_count": word_count,
    }
