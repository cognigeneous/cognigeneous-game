// Canvas rendering. All art is drawn shapes; there are no image files.
import {
  BASE_X0,
  BASE_X1,
  BASE_Y0,
  BASE_Y1,
  COLOR,
  FONT,
  GAME_TITLE,
  MAP_H,
  MAP_W,
  ORE_STYLE,
  PAD_X0,
  PAD_X1,
  SURFACE_ROW,
  TILE,
} from "./config.js";
import { listHeld, totalCount } from "./data/elements.js";

function setFont(ctx, size, bold) {
  ctx.font = (bold ? "bold " : "") + size + "px " + FONT;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
}

function clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function extraMotion() {
  return (
    typeof window === "undefined" ||
    !window.matchMedia ||
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function drawStars(ctx, camX, camY) {
  ctx.fillStyle = COLOR.star;
  const limit = SURFACE_ROW * TILE;
  const width = MAP_W * TILE;
  for (let i = 0; i < 42; i++) {
    const sx = (i * 97) % width;
    const sy = (i * 53) % limit;
    const size = i % 7 === 0 ? 3 : 2;
    ctx.fillRect(sx - camX, sy - camY, size, size);
  }
}

function drawDirt(ctx, x, y, sx, sy) {
  const shade = (x * 5 + y * 3) % 3;
  ctx.fillStyle = shade === 0 ? COLOR.dirtA : shade === 1 ? COLOR.dirtB : COLOR.dirtC;
  ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
  ctx.fillStyle = COLOR.dirtDot;
  for (let i = 0; i < 5; i++) {
    const hx = 4 + ((x * 3 + i * 5 + y) % 7) * 4;
    const hy = 4 + ((y * 5 + i * 3 + x) % 7) * 4;
    ctx.fillRect(sx + hx, sy + hy, 3, 3);
  }
}

function drawHard(ctx, sx, sy) {
  ctx.fillStyle = COLOR.hard;
  ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(sx + 1, sy + 1, TILE - 2, TILE - 2);
  ctx.clip();
  ctx.strokeStyle = COLOR.hardStripe;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = -TILE; i <= TILE; i += 10) {
    ctx.moveTo(sx + i, sy + TILE);
    ctx.lineTo(sx + i + TILE, sy);
  }
  ctx.stroke();
  ctx.restore();
}

function drawBedrock(ctx, x, y, sx, sy) {
  ctx.fillStyle = COLOR.bedrock;
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.save();
  ctx.beginPath();
  ctx.rect(sx, sy, TILE, TILE);
  ctx.clip();
  ctx.strokeStyle = COLOR.hazard;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = -TILE; i <= TILE; i += 14) {
    ctx.moveTo(sx + i, sy + TILE);
    ctx.lineTo(sx + i + TILE, sy);
  }
  ctx.stroke();
  ctx.restore();

  const depth = y - SURFACE_ROW;
  if (x === 0 && depth > 0 && depth % 10 === 0) {
    setFont(ctx, 16, true);
    ctx.fillStyle = COLOR.bedrock;
    ctx.fillRect(sx + 6, sy + 10, TILE - 12, 22);
    ctx.fillStyle = COLOR.hazard;
    ctx.textAlign = "center";
    ctx.fillText(String(depth), sx + TILE / 2, sy + 12);
  }
}

function drawBaseTile(ctx, x, y, sx, sy) {
  ctx.fillStyle = COLOR.base;
  ctx.fillRect(sx, sy, TILE, TILE);
  const door = x === BASE_X1 - 1 && y === SURFACE_ROW;
  if (door) {
    ctx.fillStyle = COLOR.baseDoor;
    ctx.fillRect(sx + 12, sy + 10, 18, TILE - 10);
    ctx.fillStyle = COLOR.window;
    ctx.fillRect(sx + 22, sy + 20, 5, 5);
    return;
  }
  if (y < SURFACE_ROW) {
    ctx.fillStyle = COLOR.window;
    ctx.fillRect(sx + 6, sy + 12, 11, 14);
    ctx.fillRect(sx + 22, sy + 12, 11, 14);
  }
}

function drawPad(ctx, sx, sy) {
  ctx.fillStyle = COLOR.pad;
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = COLOR.padStripe;
  ctx.fillRect(sx, sy + 7, TILE, 5);
  ctx.fillRect(sx, sy + 28, TILE, 5);
}

