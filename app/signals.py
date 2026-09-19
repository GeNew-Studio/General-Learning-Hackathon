from __future__ import annotations

import re

# Lightweight cues shown in the analyst panel. The model still owns the verdict.
PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("payment_request", re.compile(
        r"(wire|transfer|deposit|alipay|wechat\s*pay|payme|fps|hsbc|保证金|转账|匯款|汇款|打款|付款|支付宝|微信支付|gift\s*card)",
        re.I,
    )),
    ("crypto_wallet", re.compile(
        r"(0x[a-fA-F0-9]{40}\b|T[1-9A-HJ-NP-Za-km-z]{33}\b|bc1[a-z0-9]{25,}|seed\s*phrase|助记词|私钥)",
        re.I,
    )),
    ("secrecy", re.compile(
        r"(don't tell|dont tell|do not tell|keep (this )?secret|保密|不要告诉|别跟.*说|mute this)",
        re.I,
    )),
    ("urgency", re.compile(
        r"(act now|immediately|today only|account (will be )?frozen|马上|立刻|紧急|限时|冻结)",
        re.I,
    )),
    ("authority_impersonation", re.compile(
        r"(this is (the )?police|fbi|interpol|税务|公安|检察院|法院|客服(人员)?|your bank('s)? security)",
        re.I,
    )),
    ("remote_access", re.compile(
        r"(anydesk|teamviewer|let me (remote|share screen)|验证码告诉我|read (me )?the code)",
        re.I,
    )),
    ("job_fee", re.compile(
        r"(training (fee|deposit)|equipment (fee|deposit)|activation (fee|charge)"
        r"|registration fee|security deposit|报名费|工装费|押金|保证金|先交)",
        re.I,
    )),
    ("guaranteed_returns", re.compile(
        r"(guaranteed\s+\d+\s*%|\d+\s*%\s*(per|a|每天|日|月)|稳赚|保本|risk[- ]free)",
        re.I,
    )),
    ("crypto_solicitation", re.compile(
        r"((send|transfer|deposit)\s+(me\s+)?(your\s+)?(wallet|usdt|btc|eth|coins?)"
        r"|wallet\s+(address|connect)|connect\s+(your\s+)?wallet|vip\s+(group|signal)|连钱包|打\s*u\b|充值)",
        re.I,
    )),
    ("off_platform", re.compile(
        r"(telegram|whatsapp|wechat|move to|加微|加我微信|私聊|only on telegram)",
        re.I,
    )),
    ("romance_lure", re.compile(
        r"(tinder|bumble|hinge|private jet|security team|digital trail|"
        r"holding company|repayment (confirmation|document)|diamond (business|heir))",
        re.I,
    )),
]


def extract_signals(text: str) -> list[str]:
    hits: list[str] = []
    for name, pattern in PATTERNS:
        if pattern.search(text or ""):
            hits.append(name)
    return hits


def heuristic_score(signals: list[str]) -> int:
    if not signals:
        return 0
    weights = {
        "payment_request": 28,
        "crypto_wallet": 32,
        "secrecy": 18,
        "urgency": 14,
        "authority_impersonation": 30,
        "remote_access": 34,
        "job_fee": 30,
        "guaranteed_returns": 30,
        "crypto_solicitation": 26,
        "off_platform": 10,
        "romance_lure": 22,
    }
    raw = sum(weights.get(s, 10) for s in signals)
    return min(95, raw)
