import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Tudo com prefixo VITE_ é público; nunca usar service_role aqui.
export const instanceUrl = import.meta.env.VITE_SUPABASE_URL as
  | string
  | undefined;
export const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

export const supabaseConfigurado = Boolean(instanceUrl && apiKey);

// Sessão persistida em localStorage: o login por código não usa redirect de
// URL (detectSessionInUrl desligado), o código é digitado na própria tela.
export const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(instanceUrl as string, apiKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
