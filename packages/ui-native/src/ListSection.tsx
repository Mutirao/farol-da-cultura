import { FieldGroup } from "@expo/ui";
import type { ReactNode } from "react";
export interface ListSectionProps {
  accessibilityLabel: string;
  children: ReactNode;
  testID?: string;
}
export function ListSection({
  accessibilityLabel,
  children,
  testID,
}: ListSectionProps) {
  return (
    <FieldGroup testID={testID}>
      <FieldGroup.Section title={accessibilityLabel}>
        {children}
      </FieldGroup.Section>
    </FieldGroup>
  );
}
