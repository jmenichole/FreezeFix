#!/usr/bin/env python3
"""Generate FreezeFix app icons (build/icon.ico + build/icon.png).

Build-time helper only — requires Pillow (`pip install Pillow`); it is NOT a
runtime dependency of the app. Mirrors the purple checklist tray icon defined in
main.js so the installer/exe/tray share one visual identity.

Usage: python build/generate_icon.py
"""
import os
from PIL import Image, ImageDraw

SIZE = 256
PURPLE = (139, 92, 246, 255)  # #8b5cf6
CARD = (255, 255, 255, 32)     # translucent white "card"
WHITE = (255, 255, 255, 255)


def rounded(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def build_base():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Background rounded square (rx 8 of 32 -> 0.25 * SIZE)
    rounded(d, [0, 0, SIZE - 1, SIZE - 1], radius=int(SIZE * 0.25), fill=PURPLE)

    # Translucent card (10..22 x 9..23 of 32) drawn on an overlay then composited.
    overlay = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    s = SIZE / 32.0
    rounded(od, [10 * s, 9 * s, 22 * s, 23 * s], radius=int(1.5 * s), fill=CARD)
    img = Image.alpha_composite(img, overlay)

    # Checklist lines (white). Coordinates scaled from the tray SVG paths.
    d = ImageDraw.Draw(img)
    r = int(0.9 * s)
    rounded(d, [12 * s, 13 * s, 20 * s, 15 * s], radius=r, fill=WHITE)
    rounded(d, [12 * s, 17 * s, 20 * s, 19 * s], radius=r, fill=WHITE)
    rounded(d, [12 * s, 21 * s, 17 * s, 23 * s], radius=r, fill=WHITE)
    return img


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    base = build_base()
    png_path = os.path.join(here, "icon.png")
    ico_path = os.path.join(here, "icon.ico")
    base.save(png_path, format="PNG")
    base.save(ico_path, format="ICO",
              sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print("Wrote", png_path, "and", ico_path)


if __name__ == "__main__":
    main()
