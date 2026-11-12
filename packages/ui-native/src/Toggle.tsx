import { Switch } from "@expo/ui";
import { labelModifiers } from "./labelModifiers";
export interface ToggleProps {
  accessibilityLabel: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
}
export function Toggle({ accessibilityLabel, ...props }: ToggleProps) {
  return (
    <Switch
      {...props}
      label={accessibilityLabel}
      modifiers={labelModifiers(accessibilityLabel)}
    />
  );
}
