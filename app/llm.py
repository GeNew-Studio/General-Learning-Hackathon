"""Provider chain for OpenAI-compatible chat completions.

Providers are tried in order. A connection-level failure puts that provider on a
cooldown so a blocked host (api.deepseek.com is TLS-reset on some networks) does
not cost every later turn a timeout.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

COOLDOWN_SECONDS = float(os.getenv("LLM_COOLDOWN_SECONDS", "120"))
AUTH_COOLDOWN_SECONDS = 900.0
# Free tiers hand out 429s under load; a short wait usually clears them.
RATE_LIMIT_RETRIES = 2
RATE_LIMIT_BACKOFF = 1.5
TIMEOUT = httpx.Timeout(connect=4.0, read=60.0, write=10.0, pool=5.0)


class NoProviderError(RuntimeError):
    """No configured provider could answer."""


@dataclass
class Provider:
    name: str
    base_url: str
    api_key: str
    models: list[str]
    headers: dict[str, str] = field(default_factory=dict)
    extra_body: dict[str, Any] = field(default_factory=dict)
    cooldown_until: float = 0.0
    last_error: str = ""
    supports_json_mode: bool = True

    @property
    def url(self) -> str:
        return self.base_url.rstrip("/") + "/chat/completions"

    @property
    def configured(self) -> bool:
        return bool(self.api_key and self.base_url and self.models)

    @property
    def ready(self) -> bool:
        return self.configured and time.time() >= self.cooldown_until


def _model_list(*names: str | None) -> list[str]:
    out: list[str] = []
    for name in names:
        cleaned = (name or "").strip()
        if cleaned and cleaned not in out:
            out.append(cleaned)
    return out


def _env(*names: str, default: str = "") -> str:
    """First non-empty env var. Tolerates the casing people actually type."""
    for name in names:
        value = (os.getenv(name) or os.getenv(name.lower()) or "").strip()
        if value:
            return value
    return default


def _build_providers() -> list[Provider]:
    thinking = os.getenv("DEEPSEEK_THINKING", "disabled").strip().lower()
    candidates = [
        Provider(
            name="deepseek",
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            api_key=(os.getenv("DEEPSEEK_API_KEY") or "").strip(),
            models=_model_list(
                os.getenv("DEEPSEEK_MODEL"), "deepseek-v4-flash", "deepseek-v4-pro"
            ),
            # V4 thinks by default; a chat decoy needs the latency back.
            extra_body={"thinking": {"type": thinking}} if thinking in {"enabled", "disabled"} else {},
        ),
        # Ling is open-weight and served by several hosts; ZenMux is the route on
        # InclusionAI's own model card and is reachable where DeepSeek is filtered.
        Provider(
            name="ling",
            base_url=_env("LING_BASE_URL", default="https://zenmux.ai/api/v1"),
            api_key=_env("LING_API_KEY"),
            # Free Ling capacity is flaky, so fall through to other free models
            # that are still strong in Chinese and English.
            models=_model_list(
                _env("LING_MODEL"),
                "inclusionai/ling-3.0-flash",
                "inclusionai/ling-3.0-flash-fin:free",
                "z-ai/glm-5.2:free",
                "minimax/minimax-m3:free",
            ),
            headers={"HTTP-Referer": "http://127.0.0.1:8787", "X-Title": "FakerAI"},
        ),
        Provider(
            name="openrouter",
            base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
            api_key=(os.getenv("OPENROUTER_API_KEY") or "").strip(),
            models=_model_list(
                os.getenv("OPENROUTER_MODEL"),
                "deepseek/deepseek-v4-flash",
                "deepseek/deepseek-v4-pro",
            ),
            headers={"HTTP-Referer": "http://127.0.0.1:8787", "X-Title": "FakerAI"},
        ),
        Provider(
            name=(os.getenv("LLM_NAME") or "custom").strip(),
            base_url=(os.getenv("LLM_BASE_URL") or "").strip(),
            api_key=(os.getenv("LLM_API_KEY") or "").strip(),
            models=_model_list(os.getenv("LLM_MODEL")),
        ),
    ]
    return [p for p in candidates if p.configured]


PROVIDERS: list[Provider] = _build_providers()


def reload_providers() -> None:
    global PROVIDERS
    load_dotenv(override=True)
    PROVIDERS = _build_providers()


def parse_json(content: str) -> dict[str, Any]:
    text = (content or "").strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise
        return json.loads(match.group(0))


def _is_model_error(status: int, body: str) -> bool:
    if status not in {400, 404}:
        return False
    return "model" in body.lower()


def _is_json_mode_error(status: int, body: str) -> bool:
    if status != 400:
        return False
    lowered = body.lower()
    return "response_format" in lowered or "json_object" in lowered


async def _post(
    client: httpx.AsyncClient,
    provider: Provider,
    model: str,
    messages: list[dict[str, str]],
    temperature: float,
    json_mode: bool,
) -> httpx.Response:
    body: dict[str, Any] = {
        "model": model,
        "temperature": temperature,
        "messages": messages,
        **provider.extra_body,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    return await client.post(
        provider.url,
        headers={
            "Authorization": f"Bearer {provider.api_key}",
            "Content-Type": "application/json",
            **provider.headers,
        },
        json=body,
    )


class _ProviderDown(Exception):
    """This provider is unusable for now; move on to the next one."""


async def _run_provider(
    provider: Provider,
    messages: list[dict[str, str]],
    temperature: float,
    errors: list[str],
) -> tuple[dict[str, Any], str] | None:
    async with httpx.AsyncClient(
        timeout=TIMEOUT, headers={"User-Agent": "FakerAI/0.2"}
    ) as client:
        for model in provider.models:
            retry_without_json_mode = True
            rate_limit_attempts = 0
            while True:
                try:
                    response = await _post(
                        client, provider, model, messages, temperature, provider.supports_json_mode
                    )
                except (
                    httpx.ConnectError,
                    httpx.ConnectTimeout,
                    httpx.ReadError,
                    httpx.RemoteProtocolError,
                ) as exc:
                    provider.last_error = f"{type(exc).__name__}: {exc}"[:160]
                    provider.cooldown_until = time.time() + COOLDOWN_SECONDS
                    errors.append(f"{provider.name}: {provider.last_error}")
                    raise _ProviderDown from exc

                if response.status_code < 400:
                    try:
                        data = response.json()
                        content = data["choices"][0]["message"]["content"]
                        parsed = parse_json(content)
                    except Exception as exc:  # noqa: BLE001
                        errors.append(f"{provider.name}/{model}: unparseable reply ({exc})")
                        break
                    provider.last_error = ""
                    return parsed, f"{provider.name}:{data.get('model') or model}"

                body = response.text[:300]
                if response.status_code == 429:
                    if rate_limit_attempts < RATE_LIMIT_RETRIES:
                        retry_after = response.headers.get("retry-after")
                        try:
                            delay = float(retry_after) if retry_after else 0.0
                        except ValueError:
                            delay = 0.0
                        delay = delay or RATE_LIMIT_BACKOFF * (2**rate_limit_attempts)
                        rate_limit_attempts += 1
                        await asyncio.sleep(min(delay, 8.0))
                        continue
                    provider.last_error = f"HTTP 429: {body}"[:160]
                    errors.append(f"{provider.name}/{model}: rate limited, trying next model")
                    break
                if response.status_code == 402:
                    # Out of credit for this model; a free one may still work.
                    provider.last_error = f"HTTP 402: {body}"[:160]
                    errors.append(f"{provider.name}/{model}: no credit for this model")
                    break
                if response.status_code in {401, 403}:
                    provider.last_error = f"HTTP {response.status_code}: {body}"[:160]
                    provider.cooldown_until = time.time() + AUTH_COOLDOWN_SECONDS
                    errors.append(f"{provider.name}: {provider.last_error}")
                    raise _ProviderDown

                errors.append(f"{provider.name}/{model}: HTTP {response.status_code} {body}")
                if retry_without_json_mode and _is_json_mode_error(response.status_code, body):
                    provider.supports_json_mode = False
                    retry_without_json_mode = False
                    continue
                break
    return None


async def chat_json(
    system_prompt: str,
    user_payload: dict[str, Any],
    *,
    temperature: float = 0.5,
) -> tuple[dict[str, Any], str]:
    """Return (parsed JSON object, "provider:model"). Raises NoProviderError."""
    if not PROVIDERS:
        raise NoProviderError("No LLM provider configured. Set DEEPSEEK_API_KEY in .env")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
    ]
    errors: list[str] = []

    for provider in PROVIDERS:
        if not provider.ready:
            errors.append(f"{provider.name}: cooling down ({provider.last_error or 'recent failure'})")
            continue
        try:
            result = await _run_provider(provider, messages, temperature, errors)
        except _ProviderDown:
            continue
        if result is not None:
            return result

    raise NoProviderError("; ".join(errors) or "all providers failed")


def health() -> list[dict[str, Any]]:
    now = time.time()
    return [
        {
            "name": p.name,
            "base_url": p.base_url,
            "models": p.models,
            "ready": p.ready,
            "cooldown_seconds": max(0, round(p.cooldown_until - now)),
            "last_error": p.last_error,
        }
        for p in PROVIDERS
    ]
