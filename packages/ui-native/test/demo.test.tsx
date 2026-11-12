import { expect, it, vi } from "vitest";

const config = vi.hoisted(() => ({
  expoConfig: { ios: { bundleIdentifier: "br.com.farol.cultura" } },
}));
vi.mock("../../../apps/app/node_modules/expo-constants", () => ({
  default: config,
}));
vi.mock("../../../apps/app/node_modules/expo-router", () => ({
  Redirect: "Redirect",
}));
vi.mock("@farol/ui-native", () => ({}));

import DemoRoute from "../../../apps/app/src/app/(dev)/ui-demo";

it("nega links diretos em production, preview e configuração ausente", () => {
  for (const id of [
    "br.com.farol.cultura",
    "br.com.farol.cultura.preview",
    "",
  ]) {
    config.expoConfig.ios.bundleIdentifier = id;
    expect(DemoRoute().props.href).toBe("/agenda");
  }
});
it("permite conteúdo somente na identidade gerada por APP_VARIANT=development", () => {
  config.expoConfig.ios.bundleIdentifier = "br.com.farol.cultura.dev";
  expect(DemoRoute().props.href).toBeUndefined();
});
