#!/usr/bin/env python3
"""
process_sprite.py — Sugar Free sprite sheet processor
======================================================
Takes a green-screen sprite sheet (N cols × M rows), removes the
chroma-key background, splits each row into a separate transparent PNG,
and scales to the app's standard frame width.

Usage
-----
  python tools/process_sprite.py --input "Sprite sheets/iron_pumper_sprite_sheet.png" \
      --key bicep --cols 4 --rows 2

  # Two rows  →  avatar-bicep.png  +  avatar-bicep-shiny.png
  # One row   →  avatar-bicep.png  only

Arguments
---------
  --input        Path to the source sprite sheet image
  --key          Character key used in output filenames  (e.g. "bicep")
  --cols         Number of animation frames (columns)    [default: 4]
  --rows         Number of palette rows (1=normal only, 2=normal+shiny) [default: 2]
  --frame-width  Output width per frame in pixels        [default: 153]
  --tolerance    Green-screen removal sensitivity 0-255  [default: 55]
  --output-dir   Folder for output files                 [default: same dir as input's parent]
  --green        Chroma-key hex color                    [default: 00C853]
  --no-scale     Skip scaling; output at native row dimensions
  --speed        Total animation loop time in seconds    [default: 0.8]
  --anchor       How to anchor each frame after chroma removal:
                   bottom-center (default) — pins the bottom of the character
                     to the frame bottom and centres horizontally; eliminates
                     left/right drift and bobbing caused by AI positional jitter
                   center — centres both axes (better for floating characters)
                   none — no repositioning
  --pingpong     Append reversed middle frames to create a smooth back-and-forth
                 loop with no hard jump (e.g. [A,B,C] → [A,B,C,B]).

Row naming convention
---------------------
  Row 0  →  avatar-{key}.png          (normal)
  Row 1  →  avatar-{key}-shiny.png    (shiny / palette-swap)
  Row 2+ →  avatar-{key}-row2.png, etc.
"""

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image


ROW_SUFFIXES = ["", "-shiny", "-row2", "-row3", "-row4"]


def parse_args():
    p = argparse.ArgumentParser(description="Sprite sheet splitter + chroma-key remover")
    p.add_argument("--input",       required=True,  help="Source sprite sheet path")
    p.add_argument("--key",         required=True,  help="Character key (e.g. bicep)")
    p.add_argument("--cols",        type=int, default=4,    help="Number of frames (columns)")
    p.add_argument("--rows",        type=int, default=2,    help="Number of palette rows")
    p.add_argument("--frame-width", type=int, default=153,  help="Output px per frame (scales proportionally)")
    p.add_argument("--tolerance",   type=int, default=55,   help="Chroma-key color distance tolerance (0-255)")
    p.add_argument("--output-dir",  default=None,           help="Output directory (default: input file's parent)")
    p.add_argument("--green",       default="00C853",       help="Chroma-key hex color without #")
    p.add_argument("--no-scale",    action="store_true",    help="Skip scaling to frame-width")
    p.add_argument("--speed",        type=float, default=0.8, help="Total animation loop time in seconds (used for APNG frame duration)")
    p.add_argument("--anchor",       default="bottom-center",
                   choices=["bottom-center", "center", "none"],
                   help="How to anchor each frame to remove AI positional jitter (default: bottom-center)")
    p.add_argument("--pingpong",     action="store_true",
                   help="Append reversed middle frames for a smooth back-and-forth loop")
    p.add_argument("--no-despill",   action="store_true",
                   help="Skip green-spill removal (by default, residual green is clamped out of edge pixels)")
    p.add_argument("--rembg",        action="store_true",
                   help="Use rembg neural-net background removal instead of chroma key (works on any bg color)")
    p.add_argument("--combine-rows",  action="store_true",
                   help="Treat all rows as sequential animation frames (read L→R top→bottom) into one APNG, "
                        "instead of saving a separate file per row. Partial rows are auto-detected.")
    return p.parse_args()


