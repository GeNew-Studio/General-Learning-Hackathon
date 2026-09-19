"""Drive a scripted scam conversation through the API without a browser.

    python scripts/smoke_test.py [dating]
"""

from __future__ import annotations

import asyncio
import json
import os
import sys

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app  # noqa: E402

SCRIPTS: dict[str, tuple[str, list[str]]] = {
    "dating": (
        "dating",
        [
            "Hey Ava how's your week going? I matched you on Tinder.",
            "Good morning, dear. Did you sleep well? You need to avoid leaving a digital trail.",
            "Because of security they told me I'm not allowed to use my credit card. "
            "I wanted to ask you a favor. I need $25,000 — transfer HSBC 004-218739-883 "
            "D. Crowe Holdings. Do not tell your friends.",
        ],
    ),
}


async def run(name: str) -> None:
    persona_id, script = SCRIPTS[name]
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test", timeout=120) as client:
        health = (await client.get("/api/health")).json()
        print("providers:", [f"{p['name']}({'ready' if p['ready'] else 'down'})" for p in health["providers"]])

        session = (await client.post("/api/session", json={"persona_id": persona_id})).json()
        sid = session["session_id"]
        print(f"persona: {session['persona']['name']} ({session['persona']['role']})\n")

        data = session
        for message in script:
            print(f">>> {message}")
            data = (await client.post("/api/chat", json={"session_id": sid, "message": message})).json()
            if "detection" not in data:
                print("ERROR:", data)
                return
            det = data["detection"]
            print(f"<<< {data['reply']}")
            print(
                f"    [score {det['score']} | {det['verdict']} | conf {det['confidence']} | "
                f"iocs {data['ioc_count']} | case {data.get('case_id') or '-'} | {data['model']}]"
            )
            if data.get("bait_goal"):
                print(f"    [next: {data['bait_goal']}]")
            print()

        print("INTEL")
        print(json.dumps(data["intel"], ensure_ascii=False, indent=2))

        cases = (await client.get("/api/cases")).json()["cases"]
        print(f"\ncases on file: {len(cases)}")
        for case in cases[:3]:
            full = (await client.get(f"/api/cases/{case['id']}")).json()
            print(f"  {case['id']} · {case['scam_category']} · {case['ioc_count']} iocs · {case['recorded_by']}")
            for ioc in full["iocs"]:
                print(f"      {ioc['kind']:<18} {ioc['value']}")


if __name__ == "__main__":
    asyncio.run(run(sys.argv[1] if len(sys.argv) > 1 else "dating"))
