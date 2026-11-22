# cognigeneous-game

A keyboard mining game for high school chemistry. You pilot a drill pod down through a small asteroid, pick up element ores, and bring them back to the surface base.

The on-screen title is the `GAME_TITLE` constant in `src/config.js`. It is a working title; the final name is not decided.

Ore identity lives in `src/data/elements.js`, so that list can be reviewed on its own. The base market sells a haul for credits and sells a bigger fuel cell, more base storage, and a faster solar rate. An ionic-compound bench and a codex are not in this version.

## How to play

Arrow keys or W A S D. The same keys do both jobs. The sidebar keeps a two-line reminder of them:

- In open space the pod drives and flies freely. It is not locked to the grid.
- Left, right, or down, held against rock while the pod is on the ground, digs exactly one cell: the cell in that direction from the block the pod overlaps most. The pod slides into line with that cell and sits in its center when the bite finishes. Hard rock (diagonal stripes) takes longer. One bite never clears two cells. Left and right do not dig in the air, and they never dig while Up is held.
- Up thrusts. Climbing is quick. Falling is slow. The pod cannot dig upward.
- Sitting still and falling do not use fuel. Thrusters, sideways driving, and digging do. Plain gray rock uses a tenth of the usual dig fuel.
- Ore starts unidentified: a color, a shape that is different for each element, and a question mark. The first time you dig an element, it is identified and every cell of that element shows its symbol. Each ore block is 1 mol and adds that element's mass to a 1000 g hold. An ore that would not fit does not start the drill. Gray rock still digs; it becomes silicate, not cargo.
- The green PAD charges the pod from the base energy store. Solar panels refill that store at half a unit per second until you upgrade them. If the store is empty, the panels have to recharge it before the pod can fill up. Ore stays in the hold until you sell it.
- On the pad, press M or Enter to open the base market. Up and Down, or W and S, move through the list. Enter sells or buys. Esc closes the market. Sell silicate blocks and ore for credits, then buy a larger pod fuel cell, more base storage, or a faster solar rate. Each upgrade has three levels.
- Each plain gray block adds a little silicate matter on the pod. It does not take a cargo slot. The pad banks it. Every full 1.00 becomes one silicate block kept at the base. Sell those blocks at the market.
- Credits, silicate blocks, the silicate remainder, discoveries, upgrades, and base energy are saved in this browser when you dock and when the market closes. New game, inside the market, clears that save after a confirm step.
- At 0 fuel away from the pad, the pod is stranded. Press R to start another dive. R keeps credits, discoveries, and upgrades.
- The map is built from a fixed seed. Reloading restores the save and rebuilds that same asteroid. Ore left in the hold is not saved, so sell before you leave.

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
- `src/market.js` — selling, upgrades, and the saved game
- `src/draw.js` — canvas drawing
- `CREDITS.md` — palette credit and asset notes

## Accessibility

Play is keyboard-only, including the market. HUD text and market rows are drawn at 20px or larger. The selected market row says Selected and sits on a yellow bar. Dirt, hard rock, bedrock, the pad, and each unidentified ore use a different pattern, not color alone. Accent colors are the Okabe–Ito set. A live region repeats discoveries, cargo, the market row, depth, fuel warnings, and the stranded state.
