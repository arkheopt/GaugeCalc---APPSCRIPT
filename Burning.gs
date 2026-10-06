function invalidarBurningSchedule(auras) {
  auras["_burnGeneration"] = (auras["_burnGeneration"] || 0) + 1;
  auras["_burnScheduled"] = false;
}

function limpiarBurningExtinguido(auras) {
  if (getAuraGauge(auras, "Burning") <= ZERO_DUR) {
    delete auras["Burning"];
    delete auras["BurningFuel"];
    invalidarBurningSchedule(auras);
  }
}

function burningActivo(auras) {
  return (
    getAuraGauge(auras, "Burning") > ZERO_DUR &&
    getAuraGauge(auras, "BurningFuel") > ZERO_DUR
  );
}

function iniciarBurning(
  auras,
  frameActual,
  fuelGauge,
  actorChar,
  onfield,
  index,
) {

  auras["Burning"] = { gauge: BURNING_AURA_GAUGE, decayRate: 0 };
  auras["BurningFuel"] = {
    gauge: Math.max(fuelGauge, ZERO_DUR),
    decayRate: DENDRO_CONSUMPTION_RATE,
  };

  auras["_burnGeneration"] = (auras["_burnGeneration"] || 0) + 1;
  auras["_burnScheduled"] = false;
  auras["_burnStartFrame"] = frameActual;

  auras["_burnActor"] = actorChar || "Unknown";
  auras["_burnOnfield"] = onfield || "FALSE";
  auras["_burnIndex"] = index || null;
}

function refrescarOwnershipBurning(auras, actorChar, onfield, index) {
  auras["_burnActor"] = actorChar || "Unknown";
  auras["_burnOnfield"] = onfield || "FALSE";
  auras["_burnIndex"] = index || null;
}

function sobrescribirBurningFuelConDendro(auras, triggerGauge) {

  auras["BurningFuel"] = {
    gauge: applyAuraTax(triggerGauge),
    decayRate: DENDRO_CONSUMPTION_RATE,
  };
}

function sincronizarBurning(auras, frameActual, colaEventos) {
  if (!burningActivo(auras)) return;
  if (auras["_burnScheduled"]) return;

  auras["_burnScheduled"] = true;
  let token = auras["_burnGeneration"] || 0;
  let start = auras["_burnStartFrame"];
  if (typeof start !== "number") start = frameActual;

  encolarEventoInterno(colaEventos, {
    _tipoInterno: "BURNING_TICK",
    frames: Math.max(frameActual, start + BURNING_DAMAGE_INTERVAL_FRAMES),
    burnToken: token,
    burnCounter: 1,
  });
}

function procesarTickBurning(auras, frameActual, item, colaEventos) {
  if (!burningActivo(auras)) return null;
  if (item.burnToken !== (auras["_burnGeneration"] || 0)) return null;

  let counter = item.burnCounter || 1;
  let evento = null;

  if (counter !== 9) {
    let lastPyro = auras["_burnLastPyroApplicationFrame"];
    let aplicaPyro =
      lastPyro == null || frameActual - lastPyro >= BURNING_ELEMENT_ICD_FRAMES;

    if (aplicaPyro) {

      auras["_burnLastPyroApplicationFrame"] = frameActual;
    }

    evento = crearEvento(
      auras["_burnActor"] || "Unknown",
      "Burning Damage",
      frameActual,
      "Pyro%",
      auras["_burnOnfield"] || "FALSE",
      aplicaPyro ? 1 : 0,
      "",
      "",
      "TRUE",
      "Burning",
      auras["_burnIndex"] || null,
    );
  }

  if (burningActivo(auras)) {
    encolarEventoInterno(colaEventos, {
      _tipoInterno: "BURNING_TICK",
      frames: frameActual + BURNING_DAMAGE_INTERVAL_FRAMES,
      burnToken: item.burnToken,
      burnCounter: counter + 1,
    });
  }

  return evento;
}

function consumirBurning(auras, elementoAplicado, triggerGauge, factor) {

  let res = reduceParallelAuras(
    auras,
    ["Pyro", "Burning"],
    triggerGauge,
    factor == null ? 1 : factor,
  );
  limpiarBurningExtinguido(auras);
  return res.consumed;
}

function limpiarBurning(auras) {

  if (!auras["Burning"] || auras["Burning"].gauge <= ZERO_DUR) {
    let teniaFuel = !!auras["BurningFuel"];
    delete auras["Burning"];
    delete auras["BurningFuel"];
    if (teniaFuel) invalidarBurningSchedule(auras);
    return;
  }

  if (!auras["BurningFuel"] || auras["BurningFuel"].gauge <= ZERO_DUR) {
    delete auras["Burning"];
    delete auras["BurningFuel"];
    invalidarBurningSchedule(auras);
  }
}

function tryBurning(
  auras,
  elementoAplicado,
  triggerGauge,
  frameActual,
  actorChar,
  onfield,
  index,
) {
  if (triggerGauge <= ZERO_DUR) {
    return { reacted: false, consumed: 0, eventos: [] };
  }

  let activoAntes = burningActivo(auras);

  if (elementoAplicado === "Pyro") {
    let dendro = getAuraGauge(auras, "Dendro");
    let quicken = getAuraGauge(auras, "Quicken");
    let fuelBase = Math.max(dendro, quicken);

    if (fuelBase <= ZERO_DUR) {
      return { reacted: false, consumed: 0, eventos: [] };
    }

    if (!activoAntes) {

      iniciarBurning(auras, frameActual, fuelBase, actorChar, onfield, index);
    } else {

      refrescarOwnershipBurning(auras, actorChar, onfield, index);
    }

    return {
      reacted: true,
      consumed: 0,
      eventos: [],
      blocksAuraAttachment: false,
    };
  }

  if (elementoAplicado === "Dendro") {
    let hasPyro =
      getAuraGauge(auras, "Pyro") > ZERO_DUR ||
      getAuraGauge(auras, "Burning") > ZERO_DUR;

    if (!hasPyro) {
      return { reacted: false, consumed: 0, eventos: [] };
    }

    if (!activoAntes) {

      let fuelBase = Math.max(
        getAuraGauge(auras, "Dendro"),
        getAuraGauge(auras, "Quicken"),
        applyAuraTax(triggerGauge),
      );

      iniciarBurning(auras, frameActual, fuelBase, actorChar, onfield, index);
    } else {

      sobrescribirBurningFuelConDendro(auras, triggerGauge);
      refrescarOwnershipBurning(auras, actorChar, onfield, index);
    }

    return {
      reacted: true,
      consumed: 0,
      eventos: [],
      blocksAuraAttachment: false,
    };
  }

  return { reacted: false, consumed: 0, eventos: [] };
}
