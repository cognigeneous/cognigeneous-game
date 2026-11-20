# cognigeneous-game

A keyboard mining game for high school chemistry. You pilot a drill pod down through a small asteroid, pick up element ores, and bring them back to the surface base.

The on-screen title is the `GAME_TITLE` constant in `src/config.js`. It is a working title; the final name is not decided.

This is the dig loop only. A shop, saves, an ionic-compound bench, and a codex are not in this version. Ore identity lives in `src/data/elements.js` so that list can be reviewed on its own, and so those later pieces can import it instead of growing a second list. Landing on the pad banks cargo into a delivered tally, which is the stand-in for selling.

## How to play

Arrow keys or W A S D. The same keys do both jobs:

- Left and right move the pod. If rock is in the way, the pod digs sideways.
- Down digs. Hold it; a tile breaks after a short bite. Hard rock (diagonal stripes) takes longer.
- Up thrusts. The pod cannot dig upward. Gravity pulls it down. Letting go of Up drops you.
- Sitting still and falling do not use fuel. Thrusters, sideways driving, and digging do.
- Ore tiles show the element symbol, so you do not have to read the color. The hold has 8 slots. Land on the green PAD to refuel for free and move the hold into Delivered.
- At 0 fuel away from the pad, the pod is stranded. Press R to restart the same map.

The map is built from a fixed seed, so a reload is the same asteroid.

## Run locally

There is no build step and the game makes no network requests. ES modules need a static file server; opening the HTML file directly often fails, especially in Safari.

From this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Any other static server is fine.

GitHub Pages can host the main branch from the repository root. Paths in the page are relative.

## Project structure

- `index.html` — page and canvas
- `src/main.js` — resize, frame loop, screen-reader updates
- `src/config.js` — working title, map size, and feel tuning
- `src/data/elements.js` — element symbol, US name, and depth band
- `src/world.js` — seeded map
- `src/game.js` — pod, fuel, cargo, and the base pad
- `src/draw.js` — canvas drawing
- `CREDITS.md` — palette credit and asset notes

## Accessibility

Play is keyboard-only. HUD and tile symbols are drawn at 16px or larger. Dirt, hard rock, bedrock, and the pad use different patterns, not color alone. Accent colors are the Okabe–Ito set. A live region repeats cargo, depth, fuel warnings, and the stranded state.
