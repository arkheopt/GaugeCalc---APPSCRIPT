function aplicarAtaque(
  auras,
  nucleos,
  elemento,
  gauge,
  esAOE,
  framesActual,
  framesAnterior,
  actorChar,
  onfield,
  reaccionOrigen,
  index,
  vortexState,
  stellarEnabled,
  ecState,
  colaEventos,
  attack,
) {
  if (!Array.isArray(nucleos)) nucleos = [];

  let tiempo = (framesActual - framesAnterior) / 60;
  if (tiempo > 0) decayAuras(auras, tiempo);

  if (!reaccionOrigen || (attack && attack.aplicaElemento)) {
    registrarAplicacionSC(auras, elemento, gauge, actorChar, framesActual);
  }

  let eventosGenerados = [];
  limpiarBurning(auras);

  let nuevoVortexState = vortexState;

  let resultadoExp = limpiarNucleosExpirados(nucleos, framesActual);
  nucleos = resultadoExp.nucleos;
  let detonadosExp = resultadoExp.detonados;
  let filasExplosion = resultadoExp.filas || [];

  let shatter = reaccionOrigen && !(attack && attack.aplicaElemento)
    ? { reacted: false, eventos: [] }
    : tryShatter(auras, elemento, actorChar, framesActual, onfield, attack);
  if (shatter.reacted) eventosGenerados.push(...shatter.eventos);

  if (gauge <= ZERO_DUR || elemento === "Fisico") {
    sincronizarEstadoEC(auras, framesActual, ecState, colaEventos);
    sincronizarBurning(auras, framesActual, colaEventos);
    let filasCompletas = filasExplosion.map((f) =>
      convertirFilaExplosion(f, nucleos.length, 1, auras),
    );
    return {
      reacciones: shatter.reacted ? "Shatter" : (reaccionOrigen || "ninguna"),
      consumido: 0,
      amped: false,
      ampMult: 1,
      auras: auras,
      nucleos: nucleos,
      nucleosGenerados: 0,
      nucleosDetonados: detonadosExp,
      filasExplosion: filasCompletas,
      eventosGenerados: eventosGenerados,
      vortexState: nuevoVortexState,
      ecState: ecState,
    };
  }

  if (reaccionOrigen && !(attack && attack.aplicaElemento)) {
    sincronizarEstadoEC(auras, framesActual, ecState, colaEventos);
    sincronizarBurning(auras, framesActual, colaEventos);
    let filasCompletas = filasExplosion.map((f) =>
      convertirFilaExplosion(f, nucleos.length, 1, auras),
    );
    return {
      reacciones: reaccionOrigen,
      consumido: 0,
      amped: false,
      ampMult: 1,
      auras: auras,
      nucleos: nucleos,
      nucleosGenerados: 0,
      nucleosDetonados: detonadosExp,
      filasExplosion: filasCompletas,
      eventosGenerados: eventosGenerados,
      vortexState: nuevoVortexState,
      ecState: ecState,
    };
  }

  let triggerRestante = gauge;
  let reacciones = getReactionPriority(
    elemento,
    auras,
    nucleos,
    framesActual,
    esAOE,
  );

  let consumidoTotal = 0;
  let amped = false;
  let ampMult = 1;
  let reaccionesOcurridas = shatter.reacted ? ["Shatter"] : [];
  let nucleosGenerados = 0;
  let nucleosDetonados = detonadosExp;
  let triggerAdjuntado = false;
  let reaccionBloqueaAdjunto = false;

  for (let reaccion of reacciones) {
    if (triggerRestante <= ZERO_DUR) break;

    let result;

    if (reaccion.nombre === "Swirl") {
      result = reaccion.func(
        auras,
        elemento,
        triggerRestante,
        actorChar,
        framesActual,
        onfield,
        nuevoVortexState,
        index,
        stellarEnabled,
      );
    } else if (reaccion.nombre === "ElectroCharged") {
      result = reaccion.func(
        auras,
        elemento,
        triggerRestante,
        actorChar,
        framesActual,
        onfield,
        ecState,
        index,
        !reaccionBloqueaAdjunto,
        colaEventos,
      );
    } else if (reaccion.nombre === "Superconduct" && auras._stellarConduct && auras._stellarConduct.enabled) {
      result = tryStellarConduct(auras, elemento, triggerRestante, actorChar,
        framesActual, onfield, colaEventos);
    } else if (reaccion.nombre === "Crystallize") {
      result = tryCrystallize(auras, elemento, triggerRestante, actorChar,
        framesActual, onfield, index);
    } else if (reaccion.nombre === "Burning") {
      result = reaccion.func(
        auras,
        elemento,
        triggerRestante,
        framesActual,
        actorChar,
        onfield,
        index,
        attack && attack.sourceType,
      );
    } else {
      result = reaccion.func(
        auras,
        elemento,
        triggerRestante,
        actorChar,
        framesActual,
        onfield,
        attack && attack.sourceType,
      );
    }

    if (result && result.reacted) {
      let nombreReaccion = result.reactionName || reaccion.nombre;

      if (nombreReaccion === "Swirl" && result.elemento) {
        nombreReaccion = "Swirl " + result.elemento;
        if (result.eventos && result.eventos.length > 0) {
          for (let ev of result.eventos) {
            if (ev.reaccionOrigen === "Stellar Swirl") {
              nombreReaccion = "Stellar Swirl";
              break;
            }
          }
        }
      }

      reaccionesOcurridas.push(nombreReaccion);

      if (result.quickenBloom) {
        encolarEventoInterno(colaEventos, {
          _tipoInterno: "QUICKEN_BLOOM",
          frames: framesActual,
          actorChar: actorChar,
          onfield: onfield,
          index: index,
        });
      }

      let consumido = result.consumed || 0;
      consumidoTotal += consumido;
      triggerRestante = Math.max(0, triggerRestante - consumido);

      if (result.triggerAttached) {
        triggerAdjuntado = true;
      }

      if (result.blocksAuraAttachment !== false) {
        reaccionBloqueaAdjunto = true;
      }

      if (result.amped) {
        amped = true;
        ampMult = result.ampMult || 1;
      }

      if (reaccion.nombre === "Bloom" && result.reacted) {
        let resultadoAgregar = agregarNucleo(nucleos, framesActual, actorChar, colaEventos);
        nucleos = resultadoAgregar.nucleos;
        nucleosDetonados += resultadoAgregar.detonados;
        nucleosGenerados++;
        if (resultadoAgregar.filas) {
          filasExplosion = filasExplosion.concat(resultadoAgregar.filas);
        }
      }

      if (reaccion.nombre === "Hyperbloom" || reaccion.nombre === "Burgeon") {
        nucleosDetonados += result.detonados || 0;
        nucleos = result.nucleosRestantes || nucleos;
      }

      if (result.eventos && result.eventos.length > 0) {
        eventosGenerados = eventosGenerados.concat(result.eventos);
      }

      if (result.vortexState) {
        nuevoVortexState = result.vortexState;
      }
    }
  }

  if (
    !triggerAdjuntado &&
    !reaccionBloqueaAdjunto &&
    triggerRestante > ZERO_DUR &&
    ["Pyro", "Electro", "Hydro", "Cryo", "Dendro"].includes(elemento)
  ) {
    attachOrRefill(auras, elemento, triggerRestante, actorChar,
      attack && attack.sourceType);

  }

  limpiarBurning(auras);
  for (let ele in auras) {
    if (auras[ele] && auras[ele].gauge <= ZERO_DUR) delete auras[ele];
  }

  sincronizarEstadoEC(auras, framesActual, ecState, colaEventos);
  sincronizarBurning(auras, framesActual, colaEventos);
  sincronizarVortex(nuevoVortexState, colaEventos);

  let filasCompletas = filasExplosion.map((f) =>
    convertirFilaExplosion(f, nucleos.length, 1, auras),
  );

  return {
    reacciones: reaccionesOcurridas.length
      ? reaccionesOcurridas.join(", ")
      : "ninguna",
    consumido: consumidoTotal,
    amped: amped,
    ampMult: ampMult,
    auras: auras,
    nucleos: nucleos,
    nucleosGenerados: nucleosGenerados,
    nucleosDetonados: nucleosDetonados,
    filasExplosion: filasCompletas,
    eventosGenerados: eventosGenerados,
    vortexState: nuevoVortexState,
    ecState: ecState,
  };
}

