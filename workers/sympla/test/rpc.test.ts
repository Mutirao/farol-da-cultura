import { describe, expect, it, vi } from "vitest";
import type { EventoColetado } from "../src/lote.ts";
import { registrarColetaMinima, resolverUrlSupabase } from "../src/rpc.ts";

const CHAVE = "sb_secret_teste_nao_real";
const RUN_KEY = "63000000-0000-4000-8000-000000000001";

const EVENTO: EventoColetado = {
  external_id: "1",
  source_url: null,
  title: "Show",
  description: null,
  normalized_title: "show",
  starts_at: null,
  ends_at: null,
  venue_name: null,
  venue_address: null,
  venue_raw: null,
  city: null,
  modality: "unknown",
  collection_status: "incomplete",
  collection_reason: "missing_start",
  price_raw: null,
  avatar_url: null,
  raw_json: {},
};

const RESULTADO = {
  run_key: RUN_KEY,
  source_slug: "sympla",
  job_run_id: 3,
  recebidos: 1,
  inseridos: 1,
  atualizados: 0,
  inalterados: 0,
  eventos: [{ external_id: "1", event_id: 10, acao: "inserido", version: 1 }],
};

function responder(status: number, corpo: unknown) {
  return vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify(corpo), { status }),
  );
}

describe("resolverUrlSupabase", () => {
  it("aceita https e http local", () => {
    expect(resolverUrlSupabase("https://abc.supabase.co").host).toBe(
      "abc.supabase.co",
    );
    expect(resolverUrlSupabase("http://127.0.0.1:54321").port).toBe("54321");
    expect(resolverUrlSupabase("http://localhost:54321").hostname).toBe(
      "localhost",
    );
  });

  it("recusa http remoto, outro protocolo e valor ausente", () => {
    expect(() => resolverUrlSupabase("http://abc.supabase.co")).toThrow(
      /recusada/,
    );
    expect(() => resolverUrlSupabase("http://127.0.0.1.evil.example")).toThrow(
      /recusada/,
    );
    expect(() => resolverUrlSupabase("ftp://127.0.0.1")).toThrow(/recusada/);
    expect(() => resolverUrlSupabase(undefined)).toThrow(/ausente/);
    expect(() => resolverUrlSupabase("não é url")).toThrow(/ausente/);
  });
});

describe("registrarColetaMinima", () => {
  it("chama a RPC com a chave só nos cabeçalhos e recusa redirecionamento", async () => {
    const fetch = responder(200, RESULTADO);
    const resultado = await registrarColetaMinima({
      url: new URL("http://127.0.0.1:54321"),
      chave: CHAVE,
      runKey: RUN_KEY,
      eventos: [EVENTO],
      fetch,
    });
    expect(resultado).toEqual(RESULTADO);
    const [alvo, init] = fetch.mock.calls[0] ?? [];
    expect(String(alvo)).toBe(
      "http://127.0.0.1:54321/rest/v1/rpc/registrar_coleta_minima",
    );
    expect(init?.method).toBe("POST");
    expect(init?.redirect).toBe("error");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.headers).toMatchObject({
      apikey: CHAVE,
      authorization: `Bearer ${CHAVE}`,
    });
    const corpo = JSON.parse(String(init?.body));
    expect(corpo).toEqual({
      p_run_key: RUN_KEY,
      p_source_slug: "sympla",
      p_eventos: [EVENTO],
    });
    expect(String(init?.body)).not.toContain(CHAVE);
  });

  it("erro do banco vira mensagem com status e código, sem a chave", async () => {
    const fetch = responder(400, {
      code: "22023",
      message: "registrar_coleta_minima: item 1 repete external_id do lote",
      details: null,
    });
    const erro = await registrarColetaMinima({
      url: new URL("https://abc.supabase.co"),
      chave: CHAVE,
      runKey: RUN_KEY,
      eventos: [EVENTO],
      fetch,
    }).catch((e: unknown) => e as Error);
    expect(erro).toBeInstanceOf(Error);
    expect((erro as Error).message).toBe(
      "registrar_coleta_minima respondeu 400 (22023): registrar_coleta_minima: item 1 repete external_id do lote",
    );
    expect((erro as Error).message).not.toContain(CHAVE);
  });

  it("resposta fora do contrato é rejeitada", async () => {
    await expect(
      registrarColetaMinima({
        url: new URL("https://abc.supabase.co"),
        chave: CHAVE,
        runKey: RUN_KEY,
        eventos: [EVENTO],
        fetch: responder(200, { ok: true }),
      }),
    ).rejects.toThrow();
  });

  it("lote vazio não sai do processo", async () => {
    const fetch = responder(200, RESULTADO);
    await expect(
      registrarColetaMinima({
        url: new URL("https://abc.supabase.co"),
        chave: CHAVE,
        runKey: RUN_KEY,
        eventos: [],
        fetch,
      }),
    ).rejects.toThrow(/1 a 500/);
    expect(fetch).not.toHaveBeenCalled();
  });
});
