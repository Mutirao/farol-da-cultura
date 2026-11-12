import Constants from "expo-constants";

// Mesmo padrão do guard de (dev)/ui-demo.tsx: a identidade vem de app.config.ts
// (APP_VARIANT), lida do campo da plataforma em execução.
const SPIKE_IDENTIFIERS = new Set([
  "br.com.farol.cultura.dev",
  "br.com.farol.cultura.preview",
]);

/** Rotas do spike F0-10 só abrem nos variants .dev e .preview. */
export function isSpikeVariant(): boolean {
  const resolvedIdentifier =
    Constants.expoConfig?.ios?.bundleIdentifier ??
    Constants.expoConfig?.android?.package;
  return (
    resolvedIdentifier !== undefined &&
    SPIKE_IDENTIFIERS.has(resolvedIdentifier)
  );
}
