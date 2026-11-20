// Pod movement, digging, fuel, and the surface pad.
import {
  CARGO_MAX,
  DIG_BURN,
  DIG_TIME,
  DOWN_BOOST,
  GRAVITY,
  MAX_FALL,
  MAX_FUEL,
  MAX_RISE,
  MAX_RUN,
  MOVE_ACCEL,
  MOVE_BURN,
  AIR_DRAG,
  GROUND_DRAG,
  SURFACE_ROW,
  THRUST,
  THRUST_BURN,
  TILE,
} from "./config.js";
import { elementBySymbol, ELEMENTS, totalCount } from "./data/elements.js";
import {
  generateWorld,
  getTile,
  isDiggable,
  isSolid,
  spawnPlayer,
} from "./world.js";

let runSeq = 0;

export function newRun() {
  runSeq += 1;
  return {
    runId: runSeq,
    world: generateWorld(),
    player: spawnPlayer(),
    fuel: MAX_FUEL,
    maxFuel: MAX_FUEL,
    cargo: {},
    cargoMax: CARGO_MAX,
    delivered: {},
    status: "playing",
    depth: 0,
    time: 0,
    facing: 1,
    drill: "down",
    thrusting: false,
    onGround: true,
    wasDocked: true,
    dig: null,
    message: "Step right onto the gray rock. Hold Down or S to dig.",
    messageT: 4.2,
    particles: [],
    moteAcc: 0,
  };
}

function clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function allowsExtraMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function overlappingSolids(state, box) {
  const x0 = Math.floor((box.x - box.hw) / TILE);
  const x1 = Math.floor((box.x + box.hw - 0.01) / TILE);
  const y0 = Math.floor((box.y - box.hh) / TILE);
  const y1 = Math.floor((box.y + box.hh - 0.01) / TILE);
  const hits = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const tile = getTile(state.world, tx, ty);
      if (isSolid(tile)) hits.push({ tx, ty, tile });
    }
  }
  return hits;
}

// Push the pod out of any solid along the shallowest overlap,
// so a corner or a clipped wall slides aside instead of jamming.
function separate(state) {
  const p = state.player;
  let landed = false;
  let hitCeiling = false;
  for (let pass = 0; pass < 4; pass++) {
    const hits = overlappingSolids(state, p);
    if (!hits.length) break;
    for (let i = 0; i < hits.length; i++) {
      const left = hits[i].tx * TILE;
      const top = hits[i].ty * TILE;
      const penLeft = p.x + p.hw - left;
      const penRight = left + TILE - (p.x - p.hw);
      const penTop = p.y + p.hh - top;
      const penBottom = top + TILE - (p.y - p.hh);
      if (penLeft <= 0 || penRight <= 0 || penTop <= 0 || penBottom <= 0) continue;
      const px = Math.min(penLeft, penRight);
      const py = Math.min(penTop, penBottom);
      if (px < py) {
        p.x += penLeft < penRight ? -penLeft : penRight;
      } else if (penTop < penBottom) {
        p.y -= penTop;
        landed = true;
      } else {
        p.y += penBottom;
        hitCeiling = true;
      }
    }
  }
  if (landed && p.vy > 0) {
    p.vy = 0;
    state.onGround = true;
  }
  if (hitCeiling && p.vy < 0) p.vy = 0;
}

function moveX(state, dx) {
  const p = state.player;
  if (dx === 0) return;
  const before = p.x;
  p.x += dx;
  separate(state);
  if (dx > 0 && p.x < before + dx - 0.01) p.vx = Math.min(0, p.vx);
  if (dx < 0 && p.x > before + dx + 0.01) p.vx = Math.max(0, p.vx);
}

function moveY(state, dy) {
  if (dy === 0) return;
  state.player.y += dy;
  separate(state);
}

function feetOnSolid(state) {
  const p = state.player;
  const y = p.y + p.hh + 1;
  const xs = [p.x - p.hw + 4, p.x + p.hw - 4];
  for (let i = 0; i < xs.length; i++) {
    const tile = getTile(state.world, Math.floor(xs[i] / TILE), Math.floor(y / TILE));
    if (isSolid(tile)) return true;
  }
  return false;
}

function tileUnderCenter(state) {
  const p = state.player;
  const x = Math.floor(p.x / TILE);
  const y = Math.floor((p.y + p.hh + 1) / TILE);
  return getTile(state.world, x, y);
}

function isDocked(state) {
  if (!state.onGround) return false;
  const under = tileUnderCenter(state);
  return !!under && under.t === "pad";
}

/**
 * Nearest solid tile the pod is pressing into.
 * dir is "left", "right", or "down". Up is never returned.
 */
