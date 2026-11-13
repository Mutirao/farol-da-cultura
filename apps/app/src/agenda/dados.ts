import { z } from "zod";

const id = z.number().int().positive().safe();
const instante = z.string().refine((v) => Number.isFinite(Date.parse(v)));
const https = z
  .string()
  .url()
  .refine((v) => v.startsWith("https://"));
const EspacoSchema = z.object({
  id,
  nome: z.string(),
  descricao: z.string().nullable(),
  endereco: z.string().nullable(),
  municipio: z.string().nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  acessibilidade_fisica: z.array(z.string()),
});
export const EventoSchema = z.object({
  id,
  fonte: z.string(),
  id_externo: z.string(),
  nome: z.string(),
  descricao_curta: z.string().nullable(),
  descricao_longa: z.string().nullable(),
  classificacao_etaria: z.string().nullable(),
  imagem_url: https.nullable().catch(null),
  categorias: z.array(z.object({ categorias: z.object({ nome: z.string() }) })),
  datas: z.array(
    z.object({
      id,
      inicio: instante,
      fim: instante.nullable(),
      preco: z.string().nullable(),
      gratuito: z.boolean().nullable(),
      espaco: EspacoSchema.nullable(),
    }),
  ),
});
export type Evento = z.infer<typeof EventoSchema>;
export type DataEvento = Evento["datas"][number];
export type Espaco = z.infer<typeof EspacoSchema>;
export const chaveEvento = (evento: Evento) =>
  `${evento.fonte}:${evento.id_externo}`;

const SELECAO =
  "id,fonte,id_externo,nome,descricao_curta,descricao_longa,classificacao_etaria,imagem_url,categorias:eventos_categorias(categorias(nome)),datas:eventos_datas(id,inicio,fim,preco,gratuito,espaco:espacos(id,nome,descricao,endereco,municipio,latitude,longitude,acessibilidade_fisica))";

// Só chave pública no bundle; as permissões de leitura são as políticas RLS do servidor.
export async function buscarAgenda(
  url: string | undefined,
  chavePublica: string | undefined,
  signal: AbortSignal,
  buscar = fetch,
): Promise<Evento[]> {
  if (!url || !chavePublica) throw new Error("configuracao");
  const eventos: Evento[] = [];
  for (let pagina = 0; pagina < 50; pagina++) {
    const endpoint = new URL("/rest/v1/eventos", url);
    endpoint.search = new URLSearchParams({
      select: SELECAO,
      order: "id",
      limit: "200",
      offset: String(pagina * 200),
    }).toString();
    const resposta = await buscar(endpoint.toString(), {
      headers: { apikey: chavePublica, Accept: "application/json" },
      signal,
    });
    if (!resposta.ok) throw new Error(`agenda HTTP ${resposta.status}`);
    const lote = z.array(EventoSchema).parse(await resposta.json());
    eventos.push(...lote);
    if (lote.length < 200) return eventos;
  }
  throw new Error("agenda excedeu limite de páginas");
}

export type Filtros = {
  busca: string;
  periodo: string;
  categoria: string;
  ingresso: string;
  municipio: string;
  acessibilidade: string;
};
export const filtrosIniciais: Filtros = {
  busca: "",
  periodo: "proximos",
  categoria: "",
  ingresso: "",
  municipio: "",
  acessibilidade: "",
};

export function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

const diaLocal = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Fortaleza",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function limitesPeriodo(periodo: string, agora: Date): [number, number] {
  const partes = diaLocal.formatToParts(agora);
  const n = (tipo: string) =>
    Number(partes.find((p) => p.type === tipo)?.value);
  // Fortaleza não adota horário de verão: início do dia local = 03h UTC.
  const hoje = Date.UTC(n("year"), n("month") - 1, n("day"), 3);
  const dia = 86_400_000;
  if (periodo === "hoje") return [hoje, hoje + dia];
  if (periodo === "amanha") return [hoje + dia, hoje + 2 * dia];
  if (periodo === "semana") return [hoje, hoje + 7 * dia];
  if (periodo === "mes") return [hoje, hoje + 30 * dia];
  return [hoje, Number.POSITIVE_INFINITY];
}

export function datasFiltradas(
  evento: Evento,
  filtros: Filtros,
  agora: Date,
): DataEvento[] {
  const [de, ate] = limitesPeriodo(filtros.periodo, agora);
  return evento.datas
    .filter((data) => {
      const inicio = Date.parse(data.inicio);
      const fim = data.fim ? Date.parse(data.fim) : inicio;
      return (
        inicio < ate &&
        fim >= de &&
        (!filtros.ingresso ||
          data.gratuito === (filtros.ingresso === "gratuito")) &&
        (!filtros.municipio ||
          semAcento(data.espaco?.municipio ?? "") ===
            semAcento(filtros.municipio)) &&
        (!filtros.acessibilidade ||
          data.espaco?.acessibilidade_fisica.includes(filtros.acessibilidade))
      );
    })
    .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
}

export function filtrar(
  eventos: Evento[],
  filtros: Filtros,
  agora = new Date(),
): Evento[] {
  const busca = semAcento(filtros.busca.trim());
  return eventos
    .flatMap((evento) => {
      if (
        filtros.categoria &&
        !evento.categorias.some((c) => c.categorias.nome === filtros.categoria)
      )
        return [];
      const datas = datasFiltradas(evento, filtros, agora);
      const texto = [
        evento.nome,
        evento.descricao_curta,
        ...datas.flatMap((d) => [d.espaco?.nome, d.espaco?.municipio]),
      ].join(" ");
      const primeira = datas[0];
      return primeira && (!busca || semAcento(texto).includes(busca))
        ? [{ evento, inicio: Date.parse(primeira.inicio) }]
        : [];
    })
    .sort((a, b) => a.inicio - b.inicio)
    .map(({ evento }) => evento);
}

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Fortaleza",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
export const formatarData = (iso: string) => dataHora.format(new Date(iso));

export const FavoritosSchema = z.array(z.string().min(1)).max(10_000);
export function alternarFavorito(chaves: string[], chave: string): string[] {
  return chaves.includes(chave)
    ? chaves.filter((c) => c !== chave)
    : [...chaves, chave];
}
