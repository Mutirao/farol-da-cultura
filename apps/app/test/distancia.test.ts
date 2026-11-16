import { describe, expect, it } from "vitest";
import type { Evento } from "../src/agenda/dados";
import {
  type Coordenada,
  distanciaEvento,
  formatarDistancia,
  haversineKm,
  ordenarPorPerto,
} from "../src/agenda/distancia";

// Praça do Ferreira, Fortaleza.
const ORIGEM = { latitude: -3.7275, longitude: -38.5275 };

function eventoCom(nome: string, espacos: (Coordenada | null)[]) {
  return {
    id: espacos.length,
    fonte: "teste",
    id_externo: nome,
    nome,
    descricao_curta: null,
    descricao_longa: null,
    classificacao_etaria: null,
    imagem_url: null,
    categorias: [],
    datas: espacos.map((espaco, i) => ({
      id: i + 1,
      inicio: "2030-01-10T22:00:00Z",
      fim: null,
      gratuito: null,
      preco: null,
      espaco: espaco
        ? {
            id: i + 1,
            nome: `Espaço ${i + 1}`,
            descricao: null,
            endereco: null,
            municipio: null,
            latitude: espaco.latitude,
            longitude: espaco.longitude,
            acessibilidade_fisica: [],
          }
        : null,
    })),
  } as Evento;
}

describe("haversineKm", () => {
  it("distância zero para o mesmo ponto", () => {
    expect(haversineKm(ORIGEM, ORIGEM)).toBe(0);
  });
  // Ponto a ~1,11 km a leste (0,01° de longitude em Fortaleza ≈ 1,1 km).
  it("escala correta em curtas distâncias", () => {
    const leste = {
      latitude: ORIGEM.latitude,
      longitude: ORIGEM.longitude + 0.01,
    };
    expect(haversineKm(ORIGEM, leste)).toBeGreaterThan(1);
    expect(haversineKm(ORIGEM, leste)).toBeLessThan(1.2);
  });
});

describe("formatarDistancia", () => {
  it("usa metros abaixo de 1 km", () => {
    expect(formatarDistancia(0.85)).toBe("850 m");
  });
  it("usa km com vírgula a partir de 1 km", () => {
    expect(formatarDistancia(2.14)).toBe("2,1 km");
    expect(formatarDistancia(10)).toBe("10,0 km");
  });
});

describe("distanciaEvento", () => {
  it("null quando nenhuma data tem coordenadas", () => {
    expect(distanciaEvento(eventoCom("sem", [null]), ORIGEM)).toBeNull();
  });
  it("usa a menor distância entre as datas", () => {
    const perto = { latitude: -3.728, longitude: -38.528 };
    const longe = { latitude: -3.8, longitude: -38.6 };
    expect(
      distanciaEvento(eventoCom("dois", [longe, perto]), ORIGEM),
    ).toBeLessThan(0.2);
  });
});

describe("ordenarPorPerto", () => {
  const longe = { latitude: -3.85, longitude: -38.65 };
  const perto = { latitude: -3.7276, longitude: -38.5276 };
  it("ordena do mais perto para o mais longe, estável", () => {
    const nomes = ordenarPorPerto(
      [
        eventoCom("longe", [longe]),
        eventoCom("perto", [perto]),
        eventoCom("médio", [{ latitude: -3.75, longitude: -38.55 }]),
      ],
      ORIGEM,
    ).map((e) => e.nome);
    expect(nomes).toEqual(["perto", "médio", "longe"]);
  });
  it("eventos sem coordenadas vão ao fim, preservando a ordem", () => {
    const nomes = ordenarPorPerto(
      [
        eventoCom("s1", [null]),
        eventoCom("perto", [perto]),
        eventoCom("s2", [null]),
      ],
      ORIGEM,
    ).map((e) => e.nome);
    expect(nomes).toEqual(["perto", "s1", "s2"]);
  });
});
