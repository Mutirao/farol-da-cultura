import { describe, expect, it, vi } from "vitest";

const disco = vi.hoisted(() => ({
  arquivos: new Map<string, string>(),
  falhar: false,
}));
vi.mock("expo-file-system", () => ({
  Paths: { document: "teste" },
  File: class {
    nome: string;
    constructor(_pasta: string, nome: string) {
      this.nome = nome;
    }
    get exists() {
      return disco.arquivos.has(this.nome);
    }
    async text() {
      return disco.arquivos.get(this.nome);
    }
    async write(texto: string) {
      if (disco.falhar) throw new Error("sem espaço");
      disco.arquivos.set(this.nome, texto);
    }
    async move(destino: { nome: string }, options: { overwrite: boolean }) {
      if (!options.overwrite && disco.arquivos.has(destino.nome))
        throw Error("já existe");
      disco.arquivos.set(destino.nome, disco.arquivos.get(this.nome) ?? "");
      disco.arquivos.delete(this.nome);
    }
  },
}));

import * as nativo from "../src/agenda/favoritos";
import { contratoFavoritos } from "./favoritos.contrato";

describe("favoritos nativos (expo-file-system)", () => {
  contratoFavoritos(nativo, {
    limpar: () => {
      disco.arquivos.clear();
      disco.falhar = false;
    },
    falharGravacao: () => {
      disco.falhar = true;
    },
    corromper: (valor) => disco.arquivos.set("favoritos-v1.json", valor),
    bruto: () => disco.arquivos.get("favoritos-v1.json"),
  });

  it("troca o arquivo só depois da gravação e não deixa temporário", async () => {
    await nativo.salvarFavoritos(["fonte:1"]);
    await nativo.salvarFavoritos(["fonte:2"]);
    expect(disco.arquivos.has("favoritos-v1.tmp")).toBe(false);
    expect(disco.arquivos.get("favoritos-v1.json")).toBe('["fonte:2"]');
  });
});
