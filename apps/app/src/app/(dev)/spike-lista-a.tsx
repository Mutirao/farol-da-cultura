// Spike F0-10, variante A: @expo/ui universal List + List.ForEach + RNHostView.
// biome-ignore lint/style/noRestrictedImports: spike F0-10 (branch spike/lista, não mergeado) mede @expo/ui List diretamente; não há wrapper em @farol/ui-native.
import { Host, List, RNHostView } from "@expo/ui";
import { useCallback } from "react";
import { FAKE_CARDS, type FakeCard, fakeCardKey } from "@/spike/fakeCards";
import { SPIKE_CARD_HEIGHT, SpikeCard } from "@/spike/SpikeCard";

// Guard de variante removido temporariamente para facilitar o teste manual
// (pedido do usuário, 12/11/2026) -- branch spike/lista não é mergeado, não
// precisa do guard isSpikeVariant() para isso.
export default function SpikeListaARoute() {
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