def hex_to_rgb(hex_str: str):
    h = hex_str.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def remove_green_screen(img: Image.Image, target_rgb: tuple, tolerance: int) -> Image.Image:
    """Replace pixels within `tolerance` of `target_rgb` with full transparency."""
    rgba = img.convert("RGBA")
    data = np.array(rgba, dtype=np.float32)

    tr, tg, tb = target_rgb
    dist = np.sqrt(
        (data[:, :, 0] - tr) ** 2 +
        (data[:, :, 1] - tg) ** 2 +
        (data[:, :, 2] - tb) ** 2
    )

    # Hard mask: fully transparent where close to chroma key
    mask = dist < tolerance
    data[mask, 3] = 0

    # Soft edge: partial transparency for anti-aliased fringe pixels
    fringe = (dist >= tolerance) & (dist < tolerance * 1.6)
    fade = 1.0 - (dist[fringe] - tolerance) / (tolerance * 0.6)
    data[fringe, 3] = np.minimum(data[fringe, 3], (1.0 - fade) * 255)

    return Image.fromarray(data.astype(np.uint8))


def despill_green(img: Image.Image) -> Image.Image:
    """Remove residual green-screen color spill from semi-transparent edge pixels.

    After chroma-key removal, anti-aliased fringe pixels often retain a green
    tint (green channel > average of red+blue). This is most visible against
    warm or golden shiny palettes. We clamp the green channel on any pixel
    that is semi-transparent (alpha 1-254) and still green-dominant, replacing
    green with the average of red and blue. Fully opaque character pixels are
    left untouched, so the character's own green elements (leaves, broccoli,
    etc.) are not affected.
    """
    data = np.array(img, dtype=np.float32)
    alpha = data[:, :, 3]

    # Only target semi-transparent fringe pixels
    edge = (alpha > 0) & (alpha < 255)
    if not edge.any():
        return img

    r, g, b = data[:, :, 0], data[:, :, 1], data[:, :, 2]
    avg_rb = (r + b) / 2.0
    # Spill: green channel exceeds average of red and blue on a fringe pixel
    spill = edge & (g > avg_rb)
    data[:, :, 1] = np.where(spill, avg_rb, g)

    return Image.fromarray(data.astype(np.uint8))


def scale_strip(strip: Image.Image, cols: int, target_frame_width: int) -> Image.Image:
    """Scale a horizontal strip so each frame is target_frame_width wide (proportional height)."""
    target_total_width = target_frame_width * cols
    ratio = target_total_width / strip.width
    target_height = max(1, round(strip.height * ratio))
    return strip.resize((target_total_width, target_height), Image.LANCZOS)


def anchor_frames(frames: list, mode: str) -> list:
    """Re-anchor each frame so the character sits at a consistent position.

    Crops to the non-transparent bounding box of each frame, then pastes it
    onto a fresh canvas of the original frame size using the chosen alignment:
      bottom-center — bottom of character pinned to bottom of canvas, centred X
      center        — centred on both axes
    This eliminates the left/right drift and vertical bobbing that occurs when
    an AI generator places the character at slightly different positions per frame.
    """
    if mode == 'none' or not frames:
        return frames

    target_w, target_h = frames[0].size
    result = []
    for frame in frames:
        data = np.array(frame)
        alpha = data[:, :, 3]
        rows_mask = np.any(alpha > 10, axis=1)
        cols_mask = np.any(alpha > 10, axis=0)

        if not (rows_mask.any() and cols_mask.any()):
            result.append(Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0)))
            continue

        rmin = int(np.where(rows_mask)[0][0])
        rmax = int(np.where(rows_mask)[0][-1])
        cmin = int(np.where(cols_mask)[0][0])
        cmax = int(np.where(cols_mask)[0][-1])

        char = frame.crop((cmin, rmin, cmax + 1, rmax + 1))
        char_w, char_h = char.size

        canvas = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
        if mode == 'bottom-center':
            x = (target_w - char_w) // 2
            y = target_h - char_h
        else:  # center
            x = (target_w - char_w) // 2
            y = (target_h - char_h) // 2

        canvas.paste(char, (x, y), char)
        result.append(canvas)
    return result


