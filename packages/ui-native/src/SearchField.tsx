import { TextInput, useNativeState } from "@expo/ui";
import { colors, radius, spacing } from "@farol/tokens/native";
import { useEffect, useRef } from "react";
import { useColorScheme } from "react-native";

export function SearchField({
  accessibilityLabel,
  value,
  onChangeText,
}: {
  accessibilityLabel: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const state = useNativeState(value);
  const ultimoTextoNativo = useRef(value);
  const cores = colors[useColorScheme() === "dark" ? "dark" : "light"];
  useEffect(() => {
    // Só sincroniza mudanças externas; ecoar cada tecla ao nativo perde caracteres no IME.
    if (value !== ultimoTextoNativo.current) {
      state.value = value;
      ultimoTextoNativo.current = value;
    }
  }, [state, value]);
  return (
    <TextInput
      value={state}
      onChangeText={(texto) => {
        ultimoTextoNativo.current = texto;
        onChangeText(texto);
      }}
      accessibilityLabel={accessibilityLabel}
      placeholder={accessibilityLabel}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      style={{
        backgroundColor: cores.background,
        width: "100%",
        padding: spacing["3"],
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: cores.input,
      }}
      textStyle={{ color: cores.foreground, fontSize: 16 }}
      placeholderTextColor={cores.mutedForeground}
      testID="busca"
    />
  );
}
