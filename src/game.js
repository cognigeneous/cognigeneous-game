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
  BASE_ENERGY_MAX,
  PAD_TRANSFER_RATE,
  SOLAR_RATE,
  UPGRADES,
  MESSAGE_TIME,
  SILICATE_PER_ROCK,
  SILICATE_PER_BLOCK,
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
    baseEnergy: BASE_ENERGY_MAX,
    baseEnergyMax: BASE_ENERGY_MAX,
    cargo: {},
    cargoMax: CARGO_MAX,
    delivered: {},
    silicate: 0,
    silicateBanked: 0,
    silicateBlocks: 0,
    status: "playing",
    depth: 0,
    time: 0,
    facing: 1,
    drill: "down",
    thrusting: false,
    onGround: true,
    wasDocked: true,
    // Symbols the player has identified. A later save can persist this object.
    discovered: {},
    dig: null,
    message: "Step right onto the gray rock. Hold Down or S to dig.",
    messageT: MESSAGE_TIME,
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

// The one grid cell the pod overlaps the most. Movement stays free;
// digging uses this cell so one bite cannot choose two targets.
function dominantCell(p) {
  const left = p.x - p.hw;
  const top = p.y - p.hh;
  const x0 = Math.floor(left / TILE);
  const x1 = Math.floor((p.x + p.hw) / TILE);
  const y0 = Math.floor(top / TILE);
  const y1 = Math.floor((p.y + p.hh) / TILE);
  let best = { tx: Math.floor(p.x / TILE), ty: Math.floor(p.y / TILE) };
  let bestArea = -1;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const w = Math.min(p.x + p.hw, (tx + 1) * TILE) - Math.max(left, tx * TILE);
      const h = Math.min(p.y + p.hh, (ty + 1) * TILE) - Math.max(top, ty * TILE);
      const area = (w > 0 ? w : 0) * (h > 0 ? h : 0);
      if (area > bestArea) {
        bestArea = area;
        best = { tx: tx, ty: ty };
      }
    }
  }
  return best;
}

function cellInDirection(cell, dir) {
  if (dir === "left") return { tx: cell.tx - 1, ty: cell.ty };
  if (dir === "right") return { tx: cell.tx + 1, ty: cell.ty };
  if (dir === "down") return { tx: cell.tx, ty: cell.ty + 1 };
  return null;
}

// Down wins over a sideways key so one press still has one target.
function heldDigDir(keys) {
  if (keys.up) return null;
  if (keys.down) return "down";
  if (keys.left && !keys.right) return "left";
  if (keys.right && !keys.left) return "right";
  return null;
}

function againstCell(p, dir, tx, ty) {
  // A pod centered in a cell is about 9px from the next solid face.
  const reach = 12;
  const left = tx * TILE;
  const top = ty * TILE;
  if (dir === "down") return top - (p.y + p.hh) <= reach && top + TILE > p.y;
  if (dir === "left") return p.x - p.hw - (left + TILE) <= reach && left < p.x;
  if (dir === "right") return left - (p.x + p.hw) <= reach && left + TILE > p.x;
  return false;
}

function digGoal(dir, tx, ty, p) {
  const cx = (tx + 0.5) * TILE;
  const cy = (ty + 0.5) * TILE;
  if (dir === "down") return { x: cx, y: ty * TILE - p.hh };
  if (dir === "left") return { x: (tx + 1) * TILE + p.hw, y: cy };
  return { x: tx * TILE - p.hw, y: cy };
}

