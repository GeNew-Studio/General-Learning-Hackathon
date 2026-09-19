"""Local SQLite case file for confirmed scammers.

One row per session, upserted as the conversation develops, so a case that keeps
running keeps growing instead of duplicating.
"""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any

from app import intel as intel_mod

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.getenv("DECOY_DB_PATH") or os.path.join(ROOT, "data", "decoy.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS cases (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL UNIQUE,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    persona_id    TEXT,
    persona_name  TEXT,
    verdict       TEXT NOT NULL,
    score         INTEGER NOT NULL,
    confidence    INTEGER NOT NULL,
    scam_category TEXT,
    script_stage  TEXT,
    summary       TEXT,
    reasons       TEXT NOT NULL DEFAULT '[]',
    signals       TEXT NOT NULL DEFAULT '[]',
    intel         TEXT NOT NULL DEFAULT '{}',
    model         TEXT,
    recorded_by   TEXT NOT NULL DEFAULT 'auto',
    turns         INTEGER NOT NULL DEFAULT 0,
    ioc_count     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS case_iocs (
    case_id    TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    value      TEXT NOT NULL,
    first_seen TEXT NOT NULL,
    PRIMARY KEY (case_id, kind, value)
);

CREATE TABLE IF NOT EXISTS case_messages (
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    idx     INTEGER NOT NULL,
    role    TEXT NOT NULL,
    content TEXT NOT NULL,
    PRIMARY KEY (case_id, idx)
);

CREATE INDEX IF NOT EXISTS idx_case_iocs_value ON case_iocs(value);
CREATE INDEX IF NOT EXISTS idx_cases_updated ON cases(updated_at DESC);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect() -> sqlite3.Connection:
    """Open the database, creating the file and schema if either is missing."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA)
    return conn


def init_db() -> None:
    connect().close()


def new_case_id() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"CASE-{stamp}-{uuid.uuid4().hex[:6].upper()}"


def _row_to_case(row: sqlite3.Row) -> dict[str, Any]:
    case = dict(row)
    for field in ("reasons", "signals", "intel"):
        try:
            case[field] = json.loads(case.get(field) or ("[]" if field != "intel" else "{}"))
        except json.JSONDecodeError:
            case[field] = [] if field != "intel" else {}
    return case


def record_case(session: dict[str, Any], *, recorded_by: str = "auto") -> dict[str, Any]:
    """Insert or update the case for this session. Returns the stored case."""
    detection = session.get("detection") or {}
    merged_intel = session.get("intel") or intel_mod.empty_intel()
    playbook = merged_intel.get("playbook", {})
    persona_id = session.get("persona_id")
    persona_name = session.get("persona_name")
    messages = session.get("messages") or []
    turns = len([m for m in messages if m["role"] == "user"])
    iocs = intel_mod.flatten_iocs(merged_intel)
    now = _now()

    with connect() as conn:
        existing = conn.execute(
            "SELECT id, created_at, recorded_by FROM cases WHERE session_id = ?",
            (session["id"],),
        ).fetchone()

        case_id = existing["id"] if existing else new_case_id()
        created_at = existing["created_at"] if existing else now
        # A manual flag is a human decision; auto updates must not downgrade it.
        origin = "manual" if recorded_by == "manual" or (existing and existing["recorded_by"] == "manual") else "auto"

        conn.execute(
            """
            INSERT INTO cases (
                id, session_id, created_at, updated_at, persona_id, persona_name,
                verdict, score, confidence, scam_category, script_stage, summary,
                reasons, signals, intel, model, recorded_by, turns, ioc_count
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(session_id) DO UPDATE SET
                updated_at    = excluded.updated_at,
                persona_id    = excluded.persona_id,
                persona_name  = excluded.persona_name,
                verdict       = excluded.verdict,
                score         = excluded.score,
                confidence    = excluded.confidence,
                scam_category = excluded.scam_category,
                script_stage  = excluded.script_stage,
                summary       = excluded.summary,
                reasons       = excluded.reasons,
                signals       = excluded.signals,
                intel         = excluded.intel,
                model         = excluded.model,
                recorded_by   = excluded.recorded_by,
                turns         = excluded.turns,
                ioc_count     = excluded.ioc_count
            """,
            (
                case_id,
                session["id"],
                created_at,
                now,
                persona_id,
                persona_name,
                detection.get("verdict") or "uncertain",
                int(detection.get("score") or 0),
                int(detection.get("confidence") or 0),
                detection.get("scam_category"),
                playbook.get("script_stage"),
                playbook.get("summary"),
                json.dumps(detection.get("reasons") or [], ensure_ascii=False),
                json.dumps(detection.get("signals") or [], ensure_ascii=False),
                json.dumps(merged_intel, ensure_ascii=False),
                session.get("model"),
                origin,
                turns,
                len(iocs),
            ),
        )

        conn.executemany(
            "INSERT OR IGNORE INTO case_iocs (case_id, kind, value, first_seen) VALUES (?,?,?,?)",
            [(case_id, kind, value, now) for kind, value in iocs],
        )

        conn.execute("DELETE FROM case_messages WHERE case_id = ?", (case_id,))
        conn.executemany(
            "INSERT INTO case_messages (case_id, idx, role, content) VALUES (?,?,?,?)",
            [(case_id, i, m["role"], m["content"]) for i, m in enumerate(messages)],
        )

    return get_case(case_id) or {}


def list_cases(*, query: str = "", limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
    sql = """
        SELECT c.*, (
            SELECT COUNT(*) FROM case_messages m WHERE m.case_id = c.id
        ) AS message_count
        FROM cases c
    """
    params: list[Any] = []
    if query.strip():
        like = f"%{query.strip()}%"
        sql += """
        WHERE c.id LIKE ? OR c.scam_category LIKE ? OR c.summary LIKE ?
           OR c.persona_name LIKE ?
           OR EXISTS (SELECT 1 FROM case_iocs i WHERE i.case_id = c.id AND i.value LIKE ?)
        """
        params += [like, like, like, like, like]
    sql += " ORDER BY c.updated_at DESC LIMIT ? OFFSET ?"
    params += [max(1, min(limit, 500)), max(0, offset)]

    with connect() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [_row_to_case(row) for row in rows]


def get_case(case_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
        if not row:
            return None
        case = _row_to_case(row)
        case["iocs"] = [
            dict(r)
            for r in conn.execute(
                "SELECT kind, value, first_seen FROM case_iocs WHERE case_id = ? ORDER BY kind, value",
                (case_id,),
            )
        ]
        case["messages"] = [
            dict(r)
            for r in conn.execute(
                "SELECT idx, role, content FROM case_messages WHERE case_id = ? ORDER BY idx",
                (case_id,),
            )
        ]
        case["related"] = [
            dict(r)
            for r in conn.execute(
                """
                SELECT DISTINCT other.case_id AS case_id, other.kind, other.value
                FROM case_iocs mine
                JOIN case_iocs other
                  ON mine.value = other.value AND other.case_id != mine.case_id
                WHERE mine.case_id = ?
                ORDER BY other.kind, other.value
                """,
                (case_id,),
            )
        ]
    return case


def case_for_session(session_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT id FROM cases WHERE session_id = ?", (session_id,)).fetchone()
    return get_case(row["id"]) if row else None


def delete_case(case_id: str) -> bool:
    with connect() as conn:
        cursor = conn.execute("DELETE FROM cases WHERE id = ?", (case_id,))
    return cursor.rowcount > 0


def stats() -> dict[str, Any]:
    with connect() as conn:
        totals = conn.execute(
            "SELECT COUNT(*) AS cases, COALESCE(SUM(turns), 0) AS turns FROM cases"
        ).fetchone()
        ioc_total = conn.execute("SELECT COUNT(*) AS n FROM case_iocs").fetchone()["n"]
        categories = [
            dict(r)
            for r in conn.execute(
                """
                SELECT COALESCE(scam_category, 'uncategorised') AS category, COUNT(*) AS n
                FROM cases GROUP BY category ORDER BY n DESC LIMIT 8
                """
            )
        ]
        personas = [
            dict(r)
            for r in conn.execute(
                """
                SELECT COALESCE(persona_name, 'unknown') AS persona, COUNT(*) AS n
                FROM cases GROUP BY persona ORDER BY n DESC
                """
            )
        ]
        repeats = [
            dict(r)
            for r in conn.execute(
                """
                SELECT kind, value, COUNT(DISTINCT case_id) AS cases
                FROM case_iocs GROUP BY kind, value
                HAVING cases > 1 ORDER BY cases DESC, value LIMIT 10
                """
            )
        ]
    return {
        "cases": totals["cases"],
        "baited_turns": totals["turns"],
        "iocs": ioc_total,
        "by_category": categories,
        "by_persona": personas,
        "shared_infrastructure": repeats,
    }


def export_rows() -> list[dict[str, Any]]:
    """Flat rows for CSV export — one line per IOC, cases with none still appear."""
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT c.id AS case_id, c.created_at, c.updated_at, c.persona_name,
                   c.verdict, c.score, c.confidence, c.scam_category, c.script_stage,
                   c.summary, c.recorded_by, c.turns, i.kind AS ioc_kind, i.value AS ioc_value
            FROM cases c
            LEFT JOIN case_iocs i ON i.case_id = c.id
            ORDER BY c.updated_at DESC, i.kind, i.value
            """
        ).fetchall()
    return [dict(r) for r in rows]
