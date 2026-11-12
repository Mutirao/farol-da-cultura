import { BottomSheet } from "@expo/ui";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
export interface SheetProps {
  accessibilityLabel: string;
  isPresented: boolean;
  onDismiss: () => void;
  children: ReactNode;
  testID?: string;
}
export function Sheet({ accessibilityLabel, children, ...props }: SheetProps) {
  return (
    <BottomSheet {...props}>
      <View accessibilityViewIsModal>
        <Text
          accessibilityRole="header"
          accessibilityLabel={accessibilityLabel}
        >
          {accessibilityLabel}
        </Text>
        {children}
      </View>
    </BottomSheet>
  );
}
