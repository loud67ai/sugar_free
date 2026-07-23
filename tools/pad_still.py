#!/usr/bin/env python3
"""
pad_still.py — Add chroma-key buffer padding around a still character image
============================================================================
Takes a still image (character on green or white background) and expands the
canvas with the same background color, giving the character room to animate
without clipping.

Usage
-----
  python tools/pad_still.py --input "Image (26).png"

  # Custom padding and output path:
  python tools/pad_still.py --input "sprout_still.png" --pad 70 --output "sprout_padded.png"

Arguments
---------
  --input    Path to source still image (e.g. "avatars/still images/sprout_still.png")
  --output   Output path  [default: avatars/padded images/{stem}_padded.png]
  --pad      Padding to add on each side as % of source dimensions  [default: 65]
  --bg       Background fill color hex  [default: auto-detected from corners]
"""

import argparse
import sys
from pathlib import Path

from PIL import Image


def parse_args():
    p = argparse.ArgumentParser(description="Add animation buffer padding around a still image")
    p.add_argument("--input",  required=True, help="Source still image path")
    p.add_argument("--output", default=None,  help="Output path (default: {stem}_padded.png)")
    p.add_argument("--pad",    type=float, default=65,
                   help="Padding on each side as %% of source size (default: 65)")
    p.add_argument("--bg",     default=None,
                   help="Background fill hex color, e.g. 00C853 (default: auto-detect from corners)")
    return p.parse_args()


def detect_bg_color(img: Image.Image) -> tuple:
    """Sample the four corners of the image to detect the background color."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    corners = [
        rgb.getpixel((0, 0)),
        rgb.getpixel((w - 1, 0)),
        rgb.getpixel((0, h - 1)),
        rgb.getpixel((w - 1, h - 1)),
    ]
    # Average the corners
    r = round(sum(c[0] for c in corners) / 4)
    g = round(sum(c[1] for c in corners) / 4)
    b = round(sum(c[2] for c in corners) / 4)
    return (r, g, b)


def hex_to_rgb(hex_str: str) -> tuple:
    h = hex_str.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def main():
    args = parse_args()

    src = Path(args.input)
    if not src.exists():
        sys.exit(f"Error: file not found: {src}")

    img = Image.open(src).convert("RGB")
    w, h = img.size

    # Determine background color
    if args.bg:
        bg = hex_to_rgb(args.bg)
        print(f"Background: #{args.bg.upper()} (specified)")
    else:
        bg = detect_bg_color(img)
        print(f"Background: #{bg[0]:02X}{bg[1]:02X}{bg[2]:02X} (auto-detected from corners)")

    # Calculate padding in pixels
    pad_x = round(w * args.pad / 100)
    pad_y = round(h * args.pad / 100)
    new_w = w + pad_x * 2
    new_h = h + pad_y * 2

    # Build padded canvas
    canvas = Image.new("RGB", (new_w, new_h), bg)
    canvas.paste(img, (pad_x, pad_y))

    # Output path
    if args.output:
        out = Path(args.output)
    else:
        out_dir = Path("avatars/padded images")
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / f"{src.stem}_padded{src.suffix}"

    canvas.save(str(out))

    char_pct_w = round(w / new_w * 100)
    char_pct_h = round(h / new_h * 100)
    print(f"Original : {w} × {h}")
    print(f"Padded   : {new_w} × {new_h}  ({args.pad}% padding each side)")
    print(f"Character: ~{char_pct_w}% wide, ~{char_pct_h}% tall of final frame")
    print(f"Saved    : {out}")


if __name__ == "__main__":
    main()
