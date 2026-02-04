import os
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

import braintrust


@dataclass
class PromptRef:
    project: str
    slug: str
    environment: Optional[str] = None
    version: Optional[str] = None


class BraintrustPromptLoader:
    """
    Loads prompts from Braintrust with a safe local fallback + in-process caching.
    Designed for server usage (FastAPI) where prompt changes should roll out quickly,
    but we also want to avoid fetching on every request.
    """

    def __init__(self, cache_ttl_seconds: int = 60):
        self.cache_ttl_seconds = cache_ttl_seconds
        self._cache: Dict[Tuple[str, str, Optional[str], Optional[str]], Tuple[float, str]] = {}

    def load_text(
        self,
        ref: PromptRef,
        *,
        variables: Optional[Dict[str, Any]] = None,
        fallback_text: Optional[str] = None,
    ) -> str:
        cache_key = (ref.project, ref.slug, ref.environment, ref.version)
        now = time.time()

        cached = self._cache.get(cache_key)
        if cached:
            ts, text = cached
            if now - ts <= self.cache_ttl_seconds:
                return text

        try:
            kwargs: Dict[str, Any] = {"project": ref.project, "slug": ref.slug}
            # Braintrust supports either environment OR version (mutually exclusive).
            if ref.environment:
                kwargs["environment"] = ref.environment
            elif ref.version:
                kwargs["version"] = ref.version

            prompt = braintrust.load_prompt(**kwargs)
            built = prompt.build(variables or {})
            text = built["prompt"] if isinstance(built, dict) else built.prompt  # tolerate SDK variations

            if not isinstance(text, str) or not text.strip():
                raise ValueError("Braintrust returned empty prompt text")

            text = text.strip()
            self._cache[cache_key] = (now, text)
            return text
        except Exception:
            if fallback_text is not None and fallback_text.strip():
                return fallback_text.strip()
            raise


def prompt_ref_from_env(prefix: str, *, default_project: str) -> PromptRef:
    """
    Reads:
      - {prefix}_SLUG (required)
      - BRAINTRUST_PROJECT (optional override)
      - BRAINTRUST_PROMPT_ENV (optional)
      - {prefix}_VERSION (optional)
    """
    slug = os.getenv(f"{prefix}_SLUG")
    if not slug:
        raise ValueError(f"Missing env var: {prefix}_SLUG")

    project = os.getenv("BRAINTRUST_PROJECT", default_project)
    environment = os.getenv("BRAINTRUST_PROMPT_ENV") or None
    version = os.getenv(f"{prefix}_VERSION") or None

    return PromptRef(project=project, slug=slug, environment=environment, version=version)
