#!/usr/bin/env python3
"""
video_to_apng.py — Sugar Free video-to-APNG converter
======================================================
Extracts frames from an MP4 (or any video), removes the white background,
anchors each frame, and saves a looping APNG ready for the app.

Usage
-----
  python tools/video_to_apng.py --input "path/to/animation.mp4" --key sprout

  # With options:
  python tools/video_to_apng.py --input "animation.mp4" --key sprout \\
      --fps 12 --speed 0.9 --pingpong

Arguments
---------
  --input        Path to the source video file (MP4, WebM, etc.)
  --key          Character key for output filename  (e.g. "sprout")
  --fps          Frames to extract per second        [default: 12]
  --speed        Total loop duration in seconds      [default: match video duration]
  --tolerance    White-key removal sensitivity 0-255 [default: 35]
  --output-dir   Output folder                       [default: avatars/]
  --anchor       Frame anchoring: bottom-center, center, none  [default: bottom-center]
  --pingpong     Smooth back-and-forth loop (reverses middle frames)
  --shiny        Save as the shiny variant (avatar-{key}-shiny.png)
  --key-color    Background hex color to remove      [default: FFFFFF]
  --adaptive-bg  Sample background color from corners of each frame instead of
                 using a fixed key color. Automatically stops collecting frames
                 when the background drifts too far from the first frame's color.
                 Use this when the AI changed the background color mid-video.
  --bg-drift     Max color distance from initial bg before stopping (adaptive mode)
                 [default: 40]
"""

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def parse_args():
    p = argparse.ArgumentParser(description="Video to APNG converter for Sugar Free app")
    p.add_argument("--input",       required=True,  help="Source video path")
    p.add_argument("--key",         required=True,  help="Character key (e.g. sprout)")
    p.add_argument("--fps",         type=float, default=12,    help="Target frames per second to sample")
    p.add_argument("--speed",       type=float, default=None,  help="Total animation loop time in seconds")
    p.add_argument("--tolerance",   type=int,   default=35,    help="Background color distance tolerance (0-255)")
    p.add_argument("--output-dir",  default="avatars",         help="Output directory")
    p.add_argument("--anchor",      default="bottom-center",
                   choices=["bottom-center", "center", "none"])
    p.add_argument("--pingpong",    action="store_true")
    p.add_argument("--shiny",       action="store_true",       help="Save as shiny variant")
    p.add_argument("--key-color",   default="FFFFFF",          help="Background hex color to remove")
    p.add_argument("--adaptive-bg", action="store_true",       help="Sample bg color per-frame from corners; stop when bg drifts")
    p.add_argument("--bg-drift",    type=float, default=40.0,  help="Max color distance from initial bg before stopping (adaptive mode)")
    p.add_argument("--skip-frames", type=int,   default=0,     help="Skip this many source frames from the start before sampling")
    p.add_argument("--flood-fill",  action="store_true",       help="Remove background by flood-filling from corners instead of color keying. Use when character color matches the background.")
    p.add_argument("--flood-tolerance", type=int, default=30,  help="Color tolerance for flood-fill background detection [default: 30]")
    p.add_argument("--rembg",       action="store_true",       help="Use rembg neural-net background removal (best quality, works on any background color)")
    return p.parse_args()


def hex_to_rgb(hex_str: str):
    h = hex_str.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def sample_bg_color(frame_rgb: np.ndarray, patch: int = 8) -> tuple:
    """Sample background color by averaging corner patches of the frame."""
    h, w = frame_rgb.shape[:2]
    corners = [
        frame_rgb[:patch, :patch],
        frame_rgb[:patch, w - patch:],
        frame_rgb[h - patch:, :patch],
        frame_rgb[h - patch:, w - patch:],
    ]
    all_pixels = np.concatenate([c.reshape(-1, 3) for c in corners], axis=0)
    mean = all_pixels.mean(axis=0)
    return (int(mean[0]), int(mean[1]), int(mean[2]))


def color_distance(a: tuple, b: tuple) -> float:
    return float(np.sqrt(sum((x - y) ** 2 for x, y in zip(a, b))))


