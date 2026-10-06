function unirContribuyentes(...groups) {
  return Array.from(new Set(groups.flat().filter((actor) => actor != null && actor !== "")));
}

function registrarFuenteAura(aura, actor, gauge, sourceType) {
  actor = actor == null || actor === "" ? "Unknown" : String(actor);
  if (!aura.sourceEntries) {
    aura.sourceEntries = [];
    if (aura.gauge > ZERO_DUR) aura.sourceEntries.push({ actor: "Unknown", gauge: aura.gauge });
  }
  aura.sourceEntries.push({ actor: actor, gauge: gauge, sourceType: sourceType || "" });
  aura.gauge = Math.max(aura.gauge, gauge);
}

function reducirFuentesAura(aura, gauge, proporcional) {
  if (aura.sourceEntries) {
    if (proporcional && aura.gauge > ZERO_DUR) {
      for (let entry of aura.sourceEntries) entry.gauge = Math.max(0, entry.gauge - gauge);
      aura.sourceEntries = aura.sourceEntries.filter((entry) => entry.gauge > ZERO_DUR);
      return;
    }
    let remaining = gauge;
    for (let entry of aura.sourceEntries) {
      if (remaining <= ZERO_DUR) break;
      let consumed = Math.min(entry.gauge, remaining);
      entry.gauge -= consumed;
      remaining -= consumed;
    }
    aura.sourceEntries = aura.sourceEntries.filter((entry) => entry.gauge > ZERO_DUR);
    return;
  }
  for (let actor of Object.keys(aura.sources || {})) {
    aura.sources[actor] = Math.max(0, aura.sources[actor] - gauge);
    if (aura.sources[actor] <= ZERO_DUR) delete aura.sources[actor];
  }
}

function contribuyentesAuras(auras, elements) {
  let groups = elements.map((element) => {
    let aura = auras[element];
    if (!aura || aura.gauge <= ZERO_DUR) return [];
    if (aura.sourceEntries) return aura.sourceEntries
      .filter((entry) => entry.gauge > ZERO_DUR && entry.sourceType !== "Stellar Vortex")
      .map((entry) => entry.actor);
    if (!aura.sources) return ["Unknown"];
    return Object.keys(aura.sources).filter((actor) =>
      aura.sources[actor] > ZERO_DUR &&
      (!aura.sourceTypes || aura.sourceTypes[actor] !== "Stellar Vortex"),
    );
  });
  return unirContribuyentes(...groups);
}

function contribuyentesFrozen(auras) {
  let elements = auras._characterElements || {};
  return contribuyentesAuras(auras, ["Frozen"]).filter((name) =>
    String(elements[name] || "").toLowerCase() === "cryo",
  );
}

function contribuyentesStellar(auras, actor, includeFrozen) {
  let frozen = includeFrozen === false ? [] : contribuyentesFrozen(auras);
  return unirContribuyentes([actor], contribuyentesAuras(auras, ["Cryo"]), frozen);
}
