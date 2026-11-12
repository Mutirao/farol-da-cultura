import { expect, it, vi } from "vitest";

vi.mock("@expo/ui", () => ({ Button: "NativeButton" }));
vi.mock("../src/labelModifiers", () => ({
  labelModifiers: (label: string) => [{ label }],
}));

import { Button } from "../src/Button";

it("encaminha rótulo, ação e estado para o botão universal", () => {
  const onPress = vi.fn();
  const element = Button({
    accessibilityLabel: "Abrir",
    label: "Abrir painel",
    onPress,
    disabled: true,
  });
  expect(element.props.label).toBe("Abrir painel");
  expect(element.props.modifiers).toEqual([{ label: "Abrir" }]);
  expect(element.props.disabled).toBe(true);
  element.props.onPress();
  expect(onPress).toHaveBeenCalledOnce();
});
