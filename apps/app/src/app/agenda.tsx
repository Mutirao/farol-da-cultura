import { t } from "@farol/i18n";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

// Links temporários do spike F0-10 (pedido do usuário, 12/11/2026): mais
// fácil testar manualmente do que depender de deep link. Branch spike/lista
// não é mergeado -- isso nunca vai para main.
export default function Screen() {
  return (
    <View
      style={{ flex: 1, paddingTop: 80, gap: 16, alignItems: "center" }}
      accessibilityLabel={t("tabs.agenda")}
      testID="agenda-screen"
    >
      <Link href="/spike-lista-a" asChild testID="spike-link-a">
        <Pressable
          style={{
            paddingVertical: 16,
            paddingHorizontal: 24,
            backgroundColor: "#e0e0ff",
            borderRadius: 8,
          }}
        >
          <Text>Spike F0-10 — variante A (@expo/ui List)</Text>
        </Pressable>
      </Link>
      <Link href="/spike-lista-b" asChild testID="spike-link-b">
        <Pressable
          style={{
            paddingVertical: 16,
            paddingHorizontal: 24,
            backgroundColor: "#ffe0e0",
            borderRadius: 8,
          }}
        >
          <Text>Spike F0-10 — variante B (FlashList)</Text>
        </Pressable>
      </Link>
    </View>
  );
}
