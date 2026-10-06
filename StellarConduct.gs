const STELLAR_CONDUCT_ENABLERS = ["traveler cryo", "traveler (cryo)", "sandrone", "odette"];
const SC_FIELD_DURATION = 360;
const SC_UPDATE_INTERVAL = 240;
const SC_BUFF_DURATION = 241;
const SC_STACK_ICD = 6;
const SC_MAX_STACKS = 12;

function esDanioStellarConduct(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]/g, "") === "stellarconduct";
}

function crearEstadoSC(enabled) {
  return { enabled: !!enabled, expiresAt: -Infinity, buffExpiresAt: -Infinity,
    stored: 0, stacks: 0, generation: 0, nextUpdate: null,
    actorReady: Object.create(null) };
}

function stacksStellarConduct(state, frames) {
  return state && frames < state.buffExpiresAt ? state.stacks : 0;
}

function registrarAplicacionSC(auras, element, gauge, actor, frames) {
  let state = auras._stellarConduct;
  if (!state || !state.enabled || frames >= state.expiresAt || gauge <= ZERO_DUR ||
      !["Cryo", "Electro"].includes(element)) return;
  if (frames < (state.actorReady[actor] == null ? -Infinity : state.actorReady[actor])) return;
  state.actorReady[actor] = frames + SC_STACK_ICD;
  state.stored = Math.min(SC_MAX_STACKS, state.stored + 1);
}

function actualizarBuffSC(state, frames, queue) {
  state.stacks = state.stored;
  state.stored = 0;
  state.buffExpiresAt = frames + SC_BUFF_DURATION;
  encolarEventoInterno(queue, { _tipoInterno: "SC_BUFF_EXPIRE",
    frames: state.buffExpiresAt });
}

function activarCampoSC(state, frames, queue) {
  if (frames >= state.expiresAt) {
    state.generation++;
    actualizarBuffSC(state, frames, queue);
    state.nextUpdate = frames + SC_UPDATE_INTERVAL;
    encolarEventoInterno(queue, { _tipoInterno: "SC_UPDATE", frames: state.nextUpdate,
      scToken: state.generation });
  }
  state.expiresAt = frames + SC_FIELD_DURATION;
  encolarEventoInterno(queue, { _tipoInterno: "SC_EXPIRE", frames: state.expiresAt,
    scToken: state.generation });
}

function tryStellarConduct(auras, element, gauge, actor, frames, onfield, queue) {
  let state = auras._stellarConduct;
  let none = { reacted: false, consumed: 0, eventos: [] };
  if (!state || !state.enabled || gauge <= ZERO_DUR) return none;
  let consumed;
  if (getAuraGauge(auras, "Frozen") > ZERO_DUR) {
    if (element !== "Electro") return none;
    let cryo = reduceElement(auras, "Cryo", gauge, 1);
    reduceElement(auras, "Frozen", gauge - cryo, 1);
    consumed = gauge;
  } else {
    let opposite = element === "Cryo" ? "Electro" : element === "Electro" ? "Cryo" : null;
    if (!opposite || getAuraGauge(auras, opposite) <= ZERO_DUR) return none;
    consumed = reduceElement(auras, opposite, gauge, 1);
  }
  activarCampoSC(state, frames, queue);
  return { reacted: true, reactionName: "Stellar-Conduct", consumed: consumed, eventos: [] };
}

function eventoSCVigente(state, item) {
  if (!state || !state.enabled) return false;
  if (item._tipoInterno === "SC_BUFF_EXPIRE") return item.frames === state.buffExpiresAt;
  if (item.scToken !== state.generation) return false;
  if (item._tipoInterno === "SC_EXPIRE") return item.frames === state.expiresAt;
  return item.frames === state.nextUpdate && item.frames < state.expiresAt;
}

function procesarEventoSC(state, item, queue) {
  if (item._tipoInterno === "SC_UPDATE") {
    actualizarBuffSC(state, item.frames, queue);
    state.nextUpdate = item.frames + SC_UPDATE_INTERVAL;
    encolarEventoInterno(queue, { _tipoInterno: "SC_UPDATE", frames: state.nextUpdate,
      scToken: state.generation });
    return "Polestar Field: actualización";
  }
  if (item._tipoInterno === "SC_EXPIRE") return "Polestar Field: fin del campo";
  return "Polestar Field: fin del beneficio";
}
