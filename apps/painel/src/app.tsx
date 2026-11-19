import { Admin, Resource } from "react-admin";
import { criarAuthProvider } from "./authProvider";
import { criarDataProvider } from "./dataProvider";
import { EventoShow } from "./eventos/EventoShow";
import { EventosList } from "./eventos/EventosList";
import { LoginPage } from "./LoginPage";
import {
  apiKey,
  instanceUrl,
  supabase,
  supabaseConfigurado,
} from "./supabaseClient";

const textos = {
  titulo: "Farol — curadoria",
};

function SemConfiguracao() {
  return (
    <main>
      <h1>{textos.titulo}</h1>
      <p>
        VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY não configurados. Veja
        o README deste pacote para rodar e logar localmente.
      </p>
    </main>
  );
}

// Painel mínimo: login de curador, lista/detalhe dos eventos coletados,
// aprovar/rejeitar, exportação mínima e registro de incorporação com o
// estado do vínculo. Curadoria nunca escreve na agenda pública (ADR-0009).
export function App() {
  if (!supabaseConfigurado || !supabase || !instanceUrl || !apiKey) {
    return <SemConfiguracao />;
  }
  return (
    <Admin
      title={textos.titulo}
      dataProvider={criarDataProvider(instanceUrl, supabase)}
      authProvider={criarAuthProvider(supabase)}
      loginPage={LoginPage}
      disableTelemetry
    >
      <Resource
        name="events"
        options={{ label: "Eventos coletados" }}
        list={EventosList}
        show={EventoShow}
      />
    </Admin>
  );
}
