// Base market: sell a haul, buy three upgrades, and keep a small save.
import {
  BASE_STORAGE_RANKS,
  FUEL_CELL_RANKS,
  MARKET_PRICES,
  MESSAGE_TIME,
  SAVE_KEY,
  SAVE_VERSION,
  SILICATE_PER_BLOCK,
  SOLAR_RANKS,
} from "./config.js";
import { ELEMENTS, elementBySymbol, listHeld } from "./data/elements.js";

function say(state, text) {
  state.message = text;
  state.messageT = MESSAGE_TIME;
  state.marketNote = text;
}

function rankCount(ranks) {
  return ranks.length - 1;
}

function readRank(value, ranks) {
  const n = Math.floor(Number(value));
  if (!isFinite(n) || n < 0) return 0;
  if (n > ranks.length - 1) return ranks.length - 1;
  return n;
}

function readCount(value) {
  const n = Math.floor(Number(value));
  if (!isFinite(n) || n < 0) return 0;
  return n;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function applyRanks(state) {
  const fuel = FUEL_CELL_RANKS[state.upgrades.fuelCell];
  const storage = BASE_STORAGE_RANKS[state.upgrades.baseStorage];
  const solar = SOLAR_RANKS[state.upgrades.solar];
  state.maxFuel = fuel.fuel;
  if (state.fuel > state.maxFuel) state.fuel = state.maxFuel;
  state.baseEnergyMax = storage.energy;
  if (state.baseEnergy > state.baseEnergyMax) state.baseEnergy = state.baseEnergyMax;
  state.solarRate = solar.rate;
}

export function captureSave(state) {
  return {
    version: SAVE_VERSION,
    credits: state.credits,
    silicateBlocks: state.silicateBlocks,
    silicateProgress: state.silicateBanked,
    discovered: Object.assign({}, state.discovered),
    upgrades: {
      fuelCell: state.upgrades.fuelCell,
      baseStorage: state.upgrades.baseStorage,
      solar: state.upgrades.solar,
    },
    baseEnergy: state.baseEnergy,
  };
}

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(captureSave(state)));
  } catch (err) {
    // A blocked store should not stop the run.
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    // Same as a missing save.
  }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== SAVE_VERSION) return null;
    return data;
  } catch (err) {
    return null;
  }
}

function readDiscovered(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (let i = 0; i < ELEMENTS.length; i++) {
    const symbol = ELEMENTS[i].symbol;
    if (raw[symbol]) out[symbol] = true;
  }
  return out;
}

// Puts a save onto a fresh run. fillFuel tops the pod up, used at the pad.
export function applySave(state, data, fillFuel) {
  state.credits = readCount(data.credits);
  state.silicateBlocks = readCount(data.silicateBlocks);
  let progress = Number(data.silicateProgress);
  if (!isFinite(progress) || progress < 0) progress = 0;
  const extra = Math.floor(progress / SILICATE_PER_BLOCK + 1e-9);
  if (extra > 0) {
    state.silicateBlocks += extra;
    progress -= extra * SILICATE_PER_BLOCK;
  }
  state.silicateBanked = round2(progress);
  state.discovered = readDiscovered(data.discovered);
  const upgrades = data.upgrades || {};
  state.upgrades = {
    fuelCell: readRank(upgrades.fuelCell, FUEL_CELL_RANKS),
    baseStorage: readRank(upgrades.baseStorage, BASE_STORAGE_RANKS),
    solar: readRank(upgrades.solar, SOLAR_RANKS),
  };
  applyRanks(state);
  const energy = Number(data.baseEnergy);
  if (!isFinite(energy) || energy < 0) state.baseEnergy = state.baseEnergyMax;
  else state.baseEnergy = Math.min(state.baseEnergyMax, energy);
  if (fillFuel) state.fuel = state.maxFuel;
}

function oreCredits(symbol, count) {
  return (MARKET_PRICES[symbol] || 0) * count;
}

function haulCredits(state) {
  let credits = state.silicateBlocks * MARKET_PRICES.silicateBlock;
  const held = listHeld(state.cargo);
  for (let i = 0; i < held.length; i++) {
    credits += oreCredits(held[i].symbol, held[i].count);
  }
  return credits;
}

function upgradeLabel(name, ranks, level, unit, field) {
  const now = ranks[level];
  const next = ranks[level + 1];
  const cap = rankCount(ranks);
  if (!next) {
    return name + ", level " + level + " of " + cap + ": " + now[field] + " " + unit + ", max level";
  }
  return (
    name +
    ", buy level " +
    (level + 1) +
    " of " +
    cap +
    ": " +
    now[field] +
    " to " +
    next[field] +
    " " +
    unit +
    ", " +
    next.cost +
    " credits"
  );
}

