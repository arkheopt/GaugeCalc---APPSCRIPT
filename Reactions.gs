function tryVaporize(
  auras,
  elementoAplicado,
  triggerGauge,
  actorChar,
  frames,
  onfield,
) {
  let consumed = 0,
    amped = false,
    ampMult = 1;

  switch (elementoAplicado) {
    case "Pyro": {
      if (getAuraGauge(auras, "Hydro") <= ZERO_DUR) {
        return { reacted: false, consumed: 0, amped: false, eventos: [] };
      }

      if (getAuraGauge(auras, "Frozen") > ZERO_DUR) {
        return { reacted: false, consumed: 0, amped: false, eventos: [] };
      }

      consumed = reduceElement(auras, "Hydro", triggerGauge, 0.5);
      return {
        reacted: consumed > 0,
        consumed,
        amped: consumed > 0,
        ampMult: consumed > 0 ? 1.5 : 1,
        eventos: [],
      };
    }

    case "Hydro": {
      if (
        getAuraGauge(auras, "Pyro") <= ZERO_DUR &&
        getAuraGauge(auras, "Burning") <= ZERO_DUR
      ) {
        return { reacted: false, consumed: 0, amped: false, eventos: [] };
      }

      let res = reduceParallelAuras(
        auras,
        ["Pyro", "Burning"],
        triggerGauge,
        2,
      );
      limpiarBurningExtinguido(auras);

      consumed = res.consumed;
      amped = consumed > 0;
      ampMult = amped ? 2 : 1;

      return { reacted: amped, consumed, amped, ampMult, eventos: [] };
    }

    default:
      return { reacted: false, consumed: 0, amped: false, eventos: [] };
  }
}

function tryMelt(
  auras,
  elementoAplicado,
  triggerGauge,
  actorChar,
  frames,
  onfield,
) {
  let consumed = 0,
    amped = false,
    ampMult = 1;

  switch (elementoAplicado) {
    case "Pyro": {
      if (
        getAuraGauge(auras, "Cryo") <= ZERO_DUR &&
        getAuraGauge(auras, "Frozen") <= ZERO_DUR
      ) {
        return { reacted: false, consumed: 0, amped: false, eventos: [] };
      }

      let res = reduceParallelAuras(auras, ["Cryo", "Frozen"], triggerGauge, 2);
      consumed = res.consumed;
      amped = consumed > 0;
      ampMult = amped ? 2 : 1;

      return { reacted: amped, consumed, amped, ampMult, eventos: [] };
    }

    case "Cryo": {
      if (
        getAuraGauge(auras, "Pyro") <= ZERO_DUR &&
        getAuraGauge(auras, "Burning") <= ZERO_DUR
      ) {
        return { reacted: false, consumed: 0, amped: false, eventos: [] };
      }

      let res = reduceParallelAuras(
        auras,
        ["Pyro", "Burning"],
        triggerGauge,
        0.5,
      );
      limpiarBurningExtinguido(auras);

      consumed = res.consumed;
      amped = consumed > 0;
      ampMult = amped ? 1.5 : 1;

      return { reacted: amped, consumed, amped, ampMult, eventos: [] };
    }

    default:
      return { reacted: false, consumed: 0, amped: false, eventos: [] };
  }
}

