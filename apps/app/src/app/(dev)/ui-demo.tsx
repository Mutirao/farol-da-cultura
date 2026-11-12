import {
  Button,
  ListSection,
  NativeUIProvider,
  Sheet,
  Toggle,
} from "@farol/ui-native";
import Constants from "expo-constants";
import { Redirect } from "expo-router";
import { useState } from "react";

const labels = {
  section: "Componentes nativos",
  toggle: "Receber notificações",
  open: "Abrir painel",
  sheet: "Painel de demonstração",
  close: "Fechar painel",
};

export default function DemoRoute() {
  // APP_VARIANT é consumida por app.config.ts, não pelo bundle JS do Metro.
  // A identidade resolvida do config mantém o guard fechado também em links diretos.
  if (
    Constants.expoConfig?.ios?.bundleIdentifier !== "br.com.farol.cultura.dev"
  ) {
    return <Redirect href="/agenda" />;
  }
  return <DemoContent />;
}

function DemoContent() {
  const [enabled, setEnabled] = useState(false);
  const [presented, setPresented] = useState(false);
  return (
    <NativeUIProvider>
      <ListSection accessibilityLabel={labels.section}>
        <Toggle
          accessibilityLabel={labels.toggle}
          value={enabled}
          onValueChange={setEnabled}
        />
        <Button
          accessibilityLabel={labels.open}
          label={labels.open}
          onPress={() => setPresented(true)}
        />
        <Sheet
          accessibilityLabel={labels.sheet}
          isPresented={presented}
          onDismiss={() => setPresented(false)}
        >
          <NativeUIProvider matchContents>
            <Button
              accessibilityLabel={labels.close}
              label={labels.close}
              onPress={() => setPresented(false)}
            />
          </NativeUIProvider>
        </Sheet>
      </ListSection>
    </NativeUIProvider>
  );
}
