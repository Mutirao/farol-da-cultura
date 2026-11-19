import { describe, expect, it, vi } from "vitest";
import { criarOperacaoInstancias } from "../src/instancias.ts";

const fonte = "mapa-cultural-ce";
const linhas = [
  {
    event_id: 42,
    occurrence_id: 12,
    starts_on: "2026-11-19",
    starts_at: "18:00",
    name: "Oficina oficial",
    rule: {},
    space: { id: 4, name: "Centro Cultural", En_Municipio: "Fortaleza" },
  },
];

function preparar(sincronizacao = true) {
  const buscar = vi.fn().mockResolvedValue(linhas);
  const importar = vi.fn().mockResolvedValue({ eventos: { criados: 1 } });
  const autorizar = vi.fn().mockResolvedValue(true);
  const lerVersao = vi.fn().mockResolvedValue(3);
  const operar = criarOperacaoInstancias({
    autorizar,
    buscar,
    lerVersao,
    importar,
    sincronizacao,
    agora: () => Temporal.Instant.from("2026-11-19T15:00Z"),
  });
  return { operar, buscar, importar, autorizar, lerVersao };
}

const busca = { acao: "buscar", instancia: fonte };

describe("operação de agenda por instância", () => {
  it("a prévia ignora ocorrências além do período, mesmo sem sincronização", async () => {
    const { operar, buscar } = preparar(false);
    buscar.mockResolvedValue([
      { ...linhas[0], starts_on: "2026-11-18", name: "Antigo" },
      linhas[0],
      { ...linhas[0], starts_on: "2027-01-21", event_id: 43 },
    ]);
    expect((await operar("sessao", busca)).corpo).toMatchObject({
      eventos: [{ id: "42", nome: "Oficina oficial" }],
      totalEventos: 1,
      ocorrencias: 1,
      rejeitadas: 2,
      sincronizavel: false,
    });
  });

  it("consulta a instância cadastrada e mostra eventos sem gravar", async () => {
    const { operar, buscar, importar, lerVersao } = preparar();
    const resposta = await operar("sessao", busca);
    expect(resposta.status).toBe(200);
    expect(resposta.corpo).toMatchObject({
      eventos: [{ id: "42", nome: "Oficina oficial", municipio: "Fortaleza" }],
      totalEventos: 1,
      ocorrencias: 1,
      rejeitadas: 0,
      sincronizavel: true,
    });
    expect(buscar).toHaveBeenCalledWith("2026-11-19", "2027-01-20");
    expect(importar).not.toHaveBeenCalled();
    expect(lerVersao).not.toHaveBeenCalled();
  });

  it("só sincroniza dados buscados pelo servidor e conferidos na prévia", async () => {
    const { operar, buscar, importar, lerVersao } = preparar();
    const previa = await operar("sessao", busca);
    const resposta = await operar("sessao", {
      acao: "sincronizar",
      instancia: fonte,
      revisao: previa.corpo.revisao,
    });
    expect(resposta.status).toBe(200);
    expect(importar).toHaveBeenCalledExactlyOnceWith(fonte, {
      janela: { de: "2026-11-19T03:00:00Z", ate: "2027-01-21T03:00:00Z" },
      espacos: [expect.objectContaining({ id_externo: "4" })],
      eventos: [expect.objectContaining({ id_externo: "42" })],
      versao_esperada: 3,
    });
    expect(lerVersao.mock.invocationCallOrder[0]).toBeLessThan(
      buscar.mock.invocationCallOrder[1] ?? 0,
    );
  });

  it("pede uma nova busca quando o banco recusa a versão concorrente", async () => {
    const { operar, importar } = preparar();
    const previa = await operar("sessao", busca);
    importar.mockResolvedValue(null);
    expect(
      await operar("sessao", {
        acao: "sincronizar",
        instancia: fonte,
        revisao: previa.corpo.revisao,
      }),
    ).toEqual({
      status: 409,
      corpo: { erro: "agenda_alterada" },
    });
  });

  it("não consulta nem grava para usuário sem curadoria ativa", async () => {
    const { operar, autorizar, buscar, importar } = preparar();
    autorizar.mockResolvedValue(false);
    expect((await operar("sessao", busca)).status).toBe(403);
    expect(buscar).not.toHaveBeenCalled();
    expect(importar).not.toHaveBeenCalled();
  });

  it("descarta pedido para fonte desconhecida ou com URL enviada pelo navegador", async () => {
    const { operar, buscar } = preparar();
    for (const pedido of [
      { ...busca, instancia: "outra" },
      { ...busca, url: "https://example.org" },
    ]) {
      expect((await operar("sessao", pedido)).status).toBe(400);
    }
    expect(buscar).not.toHaveBeenCalled();
  });

  it("não grava se o conteúdo mudou desde a busca", async () => {
    const { operar, buscar, importar } = preparar();
    const previa = await operar("sessao", busca);
    buscar.mockResolvedValue([{ ...linhas[0], name: "Título atualizado" }]);
    const resposta = await operar("sessao", {
      acao: "sincronizar",
      instancia: fonte,
      revisao: previa.corpo.revisao,
    });
    expect(resposta).toMatchObject({
      status: 409,
      corpo: { erro: "previa_desatualizada" },
    });
    expect(importar).not.toHaveBeenCalled();
  });

  it("não permite sync com linha inválida, resposta vazia ou sync desabilitada", async () => {
    for (const [ativada, dados] of [
      [true, [...linhas, null]],
      [true, []],
      [false, linhas],
    ] as const) {
      const { operar, buscar, importar } = preparar(ativada);
      buscar.mockResolvedValue(dados);
      const previa = await operar("sessao", busca);
      expect(previa.corpo.sincronizavel).toBe(false);
      expect(
        (
          await operar("sessao", {
            acao: "sincronizar",
            instancia: fonte,
            revisao: previa.corpo.revisao,
          })
        ).status,
      ).not.toBe(200);
      expect(importar).not.toHaveBeenCalled();
    }
  });
});