def pingpong_frames(frames: list) -> list:
    """Turn [A,B,C] into [A,B,C,B] for a smooth looping back-and-forth."""
    if len(frames) <= 2:
        return frames
    return frames + list(reversed(frames[1:-1]))


def row_suffix(row_index: int) -> str:
    if row_index < len(ROW_SUFFIXES):
        return ROW_SUFFIXES[row_index]
    return f"-row{row_index}"


def count_cols_in_row(band_rgb: np.ndarray, bg_rgb: tuple, tolerance: int = 60) -> int:
    """Count how many non-empty cells are in a row band by detecting character column runs."""
    bg = np.array(bg_rgb, dtype=float)
    dist = np.sqrt(((band_rgb.astype(float) - bg)**2).sum(axis=2))
    col_has_char = (dist > tolerance).any(axis=0)
    runs = 0
    in_run = False
    for has in col_has_char:
        if has and not in_run:
            in_run = True; runs += 1
        elif not has:
            in_run = False
    return runs


def main():
    args = parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"ERROR: input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(args.output_dir) if args.output_dir else Path('avatars')
    output_dir.mkdir(parents=True, exist_ok=True)

    target_rgb = hex_to_rgb(args.green)
    print(f"Source : {input_path}  ({args.cols} cols × {args.rows} rows)")
    print(f"Chroma : #{args.green.upper()}  tolerance={args.tolerance}")
    print(f"Output : {output_dir}")
    print()

    img = Image.open(input_path).convert("RGB")
    w, h = img.size
    frame_w = w // args.cols
    frame_h = h // args.rows
    print(f"Detected frame size: {frame_w}×{frame_h} px  (source {w}×{h})")

    if args.combine_rows:
        # ── Combined mode: all rows → one APNG ──────────────────────────────
        all_frames = []
        total_source_frames = 0
        arr = np.array(img)
        bg_rgb = tuple(int(x) for x in (
            np.concatenate([arr[:8,:8], arr[:8,-8:], arr[-8:,:8], arr[-8:,-8:]])
            .reshape(-1, 3).mean(axis=0).astype(int)
        ))
        print(f"Auto-detected BG: rgb{bg_rgb}")

        for row in range(args.rows):
            y0 = row * frame_h
            y1 = y0 + frame_h
            band = arr[y0:y1]
            actual_cols = count_cols_in_row(band, bg_rgb)
            actual_cols = min(actual_cols, args.cols)  # never exceed declared cols
            print(f"  Row {row}: detected {actual_cols} of {args.cols} columns")
            strip = img.crop((0, y0, w, y1))

            row_frames = []
            for i in range(actual_cols):
                x0 = i * frame_w
                cell = strip.crop((x0, 0, x0 + frame_w, frame_h))
                if args.rembg:
                    from rembg import remove as rembg_remove
                    cell_rgba = rembg_remove(cell)
                else:
                    cell_rgba = remove_green_screen(cell, target_rgb, args.tolerance)
                    if not args.no_despill:
                        cell_rgba = despill_green(cell_rgba)
                row_frames.append(cell_rgba)

            all_frames.extend(row_frames)
            total_source_frames += actual_cols

        print(f"  Total source frames: {total_source_frames}")

        # Scale all frames to frame_width
        if not args.no_scale:
            ratio = args.frame_width / all_frames[0].width
            new_h = max(1, round(all_frames[0].height * ratio))
            all_frames = [f.resize((args.frame_width, new_h), Image.LANCZOS) for f in all_frames]
            print(f"  Scaled to {args.frame_width}\u00d7{new_h} px/frame")

        # Anchor
        if args.anchor != 'none':
            all_frames = anchor_frames(all_frames, args.anchor)
            print(f"  Anchored ({args.anchor})")

        # Pingpong
        if args.pingpong:
            all_frames = pingpong_frames(all_frames)
            print(f"  Ping-pong \u2192 {len(all_frames)} effective frames")

        duration_ms = max(1, int(round(args.speed * 1000 / total_source_frames)))
        out_path = output_dir / f"avatar-{args.key}.png"
        all_frames[0].save(
            out_path, format='PNG', save_all=True,
            append_images=all_frames[1:], loop=0, duration=duration_ms, disposal=2,
        )
        print(f"  Saved APNG ({len(all_frames)} frames, {duration_ms}ms/frame) \u2192 {out_path}")
        print()
        print("Done.")
        return
        # Crop this row as a full horizontal strip
        y0 = row * frame_h
        y1 = y0 + frame_h
        strip = img.crop((0, y0, w, y1))

        # Remove background
        if args.rembg:
            try:
                from rembg import remove as rembg_remove
            except ImportError:
                sys.exit("Error: rembg not installed. Run: pip install rembg[cpu] --user")
            # Split into individual frames first, remove bg per-frame, then reassemble
            src_frame_w = w // args.cols
            print(f"  Row {row}: removing background with rembg ({args.cols} frames)...")
            rembg_frames = []
            for i in range(args.cols):
                x0 = i * src_frame_w
                cell = strip.crop((x0, 0, x0 + src_frame_w, strip.height))
                rembg_frames.append(rembg_remove(cell.convert("RGB")))
                print(f"    frame {i+1}/{args.cols}", end="\r", flush=True)
            print()
            strip_rgba = None  # not used below when rembg_frames is set
        else:
            rembg_frames = None
            # Remove green screen
            strip_rgba = remove_green_screen(strip, target_rgb, args.tolerance)
            # Remove residual green spill from edge pixels (default on)
            if not args.no_despill:
                strip_rgba = despill_green(strip_rgba)

        # Scale to app frame width
        if rembg_frames is not None:
            # Scale each rembg frame individually
            if not args.no_scale:
                ratio = args.frame_width / rembg_frames[0].width
                new_h = max(1, round(rembg_frames[0].height * ratio))
                rembg_frames = [f.resize((args.frame_width, new_h), Image.LANCZOS) for f in rembg_frames]
                print(f"  Row {row}: scaled to {args.frame_width}x{new_h} px/frame")
            frames = rembg_frames
        else:
            # Scale to app frame width
            if not args.no_scale:
                strip_rgba = scale_strip(strip_rgba, args.cols, args.frame_width)
                out_w, out_h = strip_rgba.size
                print(f"  Row {row}: scaled to {out_w}\u00d7{out_h}  ({args.frame_width}px/frame)")
            else:
                out_w, out_h = strip_rgba.size
                print(f"  Row {row}: native {out_w}\u00d7{out_h}")

            # Split strip into individual frames
            frame_w_out = strip_rgba.width // args.cols
            frames = []
            for i in range(args.cols):
                x0 = i * frame_w_out
                frames.append(strip_rgba.crop((x0, 0, x0 + frame_w_out, strip_rgba.height)))

        # Anchor each frame to remove AI positional jitter
        if args.anchor != 'none':
            frames = anchor_frames(frames, args.anchor)
            print(f"  Row {row}: anchored ({args.anchor})")

        # Optional ping-pong for smoother looping
        if args.pingpong:
            frames = pingpong_frames(frames)
            print(f"  Row {row}: ping-pong → {len(frames)} effective frames")

        # Save as animated PNG (APNG)
        base_frames = args.cols  # use original col count for per-frame duration
        duration_ms = max(1, int(round(args.speed * 1000 / base_frames)))
        suffix = row_suffix(row)
        out_name = f"avatar-{args.key}{suffix}.png"
        out_path = output_dir / out_name
        frames[0].save(
            out_path,
            format='PNG',
            save_all=True,
            append_images=frames[1:],
            loop=0,
            duration=duration_ms,
            disposal=2,
        )
        print(f"  Row {row}: saved APNG ({args.cols} frames, {duration_ms}ms/frame) → {out_path}")

    print()
    print("Done.")


if __name__ == "__main__":
    main()
