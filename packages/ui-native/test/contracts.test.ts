import { expectTypeOf, it } from "vitest";
import type {
  ButtonProps,
  ListSectionProps,
  SheetProps,
  ToggleProps,
} from "../src/index";

it("exige accessibilityLabel nos quatro contratos públicos", () => {
  expectTypeOf<object>().not.toExtend<
    Pick<ButtonProps, "accessibilityLabel">
  >();
  expectTypeOf<object>().not.toExtend<
    Pick<ToggleProps, "accessibilityLabel">
  >();
  expectTypeOf<object>().not.toExtend<
    Pick<ListSectionProps, "accessibilityLabel">
  >();
  expectTypeOf<object>().not.toExtend<Pick<SheetProps, "accessibilityLabel">>();
});