// A different shape for each element, so an unidentified ore is not color-only.
function drawOreMark(ctx, symbol, sx, sy) {
  const cx = sx + TILE / 2;
  const cy = sy + TILE / 2;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (symbol === "Al") {
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.stroke();
  } else if (symbol === "Fe") {
    ctx.strokeRect(sx + 6.5, sy + 6.5, TILE - 13, TILE - 13);
  } else if (symbol === "Ca") {
    ctx.moveTo(cx, sy + 6);
    ctx.lineTo(sx + TILE - 7, sy + TILE - 7);
    ctx.lineTo(sx + 7, sy + TILE - 7);
    ctx.closePath();
    ctx.stroke();
  } else if (symbol === "Na") {
    ctx.moveTo(cx, sy + 5);
    ctx.lineTo(sx + TILE - 6, cy);
    ctx.lineTo(cx, sy + TILE - 5);
    ctx.lineTo(sx + 6, cy);
    ctx.closePath();
    ctx.stroke();
  } else if (symbol === "Mg") {
    ctx.moveTo(cx, sy + 6);
    ctx.lineTo(cx, sy + 13);
    ctx.moveTo(cx, sy + TILE - 13);
    ctx.lineTo(cx, sy + TILE - 6);
    ctx.moveTo(sx + 6, cy);
    ctx.lineTo(sx + 13, cy);
    ctx.moveTo(sx + TILE - 13, cy);
    ctx.lineTo(sx + TILE - 6, cy);
    ctx.stroke();
  } else if (symbol === "K") {
    ctx.moveTo(sx + 7, sy + 9);
    ctx.lineTo(sx + TILE - 7, sy + 9);
    ctx.moveTo(sx + 7, sy + TILE - 9);
    ctx.lineTo(sx + TILE - 7, sy + TILE - 9);
    ctx.stroke();
  } else if (symbol === "S") {
    ctx.fillRect(sx + 7, sy + 7, 5, 5);
    ctx.fillRect(sx + TILE - 12, sy + 7, 5, 5);
    ctx.fillRect(sx + 7, sy + TILE - 12, 5, 5);
    ctx.fillRect(sx + TILE - 12, sy + TILE - 12, 5, 5);
  } else {
    ctx.moveTo(sx + 7, sy + 7);
    ctx.lineTo(sx + 15, sy + 15);
    ctx.moveTo(sx + TILE - 7, sy + 7);
    ctx.lineTo(sx + TILE - 15, sy + 15);
    ctx.moveTo(sx + 7, sy + TILE - 7);
    ctx.lineTo(sx + 15, sy + TILE - 15);
    ctx.moveTo(sx + TILE - 7, sy + TILE - 7);
    ctx.lineTo(sx + TILE - 15, sy + TILE - 15);
    ctx.stroke();
  }
}

function drawOre(ctx, tile, sx, sy, known) {
  const style = ORE_STYLE[tile.el] || { fill: "#888888", ink: "#000000" };
  ctx.fillStyle = style.fill;
  ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
  ctx.strokeStyle = style.ink;
  ctx.fillStyle = style.ink;
  drawOreMark(ctx, tile.el, sx, sy);
  ctx.fillStyle = style.ink;
  ctx.font = "bold 18px " + FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(known ? tile.el : "?", sx + TILE / 2, sy + TILE / 2 + 1);
}

function drawCracks(ctx, sx, sy, progress, ink) {
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (progress > 0.12) {
    ctx.moveTo(sx + 10, sy + 8);
    ctx.lineTo(sx + 22, sy + 20);
  }
  if (progress > 0.4) {
    ctx.moveTo(sx + 28, sy + 10);
    ctx.lineTo(sx + 16, sy + 30);
  }
  if (progress > 0.7) {
    ctx.moveTo(sx + 8, sy + 26);
    ctx.lineTo(sx + 32, sy + 18);
  }
  ctx.stroke();
}

function crackInk(tile) {
  if (tile.t === "hard") return "#ffffff";
  if (tile.t === "ore") {
    const style = ORE_STYLE[tile.el];
    return style && style.ink === "#ffffff" ? "#ffffff" : "#111111";
  }
  return "#111111";
}

