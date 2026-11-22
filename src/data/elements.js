/**
 * Element ores. This is the only list of elements in the game.
 * A later codex, shop, or ionic-compound bench should import this file.
 *
 * symbol and name are the real element, with US spelling.
 * depthMin and depthMax are inclusive depths in tiles below the surface.
 * Order and bands follow approximate abundance in Earth's crust, as a
 * play simplification: common elements sit shallower, rarer ones deeper.
 * chance is the per-tile odds inside that band (before a deposit spreads).
 * molarMass is kilograms per kilomole. One dug block is 1 kmol,
 * so the mass added to the hold is this number in kilograms.
 * Ion charges live in config and are not used while digging.
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
  { symbol: "O", name: "Oxygen", molarMass: 16.00, depthMin: 18, depthMax: 52, chance: 0.028 },
  { symbol: "Li", name: "Lithium", molarMass: 6.94, depthMin: 24, depthMax: 58, chance: 0.02 },
  { symbol: "Zn", name: "Zinc", molarMass: 65.38, depthMin: 50, depthMax: 82, chance: 0.016 },
  { symbol: "F", name: "Fluorine", molarMass: 19.00, depthMin: 56, depthMax: 90, chance: 0.014 },
  { symbol: "Br", name: "Bromine", molarMass: 79.90, depthMin: 64, depthMax: 100, chance: 0.012 },
  { symbol: "Ag", name: "Silver", molarMass: 107.87, depthMin: 84, depthMax: 113, chance: 0.008 },
  { symbol: "I", name: "Iodine", molarMass: 126.90, depthMin: 92, depthMax: 113, chance: 0.007 },
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

/** Kilograms in the hold. One block of an element is one kilomole. */
export function holdMass(counts) {
  let kilos = 0;
  const rows = listHeld(counts);
  for (let i = 0; i < rows.length; i++) kilos += rows[i].count * rows[i].molarMass;
  return Math.round(kilos * 100) / 100;
}
