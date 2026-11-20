// Startup, frame loop, and the screen-reader mirror of the HUD.
import { GAME_TITLE, MAX_FUEL } from "./config.js";
import { listHeld } from "./data/elements.js";
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
  "Land on the pad to refuel and unload cargo. Press R to restart.";

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

function countKey(counts) {
  return listHeld(counts)
    .map(function (row) {
      return row.symbol + " " + row.count;
    })
    .join(", ");
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
  bucket: -1,
  depthBand: -1,
};

function say(text) {
  live.textContent = text;
}

function syncA11y(state) {
  const cargo = countKey(state.cargo);
  const delivered = countKey(state.delivered);
  const bucket = fuelBucket(state.fuel);
  const depthBand = Math.floor(state.depth / 5);
  const fuelLabel = state.fuel <= 0 ? 0 : Math.ceil(state.fuel - 1e-6);

  if (state.runId !== seen.runId) {
    const restarted = seen.runId !== 0;
    seen.runId = state.runId;
    seen.status = state.status;
    seen.cargo = cargo;
    seen.delivered = delivered;
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
