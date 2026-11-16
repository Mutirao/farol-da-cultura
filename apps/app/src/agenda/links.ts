import { t } from "@farol/i18n";
import { openBrowserAsync } from "expo-web-browser";
import { Alert, Linking } from "react-native";
import { type Espaco, urlComoChegar, urlMapa } from "./dados";

export { urlComoChegar, urlMapa } from "./dados";

export async function abrirPagina(url: string) {
  try {
    await openBrowserAsync(url);
  } catch {
    Alert.alert(t("tabs.conta"), t("detalhe.falhaLink"));
  }
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

export async function abrirComoChegar(espaco: Espaco) {
  const url = urlComoChegar(espaco);
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      t("detalhe.comoChegar", { nome: espaco.nome }),
      t("detalhe.falhaLink"),
    );
  }
}
