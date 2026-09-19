"""Walk the full dating flow against a running server.

    python scripts/flow_check.py

Checks the four beats of the demo: the deck blocks the obvious fakes, a clear
profile opens a chat, the money ask hands the keyboard to Faker, and the case only
closes once an account is on the record.
"""

from __future__ import annotations

import sys

import httpx

BASE = "http://127.0.0.1:8787"

TURNS = [
    "hey! you cycle too? which route do you do on weekends",
    "haha nice. hey something happened, my card got frozen by the bank and i need to "
    "top up 5000 tonight for my mum's hospital deposit. can you help me first? i pay you back tmr",
    "thank you so much 🙏 my hsbc is 004-887231-838, name IVAN SZE. or fps 92345678 if faster",
]


def main() -> int:
    with httpx.Client(base_url=BASE, timeout=120.0) as client:
        deck = client.get("/api/profiles").json()["profiles"]
        blocked = [p for p in deck if p["screening"]["verdict"] == "blocked"]
        clear = [p for p in deck if p["screening"]["verdict"] == "clear"]
        print(f"deck: {len(deck)} profiles, {len(blocked)} blocked, {len(clear)} clear")

        denied = client.post("/api/session", json={"persona_id": "dating", "profile_id": blocked[0]["id"]})
        print(f"blocked profile chat -> HTTP {denied.status_code} ({denied.json().get('detail')})")

        target = clear[0]
        session = client.post(
            "/api/session", json={"persona_id": "dating", "profile_id": target["id"]}
        ).json()
        sid = session["session_id"]
        print(f"chat opened with {target['name']} · phase={session['phase']} · score={session['detection']['score']}")

        recorded = False
        for text in TURNS:
            res = client.post("/api/chat", json={"session_id": sid, "message": text})
            if res.status_code != 200:
                print(f"  ! HTTP {res.status_code}: {res.text[:200]}")
                return 1
            data = res.json()
            pay = data["intel"]["payment"]
            print()
            print(f"  scammer : {text[:70]}")
            print(f"  reply   : {data['reply'][:160]}")
            print(
                f"  phase={data['phase']} score={data['detection']['score']} "
                f"verdict={data['detection']['verdict']} takeover_now={data.get('takeover_now')} "
                f"case_ready={data['case_ready']} case={data.get('case_id')}"
            )
            if pay["bank_accounts"] or pay["crypto_wallets"]:
                print(f"  rails   : {pay['bank_accounts']} {pay['crypto_wallets']}")
            recorded = recorded or bool(data.get("recorded_now"))

        print()
        print("case filed" if recorded else "no case filed — the decoy never got a payment rail")
        return 0 if recorded else 2


if __name__ == "__main__":
    sys.exit(main())
