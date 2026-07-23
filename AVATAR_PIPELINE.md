# Avatar Processing Pipeline

How to go from a text prompt to a finished animated APNG for the Sugar Free app.  
All commands are run from the workspace root: `C:\Users\265876\Downloads\sugar_free`

---

## Path A — AI Animation (Pixara / Kling)

Best for characters with complex secondary motion (Sugar Sprout, Zen Master, Year Legend).

---

### Step 1 — Generate the still image

Use the character's **Still Prompt** from `characters.md`.

- Image model: **Midjourney**, **Flux 2 Pro**, or **Google Nano Banana Pro**
- Aspect ratio: **1:1 (square)**
- Background: **flat solid bright green (#00C853)** — already specified in the prompt
- The character should be white cube (normal) or the shiny palette color (shiny variant)
- Save the result as e.g. `sprout_still.png` into `avatars/still images/`

---

### Step 2 — Add animation buffer with `pad_still.py`

The still image needs extra padding so the character doesn't clip when it moves.

```powershell
python tools/pad_still.py --input "avatars/still images/sprout_still.png"
```

Output: `avatars/padded images/sprout_still_padded.png` — character at ~43% of frame height, green padding on all sides.

**Options:**
```
--pad 65        Padding % each side (default: 65)
--output        Custom output path
--bg 00C853     Override background fill color (auto-detected from corners by default)
```

---

### Step 3 — Animate in Pixara or Kling AI

1. Go to **app.pixara.ai** → **Create Video** → **Image to Video**  
   *(or **klingai.com** → Image to Video)*
2. Upload `avatars/padded images/sprout_still_padded.png` as the source image
3. Paste the character's **Pixara Prompt** from `characters.md` as the motion prompt
4. Recommended model: **Kling 3.0** or **Seedance 2.0**
5. Duration: **3–4 seconds**
6. Generate and download the MP4

---

### Step 4 — Convert video to APNG with `video_to_apng.py`

```powershell
python tools/video_to_apng.py --input "sprout_animation.mp4" --key sprout --fps 12 --speed 0.9 --pingpong --key-color 00C853
```

Output: `avatars/avatar-sprout.png`

**For the shiny variant**, add `--shiny`:
```powershell
python tools/video_to_apng.py --input "sprout_shiny_animation.mp4" --key sprout --shiny --fps 12 --speed 0.9 --pingpong --key-color 00C853
```

Output: `avatars/avatar-sprout-shiny.png`

**Options:**
```
--fps 12            Frames to sample per second (default: 12; use 8 for lighter files)
--speed 0.9         Total loop duration in seconds (controls per-frame APNG timing)
--pingpong          Reverse middle frames for smooth back-and-forth loop
--key-color 00C853  Background color to remove (default: FFFFFF)
--tolerance 35      Sensitivity of background removal (raise if fringing, lower if character is cut)
--anchor            bottom-center (default) | center | none
```

---

## Path B — Sprite Sheet (direct frame-by-frame)

Best for characters with simple, predictable motions (Broccoli Chomper, Bookworm, Year Legend).

---

### Step 1 — Generate the sprite sheet

Use the character's **Prompt** from `characters.md`.

- Image model: **Midjourney** or **Flux 2 Pro**
- The prompt specifies exact pixel dimensions, column poses, and two palette rows
- Background: **flat solid bright green (#00C853)** — already in every prompt
- Save as e.g. `Sprite sheets/sugar_sprout.png` into the `Sprite sheets/` folder

---

### Step 2 — Process with `process_sprite.py`

Use the exact command from the character's **Process** line in `characters.md`, e.g.:

```powershell
python tools/process_sprite.py --input "Sprite sheets/sugar_sprout.png" --key sprout --cols 6 --rows 2 --speed 0.9 --pingpong
```

Output: `avatars/avatar-sprout.png` (row 1) + `avatars/avatar-sprout-shiny.png` (row 2)

**Key options:**
```
--cols N        Number of animation frames (columns in the sheet)
--rows 2        Always 2 for sheets with a shiny row
--speed 0.9     Total loop duration in seconds
--pingpong      Smooth back-and-forth loop
--tolerance 55  Background removal sensitivity
--no-despill    Skip green-spill fix (rarely needed)
--anchor        bottom-center (default) | center | none
```

---

## Output File Naming

| Row / Variant | Output filename              |
|---------------|------------------------------|
| Normal        | `avatars/avatar-{key}.png`   |
| Shiny         | `avatars/avatar-{key}-shiny.png` |

---

## Checking the result

Start the dev server and open the app:

```powershell
npx http-server -p 3000
```

Then open `http://localhost:3000` in a browser. The character will render using the APNG automatically — no code changes needed as long as the filename matches the `customSrc` / `shinySrc` in `app.js`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| White fringe around character | Increase `--tolerance` (try 50–70) |
| Character colors being cut | Decrease `--tolerance` (try 20–30) |
| Character drifts left/right per frame | Ensure `--anchor bottom-center` (default) |
| Animation clips at top/bottom | Re-run `pad_still.py` with higher `--pad`, or trim source video to one clean cycle |
| Too many frames / large file | Lower `--fps` (try 8) |
| Loop jumps at end | Add `--pingpong` flag |
| Green halo on shiny version | Ensure `--no-despill` is NOT set (despill runs by default) |