function tryOverload(
  auras,
  elementoAplicado,
  triggerGauge,
  actorChar,
  frames,
  onfield,
) {
  let consumed = 0;
  let evento = null;

  switch (elementoAplicado) {
    case "Electro": {
      if (
        getAuraGauge(auras, "Pyro") <= ZERO_DUR &&
        getAuraGauge(auras, "Burning") <= ZERO_DUR
      ) {
        return { reacted: false, consumed: 0, eventos: [] };
      }

      let res = reduceParallelAuras(
        auras,
        ["Pyro", "Burning"],
        triggerGauge,
        1,
      );
      limpiarBurningExtinguido(auras);
      consumed = res.consumed;

      if (consumed > 0) {
        evento = crearEvento(
          actorChar,
          "Overload Damage",
          frames,
          "Pyro%",
          onfield,
          0,
          "",
          "",
          "TRUE",
          "Overload",
          null,
        );
        return { reacted: true, consumed, eventos: [evento] };
      }
      return { reacted: false, consumed: 0, eventos: [] };
    }

    case "Pyro": {
      if (getAuraGauge(auras, "Electro") <= ZERO_DUR) {
        return { reacted: false, consumed: 0, eventos: [] };
      }

      consumed = reduceElement(auras, "Electro", triggerGauge, 1);
      if (consumed > 0) {
        evento = crearEvento(
          actorChar,
          "Overload Damage",
          frames,
          "Pyro%",
          onfield,
          0,
          "",
          "",
          "TRUE",
          "Overload",
          null,
        );
        return { reacted: true, consumed, eventos: [evento] };
      }
      return { reacted: false, consumed: 0, eventos: [] };
    }

    default:
      return { reacted: false, consumed: 0, eventos: [] };
  }
}

function trySuperconduct(
  auras,
  elementoAplicado,
  triggerGauge,
  actorChar,
  frames,
  onfield,
) {
  let evento = null;
  let consumed = 0;

  if (elementoAplicado === "Electro") {
    if (
      getAuraGauge(auras, "Cryo") <= ZERO_DUR &&
      getAuraGauge(auras, "Frozen") <= ZERO_DUR
    ) {
      return { reacted: false, consumed: 0, eventos: [] };
    }

    let res = reduceParallelAuras(auras, ["Cryo", "Frozen"], triggerGauge, 1);
    consumed = res.consumed;
  } else if (elementoAplicado === "Cryo") {
    if (getAuraGauge(auras, "Electro") <= ZERO_DUR) {
      return { reacted: false, consumed: 0, eventos: [] };
    }
    consumed = reduceElement(auras, "Electro", triggerGauge, 1);
  } else {
    return { reacted: false, consumed: 0, eventos: [] };
  }

  if (consumed > 0) {
    evento = crearEvento(
      actorChar,
      "Superconduct Damage",
      frames,
      "Cryo%",
      onfield,
      0,
      "",
      "",
      "TRUE",
      "Superconduct",
      null,
    );
    return { reacted: true, consumed, eventos: [evento] };
  }

  return { reacted: false, consumed: 0, eventos: [] };
}

function tryFreeze(
  auras,
  elementoAplicado,
  triggerGauge,
  actorChar,
  frames,
  onfield,
  vortexState,
  sourceType,
) {
  let consumed = 0;
  let frozenGauge = 0;
  let nuevoVortexState = vortexState;

  switch (elementoAplicado) {
    case "Hydro": {
      let cryo = getAuraGauge(auras, "Cryo");
      if (cryo <= ZERO_DUR) {
        return { reacted: false, consumed: 0, eventos: [] };
      }

      let d = Math.min(cryo, triggerGauge);
      consumed = reduceElement(auras, "Cryo", triggerGauge, 1);
      frozenGauge = 2 * d;
      break;
    }

    case "Cryo": {
      let hydro = getAuraGauge(auras, "Hydro");
      if (hydro <= ZERO_DUR) {
        return { reacted: false, consumed: 0, eventos: [] };
      }

      let d = Math.min(hydro, triggerGauge);
      consumed = reduceElement(auras, "Hydro", triggerGauge, 1);
      frozenGauge = 2 * d;
      break;
    }

    default:
      return { reacted: false, consumed: 0, eventos: [] };
  }

  let reacted = frozenGauge > ZERO_DUR;
  if (getFreezeResistance(auras) >= 1) frozenGauge = 0;
  if (frozenGauge > ZERO_DUR) {
    if (typeof auras["_freezeDecayRate"] !== "number") {
      auras["_freezeDecayRate"] = 0.4;
    }

    if (!auras.Frozen) {
      auras.Frozen = { gauge: 0, sources: Object.create(null) };
    }
    registrarFuenteAura(auras.Frozen, actorChar, frozenGauge, sourceType);
    auras.Frozen.decayRate = auras._freezeDecayRate;

  }

  return {
    reacted: reacted,
    consumed,
    eventos: [],
    vortexState: nuevoVortexState,
  };
}

