function limpiarNucleosExpirados(nucleos, frameActual) {
  if (!Array.isArray(nucleos)) nucleos = [];
  let detonados = 0;
  let nuevos = [];
  let filas = [];
  for (let n of nucleos) {
    if (frameActual - n.frameCreacion >= DURACION_NUCLEO) {
      detonados++;
      filas.push({
        char: n.actorChar || "Unknown",
        action: "Bloom Explosion (expired)",
        frames: n.frameCreacion + DURACION_NUCLEO,
        elemento: "Dendro%",
        onfield: "FALSE",
        gauge: 0,
        icdTime: "",
        icdTag: "",
        aoe: "FALSE",
      });
    } else {
      nuevos.push(n);
    }
  }
  return { nucleos: nuevos, detonados: detonados, filas: filas };
}

function agregarNucleo(nucleos, frameActual, actorChar, colaEventos) {
  if (!Array.isArray(nucleos)) nucleos = [];
  let detonados = 0;
  let filas = [];
  let id = nucleos.length > 0 ? Math.max(...nucleos.map((n) => n.id)) + 1 : 0;
  let nucleo = { id: id, frameCreacion: frameActual, actorChar: actorChar };
  nucleos.push(nucleo);

  encolarEventoInterno(colaEventos, {
    _tipoInterno: "CORE_EXPIRE",
    frames: frameActual + DURACION_NUCLEO,
    nucleo: nucleo,
  });
  if (nucleos.length > 5) {
    nucleos.sort((a, b) => a.frameCreacion - b.frameCreacion);
    let eliminado = nucleos.shift();
    detonados++;
    filas.push({
      char: eliminado.actorChar || "Unknown",
      action: "Bloom Explosion (overflow)",
      frames: frameActual,
      elemento: "Dendro%",
      onfield: "FALSE",
      gauge: 0,
      icdTime: "",
      icdTag: "",
      aoe: "FALSE",
    });
  }
  return { nucleos: nucleos, detonados: detonados, filas: filas };
}

function tryHyperbloom(
  nucleos,
  frameActual,
  esAOE,
  gauge,
  actorChar,
  frames,
  onfield,
) {
  if (!esAOE) return { detonados: 0, nucleosRestantes: nucleos, eventos: [] };
  let detonados = 0;
  let restantes = [];
  let eventos = [];
  let contadorEventos = 0;
  const MAX_EVENTOS = 2;

  for (let n of nucleos) {
    if (frameActual - n.frameCreacion < DURACION_NUCLEO) {
      detonados++;
      if (contadorEventos < MAX_EVENTOS) {
        let evento = crearEvento(
          actorChar,
          "Hyperbloom Damage",
          frames,
          "Dendro%",
          onfield,
          0,
          "",
          "",
          "TRUE",
          "Hyperbloom",
          null,
        );
        eventos.push(evento);
        contadorEventos++;
      }
    } else {
      restantes.push(n);
    }
  }
  return {
    detonados: detonados,
    nucleosRestantes: restantes,
    eventos: eventos,
  };
}

function tryBurgeon(
  nucleos,
  frameActual,
  esAOE,
  gauge,
  actorChar,
  frames,
  onfield,
) {
  if (!esAOE) return { detonados: 0, nucleosRestantes: nucleos, eventos: [] };
  let detonados = 0;
  let restantes = [];
  let eventos = [];
  let contadorEventos = 0;
  const MAX_EVENTOS = 2;

  for (let n of nucleos) {
    if (frameActual - n.frameCreacion < DURACION_NUCLEO) {
      detonados++;
      if (contadorEventos < MAX_EVENTOS) {
        let evento = crearEvento(
          actorChar,
          "Burgeon Damage",
          frames,
          "Dendro%",
          onfield,
          0,
          "",
          "",
          "TRUE",
          "Burgeon",
          null,
        );
        eventos.push(evento);
        contadorEventos++;
      }
    } else {
      restantes.push(n);
    }
  }
  return {
    detonados: detonados,
    nucleosRestantes: restantes,
    eventos: eventos,
  };
}
