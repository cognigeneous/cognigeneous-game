// Startup, frame loop, and the screen-reader mirror of the HUD.
import { GAME_TITLE, MAX_FUEL } from "./config.js";
import { ELEMENTS, elementBySymbol, holdMass, listHeld } from "./data/elements.js";
import { createGame } from "./game.js";
import { draw } from "./draw.js";

const canvas = document.getElementById("game");
const live = document.getElementById("live");
const ctx = canvas.getContext("2d");

document.title = GAME_TITLE;
canvas.setAttribute("aria-label", GAME_TITLE);

const game = createGame();

const intro =
  GAME_TITLE +
  ". Arrow keys or W A S D. Up thrusts. Left and right move and dig. Down digs. Up does not dig. " +
  "Unknown ore shows a question mark until you dig it. Land on the pad to refuel and unload. Press R to restart.";

let cssW = 1;
let cssH = 1;
let dpr = 1;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cssW = Math.max(1, window.innerWidth);
  cssH = Math.max(1, window.innerHeight);
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
}

window.addEventListener("resize", resize);
resize();

function countKey(counts, discovered) {
  return listHeld(counts)
    .map(function (row) {
      if (discovered && discovered[row.symbol]) {
        const grams = Math.round(row.count * row.molarMass * 100) / 100;
        return row.symbol + " " + row.count + " mol " + grams.toFixed(2) + " g";
      }
      return "? " + row.count + " mol";
    })
    .join(", ");
}

function knownKey(discovered) {
  let key = "";
  for (let i = 0; i < ELEMENTS.length; i++) {
    if (discovered[ELEMENTS[i].symbol]) key += ELEMENTS[i].symbol + ",";
  }
  return key;
}

function fuelBucket(fuel) {
  if (fuel <= 0) return 0;
  if (fuel <= 25) return 25;
  if (fuel <= 50) return 50;
  if (fuel <= 75) return 75;
  return 100;
}

const seen = {
  runId: 0,
  status: "",
  cargo: "",
  delivered: "",
  known: "",
  bucket: -1,
  depthBand: -1,
};

function say(text) {
  live.textContent = text;
}

function syncA11y(state) {
  const cargo = countKey(state.cargo, state.discovered);
  const delivered = countKey(state.delivered, state.discovered);
  const known = knownKey(state.discovered || {});
  const bucket = fuelBucket(state.fuel);
  const depthBand = Math.floor(state.depth / 5);
  const fuelLabel = state.fuel <= 0 ? 0 : Math.ceil(state.fuel - 1e-6);

  if (state.runId !== seen.runId) {
    const restarted = seen.runId !== 0;
    seen.runId = state.runId;
    seen.status = state.status;
    seen.cargo = cargo;
    seen.delivered = delivered;
    seen.known = known;
    seen.bucket = bucket;
    seen.depthBand = depthBand;
    say(
      restarted
        ? "Run restarted. Fuel full. Hold empty. Delivered none."
        : intro
    );
    return;
  }

  const bits = [];
  if (state.status === "stranded" && seen.status !== "stranded") {
    bits.push("Stranded. The pod is out of fuel. Press R to restart.");
  }
  if (known !== seen.known) {
    for (let i = 0; i < ELEMENTS.length; i++) {
      const symbol = ELEMENTS[i].symbol;
      const was = seen.known.indexOf(symbol + ",") !== -1;
      if (!was && state.discovered[symbol]) {
        const info = elementBySymbol(symbol);
        bits.push("Element identified: " + info.name + " (" + info.symbol + ").");
      }
    }
  }
  if (cargo !== seen.cargo) {
    bits.push("Hold: " + (cargo || "empty") + ".");
  }
  if (delivered !== seen.delivered) {
    bits.push("Delivered: " + (delivered || "none") + ". Tanks refilled.");
  }
  if (bucket !== seen.bucket && state.status === "playing") {
    bits.push("Fuel " + fuelLabel + " of " + MAX_FUEL + ". Depth " + state.depth + " meters.");
  } else if (depthBand !== seen.depthBand && state.status === "playing") {
    bits.push("Depth " + state.depth + " meters.");
  }

  seen.status = state.status;
  seen.cargo = cargo;
  seen.delivered = delivered;
  seen.known = known;
  seen.bucket = bucket;
  seen.depthBand = depthBand;
  if (bits.length) say(bits.join(" "));
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  syncA11y(game.state);
  draw(ctx, cssW, cssH, dpr, game.state);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
