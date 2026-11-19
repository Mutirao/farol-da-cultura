import { createContext, useContext } from "react";
import {
  BulkActionsToolbar,
  Datagrid,
  DateField,
  DateInput,
  FilterButton,
  FunctionField,
  List,
  ListContextProvider,
  Pagination,
  ReferenceField,
  ReferenceInput,
  SelectInput,
  TextField,
  TextInput,
  TopToolbar,
  useListContext,
  useRecordSelection,
} from "react-admin";
import { formatoData, m } from "../mensagens";
import { supabase } from "../supabaseClient";
import type { EstadoVinculo, EventoColetado } from "./acoes";
import { CurarEmLoteBotoes } from "./CurarEmLote";
import { EstadoVinculoTexto } from "./EstadoVinculoTexto";
import { ExportarAprovadosButton } from "./ExportarAprovadosButton";
import { useVinculos } from "./useVinculos";

export const ordenacaoEventos = { field: "starts_at", order: "ASC" as const };
function deslocarDia(valor: string, dias: number) {
  const data = new Date(`${valor.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(data.getTime())) return "";
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export function limiteInicio(valor: string, fim = false) {
  const dia = fim ? deslocarDia(valor ?? "", 1) : valor;
  return dia ? `${dia}T00:00:00-03:00` : null;
}
const filtros = [
  <SelectInput
    key="curadoria"
    source="curation_status"
    label={m.campos.curation_status}
    choices={["pending", "approved", "rejected"].map((id) => ({
      id,
      name: m.filtros[id as keyof typeof m.filtros],
    }))}
    alwaysOn
  />,
  <ReferenceInput
    key="fonte"
    source="source_id"
    reference="sources"
    sort={{ field: "name", order: "ASC" }}
  >
    <SelectInput optionText="name" label={m.campos.source_id} />
  </ReferenceInput>,
  <TextInput
    key="titulo"
    source="title@ilike"
    label={m.filtros.titulo}
    alwaysOn
  />,
  <DateInput
    key="de"
    source="starts_at@gte"
    label={m.filtros.inicioDe}
    parse={(v) => limiteInicio(v)}
    format={(v) => v?.slice(0, 10) ?? ""}
  />,
  <DateInput
    key="ate"
    source="starts_at@lt"
    label={m.filtros.inicioAte}
    parse={(v) => limiteInicio(v, true)}
    // O DateInput pode formatar novamente o dia já exibido.
    format={(v) => (v?.includes("T") ? deslocarDia(v, -1) : (v ?? ""))}
  />,
];

const VinculosContexto = createContext<Record<number, EstadoVinculo>>({});

function ColunaVinculo({ record }: { record: EventoColetado }) {
  const vinculos = useContext(VinculosContexto);
  return <EstadoVinculoTexto vinculo={vinculos[record.id]} />;
}

// O lote usa as versões da página exibida; trocar o recorte descarta a seleção.
function EventosListConteudo() {
  const { page, perPage, sort, filterValues } =
    useListContext<EventoColetado>();
  return (
    <EventosPagina key={JSON.stringify([page, perPage, sort, filterValues])} />
  );
}

function EventosPagina() {
  const lista = useListContext<EventoColetado>();
  const [selectedIds, selecao] = useRecordSelection<EventoColetado>({
    disableSyncWithStore: true,
  });
  const dados = lista.isPlaceholderData ? [] : (lista.data ?? []);
  const vinculos = useVinculos(
    supabase,
    dados.map(({ id }) => id),
  );

  return (
    <ListContextProvider
      value={{
        ...lista,
        selectedIds,
        onSelect: selecao.select,
        onToggleItem: selecao.toggle,
        onUnselectItems: selecao.clearSelection,
      }}
    >
      <VinculosContexto.Provider value={vinculos}>
        <Datagrid
          rowClick="show"
          isPending={Boolean(lista.isPending || lista.isPlaceholderData)}
          bulkActionButtons
          bulkActionsToolbar={
            <BulkActionsToolbar selectAllButton={false}>
              <CurarEmLoteBotoes />
            </BulkActionsToolbar>
          }
        >
          <TextField source="id" label={m.campos.id} />
          <TextField source="title" label={m.campos.title} />
          <ReferenceField
            source="source_id"
            reference="sources"
            label={m.campos.source_id}
            link="show"
          >
            <TextField source="name" />
          </ReferenceField>
          <TextField source="city" label={m.campos.city} />
          <DateField
            source="starts_at"
            label={m.campos.starts_at}
            locales="pt-BR"
            options={formatoData}
            showTime
          />
          <TextField source="export_status" label={m.campos.export_status} />
          <TextField
            source="collection_status"
            label={m.campos.collection_status}
          />
          <TextField
            source="curation_status"
            label={m.campos.curation_status}
          />
          <TextField source="version" label={m.campos.version} />
          <FunctionField
            label={m.campos.vinculo}
            render={(record: EventoColetado) => (
              <ColunaVinculo record={record} />
            )}
          />
        </Datagrid>
      </VinculosContexto.Provider>
    </ListContextProvider>
  );
}

export function EventosList() {
  return (
    <List
      title={m.recursos.events}
      actions={
        <TopToolbar sx={{ minWidth: 0, flexWrap: "wrap", rowGap: 1 }}>
          <FilterButton />
          <ExportarAprovadosButton />
        </TopToolbar>
      }
      filters={filtros}
      sort={ordenacaoEventos}
      perPage={50}
      pagination={<Pagination rowsPerPageOptions={[25, 50, 100]} />}
    >
      <EventosListConteudo />
    </List>
  );
}
