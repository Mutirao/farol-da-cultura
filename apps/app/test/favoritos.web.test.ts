import { describe, expect, it, vi } from "vitest";
import * as web from "../src/agenda/favoritos.web";
import { contratoFavoritos } from "./favoritos.contrato";

const CHAVE = "farol:favoritos-v1";
const memoria = new Map<string, string>();
let falhar = false;
vi.stubGlobal("localStorage", {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => {
    if (falhar) throw new DOMException("cota", "QuotaExceededError");
    memoria.set(k, v);
  },
  removeItem: (k: string) => memoria.delete(k),
  clear: () => memoria.clear(),
  key: () => null,
  length: 0,
} satisfies Storage);

describe("favoritos web (localStorage)", () => {
  contratoFavoritos(web, {
    limpar: () => {
      memoria.clear();
      falhar = false;
    },
    falharGravacao: () => {
      falhar = true;
    },
    corromper: (valor) => memoria.set(CHAVE, valor),
    bruto: () => memoria.get(CHAVE),
  });

  it("sem localStorage falha em vez de devolver lista vazia", async () => {
    vi.stubGlobal("localStorage", undefined);
    try {
      await expect(web.lerFavoritos()).rejects.toThrow("indisponível");
      await expect(web.salvarFavoritos(["fonte:1"])).rejects.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
