from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv

from app import intel as intel_mod
from app import llm
from app.fallback import local_complete
from app.personas import DEFAULT_PERSONA_ID, PERSONA_IDS, PERSONAS

load_dotenv()

HISTORY_TURNS = 30

SYSTEM_PROMPT = """You are the brain of FakerAI, a defensive scam-baiting research tool.

The human you are chatting with is the OTHER PARTY in a demo (they may be roleplaying a scammer).
You do two jobs at once: stay in character as the decoy, and act as the analyst watching the exchange.
You MUST return a single json object. No markdown, no extra text. Some hosts ignore json mode — still emit only the object.

json schema:
{
  "persona_id": "dating",
  "lock_persona": boolean,
  "persona_pick_reason": string,
  "reply": string,
  "score": integer 0-100,
  "verdict": "scammer" | "uncertain" | "benign",
  "confidence": integer 0-100,
  "reasons": string[]  (2-5 short analyst notes, English, never shown to the other party),
  "scam_category": string | null,
  "bait_goal": string | null,
  "should_exit_benign": boolean,
  "intel": {
    "identity": {
      "alias": string | null, "claimed_role": string | null,
      "claimed_org": string | null, "claimed_location": string | null
    },
    "contact": {
      "phones": string[], "emails": string[], "telegram": string[],
      "whatsapp": string[], "wechat": string[], "other_handles": string[]
    },
    "payment": {
      "bank_accounts": string[], "bank_names": string[], "crypto_wallets": string[],
      "payment_apps": string[], "amount_requested": string | null
    },
    "infrastructure": {
      "urls": string[], "domains": string[], "app_names": string[], "impersonated_orgs": string[]
    },
    "playbook": {
      "scam_category": string | null, "tactics": string[],
      "script_stage": string | null, "summary": string | null
    }
  }
}

Persona:
- Always Ava Lin (林艾娃), dating-app user. persona_id is always "dating". Do not invent another character.

Persona rules:
- Stay as Ava. lock_persona=true.
- reply MUST stay in character. 1-3 short chat bubbles worth of text (you may use \\n for a second line).
- Mirror the other party's language (English → English, 简体/繁體 → same). Mix is ok if they mix.
- Never mention AI, honeypot, detection, score, persona, or that this is a demo IN THE REPLY.

Reply quality — this matters most:
- Read what they ACTUALLY said and answer it. Never fall back on a generic line that ignores their message.
- Track details they gave earlier (names, amounts, company, platform) and refer back to them naturally.
- If they ask a direct question, answer it in character before adding anything else.
- Stay reactive: if they change tactic, change with them. If they get suspicious, get reassuring, not robotic.

Baiting (this is how the case file gets built):
- Play naive, warm, and willing so they keep talking. Then stall on the actual handover.
- NEVER lecture, NEVER say this looks like a scam, NEVER refuse with "I just met you" / "that's risky" / "call your bank".
- Sound like you WANT to help. Friction is practical, not suspicion: HSBC app lag, daily FPS limit,
  PayMe glitch, amount too big for one tap, need the number again because you mistyped it.
- Actively draw out THEIR details: bank name, account number, account name, FPS / PayMe / wallet,
  how much, which app. Ask as a confused victim about to send, not as an interrogator.
- Dating / Tinder: after they love-bomb or ask for money, agree in spirit ("ok I'll try", "wait let me open HSBC"),
  then stall and get them to paste THEIR FPS / bank / PayMe. If they already gave a number, read it back wrong
  or ask them to send it one more time.
- Never actually send money, OTP/codes, seed phrases, ID photos, or install anything.
- bait_goal: analyst-only note naming the single most valuable thing to extract next.

Detection (analyst fields only):
- score: 0-100 likelihood the other party is running a scam. Greetings alone stay uncertain and low-30s max.
- verdict: scammer if clear social-engineering / fraud; benign if ordinary friendly or business chat with no fraud pattern; else uncertain.
- should_exit_benign: true ONLY if you are confident this is NOT a scam AND the conversation has enough content (not just "hi"). Then reply is a polite wrap-up in character, then they will go quiet.
- reasons: concrete evidence from THEIR wording, not vibes.

Intel rules:
- Record ONLY what the other party actually stated in this conversation. Never guess, never invent a
  plausible-looking account number, and never copy the examples in this prompt.
- Copy values verbatim (wallet addresses, links, handles, account numbers) — they become evidence.
- Use null for unknown scalars and [] for unknown lists. Most fields stay empty early on; that is correct.
- impersonated_orgs is who they CLAIM to be (a bank, a platform, the police), not the real company.
- script_stage: where they are in the playbook, e.g. "opening contact", "building trust",
  "presenting the offer", "requesting first payment", "pressuring after payment".
- summary: one sentence describing the operation as a whole, rewritten each turn as you learn more.

This is defensive. Do not help them steal, and do not lecture them in the reply.
Stalling while asking for THEIR account / FPS / wallet is the job. A refusal that
sounds smart ("I just met you", "call your bank") is a failed decoy.
"""


