"""
Resume Analyzer ML Service
FastAPI application exposing the /score endpoint.
"""

import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Startup: pre-load models ──────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading ML models...")
    try:
        from app.models.cnn_embedder import get_embedder
        embedder = get_embedder()
        if embedder._fitted:
            logger.info("✅ CNN embedder loaded successfully")
        else:
            logger.warning("⚠️  CNN embedder failed to fit — semantic scoring disabled")
    except Exception as e:
        logger.error(f"❌ Model loading error: {e}")
        raise RuntimeError(f"Failed to load ML models: {e}")
    yield
    logger.info("ML service shutting down")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Resume Analyzer ML Service",
    description="TF-IDF + CNN embedding ATS scoring service",
    version="1.0.0",
    lifespan=lifespan,
    # Restrict docs in production
    docs_url="/docs" if os.getenv("ENV", "development") != "production" else None,
    redoc_url=None,
)

# Only allow requests from the API server (not public internet)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3001").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    resume_text: str
    job_description: Optional[str] = None

    @field_validator("resume_text")
    @classmethod
    def validate_resume_text(cls, v: str) -> str:
        v = v.strip()
        word_count = len(v.split())
        if word_count < 30:
            raise ValueError(
                f"Resume text is too short ({word_count} words). Minimum 30 words required."
            )
        if len(v) > 100_000:
            raise ValueError("Resume text exceeds maximum length of 100,000 characters.")
        return v

    @field_validator("job_description")
    @classmethod
    def validate_job_description(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) > 10_000:
                raise ValueError("Job description exceeds maximum length of 10,000 characters.")
            if len(v) == 0:
                return None
        return v


class ScoreResponse(BaseModel):
    ats_score: int
    matched_keywords: list[str]
    missing_keywords: list[str]
    semantic_similarity: float
    feedback: list[str]
    word_count: int


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/score", response_model=ScoreResponse)
def score(request: ScoreRequest):
    """
    Score a resume against an optional job description.

    - **resume_text**: Extracted plain text from the resume (min 30 words)
    - **job_description**: Optional job description for role-specific scoring
    """
    try:
        from app.scorer import score_resume
        result = score_resume(request.resume_text, request.job_description)
        return ScoreResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Scoring error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Scoring failed. Please try again.")
