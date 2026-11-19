import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactElement } from "react";
import {
  AdminContext,
  type DataProvider,
  RecordContextProvider,
  ResourceContextProvider,
  TestMemoryRouter,
  TextField,
} from "react-admin";
import { afterEach, describe, expect, it, vi } from "vitest";
import { colunasExportacoes, criarDataProvider } from "../src/dataProvider";
import { EventosList } from "../src/eventos/EventosList";
import { formatoData, m } from "../src/mensagens";
import {
  camposRecursos,
  ExportacoesList,
  ExportacoesShow,
} from "../src/recursosLeitura";

afterEach(() => vi.unstubAllGlobals());

function preparar() {
  const fetch = vi.fn().mockImplementation(
    async () =>
      new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Range": "0-0/0",
        },
      }),
  );
  vi.stubGlobal("fetch", fetch);
  const cliente = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  };
  return {
    fetch,
    provider: criarDataProvider("http://localhost:54321", cliente as never),
  };
}

describe("recursos de leitura", () => {
  it("lista e detalhe de exports selecionam apenas o GRANT, mesmo sem meta", async () => {
    const { fetch, provider } = preparar();
    const permitidas = [
      "id",
      "checksum_sha256",
      "schema_version",
      "row_count",
      "created_by",
      "status",
      "created_at",
      "updated_at",
    ];
    expect(colunasExportacoes).toEqual(permitidas);
    expect(ExportacoesList().props.queryOptions.meta.columns).toEqual(
      permitidas,
    );
    expect(ExportacoesShow().props.queryOptions.meta.columns).toEqual(
      permitidas,
    );
    await provider.getList("exports", {
      pagination: { page: 1, perPage: 25 },
      sort: { field: "id", order: "ASC" },
      filter: {},
    });
    await provider.getOne("exports", { id: 1, meta: { columns: "*" } });
    await provider.getMany("exports", { ids: [1, 2] });
    for (const [url] of fetch.mock.calls) {
      expect(new URL(url).searchParams.get("select")?.split(",")).toEqual(
        permitidas,
      );
      expect(url).not.toContain("csv_content_base64");
    }
    expect(Object.keys(camposRecursos)).toEqual([
      "sources",
      "spaces",
      "job_runs",
      "exports",
    ]);
  });
});

