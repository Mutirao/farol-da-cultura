import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { Authenticated, Title } from "react-admin";
import type {
  CatalogoOficial,
  InstanciaOficial,
  PedidoInstancias,
  PreviaOficial,
  ResultadoSync,
} from "../../../../workers/coleta/src/contratoInstancias";
import { m } from "../mensagens";
import { supabase } from "../supabaseClient";

const t = m.instancias;
type Operar = (pedido: PedidoInstancias) => Promise<unknown>;
type Catalogo =
  | { estado: "carregando" }
  | { estado: "erro"; mensagem: string }
  | { estado: "pronto"; dados: CatalogoOficial };

function mensagem(erro: unknown) {
  return erro instanceof Error && Object.hasOwn(t.erros, erro.message)
    ? t.erros[erro.message as keyof typeof t.erros]
    : t.erros.painel_indisponivel;
}

async function operarNoServidor(pedido: PedidoInstancias) {
  if (!supabase) throw new Error("painel_indisponivel");
  const { data, error } = await supabase.functions.invoke(
    "instancias-oficiais",
    {
      body: pedido,
    },
  );
  if (error instanceof FunctionsHttpError) {
    const resposta = await error.context.json().catch(() => null);
    throw new Error(resposta?.erro ?? "painel_indisponivel");
  }
  if (error) throw error;
  return data;
}

const dia = (iso: string) => iso.split("-").reverse().join("/");

