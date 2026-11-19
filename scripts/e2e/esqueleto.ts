// S0.9 — e2e da corrente completa: scraper → curadoria → incorporação → instância de teste →
// sincronização → confirmação → agenda pública. Contra um Supabase ISOLADO (pilha.ts sobe/
// derruba; nunca o banco de demonstração em 54321/54322). Só API/CLI — RPC do Supabase (fetch)
// e a instância de teste HTTP (scripts/instancia-teste) — sem navegador nem Playwright.
//
// Passos 1–7, cada um com asserção; o 7 é o caso negativo. Relatório final: um objeto JSON,
// última linha do stdout (progresso de cada passo vai para stderr). Saída 0 só se todos os
// 7 passos passaram.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import {
  criarInstanciaTeste,
  type InstanciaTeste,
} from "../instancia-teste/servidor.ts";
import { provisionarCuradorTeste } from "./auth.ts";
import { subirPilhaIsolada } from "./pilha.ts";

const REPO_RAIZ = new URL("../../", import.meta.url);
// America/Fortaleza: UTC-3 fixo, sem horário de verão desde 2019 — ver nota abaixo.
const DESLOCAMENTO_FORTALEZA_MS = 3 * 60 * 60 * 1000;
// Mesma proveniência que workers/coleta/src/mapaCultural.ts#FONTE; registrar_incorporacao
// grava a base em texto livre, mas a confirmação (confirmar.ts) só aceita esta.
const FONTE_MAPAS = "mapa-cultural-ce";

/**
 * Importa um módulo de outro pacote do monorepo por URL calculada em runtime, nunca como
 * especificador estático. `workers/coleta` e `workers/sympla` dependem do lib `ESNext.Temporal`
 * (seus `tsconfig.json`), que `tsconfig.tooling.json` — o programa de `scripts/**\/*.ts`, rodado
 * por `pnpm run check:tooling` — não declara (mesma razão documentada no README de
 * scripts/instancia-teste: manter esse tsconfig sem precisar do lib). Um import estático dos
 * módulos de coleta arrastaria `Temporal.Instant`/`Temporal.PlainDateTime` para o mesmo programa
 * de typecheck e quebraria `check:tooling` com "Cannot find name 'Temporal'". Confirmado
 * empiricamente antes de escrever este arquivo. O preço é perder o tipo estático desses módulos
 * aqui (ficam `any`); é um script de teste, não código de produção.
 */
async function importarDoRepo<T>(caminhoRelativo: string): Promise<T> {
  return import(new URL(caminhoRelativo, REPO_RAIZ).href) as Promise<T>;
}

function doisDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

/** Instante UTC (ISO) → dia/hora locais de Fortaleza, sem Temporal (ver importarDoRepo acima). */
function paraFortaleza(isoUtc: string): { dia: string; hora: string } {
  const deslocado = new Date(Date.parse(isoUtc) - DESLOCAMENTO_FORTALEZA_MS);
  return {
    dia: `${deslocado.getUTCFullYear()}-${doisDigitos(deslocado.getUTCMonth() + 1)}-${doisDigitos(deslocado.getUTCDate())}`,
    hora: `${doisDigitos(deslocado.getUTCHours())}:${doisDigitos(deslocado.getUTCMinutes())}:${doisDigitos(deslocado.getUTCSeconds())}`,
  };
}

/** Início (inclusive) e fim (exclusivo) do dia local de Fortaleza, em instantes UTC. */
function janelaDoDia(dia: string): { de: string; ate: string } {
  const inicioUtcMs =
    Date.parse(`${dia}T00:00:00.000Z`) + DESLOCAMENTO_FORTALEZA_MS;
  return {
    de: new Date(inicioUtcMs).toISOString(),
    ate: new Date(inicioUtcMs + 24 * 60 * 60 * 1000).toISOString(),
  };
}

function erroParaTexto(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}

// Molde mínimo e local das peças de workers/sympla/src/{coleta,rpc}.ts que o passo 2/7 usam;
// não importa os tipos de lá (ver importarDoRepo acima) — só o formato necessário aqui.
interface EventoColetadoMinimo {
  external_id: string;
  title: string;
  starts_at: string | null;
  [chave: string]: unknown;
}
interface ResultadoColeta {
  inseridos: number;
  atualizados: number;
  inalterados: number;
  eventos: {
    external_id: string;
    event_id: number;
    acao: string;
    version: number;
  }[];
}
interface ModuloSymplaColeta {
  prepararColeta: (
    arquivos: string[],
    agora: Date,
  ) => Promise<{ eventos: EventoColetadoMinimo[] }>;
}
interface ModuloSymplaRpc {
  registrarColetaMinima: (envio: {
    url: URL;
    chave: string;
    runKey: string;
    eventos: EventoColetadoMinimo[];
  }) => Promise<ResultadoColeta>;
  resolverUrlSupabase: (valor: string) => URL;
}

