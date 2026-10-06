function applyAuraTax(dur) {
  return 0.8 * dur;
}

function calcDecayRate(gaugeOriginal) {
  let initialGauge = 0.8 * gaugeOriginal;
  let baseDuration = 2.5 * gaugeOriginal + 7;
  return initialGauge / baseDuration;
}

function decayAuras(auras, tiempoSegundos) {
  if (tiempoSegundos <= 0) return;

  if (typeof auras["_freezeDecayRate"] !== "number") {
    auras["_freezeDecayRate"] = 0.4;
  }

  let burningActivo =
    getAuraGauge(auras, "Burning") > ZERO_DUR &&
    getAuraGauge(auras, "BurningFuel") > ZERO_DUR;

  const normales = ["Electro", "Pyro", "Hydro", "Cryo", "Dendro", "Quicken"];

  for (let ele of normales) {
    let data = auras[ele];
    if (!data || data.gauge <= ZERO_DUR) continue;

    let rate = data.decayRate || 0;

    if (burningActivo && ele === "Dendro") {

      rate = Math.max(DENDRO_CONSUMPTION_RATE, rate * 2);
    } else if (burningActivo && ele === "Quicken") {

      rate = DENDRO_CONSUMPTION_RATE;
    }

    reduceAuraDirect(auras, ele, rate * tiempoSegundos, true);

    if (data.gauge <= ZERO_DUR) {
      delete auras[ele];
    }
  }

  if (auras["Frozen"] && auras["Frozen"].gauge > ZERO_DUR) {
    const accel = 0.1;
    const durationFactor = 1 - getFreezeResistance(auras);
    let rate0 = Math.max(0.4, auras["_freezeDecayRate"]);
    let g0 = auras["Frozen"].gauge;

    let reduction =
      (rate0 * tiempoSegundos + 0.5 * accel * tiempoSegundos * tiempoSegundos) /
      durationFactor;

    if (reduction + ZERO_DUR < g0) {
      reduceAuraDirect(auras, "Frozen", reduction);
      auras["_freezeDecayRate"] = rate0 + accel * tiempoSegundos;
      auras["Frozen"].decayRate = auras["_freezeDecayRate"];
    } else {

      let tExpire =
        (-rate0 + Math.sqrt(rate0 * rate0 + 2 * accel * g0 * durationFactor)) / accel;
      tExpire = Math.max(0, Math.min(tiempoSegundos, tExpire));

      let rateAtExpire = rate0 + accel * tExpire;
      delete auras["Frozen"];

      let unfrozenTime = tiempoSegundos - tExpire;
      auras["_freezeDecayRate"] = Math.max(
        0.4,
        rateAtExpire - 0.2 * unfrozenTime,
      );
    }
  } else {
    auras["_freezeDecayRate"] = Math.max(
      0.4,
      auras["_freezeDecayRate"] - 0.2 * tiempoSegundos,
    );
  }

  if (burningActivo && auras["BurningFuel"]) {
    auras["BurningFuel"].gauge = Math.max(
      0,
      auras["BurningFuel"].gauge - DENDRO_CONSUMPTION_RATE * tiempoSegundos,
    );

    if (auras["BurningFuel"].gauge <= ZERO_DUR) {

      delete auras["BurningFuel"];
      delete auras["Burning"];
      delete auras["Dendro"];
      delete auras["Quicken"];
      auras["_burnGeneration"] = (auras["_burnGeneration"] || 0) + 1;
      auras["_burnScheduled"] = false;
    }
  }
}

function getFreezeResistance(auras) {
  let resistance = Number(auras._freezeResistance) || 0;
  return Math.max(0, Math.min(1, resistance));
}

function getAuraGauge(auras, elemento) {
  return auras[elemento] ? auras[elemento].gauge : 0;
}

function reduceAuraDirect(auras, elemento, amount, proporcional) {
  if (!auras[elemento]) return 0;
  let current = auras[elemento].gauge;
  let reduced = Math.min(current, amount);
  auras[elemento].gauge = current - reduced;

  reducirFuentesAura(auras[elemento], reduced, !!proporcional);
  if (auras[elemento].gauge <= ZERO_DUR) delete auras[elemento];
  return reduced;
}

function reduceElement(auras, elemento, dur, factor) {
  return reduceAuraDirect(auras, elemento, dur * factor) / factor;
}

function reduceParallelAuras(auras, elementos, triggerGauge, factor) {
  let consumido = 0;
  let reducciones = {};

  for (let ele of elementos) {
    if (getAuraGauge(auras, ele) <= ZERO_DUR) continue;
    let c = reduceElement(auras, ele, triggerGauge, factor);
    reducciones[ele] = c;
    consumido = Math.max(consumido, c);
  }

  return { consumed: consumido, reductions: reducciones };
}

function attachOrRefill(auras, elemento, dur, src, sourceType) {
  let amt = applyAuraTax(dur);
  if (amt <= ZERO_DUR) return;
  if (["Hydro", "Electro", "Cryo"].includes(elemento)) {
    let data = auras[elemento];
    if (!data || data.gauge <= ZERO_DUR) {
      data = { gauge: 0, decayRate: calcDecayRate(dur), sources: Object.create(null) };
      auras[elemento] = data;
    }
    registrarFuenteAura(data, src, amt, sourceType);
    return;
  }
  if (elemento === "Pyro") {
    if (auras[elemento]) {
      if (amt > auras[elemento].gauge) {
        auras[elemento].gauge = amt;
        auras[elemento].decayRate = calcDecayRate(dur);
      }
    } else {
      auras[elemento] = { gauge: amt, decayRate: calcDecayRate(dur) };
    }
  } else if (["Electro", "Hydro", "Cryo", "Dendro"].includes(elemento)) {
    if (auras[elemento]) {
      let add = Math.max(amt - auras[elemento].gauge, 0);
      if (add > 0) auras[elemento].gauge += add;
    } else {
      auras[elemento] = { gauge: amt, decayRate: calcDecayRate(dur) };
    }
  }
}