export function marketRows(state) {
  const rows = [];
  const loot = haulCredits(state);
  rows.push({
    action: "sell-all",
    label: loot > 0 ? "Sell all for " + loot + " credits" : "Sell all (nothing to sell)",
  });
  if (state.silicateBlocks > 0) {
    const each = MARKET_PRICES.silicateBlock;
    const total = each * state.silicateBlocks;
    rows.push({
      action: "sell-silicate",
      label:
        "Sell silicate blocks, " +
        state.silicateBlocks +
        " at " +
        each +
        " credits each, " +
        total +
        " credits",
    });
  }
  const held = listHeld(state.cargo);
  for (let i = 0; i < held.length; i++) {
    const row = held[i];
    const each = MARKET_PRICES[row.symbol] || 0;
    const total = each * row.count;
    rows.push({
      action: "sell-ore",
      symbol: row.symbol,
      label:
        "Sell " +
        row.name +
        " (" +
        row.symbol +
        "), " +
        row.count +
        " mol at " +
        each +
        " credits each, " +
        total +
        " credits",
    });
  }
  rows.push({
    action: "upgrade",
    upgrade: "fuel",
    label: upgradeLabel("Pod fuel cell", FUEL_CELL_RANKS, state.upgrades.fuelCell, "fuel", "fuel"),
  });
  rows.push({
    action: "upgrade",
    upgrade: "storage",
    label: upgradeLabel("Base storage", BASE_STORAGE_RANKS, state.upgrades.baseStorage, "energy", "energy"),
  });
  rows.push({
    action: "upgrade",
    upgrade: "solar",
    label: upgradeLabel("Solar rate", SOLAR_RANKS, state.upgrades.solar, "per second", "rate"),
  });
  if (state.marketConfirm) {
    rows.push({ action: "confirm-yes", label: "Yes, erase the save" });
    rows.push({ action: "confirm-no", label: "No, keep playing" });
  } else {
    rows.push({ action: "new-game", label: "New game" });
  }
  return rows;
}

export function moveCursor(state, delta) {
  const rows = marketRows(state);
  let next = state.marketCursor + delta;
  if (next < 0) next = 0;
  if (next > rows.length - 1) next = rows.length - 1;
  state.marketCursor = next;
}

function rememberSold(state, symbol, count) {
  if (count <= 0) return;
  state.delivered[symbol] = (state.delivered[symbol] || 0) + count;
  delete state.cargo[symbol];
}

function sellAll(state) {
  const credits = haulCredits(state);
  if (credits <= 0) {
    say(state, "Nothing to sell");
    return;
  }
  const held = listHeld(state.cargo);
  for (let i = 0; i < held.length; i++) rememberSold(state, held[i].symbol, held[i].count);
  state.silicateBlocks = 0;
  state.credits += credits;
  say(state, "Sold everything for " + credits + " credits");
  saveGame(state);
}

function sellSilicate(state) {
  const count = state.silicateBlocks;
  const credits = count * MARKET_PRICES.silicateBlock;
  if (credits <= 0) {
    say(state, "Nothing to sell");
    return;
  }
  state.silicateBlocks = 0;
  state.credits += credits;
  say(state, "Sold " + count + " silicate blocks for " + credits + " credits");
  saveGame(state);
}

function sellOre(state, symbol) {
  const info = elementBySymbol(symbol);
  const count = state.cargo[symbol] || 0;
  const credits = oreCredits(symbol, count);
  if (!info || credits <= 0) {
    say(state, "Nothing to sell");
    return;
  }
  rememberSold(state, symbol, count);
  state.credits += credits;
  say(state, "Sold " + count + " " + info.name + " for " + credits + " credits");
  saveGame(state);
}

function buyUpgrade(state, upgrade) {
  let ranks = FUEL_CELL_RANKS;
  let level = state.upgrades.fuelCell;
  if (upgrade === "storage") {
    ranks = BASE_STORAGE_RANKS;
    level = state.upgrades.baseStorage;
  } else if (upgrade === "solar") {
    ranks = SOLAR_RANKS;
    level = state.upgrades.solar;
  }
  const next = ranks[level + 1];
  if (!next) {
    say(state, "Already at max level");
    return;
  }
  if (state.credits < next.cost) {
    say(state, "Not enough credits");
    return;
  }
  state.credits -= next.cost;
  if (upgrade === "storage") state.upgrades.baseStorage = level + 1;
  else if (upgrade === "solar") state.upgrades.solar = level + 1;
  else state.upgrades.fuelCell = level + 1;
  applyRanks(state);
  say(state, "Upgrade bought. Credits: " + state.credits);
  saveGame(state);
}

function cursorFor(state, action) {
  const rows = marketRows(state);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].action === action) {
      state.marketCursor = i;
      return;
    }
  }
  if (state.marketCursor > rows.length - 1) state.marketCursor = rows.length - 1;
}

function clampCursor(state) {
  const rows = marketRows(state);
  if (state.marketCursor < 0) state.marketCursor = 0;
  if (state.marketCursor > rows.length - 1) state.marketCursor = rows.length - 1;
}

// Enter on the highlighted row. Returns "reset" when New game is confirmed.
export function activateMarket(state) {
  const rows = marketRows(state);
  if (state.marketCursor > rows.length - 1) state.marketCursor = rows.length - 1;
  const row = rows[state.marketCursor];
  if (!row) return null;
  if (row.action === "sell-all") sellAll(state);
  else if (row.action === "sell-silicate") sellSilicate(state);
  else if (row.action === "sell-ore") sellOre(state, row.symbol);
  else if (row.action === "upgrade") buyUpgrade(state, row.upgrade);
  else if (row.action === "new-game") {
    state.marketConfirm = true;
    say(state, "Erase credits, upgrades, and the save?");
    cursorFor(state, "confirm-yes");
    return null;
  } else if (row.action === "confirm-no") {
    state.marketConfirm = false;
    state.marketNote = "";
    cursorFor(state, "new-game");
    return null;
  } else if (row.action === "confirm-yes") {
    return "reset";
  }
  clampCursor(state);
  return null;
}
