import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseDataProvider } from "ra-supabase";
import type { DataProvider } from "react-admin";

// Resource "events": PostgREST lê public.events pela RLS/GRANT de
// 20261117000200_curadoria_acesso.sql (curador ativo vê tudo; os demais, 0
// linhas). Escrita de curadoria passa pela RPC curar_evento, nunca por
// PATCH direto (authenticated não tem UPDATE na tabela).
export function criarDataProvider(
  instanceUrl: string,
  supabaseClient: SupabaseClient,
): DataProvider {
  return supabaseDataProvider({ instanceUrl, supabaseClient });
}
