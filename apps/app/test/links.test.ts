import { describe, expect, it } from "vitest";
import { urlComoChegar, urlMapa } from "../src/agenda/dados";

const base = {
  id: 1,
  nome: "Hub Cultural Porto Dragão",
  descricao: null,
  acessibilidade_fisica: [],
};

describe("urlComoChegar", () => {
  it("prefere coordenadas quando o espaço tem latitude e longitude", () => {
    expect(
      urlComoChegar({
        ...base,
        latitude: -3.72,
        longitude: -38.51,
        endereco: "R. Boris, 90",
        municipio: "Fortaleza",
      }),
    ).toBe("https://www.google.com/maps/search/?api=1&query=-3.72,-38.51");
  });
  it("cai para o endereço textual quando não há coordenadas", () => {
    expect(
      urlComoChegar({
        ...base,
        latitude: null,
        longitude: null,
        endereco: "R. Boris, 90",
        municipio: "Fortaleza",
      }),
    ).toBe(
      "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent("R. Boris, 90, Fortaleza"),
    );
  });
  it("omite partes do endereço ausentes", () => {
    expect(
      urlComoChegar({
        ...base,
        latitude: null,
        longitude: null,
        endereco: null,
        municipio: "Fortaleza",
      }),
    ).toBe(
      "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent("Fortaleza"),
    );
  });
  it("sem coordenadas nem endereço não abre nada", () => {
    expect(
      urlComoChegar({
        ...base,
        latitude: null,
        longitude: null,
        endereco: null,
        municipio: null,
      }),
    ).toBeNull();
  });
});

describe("urlMapa (proxy de marcadores do tab mapa)", () => {
  it("só existe com coordenadas", () => {
    expect(
      urlMapa({
        ...base,
        latitude: -3.72,
        longitude: -38.51,
        endereco: null,
        municipio: null,
      }),
    ).toBe("https://www.google.com/maps/search/?api=1&query=-3.72,-38.51");
    expect(
      urlMapa({
        ...base,
        latitude: null,
        longitude: null,
        endereco: "R. Boris, 90",
        municipio: "Fortaleza",
      }),
    ).toBeNull();
  });
});
