import { List, RNHostView } from "@expo/ui";
import type { ReactElement } from "react";

// shortcut: lista universal provisória, validar ADR-0002 em release antes de fechar a escolha.
export function Collection<T>({
  data,
  keyExtractor,
  renderItem,
  onRefresh,
  accessibilityLabel,
}: {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactElement;
  onRefresh: () => Promise<void>;
  accessibilityLabel: string;
}) {
  return (
    <List onRefresh={onRefresh} testID={accessibilityLabel}>
      <List.ForEach
        data={data}
        keyExtractor={keyExtractor}
        estimatedItemSize={180}
      >
        {({ item }) => (
          <RNHostView
            matchContents={{ vertical: true }}
            style={{ width: "100%" }}
          >
            {renderItem(item)}
          </RNHostView>
        )}
      </List.ForEach>
    </List>
  );
}