function drawTiles(ctx, state, camX, camY, viewW, viewH) {
  const x0 = clamp(Math.floor(camX / TILE) - 1, 0, MAP_W - 1);
  const x1 = clamp(Math.floor((camX + viewW) / TILE) + 1, 0, MAP_W - 1);
  const y0 = clamp(Math.floor(camY / TILE) - 1, 0, MAP_H - 1);
  const y1 = clamp(Math.floor((camY + viewH) / TILE) + 1, 0, MAP_H - 1);
  const tiles = state.world.tiles;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const tile = tiles[y][x];
      if (tile.t === "empty") continue;
      const sx = x * TILE - camX;
      const sy = y * TILE - camY;
      if (tile.t === "dirt") drawDirt(ctx, x, y, sx, sy);
      else if (tile.t === "hard") drawHard(ctx, sx, sy);
      else if (tile.t === "bedrock") drawBedrock(ctx, x, y, sx, sy);
      else if (tile.t === "base") drawBaseTile(ctx, x, y, sx, sy);
      else if (tile.t === "pad") drawPad(ctx, sx, sy);
      else if (tile.t === "ore") {
        drawOre(ctx, tile, sx, sy, !!(state.discovered && state.discovered[tile.el]));
      }
      if (state.dig && state.dig.tx === x && state.dig.ty === y && state.dig.p > 0) {
        drawCracks(ctx, sx, sy, state.dig.p, crackInk(tile));
      }
    }
  }
}

function drawLabels(ctx, camX, camY) {
  const bx = ((BASE_X0 + BASE_X1) / 2) * TILE - camX;
  const by = ((BASE_Y0 + SURFACE_ROW) / 2) * TILE - camY;
  setFont(ctx, 18, true);
  ctx.fillStyle = COLOR.text;
  ctx.textAlign = "center";
  ctx.fillText("BASE", Math.round(bx), Math.round(by - 9));

  const antennaX = Math.round(bx);
  const roofY = BASE_Y0 * TILE - camY;
  ctx.strokeStyle = COLOR.star;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(antennaX, roofY);
  ctx.lineTo(antennaX, roofY - 18);
  ctx.stroke();
  ctx.fillStyle = COLOR.flame;
  ctx.beginPath();
  ctx.arc(antennaX, roofY - 22, 4, 0, Math.PI * 2);
  ctx.fill();

  const px = (PAD_X0 + 2) * TILE - camX;
  const py = (SURFACE_ROW + 0.5) * TILE - camY;
  const labelW = 52;
  const labelH = 22;
  ctx.fillStyle = COLOR.pad;
  ctx.fillRect(px - labelW / 2, py - labelH / 2, labelW, labelH);
  setFont(ctx, 16, true);
  ctx.fillStyle = COLOR.ink;
  ctx.textAlign = "center";
  ctx.fillText("PAD", Math.round(px), Math.round(py - 8));
}

function moteColor(mote) {
  if (mote.kind === "ore") {
    const style = ORE_STYLE[mote.el];
    return style ? style.fill : "#ffffff";
  }
  if (mote.kind === "hard") return "#d0d0d0";
  return "#8d8d8d";
}

function drawParticles(ctx, state, camX, camY) {
  for (let i = 0; i < state.particles.length; i++) {
    const mote = state.particles[i];
    ctx.globalAlpha = Math.max(0, mote.ttl / mote.max);
    ctx.fillStyle = moteColor(mote);
    ctx.fillRect(Math.round(mote.x - camX), Math.round(mote.y - camY), 4, 4);
  }
  ctx.globalAlpha = 1;
}

