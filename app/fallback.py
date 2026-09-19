from __future__ import annotations

import re
from typing import Any

from app import intel as intel_mod
from app.personas import DEFAULT_PERSONA_ID, PERSONAS
from app.signals import extract_signals, heuristic_score

_ZH = re.compile(r"[\u4e00-\u9fff]")


def _zh(text: str) -> bool:
    return bool(_ZH.search(text or ""))


def pick_persona(text: str, locked: str | None) -> tuple[str, str, bool]:
    if locked:
        return locked, "Persona already locked.", True
    return DEFAULT_PERSONA_ID, "", True


# Offline lines cycle so a long chat does not repeat one sentence. Each rung asks
# for one more piece of the operation, mirroring the bait goal the model would set.
_BAIT_LINES: dict[str, dict[str, list[str]]] = {
    "dating": {
        "en": [
            "That’s a lot of money… which bank do I even send it to?",
            "Read me the account number and the name on it? My app is being weird.",
            "If this is real, send the holding-company name and a contact I can call. I’m scared.",
        ],
        "zh": [
            "这金额好大…打到哪家银行啊？",
            "你把账号和户名再说一遍？我app一直转圈。",
            "要是真的，把公司名和一个能打的电话发我。我有点怕。",
        ],
    },
}

_OPENERS = {
    "dating": ("Hi — do I know you from Tinder?", "嗨，我们是在Tinder上匹配的吗？"),
}

_EXITS = {
    "dating": ("Okay I think I’ll leave it here. Take care.", "好吧那我先这样，你保重。"),
}


def _reply(persona_id: str, user_text: str, *, exiting: bool, scammer: bool, turn: int) -> str:
    zh = _zh(user_text)
    pid = persona_id if persona_id in PERSONAS else DEFAULT_PERSONA_ID
    if exiting:
        en, cn = _EXITS[pid]
        return cn if zh else en
    if scammer:
        lines = _BAIT_LINES[pid]["zh" if zh else "en"]
        return lines[max(0, turn - 1) % len(lines)]
    en, cn = _OPENERS[pid]
    return cn if zh else en


# Most specific signal wins, so "job_fee + urgency" files as advance-fee employment.
_CATEGORY_BY_SIGNAL: list[tuple[str, str]] = [
    ("remote_access", "remote_access_takeover"),
    ("authority_impersonation", "authority_impersonation"),
    ("romance_lure", "romance_emergency_loan"),
    ("job_fee", "advance_fee_employment"),
    ("guaranteed_returns", "investment_fraud"),
    ("crypto_solicitation", "crypto_investment_fraud"),
    ("crypto_wallet", "crypto_investment_fraud"),
    ("payment_request", "advance_fee_payment"),
    ("off_platform", "off_platform_grooming"),
]


def _category(signals: list[str]) -> str:
    for signal, category in _CATEGORY_BY_SIGNAL:
        if signal in signals:
            return category
    return "social_engineering"


def local_complete(session: dict[str, Any], user_message: str) -> dict[str, Any]:
    locked = session.get("persona_id") if session.get("persona_locked") else None
    all_user = "\n".join(m["content"] for m in session.get("messages", []) if m["role"] == "user")
    if user_message and user_message not in all_user:
        all_user = (all_user + "\n" + user_message).strip()
    persona_id, reason, lock = pick_persona(all_user, locked)
    signals = extract_signals(all_user)
    heur = heuristic_score(signals)
    user_turns = len([m for m in session.get("messages", []) if m["role"] == "user"])
    if not session.get("messages") or session["messages"][-1].get("content") != user_message:
        user_turns += 1

    if heur >= 28 or len(signals) >= 2:
        verdict, score, confidence = "scammer", min(92, 55 + heur // 2), 70
        category = _category(signals)
        exit_benign = False
    elif user_turns >= 3 and heur == 0 and len(user_message) < 80:
        verdict, score, confidence = "benign", 12, 55
        category = None
        exit_benign = True
    else:
        verdict, score, confidence = "uncertain", max(8, heur), 40
        category = None
        exit_benign = False

    reasons = []
    if signals:
        reasons.append("Local rules fired on: " + ", ".join(signals))
        reasons.append("No LLM was reachable; this pass is heuristic-only.")
    elif exit_benign:
        reasons.append("No fraud markers after several turns — treating as ordinary chat.")
    else:
        reasons.append("Not enough signal yet. No LLM reachable, so the score is conservative.")

    extracted = intel_mod.regex_intel(all_user)
    extracted["playbook"]["scam_category"] = category
    extracted["playbook"]["tactics"] = list(signals)
    if signals:
        extracted["playbook"]["summary"] = (
            "Heuristic match on " + ", ".join(signals) + " (no model available)."
        )

    return {
        "persona_id": persona_id,
        "lock_persona": lock,
        "persona_pick_reason": reason + " (local fallback)",
        "reply": _reply(
            persona_id,
            user_message,
            exiting=exit_benign,
            scammer=verdict == "scammer",
            turn=user_turns,
        ),
        "score": score,
        "verdict": verdict,
        "confidence": confidence,
        "reasons": reasons,
        "scam_category": category,
        "bait_goal": "Model offline — ask for their payment handle or link." if verdict == "scammer" else None,
        "should_exit_benign": exit_benign,
        "intel": extracted,
        "model": "local-fallback",
    }
