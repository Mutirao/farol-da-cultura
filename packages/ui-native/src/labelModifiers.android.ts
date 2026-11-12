import { semantics } from "@expo/ui/jetpack-compose/modifiers";
export function labelModifiers(label: string) {
  return [semantics({ contentDescription: label })];
}
