import { useState } from "react";
import {
  Button,
  Confirm,
  useListContext,
  useNotify,
  useRefresh,
} from "react-admin";
import { supabase } from "../supabaseClient";
import type { EventoColetado, StatusCuradoria } from "./acoes";

const TEXTOS = {
  aprovar: "Aprovar selecionados",
  rejeitar: "Rejeitar selecionados",
  confirmar: "Confirmar",
  cancelar: "Cancelar",
  conteudo:
    "Confirmar a decisão para os eventos selecionados? Aprovar não publica na agenda.",
  selecao:
    "Selecione de 1 a 100 eventos com versões carregadas. Recarregue a lista antes de tentar novamente.",
  erro: "Não foi possível concluir a curadoria em lote. Recarregue a lista antes de tentar novamente.",
  conflito:
    " Recarregue a lista e revise os conflitos antes de confirmar uma nova decisão.",
  resumo: (alterados: number, conflitos: number, ausentes: number) =>
    `${alterados} alterados; ${conflitos} conflitos; ${ausentes} ausentes.`,
};

interface ResultadoLote {
  alterados: number[];
  conflitos: number[];
  ausentes: number[];
}

export function CurarEmLoteBotoes() {
  const { selectedIds, data, onUnselectItems } =
    useListContext<EventoColetado>();
  const notify = useNotify();
  const refresh = useRefresh();
  const [status, setStatus] = useState<StatusCuradoria | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [itens, setItens] = useState<{ id: number; version: number }[]>([]);

  function preparar(decisao: StatusCuradoria) {
    const selecionados = selectedIds.map((id) =>
      data?.find((evento) => String(evento.id) === String(id)),
    );
    if (
      selecionados.length < 1 ||
      selecionados.length > 100 ||
      selecionados.some(
        (evento) =>
          !evento ||
          !Number.isInteger(evento.id) ||
          !Number.isInteger(evento.version),
      )
    ) {
      notify(TEXTOS.selecao, { type: "warning" });
      return;
    }
    setItens(
      selecionados.flatMap((evento) =>
        evento ? [{ id: evento.id, version: evento.version }] : [],
      ),
    );
    setStatus(decisao);
  }

  async function confirmar() {
    if (!status || enviando) return;
    setEnviando(true);
    try {
      if (!supabase) throw new Error(TEXTOS.erro);
      const { data: resultado, error } = await supabase.rpc("curar_eventos", {
        p_itens: itens,
        p_status: status,
      });
      if (error) throw error;
      const { alterados, conflitos, ausentes } = resultado as ResultadoLote;
      const temConflito = conflitos.length > 0;
      notify(
        TEXTOS.resumo(alterados.length, conflitos.length, ausentes.length) +
          (temConflito ? TEXTOS.conflito : ""),
        { type: temConflito || ausentes.length > 0 ? "warning" : "success" },
      );
      refresh();
      onUnselectItems();
    } catch {
      notify(TEXTOS.erro, { type: "error" });
    } finally {
      setEnviando(false);
      setStatus(null);
    }
  }

  return (
    <>
      <Button
        label={TEXTOS.aprovar}
        disabled={enviando}
        onClick={() => preparar("approved")}
      />
      <Button
        label={TEXTOS.rejeitar}
        disabled={enviando}
        onClick={() => preparar("rejected")}
      />
      <Confirm
        isOpen={status !== null}
        loading={enviando}
        title={status === "approved" ? TEXTOS.aprovar : TEXTOS.rejeitar}
        content={TEXTOS.conteudo}
        confirm={TEXTOS.confirmar}
        cancel={TEXTOS.cancelar}
        onConfirm={confirmar}
        onClose={() => {
          if (!enviando) setStatus(null);
        }}
      />
    </>
  );
}
