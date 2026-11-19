import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { InstanciasConteudo } from "../src/instancias/InstanciasPage";

afterEach(cleanup);

const instancia = {
  id: "mapa-cultural-ce",
  nome: "Mapa Cultural do Ceará",
  site: "https://mapacultural.secult.ce.gov.br",
  fuso: "America/Fortaleza",
};
const previa = {
  de: "2026-11-19",
  ate: "2027-01-20",
  totalEventos: 1,
  ocorrencias: 2,
  rejeitadas: 0,
  eventos: [
    {
      id: "42",
      nome: "Oficina oficial",
      municipio: "Fortaleza",
      inicio: "2026-11-19T21:00:00Z",
      ocorrencias: 2,
    },
  ],
  revisao: "a".repeat(64),
  sincronizavel: true,
};

it("mantém o foco da busca enquanto aguarda a fonte e evita novo envio", async () => {
  const resposta = Promise.withResolvers<typeof previa>();
  const operar = vi
    .fn()
    .mockImplementation(async ({ acao }) =>
      acao === "listar"
        ? { instancias: [instancia], sincronizacao: true }
        : resposta.promise,
    );
  render(<InstanciasConteudo operar={operar} />);
  const botao = await screen.findByRole("button", { name: "Buscar eventos" });
  botao.focus();
  fireEvent.click(botao);
  expect(botao.getAttribute("aria-disabled")).toBe("true");
  expect(botao.hasAttribute("disabled")).toBe(false);
  fireEvent.click(botao);
  resposta.resolve(previa);
  expect(await screen.findByText("Oficina oficial")).toBeTruthy();
  expect(document.activeElement).toBe(botao);
  expect(operar.mock.calls.map(([pedido]) => pedido.acao)).toEqual([
    "listar",
    "buscar",
  ]);
});

it("busca sem gravar e atualiza a agenda só após confirmação", async () => {
  const operar = vi.fn().mockImplementation(async ({ acao }) => {
    if (acao === "listar")
      return { instancias: [instancia], sincronizacao: true };
    if (acao === "buscar") return previa;
    return {
      resultado: {
        eventos: { criados: 1, alterados: 0 },
        datas: { criadas: 2, alteradas: 0, removidas: 0 },
      },
    };
  });
  render(<InstanciasConteudo operar={operar} />);
  expect(
    await screen.findByRole("heading", { name: instancia.nome }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Sincronizar agenda" }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Buscar eventos" }));
  expect(await screen.findByText("Oficina oficial")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Sincronizar agenda" }));
  const dialogo = screen.getByRole("dialog", {
    name: "Sincronizar a agenda do Farol?",
  });
  expect(operar.mock.calls.map(([pedido]) => pedido.acao)).toEqual([
    "listar",
    "buscar",
  ]);
  fireEvent.click(
    within(dialogo).getByRole("button", { name: "Confirmar sincronização" }),
  );
  expect(await screen.findByText(/Agenda sincronizada/)).toBeTruthy();
  expect(operar).toHaveBeenLastCalledWith({
    acao: "sincronizar",
    instancia: instancia.id,
    revisao: previa.revisao,
  });
});

it("mantém a consulta disponível quando a sincronização está desativada", async () => {
  const operar = vi
    .fn()
    .mockImplementation(async ({ acao }) =>
      acao === "listar"
        ? { instancias: [instancia], sincronizacao: false }
        : { ...previa, sincronizavel: false },
    );
  render(<InstanciasConteudo operar={operar} />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Buscar eventos" }),
  );
  expect(await screen.findByText("Oficina oficial")).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Sincronizar agenda" }),
  ).toBeNull();
  expect(screen.getByText(/Sincronização pelo painel desativada/)).toBeTruthy();
});

it("ao cancelar, devolve o foco à ação de sincronização sem gravar", async () => {
  const operar = vi
    .fn()
    .mockImplementation(async ({ acao }) =>
      acao === "listar"
        ? { instancias: [instancia], sincronizacao: true }
        : previa,
    );
  render(<InstanciasConteudo operar={operar} />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Buscar eventos" }),
  );
  const sincronizar = await screen.findByRole("button", {
    name: "Sincronizar agenda",
  });
  fireEvent.click(sincronizar);
  const dialogo = screen.getByRole("dialog", {
    name: "Sincronizar a agenda do Farol?",
  });
  const cancelar = within(dialogo).getByRole("button", { name: "Cancelar" });
  expect(document.activeElement).toBe(cancelar);
  fireEvent.click(cancelar);
  await waitFor(() => expect(document.activeElement).toBe(sincronizar));
  expect(operar.mock.calls.map(([pedido]) => pedido.acao)).toEqual([
    "listar",
    "buscar",
  ]);
});
