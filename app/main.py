from __future__ import annotations

import csv
import io
import json
import os
import re
import uuid
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

from app import db, llm
from app import intel as intel_mod
from app.agent import BrainOffline, complete
from app.personas import DEFAULT_PERSONA_ID, PERSONA_IDS, PERSONAS, public_persona
from app.signals import extract_signals, heuristic_score

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC = os.path.join(ROOT, "static")

MIN_TURNS_BEFORE_BENIGN_EXIT = 3
BENIGN_SCORE_CEILING = 32
AUTO_RECORD_SCORE = int(os.getenv("DECOY_AUTO_RECORD_SCORE", "70"))
AUTO_RECORD_CONFIDENCE = int(os.getenv("DECOY_AUTO_RECORD_CONFIDENCE", "60"))

app = FastAPI(title="FakerAI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=STATIC), name="static")

db.init_db()

SESSIONS: dict[str, dict[str, Any]] = {}


class ChatIn(BaseModel):
    session_id: str
    message: str = Field(min_length=1, max_length=4000)


class SessionIn(BaseModel):
    persona_id: str | None = None


class PersonaIn(BaseModel):
    persona_id: str


class SeedMessage(BaseModel):
    role: str
    content: str = Field(min_length=1, max_length=4000)


class SeedIn(BaseModel):
    messages: list[SeedMessage] = Field(min_length=1, max_length=20)


class ConfigureIn(BaseModel):
    poe_api_key: str | None = None


def _new_session(persona_id: str | None = None) -> dict[str, Any]:
    if persona_id and persona_id not in PERSONA_IDS:
        raise HTTPException(400, f"Unknown persona '{persona_id}'")
    sid = str(uuid.uuid4())
    session = {
        "id": sid,
        "persona_id": persona_id,
        "persona_name": PERSONAS[persona_id]["name"] if persona_id else None,
        "persona_locked": bool(persona_id),
        "persona_forced": bool(persona_id),
        "persona_pick_reason": "Chosen by the operator." if persona_id else "",
        "status": "active",
        "ended": False,
        "end_reason": None,
        "messages": [],
        "intel": intel_mod.empty_intel(),
        "bait_goal": None,
        "case_id": None,
        "recorded_by": None,
        "detection": {
            "score": 0,
            "verdict": "uncertain",
            "confidence": 0,
            "reasons": ["Waiting for the first message."],
            "signals": [],
            "scam_category": None,
            "heuristic_score": 0,
        },
        "model": None,
    }
    SESSIONS[sid] = session
    return session


def _blend_score(llm_score: int, heur: int, signals: list[str]) -> int:
    if not signals:
        return llm_score
    return max(0, min(100, round(0.72 * llm_score + 0.28 * heur)))


def _public(session: dict[str, Any], reply: str | None = None) -> dict[str, Any]:
    pid = session["persona_id"]
    return {
        "session_id": session["id"],
        "reply": reply,
        "persona": public_persona(pid) if pid else None,
        "persona_locked": session["persona_locked"],
        "persona_forced": session["persona_forced"],
        "persona_pick_reason": session["persona_pick_reason"],
        "status": session["status"],
        "ended": session["ended"],
        "end_reason": session["end_reason"],
        "detection": session["detection"],
        "intel": session["intel"],
        "ioc_count": intel_mod.count_iocs(session["intel"]),
        "bait_goal": session["bait_goal"],
        "case_id": session["case_id"],
        "recorded_by": session["recorded_by"],
        "model": session["model"],
        "turn": len([m for m in session["messages"] if m["role"] == "user"]),
    }


def _session_or_404(session_id: str) -> dict[str, Any]:
    session = SESSIONS.get(session_id)
    if not session:
        raise HTTPException(404, "Unknown session")
    return session


_HSBC_ACCT = re.compile(r"\bHSBC\s+(\d{3}[- ]\d{6,9}[- ]\d{2,4})\b", re.I)
_LOOSE_ETH = re.compile(r"\b0x[a-fA-F0-9]{20,40}\b")
_DEMO_CATEGORY = {
    "elder": "family emergency",
    "job_seeker": "task / employment scam",
    "crypto": "crypto airdrop",
    "student": "authority impersonation",
    "dating": "romance / emergency-loan",
}
_DATING_MONEY = re.compile(
    r"american express|hsbc|credit suisse|\$\s*25,?000|\$\s*30,?000|\$\s*250,?000"
    r"|borrow \$\s*\d|transfer it here|passport details|i can employ you"
    r"|give you a check|link it to my account",
    re.I,
)
_DATING_DANGER = re.compile(
    r"threats surrounding|bullets in the mail|funeral flowers|digital trail"
    r"|not safe in london|bodyguard is hurt|in an ambulance|we're in a war"
    r"|would be dead|tracing my spending|not allowed to use my credit card"
    r"|security breach|tried to stab|enemies behind this"
    r"|don't tell your friends|dont tell your friends|security said no london"
    r"|need to stay away",
    re.I,
)


def _dating_demo_stage(blob: str) -> str:
    text = blob or ""
    if _DATING_MONEY.search(text):
        return "money"
    if _DATING_DANGER.search(text):
        return "danger"
    return "normal"


def _apply_demo_detection(session: dict[str, Any]) -> None:
    """Score a scripted Demo session without calling the model."""
    all_user = "\n".join(m["content"] for m in session["messages"] if m["role"] == "user")
    if not all_user.strip():
        return
    signals = extract_signals(all_user)
    heur = heuristic_score(signals)
    turn_intel = intel_mod.regex_intel(all_user)
    extra_accounts = [m.group(1) for m in _HSBC_ACCT.finditer(all_user)]
    extra_wallets = _LOOSE_ETH.findall(all_user)
    if extra_accounts:
        turn_intel["payment"]["bank_accounts"] = extra_accounts + list(
            turn_intel["payment"].get("bank_accounts") or []
        )
        turn_intel["payment"]["bank_names"] = ["HSBC"] + list(
            turn_intel["payment"].get("bank_names") or []
        )
    if extra_wallets:
        turn_intel["payment"]["crypto_wallets"] = extra_wallets + list(
            turn_intel["payment"].get("crypto_wallets") or []
        )
    session["intel"] = intel_mod.merge_intel(session["intel"], turn_intel)

    user_turns = len([m for m in session["messages"] if m["role"] == "user"])
    paid = bool(
        session["intel"]["payment"]["bank_accounts"]
        or session["intel"]["payment"]["crypto_wallets"]
        or extra_accounts
        or extra_wallets
    )
    pid = session.get("persona_id")

    if pid == "dating":
        stage = _dating_demo_stage(all_user)
        if stage == "money" or paid:
            score, verdict, confidence = 88 if paid else 80, "scammer", 82
            reasons = ["Payment / account ask after a romance lure."]
            category = _DEMO_CATEGORY.get(pid)
        elif stage == "danger":
            score, verdict, confidence = 55, "uncertain", 58
            reasons = ["Security-threat / isolation language. No payment rail yet."]
            category = _DEMO_CATEGORY.get(pid)
        else:
            score, verdict, confidence = 10, "uncertain", 22
            reasons = ["Ordinary dating chat. No fraud markers yet."]
            category = None
            signals = []
        if session["intel"]["payment"]["bank_accounts"] or extra_accounts:
            reasons.append("Bank account given as a payment rail.")
        if session["intel"]["payment"]["crypto_wallets"] or extra_wallets:
            reasons.append("Crypto wallet given as a payment rail.")
        if signals:
            reasons.append("Rule hits: " + ", ".join(signals))
        if verdict == "scammer":
            session["status"] = "engaged"
        session["detection"] = {
            "score": score,
            "verdict": verdict,
            "confidence": confidence,
            "reasons": reasons,
            "signals": signals,
            "scam_category": category,
            "heuristic_score": heur,
        }
        session["model"] = "demo-script"
        return

    score = min(62, 22 + max(0, user_turns - 1) * 16)
    if paid:
        score = max(score, 88)
    if heur:
        score = max(score, min(72, heur))

    verdict = "scammer" if score >= 70 else "uncertain"
    if verdict == "scammer":
        session["status"] = "engaged"

    reasons = ["Lure is in progress."]
    if session["intel"]["payment"]["bank_accounts"] or extra_accounts:
        reasons.append("Bank account given as a payment rail.")
    if session["intel"]["payment"]["crypto_wallets"] or extra_wallets:
        reasons.append("Crypto wallet given as a payment rail.")
    if signals:
        reasons.append("Rule hits: " + ", ".join(signals))

    session["detection"] = {
        "score": score,
        "verdict": verdict,
        "confidence": 82 if paid else 48,
        "reasons": reasons,
        "signals": signals,
        "scam_category": _DEMO_CATEGORY.get(pid) if paid else session["detection"].get("scam_category"),
        "heuristic_score": heur,
    }
    session["model"] = "demo-script"


@app.get("/")
async def index():
    return FileResponse(
        os.path.join(STATIC, "index.html"),
        headers={"Cache-Control": "no-store"},
    )


@app.get("/tinder")
async def tinder_chat():
    return FileResponse(
        os.path.join(STATIC, "tinder.html"),
        headers={"Cache-Control": "no-store"},
    )


@app.get("/api/personas")
async def personas():
    return {
        "personas": [public_persona(pid) for pid in PERSONA_IDS],
        "default": DEFAULT_PERSONA_ID,
    }


def _health_payload() -> dict[str, Any]:
    providers = llm.health()
    return {
        "providers": providers,
        "any_ready": any(p["ready"] for p in providers),
        "configured": len(providers),
        "allow_fallback": os.getenv("DECOY_ALLOW_FALLBACK", "").strip().lower()
        in {"1", "true", "yes"},
        "db_path": db.DB_PATH,
    }


@app.get("/api/health")
async def health():
    return _health_payload()


@app.post("/api/providers/reload")
async def reload_providers():
    """Re-read .env so a freshly pasted key works without restarting the server."""
    llm.reload_providers()
    return _health_payload()


@app.post("/api/providers/configure")
async def configure_providers(body: ConfigureIn, request: Request):
    """Save a Poe key to .env from this machine only, then rebuild the chain."""
    host = (request.client.host if request.client else "") or ""
    if host not in {"127.0.0.1", "::1", "localhost"}:
        raise HTTPException(403, "Local only")
    key = (body.poe_api_key or "").strip()
    if not key:
        raise HTTPException(400, "poe_api_key required")
    llm.persist_env_key("POE_API_KEY", key)
    llm.reload_providers()
    return _health_payload()


@app.post("/api/session")
async def create_session(body: SessionIn | None = None):
    return _public(_new_session(body.persona_id if body else None))


@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    return _public(_session_or_404(session_id))


@app.post("/api/session/{session_id}/persona")
async def set_persona(session_id: str, body: PersonaIn):
    session = _session_or_404(session_id)
    if body.persona_id not in PERSONA_IDS:
        raise HTTPException(400, f"Unknown persona '{body.persona_id}'")
    session["persona_id"] = body.persona_id
    session["persona_name"] = PERSONAS[body.persona_id]["name"]
    session["persona_locked"] = True
    session["persona_forced"] = True
    session["persona_pick_reason"] = "Chosen by the operator."
    return _public(session)


@app.post("/api/session/{session_id}/seed")
async def seed_session(session_id: str, body: SeedIn):
    """Append scripted turns without calling the model. Used by Demo mode only."""
    session = _session_or_404(session_id)
    if session["ended"]:
        raise HTTPException(400, "Session already ended")
    for item in body.messages:
        role = item.role.strip().lower()
        if role not in {"user", "assistant"}:
            raise HTTPException(400, "role must be user or assistant")
        session["messages"].append({"role": role, "content": item.content.strip()})
    _apply_demo_detection(session)
    recorded = _maybe_record(session)
    payload = _public(session)
    payload["recorded_now"] = recorded
    payload["case_id"] = session["case_id"]
    payload["recorded_by"] = session["recorded_by"]
    return payload


@app.post("/api/session/{session_id}/flag")
async def flag_session(session_id: str):
    session = _session_or_404(session_id)
    if not session["messages"]:
        raise HTTPException(400, "Nothing to record yet")
    case = db.record_case(session, recorded_by="manual")
    session["case_id"] = case.get("id")
    session["recorded_by"] = "manual"
    return {"case": case, "session": _public(session)}


@app.post("/api/chat")
async def chat(body: ChatIn):
    session = _session_or_404(body.session_id)

    text = body.message.strip()
    if not text:
        raise HTTPException(400, "Empty message")

    if session["ended"]:
        quiet = {
            "student": "I already said bye — take care.",
            "elder": "好了孩子，我先不聊了。保重。",
            "crypto": "I'm out. Good luck with whatever this was.",
            "job_seeker": "I'll stop here. Best of luck with the search.",
            "dating": "I think I need some space. Take care.",
        }
        pid = session["persona_id"] or DEFAULT_PERSONA_ID
        return _public(session, quiet.get(pid, "I'm going to leave this here."))

    session["messages"].append({"role": "user", "content": text})
    user_turns = len([m for m in session["messages"] if m["role"] == "user"])
    all_user = "\n".join(m["content"] for m in session["messages"] if m["role"] == "user")
    signals = extract_signals(all_user)
    heur = heuristic_score(signals)

    try:
        result = await complete(session, text)
    except BrainOffline as exc:
        session["messages"].pop()
        raise HTTPException(
            status_code=503,
            detail=(
                "No model connected, so the decoy has nothing to say. "
                f"Provider error — {exc}"
            ),
        ) from exc
    except Exception as exc:  # noqa: BLE001
        session["messages"].pop()
        raise HTTPException(status_code=502, detail=f"Model error: {exc}") from exc

    if not session["persona_forced"]:
        session["persona_id"] = result["persona_id"]
        if result["lock_persona"] or user_turns >= 2:
            session["persona_locked"] = True
        if result["persona_pick_reason"]:
            session["persona_pick_reason"] = result["persona_pick_reason"]
    session["persona_name"] = PERSONAS[session["persona_id"]]["name"] if session["persona_id"] else None

    score = _blend_score(result["score"], heur, signals)
    verdict = result["verdict"]
    if score >= 70:
        verdict = "scammer"
        session["status"] = "engaged"
    elif score <= BENIGN_SCORE_CEILING and verdict == "benign":
        verdict = "benign"
    else:
        if verdict == "scammer" and score < 55:
            verdict = "uncertain"
        session["status"] = "active" if verdict != "scammer" else "engaged"

    reasons = list(result["reasons"])
    if signals:
        reasons.append("Rule hits: " + ", ".join(signals))

    session["detection"] = {
        "score": score,
        "verdict": verdict,
        "confidence": result["confidence"],
        "reasons": reasons,
        "signals": signals,
        "scam_category": result["scam_category"],
        "heuristic_score": heur,
        "model_score": result["score"],
    }
    session["model"] = result.get("model")
    session["bait_goal"] = result.get("bait_goal")

    turn_intel = intel_mod.merge_intel(intel_mod.regex_intel(all_user), result.get("intel"))
    session["intel"] = intel_mod.merge_intel(session["intel"], turn_intel)

    rails = bool(
        session["intel"]["payment"]["bank_accounts"]
        or session["intel"]["payment"]["crypto_wallets"]
    )
    if rails:
        score = max(score, 88)
        verdict = "scammer"
        session["status"] = "engaged"
        session["detection"]["score"] = score
        session["detection"]["verdict"] = verdict

    reply = result["reply"]
    exit_now = (
        result["should_exit_benign"]
        and user_turns >= MIN_TURNS_BEFORE_BENIGN_EXIT
        and score <= BENIGN_SCORE_CEILING
        and verdict == "benign"
        and not signals
    )
    if exit_now:
        session["ended"] = True
        session["status"] = "exited_benign"
        session["end_reason"] = "Conversation looks ordinary — decoy wrapped up."
        session["detection"]["verdict"] = "benign"

    session["messages"].append({"role": "assistant", "content": reply})

    payload = _public(session, reply)
    payload["recorded_now"] = _maybe_record(session)
    payload["case_id"] = session["case_id"]
    payload["recorded_by"] = session["recorded_by"]
    return payload


def _maybe_record(session: dict[str, Any]) -> bool:
    """Auto-file the case once the agent is confident. Returns True on first file."""
    detection = session["detection"]
    confident = (
        detection["verdict"] == "scammer"
        and detection["score"] >= AUTO_RECORD_SCORE
        and detection["confidence"] >= AUTO_RECORD_CONFIDENCE
    )
    if not confident:
        return False
    first_time = session["case_id"] is None
    case = db.record_case(session, recorded_by="auto")
    session["case_id"] = case.get("id")
    if session["recorded_by"] is None:
        session["recorded_by"] = "auto"
    return first_time


@app.get("/api/stats")
async def stats():
    return db.stats()


@app.get("/api/cases")
async def list_cases(
    query: str = Query("", alias="q"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    return {"cases": db.list_cases(query=query, limit=limit, offset=offset)}


@app.get("/api/cases/export.json")
async def export_json():
    cases = [db.get_case(c["id"]) for c in db.list_cases(limit=500)]
    body = json.dumps({"cases": cases}, ensure_ascii=False, indent=2)
    return Response(
        content=body,
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="fakerai-cases.json"'},
    )


@app.get("/api/cases/export.csv")
async def export_csv():
    rows = db.export_rows()
    columns = [
        "case_id",
        "created_at",
        "updated_at",
        "persona_name",
        "verdict",
        "score",
        "confidence",
        "scam_category",
        "script_stage",
        "summary",
        "recorded_by",
        "turns",
        "ioc_kind",
        "ioc_value",
    ]
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="fakerai-cases.csv"'},
    )


@app.get("/api/cases/{case_id}")
async def get_case(case_id: str):
    case = db.get_case(case_id)
    if not case:
        raise HTTPException(404, "Unknown case")
    return case


@app.delete("/api/cases/{case_id}")
async def delete_case(case_id: str):
    if not db.delete_case(case_id):
        raise HTTPException(404, "Unknown case")
    for session in SESSIONS.values():
        if session.get("case_id") == case_id:
            session["case_id"] = None
            session["recorded_by"] = None
    return {"deleted": case_id}
