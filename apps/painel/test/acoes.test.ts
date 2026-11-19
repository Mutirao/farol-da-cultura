import { describe, expect, it, vi } from "vitest";
import {
  curarEvento,
  filtrarAprovados,
  gerarCsvAprovados,
  gerarJsonAprovados,
  registrarIncorporacao,
} from "../src/eventos/acoes";

function clienteFalso(resultado: { data?: unknown; error?: unknown }) {
  const rpc = vi.fn().mockResolvedValue(resultado);
  return { cliente: { rpc } as never, rpc };
}

describe("curarEvento", () => {
  it("envia a version lida pelo painel junto com o status", async () => {
    const { cliente, rpc } = clienteFalso({ data: { id: 42 } });
    await curarEvento(cliente, { id: 42, version: 7 }, "approved");
    expect(rpc).toHaveBeenCalledWith("curar_evento", {
      p_event_id: 42,
      p_version: 7,
      p_status: "approved",
    });
  });

  it("propaga o erro do RPC (ex.: version divergente)", async () => {
    const { cliente } = clienteFalso({
      error: { code: "23505", message: "curar_evento: version divergente" },
    });
    await expect(
      curarEvento(cliente, { id: 1, version: 1 }, "approved"),
    ).rejects.toMatchObject({ code: "23505" });
  });
});

describe("registrarIncorporacao", () => {
  it("chama a RPC registrar_incorporacao com o destino informado", async () => {
    const { cliente, rpc } = clienteFalso({ data: { estado: "registrado" } });
    await registrarIncorporacao(cliente, {
      eventId: 10,
      instancia: "mapas-ce",
      base: "mapa-cultural-ce",
      mapasId: "999",
    });
    expect(rpc).toHaveBeenCalledWith("registrar_incorporacao", {
      p_event_id: 10,
      p_instancia: "mapas-ce",
      p_base: "mapa-cultural-ce",
      p_mapas_id: "999",
    });
  });

  it("propaga erro do RPC (ex.: evento não aprovado)", async () => {
    const { cliente } = clienteFalso({
      error: { code: "23514", message: "evento não aprovado na curadoria" },
    });
    await expect(
      registrarIncorporacao(cliente, {
        eventId: 1,
        instancia: "a",
        base: "b",
        mapasId: "1",
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });
});

const eventos = [
  { id: 1, title: "Aprovado 1", curation_status: "approved", version: 1 },
  { id: 2, title: "Pendente", curation_status: "pending", version: 1 },
  { id: 3, title: "Rejeitado", curation_status: "rejected", version: 1 },
  {
    id: 4,
    title: "Aprovado, vírgula",
    curation_status: "approved",
    version: 2,
  },
] as const;

describe("exportação mínima — só aprovados", () => {
  it("filtrarAprovados devolve só curation_status approved", () => {
    const aprovados = filtrarAprovados(eventos);
    expect(aprovados.map((e) => e.id)).toEqual([1, 4]);
  });

  it("gerarCsvAprovados não inclui pendentes nem rejeitados", () => {
    const csv = gerarCsvAprovados(eventos);
    expect(csv).toContain("Aprovado 1");
    expect(csv).not.toContain("Pendente");
    expect(csv).not.toContain("Rejeitado");
  });

  it("gerarCsvAprovados escapa vírgula no campo", () => {
    const csv = gerarCsvAprovados(eventos);
    expect(csv).toContain('"Aprovado, vírgula"');
  });

  it("gerarJsonAprovados devolve só os aprovados em JSON válido", () => {
    const json = JSON.parse(gerarJsonAprovados(eventos));
    expect(json).toHaveLength(2);
    expect(
      json.every(
        (e: { curation_status: string }) => e.curation_status === "approved",
      ),
    ).toBe(true);
  });
});
