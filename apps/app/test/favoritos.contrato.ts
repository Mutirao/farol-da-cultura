import { beforeEach, expect, it } from "vitest";

// Contrato comum às implementações de favoritos (arquivo nativo e localStorage web).
export type Favoritos = {
  lerFavoritos: () => Promise<string[]>;
  salvarFavoritos: (chaves: string[]) => Promise<void>;
};
export type Armazenamento = {
  limpar: () => void;
  falharGravacao: () => void;
  corromper: (valor: string) => void;
  bruto: () => string | undefined;
};

export function contratoFavoritos(impl: Favoritos, meio: Armazenamento) {
  beforeEach(() => meio.limpar());
  it("primeiro uso começa sem favoritos", async () =>
    expect(await impl.lerFavoritos()).toEqual([]));
  it("salva, lê e substitui a lista anterior", async () => {
    await impl.salvarFavoritos(["fonte:1"]);
    expect(await impl.lerFavoritos()).toEqual(["fonte:1"]);
    await impl.salvarFavoritos(["fonte:2"]);
    expect(await impl.lerFavoritos()).toEqual(["fonte:2"]);
  });
  it("falha de gravação mantém os favoritos anteriores", async () => {
    await impl.salvarFavoritos(["fonte:1"]);
    meio.falharGravacao();
    await expect(impl.salvarFavoritos(["fonte:2"])).rejects.toThrow();
    expect(await impl.lerFavoritos()).toEqual(["fonte:1"]);
  });
  it("armazenamento corrompido é preservado, não convertido silenciosamente em vazio", async () => {
    meio.corromper("quebrado");
    await expect(impl.lerFavoritos()).rejects.toThrow();
    expect(meio.bruto()).toBe("quebrado");
  });
  it("lista inválida é recusada sem gravar", async () => {
    await impl.salvarFavoritos(["fonte:1"]);
    await expect(impl.salvarFavoritos([""])).rejects.toThrow();
    expect(await impl.lerFavoritos()).toEqual(["fonte:1"]);
  });
}
