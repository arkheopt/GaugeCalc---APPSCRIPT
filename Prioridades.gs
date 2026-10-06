function getReactionPriority(
  elementoAplicado,
  auras,
  nucleos,
  frameActual,
  esAOE,
) {
  const reacciones = [];
  const gauge = (ele) => getAuraGauge(auras, ele) > ZERO_DUR;

  switch (elementoAplicado) {
    case "Hydro":
      if (gauge("Pyro") || gauge("Burning"))
        reacciones.push({ nombre: "Vaporize", func: tryVaporize });
      if (gauge("Cryo")) reacciones.push({ nombre: "Freeze", func: tryFreeze });
      if (gauge("Dendro") || gauge("Quicken") || gauge("BurningFuel"))
        reacciones.push({ nombre: "Bloom", func: tryBloom });
      if (gauge("Electro"))
        reacciones.push({ nombre: "ElectroCharged", func: tryElectroCharged });
      break;
    case "Pyro":
      if (esAOE && nucleos.length > 0) {
        reacciones.push({
          nombre: "Burgeon",
          func: (auras, ele, gauge, actorChar, frames, onfield) => {
            let res = tryBurgeon(
              nucleos,
              frameActual,
              esAOE,
              gauge,
              actorChar,
              frames,
              onfield,
            );
            return {
              reacted: res.detonados > 0,
              consumed: 0,
              detonados: res.detonados,
              nucleosRestantes: res.nucleosRestantes,
              eventos: res.eventos,
              blocksAuraAttachment: false,
            };
          },
        });
      }
      if (gauge("Electro"))
        reacciones.push({ nombre: "Overload", func: tryOverload });
      if (gauge("Hydro"))
        reacciones.push({ nombre: "Vaporize", func: tryVaporize });
      if (gauge("Cryo") || gauge("Frozen"))
        reacciones.push({ nombre: "Melt", func: tryMelt });
      if (gauge("Dendro") || gauge("Quicken"))
        reacciones.push({ nombre: "Burning", func: tryBurning });
      break;
    case "Electro":
      if (esAOE && nucleos.length > 0) {
        reacciones.push({
          nombre: "Hyperbloom",
          func: (auras, ele, gauge, actorChar, frames, onfield) => {
            let res = tryHyperbloom(
              nucleos,
              frameActual,
              esAOE,
              gauge,
              actorChar,
              frames,
              onfield,
            );
            return {
              reacted: res.detonados > 0,
              consumed: 0,
              detonados: res.detonados,
              nucleosRestantes: res.nucleosRestantes,
              eventos: res.eventos,
              blocksAuraAttachment: false,
            };
          },
        });
      }
      if (gauge("Quicken"))
        reacciones.push({ nombre: "Aggravate", func: tryAggravate });
      if (gauge("Pyro") || gauge("Burning"))
        reacciones.push({ nombre: "Overload", func: tryOverload });
      if (gauge("Hydro"))
        reacciones.push({ nombre: "ElectroCharged", func: tryElectroCharged });
      if (gauge("Frozen") || gauge("Cryo")) {
        reacciones.push({ nombre: "Superconduct", func: trySuperconduct });
      }
      if (gauge("Dendro"))
        reacciones.push({ nombre: "Quicken", func: tryQuicken });
      break;
    case "Cryo":
      if (gauge("Electro"))
        reacciones.push({ nombre: "Superconduct", func: trySuperconduct });
      if (gauge("Pyro") || gauge("Burning"))
        reacciones.push({ nombre: "Melt", func: tryMelt });
      if (gauge("Hydro"))
        reacciones.push({ nombre: "Freeze", func: tryFreeze });
      break;
    case "Anemo":

      reacciones.push({ nombre: "Swirl", func: trySwirl });
      break;
    case "Geo":

      reacciones.push({ nombre: "Crystallize", func: tryCrystallize });
      break;
    case "Dendro":
      if (gauge("Quicken"))
        reacciones.push({ nombre: "Spread", func: trySpread });
      if (gauge("Electro"))
        reacciones.push({ nombre: "Quicken", func: tryQuicken });
      if (gauge("Pyro") || gauge("Burning"))
        reacciones.push({ nombre: "Burning", func: tryBurning });
      if (gauge("Hydro")) reacciones.push({ nombre: "Bloom", func: tryBloom });
      break;
    default:
      break;
  }
  return reacciones;
}
