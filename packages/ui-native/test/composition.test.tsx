import { colors } from "@farol/tokens/native";
import { expect, it, vi } from "vitest";

vi.mock("@expo/ui", () => ({
  Host: "Host",
  Switch: "Switch",
  FieldGroup: Object.assign("FieldGroup", { Section: "Section" }),
  BottomSheet: "BottomSheet",
}));
vi.mock("react-native", () => ({
  useColorScheme: () => "dark",
  View: "View",
  Text: "Text",
}));
vi.mock("../src/labelModifiers", () => ({
  labelModifiers: (label: string) => [{ label }],
}));

import { ListSection, NativeUIProvider, Sheet, Toggle } from "../src/index";

it("aplica tint dos tokens e preserva contratos dos controles e conteúdo", () => {
  const onValueChange = vi.fn();
  const toggle = Toggle({
    accessibilityLabel: "Notificações",
    value: true,
    onValueChange,
  });
  expect(toggle.props.modifiers).toEqual([{ label: "Notificações" }]);
  toggle.props.onValueChange(false);
  expect(onValueChange).toHaveBeenCalledWith(false);
  const section = ListSection({
    accessibilityLabel: "Preferências",
    children: "conteúdo",
  });
  expect(section.props.children.props.title).toBe("Preferências");
  expect(section.props.children.props.children).toBe("conteúdo");
  const onDismiss = vi.fn();
  const sheet = Sheet({
    accessibilityLabel: "Detalhes",
    isPresented: true,
    onDismiss,
    children: "detalhes",
  });
  expect(sheet.props.isPresented).toBe(true);
  sheet.props.onDismiss();
  expect(onDismiss).toHaveBeenCalledOnce();
  expect(sheet.props.children.props.children[0].props.children).toBe(
    "Detalhes",
  );
  const host = NativeUIProvider({ children: "controles" });
  expect(host.props.seedColor).toBe(colors.dark.primary);
  expect(host.props.children).toBe("controles");
  const sheetHost = NativeUIProvider({
    children: "controles",
    matchContents: true,
  });
  expect(sheetHost.props.matchContents).toBe(true);
  expect(sheetHost.props.style).toBeUndefined();
});
