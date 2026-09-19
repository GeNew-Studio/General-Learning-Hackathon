"""Reproduce a single turn and show which brain answered."""

from __future__ import annotations

import sys

import httpx

BASE = "http://127.0.0.1:8787"
MESSAGE = sys.argv[1] if len(sys.argv) > 1 else "hey ava, I matched you on tinder"

with httpx.Client(base_url=BASE, timeout=90) as c:
    sid = c.post("/api/session", json={"persona_id": "dating"}).json()["session_id"]
    data = c.post("/api/chat", json={"session_id": sid, "message": MESSAGE}).json()

print(f"you   : {MESSAGE}")
print(f"decoy : {data['reply']}")
print(f"brain : {data['model']}")
print("notes :")
for reason in data["detection"]["reasons"]:
    print(f"        - {reason}")
