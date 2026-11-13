import { Host } from "@expo/ui";
import { colors } from "@farol/tokens/native";
import type { ReactNode } from "react";
import { useColorScheme } from "react-native";
export function NativeUIProvider({
  children,
  matchContents = false,
}: {
  children: ReactNode;
  matchContents?: boolean | { vertical?: boolean; horizontal?: boolean };
}) {
  const mode = useColorScheme() === "dark" ? "dark" : "light";
  return (
    <Host
      colorScheme={mode}
      seedColor={colors[mode].primary}
      matchContents={matchContents}
      style={matchContents ? undefined : { flex: 1 }}
    >
      {children}
    </Host>
  );
}
