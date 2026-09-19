"""Exercise the session/persona/flag/case endpoints against a running server."""

from __future__ import annotations

import sys

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8787"


def main() -> None:
    with httpx.Client(base_url=BASE, timeout=90) as client:
        session = client.post("/api/session", json={"persona_id": "dating"}).json()
        sid = session["session_id"]
        print("session:", sid, "| persona:", session["persona"]["name"], "| forced:", session["persona_forced"])

        switched = client.post(f"/api/session/{sid}/persona", json={"persona_id": "dating"}).json()
        print("held as:", switched["persona"]["name"], "| forced:", switched["persona_forced"])

        chat = client.post(
            "/api/chat",
            json={
                "session_id": sid,
                "message": "Hey Ava, I'm in trouble and need 25000 fast. Transfer HSBC 004-218739-883.",
            },
        ).json()
        print("reply:", chat["reply"][:90])
        print("persona held:", chat["persona"]["name"], "| score:", chat["detection"]["score"])

        flagged = client.post(f"/api/session/{sid}/flag").json()
        case_id = flagged["case"]["id"]
        print("manual case:", case_id, "| recorded_by:", flagged["case"]["recorded_by"])

        detail = client.get(f"/api/cases/{case_id}").json()
        print("messages stored:", len(detail["messages"]), "| iocs:", len(detail["iocs"]))

        listed = client.get("/api/cases", params={"q": "fastpay"}).json()["cases"]
        print("search 'fastpay' ->", [c["id"] for c in listed])

        listed = client.get("/api/cases", params={"q": "TXn8Yc4pQ2rLmVb9dK3sHfE7wZaJ6uNgTq"}).json()["cases"]
        print("search by wallet ->", [c["id"] for c in listed])

        print("delete:", client.delete(f"/api/cases/{case_id}").json())
        print("404 check:", client.get(f"/api/cases/{case_id}").status_code)


if __name__ == "__main__":
    main()
