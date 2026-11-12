import { t } from "@farol/i18n";
import { View } from "react-native";

export default function Screen() {
  return (
    <View
      style={{ flex: 1 }}
      accessibilityLabel={t("tabs.agenda")}
      testID="agenda-screen"
    />
  );
}
