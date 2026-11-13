import { Stack } from "expo-router";
import { AgendaProvider } from "../agenda/AgendaProvider";
import { useCores } from "../agenda/ui";

export default function RootLayout() {
  const cores = useCores();
  return (
    <AgendaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: cores.background },
          headerStyle: { backgroundColor: cores.background },
          headerTintColor: cores.foreground,
        }}
      />
    </AgendaProvider>
  );
}
