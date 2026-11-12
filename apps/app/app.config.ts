import type { ExpoConfig } from "expo/config";

const variants = {
  development: { id: "br.com.farol.cultura.dev", name: "Farol Dev" },
  preview: { id: "br.com.farol.cultura.preview", name: "Farol Preview" },
  production: { id: "br.com.farol.cultura", name: "Farol da Cultura" },
} as const;
const variant = process.env.APP_VARIANT ?? "development";
if (!(variant in variants)) throw new Error(`APP_VARIANT inválida: ${variant}`);
const selected = variants[variant as keyof typeof variants];

const config: ExpoConfig = {
  name: selected.name,
  slug: "farol-da-cultura",
  owner: "lpirola",
  extra: { eas: { projectId: "e0eb648f-ab50-41a1-b980-601872a81120" } },
  version: "0.1.0",
  platforms: ["ios", "android"],
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: selected.id,
  userInterfaceStyle: "automatic",
  ios: { bundleIdentifier: selected.id, supportsTablet: true },
  android: { package: selected.id },
  plugins: ["expo-router", "expo-localization", "expo-dev-client"],
  experiments: { typedRoutes: true, reactCompiler: true },
};
export default config;
