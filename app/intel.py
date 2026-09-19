"""Structured intelligence pulled out of a conversation.

The model is the primary extractor; the regex pass is a safety net that also
gives the offline fallback something to record. Intel accumulates across turns —
a wallet mentioned on turn 2 stays in the dossier on turn 9.
"""

from __future__ import annotations

import copy
import re
from typing import Any

LIST_FIELDS: dict[str, tuple[str, ...]] = {
    "contact": ("phones", "emails", "telegram", "whatsapp", "wechat", "other_handles"),
    "payment": ("bank_accounts", "bank_names", "crypto_wallets", "payment_apps"),
    "infrastructure": ("urls", "domains", "app_names", "impersonated_orgs"),
    "playbook": ("tactics",),
}

# Scalars that describe a fixed fact — first confident answer wins.
STICKY_FIELDS: dict[str, tuple[str, ...]] = {
    "identity": ("alias", "claimed_role", "claimed_org", "claimed_location"),
}

# Scalars that describe the current state — always take the newest answer.
LATEST_FIELDS: dict[str, tuple[str, ...]] = {
    "payment": ("amount_requested",),
    "playbook": ("scam_category", "script_stage", "summary"),
}

SECTIONS = ("identity", "contact", "payment", "infrastructure", "playbook")

MAX_ITEMS = 40
_NULLISH = {"", "none", "null", "n/a", "na", "unknown", "unspecified", "not mentioned", "-", "未知", "无", "没有"}

IOC_KIND_LABELS: dict[str, str] = {
    "phones": "phone",
    "emails": "email",
    "telegram": "telegram",
    "whatsapp": "whatsapp",
    "wechat": "wechat",
    "other_handles": "handle",
    "bank_accounts": "bank_account",
    "bank_names": "bank_name",
    "crypto_wallets": "crypto_wallet",
    "payment_apps": "payment_app",
    "urls": "url",
    "domains": "domain",
    "app_names": "app_name",
    "impersonated_orgs": "impersonated_org",
    "alias": "alias",
    "claimed_role": "claimed_role",
    "claimed_org": "claimed_org",
    "claimed_location": "claimed_location",
}

# Fields that are hard evidence — a case is worth filing when these show up.
HARD_IOC_FIELDS = (
    "phones",
    "emails",
    "telegram",
    "whatsapp",
    "wechat",
    "bank_accounts",
    "crypto_wallets",
    "urls",
    "domains",
)


def empty_intel() -> dict[str, Any]:
    intel: dict[str, Any] = {section: {} for section in SECTIONS}
    for section, fields in LIST_FIELDS.items():
        for field in fields:
            intel[section][field] = []
    for mapping in (STICKY_FIELDS, LATEST_FIELDS):
        for section, fields in mapping.items():
            for field in fields:
                intel[section][field] = None
    return intel


def _clean_scalar(value: Any) -> str | None:
    if value is None or isinstance(value, (dict, list)):
        return None
    text = str(value).strip()
    if text.casefold() in _NULLISH:
        return None
    return text[:200]


# Account numbers and handles get written with spaces, dashes or brackets. The
# model and the regex net often disagree on spacing for the same account.
_IDENTIFIER_FIELDS = frozenset({"phones", "bank_accounts", "crypto_wallets"})
_SEPARATORS = re.compile(r"[\s\-()._]+")


def dedupe_key(field: str, value: str) -> str:
    key = value.casefold()
    if field in _IDENTIFIER_FIELDS:
        key = _SEPARATORS.sub("", key)
    return key


def _clean_list(value: Any, field: str = "") -> list[str]:
    if value is None:
        return []
    if isinstance(value, (str, int, float)):
        value = [value]
    elif isinstance(value, dict):
        return []
    else:
        try:
            value = list(value)
        except TypeError:
            return []
    out: list[str] = []
    seen: set[str] = set()
    for item in value:
        if isinstance(item, dict):
            item = item.get("value") or item.get("address") or item.get("number") or ""
        cleaned = _clean_scalar(item)
        if not cleaned:
            continue
        key = dedupe_key(field, cleaned)
        if key in seen:
            continue
        seen.add(key)
        out.append(cleaned)
    return out[:MAX_ITEMS]