/** @customfunction */
function PROCESAR_REACCIONES(rango, resistenciaFreeze, lunarCharged, lunarCrystallize, stellarConduct) {
  let data;
  if (Array.isArray(rango)) {
    data = rango;
  } else if (rango.getValues) {
    data = rango.getValues();
  } else {
    data = [[rango]];
  }

  if (data.length === 0) return [["No data"]];

  let stellarEnabled = false;
  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    if (row.length > 1) {
      let actor = String(row[1]).trim();
      if (STELLAR_SWIRL_ENABLERS.includes(actor)) {
        stellarEnabled = true;
        break;
      }
    }
  }

  let lcEnabled = lunarChargedHabilitado(data, lunarCharged);
  let lcrEnabled = reaccionHabilitada(data, lunarCrystallize,
    LUNAR_CRYSTALLIZE_ENABLERS, "Lunar-Crystallize");
  let scEnabled = reaccionHabilitada(data, stellarConduct, STELLAR_CONDUCT_ENABLERS, "Stellar-Conduct");
  let auras = {
    _stellarConduct: crearEstadoSC(scEnabled),
    _lunarCrystallize: crearEstadoLCr(lcrEnabled),
    _characterElements: Object.create(null),
    _freezeResistance: Number(resistenciaFreeze) || 0,
    _lunarCharged: crearEstadoLC(lcEnabled),
  };
  let nucleos = [];
  let lastFrame = 0;
  let salida = [];
  let todasFilasExplosion = [];
  let colaEventos = [];
  let vortexState = null;
  let ecState = crearEstadoEC();

  let header = data[0].slice();
  while (header.length < 10) header.push("");
  let normalizedHeaders = header.map((h) => String(h).trim().toLowerCase());
  let bluntColumn = normalizedHeaders.findIndex((h) => ["blunt", "contundente"].includes(h));
  let poiseColumn = normalizedHeaders.findIndex((h) => ["poise", "poisedmg"].includes(h));
  let damageTypeColumn = normalizedHeaders.indexOf("damagetype");
  let characterElementColumn = normalizedHeaders.indexOf("characterelement");
  if (characterElementColumn >= 0) {
    for (let row of data.slice(1)) {
      if (row[characterElementColumn]) {
        auras._characterElements[String(row[1]).trim()] = String(row[characterElementColumn]).trim();
      }
    }
  }
  let showLCrParticipants = lcrEnabled || (damageTypeColumn >= 0 &&
    data.slice(1).some((row) => esDanioLunarCrystallize(row[damageTypeColumn])));
  let showLCParticipants = lcEnabled || (damageTypeColumn >= 0 &&
    data.slice(1).some((row) => esDanioLunarCharged(row[damageTypeColumn])));

  let outputHeader = [
    ...header,
    "Reacción",
    "Consumido",
    "AmpMult",
    "Núcleos Activos",
    "Núcleos Detonados",
    "Participantes SS",
    "Auras",
  ];
  salida.push(outputHeader);

  for (let i = 1; i < data.length; i++) {
    let row = data[i].slice();
    while (row.length < header.length) row.push("");

    let isEmpty = row.every((cell) => !cell || cell.toString().trim() === "");
    if (isEmpty) continue;

    let frames = parseFloat(row[3]) || 0;

    encolarEventoInterno(colaEventos, {
      _tipoInterno: "INPUT",
      frames: frames,
      row: row,
    });
  }

  function prioridadInterna(item) {

    if (item._tipoInterno.startsWith("SC_")) return -1;
    if (item._tipoInterno === "CORE_EXPIRE") return -1;
    if (item._tipoInterno === "INPUT") return 0;
    if (item._tipoInterno === "EC_TICK") return 1;
    if (item._tipoInterno === "LC_TICK") return 1;
    if (item._tipoInterno === "BURNING_TICK") return 1;
    if (item._tipoInterno === "VORTEX_EXPIRE") return 1;
    if (item._tipoInterno === "QUICKEN_BLOOM") return 3;
    return 2;
  }

  function encolarEventosGenerados(eventos) {
    if (!eventos || !eventos.length) return;
    for (let ev of eventos) {
      encolarEventoInterno(colaEventos, {
        _tipoInterno: "GENERADO",
        frames: ev.frames || 0,
        evento: ev,
      });
    }
  }

  function guardarSalida(row) {
    row._scStacks = stacksStellarConduct(auras._stellarConduct, Number(row[3]) || 0);
    salida.push(row);
  }

  function guardarFilasExplosion(filas) {
    if (filas && filas.length) {
      for (let row of filas) row._scStacks = stacksStellarConduct(auras._stellarConduct, Number(row[3]) || 0);
      todasFilasExplosion = todasFilasExplosion.concat(filas);
    }
  }

  while (colaEventos.length > 0) {
    colaEventos.sort((a, b) => {
      let df = (a.frames || 0) - (b.frames || 0);
      if (df !== 0) return df;

      let dp = prioridadInterna(a) - prioridadInterna(b);
      if (dp !== 0) return dp;

      return (a._seq || 0) - (b._seq || 0);
    });

    let item = colaEventos.shift();
    let frames = parseFloat(item.frames) || 0;

    if (item._tipoInterno.startsWith("SC_") && !eventoSCVigente(auras._stellarConduct, item)) continue;

    if (item._tipoInterno === "LC_TICK" &&
        (item.lcToken !== auras._lunarCharged.generation ||
         frames !== auras._lunarCharged.nextPollFrame)) {
      continue;
    }

    if (item._tipoInterno === "CORE_EXPIRE" && !nucleos.includes(item.nucleo)) {
      continue;
    }
    if (item._tipoInterno === "VORTEX_EXPIRE" &&
        (item.vortex !== vortexState || vortexState.expirado || vortexState.exploto)) {
      continue;
    }

    if (
      item._tipoInterno === "EC_TICK" &&
      (!ecState.active ||
        item.ecToken !== ecState.scheduleToken ||
        frames !== ecState.nextTickFrame)
    ) {
      continue;
    }

    if (
      item._tipoInterno === "BURNING_TICK" &&
      item.burnToken !== (auras["_burnGeneration"] || 0)
    ) {
      continue;
    }

    if (frames > lastFrame) {
      decayAuras(auras, (frames - lastFrame) / 60);
      lastFrame = frames;

      sincronizarEstadoEC(auras, frames, ecState, colaEventos);
    }

    if (item._tipoInterno.startsWith("SC_")) {
      let action = procesarEventoSC(auras._stellarConduct, item, colaEventos);
      guardarSalida([null, "", action, frames, "", "FALSE", 0, "", "", "FALSE",
        "Polestar Field", 0, 1, nucleos.length, 0, "", formatAuras(auras)]);
      continue;
    }

    if (item._tipoInterno === "CORE_EXPIRE") {
      let expired = limpiarNucleosExpirados(nucleos, frames);
      nucleos = expired.nucleos;
      for (let fila of expired.filas) {
        guardarSalida(convertirFilaExplosion(fila, nucleos.length, 1, auras));
      }
      continue;
    }

    if (item._tipoInterno === "EC_WANE") {
      procesarWaneElectroCharged(auras, frames, ecState, colaEventos);
      continue;
    }

    if (item._tipoInterno === "VORTEX_EXPIRE") {
      let expired = verificarExplosionVortex(vortexState, auras, frames);
      vortexState = expired.vortexState;
      encolarEventosGenerados(expired.eventos);
      continue;
    }

    if (item._tipoInterno === "QUICKEN_BLOOM") {
      let bloom = tryQuickenBloom(auras);
      if (!bloom.reacted) continue;
      let agregado = agregarNucleo(nucleos, frames, item.actorChar, colaEventos);
      nucleos = agregado.nucleos;
      for (let fila of agregado.filas) {
        guardarSalida(convertirFilaExplosion(fila, nucleos.length, 1, auras));
      }
      sincronizarEstadoEC(auras, frames, ecState, colaEventos);
      guardarSalida([
        item.index, item.actorChar, "Quicken Bloom (core creation)", frames,
        "Dendro%", item.onfield, 0, "", "", "FALSE",
        "Bloom", bloom.consumed, 1, nucleos.length, agregado.detonados,
        "", formatAuras(auras),
      ]);
      continue;
    }

    if (item._tipoInterno === "LC_TICK") {
      let event = procesarTickLunarCharged(auras, frames, item, colaEventos);
      if (!event) continue;

      let damageRow = [
        event.index, event.char, event.action, frames, "Electro%", event.onfield,
        0, "", "", "FALSE", "Lunar-Charged", 0, 1, nucleos.length, 0,
        "", formatAuras(auras),
      ];
      damageRow._lcParticipants = event.participantesLC;
      guardarSalida(damageRow);
      continue;
    }

    if (item._tipoInterno === "EC_TICK") {
      let eventoEC = procesarTickElectroCharged(
        auras,
        frames,
        ecState,
        colaEventos,
      );

      if (!eventoEC) continue;

      let rowEC = [
        eventoEC.index || null,
        eventoEC.char || "Unknown",
        eventoEC.action || "Electro-Charged Damage",
        eventoEC.frames || 0,
        eventoEC.elemento || "Electro%",
        eventoEC.onfield || "FALSE",
        0,
        "",
        "",
        "FALSE",
      ];

      guardarSalida([
        ...rowEC,
        "ninguna",
        0,
        1,
        nucleos.length,
        0,
        "",
        formatAuras(auras),
      ]);

      continue;
    }

    if (item._tipoInterno === "BURNING_TICK") {

      if (!burningActivo(auras)) continue;

      let eventoBurn = procesarTickBurning(auras, frames, item, colaEventos);

      if (!eventoBurn) continue;

      let burnResult = aplicarAtaque(
        auras, nucleos, "Pyro", eventoBurn.gauge, true, frames, frames,
        eventoBurn.char, eventoBurn.onfield, null, eventoBurn.index,
        vortexState, stellarEnabled, ecState, colaEventos,
      );
      nucleos = burnResult.nucleos;
      vortexState = burnResult.vortexState;
      guardarFilasExplosion(burnResult.filasExplosion);
      encolarEventosGenerados(burnResult.eventosGenerados);

      guardarSalida([
        eventoBurn.index || null,
        eventoBurn.char || "Unknown",
        eventoBurn.action || "Burning Damage",
        eventoBurn.frames || 0,
        eventoBurn.elemento || "Pyro%",
        eventoBurn.onfield || "FALSE",
        eventoBurn.gauge || 0,
        eventoBurn.icdTime || "",
        eventoBurn.icdTag || "",
        eventoBurn.aoe || "TRUE",
        burnResult.reacciones === "ninguna" ? "Burning" : burnResult.reacciones,
        burnResult.consumido,
        burnResult.ampMult,
        nucleos.length,
        burnResult.nucleosDetonados,
        "",
        formatAuras(auras),
      ]);

      continue;
    }

    if (item._tipoInterno === "INPUT") {
      let row = item.row;
      let index = row[0] || null;
      let actorChar = String(row[1]).trim();
      let elementoRaw = String(row[4]).trim();
      let gauge = parseFloat(row[6]) || 0;
      let onfield = row[5] || "FALSE";

      let aoeStr = String(row[9]).trim().toUpperCase();
      let esAOE =
        aoeStr === "SÍ" ||
        aoeStr === "SI" ||
        aoeStr === "TRUE" ||
        aoeStr === "VERDADERO" ||
        aoeStr === "1";

      let elemento = elementoRaw.replace(/%$/, "");

      let directLC = damageTypeColumn >= 0 && esDanioLunarCharged(row[damageTypeColumn]);
      let directLCr = damageTypeColumn >= 0 && esDanioLunarCrystallize(row[damageTypeColumn]);
      let directSC = damageTypeColumn >= 0 && esDanioStellarConduct(row[damageTypeColumn]);
      if (directLC || directLCr || directSC) {
        let reaction = directSC ? "Stellar-Conduct" : directLCr ? "Lunar-Crystallize" : "Lunar-Charged";
        if (gauge !== 0) {
          throw new Error("Daño " + reaction + " directo: Gauge debe ser 0; separe la aplicación elemental.");
        }
        let damageRow = [
          ...row, reaction, 0, 1, nucleos.length, 0, "", formatAuras(auras),
        ];
        if (!directSC) damageRow[directLCr ? "_lcrParticipants" : "_lcParticipants"] = actorChar;
        guardarSalida(damageRow);
        continue;
      }

      let result = aplicarAtaque(
        auras,
        nucleos,
        elemento,
        gauge,
        esAOE,
        frames,
        frames,
        actorChar,
        onfield,
        null,
        index,
        vortexState,
        stellarEnabled,
        ecState,
        colaEventos,
        {
          blunt: bluntColumn >= 0 && ["true", "1", "sí", "si", "blunt"].includes(
            String(row[bluntColumn]).trim().toLowerCase(),
          ),
          poise: poiseColumn >= 0 ? Number(row[poiseColumn]) || 0 : 0,
        },
      );

      nucleos = result.nucleos;
      auras = result.auras;
      vortexState = result.vortexState;
      ecState = result.ecState || ecState;

      guardarFilasExplosion(result.filasExplosion);
      encolarEventosGenerados(result.eventosGenerados);

      guardarSalida([
        index,
        ...row.slice(1),
        result.reacciones,
        Number(result.consumido || 0).toFixed(4),
        result.ampMult,
        nucleos.length,
        result.nucleosDetonados,
        "",
        formatAuras(result.auras),
      ]);

      continue;
    }

    if (item._tipoInterno === "GENERADO") {
      let evento = item.evento;

      let elemento = (evento.elemento || "Unknown%").replace(/%$/, "");
      let gauge = evento.gauge || 0;
      let esAOE = String(evento.aoe || "FALSE").toUpperCase() === "TRUE";
      let actorChar = evento.char || "Unknown";
      let onfield = evento.onfield || "FALSE";
      let reaccionOrigen = evento.reaccionOrigen || null;
      let index = evento.index || null;

      let result = aplicarAtaque(
        auras,
        nucleos,
        elemento,
        gauge,
        esAOE,
        frames,
        frames,
        actorChar,
        onfield,
        reaccionOrigen,
        index,
        vortexState,
        stellarEnabled,
        ecState,
        colaEventos,
        { aplicaElemento: evento.aplicaElemento === true, sourceType: evento.sourceType },
      );

      nucleos = result.nucleos;
      auras = result.auras;
      vortexState = result.vortexState;
      ecState = result.ecState || ecState;

      guardarFilasExplosion(result.filasExplosion);
      encolarEventosGenerados(result.eventosGenerados);

      let rowEvento = [
        evento.index || null,
        evento.char || "Unknown",
        evento.action || "Unknown",
        evento.frames || 0,
        evento.elemento || "Unknown%",
        evento.onfield || "FALSE",
        evento.gauge || 0,
        evento.icdTime || "",
        evento.icdTag || "",
        evento.aoe || "FALSE",
      ];

      let generatedRow = [
        ...rowEvento,
        result.reacciones,
        Number(result.consumido || 0).toFixed(4),
        result.ampMult,
        nucleos.length,
        result.nucleosDetonados,
        evento.participantes || "",
        formatAuras(result.auras),
      ];
      generatedRow._lcrParticipants = evento.participantesLCr || "";
      guardarSalida(generatedRow);
    }
  }

  let filasOriginales = salida.slice(1);
  let todasLasFilas = filasOriginales.concat(todasFilasExplosion);

  todasLasFilas.sort((a, b) => {
    let frameA = parseFloat(a[3]) || 0;
    let frameB = parseFloat(b[3]) || 0;
    return frameA - frameB;
  });

  for (let row of todasLasFilas) {
    if (row.length === 17 && header.length > 10) {
      row.splice(10, 0, ...Array(header.length - 10).fill(""));
    }
    row.push(row._scStacks || 0);
    delete row._scStacks;
    if (showLCrParticipants) row.push(row._lcrParticipants || "");
    delete row._lcrParticipants;
    if (showLCParticipants) row.push(row._lcParticipants || "");
    delete row._lcParticipants;
  }
  salida[0].push("Stacks SC");
  if (showLCrParticipants) salida[0].push("Participantes LCr");
  if (showLCParticipants) salida[0].push("Participantes LC");
  return [salida[0]].concat(todasLasFilas);
}
