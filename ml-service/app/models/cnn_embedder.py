"""
Lightweight semantic embedder using pure numpy.
Simulates CNN-style text embedding via character n-gram hashing + pooling.
No scikit-learn or torch required.
"""

import re
import math
import logging
import numpy as np
from typing import Optional

logger = logging.getLogger(__name__)

EMBED_DIM = 128


class CNNEmbedder:
    """
    Character n-gram hashing embedder (pure numpy).

    Each text is converted to a fixed-size vector by:
    1. Extracting character 2–4 grams
    2. Hashing each n-gram to a bucket (feature hashing trick)
    3. Averaging bucket values (simulates global average pooling)
    4. L2 normalizing the result

    This captures sub-word patterns similar to CNN filter activations
    without requiring any external ML library.
    """

    def __init__(self, dim: int = EMBED_DIM):
        self.dim = dim
        self._fitted = True  # Always ready — no training needed
        logger.info(f"CNN embedder ready (dim={dim}, pure numpy)")

    def _ngrams(self, text: str, n: int) -> list[str]:
        text = f" {text} "
        return [text[i:i+n] for i in range(len(text) - n + 1)]

    def embed(self, text: str) -> Optional[np.ndarray]:
        """Generate a dense embedding vector for the given text."""
        try:
            clean = re.sub(r"\s+", " ", text.lower().strip())
            if len(clean) < 10:
                return None

            vec = np.zeros(self.dim, dtype=np.float32)
            count = 0

            for n in (2, 3, 4):
                for gram in self._ngrams(clean, n):
                    # FNV-1a hash → bucket index
                    h = 2166136261
                    for ch in gram.encode("utf-8"):
                        h ^= ch
                        h = (h * 16777619) & 0xFFFFFFFF
                    idx = h % self.dim
                    # Weight longer n-grams more
                    vec[idx] += math.log(1 + n)
                    count += 1

            if count == 0:
                return None

            vec /= count

            # L2 normalize
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm

            return vec
        except Exception as e:
            logger.warning(f"Embedding failed: {e}")
            return None

    def similarity(self, text_a: str, text_b: str) -> float:
        """Cosine similarity between two texts. Returns 0.0 on failure."""
        vec_a = self.embed(text_a)
        vec_b = self.embed(text_b)
        if vec_a is None or vec_b is None:
            return 0.0
        try:
            dot = float(np.dot(vec_a, vec_b))
            return float(max(0.0, min(1.0, dot)))  # already unit vectors
        except Exception as e:
            logger.warning(f"Similarity failed: {e}")
            return 0.0


_embedder: Optional[CNNEmbedder] = None


def get_embedder() -> CNNEmbedder:
    global _embedder
    if _embedder is None:
        logger.info("Initializing CNN embedder...")
        _embedder = CNNEmbedder()
    return _embedder
