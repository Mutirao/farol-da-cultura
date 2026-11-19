import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseDataProvider, supabaseHttpClient } from "ra-supabase";
import type { DataProvider } from "react-admin";

// GRANT de coluna em 20261117000200_curadoria_acesso.sql, nunca o CSV base64.
export const colunasExportacoes = [
  "id",
  "checksum_sha256",
  "schema_version",
  "row_count",
  "created_by",
  "status",
  "created_at",
  "updated_at",
];

export function criarDataProvider(
  instanceUrl: string,
  supabaseClient: SupabaseClient,
): DataProvider {
  const http = supabaseHttpClient({ supabaseClient });
  return supabaseDataProvider({
    instanceUrl,
    supabaseClient,
    httpClient: (endereco, options) => {
      const url = new URL(endereco);
      if (url.pathname.endsWith("/exports")) {
        // Vale para List, Show, referências e até callers sem meta.columns.
        url.searchParams.set("select", colunasExportacoes.join(","));
      }
      if (url.pathname.endsWith("/events")) {
        // qs do provider serializa dois limites como starts_at[0]/[1];
        // PostgREST exige a mesma coluna repetida, sem índices.
        for (const [chave, valor] of [...url.searchParams]) {
          if (/^starts_at\[\d+\]$/.test(chave)) {
            url.searchParams.append("starts_at", valor);
            url.searchParams.delete(chave);
          }
        }
        const ordem = url.searchParams.get("order");
        if (ordem && !/(^|,)id(\.|,|$)/.test(ordem)) {
          url.searchParams.set("order", `${ordem},id.asc`);
        }
      }
      return http(url.toString(), options);
    },
  });
}
