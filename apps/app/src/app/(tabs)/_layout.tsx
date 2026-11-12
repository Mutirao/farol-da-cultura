import { t } from "@farol/i18n";
import { palette } from "@farol/tokens/native";
import { NativeTabs } from "expo-router/native-tabs";

export const unstable_settings = { initialRouteName: "agenda" };

export default function TabLayout() {
  return (
    <NativeTabs tintColor={palette.brand.primary}>
      <NativeTabs.Trigger name="agenda">
        <NativeTabs.Trigger.Icon sf="calendar" md="event" />
        <NativeTabs.Trigger.Label>{t("tabs.agenda")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="mapa">
        <NativeTabs.Trigger.Icon sf="map" md="map" />
        <NativeTabs.Trigger.Label>{t("tabs.mapa")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="favoritos">
        <NativeTabs.Trigger.Icon sf="heart" md="favorite" />
        <NativeTabs.Trigger.Label>
          {t("tabs.favoritos")}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="conta">
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
        <NativeTabs.Trigger.Label>{t("tabs.conta")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
