const LUNAR_CHARGED_ENABLERS = ["ineffa", "flins", "columbina"];
const LC_CLOUD_DURATION_FRAMES = 330;
const LC_INITIAL_POLL_DELAY_FRAMES = 9;
const LC_POLL_INTERVAL_FRAMES = 6;
const LC_DAMAGE_ICD_FRAMES = 120;
const LC_GAUGE_WANE = 0.4;

function lunarChargedHabilitado(data, override) {
  return reaccionHabilitada(data, override, LUNAR_CHARGED_ENABLERS, "Lunar-Charged");
}

function esDanioLunarCharged(value) {
  return ["lunarcharged", "lunarcharge", "electrocargadolunar"].includes(
    String(value || "").trim().toLowerCase().replace(/[\s_-]/g, ""),
  );
}

function crearEstadoLC(enabled) {
  return {
    enabled: !!enabled,
    expiresAt: -Infinity,
    generation: 0,
    nextPollFrame: null,

    readyFrame: -Infinity,
    ownerChar: null,
    ownerIndex: null,
    ownerOnfield: "FALSE",
  };
}

function encolarSondeoLC(state, frames, colaEventos) {
  state.nextPollFrame = frames;
  encolarEventoInterno(colaEventos, {
    _tipoInterno: "LC_TICK", frames: frames, lcToken: state.generation,
  });
}

function tryLunarCharged(
  auras, elemento, triggerGauge, actorChar, frames, onfield, index,
  puedeAdjuntarTrigger, colaEventos,
) {
  let state = auras._lunarCharged;
  let noReaction = { reacted: false, consumed: 0, eventos: [] };
  if (!state || !state.enabled || triggerGauge <= ZERO_DUR) return noReaction;
  if (getAuraGauge(auras, "Frozen") > ZERO_DUR) return noReaction;
  let opposite = elemento === "Hydro" ? "Electro" : elemento === "Electro" ? "Hydro" : null;
  if (!opposite || getAuraGauge(auras, opposite) <= ZERO_DUR) return noReaction;

  if (puedeAdjuntarTrigger) attachOrRefill(auras, elemento, triggerGauge, actorChar);
  state.ownerChar = actorChar || "Unknown";
  state.ownerIndex = index == null ? null : index;
  state.ownerOnfield = onfield || "FALSE";
  if (frames >= state.expiresAt) {
    state.generation++;
    encolarSondeoLC(state, frames + LC_INITIAL_POLL_DELAY_FRAMES, colaEventos);
  }

  state.expiresAt = frames + LC_CLOUD_DURATION_FRAMES;
  return {
    reacted: true, reactionName: "Lunar-Charged", consumed: 0,
    triggerAttached: !!puedeAdjuntarTrigger, blocksAuraAttachment: true, eventos: [],
  };
}

function contribuyentesLC(auras) {
  return contribuyentesAuras(auras, ["Hydro", "Electro"]);
}

function procesarTickLunarCharged(auras, frames, item, colaEventos) {
  let state = auras._lunarCharged;
  if (!state || !state.enabled || item.lcToken !== state.generation ||
      frames !== state.nextPollFrame) return null;
  state.nextPollFrame = null;
  if (frames >= state.expiresAt) return null;

  encolarSondeoLC(state, frames + LC_POLL_INTERVAL_FRAMES, colaEventos);
  if (frames < state.readyFrame || !tieneAurasEC(auras)) return null;

  let contributors = contribuyentesLC(auras);
  if (!contributors.length) return null;
  state.readyFrame = frames + LC_DAMAGE_ICD_FRAMES;

  reduceAuraDirect(auras, "Hydro", LC_GAUGE_WANE);
  reduceAuraDirect(auras, "Electro", LC_GAUGE_WANE);
  let event = crearEvento(
    state.ownerChar, "Lunar-Charged Damage", frames, "Electro%",
    state.ownerOnfield, 0, "", "", "FALSE", "Lunar-Charged", state.ownerIndex,
  );
  event.participantesLC = contributors.join(", ");
  return event;
}