function tryBloom(
  auras,
  elementoAplicado,
  triggerGauge,
  actorChar,
  frames,
  onfield,
) {
  let consumed = 0;
  let evento = null;

  switch (elementoAplicado) {
    case "Hydro": {

      let hasDendro = getAuraGauge(auras, "Dendro") > ZERO_DUR;
      let hasQuicken = getAuraGauge(auras, "Quicken") > ZERO_DUR;
      let hasFuel = getAuraGauge(auras, "BurningFuel") > ZERO_DUR;

      if (!hasDendro && !hasQuicken && !hasFuel) {
        return { reacted: false, consumed: 0, eventos: [] };
      }

      let res = reduceParallelAuras(
        auras,
        ["Dendro", "Quicken", "BurningFuel"],
        triggerGauge,
        0.5,
      );
      consumed = res.consumed;

      if (consumed <= ZERO_DUR) {
        return { reacted: false, consumed: 0, eventos: [] };
      }

      return { reacted: true, consumed, eventos: [] };
    }

    case "Dendro": {
      if (getAuraGauge(auras, "Hydro") <= ZERO_DUR) {
        return { reacted: false, consumed: 0, eventos: [] };
      }

      consumed = reduceElement(auras, "Hydro", triggerGauge, 2);

      if (consumed <= ZERO_DUR) {
        return { reacted: false, consumed: 0, eventos: [] };
      }

      return { reacted: true, consumed, eventos: [] };
    }

    default:
      return { reacted: false, consumed: 0, eventos: [] };
  }
}

function tryQuicken(
  auras,
  elementoAplicado,
  triggerGauge,
  actorChar,
  frames,
  onfield,
) {
  let consumed = 0;

  switch (elementoAplicado) {
    case "Dendro":
      if (getAuraGauge(auras, "Electro") <= ZERO_DUR) {
        return { reacted: false, consumed: 0, eventos: [] };
      }
      consumed = reduceElement(auras, "Electro", triggerGauge, 1);
      break;

    case "Electro":
      if (getAuraGauge(auras, "Dendro") <= ZERO_DUR) {
        return { reacted: false, consumed: 0, eventos: [] };
      }
      consumed = reduceParallelAuras(
        auras, ["Dendro", "BurningFuel"], triggerGauge, 1,
      ).consumed;
      break;

    default:
      return { reacted: false, consumed: 0, eventos: [] };
  }

  if (consumed > ZERO_DUR) {

    let quickenGauge = consumed;
    let duration = 5 * quickenGauge + 6;
    let decay = quickenGauge / duration;

    if (auras["Quicken"]) {
      if (quickenGauge > auras["Quicken"].gauge) {
        auras["Quicken"].gauge = quickenGauge;
        auras["Quicken"].decayRate = decay;
      }
    } else {
      auras["Quicken"] = {
        gauge: quickenGauge,
        decayRate: decay,
      };
    }
  }

  return {
    reacted: consumed > ZERO_DUR,
    consumed,
    eventos: [],
    quickenBloom: consumed > ZERO_DUR && getAuraGauge(auras, "Hydro") > ZERO_DUR,
  };
}

function tryQuickenBloom(auras) {
  let quicken = getAuraGauge(auras, "Quicken");
  if (quicken <= ZERO_DUR || getAuraGauge(auras, "Hydro") <= ZERO_DUR) {
    return { reacted: false, consumed: 0 };
  }
  let consumed = reduceElement(auras, "Hydro", quicken, 2);
  reduceAuraDirect(auras, "Quicken", consumed);
  return { reacted: consumed > ZERO_DUR, consumed: consumed };
}

