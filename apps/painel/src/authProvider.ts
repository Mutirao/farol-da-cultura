import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthProvider } from "react-admin";

export interface ParametrosLogin {
  email: string;
  token: string;
}

// Login de curador sem senha: a tela (LoginPage) já pediu o código via
// signInWithOtp com shouldCreateUser:false e exigiu um clique explícito de
// confirmação antes de chegar aqui. authProvider.login só faz a 2ª etapa
// (verifyOtp) — react-admin chama isso a partir de useLogin().
export function criarAuthProvider(supabase: SupabaseClient): AuthProvider {
  return {
    async login({ email, token }: ParametrosLogin) {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) throw error;
    },

    async logout() {
      await supabase.auth.signOut();
    },

    // Exige current_curator() não nulo, não só uma sessão válida: curador
    // desativado perde acesso mesmo com JWT ainda vigente.
    async checkAuth() {
      const { data: sessao } = await supabase.auth.getSession();
      if (!sessao.session) {
        // Rejeição "muda": ainda não houve tentativa de login, react-admin
        // só redireciona para a tela de login, sem notificação de erro.
        return Promise.reject();
      }
      const { data: curadorId, error } = await supabase.rpc("current_curator");
      if (error || curadorId === null || curadorId === undefined) {
        await supabase.auth.signOut();
        throw new Error("operador sem vínculo de curador ativo");
      }
    },

    async checkError(error: { status?: number }) {
      if (error?.status === 401 || error?.status === 403) {
        await supabase.auth.signOut();
        throw error;
      }
    },

    async getIdentity() {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? "curador";
      return { id: data.user?.id ?? email, fullName: email };
    },

    async getPermissions() {
      return undefined;
    },
  };
}
