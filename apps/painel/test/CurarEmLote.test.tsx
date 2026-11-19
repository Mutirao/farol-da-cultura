import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AdminContext } from "react-admin";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CurarEmLoteBotoes } from "../src/eventos/CurarEmLote";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  notify: vi.fn(),
  refresh: vi.fn(),
  unselectAll: vi.fn(),
  lista: {
    selectedIds: [10, 20] as (number | string)[],
    data: [
      { id: 10, version: 3 },
      { id: 20, version: 7 },
    ],
  },
}));

vi.mock("../src/supabaseClient", () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock("react-admin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-admin")>()),
  useListContext: () => ({
    ...mocks.lista,
    onUnselectItems: mocks.unselectAll,
  }),
  useNotify: () => mocks.notify,
  useRefresh: () => mocks.refresh,
}));

function montar() {
  render(
    <AdminContext>
      <CurarEmLoteBotoes />
    </AdminContext>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.lista.selectedIds = [10, 20];
  mocks.rpc.mockResolvedValue({
    data: { alterados: [10, 20], conflitos: [], ausentes: [] },
    error: null,
  });
});
afterEach(cleanup);

describe("CurarEmLoteBotoes", () => {
  it("cancelar não chama a RPC", () => {
    montar();
    fireEvent.click(
      screen.getByRole("button", { name: "Aprovar selecionados" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["Aprovar selecionados", "approved"],
    ["Rejeitar selecionados", "rejected"],
  ])("confirmar %s envia ids, versões e status", async (rotulo, status) => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: rotulo }));
    expect(mocks.rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(mocks.rpc).toHaveBeenCalledWith("curar_eventos", {
        p_itens: [
          { id: 10, version: 3 },
          { id: 20, version: 7 },
        ],
        p_status: status,
      }),
    );
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
    expect(mocks.unselectAll).toHaveBeenCalledOnce();
    expect(mocks.notify).toHaveBeenCalledWith(
      "2 alterados; 0 conflitos; 0 ausentes.",
      { type: "success" },
    );
  });

  it("conflito gera aviso com contagens e pede recarga", async () => {
    mocks.rpc.mockResolvedValue({
      data: { alterados: [10], conflitos: [20], ausentes: [30] },
      error: null,
    });
    montar();
    fireEvent.click(
      screen.getByRole("button", { name: "Aprovar selecionados" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(mocks.notify).toHaveBeenCalledWith(
        expect.stringMatching(
          /1 alterados; 1 conflitos; 1 ausentes.*Recarregue/,
        ),
        { type: "warning" },
      ),
    );
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(mocks.unselectAll).toHaveBeenCalledOnce();
  });

  it("não inventa versão para selecionado fora dos dados carregados", () => {
    mocks.lista.selectedIds = [10, 30];
    montar();
    fireEvent.click(
      screen.getByRole("button", { name: "Aprovar selecionados" }),
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.notify).toHaveBeenCalledWith(
      expect.stringMatching(/versões carregadas/),
      {
        type: "warning",
      },
    );
  });

  it("erro da RPC não é reportado como sucesso nem limpa seleção", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    montar();
    fireEvent.click(
      screen.getByRole("button", { name: "Rejeitar selecionados" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(mocks.notify).toHaveBeenCalledWith(
        expect.stringMatching(/Não foi possível/),
        {
          type: "error",
        },
      ),
    );
    expect(mocks.unselectAll).not.toHaveBeenCalled();
  });
});