function Instancia({
  instancia,
  sincronizacao,
  operar,
}: {
  instancia: InstanciaOficial;
  sincronizacao: boolean;
  operar: Operar;
}) {
  const [previa, setPrevia] = useState<PreviaOficial>();
  const [resultado, setResultado] = useState<ResultadoSync>();
  const [erro, setErro] = useState<string>();
  const [dialogo, setDialogo] = useState(false);
  const [atividade, setAtividade] = useState<"buscar" | "sincronizar">();
  const bloqueio = useRef(false);
  const botaoBusca = useRef<HTMLButtonElement>(null);
  const botaoSync = useRef<HTMLButtonElement>(null);
  const dataHora = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: instancia.fuso,
  });

  async function executar(acao: "buscar" | "sincronizar") {
    if (bloqueio.current) return;
    const pedido: PedidoInstancias =
      acao === "buscar"
        ? { acao, instancia: instancia.id }
        : { acao, instancia: instancia.id, revisao: previa?.revisao ?? "" };
    if (pedido.acao === "sincronizar" && !previa?.sincronizavel) return;
    bloqueio.current = true;
    setAtividade(acao);
    setErro(undefined);
    setResultado(undefined);
    if (acao === "buscar") setPrevia(undefined);
    try {
      const resposta = await operar(pedido);
      if (acao === "buscar") setPrevia(resposta as PreviaOficial);
      else setResultado((resposta as { resultado: ResultadoSync }).resultado);
    } catch (falha) {
      setErro(mensagem(falha));
    } finally {
      if (acao === "sincronizar") {
        setDialogo(false);
        setPrevia(undefined);
      }
      bloqueio.current = false;
      setAtividade(undefined);
    }
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Typography component="h2" variant="h6">
              {instancia.nome}
            </Typography>
            <Link href={instancia.site} target="_blank" rel="noreferrer">
              {t.abrirSite}
            </Link>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              ref={botaoBusca}
              variant="contained"
              sx={{ minHeight: 44 }}
              aria-disabled={!!atividade}
              onClick={() => void executar("buscar")}
            >
              {atividade === "buscar" ? t.buscando : t.buscar}
            </Button>
            {previa?.sincronizavel && (
              <Button
                ref={botaoSync}
                variant="outlined"
                sx={{ minHeight: 44 }}
                disabled={!!atividade}
                onClick={() => setDialogo(true)}
              >
                {t.sincronizar}
              </Button>
            )}
          </Stack>
          {!sincronizacao && (
            <Typography variant="body2" color="text.secondary">
              {t.desativada}
            </Typography>
          )}
          {erro && <Alert severity="error">{erro}</Alert>}
          {resultado && (
            <Alert severity="success" role="status">
              {t.resultado(
                resultado.eventos.criados,
                resultado.eventos.alterados,
                resultado.datas.criadas,
                resultado.datas.alteradas,
                resultado.datas.removidas,
              )}
            </Alert>
          )}
          {previa && (
            <>
              <Divider />
              <Box aria-live="polite">
                <Typography component="h3" variant="subtitle1">
                  {t.previa}
                </Typography>
                <Typography variant="body2">
                  {t.periodo(dia(previa.de), dia(previa.ate))}
                </Typography>
                <Typography>
                  {t.totais(previa.totalEventos, previa.ocorrencias)}
                </Typography>
              </Box>
              {previa.rejeitadas > 0 && (
                <Alert severity="warning">
                  {t.rejeitadas(previa.rejeitadas)}
                </Alert>
              )}
              {previa.totalEventos === 0 && (
                <Alert severity="info">{t.semEventos}</Alert>
              )}
              {previa.totalEventos > 0 &&
                sincronizacao &&
                !previa.sincronizavel &&
                previa.rejeitadas === 0 && (
                  <Alert severity="warning">{t.erros.lote_inseguro}</Alert>
                )}
              {previa.eventos.length < previa.totalEventos && (
                <Typography variant="body2">
                  {t.amostra(previa.eventos.length)}
                </Typography>
              )}
              {previa.eventos.length > 0 && (
                <Stack
                  component="ul"
                  divider={<Divider component="li" />}
                  sx={{ listStyle: "none", p: 0, m: 0 }}
                >
                  {previa.eventos.map((evento) => (
                    <Box
                      component="li"
                      key={evento.id}
                      sx={{ py: 1, overflowWrap: "anywhere" }}
                    >
                      <Typography>{evento.nome}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {[
                          dataHora.format(new Date(evento.inicio)),
                          evento.municipio,
                          t.contarOcorrencias(evento.ocorrencias),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </>
          )}
        </Stack>
      </CardContent>
      <Dialog
        open={dialogo}
        onClose={() => !bloqueio.current && setDialogo(false)}
        aria-labelledby={`confirmar-${instancia.id}`}
        aria-describedby={`impacto-${instancia.id}`}
        slotProps={{
          transition: {
            onExited: () => {
              (botaoSync.current ?? botaoBusca.current)?.focus();
            },
          },
        }}
      >
        <DialogTitle id={`confirmar-${instancia.id}`}>
          {t.confirmarTitulo}
        </DialogTitle>
        <DialogContent>
          <Typography id={`impacto-${instancia.id}`}>
            {t.impacto(instancia.nome)}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap" }}>
          <Button
            autoFocus
            disabled={!!atividade}
            onClick={() => setDialogo(false)}
          >
            {t.cancelar}
          </Button>
          <Button
            variant="contained"
            disabled={!!atividade}
            onClick={() => void executar("sincronizar")}
          >
            {atividade === "sincronizar" ? t.sincronizando : t.confirmar}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

export function InstanciasConteudo({ operar }: { operar: Operar }) {
  const [tentativa, setTentativa] = useState(0);
  const [catalogo, setCatalogo] = useState<Catalogo>({ estado: "carregando" });
  useEffect(() => {
    let ativa = true;
    operar({ acao: "listar" })
      .then((dados) => {
        if (ativa)
          setCatalogo({ estado: "pronto", dados: dados as CatalogoOficial });
      })
      .catch((erro: unknown) => {
        if (ativa) setCatalogo({ estado: "erro", mensagem: mensagem(erro) });
      });
    return () => {
      ativa = false;
    };
  }, [operar, tentativa]);

  return (
    <Stack spacing={2} sx={{ maxWidth: 960, width: "100%", my: 2 }}>
      <Box>
        <Typography component="h1" variant="h5">
          {t.titulo}
        </Typography>
        <Typography color="text.secondary">{t.instrucao}</Typography>
      </Box>
      {catalogo.estado === "carregando" && (
        <Typography role="status">{t.carregando}</Typography>
      )}
      {catalogo.estado === "erro" && (
        <Stack spacing={1} alignItems="flex-start">
          <Alert severity="error">{catalogo.mensagem}</Alert>
          <Button
            onClick={() => {
              setCatalogo({ estado: "carregando" });
              setTentativa(tentativa + 1);
            }}
          >
            {t.tentar}
          </Button>
        </Stack>
      )}
      {catalogo.estado === "pronto" &&
        (catalogo.dados.instancias.length === 0 ? (
          <Alert severity="info">{t.semInstancias}</Alert>
        ) : (
          catalogo.dados.instancias.map((instancia) => (
            <Instancia
              key={instancia.id}
              instancia={instancia}
              sincronizacao={catalogo.dados.sincronizacao}
              operar={operar}
            />
          ))
        ))}
    </Stack>
  );
}

export function InstanciasPage() {
  return (
    <Authenticated>
      <Title title={t.titulo} />
      <InstanciasConteudo operar={operarNoServidor} />
    </Authenticated>
  );
}