def normalize_intel(raw: Any) -> dict[str, Any]:
    """Coerce whatever the model returned into the fixed shape."""
    intel = empty_intel()
    if not isinstance(raw, dict):
        return intel
    for section, fields in LIST_FIELDS.items():
        block = raw.get(section)
        if not isinstance(block, dict):
            continue
        for field in fields:
            intel[section][field] = _clean_list(block.get(field), field)
    for mapping in (STICKY_FIELDS, LATEST_FIELDS):
        for section, fields in mapping.items():
            block = raw.get(section)
            if not isinstance(block, dict):
                continue
            for field in fields:
                intel[section][field] = _clean_scalar(block.get(field))
    return intel


def merge_intel(base: dict[str, Any] | None, incoming: dict[str, Any] | None) -> dict[str, Any]:
    merged = copy.deepcopy(base) if base else empty_intel()
    for section in SECTIONS:
        merged.setdefault(section, {})
    if not incoming:
        return merged

    for section, fields in LIST_FIELDS.items():
        for field in fields:
            combined = list(merged[section].get(field) or [])
            seen = {dedupe_key(field, v) for v in combined}
            for value in incoming.get(section, {}).get(field) or []:
                key = dedupe_key(field, value)
                if key not in seen:
                    seen.add(key)
                    combined.append(value)
            merged[section][field] = combined[:MAX_ITEMS]

    for section, fields in STICKY_FIELDS.items():
        for field in fields:
            if not merged[section].get(field):
                merged[section][field] = incoming.get(section, {}).get(field)

    for section, fields in LATEST_FIELDS.items():
        for field in fields:
            value = incoming.get(section, {}).get(field)
            if value:
                merged[section][field] = value
    return merged


def flatten_iocs(intel: dict[str, Any]) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for section, fields in LIST_FIELDS.items():
        for field in fields:
            kind = IOC_KIND_LABELS.get(field)
            if not kind:
                continue
            for value in intel.get(section, {}).get(field) or []:
                out.append((kind, value))
    for section, fields in STICKY_FIELDS.items():
        for field in fields:
            value = intel.get(section, {}).get(field)
            if value:
                out.append((IOC_KIND_LABELS[field], value))
    return out


def count_iocs(intel: dict[str, Any]) -> int:
    return len(flatten_iocs(intel))


def count_hard_iocs(intel: dict[str, Any]) -> int:
    total = 0
    for section, fields in LIST_FIELDS.items():
        for field in fields:
            if field in HARD_IOC_FIELDS:
                total += len(intel.get(section, {}).get(field) or [])
    return total


# --------------------------------------------------------------------------
# Regex safety net
# --------------------------------------------------------------------------

_RE_EMAIL = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b")
_RE_URL = re.compile(r"\b(?:https?://|www\.)[^\s<>\"'，。、]+", re.I)
_RE_DOMAIN = re.compile(
    r"\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+"
    r"(?:com|net|org|io|co|cn|vip|xyz|top|app|site|online|shop|info|biz|live|club|me|pro|cc|tv)\b",
    re.I,
)
_RE_ETH = re.compile(r"\b0x[a-fA-F0-9]{40}\b")
_RE_TRON = re.compile(r"\bT[1-9A-HJ-NP-Za-km-z]{33}\b")
_RE_BTC = re.compile(r"\b(?:bc1[ac-hj-np-z02-9]{11,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b")
_RE_TELEGRAM = re.compile(r"(?:t\.me/|telegram(?:\s*:|\s+id\s*:?|\s+)?\s*)@?([A-Za-z][\w]{4,31})", re.I)
_RE_AT_HANDLE = re.compile(r"(?<![\w/])@([A-Za-z][\w]{4,31})\b")
_RE_WHATSAPP = re.compile(r"(?:wa\.me/|whatsapp[^\d+]{0,12})(\+?\d[\d\s-]{6,18}\d)", re.I)
_RE_WECHAT = re.compile(r"(?:wechat|weixin|微信(?:号)?)\s*(?:id|:|：|是|＝|=)?\s*([A-Za-z][\w-]{4,25}|\d{6,20})", re.I)
_RE_PHONE = re.compile(r"(?<![\w.])(?:\+\d{1,3}[\s-]?)?(?:1[3-9]\d{9}|\d{3}[\s-]\d{3,4}[\s-]\d{4}|\+\d{8,15})(?![\w.])")
_RE_IBAN = re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b")
_RE_BANK_NUM = re.compile(
    r"(?:account(?:\s*(?:no|number|#))?|acct|卡号|账号|账户|银行卡|戶口|户口)\s*(?:is|:|：|=)?\s*(\d[\d\s-]{7,24}\d)",
    re.I,
)
_RE_HSBC = re.compile(r"\b(?:HSBC|Hang\s*Seng|BOC|DBS|SCB)\s+(\d{3}[- ]\d{6,9}[- ]\d{2,4})\b", re.I)
_RE_FPS = re.compile(r"\bFPS(?:\s*(?:id|ID|:|：))?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+|\d{8,12})\b")
_RE_AMOUNT = re.compile(
    r"(?:(?:USD|RMB|CNY|HKD|EUR|GBP|USDT|BTC|ETH|\$|¥|￥|€|£)\s*[\d,]+(?:\.\d+)?"
    r"|[\d,]+(?:\.\d+)?\s*(?:USDT|USD|RMB|CNY|HKD|EUR|GBP|BTC|ETH|元|块|万|萬))",
    re.I,
)

