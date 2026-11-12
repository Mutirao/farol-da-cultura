// Spike F0-10, variante A: @expo/ui universal List + List.ForEach + RNHostView.
// biome-ignore lint/style/noRestrictedImports: spike F0-10 (branch spike/lista, não mergeado) mede @expo/ui List diretamente; não há wrapper em @farol/ui-native.
import { Host, List, RNHostView } from "@expo/ui";
import { Redirect } from "expo-router";
import { useCallback } from "react";
import { isSpikeVariant } from "@/spike/devGuard";
import { FAKE_CARDS, type FakeCard, fakeCardKey } from "@/spike/fakeCards";
import { SPIKE_CARD_HEIGHT, SpikeCard } from "@/spike/SpikeCard";

export default function SpikeListaARoute() {
  if (!isSpikeVariant()) {
    return <Redirect href="/agenda" />;
  }
  return <SpikeListaA />;
}

function SpikeListaA() {
  const renderRow = useCallback(
    ({ item }: { item: FakeCard }) => (
      <RNHostView matchContents={{ vertical: true }}>
        <SpikeCard card={item} />
      </RNHostView>
    ),
    [],
  );
  return (
    <Host style={{ flex: 1 }} testID="spike-lista-a">
      <List>
        <List.ForEach
          data={FAKE_CARDS}
          keyExtractor={fakeCardKey}
          estimatedItemSize={SPIKE_CARD_HEIGHT}
        >
          {renderRow}
        </List.ForEach>
      </List>
    </Host>
  );
}