function findContact(state, dir) {
  const p = state.player;
  const x0 = Math.floor((p.x - p.hw) / TILE) - 1;
  const x1 = Math.floor((p.x + p.hw) / TILE) + 1;
  const y0 = Math.floor((p.y - p.hh) / TILE) - 1;
  const y1 = Math.floor((p.y + p.hh) / TILE) + 1;
  let best = null;
  let bestScore = Infinity;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const tile = getTile(state.world, tx, ty);
      if (!isSolid(tile)) continue;
      const left = tx * TILE;
      const top = ty * TILE;
      const right = left + TILE;
      const bottom = top + TILE;
      let dist = Infinity;
      if (dir === "left") dist = p.x - p.hw - right;
      else if (dir === "right") dist = left - (p.x + p.hw);
      else if (dir === "down") dist = top - (p.y + p.hh);
      else continue;
      if (dist > 4) continue;
      if (dir === "left" && right > p.x) continue;
      if (dir === "right" && left < p.x) continue;
      if (dir === "down" && top + 2 < p.y + p.hh) continue;
      if (dir === "down") {
        if (right < p.x - p.hw + 2 || left > p.x + p.hw - 2) continue;
      } else if (bottom < p.y - p.hh + 2 || top > p.y + p.hh - 2) {
        continue;
      }
      // Prefer a tile you can dig, then the one closest to the pod's center.
      const mid = dir === "down" ? (left + right) / 2 : (top + bottom) / 2;
      const along = dir === "down" ? p.x : p.y;
      const score = (isDiggable(tile) ? 0 : 100) + dist + Math.abs(mid - along) * 0.02;
      if (score < bestScore) {
        bestScore = score;
        best = { dir, tx, ty, tile, dist };
      }
    }
  }
  return best;
}

function pickDig(state, keys) {
  if (keys.left && !keys.right) {
    const hit = findContact(state, "left");
    if (hit && isDiggable(hit.tile)) return hit;
  }
  if (keys.right && !keys.left) {
    const hit = findContact(state, "right");
    if (hit && isDiggable(hit.tile)) return hit;
  }
  if (keys.down) {
    const hit = findContact(state, "down");
    if (hit && isDiggable(hit.tile)) return hit;
  }
  return null;
}

function blockedHint(state, keys) {
  let dir = null;
  if (keys.down) dir = "down";
  else if (keys.left && !keys.right) dir = "left";
  else if (keys.right && !keys.left) dir = "right";
  if (!dir) return;
  const hit = findContact(state, dir);
  if (!hit || isDiggable(hit.tile)) return;
  if (hit.tile.t === "bedrock") {
    state.message = "Bedrock cannot be dug.";
    state.messageT = Math.max(state.messageT, 0.45);
    return;
  }
  if (hit.tile.t === "pad" || hit.tile.t === "base") {
    state.message = "The base cannot be dug. Dig the gray rock.";
    state.messageT = Math.max(state.messageT, 0.45);
  }
}

function spray(state, tx, ty, kind, el, count, speed) {
  if (!allowsExtraMotion()) return;
  const cx = (tx + 0.5) * TILE;
  const cy = (ty + 0.5) * TILE;
  for (let i = 0; i < count; i++) {
    if (state.particles.length >= 48) return;
    const angle = Math.random() * Math.PI * 2;
    const vel = speed * (0.35 + Math.random());
    state.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * vel,
      vy: Math.sin(angle) * vel - 30,
      ttl: 0.28 + Math.random() * 0.18,
      max: 0.46,
      kind,
      el,
    });
  }
}

function applyDig(state, target, dt) {
  const tile = getTile(state.world, target.tx, target.ty);
  if (!tile || !isDiggable(tile)) {
    state.dig = null;
    return false;
  }
  if (tile.t === "ore" && totalCount(state.cargo) >= state.cargoMax) {
    state.message = "Cargo full. Return to the PAD.";
    state.messageT = Math.max(state.messageT, 0.45);
    return false;
  }
  if (!state.dig || state.dig.tx !== target.tx || state.dig.ty !== target.ty) {
    state.dig = { tx: target.tx, ty: target.ty, p: 0 };
  }
  state.dig.p += dt / (DIG_TIME[tile.t] || 0.2);
  state.moteAcc += dt;
  if (state.moteAcc >= 0.06) {
    state.moteAcc = 0;
    spray(state, target.tx, target.ty, tile.t, tile.el, 1, 36);
  }
  if (state.dig.p < 1) return true;

  if (tile.t === "ore") {
    const info = elementBySymbol(tile.el);
    state.cargo[tile.el] = (state.cargo[tile.el] || 0) + 1;
    state.message = info
      ? "Collected " + info.name + " (" + info.symbol + ")"
      : "Collected " + tile.el;
    state.messageT = 1.15;
  }
  spray(state, target.tx, target.ty, tile.t, tile.el, 8, 90);
  tile.t = "empty";
  tile.el = null;
  state.dig = null;
  return true;
}

function bankCargo(state) {
  let n = 0;
  for (let i = 0; i < ELEMENTS.length; i++) {
    const symbol = ELEMENTS[i].symbol;
    const count = state.cargo[symbol] || 0;
    if (!count) continue;
    state.delivered[symbol] = (state.delivered[symbol] || 0) + count;
    n += count;
  }
  if (n > 0) state.cargo = {};
  return n;
}

