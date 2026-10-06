function crearEvento(
  char,
  action,
  frames,
  elemento,
  onfield,
  gauge,
  icdTime,
  icdTag,
  aoe,
  reaccionOrigen,
  index,
  participantes,
) {
  return {
    index: index || null,
    char: char || "Unknown",
    action: action || "Unknown",
    frames: frames || 0,
    elemento: elemento || "Unknown%",
    onfield: onfield || "FALSE",
    gauge: gauge || 0,
    icdTime: icdTime || "",
    icdTag: icdTag || "",
    aoe: aoe || "FALSE",
    reaccionOrigen: reaccionOrigen || null,
    participantes: participantes || null,
  };
}

function encolarEventoInterno(colaEventos, evento) {
  if (!Array.isArray(colaEventos) || !evento) return;
  colaEventos._seqCounter = (colaEventos._seqCounter || 0) + 1;
  evento._seq = colaEventos._seqCounter;
  colaEventos.push(evento);
}

function convertirFilaExplosion(filaParcial, activos, detonados, auras) {
  return [
    filaParcial.index || null,
    filaParcial.char || "Unknown",
    filaParcial.action || "Bloom Explosion",
    filaParcial.frames || 0,
    filaParcial.elemento || "Dendro%",
    filaParcial.onfield || "FALSE",
    filaParcial.gauge || 0,
    filaParcial.icdTime || "",
    filaParcial.icdTag || "",
    filaParcial.aoe || "FALSE",
    "Bloom Explosion",
    0,
    1,
    activos,
    detonados,
    "",
    formatAuras(auras),
  ];
}
function formatAuras(auras) {
  let parts = [];
  const visibles = [
    "Pyro",
    "Hydro",
    "Electro",
    "Cryo",
    "Dendro",
    "Quicken",
    "Frozen",
    "Burning",
    "BurningFuel",
  ];

  for (let ele of visibles) {
    if (auras[ele] && auras[ele].gauge > ZERO_DUR) {
      parts.push(ele + ":" + auras[ele].gauge.toFixed(4));
    }
  }
  return parts.join(", ");
}