function blockedHint(state, keys) {
  const dir = heldDigDir(keys);
  if (!dir || !feetOnSolid(state)) return;
  const at = cellInDirection(dominantCell(state.player), dir);
  if (!at || !againstCell(state.player, dir, at.tx, at.ty)) return;
  const tile = getTile(state.world, at.tx, at.ty);
  if (!tile || isDiggable(tile)) return;
  if (tile.t === "bedrock") {
    state.message = "Bedrock cannot be dug.";
    state.messageT = Math.max(state.messageT, MESSAGE_TIME);
    return;
  }
  if (tile.t === "pad" || tile.t === "base") {
    state.message = "The base cannot be dug. Dig the gray rock.";
    state.messageT = Math.max(state.messageT, MESSAGE_TIME);
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

function canBrace(state) {
  if (feetOnSolid(state)) return true;
  // Centered in a cell that just opened, not flying.
  return Math.abs(state.player.vy) < 40 && Math.abs(state.player.vx) < 40;
}

// Left and Right dig on the ground only, unless the air-drill upgrade is on.
// Up plus a sideways key never digs.
function sideDigAllowed(state, keys, dir) {
  if (dir !== "left" && dir !== "right") return true;
  if (keys.up) return false;
  if (UPGRADES.airDrill) return true;
  return feetOnSolid(state);
}

function startDig(state, keys, dir) {
  if (!sideDigAllowed(state, keys, dir)) return false;
  const at = cellInDirection(dominantCell(state.player), dir);
  if (!at) return false;
  const tile = getTile(state.world, at.tx, at.ty);
  if (!tile || !isDiggable(tile)) return false;
  if (!againstCell(state.player, dir, at.tx, at.ty)) return false;
  if (!canBrace(state)) return false;
  state.dig = {
    tx: at.tx,
    ty: at.ty,
    dir: dir,
    p: 0,
    x0: state.player.x,
    y0: state.player.y,
  };
  return true;
}

function slideToGoal(state) {
  const dig = state.dig;
  const p = state.player;
  const goal = digGoal(dig.dir, dig.tx, dig.ty, p);
  const t = dig.p;
  p.x = dig.x0 + (goal.x - dig.x0) * t;
  p.y = dig.y0 + (goal.y - dig.y0) * t;
  p.vx = 0;
  p.vy = 0;
}

function finishDig(state, tile) {
  const dig = state.dig;
  if (tile.t === "ore") {
    const info = elementBySymbol(tile.el);
    const first = !state.discovered[tile.el];
    state.discovered[tile.el] = true;
    state.cargo[tile.el] = (state.cargo[tile.el] || 0) + 1;
    if (first && info) {
      state.message = "Element identified: " + info.name + " (" + info.symbol + ")";
      state.messageT = MESSAGE_TIME;
    } else if (info && state.message.indexOf("Element identified") !== 0) {
      state.message = "Collected " + info.name + " (" + info.symbol + ")";
      state.messageT = MESSAGE_TIME;
    }
  } else if (tile.t === "dirt") {
    state.silicate = round2(state.silicate + SILICATE_PER_ROCK);
  }
  spray(state, dig.tx, dig.ty, tile.t, tile.el, 8, 90);
  tile.t = "empty";
  tile.el = null;
  // One cell, and the pod is centered in it. Nothing else is cleared.
  state.player.x = (dig.tx + 0.5) * TILE;
  state.player.y = (dig.ty + 0.5) * TILE;
  state.player.vx = 0;
  state.player.vy = 0;
  state.dig = null;
}

// True while a single locked cell is being dug. Movement is skipped then.
function updateDig(state, keys, dt) {
  const dir = heldDigDir(keys);
  // Up, or no dig key, cancels. An in-progress bite may slide the feet
  // off the floor; that slide should not cancel a dig that started grounded.
  if (!dir) {
    state.dig = null;
    if (!keys.up) blockedHint(state, keys);
    return false;
  }

  if (!state.dig || state.dig.dir !== dir) {
    if (!sideDigAllowed(state, keys, dir) || !startDig(state, keys, dir)) {
      state.dig = null;
      blockedHint(state, keys);
      return false;
    }
  }

  const dig = state.dig;
  const tile = getTile(state.world, dig.tx, dig.ty);
  if (!tile || !isDiggable(tile)) {
    state.dig = null;
    return false;
  }
  if (tile.t === "ore" && totalCount(state.cargo) >= state.cargoMax) {
    state.message = "Cargo full. Return to the PAD.";
    state.messageT = Math.max(state.messageT, MESSAGE_TIME);
    slideToGoal(state);
    state.drill = dir;
    return true;
  }

  dig.p += dt / (DIG_TIME[tile.t] || 0.2);
  state.moteAcc += dt;
  if (state.moteAcc >= 0.06) {
    state.moteAcc = 0;
    spray(state, dig.tx, dig.ty, tile.t, tile.el, 1, 36);
  }
  state.drill = dir;
  if (dig.p < 1) {
    slideToGoal(state);
    return true;
  }
  finishDig(state, tile);
  return true;
}

function note(state, text) {
  state.message = text;
  state.messageT = MESSAGE_TIME;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Move carried silicate into the base, then turn each full unit into a block.
function bankSilicate(state) {
  if (state.silicate > 0) {
    state.silicateBanked = round2(state.silicateBanked + state.silicate);
    state.silicate = 0;
  }
  const formed = Math.floor(state.silicateBanked / SILICATE_PER_BLOCK + 1e-9);
  if (formed < 1) return 0;
  state.silicateBlocks += formed;
  state.silicateBanked = round2(state.silicateBanked - formed * SILICATE_PER_BLOCK);
  return formed;
}

// Panels always trickle in. The pad moves store energy into the pod while docked.
function tickEnergy(state, docked, dt) {
  const before = state.baseEnergy;
  state.baseEnergy = Math.min(state.baseEnergyMax, state.baseEnergy + SOLAR_RATE * dt);
  if (!docked) {
    if (before > 0 && state.baseEnergy <= 0) note(state, "Solar panels are recharging the base.");
    return;
  }
  const room = state.maxFuel - state.fuel;
  const give = Math.min(PAD_TRANSFER_RATE * dt, state.baseEnergy, room > 0 ? room : 0);
  if (give > 0) {
    state.baseEnergy -= give;
    state.fuel += give;
  }
  const empty = state.baseEnergy <= 0.05;
  if ((before > 0.05 && empty) || (empty && state.fuel < state.maxFuel - 0.2 && !state.wasDocked)) {
    note(state, "Solar panels are recharging the base.");
  }
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

  // A dig locks one cell and slides the pod into it. Open air stays free.
  const digging = updateDig(state, keys, dt);
  if (!digging) {
    if (state.onGround && !keys.up) {
      p.vy = 0;
    } else {
      let ay = GRAVITY;
      if (keys.down) ay += DOWN_BOOST;
      if (keys.up) ay -= THRUST;
      p.vy = clamp(p.vy + ay * dt, -MAX_RISE, MAX_FALL);
    }
    moveX(state, p.vx * dt);
    moveY(state, p.vy * dt);
    if (p.y < p.hh) {
      p.y = p.hh;
      if (p.vy < 0) p.vy = 0;
    }
  }

  state.onGround = feetOnSolid(state);
  if (state.onGround && p.vy > 0) p.vy = 0;

  const docked = isDocked(state);
  if (!docked) {
    if ((keys.left || keys.right) && Math.abs(p.vx) > 20) state.fuel -= MOVE_BURN * dt;
    if (keys.up) state.fuel -= THRUST_BURN * dt;
    if (digging) state.fuel -= DIG_BURN * dt;
  }

  // Later slice: open the shop from this dock. Cargo unloads at once.
  // Pod fuel comes out of the base store at PAD_TRANSFER_RATE.
  let unloaded = 0;
  let formed = 0;
  if (docked) {
    unloaded = bankCargo(state);
    formed = bankSilicate(state);
  }
  tickEnergy(state, docked, dt);
  if (unloaded > 0) {
    note(state, unloaded === 1 ? "Delivered 1 ore." : "Delivered " + unloaded + " ores.");
  }
  if (formed > 0) note(state, "Silicate block formed!");
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
