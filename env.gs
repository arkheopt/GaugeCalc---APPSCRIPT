const ZERO_DUR = 1e-12;
const DURACION_NUCLEO = 360;
const BURNING_AURA_GAUGE = 2;
const DENDRO_CONSUMPTION_RATE = 0.4;
const BURNING_DAMAGE_INTERVAL_FRAMES = 15;
const BURNING_ELEMENT_ICD_FRAMES = 120;
const SHATTER_FROZEN_CONSUMPTION = 8;

const EC_INITIAL_TICK_DELAY_FRAMES = 8;
const EC_TICK_INTERVAL_FRAMES = 60;
const EC_DAMAGE_ICD_FRAMES = 30;
const EC_GAUGE_WANE = 0.4;

const EC_WANE_DELAY_FRAMES = 6;
const EC_EARLY_TICK_MIN_FRAMES = 30;

function reaccionHabilitada(data, override, enablers, name) {
  if (override !== undefined && override !== null && override !== "") {
    let value = String(override).trim().toLowerCase();
    if (["true", "verdadero", "1", "sí", "si"].includes(value)) return true;
    if (["false", "falso", "0", "no"].includes(value)) return false;
    throw new Error(name + ": el argumento de activación debe ser TRUE o FALSE.");
  }
  return data.slice(1).some((row) =>
    enablers.includes(String(row[1] || "").trim().toLowerCase()),
  );
}
