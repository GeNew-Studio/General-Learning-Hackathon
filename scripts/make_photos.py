"""Render the deck's profile photos as flat SVG portraits.

    python scripts/make_photos.py

Everything comes from `app.profiles`, so a profile whose `look` is copied from
another one really does render the same face — that is what the reverse-image
check in the screener is pointing at.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.profiles import PHOTOS_PER_PROFILE, PROFILES  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "photos")

W, H = 400, 500
CX = 200
# Each photo is framed a little differently so a profile does not look like one image three times.
FRAMES = [
    {"cy": 245, "scale": 1.0, "angle": 0},
    {"cy": 225, "scale": 1.12, "angle": 35},
    {"cy": 262, "scale": 0.92, "angle": 70},
]


def _shade(hex_color: str, factor: float) -> str:
    value = hex_color.lstrip("#")
    r, g, b = (int(value[i : i + 2], 16) for i in (0, 2, 4))
    out = [max(0, min(255, round(channel * factor))) for channel in (r, g, b)]
    return "#%02x%02x%02x" % tuple(out)


def _hair(style: str, hair: str, cy: float) -> str:
    """Hair sits behind the face ellipse, so only the rim shows."""
    top = cy - 30
    parts: list[str] = []

    if style == "long":
        parts.append(f'<rect x="{CX - 112}" y="{cy - 70}" width="224" height="260" rx="96" fill="{hair}"/>')
    elif style == "wavy":
        parts.append(f'<rect x="{CX - 118}" y="{cy - 60}" width="236" height="215" rx="110" fill="{hair}"/>')
        parts.append(f'<circle cx="{CX - 104}" cy="{cy + 118}" r="30" fill="{hair}"/>')
        parts.append(f'<circle cx="{CX + 104}" cy="{cy + 118}" r="30" fill="{hair}"/>')
    elif style == "bun":
        parts.append(f'<circle cx="{CX}" cy="{top - 96}" r="38" fill="{hair}"/>')

    ry = 104 if style == "buzz" else 116
    parts.append(f'<ellipse cx="{CX}" cy="{top}" rx="96" ry="{ry}" fill="{hair}"/>')
    return "".join(parts)


def _face(look: dict, cy: float) -> str:
    skin = look["skin"]
    ear = _shade(skin, 0.94)
    lip = _shade(skin, 0.72)
    eye = "#2a1c16"
    brow = _shade(look["hair"], 0.85)

    parts = [
        f'<ellipse cx="{CX - 86}" cy="{cy + 8}" rx="13" ry="20" fill="{ear}"/>',
        f'<ellipse cx="{CX + 86}" cy="{cy + 8}" rx="13" ry="20" fill="{ear}"/>',
        f'<ellipse cx="{CX}" cy="{cy}" rx="84" ry="100" fill="{skin}"/>',
    ]

    if look.get("beard"):
        parts.append(f'<ellipse cx="{CX}" cy="{cy + 58}" rx="62" ry="50" fill="{look["hair"]}" opacity="0.92"/>')
        parts.append(f'<ellipse cx="{CX}" cy="{cy + 14}" rx="54" ry="40" fill="{skin}"/>')

    parts += [
        f'<path d="M{CX - 52} {cy - 22}c10-9 28-9 38-1" fill="none" stroke="{brow}" stroke-width="6" stroke-linecap="round"/>',
        f'<path d="M{CX + 14} {cy - 23}c10-8 28-8 38 1" fill="none" stroke="{brow}" stroke-width="6" stroke-linecap="round"/>',
        f'<ellipse cx="{CX - 33}" cy="{cy + 2}" rx="8" ry="9.5" fill="{eye}"/>',
        f'<ellipse cx="{CX + 33}" cy="{cy + 2}" rx="8" ry="9.5" fill="{eye}"/>',
        f'<path d="M{CX - 6} {cy + 12}c-4 14 1 20 8 20" fill="none" stroke="{lip}" stroke-width="4" '
        f'stroke-linecap="round" opacity="0.7"/>',
        f'<path d="M{CX - 22} {cy + 52}c10 12 34 12 44 0" fill="none" stroke="{lip}" stroke-width="5" stroke-linecap="round"/>',
    ]

    if look.get("glasses"):
        frame = "#20242b"
        parts += [
            f'<rect x="{CX - 62}" y="{cy - 16}" width="56" height="42" rx="14" fill="none" stroke="{frame}" stroke-width="5"/>',
            f'<rect x="{CX + 6}" y="{cy - 16}" width="56" height="42" rx="14" fill="none" stroke="{frame}" stroke-width="5"/>',
            f'<path d="M{CX - 6} {cy + 2}h12" stroke="{frame}" stroke-width="5" stroke-linecap="round"/>',
        ]
    return "".join(parts)


def portrait(look: dict, frame: dict, seed: str) -> str:
    bg_from, bg_to = look["bg"]
    cy = frame["cy"]
    shirt = look["shirt"]
    neck = _shade(look["skin"], 0.88)
    gradient_id = f"bg{seed}"

    # Neck goes behind the face so the chin overlaps it; the torso covers where it ends.
    neck_shape = f'<rect x="{CX - 31}" y="{cy + 40}" width="62" height="96" rx="24" fill="{neck}"/>'
    torso = (
        f'<ellipse cx="{CX}" cy="{cy + 330}" rx="172" ry="182" fill="{shirt}"/>'
        f'<ellipse cx="{CX}" cy="{cy + 316}" rx="58" ry="74" fill="{_shade(shirt, 0.86)}"/>'
    )

    inner = _hair(look["style"], look["hair"], cy) + neck_shape + _face(look, cy) + torso
    scale = frame["scale"]

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
        f"<defs>"
        f'<linearGradient id="{gradient_id}" gradientTransform="rotate({frame["angle"]})">'
        f'<stop offset="0" stop-color="{bg_from}"/><stop offset="1" stop-color="{bg_to}"/>'
        f"</linearGradient>"
        f"</defs>"
        f'<rect width="{W}" height="{H}" fill="url(#{gradient_id})"/>'
        f'<g transform="translate({CX} {cy}) scale({scale}) translate({-CX} {-cy})">{inner}</g>'
        f"</svg>"
    )


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    written = 0
    for profile in PROFILES:
        variants = profile.get("photo_variants") or []
        for index in range(PHOTOS_PER_PROFILE):
            look = dict(profile["look"])
            if index < len(variants):
                look.update(variants[index])
            svg = portrait(look, FRAMES[index % len(FRAMES)], f"{profile['id']}{index}")
            path = os.path.join(OUT_DIR, f"{profile['id']}-{index + 1}.svg")
            with open(path, "w", encoding="utf-8") as handle:
                handle.write(svg)
            written += 1
    print(f"wrote {written} photos to {OUT_DIR}")


if __name__ == "__main__":
    main()
