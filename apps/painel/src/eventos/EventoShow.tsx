import { Alert, Button, Stack } from "@mui/material";
import { useState } from "react";
import {
  DateField,
  Link,
  Show,
  SimpleShowLayout,
  TextField,
  useNotify,
  useRecordContext,
  useRefresh,
} from "react-admin";
import { formatoData, m } from "../mensagens";
import { supabase } from "../supabaseClient";
import { curarEvento, type EventoColetado } from "./acoes";
import { EstadoVinculoTexto } from "./EstadoVinculoTexto";
import { useVinculo } from "./useVinculos";

function mensagemErroCuradoria(erro: unknown): string {
  const codigo = (erro as { code?: string } | undefined)?.code;
  if (codigo === "23505") {
    return m.evento.divergencia;
  }
  if (codigo === "42501") {
    return m.evento.semCurador;
  }
  return m.evento.falhaCuradoria;
}

function AcoesDeCuradoria() {
  const record = useRecordContext<EventoColetado>();
  const refresh = useRefresh();
  const notify = useNotify();
  const [enviando, setEnviando] = useState(false);
  if (!record || !supabase) return null;

  const curar = async (status: "approved" | "rejected") => {
    if (!supabase) return;
    setEnviando(true);
    try {
      await curarEvento(
        supabase,
        { id: record.id, version: record.version },
        status,
      );
      notify(status === "approved" ? m.evento.aprovado : m.evento.rejeitado, {
        type: "info",
      });
    } catch (erro) {
      notify(mensagemErroCuradoria(erro), { type: "error" });
    } finally {
      setEnviando(false);
      refresh();
    }
  };

  return (
    <Stack direction="row" spacing={1}>
      <Button
        variant="contained"
        disabled={enviando}
        onClick={() => curar("approved")}
      >
        {m.evento.aprovar}
      </Button>
      <Button
        variant="outlined"
        color="error"
        disabled={enviando}
        onClick={() => curar("rejected")}
      >
        {m.evento.rejeitar}
      </Button>
    </Stack>
  );
}

function VinculoInstitucional() {
  const record = useRecordContext<EventoColetado>();
  const vinculo = useVinculo(supabase, record?.id);
  return vinculo ? <EstadoVinculoTexto vinculo={vinculo} /> : null;
}

export function EventoShow() {
  return (
    <Show title={m.evento.titulo}>
      <SimpleShowLayout>
        <TextField source="id" label={m.campos.id} />
        <TextField source="title" label={m.campos.title} />
        <TextField source="city" label={m.campos.city} />
        <DateField
          source="starts_at"
          label={m.campos.starts_at}
          showTime
          locales="pt-BR"
          options={formatoData}
        />
        <TextField source="description" label={m.campos.description} />
        <DateField
          source="ends_at"
          label={m.campos.ends_at}
          showTime
          locales="pt-BR"
          options={formatoData}
        />
        <TextField source="venue_name" label={m.campos.venue_name} />
        <TextField source="is_free" label={m.campos.is_free} />
        <TextField source="source_id" label={m.campos.source_id} />
        <TextField
          source="space_match_status"
          label={m.campos.space_match_status}
        />
        <TextField source="export_status" label={m.campos.export_status} />
        <TextField
          source="mapas_import_status"
          label={m.campos.mapas_import_status}
        />
        <TextField
          source="collection_status"
          label={m.campos.collection_status}
        />
        <TextField source="curation_status" label={m.campos.curation_status} />
        <TextField source="version" label={m.campos.version} />
        <AcoesDeCuradoria />
        <VinculoInstitucional />
        <Alert severity="info">
          <Stack spacing={1} alignItems="flex-start">
            {m.evento.sobreInstancias}
            <Link to="/instancias-oficiais">{m.instancias.titulo}</Link>
          </Stack>
        </Alert>
      </SimpleShowLayout>
    </Show>
  );
}