def extract_frames(video_path: str, target_fps: float,
                   adaptive_bg: bool = False, bg_drift: float = 40.0,
                   skip_frames: int = 0,
                   ) -> tuple[list, list, float]:
    """Extract frames at target_fps.
    Returns (list of RGB numpy arrays, list of per-frame bg colors, source_fps).
    If adaptive_bg is True, samples bg color per frame and stops when it drifts.
    skip_frames: skip this many source frames from the start before sampling.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        sys.exit(f"Error: could not open video: {video_path}")

    src_fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    usable_frames = max(0, total_frames - skip_frames)
    print(f"Video: {src_fps:.2f} fps, {total_frames} frames, "
          f"{total_frames/src_fps:.2f}s — sampling at {target_fps} fps"
          + (f" (skipping first {skip_frames} frames)" if skip_frames else ""))

    # Compute which source frame indices to sample (offset by skip_frames)
    duration = usable_frames / src_fps
    sample_count = max(2, round(duration * target_fps))
    sample_indices = sorted(set(
        skip_frames + round(i * (usable_frames - 1) / (sample_count - 1))
        for i in range(sample_count)
    ))

    frames_rgb = []
    bg_colors = []
    initial_bg = None
    frame_idx = 0
    sample_set = set(sample_indices)

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx in sample_set:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            if adaptive_bg:
                bg = sample_bg_color(rgb)
                if initial_bg is None:
                    initial_bg = bg
                    print(f"Adaptive bg: initial color sampled as rgb{initial_bg}")
                drift = color_distance(bg, initial_bg)
                if drift > bg_drift:
                    print(f"  Frame {frame_idx}: bg drifted {drift:.1f} > {bg_drift} threshold — stopping here "
                          f"(bg shifted from rgb{initial_bg} to rgb{bg})")
                    break
                bg_colors.append(bg)
            frames_rgb.append(rgb)
        frame_idx += 1
    cap.release()

    print(f"Extracted {len(frames_rgb)} frames")
    return frames_rgb, bg_colors, src_fps


def remove_background(frame_rgb: np.ndarray, target_rgb: tuple, tolerance: int) -> Image.Image:
    """Remove background color from an RGB numpy array, returning RGBA Image."""
    data = frame_rgb.astype(np.float32)
    tr, tg, tb = target_rgb

    dist = np.sqrt(
        (data[:, :, 0] - tr) ** 2 +
        (data[:, :, 1] - tg) ** 2 +
        (data[:, :, 2] - tb) ** 2
    )

    alpha = np.full(dist.shape, 255.0)

    # Hard mask
    mask = dist < tolerance
    alpha[mask] = 0

    # Soft fringe
    fringe = (dist >= tolerance) & (dist < tolerance * 1.6)
    fade = 1.0 - (dist[fringe] - tolerance) / (tolerance * 0.6)
    alpha[fringe] = np.minimum(alpha[fringe], (1.0 - fade) * 255)

    rgba = np.dstack([frame_rgb, alpha.astype(np.uint8)])
    return Image.fromarray(rgba.astype(np.uint8), "RGBA")


def remove_background_flood(frame_rgb: np.ndarray, tolerance: int = 30) -> Image.Image:
    """Remove background by flood-filling from all 4 corners.
    Works even when character and background share the same color (e.g. white on white).
    Relies on the character having a visible outline that contains the fill.
    """
    h, w = frame_rgb.shape[:2]
    img_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)

    # Build a combined flood-fill mask from all 4 corners
    bg_mask = np.zeros((h, w), dtype=np.uint8)
    corners = [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)]
    lo = (tolerance,) * 3
    hi = (tolerance,) * 3
    flags = 4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8)

    for (ry, rx) in corners:
        flood_mask = np.zeros((h + 2, w + 2), dtype=np.uint8)
        cv2.floodFill(img_bgr.copy(), flood_mask, (rx, ry), 0, lo, hi, flags)
        bg_mask = cv2.bitwise_or(bg_mask, flood_mask[1:-1, 1:-1])

    # bg_mask==255 is background; invert for character alpha
    alpha = np.where(bg_mask == 255, 0, 255).astype(np.uint8)

    # Slight erosion on the bg mask edge to recover fringe pixels
    kernel = np.ones((3, 3), np.uint8)
    alpha = cv2.dilate(alpha, kernel, iterations=1)

    rgba = np.dstack([frame_rgb, alpha])
    return Image.fromarray(rgba, "RGBA")


def anchor_frames(frames: list, mode: str) -> list:
    if mode == "none" or not frames:
        return frames

    target_w, target_h = frames[0].size
    result = []
    for frame in frames:
        data = np.array(frame)
        alpha = data[:, :, 3]
        rows_mask = np.any(alpha > 10, axis=1)
        cols_mask = np.any(alpha > 10, axis=0)

        if not (rows_mask.any() and cols_mask.any()):
            result.append(Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0)))
            continue

        rmin = int(np.where(rows_mask)[0][0])
        rmax = int(np.where(rows_mask)[0][-1])
        cmin = int(np.where(cols_mask)[0][0])
        cmax = int(np.where(cols_mask)[0][-1])

        char = frame.crop((cmin, rmin, cmax + 1, rmax + 1))
        char_w, char_h = char.size
        canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))

        if mode == "bottom-center":
            x = (target_w - char_w) // 2
            y = target_h - char_h
        else:
            x = (target_w - char_w) // 2
            y = (target_h - char_h) // 2

        canvas.paste(char, (x, y), char)
        result.append(canvas)
    return result


def pingpong_frames(frames: list) -> list:
    if len(frames) <= 2:
        return frames
    return frames + list(reversed(frames[1:-1]))


def main():
    args = parse_args()

    video_path = args.input
    if not Path(video_path).exists():
        sys.exit(f"Error: file not found: {video_path}")

    key_rgb = hex_to_rgb(args.key_color)

    # Extract frames
    frames_rgb, bg_colors, src_fps = extract_frames(
        video_path, args.fps,
        adaptive_bg=args.adaptive_bg,
        bg_drift=args.bg_drift,
        skip_frames=args.skip_frames,
    )

    # Remove background
    if args.rembg:
        try:
            from rembg import remove as rembg_remove
        except ImportError:
            sys.exit("Error: rembg not installed. Run: pip install rembg[cpu] --user")
        print(f"Removing background with rembg (neural net)...")
        frames_rgba = []
        for i, f in enumerate(frames_rgb):
            img = Image.fromarray(f, "RGB")
            out = rembg_remove(img)
            frames_rgba.append(out)
            if (i + 1) % 10 == 0 or (i + 1) == len(frames_rgb):
                print(f"  {i + 1}/{len(frames_rgb)} frames processed")
        print(f"Background removed from {len(frames_rgba)} frames (rembg)")
    elif args.flood_fill:
        frames_rgba = [remove_background_flood(f, args.flood_tolerance) for f in frames_rgb]
        print(f"Background removed from {len(frames_rgba)} frames (flood-fill from corners)")
    elif args.adaptive_bg and bg_colors:
        frames_rgba = [
            remove_background(f, bg, args.tolerance)
            for f, bg in zip(frames_rgb, bg_colors)
        ]
        print(f"Background removed from {len(frames_rgba)} frames (adaptive per-frame color)")
    else:
        frames_rgba = [remove_background(f, key_rgb, args.tolerance) for f in frames_rgb]
        print(f"Background removed from {len(frames_rgba)} frames")

    # Anchor
    if args.anchor != "none":
        frames_rgba = anchor_frames(frames_rgba, args.anchor)
        print(f"Frames anchored ({args.anchor})")

    # Pingpong
    if args.pingpong:
        frames_rgba = pingpong_frames(frames_rgba)
        print(f"Pingpong applied: {len(frames_rgba)} total frames")

    # Per-frame duration
    video_duration = len(frames_rgb) / args.fps
    loop_duration = args.speed if args.speed else video_duration
    frame_ms = round(loop_duration * 1000 / len(frames_rgba))
    print(f"Loop duration: {loop_duration:.2f}s, {frame_ms}ms per frame")

    # Output path
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    suffix = "-shiny" if args.shiny else ""
    out_path = out_dir / f"avatar-{args.key}{suffix}.png"

    # Save APNG
    first = frames_rgba[0]
    rest = frames_rgba[1:]
    first.save(
        str(out_path),
        save_all=True,
        append_images=rest,
        loop=0,
        duration=frame_ms,
        disposal=2,
    )
    print(f"Saved: {out_path}  ({len(frames_rgba)} frames @ {frame_ms}ms each)")


if __name__ == "__main__":
    main()
