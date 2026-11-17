import { createClient } from "@supabase/supabase-js";
import { supabaseDataProvider } from "ra-supabase";
import { Admin } from "react-admin";

const textos = {
  titulo: "Farol — prova de compatibilidade U0.3",
  descricao:
    "React-admin e ra-supabase instalados; painel operacional ainda não habilitado.",
};

function Compatibilidade() {
  return (
    <main>
      <h1>{textos.titulo}</h1>
      <p>{textos.descricao}</p>
    </main>
  );
}

// Apenas uma prova de composição/build. Não há recursos, login por senha,
// descoberta automática de tabelas ou ações de escrita nesta etapa.
// Nunca configurar service_role no Vite: qualquer VITE_* é dado público.
const instanceUrl = import.meta.env.VITE_SUPABASE_URL;
const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const dataProvider =
  instanceUrl && apiKey
    ? supabaseDataProvider({
        instanceUrl,
        apiKey,
        supabaseClient: createClient(instanceUrl, apiKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }),
      })
    : null;

export function App() {
  if (!dataProvider) return <Compatibilidade />;
  return (
    <Admin
      title={textos.titulo}
      dataProvider={dataProvider}
      dashboard={Compatibilidade}
      ready={Compatibilidade}
      disableTelemetry
      loginPage={false}
    />
  );
}
