import { ListSubheader } from "@mui/material";
import { Admin, Layout, Menu, Resource } from "react-admin";
import { criarAuthProvider } from "./authProvider";
import { criarDataProvider } from "./dataProvider";
import { EventoShow } from "./eventos/EventoShow";
import { EventosList } from "./eventos/EventosList";
import { InstanciasPage } from "./instancias/InstanciasPage";
import { LoginPage } from "./LoginPage";
import { m } from "./mensagens";
import {
  EspacosList,
  EspacosShow,
  ExecucoesList,
  ExecucoesShow,
  ExportacoesList,
  ExportacoesShow,
  FontesList,
  FontesShow,
} from "./recursosLeitura";
import {
  apiKey,
  instanceUrl,
  supabase,
  supabaseConfigurado,
} from "./supabaseClient";

function MenuPainel() {
  return (
    <Menu>
      <ListSubheader>{m.menu.curadoria}</ListSubheader>
      <Menu.ResourceItem name="events" />
      <Menu.ResourceItem name="spaces" />
      <ListSubheader>{m.menu.operacao}</ListSubheader>
      <Menu.ResourceItem name="instancias-oficiais" />
      <Menu.ResourceItem name="sources" />
      <Menu.ResourceItem name="job_runs" />
      <Menu.ResourceItem name="exports" />
    </Menu>
  );
}
// Em telas estreitas a tabela rola dentro do próprio contêiner, sem alargar a página.
const sxLayout = {
  minWidth: 0,
  "& .RaLayout-appFrame, & .RaLayout-contentWithSidebar, & .RaLayout-content": {
    minWidth: 0,
  },
  "& .RaList-main": { minWidth: 0 },
  "& .RaDatagrid-tableWrapper": { overflowX: "auto" },
};

const LayoutPainel = (props: React.ComponentProps<typeof Layout>) => (
  <Layout {...props} menu={MenuPainel} sx={sxLayout} />
);

function SemConfiguracao() {
  return (
    <main>
      <h1>{m.titulo}</h1>
      <p>{m.semConfiguracao}</p>
    </main>
  );
}

// Painel mínimo: login de curador, lista/detalhe dos eventos coletados,
// aprovar/rejeitar, exportação mínima e operação da agenda por instância oficial.
// Curadoria nunca escreve na agenda pública (ADR-0009).
export function App() {
  if (!supabaseConfigurado || !supabase || !instanceUrl || !apiKey) {
    return <SemConfiguracao />;
  }
  return (
    <Admin
      title={m.titulo}
      dataProvider={criarDataProvider(instanceUrl, supabase)}
      authProvider={criarAuthProvider(supabase)}
      loginPage={LoginPage}
      layout={LayoutPainel}
      disableTelemetry
    >
      <Resource
        name="events"
        options={{ label: m.recursos.events }}
        list={EventosList}
        show={EventoShow}
      />
      <Resource
        name="spaces"
        options={{ label: m.recursos.spaces }}
        list={EspacosList}
        show={EspacosShow}
      />
      <Resource
        name="instancias-oficiais"
        options={{ label: m.instancias.titulo }}
        list={InstanciasPage}
      />
      <Resource
        name="sources"
        options={{ label: m.recursos.sources }}
        list={FontesList}
        show={FontesShow}
        recordRepresentation="name"
      />
      <Resource
        name="job_runs"
        options={{ label: m.recursos.job_runs }}
        list={ExecucoesList}
        show={ExecucoesShow}
      />
      <Resource
        name="exports"
        options={{ label: m.recursos.exports }}
        list={ExportacoesList}
        show={ExportacoesShow}
      />
    </Admin>
  );
}
