import { createContext, useContext } from "react";
import {
  Datagrid,
  DateField,
  FunctionField,
  List,
  TextField,
  useListContext,
} from "react-admin";
import { supabase } from "../supabaseClient";
import type { EstadoVinculo, EventoColetado } from "./acoes";
import { EstadoVinculoTexto } from "./EstadoVinculoTexto";
import { ExportarAprovadosButton } from "./ExportarAprovadosButton";
import { useVinculos } from "./useVinculos";

const VinculosContexto = createContext<Record<number, EstadoVinculo>>({});

function ColunaVinculo({ record }: { record: EventoColetado }) {
  const vinculos = useContext(VinculosContexto);
  return <EstadoVinculoTexto vinculo={vinculos[record.id]} />;
}

// Busca os vínculos uma vez por página (ids da lista atual), não por linha.
function EventosListConteudo() {
  const { data } = useListContext<EventoColetado>();
  const ids = (data ?? []).map((registro) => registro.id);
  const vinculos = useVinculos(supabase, ids);

  return (
    <VinculosContexto.Provider value={vinculos}>
      <Datagrid rowClick="show">
        <TextField source="id" label="ID" />
        <TextField source="title" label="Título" />
        <TextField source="city" label="Cidade" />
        <DateField source="starts_at" label="Início" showTime />
        <TextField source="collection_status" label="Coleta" />
        <TextField source="curation_status" label="Curadoria" />
        <TextField source="version" label="Versão" />
        <FunctionField
          label="Vínculo institucional"
          render={(record: EventoColetado) => <ColunaVinculo record={record} />}
        />
      </Datagrid>
    </VinculosContexto.Provider>
  );
}

export function EventosList() {
  return (
    <List
      title="Eventos coletados"
      actions={<ExportarAprovadosButton />}
      sort={{ field: "created_at", order: "DESC" }}
      perPage={25}
    >
      <EventosListConteudo />
    </List>
  );
}