describe("lista de eventos", () => {
  it("traduz os filtros reais para PostgREST, pagina e desempata por id", async () => {
    const lista = EventosList();
    const filtros = lista.props.filters as ReactElement<{
      source: string;
      parse?: (v: string) => string;
    }>[];
    const valores = ["approved", 2, "Teatro", "2026-11-19", "2026-11-20"];
    const filter = Object.fromEntries(
      filtros.map((f, i) => [
        f.props.source,
        f.props.parse ? f.props.parse(String(valores[i])) : valores[i],
      ]),
    );
    const { fetch, provider } = preparar();
    await provider.getList("events", {
      filter,
      sort: lista.props.sort,
      pagination: { page: 2, perPage: lista.props.perPage },
    });
    const query = new URL(fetch.mock.calls[0]?.[0]).searchParams;
    expect(query.get("curation_status")).toBe("eq.approved");
    expect(query.get("source_id")).toBe("eq.2");
    expect(query.get("title")).toBe("ilike.*Teatro*");
    expect(query.getAll("starts_at")[0]).toBe("gte.2026-11-19T00:00:00-03:00");
    expect(query.getAll("starts_at")[1]).toBe("lt.2026-11-21T00:00:00-03:00");
    expect(query.get("order")).toBe("starts_at.asc,id.asc");
    expect(query.get("offset")).toBe("50");
    expect(query.get("limit")).toBe("50");
    expect(lista.props.pagination.props.rowsPerPageOptions).toEqual([
      25, 50, 100,
    ]);
    expect(lista.props.disableSyncWithLocation).not.toBe(true);
    expect(formatoData.timeZone).toBe("America/Fortaleza");
  });

  it.each([
    ["curation_status", "curation_status.desc,id.asc"],
    ["source_id", "source_id.desc,id.asc"],
    ["id", "id.desc"],
  ])(
    "ordena as duas páginas por %s com desempate estável",
    async (field, ordem) => {
      const { fetch, provider } = preparar();
      for (const page of [1, 2]) {
        await provider.getList("events", {
          pagination: { page, perPage: 50 },
          sort: { field, order: "DESC" },
          filter: {},
        });
        const query = new URL(fetch.mock.calls[page - 1]?.[0]).searchParams;
        expect(query.get("order")).toBe(ordem);
        expect(query.get("offset")).toBe(String((page - 1) * 50));
      }
    },
  );

  it.each([
    ["2026-11-21T00:00:00-03:00", "2026-11-20"],
    ["2027-01-01T00:00:00-03:00", "2026-12-31"],
  ])("reabre o limite %s com o dia escolhido na URL", async (limite, dia) => {
    const { fetch, provider } = preparar();
    const params = new URLSearchParams({
      filter: JSON.stringify({ "starts_at@lt": limite }),
      displayedFilters: JSON.stringify({ "starts_at@lt": true }),
    });
    const { container } = render(
      <TestMemoryRouter initialEntries={[`/events?${params}`]}>
        <AdminContext dataProvider={provider}>
          <ResourceContextProvider value="events">
            <EventosList />
          </ResourceContextProvider>
        </AdminContext>
      </TestMemoryRouter>,
    );
    const campo = await within(container).findByLabelText<HTMLInputElement>(
      m.filtros.inicioAte,
    );
    expect(campo.value).toBe(dia);
    await waitFor(() => {
      expect(
        fetch.mock.calls.some(
          ([url]) =>
            new URL(url).searchParams.get("starts_at") === `lt.${limite}`,
        ),
      ).toBe(true);
    });
  });

  it("restringe a seleção de curadoria à página atual", async () => {
    const getList = vi
      .fn<DataProvider["getList"]>()
      .mockImplementation(async (_resource, { pagination }) => {
        const id = pagination?.page === 2 ? 51 : 1;
        return {
          data: [{ id, title: `Evento ${id}`, version: 1 }] as never,
          total: 51,
        };
      });
    render(
      <AdminContext
        dataProvider={
          {
            getList,
            getMany: async () => ({ data: [] }),
          } as unknown as DataProvider
        }
      >
        <ResourceContextProvider value="events">
          <EventosList />
        </ResourceContextProvider>
      </AdminContext>,
    );
    const evento = await screen.findByRole("row", { name: /Evento 1/ });
    fireEvent.click(within(evento).getByRole("checkbox"));
    expect(
      screen.getByRole("button", { name: "Aprovar selecionados" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "ra.action.select_all_button" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "ra.navigation.next" }));
    await screen.findByRole("row", { name: /Evento 51/ });
    fireEvent.click(
      screen.getByRole("button", { name: "ra.navigation.previous" }),
    );
    const primeiraPagina = await screen.findByRole("row", { name: /Evento 1/ });
    const checkbox =
      within(primeiraPagina).getByRole<HTMLInputElement>("checkbox");
    expect(checkbox.checked).toBe(false);
  });

  it("mantém HTML da fonte como texto escapado", () => {
    const titulo = '<img src=x onerror="alert(1)">';
    const { container } = render(
      <RecordContextProvider value={{ id: 1, title: titulo }}>
        <TextField source="title" />
      </RecordContextProvider>,
    );
    expect(screen.getByText(titulo)).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });
});

it("mensagens pt-BR não têm valores vazios", () => {
  function verificar(valor: unknown) {
    if (typeof valor === "string")
      expect(valor.trim().length).toBeGreaterThan(0);
    else for (const item of Object.values(valor as object)) verificar(item);
  }
  verificar(m);
});
