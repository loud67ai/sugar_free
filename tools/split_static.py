#!/usr/bin/env python3
"""
split_static.py — Split a 1-column × 2-row static sprite sheet into two
                   PNG avatars (normal + shiny).

The input image has the normal palette on the top half and the shiny
palette on the bottom half.

Background modes
----------------
  --keep-bg     Recommended for black-background images. No BG removal;
                use CSS mix-blend-mode: screen in the app instead.
                Autocrop finds the character by detecting non-black pixels.
  --rembg       Neural-net removal (rembg). Works on any BG but slow and
                may drop dark outlines on dark backgrounds.
  (default)     Chroma-key removal via --green / --tolerance.

Usage
-----
  python tools/split_static.py --input "avatars/still images/sugar_sprout_black.png" --key sprout --keep-bg --height 200

Arguments
---------
  --input        Path to the source image (1-col × 2-row)
  --key          Character key used in output filenames (e.g. "sprout")
  --output-dir   Folder for output PNGs              [default: avatars/]
  --height       Output height in pixels             [default: 128]
  --keep-bg      Skip BG removal; autocrop on dark BG instead (recommended)
  --green        Chroma-key hex color                [default: 00C853]
  --tolerance    Chroma-key tolerance (0-255)        [default: 55]
  --rembg        Use rembg neural-net BG removal
  --no-autocrop  Skip auto-cropping to character bounding box

Output
------
  avatars/avatar-{key}.png        — normal palette
  avatars/avatar-{key}-shiny.png  — shiny palette
"""

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def parse_args():
    p = argparse.ArgumentParser(description="1×2 static sprite sheet splitter")
    p.add_argument("--input",       required=True,  help="Source image path")
    p.add_argument("--key",         required=True,  help="Character key (e.g. sprout)")
    p.add_argument("--output-dir",  default=None,   help="Output directory (default: avatars/ next to input)")
    p.add_argument("--height",      type=int, default=128, help="Output height in pixels (after autocrop)")
    p.add_argument("--green",       default="00C853", help="Chroma-key hex color (without #)")
    p.add_argument("--tolerance",   type=int, default=55, help="Chroma-key tolerance (0-255)")
    p.add_argument("--keep-bg",     action="store_true", help="Skip BG removal; keep black background (use CSS mix-blend-mode: screen in app)")
    p.add_argument("--rembg",       action="store_true", help="Use rembg neural-net BG removal")
    p.add_argument("--no-autocrop", action="store_true", help="Skip cropping to character bounding box")
    p.add_argument("--fringe-threshold", type=int, default=10,
                   help="Alpha threshold for fringe removal (0-255); lower = less aggressive. "
                        "Default 10 is safe for dark outlines on dark backgrounds. "
                        "Use 0 to disable fringe removal entirely.")
    p.add_argument("--alpha-grow", type=int, default=0,
                   help="Dilate the alpha mask by N pixels after BG removal. "
                        "Use 2-4 to recover dark outline pixels lost on dark backgrounds.")
    p.add_argument("--canvas", nargs=2, type=int, metavar=("W", "H"), default=None,
                   help="Pad output to a fixed canvas (e.g. --canvas 240 200). "
                        "Character is scaled to fit within canvas (never up), then "
                        "centred on a transparent background of exactly W×H pixels.")
    p.add_argument("--canvas-fill", action="store_true",
                   help="Used with --canvas: scale to canvas HEIGHT (filling height), "
                        "then centre-crop or pad to canvas WIDTH. "
                        "Use for wide characters (e.g. jump rope) so the character body "
                        "fills the height instead of shrinking to fit the wide aspect ratio.")
    p.add_argument("--remove-black", type=int, default=0, metavar="THRESHOLD",
                   help="After BG removal, make fully-opaque pixels transparent if ALL "
                        "RGB channels are below THRESHOLD. Use 5-8 for black-background "
                        "sources to remove enclosed black regions (e.g. inside a rope arc) "
                        "without affecting #1A0A00 charcoal outlines (R=26 > threshold).")
    return p.parse_args()


def hex_to_rgb(hex_str):
    h = hex_str.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def color_distance(c1, c2):
    return float(np.sqrt(sum((int(a) - int(b)) ** 2 for a, b in zip(c1, c2))))


