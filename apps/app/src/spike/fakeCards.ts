// Spike F0-10 (branch spike/lista, não mergeado): 500 cartões falsos determinísticos.
// PRNG mulberry32 com SEMENTE FIXA {@link FAKE_CARDS_SEED} = 0x0f0010 ("F0-10").
// Nenhum Math.random: a mesma semente produz sempre a mesma lista, nas duas variantes.

/** Semente fixa do spike F0-10. Mudar este valor invalida a comparação entre rodadas. */
export const FAKE_CARDS_SEED = 0x0f0010;
export const FAKE_CARDS_COUNT = 500;

/** As 20 miniaturas locais (<= 480 px) em assets/spike-lista/, em ordem alfabética. */
const THUMBNAILS = [
  require("../../../../assets/spike-lista/ArtesIntegradas1.png"),
  require("../../../../assets/spike-lista/ArtesVisuais1.png"),
  require("../../../../assets/spike-lista/Audiovisual.png"),
  require("../../../../assets/spike-lista/Circo_1.png"),
  require("../../../../assets/spike-lista/CulturaAfroBrasileira_1.png"),
  require("../../../../assets/spike-lista/CulturaAlimentar_1.png"),
  require("../../../../assets/spike-lista/CulturaDigital.png"),
  require("../../../../assets/spike-lista/CulturaIndigena1.png"),
  require("../../../../assets/spike-lista/CulturaPopular.png"),
  require("../../../../assets/spike-lista/Danca_1.png"),
  require("../../../../assets/spike-lista/Esporte_1.png"),
  require("../../../../assets/spike-lista/Formacao1.png"),
  require("../../../../assets/spike-lista/GestaoCultural_1.png"),
  require("../../../../assets/spike-lista/Humor_1.png"),
  require("../../../../assets/spike-lista/Jogos_1.png"),
  require("../../../../assets/spike-lista/Literatura_1.png"),
  require("../../../../assets/spike-lista/MeioAmbiente_1.png"),
  require("../../../../assets/spike-lista/Moda_1.png"),
  require("../../../../assets/spike-lista/Musica1.png"),
  require("../../../../assets/spike-lista/Teatro_1.png"),
] as const;

/** Categoria correspondente a cada miniatura (mesma ordem de THUMBNAILS). */
const CATEGORIES = [
  "ArtesIntegradas",
  "ArtesVisuais",
  "Audiovisual",
  "Circo",
  "CulturaAfroBrasileira",
  "CulturaAlimentar",
  "CulturaDigital",
  "CulturaIndigena",
  "CulturaPopular",
  "Danca",
  "Esporte",
  "Formacao",
  "GestaoCultural",
  "Humor",
  "Jogos",
  "Literatura",
  "MeioAmbiente",
  "Moda",
  "Musica",
  "Teatro",
] as const;

const ADJECTIVES = [
  "Grande",
  "Pequena",
  "Noturna",
  "Popular",
  "Aberta",
  "Itinerante",
  "Comunitária",
  "Independente",
] as const;
const NOUNS = [
  "Mostra",
  "Roda",
  "Oficina",
  "Feira",
  "Sessão",
  "Festa",
  "Encontro",
  "Leitura",
] as const;
const PLACES = [
  "da Praça",
  "do Centro",
  "da Vila",
  "do Mercado",
  "da Biblioteca",
  "do Bairro",
] as const;

export type FakeCard = {
  /** Chave estável usada em keyExtractor e no recyclingKey do expo-image. */
  id: string;
  title: string;
  /** Data ISO (AAAA-MM-DD). */
  date: string;
  category: string;
  /** Módulo de asset local (require) de uma das 20 miniaturas, escolhido por index % 20. */
  thumbnail: number;
};

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)] as T;
}

const BASE_DAY_UTC = Date.UTC(2026, 11, 1);
const DAY_MS = 86_400_000;

export function makeFakeCards(
  seed: number = FAKE_CARDS_SEED,
  count: number = FAKE_CARDS_COUNT,
): FakeCard[] {
  const rng = mulberry32(seed);
  const cards: FakeCard[] = [];
  for (let index = 0; index < count; index++) {
    const slot = index % THUMBNAILS.length;
    const title = `${pick(rng, NOUNS)} ${pick(rng, ADJECTIVES)} ${pick(rng, PLACES)}`;
    const day = Math.floor(rng() * 120);
    cards.push({
      id: `card-${String(index).padStart(3, "0")}`,
      title,
      date: new Date(BASE_DAY_UTC + day * DAY_MS).toISOString().slice(0, 10),
      category: CATEGORIES[slot] as string,
      thumbnail: THUMBNAILS[slot] as number,
    });
  }
  return cards;
}

/** Lista única compartilhada pelas duas variantes (mesma referência a cada import). */
export const FAKE_CARDS: readonly FakeCard[] = makeFakeCards();

export const fakeCardKey = (card: FakeCard): string => card.id;