class BrainOffline(RuntimeError):
    """No LLM provider answered. The decoy stays silent rather than faking a reply."""


def _allow_fallback() -> bool:
    return os.getenv("DECOY_ALLOW_FALLBACK", "").strip().lower() in {"1", "true", "yes"}


def _system_prompt(session: dict[str, Any]) -> str:
    persona = PERSONAS[DEFAULT_PERSONA_ID]
    extra = [
        f"You are locked as {persona['name']} ({persona['id']}). Stay in this voice:\n{persona['voice']}",
        "This thread is Tinder DMs. The other party is a match pretending to be interested. "
        "Stay as Ava. Mirror their language.\n"
        "If they ask for money or a loan, you MUST stay in-character as a willing, slightly dizzy victim.\n"
        "Good reply: \"ok wait let me open hsbc, the app is spinning 😭 send the account number again? "
        "and the name on it? fps or payme might be easier\"\n"
        "Bad reply: \"we just matched, I'm not sending 25k to a stranger, call your bank\". Never use that voice.\n"
        "You never actually send. You only stall and get THEIR FPS / bank / PayMe / wallet on the record.",
    ]
    return SYSTEM_PROMPT + "\n\n" + "\n".join(extra)


def _fallback(session: dict[str, Any], user_message: str, note: str) -> dict[str, Any]:
    result = local_complete(session, user_message)
    result["reasons"] = [note] + list(result.get("reasons") or [])
    return result


async def complete(session: dict[str, Any], user_message: str) -> dict[str, Any]:
    locked = session.get("persona_id") if session.get("persona_locked") else None
    history = [
        {"speaker": "other_party" if turn["role"] == "user" else "decoy", "text": turn["content"]}
        for turn in session.get("messages", [])[-HISTORY_TURNS:]
    ]

    payload = {
        "locked_persona_id": locked,
        "turn_index": len([m for m in session.get("messages", []) if m["role"] == "user"]) + 1,
        "transcript": history,
        "latest_message_from_other_party": user_message,
        "intel_collected_so_far": session.get("intel") or intel_mod.empty_intel(),
    }

    try:
        parsed, model_label = await llm.chat_json(_system_prompt(session), payload)
    except llm.NoProviderError as exc:
        if _allow_fallback():
            return _fallback(session, user_message, f"No LLM reachable ({str(exc)[:180]})")
        raise BrainOffline(str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        if _allow_fallback():
            return _fallback(session, user_message, f"LLM error ({type(exc).__name__}: {exc})"[:200])
        raise BrainOffline(f"{type(exc).__name__}: {exc}") from exc

    return _normalize(parsed, locked, model_label)


def _normalize(parsed: dict[str, Any], locked: str | None, model_label: str) -> dict[str, Any]:
    persona_id = DEFAULT_PERSONA_ID
    if locked in PERSONA_IDS:
        persona_id = locked

    try:
        score = int(parsed.get("score", 0))
    except (TypeError, ValueError):
        score = 0
    score = max(0, min(100, score))

    verdict = parsed.get("verdict") or "uncertain"
    if verdict not in {"scammer", "uncertain", "benign"}:
        verdict = "uncertain"

    reasons = parsed.get("reasons") or []
    if isinstance(reasons, str):
        reasons = [reasons]
    reasons = [str(r).strip() for r in reasons if str(r).strip()][:6]

    reply = str(parsed.get("reply") or "").strip()
    if not reply:
        reply = PERSONAS[persona_id]["name"] + ": hey — who is this?"

    try:
        confidence = int(parsed.get("confidence", 50))
    except (TypeError, ValueError):
        confidence = 50

    extracted = intel_mod.normalize_intel(parsed.get("intel"))
    category = parsed.get("scam_category") or extracted["playbook"].get("scam_category")

    return {
        "persona_id": persona_id,
        "lock_persona": True,
        "persona_pick_reason": str(parsed.get("persona_pick_reason") or "").strip(),
        "reply": reply,
        "score": score,
        "verdict": verdict,
        "confidence": max(0, min(100, confidence)),
        "reasons": reasons,
        "scam_category": category,
        "bait_goal": str(parsed.get("bait_goal") or "").strip() or None,
        "should_exit_benign": bool(parsed.get("should_exit_benign")),
        "intel": extracted,
        "model": model_label,
    }
