// Spike F0-10, variante B: FlashList 2.3.2.
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { View } from "react-native";
import { FAKE_CARDS, type FakeCard, fakeCardKey } from "@/spike/fakeCards";
import { SpikeCard } from "@/spike/SpikeCard";

// Guard de variante removido temporariamente para facilitar o teste manual
// (pedido do usuário, 12/11/2026) -- branch spike/lista não é mergeado.
export default function SpikeListaBRoute() {
  return <SpikeListaB />;
}

const renderItem: ListRenderItem<FakeCard> = ({ item }) => (
  <SpikeCard card={item} />
);

function SpikeListaB() {
  return (
    <View style={{ flex: 1 }} testID="spike-lista-b">
      <FlashList
        data={FAKE_CARDS}
        keyExtractor={fakeCardKey}
        renderItem={renderItem}
      />
    </View>
  );
}