_PAYMENT_APPS = {
    "payme": "PayMe",
    "fps": "FPS",
    "hsbc": "HSBC",
    "hang seng": "Hang Seng",
    "alipay": "Alipay",
    "支付宝": "Alipay",
    "wechat pay": "WeChat Pay",
    "微信支付": "WeChat Pay",
    "paypal": "PayPal",
    "venmo": "Venmo",
    "cash app": "Cash App",
    "cashapp": "Cash App",
    "zelle": "Zelle",
    "revolut": "Revolut",
    "wise": "Wise",
    "payoneer": "Payoneer",
    "binance": "Binance",
    "okx": "OKX",
    "bybit": "Bybit",
    "coinbase": "Coinbase",
    "metamask": "MetaMask",
    "trust wallet": "Trust Wallet",
    "western union": "Western Union",
    "gift card": "Gift card",
    "google play card": "Google Play card",
}

_REMOTE_APPS = {
    "anydesk": "AnyDesk",
    "teamviewer": "TeamViewer",
    "rustdesk": "RustDesk",
    "quicksupport": "QuickSupport",
}


def regex_intel(text: str) -> dict[str, Any]:
    """Cheap deterministic extraction over the other party's messages."""
    intel = empty_intel()
    blob = text or ""
    lowered = blob.lower()

    intel["contact"]["emails"] = _clean_list(_RE_EMAIL.findall(blob))

    urls = [u.rstrip(".,;)!?") for u in _RE_URL.findall(blob)]
    intel["infrastructure"]["urls"] = _clean_list(urls)

    url_blob = " ".join(urls).lower()
    domains = [d for d in _RE_DOMAIN.findall(blob) if d.lower() not in url_blob]
    intel["infrastructure"]["domains"] = _clean_list(domains)

    wallets = _RE_ETH.findall(blob) + _RE_TRON.findall(blob) + _RE_BTC.findall(blob)
    intel["payment"]["crypto_wallets"] = _clean_list(wallets)

    telegram = _RE_TELEGRAM.findall(blob)
    if "telegram" in lowered or "t.me" in lowered:
        telegram += _RE_AT_HANDLE.findall(blob)
    intel["contact"]["telegram"] = _clean_list(f"@{h.lstrip('@')}" for h in telegram)

    intel["contact"]["whatsapp"] = _clean_list(
        re.sub(r"[\s-]", "", h) for h in _RE_WHATSAPP.findall(blob)
    )
    intel["contact"]["wechat"] = _clean_list(_RE_WECHAT.findall(blob))

    wallet_blob = " ".join(wallets)
    phones = [
        p.strip()
        for p in _RE_PHONE.findall(blob)
        if p.strip() and p.strip() not in wallet_blob
    ]
    intel["contact"]["phones"] = _clean_list(phones)

    accounts = _RE_IBAN.findall(blob) + [
        re.sub(r"[\s-]", "", a) for a in _RE_BANK_NUM.findall(blob)
    ]
    accounts += [re.sub(r"[\s-]", "", a) for a in _RE_HSBC.findall(blob)]
    accounts += _RE_FPS.findall(blob)
    intel["payment"]["bank_accounts"] = _clean_list(accounts)

    apps = [label for needle, label in _PAYMENT_APPS.items() if needle in lowered]
    intel["payment"]["payment_apps"] = _clean_list(apps)

    remote = [label for needle, label in _REMOTE_APPS.items() if needle in lowered]
    intel["infrastructure"]["app_names"] = _clean_list(remote)

    amounts = _RE_AMOUNT.findall(blob)
    if amounts:
        intel["payment"]["amount_requested"] = _clean_scalar(amounts[-1])

    return intel
