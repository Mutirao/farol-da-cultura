import { Picker } from "@expo/ui";

export function Select({
  accessibilityLabel,
  value,
  options,
  onValueChange,
}: {
  accessibilityLabel: string;
  value: string;
  options: { label: string; value: string }[];
  onValueChange: (value: string) => void;
}) {
  return (
    <Picker<string>
      accessibilityLabel={accessibilityLabel}
      selectedValue={value}
      onValueChange={onValueChange}
    >
      {options.map((option) => (
        <Picker.Item
          key={option.value}
          label={option.label}
          value={option.value}
        />
      ))}
    </Picker>
  );
}
