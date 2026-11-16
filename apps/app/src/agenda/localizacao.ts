import * as Location from "expo-location";
import type { Coordenada } from "./distancia";

let ultima: Coordenada | null = null;

/** Última coordenada obtida nesta sessão; null se ainda não houve. */
export function localizacaoConhecida() {
  return ultima;
}

/**
 * Pede permissão e resolve a localização atual. Só deve ser chamada a
 * partir de um gesto (botão) — nunca em efeito de montagem. Retorna null
 * (e deixa o app íntegro) quando negada, indisponível ou em erro.
 */
export async function pedirLocalizacao(): Promise<Coordenada | null> {
  if (ultima) return ultima;
  try {
    const permissao = await Location.requestForegroundPermissionsAsync();
    if (!permissao.granted) return null;
    const atual = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    ultima = {
      latitude: atual.coords.latitude,
      longitude: atual.coords.longitude,
    };
    return ultima;
  } catch {
    return null;
  }
}
