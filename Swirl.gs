function trySwirl(
  auras,
  elementoAplicado,
  triggerGauge,
  actorChar,
  frames,
  onfield,
  vortexState,
  index,
  stellarEnabled,
) {

  const prioridad = ["Electro", "Pyro", "Hydro", "Cryo", "Frozen"];

  let triggerRestante = triggerGauge;
  let consumidoTotal = 0;
  let elementosSwirled = [];
  let eventos = [];
  let nuevoVortexState = vortexState;
  let cryoParticipants = contribuyentesStellar(auras, actorChar, false);
  let frozenParticipants = contribuyentesFrozen(auras);

  for (let ele of prioridad) {
    if (triggerRestante <= ZERO_DUR) break;

    let elementosAura = ele === "Pyro" ? ["Pyro", "Burning"] : [ele];
    let originGauge = Math.max(...elementosAura.map((e) => getAuraGauge(auras, e)));
    if (originGauge <= ZERO_DUR) continue;

    let elementoSalida = ele === "Frozen" ? "Cryo" : ele;

    if (stellarEnabled && elementoSalida === "Cryo") {

      let consumed = reduceElement(auras, "Cryo", triggerRestante, 0.5);
      let consumedFrozen = ele === "Frozen"
        ? reduceElement(auras, "Frozen", Math.max(0, triggerRestante - consumed), 0.5)
        : 0;
      let dobleProc = ele === "Frozen" && consumedFrozen > ZERO_DUR;
      let grupos = dobleProc
        ? [cryoParticipants, unirContribuyentes([actorChar], frozenParticipants)]
        : [cryoParticipants];
      let stellarEventos = [];
      for (let grupo of grupos) {
        let stellar = procesarStellarSwirl(
          auras, null, actorChar, frames, onfield, index, nuevoVortexState, grupo,
        );
        nuevoVortexState = stellar.vortexState;
        stellarEventos.push(...stellar.eventos);
      }
      if (!(ele === "Cryo" && getAuraGauge(auras, "Frozen") > ZERO_DUR &&
        triggerRestante - consumed > ZERO_DUR)) {
        for (let grupo of grupos) eventos.push(crearEvento(
          actorChar, "Stellar Swirl Damage", frames + 3, "Anemo%", onfield,
          0, "", "", "TRUE", "Stellar Swirl", index, grupo.join(", "),
        ));
      }
      eventos.push(...stellarEventos);
      consumidoTotal += consumed + consumedFrozen;
      triggerRestante = Math.max(0, triggerRestante - consumed - consumedFrozen);
      elementosSwirled.push("Cryo");
      continue;
    }

    let reactionGauge =
      originGauge >= 0.5 * triggerRestante ? triggerRestante : originGauge;

    let consumedGauge = reduceParallelAuras(
      auras, elementosAura, triggerRestante, 0.5,
    ).consumed;
    if (ele === "Pyro") limpiarBurningExtinguido(auras);

    if (consumedGauge <= ZERO_DUR) continue;

    consumidoTotal += consumedGauge;
    triggerRestante = Math.max(0, triggerRestante - consumedGauge);
    elementosSwirled.push(elementoSalida);

    let swirlAttackGauge = (reactionGauge - 0.04) * 1.25 + 1;

    swirlAttackGauge = Math.max(0, swirlAttackGauge);

    let evento = crearEvento(
      actorChar,
      "Swirl Damage",
      frames + 1,
      elementoSalida + "%",
      onfield,
      0,
      "",
      "",
      "TRUE",
      "Swirl",
      index,
    );
    evento.spreadGauge = swirlAttackGauge;
    evento.spreadFrame = frames + 5;
    evento.spreadDealsDamage = elementoSalida !== "Hydro";
    eventos.push(evento);
  }

  if (elementosSwirled.length > 0) {
    return {
      reacted: true,
      consumed: consumidoTotal,
      elemento: elementosSwirled.join(" + "),
      eventos,
      vortexState: nuevoVortexState,
    };
  }

  return {
    reacted: false,
    consumed: 0,
    eventos: [],
    vortexState: nuevoVortexState,
  };
}
