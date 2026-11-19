import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EstadoVinculoTexto } from "../src/eventos/EstadoVinculoTexto";

describe("EstadoVinculoTexto", () => {
  it("mostra 'Sem vínculo institucional' quando não há vínculo", () => {
    render(<EstadoVinculoTexto vinculo={undefined} />);
    expect(screen.getByText("Sem vínculo institucional")).toBeTruthy();
  });

  it("mostra o rótulo de registrado quando o estado é 'registrado'", () => {
    render(
      <EstadoVinculoTexto
        vinculo={{
          event_id: 1,
          estado: "registrado",
          mapas_id: "123",
          verificado_em: null,
        }}
      />,
    );
    expect(screen.getByText("Registrado (não confirmado)")).toBeTruthy();
  });

  it("mostra o rótulo de confirmado quando o estado é 'confirmado'", () => {
    render(
      <EstadoVinculoTexto
        vinculo={{
          event_id: 1,
          estado: "confirmado",
          mapas_id: "123",
          verificado_em: "2026-01-01T00:00:00Z",
        }}
      />,
    );
    expect(screen.getByText("Confirmado na instância")).toBeTruthy();
  });
});
