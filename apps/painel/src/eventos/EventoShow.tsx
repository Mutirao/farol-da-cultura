import {
  Alert,
  Button,
  TextField as MuiTextField,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import {
  DateField,
  Show,
  SimpleShowLayout,
  TextField,
  useNotify,
  useRecordContext,
  useRefresh,
} from "react-admin";
import { supabase } from "../supabaseClient";
import {
  curarEvento,
  type EventoColetado,
  registrarIncorporacao,
} from "./acoes";
import { EstadoVinculoTexto } from "./EstadoVinculoTexto";
import { useVinculo } from "./useVinculos";

function mensagemErroCuradoria(erro: unknown): string {
  const codigo = (erro as { code?: string } | undefined)?.code;
  if (codigo === "23505") {
    return "Version divergente: outra coleta ou curadoria mudou o evento; recarregue a página.";
  }
  if (codigo === "42501") {
    return "Operador sem vínculo de curador ativo.";
  }
  return "Falha ao registrar a curadoria.";
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
      notify(status === "approved" ? "Evento aprovado." : "Evento rejeitado.", {
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
        Aprovar
      </Button>
      <Button
        variant="outlined"
        color="error"
        disabled={enviando}
        onClick={() => curar("rejected")}
      >
        Rejeitar
      </Button>
    </Stack>
  );
}

function RegistrarIncorporacaoForm() {
  const record = useRecordContext<EventoColetado>();
  const refresh = useRefresh();
  const notify = useNotify();
  const [instancia, setInstancia] = useState("");
  const [base, setBase] = useState("mapa-cultural-ce");
  const [mapasId, setMapasId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [estadoVinculo, refetchVinculo] = useVinculo(supabase, record?.id);

  if (!record || !supabase) return null;

  if (record.curation_status !== "approved") {
    return (
      <Alert severity="info">
        Registrar incorporação exige evento aprovado na curadoria.
      </Alert>
    );
  }

  const registrar = async () => {
    if (!supabase) return;
    setEnviando(true);
    try {
      await registrarIncorporacao(supabase, {
        eventId: record.id,
        instancia,
        base,
        mapasId,
      });
      notify(
        "Incorporação registrada (estado: registrado, aguarda confirmação).",
        { type: "info" },
      );
      refetchVinculo();
    } catch {
      notify("Falha ao registrar a incorporação.", { type: "error" });
    } finally {
      setEnviando(false);
      refresh();
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1">
        Registrar incorporação na instância
      </Typography>
      <EstadoVinculoTexto vinculo={estadoVinculo} />
      <MuiTextField
        label="Instância"
        value={instancia}
        onChange={(evento) => setInstancia(evento.target.value)}
      />
      <MuiTextField
        label="Base"
        value={base}
        onChange={(evento) => setBase(evento.target.value)}
      />
      <MuiTextField
        label="ID no Mapas"
        value={mapasId}
        onChange={(evento) => setMapasId(evento.target.value)}
      />
      <Button
        variant="contained"
        disabled={enviando || !instancia || !base || !mapasId}
        onClick={registrar}
      >
        Registrar incorporação
      </Button>
    </Stack>
  );
}

export function EventoShow() {
  return (
    <Show title="Evento coletado">
      <SimpleShowLayout>
        <TextField source="id" label="ID" />
        <TextField source="title" label="Título" />
        <TextField source="city" label="Cidade" />
        <DateField source="starts_at" label="Início" showTime />
        <TextField source="collection_status" label="Coleta" />
        <TextField source="curation_status" label="Curadoria" />
        <TextField source="version" label="Versão" />
        <AcoesDeCuradoria />
        <RegistrarIncorporacaoForm />
      </SimpleShowLayout>
    </Show>
  );
}
