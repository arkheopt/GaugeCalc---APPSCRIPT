function crearEstadoEC() {
  return {
    active: false,
    ownerChar: null,
    ownerOnfield: "FALSE",
    ownerIndex: null,

    startFrame: null,
    lastTickFrame: null,
    lastDamageFrame: null,
    baseNextTickFrame: null,
    nextTickFrame: null,

    scheduleToken: 0,
  };
}

function tieneAurasEC(auras) {
  return (
    getAuraGauge(auras, "Hydro") > ZERO_DUR &&
    getAuraGauge(auras, "Electro") > ZERO_DUR
  );
}

function vidaAuraFrames(auras, elemento) {
  let aura = auras[elemento];
  if (!aura || aura.gauge <= ZERO_DUR) return 0;
  if (!aura.decayRate || aura.decayRate <= 0) return Infinity;
  return (aura.gauge / aura.decayRate) * 60;
}

function desactivarEC(ecState) {
  if (!ecState) return;
  ecState.active = false;
  ecState.startFrame = null;
  ecState.lastTickFrame = null;

  ecState.baseNextTickFrame = null;
  ecState.nextTickFrame = null;
  ecState.scheduleToken++;
}

function calcularSiguienteECTickFrame(auras, frameActual, ecState) {
  if (!ecState || !ecState.active || !tieneAurasEC(auras)) return null;
  if (ecState.baseNextTickFrame == null) return null;

  let vidaH = vidaAuraFrames(auras, "Hydro");
  let vidaE = vidaAuraFrames(auras, "Electro");
  let vidaMin = Math.min(vidaH, vidaE);
  let frameExpira = frameActual + vidaMin;
  let regular = ecState.baseNextTickFrame;

  if (ecState.lastTickFrame == null) {
    return frameExpira + 1e-9 >= regular ? regular : null;
  }

  if (frameExpira > regular + 1e-9) {
    return regular;
  }

  let desdeUltimoTick = frameExpira - ecState.lastTickFrame;
  if (desdeUltimoTick > EC_EARLY_TICK_MIN_FRAMES) {

    let earlyFrame = Math.ceil(frameExpira) - 1;
    earlyFrame = Math.max(
      earlyFrame,
      ecState.lastTickFrame + EC_EARLY_TICK_MIN_FRAMES,
    );
    if (earlyFrame >= frameActual && earlyFrame < regular) {
      return earlyFrame;
    }
  }

  return null;
}

function sincronizarEstadoEC(auras, frameActual, ecState, colaEventos) {
  if (!ecState || !ecState.active) return;

  if (!tieneAurasEC(auras)) {
    desactivarEC(ecState);
    return;
  }

  let siguiente = calcularSiguienteECTickFrame(auras, frameActual, ecState);

  if (siguiente === ecState.nextTickFrame) return;

  ecState.scheduleToken++;
  ecState.nextTickFrame = siguiente;

  if (siguiente == null) return;

  encolarEventoInterno(colaEventos, {
    _tipoInterno: "EC_TICK",
    frames: siguiente,
    ecToken: ecState.scheduleToken,
  });
}

function activarORefrescarEC(
  auras,
  elementoAplicado,
  triggerGauge,
  actorChar,
  frames,
  onfield,
  index,
  ecState,
  puedeAdjuntarTrigger,
) {
  if (!ecState) return false;
  if (triggerGauge <= ZERO_DUR) return false;

  if (getAuraGauge(auras, "Frozen") > ZERO_DUR) return false;

  let opuesto;
  let propio;

  if (elementoAplicado === "Hydro") {
    opuesto = "Electro";
    propio = "Hydro";
  } else if (elementoAplicado === "Electro") {
    opuesto = "Hydro";
    propio = "Electro";
  } else {
    return false;
  }

  if (getAuraGauge(auras, opuesto) <= ZERO_DUR) {
    return false;
  }

  let teniaPropio = getAuraGauge(auras, propio) > ZERO_DUR;

  if (puedeAdjuntarTrigger) {
    attachOrRefill(auras, propio, triggerGauge, actorChar);
  } else if (!teniaPropio) {
    return false;
  }

  if (!tieneAurasEC(auras)) return false;

  ecState.ownerChar = actorChar || "Unknown";
  ecState.ownerOnfield = onfield || "FALSE";
  ecState.ownerIndex = index || null;

  if (!ecState.active) {
    ecState.active = true;
    ecState.startFrame = frames;
    ecState.lastTickFrame = null;
    ecState.baseNextTickFrame = frames + EC_INITIAL_TICK_DELAY_FRAMES;
    ecState.nextTickFrame = null;
  }

  return true;
}

function tryElectroCharged(
  auras,
  elementoAplicado,
  triggerGauge,
  actorChar,
  frames,
  onfield,
  ecState,
  index,
  puedeAdjuntarTrigger,
  colaEventos,
) {
  if (auras._lunarCharged && auras._lunarCharged.enabled) {
    return tryLunarCharged(
      auras, elementoAplicado, triggerGauge, actorChar, frames, onfield, index,
      puedeAdjuntarTrigger !== false, colaEventos,
    );
  }
  let reacted = activarORefrescarEC(
    auras,
    elementoAplicado,
    triggerGauge,
    actorChar,
    frames,
    onfield,
    index,
    ecState,
    puedeAdjuntarTrigger !== false,
  );

  if (!reacted) {
    return {
      reacted: false,
      consumed: 0,
      triggerAttached: false,
      eventos: [],
    };
  }

  return {
    reacted: true,
    consumed: 0,
    triggerAttached: puedeAdjuntarTrigger !== false,
    blocksAuraAttachment: true,
    eventos: [],
  };
}

function procesarTickElectroCharged(auras, frameActual, ecState, colaEventos) {
  if (!ecState || !ecState.active) return null;
  if (!tieneAurasEC(auras)) {
    desactivarEC(ecState);
    return null;
  }

  if (ecState.nextTickFrame == null || frameActual !== ecState.nextTickFrame) {
    return null;
  }

  let puedeHacerDanio =
    ecState.lastDamageFrame == null ||
    frameActual - ecState.lastDamageFrame >= EC_DAMAGE_ICD_FRAMES;

  ecState.lastTickFrame = frameActual;
  ecState.baseNextTickFrame = frameActual + EC_TICK_INTERVAL_FRAMES;
  ecState.nextTickFrame = null;

  if (!puedeHacerDanio) {

    sincronizarEstadoEC(auras, frameActual, ecState, colaEventos);
    return null;
  }

  let actor = ecState.ownerChar || "Unknown";
  let onfield = ecState.ownerOnfield || "FALSE";
  let index = ecState.ownerIndex || null;

  encolarEventoInterno(colaEventos, {
    _tipoInterno: "EC_WANE",
    frames: frameActual + EC_WANE_DELAY_FRAMES,
  });
  ecState.lastDamageFrame = frameActual;

  let evento = crearEvento(
    actor,
    "Electro-Charged Damage",
    frameActual,
    "Electro%",
    onfield,
    0,
    "",
    "",
    "FALSE",
    null,
    index,
  );

  if (!tieneAurasEC(auras)) {
    desactivarEC(ecState);
  } else {
    sincronizarEstadoEC(auras, frameActual, ecState, colaEventos);
  }

  return evento;
}

function procesarWaneElectroCharged(auras, frames, ecState, colaEventos) {
  reduceAuraDirect(auras, "Hydro", EC_GAUGE_WANE);
  reduceAuraDirect(auras, "Electro", EC_GAUGE_WANE);
  sincronizarEstadoEC(auras, frames, ecState, colaEventos);
}
