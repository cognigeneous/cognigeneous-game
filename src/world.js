// Seeded asteroid cross-section. Same seed, same map.
import {
  BASE_X0,
  BASE_X1,
  BASE_Y0,
  BASE_Y1,
  MAP_H,
  MAP_SEED,
  MAP_W,
  PAD_X0,
  PAD_X1,
  SURFACE_ROW,
  TILE,
  PLAYER_H,
} from "./config.js";
import { ELEMENTS } from "./data/elements.js";

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTile(t, el = null) {
  return { t, el };
}

export function maxDepth() {
  return MAP_H - SURFACE_ROW - 2;
}

function rollOre(depth, rng) {
  let roll = rng();
  for (let i = 0; i < ELEMENTS.length; i++) {
    const el = ELEMENTS[i];
    if (depth < el.depthMin || depth > el.depthMax) continue;
    roll -= el.chance;
    if (roll < 0) return el;
  }
  return null;
}

function hardChance(depth) {
  if (depth < 8) return 0.04;
  if (depth < 24) return 0.16;
  if (depth < 45) return 0.3;
  return 0.42;
}

function terrainAt(x, y, rng) {
  if (x === 0 || x === MAP_W - 1 || y === MAP_H - 1) return makeTile("bedrock");

  const inBase =
    x >= BASE_X0 && x < BASE_X1 && y >= BASE_Y0 && y < BASE_Y1;
  if (inBase) return makeTile("base");

  if (y < SURFACE_ROW) return makeTile("empty");
  if (y === SURFACE_ROW && x >= PAD_X0 && x < PAD_X1) return makeTile("pad");

  const depth = y - SURFACE_ROW;
  if (depth <= 0) return makeTile("dirt");

  const ore = rollOre(depth, rng);
  if (ore) return makeTile("ore", ore.symbol);
  if (rng() < hardChance(depth)) return makeTile("hard");
  return makeTile("dirt");
}

function elementInBand(symbol, depth) {
  for (let i = 0; i < ELEMENTS.length; i++) {
    const el = ELEMENTS[i];
    if (el.symbol !== symbol) continue;
    return depth >= el.depthMin && depth <= el.depthMax;
  }
  return false;
}

function spreadDeposits(tiles, rng) {
  for (let y = SURFACE_ROW + 1; y < MAP_H - 1; y++) {
    for (let x = 1; x < MAP_W - 2; x++) {
      const cell = tiles[y][x];
      if (cell.t !== "ore") continue;
      if (rng() > 0.4) continue;
      const depth = y + 1 - SURFACE_ROW;
      const neighbor = tiles[y + 1][x];
      if (!neighbor || neighbor.t !== "dirt") continue;
      if (!elementInBand(cell.el, depth)) continue;
      neighbor.t = "ore";
      neighbor.el = cell.el;
    }
  }
}

function placeVeins(tiles) {
  const limit = maxDepth();
  for (let i = 0; i < ELEMENTS.length; i++) {
    const el = ELEMENTS[i];
    const span = Math.max(1, el.depthMax - el.depthMin);
    let depth = el.depthMin + Math.floor(span / 2);
    if (depth < 1) depth = 1;
    if (depth > limit) depth = limit;
    const y = SURFACE_ROW + depth;
    const x0 = 2 + ((i * 4) % (MAP_W - 6));
    for (let k = 0; k < 3; k++) {
      const cell = tiles[y][x0 + k];
      if (!cell) continue;
      if (cell.t === "dirt" || cell.t === "hard" || cell.t === "ore") {
        cell.t = "ore";
        cell.el = el.symbol;
      }
    }
  }
}

export function generateWorld(seed = MAP_SEED) {
  const rng = mulberry32(seed);
  const tiles = [];
  for (let y = 0; y < MAP_H; y++) {
    const row = [];
    for (let x = 0; x < MAP_W; x++) row.push(terrainAt(x, y, rng));
    tiles.push(row);
  }
  spreadDeposits(tiles, rng);
  placeVeins(tiles);
  return { tiles, seed, w: MAP_W, h: MAP_H };
}

export function getTile(world, x, y) {
  if (x < 0 || y < 0 || x >= world.w || y >= world.h) return null;
  return world.tiles[y][x];
}

export function isSolid(tile) {
  return !!tile && tile.t !== "empty";
}

export function isDiggable(tile) {
  return !!tile && (tile.t === "dirt" || tile.t === "hard" || tile.t === "ore");
}

/** Pod starts on the right end of the pad, one step from diggable rock. */
export function spawnPlayer() {
  const tx = PAD_X1 - 1;
  return {
    x: (tx + 0.5) * TILE,
    y: SURFACE_ROW * TILE - PLAYER_H / 2,
    vx: 0,
    vy: 0,
    hw: 11,
    hh: PLAYER_H / 2,
  };
}
