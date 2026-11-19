import { describe, expect, it } from "vitest";
import {
  gerarEventosSinteticos,
  montarInstrucoes,
  verificarDestinoLocal,
} from "../dev/painel-local-lib.ts";

const API = "http://127.0.0.1:54321";
const BANCO = "postgresql://localhost:54322/postgres";

describe("guard do bootstrap local", () => {
  it.each(["127.0.0.1", "localhost"])("aceita %s", (host) => {
    expect(() =>
      verificarDestinoLocal(
        `http://${host}:54321`,
        `postgresql://${host}:54322/postgres`,
      ),
    ).not.toThrow();
  });
  it.each([
    "https://remoto.invalid",
    "http://localhost.remoto.invalid",
    "http://127.0.0.1@remoto.invalid",
    "http://192.168.0.1",
    "http://[::1]",
    "ftp://localhost",
    "inválida",
    "http://localhost?host=remoto.invalid",
    "http://localhost/caminho",
    "http://usuario:senha@localhost",
  ])("recusa API %s", (api) => {
    expect(() => verificarDestinoLocal(api, BANCO)).toThrow();
  });
  it.each([
    "postgresql://remoto.invalid/postgres",
    "https://localhost/postgres",
    "postgresql://localhost/postgres?host=remoto.invalid",
    "inválida",
  ])("recusa banco %s", (banco) => {
    expect(() => verificarDestinoLocal(API, banco)).toThrow();
  });
});

describe("eventos sintéticos determinísticos", () => {
  const base = "2030-01-01T00:00:00.000Z";
  it("gera 12 exemplos únicos futuros com datas variadas e preços mistos", () => {
    const eventos = gerarEventosSinteticos(base);
    expect(eventos).toEqual(gerarEventosSinteticos(base));
    expect(eventos).toHaveLength(12);
    expect(new Set(eventos.map((e) => e.external_id)).size).toBe(12);
    expect(new Set(eventos.map((e) => e.starts_at)).size).toBe(12);
    expect(eventos.every((e) => e.title.startsWith("[exemplo] "))).toBe(true);
    expect(
      eventos.every((e) => Date.parse(e.starts_at ?? "") > Date.parse(base)),
    ).toBe(true);
    expect(eventos.filter((e) => e.price_raw === "Gratuito")).toHaveLength(6);
    expect(
      eventos.filter((e) => String(e.price_raw).startsWith("R$")),
    ).toHaveLength(6);
    expect(
      eventos.every(
        (e) =>
          !Object.hasOwn(e, "curation_status") && !Object.hasOwn(e, "is_free"),
      ),
    ).toBe(true);
  });
  it("preserva IDs quando muda a base e recusa data inválida", () => {
    expect(gerarEventosSinteticos(base).map((e) => e.external_id)).toEqual(
      gerarEventosSinteticos("2031-01-01").map((e) => e.external_id),
    );
    expect(() => gerarEventosSinteticos("inválida")).toThrow();
  });
});

describe("instruções sem segredos", () => {
  it("só recebe dados públicos e código, nunca chave de servidor", () => {
    const texto = montarInstrucoes(API, "curador@farol.local", "123456");
    expect(texto).toContain("123456");
    expect(texto).toContain("curador@farol.local");
    expect(texto).toContain("http://127.0.0.1:5173");
    expect(texto).toContain("VITE_SUPABASE_URL='http://127.0.0.1:54321'");
    expect(texto).toContain(
      "VITE_SUPABASE_PUBLISHABLE_KEY='<PUBLISHABLE_KEY local>'",
    );
    expect(texto).toContain("pnpm --filter @farol/painel dev");
    expect(texto).not.toMatch(
      /sb_secret_|SERVICE_ROLE_KEY|Bearer|access_token/,
    );
  });
  it("recusa código inválido e URL contendo credencial", () => {
    expect(() => montarInstrucoes(API, "a@b.local", "12345")).toThrow();
    expect(() =>
      montarInstrucoes("http://segredo@localhost", "a@b.local", "123456"),
    ).toThrow();
  });
});