async function chamarRpc(
  apiUrl: string,
  nome: string,
  opcoes: { apikey: string; bearer: string; body: Record<string, unknown> },
): Promise<unknown> {
  const resposta = await fetch(new URL(`/rest/v1/rpc/${nome}`, apiUrl), {
    method: "POST",
    headers: {
      apikey: opcoes.apikey,
      authorization: `Bearer ${opcoes.bearer}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(opcoes.body),
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  const texto = await resposta.text();
  if (!resposta.ok) {
    throw new Error(
      `${nome} respondeu ${resposta.status}: ${texto.slice(0, 300)}`,
    );
  }
  return texto ? JSON.parse(texto) : null;
}

/** Contagem exata de public.eventos visível ao papel da chave usada (via Content-Range). */
async function contagemEventos(apiUrl: string, chave: string): Promise<number> {
  const resposta = await fetch(
    new URL("/rest/v1/eventos?select=id&limit=1", apiUrl),
    {
      method: "HEAD",
      headers: {
        apikey: chave,
        authorization: `Bearer ${chave}`,
        prefer: "count=exact",
      },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!resposta.ok)
    throw new Error(`contagem de eventos respondeu ${resposta.status}`);
  const total = resposta.headers.get("content-range")?.split("/")[1];
  if (!total) throw new Error("contagem de eventos: content-range sem total");
  return Number(total);
}

async function eventosComNome(
  apiUrl: string,
  chave: string,
  nome: string,
): Promise<unknown[]> {
  const url = new URL("/rest/v1/eventos", apiUrl);
  url.search = new URLSearchParams({
    select: "id,nome",
    nome: `eq.${nome}`,
  }).toString();
  const resposta = await fetch(url, {
    headers: { apikey: chave, authorization: `Bearer ${chave}` },
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!resposta.ok)
    throw new Error(`consulta de eventos respondeu ${resposta.status}`);
  return (await resposta.json()) as unknown[];
}

/** Status HTTP de uma leitura anon em public.events (tabela de coleta, nunca pública). */
async function statusAnonEvents(
  apiUrl: string,
  anonKey: string,
): Promise<number> {
  const resposta = await fetch(
    new URL("/rest/v1/events?select=id&limit=1", apiUrl),
    {
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}` },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    },
  );
  return resposta.status;
}

