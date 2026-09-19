"""The match deck and the pre-chat screen.

Screening reads only what a dating app can see before a word is typed: the photos,
the bio, and the account itself. It catches the obvious factories and lets everything
else through — intent is invisible at this stage, which is why the chat monitor exists.

`look` drives `scripts/make_photos.py`, so the deck art and the "same face on two
profiles" reverse-image story stay in sync with the data.
"""

from __future__ import annotations

from typing import Any

PHOTOS_PER_PROFILE = 3

BLOCK_AT = 70
CAUTION_AT = 30


def _look(
    skin: str,
    hair: str,
    style: str,
    shirt: str,
    bg: tuple[str, str],
    *,
    beard: bool = False,
    glasses: bool = False,
) -> dict[str, Any]:
    return {
        "skin": skin,
        "hair": hair,
        "style": style,
        "shirt": shirt,
        "bg": list(bg),
        "beard": beard,
        "glasses": glasses,
    }


# Reused by p05 so the reverse-image hit has something real to point at.
_CROWE_LOOK = _look("#e3b892", "#3a2b22", "short", "#2f3b49", ("#5d6b7a", "#2c3743"), beard=True)

PROFILES: list[dict[str, Any]] = [
    {
        "id": "p01",
        "name": "Marcus Crowe",
        "age": 41,
        "job": "Offshore engineer · North Sea",
        "distance": "Says 4 km away",
        "bio": "Widower, one daughter in boarding school. Rotating off the rig soon. "
               "I don't check this app much — reach me on Telegram @marcus_crowe_eng",
        "look": _CROWE_LOOK,
        "facts": {
            "ai_photo_confidence": 0.96,
            "reverse_image_hits": 4,
            "account_age_days": 2,
            "verified": False,
            "photo_count": 3,
            "offsite_push": "Telegram handle in bio",
            "bio_flags": ["widower + child", "works offshore / unreachable"],
        },
    },
    {
        "id": "p02",
        "name": "Elena Vos",
        "age": 27,
        "job": "Model · travelling",
        "distance": "Says 2 km away",
        "bio": "Life is short, buy the ticket 🥂 Looking for someone generous with time.",
        "look": _look("#f0d3bb", "#caa25e", "long", "#b23a55", ("#d9a3b0", "#8f5f75")),
        "photo_variants": [
            {},
            {"skin": "#8d5f43", "hair": "#1d1512", "style": "bun", "bg": ["#7a8fa6", "#3f4d5e"]},
            {"skin": "#f5e2d2", "hair": "#e4d5a8", "style": "wavy", "bg": ["#c9b38f", "#7d6a4f"]},
        ],
        "facts": {
            "ai_photo_confidence": 0.91,
            "face_mismatch": True,
            "reverse_image_hits": 2,
            "account_age_days": 5,
            "verified": False,
            "photo_count": 3,
            "bio_flags": ["generosity hint"],
        },
    },
    {
        "id": "p03",
        "name": "Kevin Lau",
        "age": 35,
        "job": "Digital asset mentor",
        "distance": "Says 6 km away",
        "bio": "I teach my partner how money works. 8%/day on my signal group, "
               "ask me for the invite. No time wasters.",
        "look": _look("#d8a87f", "#191313", "short", "#1f2733", ("#3f4f63", "#1d2733"), glasses=True),
        "facts": {
            "ai_photo_confidence": 0.44,
            "reverse_image_hits": 7,
            "account_age_days": 3,
            "verified": False,
            "photo_count": 2,
            "offsite_push": "Signal group invite in bio",
            "bio_flags": ["guaranteed daily returns", "investment mentoring"],
        },
    },
    {
        "id": "p04",
        "name": "Sophia Ko",
        "age": 24,
        "job": "—",
        "distance": "Says 1 km away",
        "bio": "add me whatsapp 852 5••• ••92 i dont open this app",
        "look": _look("#f2d8c2", "#2a1d18", "long", "#e8d7c3", ("#e7c3cd", "#a4707f")),
        "facts": {
            "ai_photo_confidence": 0.88,
            "reverse_image_hits": 1,
            "account_age_days": 1,
            "verified": False,
            "photo_count": 2,
            "offsite_push": "WhatsApp number in bio",
            "bio_flags": ["empty profile"],
        },
    },
    {
        "id": "p05",
        "name": "David Yeung",
        "age": 48,
        "job": "Gold & commodities trader",
        "distance": "Says 9 km away",
        "bio": "Self made. Protecting what matters. Ask me about the family office.",
        "look": _CROWE_LOOK,
        "facts": {
            "ai_photo_confidence": 0.62,
            "reverse_image_hits": 5,
            "duplicate_of": "p01",
            "account_age_days": 4,
            "verified": False,
            "photo_count": 3,
            "bio_flags": ["wealth flexing"],
        },
    },
    {
        "id": "p06",
        "name": "Rachel Ng",
        "age": 30,
        "job": "Cabin crew · CX",
        "distance": "3 km away",
        "bio": "Jet lagged 80% of the time. Coffee, hiking, bad karaoke.",
        "look": _look("#e8c6a5", "#221a15", "bun", "#2f6f6b", ("#8fbfc0", "#4d7f80")),
        "facts": {
            "ai_photo_confidence": 0.63,
            "reverse_image_hits": 0,
            "account_age_days": 24,
            "verified": False,
            "photo_count": 3,
        },
    },
    {
        "id": "p07",
        "name": "Tom Beckett",
        "age": 38,
        "job": "Strategy consultant",
        "distance": "7 km away",
        "bio": "In HK on a 6-month posting. Easier on WhatsApp, I'm rarely here.",
        "look": _look("#eac9a8", "#7a5a3a", "short", "#3b4a63", ("#8a97ab", "#4a5668")),
        "facts": {
            "ai_photo_confidence": 0.21,
            "reverse_image_hits": 1,
            "account_age_days": 16,
            "verified": False,
            "photo_count": 3,
            "offsite_push": "Pushes WhatsApp in bio",
        },
    },
    {
        "id": "p08",
        "name": "Ivan Sze",
        "age": 33,
        "job": "Product manager · fintech",
        "distance": "2 km away",
        "bio": "Kowloon side. Weekend cyclist, terrible cook, decent listener.",
        "look": _look("#dcae86", "#181210", "short", "#33444f", ("#9fb1b8", "#5b6d75")),
        "facts": {
            "ai_photo_confidence": 0.08,
            "reverse_image_hits": 0,
            "account_age_days": 241,
            "verified": True,
            "photo_count": 4,
        },
    },
    {
        "id": "p09",
        "name": "Chloe Tam",
        "age": 28,
        "job": "Nurse · QMH",
        "distance": "5 km away",
        "bio": "Night shifts and dim sum. Looking for someone patient with my roster.",
        "look": _look("#f0cfb4", "#241a16", "long", "#b8556f", ("#dcb7c4", "#8a6472")),
        "facts": {
            "ai_photo_confidence": 0.11,
            "reverse_image_hits": 0,
            "account_age_days": 168,
            "verified": True,
            "photo_count": 3,
        },
    },
    {
        "id": "p10",
        "name": "Ray Fung",
        "age": 36,
        "job": "Runs a cha chaan teng",
        "distance": "1 km away",
        "bio": "Feed people for a living. Ask me where to eat at 3am.",
        "look": _look("#d4a179", "#1c1411", "buzz", "#6b4a35", ("#c2a58c", "#7a6350"), beard=True),
        "facts": {
            "ai_photo_confidence": 0.17,
            "reverse_image_hits": 0,
            "account_age_days": 96,
            "verified": False,
            "photo_count": 3,
        },
    },
    {
        "id": "p11",
        "name": "Karen Lo",
        "age": 29,
        "job": "Illustrator",
        "distance": "4 km away",
        "bio": "Draws cats for money. Will judge your handwriting.",
        "look": _look("#f1d2bb", "#3b2a44", "wavy", "#4a6b4f", ("#b7cfae", "#6d8a72")),
        "facts": {
            "ai_photo_confidence": 0.06,
            "reverse_image_hits": 0,
            "account_age_days": 402,
            "verified": True,
            "photo_count": 4,
        },
    },
    {
        "id": "p12",
        "name": "Jason Wu",
        "age": 31,
        "job": "Strength coach",
        "distance": "8 km away",
        "bio": "Sai Ying Pun gym rat. I will not make you do burpees on a first date.",
        "look": _look("#c98f62", "#120e0c", "buzz", "#22262b", ("#8d949c", "#4d545c")),
        "facts": {
            "ai_photo_confidence": 0.09,
            "reverse_image_hits": 0,
            "account_age_days": 311,
            "verified": True,
            "photo_count": 3,
        },
    },
    {
        "id": "p13",
        "name": "Mandy Chiu",
        "age": 27,
        "job": "Primary school teacher",
        "distance": "6 km away",
        "bio": "Patient with 7 year olds, less patient with slow walkers.",
        "look": _look("#eecdb3", "#2b1f1a", "bun", "#c4823f", ("#e2c39a", "#8f7352")),
        "facts": {
            "ai_photo_confidence": 0.07,
            "reverse_image_hits": 0,
            "account_age_days": 188,
            "verified": True,
            "photo_count": 3,
        },
    },
    {
        "id": "p14",
        "name": "Alex Ho",
        "age": 34,
        "job": "Sound engineer",
        "distance": "10 km away",
        "bio": "Mixes live shows. Hearing is going, jokes are not.",
        "look": _look("#d9ad84", "#161010", "wavy", "#3a3550", ("#8e86ad", "#514c69"), glasses=True),
        "facts": {
            "ai_photo_confidence": 0.13,
            "reverse_image_hits": 0,
            "account_age_days": 274,
            "verified": False,
            "photo_count": 3,
        },
    },
]

