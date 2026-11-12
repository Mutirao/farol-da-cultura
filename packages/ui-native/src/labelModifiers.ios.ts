import { accessibilityLabel } from "@expo/ui/swift-ui/modifiers";
export function labelModifiers(label: string) {
  return [accessibilityLabel(label)];
}
