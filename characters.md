# Sugar Free — Character Design Spec

10 characters total: 8 milestone unlocks, 1 default starter, 1 special (streak-break).  
Each character is a small pixel-art/cartoon avatar with a looping idle animation (3–8 frames).

---

## Character Roster

### 1. Sugar Sprout *(default / starter)*
- **Key**: `sprout`
- **Unlock**: Day 1 (first check-in ever)
- **Action**: Baby seedling bouncing in place — small leaves wiggling
- **Frames**: 6 — neutral → compress (squat) → bounce peak → land → lean left → lean right
- **Shiny at**: 7 own-streak days → coral-pink body, amber-brown leaves palette swap
- **Palette**: Soft green, cream belly, rosy cheeks
- **Description**: "Your first step to freedom!"
- **Notes**: Shown faded/frozen on the home screen before the user's first check-in.
- **Prompt**: A single static image, 153×256 pixels, containing one column and two rows on a flat solid black background (#000000). Cute kawaii 3D cartoon sugar cube character with two perky leaf sprouts on top of the head, small stubby arms and legs, rosy pink cheek blushes, large glossy black eyes. The character stands in a neutral upright pose — both feet flat on the ground, leaves pointing straight up, arms resting loosely at sides, calm happy closed smile, facing slightly toward the viewer at a gentle 3/4 angle. Top cell (row 1) — normal palette: sparkly white sugar cube body, vivid bright green leaves, rosy pink cheeks, soft white sparkle highlights on the cube surface. Bottom cell (row 2) — exact same pose and composition, only the colors changed: soft coral-pink sparkly sugar cube body, leaves become warm amber-brown, rosy pink cheeks unchanged. Both cells are identical in every way except color palette. Each cell is 153×128 pixels with at least 12 pixels of solid black buffer on all four edges; scale the character down as needed so all elements — including leaf tips — stay fully within bounds. No text, no labels, no watermarks, no dividers between cells. Character outlines and all line art use a consistent warm dark charcoal (#1A0A00) — apply this exact color to every outline stroke, body edge, limb boundary, feature outline, and accessory border throughout the image. Flat solid black (#000000) fills to all image edges. Soft cel-shaded 3D render, chibi proportions.
- **Process**: `python tools/process_sprite.py --input "Sprite sheets/sugar_sprout.png" --key sprout --cols 1 --rows 2`
- **Still Prompt** *(normal — use `--key-color 00C853` when processing)*: A single high-detail kawaii 3D cartoon character illustration for use as an AI animation reference. Subject: Sugar Sprout — a small sparkly sugar cube character standing in a relaxed neutral idle pose, centered in frame, body facing slightly toward the viewer at a gentle 3/4 angle. Character anatomy: perfectly cubic sugar cube body with soft rounded corners, subtle crystalline sparkle texture on all visible faces, gentle translucency along the top edges suggesting the sugar crystal material; two small stubby rounded arms resting loosely at the sides of the body; two small stubby rounded feet planted flat on the implied ground plane, toes pointing slightly outward; all limbs are short and chibi-proportioned. Face (front face of the cube): two large glossy black eyes placed in the upper-center of the face, each with a crisp white specular highlight dot, and subtle dark pupils with a faint deep-green iris tint; a small gently curved happy closed smile in a soft warm pink; two round rosy pink cheek blush circles, one on each side of the face. Head accessories: two perky bright green leaf sprouts growing from the top-center of the cube, each leaf is wide, rounded, and slightly curled outward at the tip, standing upright with a natural gentle curve, with a visible central vein and soft gloss on the upper leaf surface. Exact color palette — body: pure sparkly white on all faces (#FFFFFF), with soft white-on-white sparkle highlight dots and a very faint cool blue-white sheen on the side and top faces to give depth; leaves: vivid fresh spring green (#5DBB6D) shading to a lighter lime green at the tip (#8EDA7A), with a dark green vein line; cheek blushes: warm soft rose (#F5A8A8); eyes: deep black pupils, pure white sclera, single bright white specular dot per eye; mouth: warm dusty pink (#D4887A). Lighting: soft three-point studio lighting, warm fill from the left, cooler rim light from behind-right, gentle ambient occlusion in the corners where limbs meet body. Style: smooth cel-shaded 3D render, clean crisp outlines, no hard harsh textures, soft and rounded everywhere, professional chibi game-asset quality. The character occupies approximately 40% of the frame height — intentionally small with generous padding on all sides to leave room for animation movement. The character must be fully visible from the bottom of the feet to the very tips of the leaves, with at least 25% clear empty space above the leaf tips, at least 25% clear empty space below the feet, and at least 20% clear empty space on both the left and right sides. The character is centered both horizontally and vertically in the frame. Square image format. Flat solid bright green background (#00C853) filling the entire image to all edges. No shadow on the ground, no background elements, no text, no watermarks.
- **Pixara Prompt**: Animate this character with a cute looping idle bounce cycle. CRITICAL FRAMING RULE: the entire character — including the leaf sprouts at maximum upward extension — must remain fully visible within the frame at all times. Maintain at least 15% clear empty space on every edge (top, bottom, left, right) throughout every phase of the animation. Scale the motion amplitude down as much as needed to respect this — a small contained bounce is better than clipping. Phase 1 — anticipation: the body gently squishes downward, compressing slightly shorter as the knees bend, the two leaf sprouts on top of the head droop inward slightly, the eyes go wide. Phase 2 — launch: the body lifts gently upward with both feet leaving the surface, rising approximately 8% of the character's body height — a small hop, not a dramatic jump — the body stretches very slightly taller at peak height, the leaf sprouts flare gently outward and upward, the arms lift slightly at the sides, the mouth opens into a big excited grin. Phase 3 — landing: the body falls back down and compresses briefly on impact with a soft squash, the leaf sprouts bounce back upright, the expression settles into a satisfied smile. Phase 4 — left sway: the whole body tilts gently to the left, the left foot lifts slightly, the leaf sprouts tilt left following the body lean, the face shows a playful grin. Phase 5 — right sway: the body tilts to the right mirroring phase 4, the right foot lifts slightly, the leaf sprouts tilt right. Phase 6 — return to neutral: body settles back to upright center, then the cycle loops from phase 1. Total loop duration approximately 1.8 seconds. Motion style: bouncy and springy with light squash-and-stretch on the body, smooth ease-in and ease-out on all movements, no stiffness. The leaf sprouts have secondary motion — they follow the body with a slight delay and overshoot. The character stays centered in frame at all times. Background is a flat solid bright green (#00C853) — it must remain exactly this color, completely uniform, with zero variation, no lighting changes, no gradients, no shadows cast onto it, and no color shift at any point during the animation. Camera locked, no camera movement, no zoom.

---

### 2. Sugar Crash *(special — streak break)*
- **Key**: `crash`
- **Unlock**: Automatically added to deck whenever the streak breaks (accept break *or* fast recovery)
- **Action**: Slumped, dejected character holding head — slow drooping bob
- **Frames**: 3 — sitting upright → slouch → full slump
- **Shiny at**: 14 own-streak days → dusty peach-orange body, lavender-grey dark circles palette swap
- **Palette**: Desaturated grey-blue with dark circles; shiny version dusty peach-orange body, lavender-grey dark circles
- **CSS Filter**: `grayscale(0.85) hue-rotate(195deg) brightness(0.7)` (base); none when shiny
- **Description**: "Even crashes can shine…"
- **Notes**: Multiple copies can accumulate in the deck — one per break event. Each has its own `ownStreak`.
- **Prompt**: A single static image, 153×256 pixels, containing one column and two rows on a flat solid black background (#000000). Cute kawaii 3D cartoon sugar cube character sitting slumped on the ground in a fully dejected pose — body hunched low, head hanging forward, both stub arms drooping limply at sides, eyes nearly closed with dark circles underneath, mouth in a deep downward frown, overall expression of exhausted sadness. Top cell (row 1) — normal palette: desaturated grey-blue sparkly sugar cube body, prominent dark circles under droopy eyes, pale muted downturned mouth, washed-out low-saturation tones throughout. Bottom cell (row 2) — exact same pose and composition, only the colors changed: warm dusty peach-orange sugar cube body, dark circles softened to pale lavender-grey, muted warm taupe tones throughout. Both cells are identical in every way except color palette. Each cell is 153×128 pixels with at least 12 pixels of solid black buffer on all four edges; scale the character down as needed so all elements stay fully within bounds. No text, no labels, no watermarks, no dividers between cells. Character outlines and all line art use a consistent warm dark charcoal (#1A0A00) — apply this exact color to every outline stroke, body edge, limb boundary, feature outline, and accessory border throughout the image. Flat solid black (#000000) fills to all image edges. Soft cel-shaded 3D render, chibi proportions.
- **Process**: `python tools/process_sprite.py --input "Sprite sheets/sugar_crash.png" --key crash --cols 1 --rows 2`

---

### 3. Broccoli Chomper
- **Key**: `broccoli`
- **Unlock**: Day 14
- **Action**: Character eating a giant stalk of broccoli — chomping bite loop
- **Frames**: 3 — hold broccoli up → bite taken → chew (cheek puff)
- **Shiny at**: 28 own-streak days → sky-blue body, purple broccoli palette swap
- **Palette**: Light mint-green body, bright green broccoli; shiny version sky-blue body, deep purple broccoli with indigo florets
- **Description**: "Two strong weeks!"
- **Prompt**: A single static image, 153×256 pixels, containing one column and two rows on a flat solid black background (#000000). Cute kawaii 3D cartoon sugar cube character standing upright, holding a large oversized broccoli stalk vertically in front of the body with both stub arms extended, big happy open-mouthed grin, eyes wide with excitement, rosy pink cheek blushes. Top cell (row 1) — normal palette: light mint-green sparkly sugar cube body, rosy cheeks, bright green broccoli stalk with dark green florets, white sparkle highlights. Bottom cell (row 2) — exact same pose and composition, only the colors changed: soft sky-blue sparkly sugar cube body, broccoli stalk becomes deep purple with indigo florets, rosy pink cheeks unchanged. Both cells are identical in every way except color palette. Each cell is 153×128 pixels with at least 12 pixels of solid black buffer on all four edges; scale the character and broccoli down as needed so all elements — including the full stalk and florets — stay completely within bounds. No text, no labels, no watermarks, no dividers between cells. Character outlines and all line art use a consistent warm dark charcoal (#1A0A00) — apply this exact color to every outline stroke, body edge, limb boundary, feature outline, and accessory border throughout the image. Flat solid black (#000000) fills to all image edges. Soft cel-shaded 3D render, chibi proportions.
- **Process**: `python tools/process_sprite.py --input "Sprite sheets/broccoli_chomper.png" --key broccoli --cols 1 --rows 2`

---

### 4. Jump Rope Champ
- **Key**: `jumprope`
- **Unlock**: Day 7
- **Action**: Full jump-rope spin cycle — character hops over a spinning rope
- **Frames**: 7 — wind-up → jump → peak → land → bounce x2 → reset
- **Shiny at**: 28 own-streak days → lemon-yellow body, forest green outfit, orange rope palette swap
- **Palette**: Athletic red outfit, white shoes, pink jump rope; shiny version lemon-yellow body, forest green outfit, orange rope
- **Description**: "7 days sugar free!"
- **Notes**: Uses a custom sprite strip (`avatar-jumprope.png`) instead of the shared sprite sheet.
- **Prompt**: A single static image, 153×256 pixels, containing one column and two rows on a flat solid black background (#000000). Cute kawaii 3D cartoon sugar cube character wearing a tiny athletic outfit and small sneakers, sparkly sugar cube body, rosy pink cheek blushes, large glossy black eyes, holding a jump rope with one end in each stub hand. The character is shown mid-jump — both feet fully airborne, rope passing under the feet at the bottom of its arc, body at peak height, joyful open-mouth grin, knees slightly tucked. Top cell (row 1) — normal palette: bright red athletic outfit, white sneakers, bright pink jump rope, sparkly white sugar cube body. Bottom cell (row 2) — exact same pose and composition, only the colors changed: pale lemon-yellow sparkly sugar cube body, deep forest green athletic outfit with white trim, white sneakers with green accent stripe, bright orange jump rope. Both cells are identical in every way except color palette. Each cell is 153×128 pixels with at least 12 pixels of solid black buffer on all four edges; scale the character down as needed so all elements — including the jump rope arc — stay completely within bounds. No text, no labels, no watermarks, no dividers between cells. Character outlines and all line art use a consistent warm dark charcoal (#1A0A00) — apply this exact color to every outline stroke, body edge, limb boundary, feature outline, and accessory border throughout the image. Flat solid black (#000000) fills to all image edges. Soft cel-shaded 3D render, chibi proportions.
- **Process**: `python tools/process_sprite.py --input "Sprite sheets/jump_rope_champ.png" --key jumprope --cols 1 --rows 2`

---

### 5. Iron Pumper
- **Key**: `bicep`
- **Unlock**: Day 21
- **Action**: Character doing a single-arm dumbbell curl — smooth up/down arc
- **Frames**: 4 — arm down → halfway up → full curl (flex) → lower
- **Shiny at**: 35 own-streak days → lime-green body, electric purple tank top, chrome dumbbell palette swap
- **Palette**: Blue tank top, grey dumbbell; shiny version lime-green body, electric purple tank top, chrome-silver dumbbell
- **Description**: "Three weeks of strength!"
- **Notes**: New character — sits between Jump Rope (day 7) and Zen Master (day 30) in the milestone ladder.
- **Prompt**: A single static image, 153×256 pixels, containing one column and two rows on a flat solid black background (#000000). Cute kawaii 3D cartoon sugar cube character wearing a sleeveless tank top, rosy pink cheek blushes, large glossy black eyes, holding a small dumbbell in one stub arm. The character is shown in a full bicep curl flex pose — arm raised with dumbbell at shoulder height, bicep visibly flexed, proud open grin with puffed cheeks, free arm resting at side, body slightly puffed up with confidence. Top cell (row 1) — normal palette: sparkly white sugar cube body, blue tank top, grey iron dumbbell. Bottom cell (row 2) — exact same pose and composition, only the colors changed: bright lime-green sparkly sugar cube body, electric purple tank top, chrome-silver dumbbell with a mirror-finish sheen. Both cells are identical in every way except color palette. Each cell is 153×128 pixels with at least 12 pixels of solid black buffer on all four edges; scale the character and dumbbell down as needed so all elements — including the raised arm — stay completely within bounds. No text, no labels, no watermarks, no dividers between cells. Character outlines and all line art use a consistent warm dark charcoal (#1A0A00) — apply this exact color to every outline stroke, body edge, limb boundary, feature outline, and accessory border throughout the image. Flat solid black (#000000) fills to all image edges. Soft cel-shaded 3D render, chibi proportions.
- **Process**: `python tools/process_sprite.py --input "Sprite sheets/iron_pumper.png" --key bicep --cols 1 --rows 2`

---

### 6. Zen Master
- **Key**: `zen`
- **Unlock**: Day 30
- **Action**: Seated lotus meditation — gentle levitation float up/down, aura pulses
- **Frames**: 3 — seated → slight rise → peak hover
- **Shiny at**: 42 own-streak days → mint-green body, rust-orange robe, silver halo palette swap
- **Palette**: Lavender robe, pale violet body, gold halo; shiny version mint-green body, rust-orange robe, silver halo
- **Description**: "A whole month!"
- **Prompt**: A single static image, 153×256 pixels, containing one column and two rows on a flat solid black background (#000000). Cute kawaii 3D cartoon sugar cube character wearing a flowing robe, seated cross-legged and levitating slightly off the ground, eyes gently closed in serene meditation, stub arms folded together in lap, robe hem and fabric billowing softly outward as if floating, a golden halo hovering above the head, soft warm aura glow surrounding the body, blissful serene smile. Top cell (row 1) — normal palette: soft lavender-purple flowing robe, sparkly white sugar cube body with a pale violet tint, warm golden halo ring, gentle golden-white aura glow. Bottom cell (row 2) — exact same pose and composition, only the colors changed: pale mint-green sparkly sugar cube body, deep rust-orange flowing robe, silver halo ring, same aura glow. Both cells are identical in every way except color palette. Each cell is 153×128 pixels with at least 12 pixels of solid black buffer on all four edges; scale the character down as needed so all elements — including the halo above the head and robe hem below — stay completely within bounds. No text, no labels, no watermarks, no dividers between cells. Character outlines and all line art use a consistent warm dark charcoal (#1A0A00) — apply this exact color to every outline stroke, body edge, limb boundary, feature outline, and accessory border throughout the image. Flat solid black (#000000) fills to all image edges. Soft cel-shaded 3D render, chibi proportions.
- **Process**: `python tools/process_sprite.py --input "Sprite sheets/zen_master.png" --key zen --cols 1 --rows 2`

---

### 7. Trail Runner
- **Key**: `runner`
- **Unlock**: Day 60
- **Action**: Side-scrolling run cycle on a looping treadmill/path
- **Frames**: 6 — stride left foot → mid-air → stride right foot → mid-air → lean forward → reset
- **Shiny at**: 50 own-streak days → lemon-yellow body, deep navy jacket, red sneakers palette swap
- **Palette**: Mint green running jacket, white sneakers; shiny version lemon-yellow body, deep navy jacket, bright red sneakers
- **Description**: "Two months, full stride!"
- **Notes**: New character — fills the gap between Zen Master (day 30) and Bookworm (day 100).
- **Prompt**: A single static image, 153×256 pixels, containing one column and two rows on a flat solid black background (#000000). Cute kawaii 3D cartoon sugar cube character wearing a running jacket and sneakers, sparkly sugar cube body, rosy pink cheek blushes, large glossy black eyes. The character faces right and is shown mid-stride — both feet fully off the ground in a flying leap, body angled forward at maximum lean, arms spread and pumping, mouth open in a determined grin, full commitment to the run. Top cell (row 1) — normal palette: mint-green running jacket, white sneakers with grey soles, sparkly white sugar cube body. Bottom cell (row 2) — exact same pose and composition, only the colors changed: soft lemon-yellow sparkly sugar cube body, deep navy running jacket with white trim, bright red sneakers with white soles. Both cells are identical in every way except color palette. Each cell is 153×128 pixels with at least 12 pixels of solid black buffer on all four edges; scale the character down as needed so all elements — including extended arms and raised legs — stay completely within bounds. No text, no labels, no watermarks, no dividers between cells. Character outlines and all line art use a consistent warm dark charcoal (#1A0A00) — apply this exact color to every outline stroke, body edge, limb boundary, feature outline, and accessory border throughout the image. Flat solid black (#000000) fills to all image edges. Soft cel-shaded 3D render, chibi proportions.
- **Process**: `python tools/process_sprite.py --input "Sprite sheets/trail_runner.png" --key runner --cols 1 --rows 2`

---

### 8. Bookworm
- **Key**: `bookworm`
- **Unlock**: Day 100
- **Action**: Character sitting cross-legged, turning pages of a glowing book
- **Frames**: 3 — reading → page turn → slight lean-in (excited)
- **Shiny at**: 60 own-streak days → lilac body, forest green overalls, crimson book palette swap
- **Palette**: Orange overalls, round glasses, teal book; shiny version lilac body, forest green overalls, crimson book
- **Description**: "100 days — incredible!"
- **Prompt**: A single static image, 153×256 pixels, containing one column and two rows on a flat solid black background (#000000). Cute kawaii 3D cartoon sugar cube character wearing overalls and small round glasses perched on the front face, rosy pink cheek blushes. The character sits cross-legged on the ground, leaning forward excitedly toward an oversized open hardcover book held in both stub arms — eyes wide and sparkling, mouth in a huge delighted grin, book glowing brightly with warm light from the pages illuminating the face from below. Top cell (row 1) — normal palette: bright orange overalls, thin-framed round circular glasses, teal blue hardcover book with warm golden page glow, sparkly white sugar cube body. Bottom cell (row 2) — exact same pose and composition, only the colors changed: soft lilac sparkly sugar cube body, deep forest green overalls with small white button accents, crimson red hardcover book with warm cream page glow, same round glasses. Both cells are identical in every way except color palette. Each cell is 153×128 pixels with at least 12 pixels of solid black buffer on all four edges; scale the character and book down as needed so all elements stay completely within bounds. No text, no labels, no watermarks, no dividers between cells. Character outlines and all line art use a consistent warm dark charcoal (#1A0A00) — apply this exact color to every outline stroke, body edge, limb boundary, feature outline, and accessory border throughout the image. Flat solid black (#000000) fills to all image edges. Soft cel-shaded 3D render, chibi proportions.
- **Process**: `python tools/process_sprite.py --input "Sprite sheets/bookworm.png" --key bookworm --cols 1 --rows 2`

---

### 9. Dance Machine
- **Key**: `dancer`
- **Unlock**: Day 180
- **Action**: Energetic 4-beat dance move — arms and hips in sync
- **Frames**: 8 — neutral → arms out → hip left → dip → hip right → spin → land → reset
- **Shiny at**: 75 own-streak days → sky-blue body, deep violet outfit palette swap
- **Palette**: Bright yellow outfit, star accessories; shiny version sky-blue body, deep violet outfit with white star accessories
- **Description**: "Six months of moves!"
- **Notes**: New character — fills the gap between Bookworm (day 100) and Year Legend (day 365).
- **Prompt**: A single static image, 153×256 pixels, containing one column and two rows on a flat solid black background (#000000). Cute kawaii 3D cartoon sugar cube character wearing a disco outfit with star-shaped accessories, sparkly sugar cube body, rosy pink cheek blushes, large glossy black eyes. The character is shown mid-dance — both stub arms flung out wide to the sides at shoulder height, knees slightly bent in a groove, enormous joyful open-mouth grin, body full of energy and attitude. Top cell (row 1) — normal palette: bright yellow disco outfit with small yellow star accessories, sparkly white sugar cube body. Bottom cell (row 2) — exact same pose and composition, only the colors changed: pale sky-blue sparkly sugar cube body, deep violet disco outfit with white star accessories. Both cells are identical in every way except color palette. Each cell is 153×128 pixels with at least 12 pixels of solid black buffer on all four edges; scale the character down as needed so all elements — including fully outstretched arms — stay completely within bounds. No text, no labels, no watermarks, no dividers between cells. Character outlines and all line art use a consistent warm dark charcoal (#1A0A00) — apply this exact color to every outline stroke, body edge, limb boundary, feature outline, and accessory border throughout the image. Flat solid black (#000000) fills to all image edges. Soft cel-shaded 3D render, chibi proportions.
- **Process**: `python tools/process_sprite.py --input "Sprite sheets/dance_machine.png" --key dancer --cols 1 --rows 2`

---

### 10. Year Legend
- **Key**: `legend`
- **Unlock**: Day 365
- **Action**: Victory pose with cape — cape billows, small crown floats above head
- **Frames**: 3 — stand tall → cape billow wide → cape settle + crown bounce
- **Shiny at**: 100 own-streak days → cream-ivory body, forest green cape, rose gold crown palette swap
- **Palette**: Deep navy cape, gold crown, glowing white core; shiny version cream-ivory body, forest green cape, rose gold crown
- **Description**: "A full year. Legendary!"
- **Prompt**: A single static image, 153×256 pixels, containing one column and two rows on a flat solid black background (#000000). Cute kawaii 3D cartoon sugar cube character wearing a flowing cape that billows dramatically open in a sweeping arc as if caught by a sudden wind, a small ornate crown floating just above the head, sparkly glowing sugar cube body, rosy pink cheek blushes, large glossy black eyes. The character stands in a heroic power stance — chin raised with a wide triumphant confident smile, arms subtly raised outward, cape spread wide, crown hovering above. Top cell (row 1) — normal palette: deep navy blue flowing cape with a slight sheen, small ornate gold crown, bright glowing white sugar cube body. Bottom cell (row 2) — exact same pose and composition, only the colors changed: warm cream-ivory sparkly sugar cube body, deep forest green flowing cape with subtle sheen, rose gold crown floating above. Both cells are identical in every way except color palette. Each cell is 153×128 pixels with at least 12 pixels of solid black buffer on all four edges; scale the character down as needed so all elements — including the full span of the billowing cape and the floating crown above — stay completely within bounds. No text, no labels, no watermarks, no dividers between cells. Character outlines and all line art use a consistent warm dark charcoal (#1A0A00) — apply this exact color to every outline stroke, body edge, limb boundary, feature outline, and accessory border throughout the image. Flat solid black (#000000) fills to all image edges. Soft cel-shaded 3D render, chibi proportions.
- **Process**: `python tools/process_sprite.py --input "Sprite sheets/year_legend.png" --key legend --cols 1 --rows 2`

---

## Summary Table

| # | Key | Name | Unlock Day | Action | Frames | Shiny At |
|---|---|---|---|---|---|---|
| 1 | `sprout` | Sugar Sprout | Day 1 *(default)* | Bouncing seedling | 6 | 7 days |
| 2 | `crash` | Sugar Crash | Streak break *(special)* | Dejected slump | 3 | 14 days |
| 3 | `jumprope` | Jump Rope Champ | Day 7 | Jump rope cycle | 7 | 28 days |
| 4 | `broccoli` | Broccoli Chomper | Day 14 | Chomping broccoli | 3 | 28 days |
| 5 | `bicep` | Iron Pumper | Day 21 | Dumbbell curl | 4 | 35 days |
| 6 | `zen` | Zen Master | Day 30 | Floating meditation | 3 | 42 days |
| 7 | `runner` | Trail Runner | Day 60 | Run cycle | 6 | 50 days |
| 8 | `bookworm` | Bookworm | Day 100 | Page turning | 3 | 60 days |
| 9 | `dancer` | Dance Machine | Day 180 | 4-beat dance | 8 | 75 days |
| 10 | `legend` | Year Legend | Day 365 | Victory cape pose | 3 | 100 days |

---

## Shiny Upgrade Rules

- **Own-streak** is independent of the user's main streak — it counts check-ins since the character was added to the deck.
- Reaching `shinyAt` days permanently locks in Shiny status (`isShiny: true`) — it cannot be lost.
- Non-shiny characters have their `ownStreak` **reset to 0** when the user's streak breaks.
- Shiny characters are immune to reset and display a ✨ suffix and gold drop-shadow.

---

## Animation Technical Notes

- All animations use a **CSS sprite-strip step** approach via `background-position` keyframes.
- Frame width: **153 px**, frame height: **128 px** (content) + 25 px label row = **154 px row height**.
- Sprite sheet columns per group: **3 frames × 153 px = 459 px** (rounded to `groupW: 458`).
- Custom strip characters (e.g. `jumprope`, `dancer`) use their own image file with width = `frameW × frames`.
- Animation speed range: `0.65s` (Year Legend — fast, energetic) to `2.5s` (Sugar Crash — slow, sad).
