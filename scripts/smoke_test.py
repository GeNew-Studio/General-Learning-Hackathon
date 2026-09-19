"""Drive a scripted scam conversation through the API without a browser.

    python scripts/smoke_test.py [job|elder|crypto|student|dating]
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
    "job": (
        "job_seeker",
        [
            "Hello, this is Amanda from FastPay HR department. We saw your CV online.",
            "We have a remote data-entry role, 800 RMB per day, work from home. Interested?",
            "Great. To activate your worker account you pay a 299 RMB training deposit, refundable after 3 tasks.",
            "Send it to finance account 6222 0812 3456 7890 at China Merchants Bank, name Li Wei. "
            "Or USDT to TXn8Yc4pQ2rLmVb9dK3sHfE7wZaJ6uNgTq",
            "Also add me on Telegram @fastpay_amanda. Register first at http://fastpay-jobs.vip/reg . "
            "Do not tell anyone about this offer.",
        ],
    ),
    "elder": (
        "elder",
        [
            "您好，这里是工商银行安全中心，您的账户涉嫌洗钱，需要立即配合调查。",
            "请不要告诉家人，这是保密案件。您现在方便吗？",
            "为了保护资金安全，请把余额转到安全账户 6212 2602 0000 1234 567，户名王强。",
            "另外请下载 AnyDesk 让我们协助操作，验证码收到后念给我听。",
        ],
    ),
    "crypto": (
        "crypto",
        [
            "Hey, saw your comment about ETH. I run a signals group that's been printing lately.",
            "We do OTC arbitrage, guaranteed 8% per day, my members are up 300% this quarter.",
            "Just connect your wallet at https://eth-vault-pro.top or send a test 0.5 ETH to "
            "0x9f2b4C1a7E5d3B8c6A0f2D4e6C8a1B3d5F7e9A2c",
            "Contact me on WhatsApp +8613800138000 for the VIP tier.",
        ],
    ),
    "student": (
        "student",
        [
            "hey! are you also in the hangzhou uni group chat?",
            "haha nice. i'm doing a photography club thing this weekend, you should come",
            "cool, it's saturday 2pm at the west gate. no pressure though",
        ],
    ),
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
    asyncio.run(run(sys.argv[1] if len(sys.argv) > 1 else "job"))
