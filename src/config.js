/** Working title only. The final name is not decided — change it here. */
export const GAME_TITLE = "Assay Pod";

export const TILE = 40;
export const MAP_W = 24;
export const MAP_H = 78;
export const SURFACE_ROW = 5;
export const MAP_SEED = 481516;

// The outpost sits on the surface. The pad is the landing strip beside it.
export const BASE_X0 = 4;
export const BASE_X1 = 7;
export const BASE_Y0 = 3;
export const BASE_Y1 = 6;
export const PAD_X0 = 7;
export const PAD_X1 = 12;

export const PLAYER_W = 22;
export const PLAYER_H = 30;

export const MAX_FUEL = 100;
export const HOLD_CAPACITY_G = 1000;

// Low gravity, strong thrust. Fall speed is capped so landings stay gentle.
export const GRAVITY = 260;
export const DOWN_BOOST = 80;
export const MOVE_ACCEL = 5200;
export const MAX_RUN = 230;
export const THRUST = 2600;
export const MAX_FALL = 140;
export const MAX_RISE = 480;
export const GROUND_DRAG = 34;
export const AIR_DRAG = 18;

// Base battery and the orbital panels that trickle it back.
export const BASE_ENERGY_MAX = 600;
export const PAD_TRANSFER_RATE = 25;
export const SOLAR_RATE = 0.5;

// Later shop upgrades. airDrill lets Left/Right dig while airborne.
// The market does not sell this yet.
export const UPGRADES = {
  airDrill: false,
};

// Game prices, not chemistry. One dug block is one mole.
// Deeper elements pay more. One fuel-tank trip that makes it home
// sells for about 100 credits, which is the first upgrade.
export const MARKET_PRICES = {
  silicateBlock: 50,
  Al: 8,
  Fe: 10,
  Ca: 12,
  Na: 15,
  Mg: 14,
  K: 18,
  S: 20,
  Cl: 22,
};

// Rank 0 is where a new game starts. The next three ranks are the shop.
export const FUEL_CELL_RANKS = [
  { cost: 0, fuel: MAX_FUEL },
  { cost: 100, fuel: 150 },
  { cost: 250, fuel: 210 },
  { cost: 500, fuel: 280 },
];

export const BASE_STORAGE_RANKS = [
  { cost: 0, energy: BASE_ENERGY_MAX },
  { cost: 100, energy: 1000 },
  { cost: 250, energy: 1500 },
  { cost: 500, energy: 2100 },
];

export const SOLAR_RANKS = [
  { cost: 0, rate: SOLAR_RATE },
  { cost: 100, rate: 1 },
  { cost: 250, rate: 1.6 },
  { cost: 500, rate: 2.5 },
];

export const SAVE_VERSION = 1;
export const SAVE_KEY = "assay-pod-save";

export const MARKET_TITLE = 28;
export const MARKET_FONT = 22;
export const MARKET_LINE = 32;

export const MESSAGE_TIME = 3;
// How often the full-hold warning can appear while the player keeps digging.
export const HOLD_FULL_TOAST_GAP = 4;
export const HUD_TITLE = 28;
export const HUD_FONT = 20;
export const HUD_LINE = 28;
export const TOAST_FONT = 20;
export const TOAST_FONT_STRONG = 24;

// Per second. Sitting still and falling do not burn fuel.
export const MOVE_BURN = 3.2;
export const THRUST_BURN = 7;
export const DIG_BURN = 3.5;
// Plain gray rock spends this fraction of DIG_BURN. Ore and hard rock stay at 1.
export const ROCK_DIG_FUEL_MULT = 0.1;

// Seconds of contact to break one tile.
export const DIG_TIME = {
  dirt: 0.5,
  hard: 0.8,
  ore: 0.9,
};

// Gray rock only. 100 blocks bank into one silicate block.
export const SILICATE_PER_ROCK = 0.01;
export const SILICATE_PER_BLOCK = 1;

export const FONT =
  'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// Okabe–Ito accents, plus neutrals for sky, rock, and tunnels.
export const COLOR = {
  sky: "#0c1220",
  star: "#e6e6e6",
  void: "#3a332c",
  dirtA: "#e4e4e4",
  dirtB: "#d4d4d4",
  dirtC: "#ececec",
  dirtDot: "#3a3a3a",
  hard: "#3a3a3a",
  hardStripe: "#f2f2f2",
  bedrock: "#101010",
  hazard: "#F0E442",
  pad: "#009E73",
  padStripe: "#ffffff",
  base: "#0072B2",
  baseDoor: "#062844",
  window: "#F0E442",
  pod: "#0072B2",
  ink: "#111111",
  flame: "#E69F00",
  flameHot: "#F0E442",
  hud: "#12141a",
  hudLine: "#F0E442",
  text: "#ffffff",
  muted: "#d5d5d5",
  fuelOk: "#009E73",
  fuelMid: "#F0E442",
  fuelLow: "#D55E00",
  cargo: "#56B4E9",
};

// Fill and ink for each element. A missing entry still draws the symbol.
export const ORE_STYLE = {
  Al: { fill: "#0072B2", ink: "#ffffff" },
  Fe: { fill: "#D55E00", ink: "#ffffff" },
  Ca: { fill: "#56B4E9", ink: "#000000" },
  Na: { fill: "#F0E442", ink: "#000000" },
  Mg: { fill: "#009E73", ink: "#ffffff" },
  K: { fill: "#E69F00", ink: "#000000" },
  S: { fill: "#CC79A7", ink: "#000000" },
  Cl: { fill: "#111111", ink: "#F0E442" },
};
