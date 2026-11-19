// Funções puras e contrato local: sem import estático de Temporal dos workers.
export interface EventoLocal {
  external_id: string;
  title: string;
  starts_at: string | null;
  [campo: string]: unknown;
}

// Novo lote: a fixture sintética não tem o mesmo conteúdo que a anterior.
export const RUN_KEY = "8263eb3c-8f2c-4ef7-becf-39c66f246333";
export const PRIMEIRO_EXEMPLO = "farol-painel-local-exemplo-01";

export function verificarDestinoLocal(api: string, banco: string): void {
  for (const [valor, protocolos] of [
    [api, ["http:", "https:"]],
    [banco, ["postgres:", "postgresql:"]],
  ] as const) {
    let url: URL;
    try {
      url = new URL(valor);
    } catch {
      throw new Error("destino local inválido");
    }
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !protocolos.some((protocolo) => protocolo === url.protocol) ||
      url.search ||
      url.hash ||
      (valor === api && (url.username || url.password || url.pathname !== "/"))
    ) {
      throw new Error(
        "destino recusado: só API e banco em 127.0.0.1/localhost",
      );
    }
  }
}

/** Base persistida no primeiro exemplo: repetir amanhã mantém o mesmo lote/run key. */
export function gerarEventosSinteticos(base: string): EventoLocal[] {
  const inicio = Date.parse(base);
  if (!Number.isFinite(inicio)) throw new Error("data base inválida");
  const atividades = [
    "Roda de leitura",
    "Mostra de cinema",
    "Oficina de xilogravura",
    "Encontro de maracatu",
    "Feira de artesanato",
    "Espetáculo de dança",
    "Sarau de poesia",
    "Concerto instrumental",
    "Exposição de fotografia",
    "Teatro de bonecos",
    "Contação de histórias",
    "Oficina de cerâmica",
  ];
  return atividades.map((atividade, i) => ({
    external_id: `farol-painel-local-exemplo-${String(i + 1).padStart(2, "0")}`,
    title: `[exemplo] ${atividade}`,
    description:
      "Dado sintético para desenvolvimento local. Não é programação real.",
    normalized_title: `[exemplo] ${atividade}`.toLowerCase(),
    source_url: null,
    starts_at: new Date(
      inicio + (i + 1) * 86_400_000 + 18 * 3_600_000,
    ).toISOString(),
    ends_at: new Date(
      inicio + (i + 1) * 86_400_000 + 20 * 3_600_000,
    ).toISOString(),
    venue_name: "Espaço de exemplo (não real)",
    venue_address: "Endereço fictício — Fortaleza, CE",
    venue_raw: null,
    city: "Fortaleza",
    modality: "in_person",
    collection_status: "included",
    collection_reason: null,
    price_raw: i % 2 === 0 ? "Gratuito" : `R$ ${20 + i * 5},00`,
    avatar_url: null,
    raw_json: { exemplo: true, bootstrap_base: base, origem: "painel:local" },
  }));
}

export function montarInstrucoes(
  api: string,
  email: string,
  codigo: string,
): string {
  if (!/^\d{6}$/.test(codigo)) throw new Error("código de login inválido");
  verificarDestinoLocal(api, "postgresql://localhost/postgres");
  return [
    `Código de login para ${email}: ${codigo} (uso único).`,
    "Abra http://127.0.0.1:5173 após iniciar:",
    `VITE_SUPABASE_URL='${api}' VITE_SUPABASE_PUBLISHABLE_KEY='<PUBLISHABLE_KEY local>' pnpm --filter @farol/painel dev`,
    "Substitua o marcador pela PUBLISHABLE_KEY do status local, nunca pela chave secreta.",
    "Na tela: informe o e-mail e clique Enviar código. Com o e-mail local indisponível, confirme usando o código acima.",
    "Se o envio gerar outro código, rode pnpm painel:local novamente antes de Confirmar código.",
  ].join("\n");
}
