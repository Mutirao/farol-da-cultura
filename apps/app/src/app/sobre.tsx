import { t } from "@farol/i18n";
import { colors, spacing } from "@farol/tokens/native";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { ScrollView, Text, useColorScheme } from "react-native";

export default function Sobre() {
  // Fundo e texto vêm do mesmo modo dos tokens, que têm o contraste testado.
  const cores = colors[useColorScheme() === "dark" ? "dark" : "light"];
  const texto = { color: cores.foreground, fontSize: 16, lineHeight: 24 };
  const versao = Constants.expoConfig?.version;
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t("sobre.titulo"),
          headerStyle: { backgroundColor: cores.background },
          headerTintColor: cores.foreground,
        }}
      />
      <ScrollView
        style={{ backgroundColor: cores.background }}
        contentContainerStyle={{ padding: spacing["4"], gap: spacing["3"] }}
        testID="sobre-screen"
      >
        <Text
          accessibilityRole="header"
          style={{ ...texto, fontSize: 22, lineHeight: 30, fontWeight: "600" }}
        >
          {t("sobre.nome")}
        </Text>
        {versao ? (
          <Text style={{ ...texto, color: cores.mutedForeground }}>
            {t("sobre.versao", { versao })}
          </Text>
        ) : null}
        <Text style={texto}>{t("sobre.descricao")}</Text>
        <Text style={texto}>{t("sobre.fonte")}</Text>
        <Text style={texto}>{t("sobre.licenca")}</Text>
      </ScrollView>
    </>
  );
}