function tryShatterGeo(
  auras,
  elementoAplicado,
  triggerGauge,
  actorChar,
  frames,
  onfield,
) {
  return tryShatter(auras, elementoAplicado, actorChar, frames, onfield, {});
}

function tryShatter(auras, elementoAplicado, actorChar, frames, onfield, attack) {
  attack = attack || {};
  if (elementoAplicado !== "Geo" && !attack.blunt) {
    return { reacted: false, consumed: 0, eventos: [] };
  }

  if (getAuraGauge(auras, "Frozen") <= ZERO_DUR) {
    return { reacted: false, consumed: 0, eventos: [] };
  }

  if (attack.blunt && attack.poise > 0) {
    reduceAuraDirect(auras, "Frozen", 0.15 * attack.poise / 25);
  }
  let reducido = reduceAuraDirect(auras, "Frozen", SHATTER_FROZEN_CONSUMPTION);

  if (reducido <= ZERO_DUR) {
    return { reacted: false, consumed: 0, eventos: [] };
  }

  let evento = crearEvento(
    actorChar,
    "Shatter Damage",
    frames,
    "Fisico%",
    onfield,
    0,
    "",
    "",
    "FALSE",
    "Shatter",
    null,
  );

  return {
    reacted: true,
    consumed: 0,
    eventos: [evento],
    blocksAuraAttachment: false,
  };
}

function tryCrystallize(auras, elementoAplicado, triggerGauge, actorChar, frames, onfield, index) {
  if (elementoAplicado !== "Geo" || triggerGauge <= ZERO_DUR) {
    return { reacted: false, consumed: 0, eventos: [] };
  }
  let remaining = triggerGauge;
  let consumed = 0;
  let eventos = [];
  let names = [];
  let element = null;
  for (let ele of ["Electro", "Hydro", "Cryo", "Pyro", "Frozen"]) {
    if (remaining <= ZERO_DUR) break;
    if (ele === "Hydro" && auras._lunarCrystallize && auras._lunarCrystallize.enabled) {
      let lunar = tryLunarCrystallize(auras, remaining, actorChar, frames, onfield, index);
      if (lunar.reacted) {
        consumed += lunar.consumed;
        remaining -= lunar.consumed;
        names.push(lunar.reactionName);
        eventos.push(...lunar.eventos);
      }
      continue;
    }
    if (frames < (auras._crystallizeReadyFrame == null ? -Infinity : auras._crystallizeReadyFrame)) continue;
    let elements = ele === "Pyro" ? ["Pyro", "Burning"] : [ele];
    let result = reduceParallelAuras(auras, elements, remaining, 0.5);
    if (result.consumed <= ZERO_DUR) continue;
    consumed += result.consumed;
    remaining -= result.consumed;
    if (ele === "Pyro") limpiarBurningExtinguido(auras);
    auras._crystallizeReadyFrame = frames + 60;
    element = ele === "Frozen" ? "Cryo" : ele;
    names.push("Crystallize");
  }
  return { reacted: names.length > 0, consumed: consumed, elemento: element,
    reactionName: names.join(", "), eventos: eventos };
}

function tryAggravate(
  auras,
  elementoAplicado,
  triggerGauge,
  actorChar,
  frames,
  onfield,
) {
  if (getAuraGauge(auras, "Quicken") > ZERO_DUR) {
    return {
      reacted: true,
      consumed: 0,
      eventos: [],

      blocksAuraAttachment: false,
    };
  }
  return { reacted: false, consumed: 0, eventos: [] };
}

function trySpread(
  auras,
  elementoAplicado,
  triggerGauge,
  actorChar,
  frames,
  onfield,
) {
  if (getAuraGauge(auras, "Quicken") > ZERO_DUR) {
    return {
      reacted: true,
      consumed: 0,
      eventos: [],

      blocksAuraAttachment: false,
    };
  }
  return { reacted: false, consumed: 0, eventos: [] };
}