function drawPod(ctx, state, camX, camY) {
  const p = state.player;
  const x = Math.round(p.x - camX);
  const y = Math.round(p.y - camY);
  const bite = state.dig && extraMotion() ? Math.sin(state.time * 36) * 2 : 0;

  if (state.thrusting && state.status === "playing") {
    const flicker = extraMotion() ? 8 + Math.sin(state.time * 42) * 4 : 10;
    ctx.fillStyle = COLOR.flame;
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 14);
    ctx.lineTo(x + 6, y + 14);
    ctx.lineTo(x, y + 16 + flicker);
    ctx.fill();
    ctx.fillStyle = COLOR.flameHot;
    ctx.beginPath();
    ctx.moveTo(x - 3, y + 14);
    ctx.lineTo(x + 3, y + 14);
    ctx.lineTo(x, y + 14 + flicker * 0.6);
    ctx.fill();
  }

  if (state.onGround) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#000000";
    ctx.fillRect(x - 8, y + 14, 16, 4);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = COLOR.pod;
  ctx.fillRect(x - 9, y - 12, 18, 26);
  ctx.strokeStyle = COLOR.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 9, y - 12, 18, 26);
  ctx.fillStyle = COLOR.window;
  ctx.fillRect(x - 9, y + 6, 18, 4);
  ctx.beginPath();
  ctx.arc(x, y - 3, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOR.pod;
  ctx.beginPath();
  ctx.arc(x + 1, y - 3, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLOR.ink;
  ctx.beginPath();
  if (state.drill === "left") {
    ctx.moveTo(x - 10, y - 6);
    ctx.lineTo(x - 10, y + 8);
    ctx.lineTo(x - 20 - bite, y + 1);
  } else if (state.drill === "right") {
    ctx.moveTo(x + 10, y - 6);
    ctx.lineTo(x + 10, y + 8);
    ctx.lineTo(x + 20 + bite, y + 1);
  } else {
    ctx.moveTo(x - 6, y + 14);
    ctx.lineTo(x + 6, y + 14);
    ctx.lineTo(x, y + 24 + bite);
  }
  ctx.fill();
}

function drawToast(ctx, state, viewW, viewH) {
  if (state.status === "stranded" || state.messageT <= 0 || !state.message) return;
  const identified = state.message.indexOf("Element identified") === 0;
  ctx.font = (identified ? "bold 18px " : "16px ") + FONT;
  const width = Math.min(viewW - 24, Math.ceil(ctx.measureText(state.message).width + 28));
  const height = identified ? 44 : 36;
  const bx = Math.round((viewW - width) / 2);
  const by = 14;
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(bx, by, width, height);
  ctx.strokeStyle = COLOR.hudLine;
  ctx.lineWidth = 2;
  ctx.strokeRect(bx + 1, by + 1, width - 2, height - 2);
  setFont(ctx, identified ? 18 : 16, identified);
  ctx.fillStyle = COLOR.text;
  ctx.textAlign = "center";
  ctx.fillText(state.message, Math.round(viewW / 2), by + (identified ? 12 : 9));
}

function drawStranded(ctx, viewW, viewH) {
  ctx.fillStyle = "rgba(12, 18, 32, 0.78)";
  ctx.fillRect(0, 0, viewW, viewH);
  const cw = Math.min(480, viewW - 32);
  const ch = 220;
  const x = Math.round((viewW - cw) / 2);
  const y = Math.round((viewH - ch) / 2);
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(x, y, cw, ch);
  ctx.fillStyle = COLOR.hudLine;
  ctx.fillRect(x, y, cw, 8);
  ctx.fillStyle = COLOR.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "bold 40px " + FONT;
  ctx.fillText("Stranded", viewW / 2, y + 40);
  ctx.font = "18px " + FONT;
  ctx.fillText("The pod is out of fuel.", viewW / 2, y + 108);
  ctx.fillText("Press R to restart the run.", viewW / 2, y + 142);
}

function drawCountList(ctx, x, y, counts, maxY, discovered) {
  const rows = listHeld(counts);
  setFont(ctx, 16, false);
  if (!rows.length) {
    ctx.fillStyle = COLOR.muted;
    ctx.fillText("none yet", x, y);
    return y + 24;
  }
  for (let i = 0; i < rows.length; i++) {
    if (y + 22 > maxY) break;
    const row = rows[i];
    const known = discovered && discovered[row.symbol];
    ctx.fillStyle = COLOR.text;
    ctx.fillText(
      known ? row.symbol + "  ×" + row.count + "   " + row.name : "?  ×" + row.count,
      x,
      y
    );
    y += 22;
  }
  return y;
}

function drawHud(ctx, state, viewW, cssH, hudW) {
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(viewW, 0, hudW, cssH);
  ctx.fillStyle = COLOR.hudLine;
  ctx.fillRect(viewW, 0, 6, cssH);

  const left = viewW + 20;
  const inner = hudW - 36;
  let y = 20;

  setFont(ctx, 24, true);
  ctx.fillStyle = COLOR.text;
  ctx.textAlign = "left";
  ctx.fillText(GAME_TITLE, left, y);
  y += 32;

  setFont(ctx, 16, false);
  ctx.fillStyle = COLOR.muted;
  ctx.fillText("Map seed " + state.world.seed, left, y);
  y += 30;

  const fuelN = state.fuel <= 0 ? 0 : Math.ceil(state.fuel - 1e-6);
  const low = state.status === "playing" && state.fuel <= 25;
  setFont(ctx, 16, true);
  ctx.fillStyle = COLOR.text;
  ctx.fillText("Fuel  " + fuelN + " / " + state.maxFuel, left, y);
  if (low) {
    const labelW = ctx.measureText("Fuel  " + fuelN + " / " + state.maxFuel).width;
    ctx.fillStyle = COLOR.fuelMid;
    ctx.fillText("Low", left + labelW + 10, y);
  }
  y += 24;

  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(left, y, inner, 20);
  const ratio = clamp(state.fuel / state.maxFuel, 0, 1);
  ctx.fillStyle = ratio > 0.5 ? COLOR.fuelOk : ratio > 0.25 ? COLOR.fuelMid : COLOR.fuelLow;
  ctx.fillRect(left, y, Math.round(inner * ratio), 20);
  ctx.strokeStyle = COLOR.text;
  ctx.lineWidth = 2;
  ctx.strokeRect(left + 1, y + 1, inner - 2, 18);
  y += 32;

  setFont(ctx, 16, true);
  ctx.fillStyle = COLOR.text;
  ctx.fillText("Cargo  " + totalCount(state.cargo) + " / " + state.cargoMax, left, y);
  y += 24;
  ctx.fillText("Depth  " + state.depth + " m", left, y);
  y += 32;

  const controls = [
    "Controls",
    "Arrows or W A S D",
    "Up or W: thrust",
    "Left and right: move, dig",
    "Down or S: dig",
    "Up does not dig",
    "PAD: refuel and unload",
    "R: restart",
  ];
  const controlsTop = cssH - 18 - controls.length * 22;
  const listBottom = controlsTop - 12;

  setFont(ctx, 16, true);
  ctx.fillStyle = COLOR.text;
  ctx.fillText("In the hold", left, y);
  y += 24;
  y = drawCountList(ctx, left, y, state.cargo, listBottom, state.discovered);
  y += 8;
  if (y + 24 < listBottom) {
    setFont(ctx, 16, true);
    ctx.fillStyle = COLOR.text;
    ctx.fillText("Delivered", left, y);
    y += 24;
    drawCountList(ctx, left, y, state.delivered, listBottom, state.discovered);
  }

  let cy = controlsTop;
  for (let i = 0; i < controls.length; i++) {
    const head = i === 0;
    setFont(ctx, 16, head);
    ctx.fillStyle = head ? COLOR.text : COLOR.muted;
    ctx.textAlign = "left";
    ctx.fillText(controls[i], left, cy);
    cy += 22;
  }
}

export function draw(ctx, cssW, cssH, dpr, state) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  const hudW = clamp(Math.floor(cssW * 0.3), 230, 300);
  const viewW = Math.max(160, cssW - hudW);
  const viewH = cssH;
  const worldW = MAP_W * TILE;
  const worldH = MAP_H * TILE;
  const p = state.player;

  let camX = worldW <= viewW ? -((viewW - worldW) / 2) : clamp(p.x - viewW / 2, 0, worldW - viewW);
  let camY =
    worldH <= viewH ? -((viewH - worldH) / 2) : clamp(p.y - viewH * 0.38, 0, worldH - viewH);
  camX = Math.round(camX);
  camY = Math.round(camY);

  ctx.fillStyle = COLOR.sky;
  ctx.fillRect(0, 0, cssW, cssH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, viewW, viewH);
  ctx.clip();
  drawStars(ctx, camX, camY);
  ctx.fillStyle = COLOR.void;
  ctx.fillRect(-camX, SURFACE_ROW * TILE - camY, worldW, worldH - SURFACE_ROW * TILE);
  drawTiles(ctx, state, camX, camY, viewW, viewH);
  drawLabels(ctx, camX, camY);
  drawParticles(ctx, state, camX, camY);
  drawPod(ctx, state, camX, camY);
  drawToast(ctx, state, viewW, viewH);
  if (state.status === "stranded") drawStranded(ctx, viewW, viewH);
  ctx.restore();

  drawHud(ctx, state, viewW, cssH, hudW);
}
