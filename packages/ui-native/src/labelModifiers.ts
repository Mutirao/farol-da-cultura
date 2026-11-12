// O fallback preserva o contrato de tipos; o app tem somente alvos iOS/Android.
import type { UniversalBaseProps } from "@expo/ui";
export function labelModifiers(
  _label: string,
): NonNullable<UniversalBaseProps["modifiers"]> {
  return [];
}
