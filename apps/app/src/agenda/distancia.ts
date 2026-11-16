import type { Evento } from "./dados";

export type Coordenada = { latitude: number; longitude: number };

const RAIO_TERRA_KM = 6371;
const grausParaRadianos = (graus: number) => (graus * Math.PI) / 180;

/** Distância em linha reta (haversine) entre duas coordenadas, em km. */
export function haversineKm(a: Coordenada, b: Coordenada) {
  const dLat = grausParaRadianos(b.latitude - a.latitude);
  const dLon = grausParaRadianos(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(grausParaRadianos(a.latitude)) *
      Math.cos(grausParaRadianos(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
}

/** Formata para o padrão dos cartões: "850 m" até 1 km, depois "2,1 km". */
export function formatarDistancia(km: number) {
  return km < 1
    ? `${Math.round(km * 1000)} m`
    : `${km.toFixed(1).replace(".", ",")} km`;
}

/**
 * Menor distância entre a origem e os espaços do evento; null quando o
 * evento não tem nenhuma data com coordenadas. Nunca fabrica coordenada.
 */
export function distanciaEvento(evento: Evento, origem: Coordenada) {
  let menor: number | null = null;
  for (const data of evento.datas) {
    const espaco = data.espaco;
    if (!espaco || espaco.latitude === null || espaco.longitude === null)
      continue;
    const distancia = haversineKm(origem, {
      latitude: espaco.latitude,
      longitude: espaco.longitude,
    });
    if (menor === null || distancia < menor) menor = distancia;
  }
  return menor;
}

/**
 * Ordena do mais perto para o mais longe, estável; eventos sem coordenadas
 * ficam por último, preservando a ordem original entre si.
 */
export function ordenarPorPerto<T extends Evento>(
  eventos: T[],
  origem: Coordenada,
) {
  return eventos
    .map((evento, indice) => ({
      evento,
      indice,
      distancia: distanciaEvento(evento, origem),
    }))
    .sort((a, b) => {
      if (a.distancia === null && b.distancia === null)
        return a.indice - b.indice;
      if (a.distancia === null) return 1;
      if (b.distancia === null) return -1;
      return a.distancia - b.distancia || a.indice - b.indice;
    })
    .map(({ evento }) => evento);
}
