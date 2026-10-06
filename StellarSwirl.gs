const STELLAR_VORTEX_DURATION = 181;
const STELLAR_SWIRL_ENABLERS = ["Traveler Cryo", "Sandrone", "Odette"];

function procesarStellarSwirl(
  auras,
  nucleos,
  actorChar,
  frames,
  onfield,
  index,
  vortexState,
  participantsOverride,
) {
  let eventos = [];
  let participants = participantsOverride || contribuyentesStellar(auras, actorChar, false);
  if (!vortexState || vortexState.expirado || vortexState.exploto) {
    let vortex = {
      nivel: 1, stacks: 1, overflow: 0, frameCreacion: frames,
      expirado: false, exploto: false, actorChar: actorChar,
      onfield: onfield, index: index, participantesVortex: participants,
    };
    return { eventos: eventos, vortexState: vortex, esStellarSwirl: true };
  }
  let vortex = vortexState;
  vortex.participantesVortex = unirContribuyentes(vortex.participantesVortex || [], participants);
  vortex.actorChar = actorChar;
  vortex.onfield = onfield;
  vortex.index = index;

  vortex.stacks = Math.min(6, vortex.stacks + Math.min(vortex.stacks + 1, 6));
  vortex.nivel = vortex.stacks >= 3 ? 2 : 1;
  if (vortex.stacks >= 6) {
      let nivelTexto = "Level " + vortex.nivel;
      let participantesStr = vortex.participantesVortex.join(", ");
      let gaugeAplicado = 1;
      let eventoExplosion = crearEvento(
        vortex.actorChar || actorChar,
        "Stellar Vortex Explosion (overflow) - " + nivelTexto,
        frames,
        "Cryo%",
        vortex.onfield || onfield,
        gaugeAplicado,
        "",
        "",
        "TRUE",
        "Stellar Vortex",
        vortex.index || index,
        participantesStr,
      );
      eventoExplosion.aplicaElemento = true;
      eventoExplosion.sourceType = "Stellar Vortex";
      eventos.push(eventoExplosion);
      vortex.exploto = true;
      vortex.expirado = true;
      return { eventos: eventos, vortexState: vortex, esStellarSwirl: true };
  }

  return { eventos: eventos, vortexState: vortex, esStellarSwirl: true };
}

function verificarExplosionVortex(vortexState, auras, frames) {
  let eventos = [];
  if (!vortexState || vortexState.expirado || vortexState.exploto)
    return { eventos: eventos, vortexState: vortexState };

  if (frames - vortexState.frameCreacion >= STELLAR_VORTEX_DURATION) {
    let nivelTexto = "Level " + vortexState.nivel;
    let participantesStr = vortexState.participantesVortex
      ? vortexState.participantesVortex.join(", ")
      : "";
    let gaugeAplicado = 1;
    let eventoExplosion = crearEvento(
      vortexState.actorChar || "Unknown",
      "Stellar Vortex Explosion (expired) - " + nivelTexto,
      vortexState.frameCreacion + STELLAR_VORTEX_DURATION,
      "Cryo%",
      vortexState.onfield || "FALSE",
      gaugeAplicado,
      "",
      "",
      "TRUE",
      "Stellar Vortex",
      vortexState.index,
      participantesStr,
    );
    eventoExplosion.aplicaElemento = true;
    eventoExplosion.sourceType = "Stellar Vortex";
    eventos.push(eventoExplosion);
    vortexState.expirado = true;
    vortexState.exploto = true;
    return { eventos: eventos, vortexState: vortexState };
  }

  return { eventos: eventos, vortexState: vortexState };
}

function sincronizarVortex(vortexState, colaEventos) {
  if (!vortexState || vortexState.expirado || vortexState.exploto || vortexState.scheduled) return;
  vortexState.scheduled = true;
  encolarEventoInterno(colaEventos, {
    _tipoInterno: "VORTEX_EXPIRE",
    frames: vortexState.frameCreacion + STELLAR_VORTEX_DURATION,
    vortex: vortexState,
  });
}
