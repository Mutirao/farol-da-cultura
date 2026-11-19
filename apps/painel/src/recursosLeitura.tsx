import {
  BooleanField,
  Datagrid,
  DateField,
  FunctionField,
  List,
  Show,
  SimpleShowLayout,
  TextField,
} from "react-admin";
import { colunasExportacoes } from "./dataProvider";
import { formatoData, m } from "./mensagens";

type Campo = keyof typeof m.campos;
type Recurso = "sources" | "spaces" | "job_runs" | "exports";
export const camposRecursos: Record<Recurso, Campo[]> = {
  sources: [
    "id",
    "slug",
    "name",
    "kind",
    "is_active",
    "created_at",
    "updated_at",
  ],
  spaces: [
    "id",
    "normalized_name",
    "municipality",
    "is_active",
    "is_stale",
    "last_synced_at",
    "mapas_space_id",
  ],
  job_runs: [
    "id",
    "job_type",
    "status",
    "owner",
    "started_at",
    "finished_at",
    "counters",
    "error",
  ],
  exports: [
    "id",
    "status",
    "row_count",
    "checksum_sha256",
    "schema_version",
    "created_by",
    "created_at",
    "updated_at",
  ],
};

function campos(recurso: Recurso) {
  return camposRecursos[recurso].map((source) => {
    const props = { source, label: m.campos[source] };
    if (["is_active", "is_stale"].includes(source)) {
      return <BooleanField key={source} {...props} />;
    }
    if (source.endsWith("_at")) {
      return (
        <DateField
          key={source}
          {...props}
          showTime
          locales="pt-BR"
          options={formatoData}
        />
      );
    }
    if (["counters", "error"].includes(source)) {
      return (
        <FunctionField
          key={source}
          {...props}
          render={(registro) => JSON.stringify(registro[source])}
        />
      );
    }
    return <TextField key={source} {...props} />;
  });
}

function lista(recurso: Recurso) {
  return function ListaLeitura() {
    return (
      <List
        title={m.recursos[recurso]}
        exporter={false}
        queryOptions={{
          meta: {
            columns:
              recurso === "exports"
                ? colunasExportacoes
                : camposRecursos[recurso],
          },
        }}
      >
        <Datagrid rowClick="show" bulkActionButtons={false}>
          {campos(recurso)}
        </Datagrid>
      </List>
    );
  };
}
function detalhe(recurso: Recurso) {
  return function DetalheLeitura() {
    return (
      <Show
        title={m.recursos[recurso]}
        queryOptions={{
          meta: {
            columns:
              recurso === "exports"
                ? colunasExportacoes
                : camposRecursos[recurso],
          },
        }}
      >
        <SimpleShowLayout>{campos(recurso)}</SimpleShowLayout>
      </Show>
    );
  };
}

export const FontesList = lista("sources");
export const FontesShow = detalhe("sources");
export const EspacosList = lista("spaces");
export const EspacosShow = detalhe("spaces");
export const ExecucoesList = lista("job_runs");
export const ExecucoesShow = detalhe("job_runs");
export const ExportacoesList = lista("exports");
export const ExportacoesShow = detalhe("exports");
