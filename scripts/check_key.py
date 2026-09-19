"""Work out which provider a key in .env actually belongs to.

Ling is served by several hosts, so a bare "Ling API key" is ambiguous. This sends
one tiny real request per candidate host and reports which one accepts the key.

    python scripts/check_key.py
"""

from __future__ import annotations

import os
import sys

import httpx
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

# (label, base_url, model)
CANDIDATES: list[tuple[str, str, str]] = [
    ("ZenMux", "https://zenmux.ai/api/v1", "inclusionai/ling-3.0-flash"),
    ("Novita", "https://api.novita.ai/openai/v1", "inclusionai/ling-3.0-flash"),
    ("OpenRouter", "https://openrouter.ai/api/v1", "inclusionai/ling-3.0-flash"),
    ("DeepSeek", "https://api.deepseek.com", "deepseek-v4-flash"),
]

KEY_NAMES = [
    "LING_API_KEY",
    "OPENROUTER_API_KEY",
    "NOVITA_API_KEY",
    "ZENMUX_API_KEY",
    "DEEPSEEK_API_KEY",
    "LLM_API_KEY",
]


def probe(base_url: str, model: str, key: str) -> str:
    url = base_url.rstrip("/") + "/chat/completions"
    try:
        response = httpx.post(
            url,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": "say OK"}],
                "max_tokens": 5,
            },
            timeout=httpx.Timeout(connect=6.0, read=45.0, write=8.0, pool=5.0),
        )
    except Exception as exc:  # noqa: BLE001
        return f"unreachable ({type(exc).__name__})"

    if response.status_code < 400:
        return "WORKS"
    if response.status_code in {401, 403}:
        return "key rejected (wrong provider for this key)"
    if response.status_code == 402:
        return "key valid but no credit"
    if response.status_code == 404:
        return "key ok, model not found on this host"
    return f"HTTP {response.status_code}: {response.text[:110]}"


def main() -> None:
    found = {name: os.getenv(name) for name in KEY_NAMES}
    found = {k: v.strip() for k, v in found.items() if v and v.strip()}

    if not found:
        print("No API keys found in .env.")
        print("Looked for:", ", ".join(KEY_NAMES))
        print("\nDid you save the file? (Ctrl+S)")
        return

    print("Keys found in .env:")
    for name, value in found.items():
        print(f"  {name:<22} {len(value)} chars, starts {value[:8]}...")

    for name, key in found.items():
        print(f"\n--- testing {name} against each host ---")
        for label, base_url, model in CANDIDATES:
            print(f"  {label:<12} {probe(base_url, model, key)}")


if __name__ == "__main__":
    main()
