// Spike F0-10: cartão idêntico nas variantes A (@expo/ui) e B (FlashList).
import { colors } from "@farol/tokens/native";
import { Image } from "expo-image";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { FakeCard } from "./fakeCards";

/** Altura fixa do cartão (dp), usada também como estimatedItemSize nas duas listas. */
export const SPIKE_CARD_HEIGHT = 96;

export const SpikeCard = memo(function SpikeCard({ card }: { card: FakeCard }) {
  return (
    <View style={styles.card} testID={card.id}>
      <Image
        source={card.thumbnail}
        recyclingKey={card.id}
        style={styles.thumb}
        contentFit="cover"
        transition={0}
      />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {card.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {card.date}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {card.category}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    height: SPIKE_CARD_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 12,
    backgroundColor: colors.light.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.muted,
  },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  body: { flex: 1, gap: 2 },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.light.cardForeground,
  },
  meta: { fontSize: 13, color: colors.light.mutedForeground },
});
