import { beforeEach, expect, it, vi } from "vitest";

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

import { lerFavoritos, salvarFavoritos } from "../src/agenda/favoritos";

beforeEach(() => {
  disco.arquivos.clear();
  disco.falhar = false;
});
it("primeiro uso começa sem favoritos", async () =>
  expect(await lerFavoritos()).toEqual([]));
it("salva, lê e substitui a lista anterior", async () => {
  await salvarFavoritos(["fonte:1"]);
  expect(await lerFavoritos()).toEqual(["fonte:1"]);
  await salvarFavoritos(["fonte:2"]);
  expect(await lerFavoritos()).toEqual(["fonte:2"]);
  expect(disco.arquivos.has("favoritos-v1.tmp")).toBe(false);
});
it("falha de gravação mantém os favoritos anteriores", async () => {
  await salvarFavoritos(["fonte:1"]);
  disco.falhar = true;
  await expect(salvarFavoritos(["fonte:2"])).rejects.toThrow("sem espaço");
  expect(await lerFavoritos()).toEqual(["fonte:1"]);
});
it("arquivo corrompido é preservado, não convertido silenciosamente em vazio", async () => {
  disco.arquivos.set("favoritos-v1.json", "quebrado");
  await expect(lerFavoritos()).rejects.toThrow();
  expect(disco.arquivos.get("favoritos-v1.json")).toBe("quebrado");
});
