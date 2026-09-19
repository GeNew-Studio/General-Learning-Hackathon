from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
text = (ROOT / "static" / "demo-scripts.js").read_text(encoding="utf-8")
start = text.index("dating:")
end = text.index("  },\n};", start)
block = text[start:end]
pat = re.compile(
    r'\{\s*scammer:\s*"((?:\\.|[^"\\])*)"\s*,\s*victim:\s*"((?:\\.|[^"\\])*)"\s*\}'
)
turns = []
for scammer, victim in pat.findall(block):
    def unescape(s: str) -> str:
        s = s.replace("\\n", "\n").replace('\\"', '"').replace("\\\\", "\\")
        s = s.replace("\u2014", ",").replace("\u2013", ",").replace("\u2026", "...")
        s = s.replace(" — ", ", ").replace(" – ", ", ")
        return s

    turns.append({"scammer": unescape(scammer), "victim": unescape(victim)})

out_dir = ROOT / "tinder_app" / "assets"
out_dir.mkdir(exist_ok=True)
(out_dir / "dating_turns.json").write_text(
    json.dumps(turns, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
print(f"wrote {len(turns)} turns")
print("first:", turns[0]["victim"][:40] if turns else "NONE")
