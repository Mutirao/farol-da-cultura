// Spike F0-10, variante B: FlashList 2.3.2.
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { Redirect } from "expo-router";
import { View } from "react-native";
import { isSpikeVariant } from "@/spike/devGuard";
import { FAKE_CARDS, type FakeCard, fakeCardKey } from "@/spike/fakeCards";
import { SpikeCard } from "@/spike/SpikeCard";

export default function SpikeListaBRoute() {
  if (!isSpikeVariant()) {
    return <Redirect href="/agenda" />;
  }
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
