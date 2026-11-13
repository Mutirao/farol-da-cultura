import { t } from "@farol/i18n";
import { openBrowserAsync } from "expo-web-browser";
import { Alert, Linking } from "react-native";
import type { Espaco } from "./dados";

export async function abrirPagina(url: string) {
  try {
    await openBrowserAsync(url);
  } catch {
    Alert.alert(t("tabs.conta"), t("detalhe.falhaLink"));
  }
}

export function urlMapa(espaco: Espaco) {
  return espaco.latitude !== null && espaco.longitude !== null
    ? `https://www.google.com/maps/search/?api=1&query=${espaco.latitude},${espaco.longitude}`
    : null;
}
export async function abrirMapa(espaco: Espaco) {
  const url = urlMapa(espaco);
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(t("tabs.mapa"), t("detalhe.falhaLink"));
  }
}
