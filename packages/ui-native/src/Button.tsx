import { Button as ExpoButton } from "@expo/ui";
import { labelModifiers } from "./labelModifiers";
export interface ButtonProps {
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}
export function Button({ accessibilityLabel, ...props }: ButtonProps) {
  return (
    <ExpoButton {...props} modifiers={labelModifiers(accessibilityLabel)} />
  );
}