def remove_bg_chroma(img_rgb, bg_rgb, tolerance):
    """Chroma-key removal: pixels within tolerance of bg_rgb become transparent."""
    arr = np.array(img_rgb.convert("RGBA"), dtype=np.float32)
    rgb = arr[:, :, :3]
    bg = np.array(bg_rgb, dtype=np.float32)
    dist = np.sqrt(np.sum((rgb - bg) ** 2, axis=2))
    mask = dist < tolerance
    arr[:, :, 3] = np.where(mask, 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def remove_bg_rembg(img):
    """Neural-net background removal via rembg."""
    try:
        from rembg import remove as rembg_remove
    except ImportError:
        print("ERROR: rembg not installed. Run: pip install rembg[cpu] --user", file=sys.stderr)
        sys.exit(1)
    return rembg_remove(img.convert("RGBA"))


def autocrop(img):
    """Crop to the tight bounding box of non-transparent pixels."""
    bbox = img.getbbox()  # returns (left, upper, right, lower) or None
    if bbox:
        return img.crop(bbox)
    return img


def autocrop_dark_bg(img, threshold=40, margin=8):
    """Crop to the bounding box of clearly non-black pixels plus a small margin.

    threshold: pixels with any channel > threshold are considered character pixels.
               Higher = ignore faint glow/sparkle artifacts; lower = include outlines.
               Default 40 catches colored body/accessory pixels while ignoring
               near-black outline (#1A0A00) and compression noise.
    margin:    extra pixels to add on each side so outlines aren't clipped.
    """
    arr = np.array(img.convert("RGB"))
    mask = np.any(arr > threshold, axis=2)
    rows = np.any(mask, axis=1)
    cols = np.any(mask, axis=0)
    if not rows.any():
        return img
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    H, W = arr.shape[:2]
    rmin = max(0, rmin - margin)
    rmax = min(H - 1, rmax + margin)
    cmin = max(0, cmin - margin)
    cmax = min(W - 1, cmax + margin)
    return img.crop((cmin, rmin, cmax + 1, rmax + 1))


def scale_to_height(img, target_height):
    """Scale image to target_height, preserving aspect ratio."""
    w, h = img.size
    if h == target_height:
        return img
    ratio = target_height / h
    new_w = int(round(w * ratio))
    return img.resize((new_w, target_height), Image.LANCZOS)


def pad_to_canvas(img, canvas_w, canvas_h):
    """Scale to fit within canvas (scale down only), then centre on transparent canvas."""
    w, h = img.size
    scale = min(canvas_w / w, canvas_h / h, 1.0)  # never scale up
    if scale < 1.0:
        new_w = int(round(w * scale))
        new_h = int(round(h * scale))
        img = img.resize((new_w, new_h), Image.LANCZOS)
    w, h = img.size
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    x = (canvas_w - w) // 2
    y = (canvas_h - h) // 2
    canvas.paste(img, (x, y))
    return canvas


def fill_to_canvas(img, canvas_w, canvas_h, target_height=None):
    """Scale to target_height (or canvas HEIGHT if unset), then centre-crop or pad to canvas WIDTH.

    Good for wide characters (e.g. jump rope arc) where fit-mode would
    shrink the character too small.  Wide elements that extend past the
    canvas edges will be cropped symmetrically.
    """
    fill_h = target_height if target_height and target_height < canvas_h else canvas_h
    w, h = img.size
    if h != fill_h:
        ratio = fill_h / h
        new_w = int(round(w * ratio))
        img = img.resize((new_w, fill_h), Image.LANCZOS)
    w, h = img.size
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    y_off = (canvas_h - h) // 2  # centre vertically when fill_h < canvas_h
    if w >= canvas_w:
        # wider than canvas — centre-crop horizontally
        x = (w - canvas_w) // 2
        cropped = img.crop((x, 0, x + canvas_w, h))
        canvas.paste(cropped, (0, y_off))
    else:
        # narrower than canvas — centre-pad horizontally
        x = (canvas_w - w) // 2
        canvas.paste(img, (x, y_off))
    return canvas


def grow_alpha(img, pixels):
    """Dilate the alpha channel by `pixels` pixels to recover missed outline edges."""
    if pixels <= 0:
        return img
    import numpy as np
    from PIL import ImageFilter
    arr = np.array(img)
    # Extract alpha, dilate it, then put back
    alpha = Image.fromarray(arr[:, :, 3], mode="L")
    for _ in range(pixels):
        alpha = alpha.filter(ImageFilter.MaxFilter(3))
    arr[:, :, 3] = np.array(alpha)
    return Image.fromarray(arr)


def remove_black_pixels(img, threshold=5):
    """Make fully-opaque near-pure-black pixels transparent.

    Targets pixels where ALL RGB channels < threshold.  A threshold of 5-8
    removes #000000 background artifacts (0,0,0) left by rembg inside enclosed
    regions while preserving #1A0A00 charcoal outlines (R=26, well above 8).
    Has no effect when threshold=0.
    """
    if threshold <= 0:
        return img
    arr = np.array(img, dtype=np.uint8)
    near_black = np.all(arr[:, :, :3] < threshold, axis=2) & (arr[:, :, 3] > 128)
    arr[near_black, 3] = 0
    return Image.fromarray(arr)


def trim_fringe(img, threshold=10):
    """Drop near-transparent fringe pixels to fully transparent.

    Only pixels with alpha < threshold are zeroed — this removes true background
    halo without touching real outline pixels, which may have low but non-trivial
    alpha on dark backgrounds. Set threshold=0 to disable.
    """
    if threshold <= 0:
        return img
    arr = np.array(img, dtype=np.uint8)
    arr[:, :, 3] = np.where(arr[:, :, 3] < threshold, 0, arr[:, :, 3])
    return Image.fromarray(arr, "RGBA")


def process_cell(img, keep_bg, use_rembg, bg_rgb, tolerance, target_height, do_autocrop, fringe_threshold, alpha_grow, remove_black=0):
    """Remove background (or keep it), optionally autocrop, and scale one cell."""
    if keep_bg:
        result = img.convert("RGB")
        if do_autocrop:
            result = autocrop_dark_bg(result)
        return scale_to_height(result, target_height)
    if use_rembg:
        result = remove_bg_rembg(img)
    else:
        result = remove_bg_chroma(img, bg_rgb, tolerance)
    result = grow_alpha(result, alpha_grow)
    result = remove_black_pixels(result, remove_black)
    result = trim_fringe(result, fringe_threshold)
    if do_autocrop:
        result = autocrop(result)
    return scale_to_height(result, target_height)


def main():
    args = parse_args()

    src = Path(args.input)
    if not src.exists():
        print(f"ERROR: Input file not found: {src}", file=sys.stderr)
        sys.exit(1)

    # Resolve output directory
    if args.output_dir:
        out_dir = Path(args.output_dir)
    else:
        # Default: avatars/ relative to the project root (parent of the input's parent)
        out_dir = src.parent.parent.parent / "avatars"
        if not out_dir.exists():
            out_dir = src.parent.parent / "avatars"
        if not out_dir.exists():
            out_dir = Path("avatars")
    out_dir.mkdir(parents=True, exist_ok=True)

    img = Image.open(src).convert("RGB")
    w, h = img.size
    mid = h // 2

    print(f"Source : {src}  ({w}×{h} px)")
    print(f"Split  : top {w}×{mid}  |  bottom {w}×{h - mid}")
    print(f"Output : {out_dir}")

    bg_rgb = hex_to_rgb(args.green)

    top_img    = img.crop((0, 0,   w, mid))
    bottom_img = img.crop((0, mid, w, h))

    if args.keep_bg:
        mode = "keep-bg (black BG; use CSS mix-blend-mode: screen)"
    elif args.rembg:
        mode = "rembg"
    else:
        mode = f"chroma #{args.green} tol={args.tolerance}"
    do_autocrop = not args.no_autocrop
    print(f"BG removal: {mode}  |  autocrop: {do_autocrop}  |  target height: {args.height}px")

    normal = process_cell(top_img,    args.keep_bg, args.rembg, bg_rgb, args.tolerance, args.height, do_autocrop, args.fringe_threshold, args.alpha_grow, args.remove_black)
    shiny  = process_cell(bottom_img, args.keep_bg, args.rembg, bg_rgb, args.tolerance, args.height, do_autocrop, args.fringe_threshold, args.alpha_grow, args.remove_black)

    normal_path = out_dir / f"avatar-{args.key}.png"
    shiny_path  = out_dir / f"avatar-{args.key}-shiny.png"

    if args.canvas:
        cw, ch = args.canvas
        if args.canvas_fill:
            normal = fill_to_canvas(normal, cw, ch, args.height)
            shiny  = fill_to_canvas(shiny,  cw, ch, args.height)
            print(f"Canvas : {cw}\u00d7{ch} (fill-to-height + centre-crop/pad)")
        else:
            normal = pad_to_canvas(normal, cw, ch)
            shiny  = pad_to_canvas(shiny,  cw, ch)
            print(f"Canvas : {cw}\u00d7{ch} (scale-to-fit + transparent pad)")

    normal.save(normal_path, "PNG")
    shiny.save(shiny_path,  "PNG")

    print(f"Saved  : {normal_path}  ({normal.size[0]}×{normal.size[1]})")
    print(f"Saved  : {shiny_path}   ({shiny.size[0]}×{shiny.size[1]})")


if __name__ == "__main__":
    main()