PROFILE_BY_ID = {p["id"]: p for p in PROFILES}


def photo_urls(profile_id: str) -> list[str]:
    return [f"/static/photos/{profile_id}-{n + 1}.svg" for n in range(PHOTOS_PER_PROFILE)]


def _check(label: str, detail: str, state: str, weight: int = 0) -> dict[str, Any]:
    return {"label": label, "detail": detail, "state": state, "weight": weight}


def screen(profile: dict[str, Any]) -> dict[str, Any]:
    """Score a profile on what is visible before any conversation happens."""
    facts = profile.get("facts") or {}
    checks: list[dict[str, Any]] = []
    risk = 0

    ai = float(facts.get("ai_photo_confidence") or 0)
    if ai >= 0.85:
        risk += 35
        checks.append(_check("Synthetic photo detector", f"{round(ai * 100)}% AI-generated", "bad", 35))
    elif ai >= 0.6:
        risk += 18
        checks.append(_check("Synthetic photo detector", f"{round(ai * 100)}% AI-generated", "warn", 18))
    elif ai >= 0.35:
        risk += 7
        checks.append(_check("Synthetic photo detector", f"{round(ai * 100)}% — inconclusive", "warn", 7))
    else:
        checks.append(_check("Synthetic photo detector", f"{round(ai * 100)}% — looks camera-shot", "ok"))

    if facts.get("face_mismatch"):
        risk += 22
        checks.append(_check("Face consistency", "3 photos, 3 different people", "bad", 22))
    else:
        checks.append(_check("Face consistency", "Same face across photos", "ok"))

    hits = int(facts.get("reverse_image_hits") or 0)
    duplicate = facts.get("duplicate_of")
    if duplicate:
        risk += 34
        other = PROFILE_BY_ID.get(duplicate, {}).get("name", duplicate)
        checks.append(_check("Reverse image search", f"Same photos as “{other}” on this app", "bad", 34))
    elif hits >= 3:
        risk += 20
        checks.append(_check("Reverse image search", f"{hits} matches on stock and scam-report sites", "bad", 20))
    elif hits:
        risk += 9
        checks.append(_check("Reverse image search", f"{hits} match elsewhere online", "warn", 9))
    else:
        checks.append(_check("Reverse image search", "No matches found", "ok"))

    age = int(facts.get("account_age_days") or 0)
    if age <= 3:
        risk += 18
        checks.append(_check("Account age", f"{age} days old", "bad", 18))
    elif age <= 30:
        risk += 7
        checks.append(_check("Account age", f"{age} days old", "warn", 7))
    else:
        checks.append(_check("Account age", f"{age} days old", "ok"))

    if not facts.get("verified"):
        risk += 6
        checks.append(_check("Photo verification", "Not verified", "warn", 6))
    else:
        checks.append(_check("Photo verification", "Verified selfie on file", "ok"))

    offsite = facts.get("offsite_push")
    if offsite:
        risk += 11
        checks.append(_check("Off-app push", offsite, "bad", 11))
    else:
        checks.append(_check("Off-app push", "Stays on the app", "ok"))

    bio_flags = list(facts.get("bio_flags") or [])
    if bio_flags:
        weight = min(18, 6 * len(bio_flags))
        risk += weight
        checks.append(_check("Bio pattern match", ", ".join(bio_flags), "bad" if weight >= 12 else "warn", weight))
    else:
        checks.append(_check("Bio pattern match", "Nothing off the known scripts", "ok"))

    risk = max(0, min(100, risk))
    verdict = "blocked" if risk >= BLOCK_AT else "caution" if risk >= CAUTION_AT else "clear"
    reasons = [f"{c['label']}: {c['detail']}" for c in checks if c["state"] != "ok"]

    if verdict == "clear":
        headline = "No pre-screen flags"
    elif verdict == "caution":
        headline = "Talk, but Faker is watching"
    else:
        headline = "Blocked before you typed"

    return {
        "risk": risk,
        "verdict": verdict,
        "headline": headline,
        "checks": checks,
        "reasons": reasons,
    }


def public_profile(profile: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": profile["id"],
        "name": profile["name"],
        "age": profile["age"],
        "job": profile["job"],
        "distance": profile["distance"],
        "bio": profile["bio"],
        "photos": photo_urls(profile["id"]),
        "screening": screen(profile),
    }


def deck() -> list[dict[str, Any]]:
    return [public_profile(p) for p in PROFILES]