async function estadoDoVinculo(
  apiUrl: string,
  chave: string,
  eventId: number,
): Promise<unknown[]> {
  const url = new URL("/rest/v1/vinculos_institucionais", apiUrl);
  url.search = new URLSearchParams({
    select: "event_id,estado",
    event_id: `eq.${eventId}`,
  }).toString();
  const resposta = await fetch(url, {
    headers: { apikey: chave, authorization: `Bearer ${chave}` },
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!resposta.ok)
    throw new Error(`vinculos_institucionais respondeu ${resposta.status}`);
  return (await resposta.json()) as unknown[];
}

/** Molde de EventoColetado (workers/sympla/src/lote.ts) para o caso negativo do passo 7. */
function eventoSintetico(titulo: string, externalId: string) {
  return {
    external_id: externalId,
    source_url: null,
    title: titulo,
    description: null,
    normalized_title: null,
    starts_at: null,
    ends_at: null,
    venue_name: null,
    venue_address: null,
    venue_raw: null,
    city: null,
    modality: "unknown" as const,
    collection_status: "included" as const,
    collection_reason: null,
    price_raw: null,
    avatar_url: null,
    raw_json: { origem: "sintetico-e2e-s0.9" },
  };
}

interface Contexto {
  apiUrl: string;
  anonKey: string;
  serviceKey: string;
  jwtSecret: string;
  sql: postgres.Sql;
  instancia: InstanciaTeste;
  eventosAntes: number;
  curadorJwt: string;
  eventoId: number;
  version: number;
  titulo: string;
  startsAtUtc: string;
  mapasId: string;
  eventosDepoisDoSync: number;
}

type Passo = {
  nome: string;
  executar: (ctx: Contexto) => Promise<unknown>;
};

const PASSOS: Passo[] = [
  {
    nome: "1_instancia_teste_vazia",
    async executar(ctx) {
      assert.equal(
        ctx.instancia.linhas().length,
        0,
        "a instância de teste devia subir vazia",
      );
      ctx.eventosAntes = await contagemEventos(ctx.apiUrl, ctx.anonKey);
      return { url: ctx.instancia.url, eventos_antes: ctx.eventosAntes };
    },
  },
  {
    nome: "2_scraper_registrar_coleta_minima",
    async executar(ctx) {
      const { prepararColeta } = await importarDoRepo<ModuloSymplaColeta>(
        "workers/sympla/src/coleta.ts",
      );
      const { registrarColetaMinima, resolverUrlSupabase } =
        await importarDoRepo<ModuloSymplaRpc>("workers/sympla/src/rpc.ts");

      const fixture = fileURLToPath(
        new URL("workers/sympla/test/fixtures/sympla-event.html", REPO_RAIZ),
      );
      const preparo = await prepararColeta([fixture], new Date());
      assert.equal(
        preparo.eventos.length,
        1,
        "a fixture devia gerar exatamente 1 evento",
      );
      const evento = preparo.eventos[0];
      assert.ok(evento, "a fixture devia gerar 1 evento coletado");

      const resultado = await registrarColetaMinima({
        url: resolverUrlSupabase(ctx.apiUrl),
        chave: ctx.serviceKey,
        runKey: randomUUID(),
        eventos: preparo.eventos,
      });
      assert.equal(resultado.inseridos, 1, "esperava 1 evento inserido");
      const resultadoEvento = resultado.eventos[0];
      assert.ok(
        resultadoEvento,
        "registrar_coleta_minima devia devolver 1 evento",
      );
      assert.equal(resultadoEvento.acao, "inserido");

      ctx.eventoId = resultadoEvento.event_id;
      ctx.version = resultadoEvento.version;
      ctx.titulo = evento.title;
      assert.ok(evento.starts_at, "a fixture devia gerar um starts_at");
      ctx.startsAtUtc = evento.starts_at;

      const depois = await contagemEventos(ctx.apiUrl, ctx.anonKey);
      assert.equal(
        depois,
        ctx.eventosAntes,
        "a agenda pública não pode mudar com a coleta",
      );
      assert.equal(
        await statusAnonEvents(ctx.apiUrl, ctx.anonKey),
        401,
        "anon não pode ler public.events",
      );

      return {
        event_id: ctx.eventoId,
        version: ctx.version,
        titulo: ctx.titulo,
        starts_at: ctx.startsAtUtc,
      };
    },
  },
  {
    nome: "3_curadoria_aprovar",
    async executar(ctx) {
      const curador = await provisionarCuradorTeste(ctx.sql, ctx.jwtSecret);
      ctx.curadorJwt = curador.jwt;

      const resultado = (await chamarRpc(ctx.apiUrl, "curar_evento", {
        apikey: ctx.anonKey,
        bearer: ctx.curadorJwt,
        body: {
          p_event_id: ctx.eventoId,
          p_version: ctx.version,
          p_status: "approved",
        },
      })) as { curation_status: string };
      assert.equal(resultado.curation_status, "approved");

      const depois = await contagemEventos(ctx.apiUrl, ctx.anonKey);
      assert.equal(
        depois,
        ctx.eventosAntes,
        "aprovar não pode mudar a agenda pública",
      );

      return {
        curador_user_id: curador.userId,
        curation_status: resultado.curation_status,
      };
    },
  },
  {
    nome: "4_registrar_incorporacao",
    async executar(ctx) {
      ctx.mapasId = "530001";
      const resultado = (await chamarRpc(ctx.apiUrl, "registrar_incorporacao", {
        apikey: ctx.anonKey,
        bearer: ctx.curadorJwt,
        body: {
          p_event_id: ctx.eventoId,
          p_instancia: "mapa-cultural-ce-teste",
          p_base: FONTE_MAPAS,
          p_mapas_id: ctx.mapasId,
        },
      })) as { estado: string };
      assert.equal(resultado.estado, "registrado");

      const depois = await contagemEventos(ctx.apiUrl, ctx.anonKey);
      assert.equal(
        depois,
        ctx.eventosAntes,
        "registrar incorporação não pode mudar a agenda pública",
      );

      return { mapas_id: ctx.mapasId, estado: resultado.estado };
    },
  },
  {
    nome: "5_instancia_serve_evento",
    async executar(ctx) {
      const { dia, hora } = paraFortaleza(ctx.startsAtUtc);
      ctx.instancia.adicionar({
        event_id: Number(ctx.mapasId),
        occurrence_id: 1,
        starts_on: dia,
        starts_at: hora,
        name: ctx.titulo,
        rule: { duration: null, price: null },
        space: null,
      });
      assert.equal(ctx.instancia.linhas().length, 1);

      // Confirma por HTTP de verdade (instância de teste), não só pelo estado em memória.
      const url = new URL("/api/event/find", ctx.instancia.url);
      url.search = new URLSearchParams({
        id: `EQ(${ctx.mapasId})`,
        "@select": "id,name,occurrences.{id,rule}",
      }).toString();
      const resposta = await fetch(url, {
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
      assert.equal(resposta.status, 200);
      const [registro] = (await resposta.json()) as {
        id: number;
        name: string;
      }[];
      assert.ok(
        registro,
        "instância deveria devolver o registro pelo id de Mapas",
      );
      assert.equal(registro.name, ctx.titulo);

      return { dia, hora, mapas_id: ctx.mapasId };
    },
  },
  {
    nome: "6_sincronizacao_e_confirmacao",
    async executar(ctx) {
      const { buscarLinhas, normalizar } = await importarDoRepo<{
        buscarLinhas: (
          primeiroDia: string,
          ultimoDia: string,
          opcoes: { base?: string },
        ) => Promise<unknown[]>;
        normalizar: (
          linhas: unknown[],
          janela: { de: string; ate: string },
        ) => { lote: unknown; rejeitadas: Record<string, number> };
      }>("workers/coleta/src/mapaCultural.ts");
      const { confirmar } = await importarDoRepo<{
        confirmar: (opcoes: {
          supabaseUrl: string;
          chave: string;
          base?: string;
        }) => Promise<Record<string, number>>;
      }>("workers/coleta/src/confirmar.ts");

      const { dia } = paraFortaleza(ctx.startsAtUtc);
      const linhas = await buscarLinhas(dia, dia, { base: ctx.instancia.url });
      assert.equal(
        linhas.length,
        1,
        "a instância devia devolver só a ocorrência adicionada no passo 5",
      );

      const { de, ate } = janelaDoDia(dia);
      const { lote, rejeitadas } = normalizar(linhas, { de, ate });
      assert.equal(
        Object.keys(rejeitadas).length,
        0,
        "nenhuma linha deveria ser rejeitada",
      );

      const resultadoImportacao = (await chamarRpc(
        ctx.apiUrl,
        "importar_agenda",
        {
          apikey: ctx.serviceKey,
          bearer: ctx.serviceKey,
          body: { p_fonte: FONTE_MAPAS, p_lote: lote },
        },
      )) as { eventos: { criados: number } };
      assert.equal(
        resultadoImportacao.eventos.criados,
        1,
        "esperava 1 evento novo na agenda",
      );

      ctx.eventosDepoisDoSync = await contagemEventos(ctx.apiUrl, ctx.anonKey);
      assert.equal(
        ctx.eventosDepoisDoSync,
        ctx.eventosAntes + 1,
        "a agenda devia ganhar 1 evento",
      );
      const visiveis = await eventosComNome(
        ctx.apiUrl,
        ctx.anonKey,
        ctx.titulo,
      );
      assert.equal(
        visiveis.length,
        1,
        "anon devia ver o evento sincronizado em /rest/v1/eventos",
      );

      const contagensConfirmacao = await confirmar({
        supabaseUrl: ctx.apiUrl,
        chave: ctx.serviceKey,
        base: ctx.instancia.url,
      });
      assert.equal(contagensConfirmacao.vinculos, 1);
      assert.equal(contagensConfirmacao.confirmados, 1);
      assert.equal(contagensConfirmacao.divergentes, 0);
      assert.equal(contagensConfirmacao.ausentes, 0);

      const [vinculo] = (await estadoDoVinculo(
        ctx.apiUrl,
        ctx.serviceKey,
        ctx.eventoId,
      )) as {
        estado: string;
      }[];
      assert.equal(vinculo?.estado, "confirmado");

      return {
        importar_agenda: resultadoImportacao,
        confirmar: contagensConfirmacao,
        eventos_depois_do_sync: ctx.eventosDepoisDoSync,
      };
    },
  },
  {
    nome: "7_negativo_sem_incorporacao",
    async executar(ctx) {
      const { registrarColetaMinima, resolverUrlSupabase } =
        await importarDoRepo<ModuloSymplaRpc>("workers/sympla/src/rpc.ts");

      const tituloNegativo = `Evento negativo e2e S0.9 ${randomUUID()}`;
      const resultado = await registrarColetaMinima({
        url: resolverUrlSupabase(ctx.apiUrl),
        chave: ctx.serviceKey,
        runKey: randomUUID(),
        eventos: [
          eventoSintetico(tituloNegativo, `e2e-negativo-${randomUUID()}`),
        ],
      });
      assert.equal(resultado.inseridos, 1);
      const eventoNegativoResultado = resultado.eventos[0];
      assert.ok(
        eventoNegativoResultado,
        "registrar_coleta_minima devia devolver 1 evento",
      );
      const eventoNegativoId = eventoNegativoResultado.event_id;

      const aprovado = (await chamarRpc(ctx.apiUrl, "curar_evento", {
        apikey: ctx.anonKey,
        bearer: ctx.curadorJwt,
        body: {
          p_event_id: eventoNegativoId,
          p_version: eventoNegativoResultado.version,
          p_status: "approved",
        },
      })) as { curation_status: string };
      assert.equal(aprovado.curation_status, "approved");

      // Nunca chama registrar_incorporacao para este evento: sem incorporação, sem agenda.
      const vinculo = await estadoDoVinculo(
        ctx.apiUrl,
        ctx.serviceKey,
        eventoNegativoId,
      );
      assert.equal(
        vinculo.length,
        0,
        "evento aprovado sem incorporação não pode ter vínculo",
      );

      const visiveis = await eventosComNome(
        ctx.apiUrl,
        ctx.anonKey,
        tituloNegativo,
      );
      assert.equal(
        visiveis.length,
        0,
        "evento aprovado sem incorporação não pode aparecer na agenda",
      );

      const depois = await contagemEventos(ctx.apiUrl, ctx.anonKey);
      assert.equal(
        depois,
        ctx.eventosDepoisDoSync,
        "a agenda pública não pode mudar com o caso negativo",
      );

      return {
        event_id: eventoNegativoId,
        titulo: tituloNegativo,
        eventos_depois: depois,
      };
    },
  },
];

async function main(): Promise<number> {
  const relatorio: {
    nome: string;
    ok: boolean;
    detalhe?: unknown;
    erro?: string;
  }[] = [];
  const pilha = await subirPilhaIsolada();
  let instancia: InstanciaTeste | undefined;
  let sql: postgres.Sql | undefined;
  try {
    sql = postgres(pilha.status.DB_URL, { max: 1 });
    instancia = await criarInstanciaTeste({ porta: 0 });

    // Campos preenchidos por passos anteriores começam com um valor neutro; cada passo só lê
    // um campo depois que um passo anterior (sempre executado primeiro, na mesma lista) o grava.
    const ctx: Contexto = {
      apiUrl: pilha.status.API_URL,
      anonKey: pilha.status.ANON_KEY,
      serviceKey: pilha.status.SERVICE_ROLE_KEY,
      jwtSecret: pilha.status.JWT_SECRET,
      sql,
      instancia,
      eventosAntes: 0,
      curadorJwt: "",
      eventoId: 0,
      version: 0,
      titulo: "",
      startsAtUtc: "",
      mapasId: "",
      eventosDepoisDoSync: 0,
    };

    for (const passo of PASSOS) {
      try {
        const detalhe = await passo.executar(ctx);
        relatorio.push({ nome: passo.nome, ok: true, detalhe });
        console.error(`[e2e] ${passo.nome}: ok`);
      } catch (erro) {
        relatorio.push({
          nome: passo.nome,
          ok: false,
          erro: erroParaTexto(erro),
        });
        console.error(`[e2e] ${passo.nome}: falhou — ${erroParaTexto(erro)}`);
        break; // os passos seguintes dependem do estado deste; não tenta continuar.
      }
    }
  } finally {
    if (instancia) await instancia.fechar().catch(() => {});
    if (sql) await sql.end({ timeout: 5 }).catch(() => {});
    await pilha.parar();
  }

  const tudoOk =
    relatorio.length === PASSOS.length && relatorio.every((r) => r.ok);
  console.log(JSON.stringify({ ok: tudoOk, passos: relatorio }));
  return tudoOk ? 0 : 1;
}

process.exitCode = await main();
