from __future__ import annotations

import re
from typing import Any

from app import intel as intel_mod
from app.personas import DEFAULT_PERSONA_ID, PERSONAS
from app.signals import extract_signals, heuristic_score

_ZH = re.compile(r"[\u4e00-\u9fff]")

_LURE_HINTS: list[tuple[str, tuple[str, ...]]] = [
    ("dating", ("tinder", "bumble", "hinge", "private jet", "dating", "soulmate", "my security", "digital trail", "diamond")),
    ("job_seeker", ("hr", "hiring", "salary", "internship", "兼职", "招聘", "面试", "岗位", "task", "remote job", "培训费")),
    ("crypto", ("btc", "eth", "usdt", "wallet", "seed", "crypto", "trading", "apy", "钱包", "比特币", "合约", "收益")),
    ("elder", ("police", "bank", "grandson", "parcel", "pension", "公安", "法院", "客服", "快递", "验证码", "冻结")),
    ("student", ("campus", "dorm", "scholarship", "同学", "学校", "兼职", "学分")),
]


def _zh(text: str) -> bool:
    return bool(_ZH.search(text or ""))


def pick_persona(text: str, locked: str | None) -> tuple[str, str, bool]:
    if locked:
        return locked, "Persona already locked.", True
    blob = (text or "").lower()
    scores: dict[str, int] = {pid: 0 for pid in PERSONAS}
    for pid, words in _LURE_HINTS:
        scores[pid] = sum(1 for w in words if w in blob)
    best = max(scores, key=lambda k: scores[k])
    if scores[best] == 0:
        return DEFAULT_PERSONA_ID, "Opener is thin; defaulting to student until the lure is clear.", False
    return best, f"Matched {PERSONAS[best]['role']} lure language.", True


# Offline lines cycle so a long chat does not repeat one sentence. Each rung asks
# for one more piece of the operation, mirroring the bait goal the model would set.
_BAIT_LINES: dict[str, dict[str, list[str]]] = {
    "student": {
        "en": [
            "Wait, a training fee first? I’m kinda broke this month… can I try two days unpaid?",
            "Okay but where would I even send it — do you have an account or a link?",
            "My roommate got scammed like this. Who do I contact if something goes wrong? Got a number?",
        ],
        "zh": [
            "还要先交培训费吗…我这个月生活费有点紧，能先做两天看看吗？",
            "那我打到哪里呀？有账号还是链接？",
            "我室友被骗过…出问题我找谁？你有电话或者微信吗？",
        ],
    },
    "elder": {
        "en": [
            "Are you from the bank? Speak slowly — how much do I need to move?",
            "Which account is the safe one? Read me the number, I’ll write it down.",
            "My son handles my phone. What’s your name and office number so he can call back?",
        ],
        "zh": [
            "你们是银行的吗？我耳朵不好，你再说一遍要我转多少？",
            "安全账户是哪个呀？你把卡号念一遍，我拿笔记下来。",
            "我儿子管我手机的。你叫什么名字，单位电话多少？让他回个电话。",
        ],
    },
    "crypto": {
        "en": [
            "What’s the actual APY? And who’s running the desk?",
            "Send the wallet address, I’ll test with dust first. Seed phrase is a no.",
            "Which exchange do you clear through? Drop the group link and your handle.",
        ],
        "zh": [
            "到底多少APY？盘子谁在做？",
            "把钱包地址发来，我先小额试，助记词免谈。",
            "你们走哪个交易所？群链接和你的联系方式发一下。",
        ],
    },
    "job_seeker": {
        "en": [
            "How does the pay work? If there’s an upfront fee I need details — I got burned once.",
            "Which account do I pay into? Company name and number, please.",
            "Can you send the company site and your work contact? I want to check it’s registered.",
        ],
        "zh": [
            "工资怎么结？要先交钱我得问清楚，我上次被骗过。",
            "交到哪个账户？公司名字和账号发我看看。",
            "官网和你的工作联系方式发一下，我想查一下是不是正规公司。",
        ],
    },
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
    "student": ("Hey — who is this? I’m in the dorm.", "嗨，你是？我在宿舍呢。"),
    "elder": ("Hello? Who is calling — I only just learned this app.", "哎你是哪位呀？我刚学会用这个。"),
    "crypto": ("Go on. What are we looking at.", "说，什么盘。"),
    "job_seeker": ("Hi — is this about a role?", "你好，是招聘的吗？"),
    "dating": ("Hi — do I know you from Tinder?", "嗨，我们是在Tinder上匹配的吗？"),
}

_EXITS = {
    "student": ("Ah I think I’ve got the wrong chat — gonna go study. Take care.", "嗯我好像认错人了，那我先去写作业了，再见。"),
    "elder": ("Oh — then I won’t keep you. I’ll go eat. Take care, dear.", "哦哦，那不打扰你了，我先去吃饭。保重。"),
    "crypto": ("Alright, I’m gonna go stare at charts. Later.", "行吧那我先看盘了。"),
    "job_seeker": ("Okay — I’ll keep sending CVs. Best of luck.", "好的那我继续投简历了，祝顺利。"),
    "dating": ("Okay I think I’ll leave it here. Take care.", "好吧那我先这样，你保重。"),
}


def _reply(persona_id: str, user_text: str, *, exiting: bool, scammer: bool, turn: int) -> str:
    zh = _zh(user_text)
    if exiting:
        en, cn = _EXITS[persona_id]
        return cn if zh else en
    if scammer:
        lines = _BAIT_LINES[persona_id]["zh" if zh else "en"]
        return lines[max(0, turn - 1) % len(lines)]
    en, cn = _OPENERS[persona_id]
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