function updateParticles(state, dt) {
  const next = [];
  for (let i = 0; i < state.particles.length; i++) {
    const mote = state.particles[i];
    mote.ttl -= dt;
    if (mote.ttl <= 0) continue;
    mote.vy += 700 * dt;
    mote.x += mote.vx * dt;
    mote.y += mote.vy * dt;
    next.push(mote);
  }
  state.particles = next;
}

export function step(state, keys, dt) {
  if (state.status !== "playing") return;
  state.time += dt;
  const p = state.player;

  if (keys.left && !keys.right) {
    p.vx -= MOVE_ACCEL * dt;
    state.facing = -1;
    state.drill = "left";
  } else if (keys.right && !keys.left) {
    p.vx += MOVE_ACCEL * dt;
    state.facing = 1;
    state.drill = "right";
  } else {
    const drag = state.onGround ? GROUND_DRAG : AIR_DRAG;
    p.vx *= Math.exp(-drag * dt);
    if (Math.abs(p.vx) < 8) p.vx = 0;
  }
  p.vx = clamp(p.vx, -MAX_RUN, MAX_RUN);

  state.onGround = feetOnSolid(state);
  state.thrusting = !!keys.up;
  if (state.onGround && !keys.up) {
    p.vy = 0;
  } else {
    let ay = GRAVITY;
    if (keys.down) ay += DOWN_BOOST;
    if (keys.up) ay -= THRUST;
    p.vy = clamp(p.vy + ay * dt, -MAX_RISE, MAX_FALL);
  }

  const target = pickDig(state, keys);
  let digging = false;
  if (target) {
    state.drill = target.dir === "down" ? "down" : target.dir;
    digging = applyDig(state, target, dt);
  } else {
    state.dig = null;
    blockedHint(state, keys);
  }

  moveX(state, p.vx * dt);
  moveY(state, p.vy * dt);
  if (p.y < p.hh) {
    p.y = p.hh;
    if (p.vy < 0) p.vy = 0;
  }

  state.onGround = feetOnSolid(state);
  if (state.onGround && p.vy > 0) p.vy = 0;

  const docked = isDocked(state);
  if (!docked) {
    if ((keys.left || keys.right) && Math.abs(p.vx) > 20) state.fuel -= MOVE_BURN * dt;
    if (keys.up) state.fuel -= THRUST_BURN * dt;
    if (digging) state.fuel -= DIG_BURN * dt;
  }

  // Later slice: open the shop from this dock. For now, free fuel and unload.
  if (docked) {
    const unloaded = bankCargo(state);
    const wasLow = state.fuel < state.maxFuel - 0.2;
    state.fuel = state.maxFuel;
    if (unloaded > 0) {
      state.message =
        unloaded === 1
          ? "Delivered 1 ore. Tanks refilled."
          : "Delivered " + unloaded + " ores. Tanks refilled.";
      state.messageT = 2.8;
    } else if (wasLow && !state.wasDocked) {
      state.message = "Tanks refilled.";
      state.messageT = 1.8;
    }
  }
  state.wasDocked = docked;

  if (state.fuel <= 0 && !docked) {
    state.fuel = 0;
    state.status = "stranded";
    p.vx = 0;
    p.vy = 0;
    state.thrusting = false;
  } else if (state.fuel < 0) {
    state.fuel = 0;
  } else if (state.fuel > state.maxFuel) {
    state.fuel = state.maxFuel;
  }

  if (state.messageT > 0) state.messageT -= dt;
  updateParticles(state, dt);

  const feet = p.y + p.hh;
  state.depth = Math.max(0, Math.floor((feet - 0.1) / TILE) - SURFACE_ROW);
}

function setKey(keys, name, down) {
  if (name === "arrowleft" || name === "left" || name === "a") keys.left = down;
  else if (name === "arrowright" || name === "right" || name === "d") keys.right = down;
  else if (name === "arrowup" || name === "up" || name === "w") keys.up = down;
  else if (name === "arrowdown" || name === "down" || name === "s") keys.down = down;
}

export function createGame() {
  const keys = { left: false, right: false, up: false, down: false };
  let state = newRun();

  function onDown(e) {
    const name = e.key.toLowerCase();
    if (
      name === "arrowup" ||
      name === "arrowdown" ||
      name === "arrowleft" ||
      name === "arrowright"
    ) {
      e.preventDefault();
    }
    if (name === "r") {
      if (!e.repeat) state = newRun();
      return;
    }
    setKey(keys, name, true);
  }

  function onUp(e) {
    setKey(keys, e.key.toLowerCase(), false);
  }

  window.addEventListener("keydown", onDown, { passive: false });
  window.addEventListener("keyup", onUp);
  window.addEventListener("blur", function () {
    keys.left = false;
    keys.right = false;
    keys.up = false;
    keys.down = false;
  });

  return {
    get state() {
      return state;
    },
    update(dt) {
      step(state, keys, dt);
    },
  };
}
