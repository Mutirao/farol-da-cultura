import { t } from "@farol/i18n";
import { Button, ListSection, NativeUIProvider } from "@farol/ui-native";
import { useRouter } from "expo-router";
import { abrirPagina } from "../../agenda/links";

// As mesmas páginas que o app existente abre no perfil.
const TERMOS = "https://farol.mutirao.org.br/termo-de-uso";
const PRIVACIDADE = "https://farol.mutirao.org.br/politica-de-privacidade";

export default function Screen() {
  const router = useRouter();
  return (
    <NativeUIProvider>
      <ListSection accessibilityLabel={t("conta.secao")} testID="conta-screen">
        <Button
          accessibilityLabel={t("conta.termosAcao")}
          label={t("conta.termos")}
          onPress={() => void abrirPagina(TERMOS)}
        />
        <Button
          accessibilityLabel={t("conta.privacidadeAcao")}
          label={t("conta.privacidade")}
          onPress={() => void abrirPagina(PRIVACIDADE)}
        />
        <Button
          accessibilityLabel={t("conta.sobreAcao")}
          label={t("conta.sobre")}
          onPress={() => router.push("/sobre")}
        />
      </ListSection>
    </NativeUIProvider>
  );
}
