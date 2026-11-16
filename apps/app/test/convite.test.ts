import { describe, expect, it } from "vitest";
import { mensagemConvite } from "../src/agenda/convite";

describe("mensagemConvite", () => {
  it("monta o convite com chamada, quando, local, ingresso e link", () => {
    expect(
      mensagemConvite("Bora? Olha esse evento:", [
        "sex., 14 de nov., 19:00 — Gato Preto",
        "Local: Hub Cultural Porto Dragão",
        "Ingresso: R$ 10 a 20",
        "https://mapacultural.secult.ce.gov.br/evento/1234/",
      ]),
    ).toBe(
      [
        "Bora? Olha esse evento:",
        "sex., 14 de nov., 19:00 — Gato Preto",
        "Local: Hub Cultural Porto Dragão",
        "Ingresso: R$ 10 a 20",
        "https://mapacultural.secult.ce.gov.br/evento/1234/",
      ].join("\n"),
    );
  });

  it("omite partes ausentes (sem local e sem link da fonte)", () => {
    const mensagem = mensagemConvite("Bora? Olha esse evento:", [
      "sáb., 15 de nov., 16:00 — Café das Pretas",
      null,
      "Ingresso: Gratuito",
      undefined,
    ]);
    expect(mensagem).toBe(
      [
        "Bora? Olha esse evento:",
        "sáb., 15 de nov., 16:00 — Café das Pretas",
        "Ingresso: Gratuito",
      ].join("\n"),
    );
    expect(mensagem).not.toContain("Local:");
  });

  it("mantém o nome do evento mesmo sem data na programação", () => {
    expect(
      mensagemConvite("Bora? Olha esse evento:", ["Festival de dança"]),
    ).toBe(["Bora? Olha esse evento:", "Festival de dança"].join("\n"));
  });
});
