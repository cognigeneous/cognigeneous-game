/**
 * Element ores. This is the only list of elements in the game.
 * A later codex, shop, or ionic-compound bench should import this file.
 *
 * symbol and name are the real element, with US spelling.
 * depthMin and depthMax are inclusive depths in tiles below the surface.
 * Order and bands follow approximate abundance in Earth's crust, as a
 * play simplification: common elements sit shallower, rarer ones deeper.
 * chance is the per-tile odds inside that band (before a deposit spreads).
 * molarMass is grams per mole, so one dug block is that many grams.
 */
export const ELEMENTS = [
  { symbol: "Al", name: "Aluminum", molarMass: 26.98, depthMin: 1, depthMax: 20, chance: 0.045 },
  { symbol: "Fe", name: "Iron", molarMass: 55.85, depthMin: 1, depthMax: 24, chance: 0.042 },
  { symbol: "Ca", name: "Calcium", molarMass: 40.08, depthMin: 6, depthMax: 32, chance: 0.036 },
  { symbol: "Na", name: "Sodium", molarMass: 22.99, depthMin: 8, depthMax: 36, chance: 0.034 },
  { symbol: "Mg", name: "Magnesium", molarMass: 24.31, depthMin: 16, depthMax: 48, chance: 0.03 },
  { symbol: "K", name: "Potassium", molarMass: 39.10, depthMin: 26, depthMax: 58, chance: 0.026 },
  { symbol: "S", name: "Sulfur", molarMass: 32.06, depthMin: 36, depthMax: 66, chance: 0.024 },
  { symbol: "Cl", name: "Chlorine", molarMass: 35.45, depthMin: 46, depthMax: 70, chance: 0.022 },
];

export function elementBySymbol(symbol) {
  for (let i = 0; i < ELEMENTS.length; i++) {
    if (ELEMENTS[i].symbol === symbol) return ELEMENTS[i];
  }
  return null;
}

/** Non-zero stacks, in catalog order. */
export function listHeld(counts) {
  const rows = [];
  for (let i = 0; i < ELEMENTS.length; i++) {
    const el = ELEMENTS[i];
    const count = counts[el.symbol] || 0;
    if (count > 0) {
      rows.push({
        symbol: el.symbol,
        name: el.name,
        count: count,
        molarMass: el.molarMass,
      });
    }
  }
  return rows;
}

export function totalCount(counts) {
  let n = 0;
  const rows = listHeld(counts);
  for (let i = 0; i < rows.length; i++) n += rows[i].count;
  return n;
}

/** Grams in the hold. One block of an element is one mole. */
export function holdMass(counts) {
  let grams = 0;
  const rows = listHeld(counts);
  for (let i = 0; i < rows.length; i++) grams += rows[i].count * rows[i].molarMass;
  return Math.round(grams * 100) / 100;
}
