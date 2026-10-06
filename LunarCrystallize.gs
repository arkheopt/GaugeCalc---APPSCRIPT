const LUNAR_CRYSTALLIZE_ENABLERS = ["zibai", "columbina", "linnea"];
const LCR_CONSTRUCT_DURATION = 540;
const LCR_HARMONY_ICD = 37;
const LCR_DAMAGE_DELAYS = [13, 25, 37];

function esDanioLunarCrystallize(value) {
  return ["lunarcrystallize", "lunarcrystallise", "cristalizacionlunar"].includes(
    String(value || "").trim().toLowerCase().replace(/[\s_-]/g, ""),
  );
}

function crearEstadoLCr(enabled) {
  return { enabled: !!enabled, count: 0, expiresAt: -Infinity,
    readyFrame: -Infinity, contributors: [] };
}

function tryLunarCrystallize(auras, triggerGauge, actor, frames, onfield, index) {
  let state = auras._lunarCrystallize;
  if (!state || !state.enabled || triggerGauge <= ZERO_DUR ||
      getAuraGauge(auras, "Hydro") <= ZERO_DUR) {
    return { reacted: false, consumed: 0, eventos: [] };
  }
  state.count = Math.min(6, state.count + 1);
  state.contributors = unirContribuyentes(state.contributors, [actor],
    contribuyentesAuras(auras, ["Hydro"]));
  let eventos = [];
  if (frames >= state.expiresAt) {
    state.expiresAt = frames + LCR_CONSTRUCT_DURATION;
  } else if (state.count >= 3 && frames >= state.readyFrame) {
    state.count -= 3;
    state.readyFrame = frames + LCR_HARMONY_ICD;
    state.expiresAt = frames + LCR_CONSTRUCT_DURATION;
    let participants = state.contributors.join(", ");
    state.contributors = [];
    for (let i = 0; i < LCR_DAMAGE_DELAYS.length; i++) {
      let event = crearEvento(actor, "Moondrift Harmony Damage " + (i + 1),
        frames + LCR_DAMAGE_DELAYS[i], "Geo%", onfield, 0, "", "", "FALSE",
        "Lunar-Crystallize", index);
      event.participantesLCr = participants;
      eventos.push(event);
    }
  }
  return { reacted: true, reactionName: "Lunar-Crystallize",
    consumed: reduceElement(auras, "Hydro", triggerGauge, 0.5), eventos: eventos };
}
