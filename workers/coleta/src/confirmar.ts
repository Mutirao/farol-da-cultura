// Confirmação da incorporação (S0.6): para cada vínculo `registrado`, lê o registro na API
// da instância pelo ID no Mapas, compara título e início com o evento coletado e grava o
// resultado com public.confirmar_incorporacao (só service_role). Não escreve na agenda.
import { z } from "zod";
import { FONTE, resolverBase } from "./mapaCultural.ts";

const FUSO = "America/Fortaleza";
const PRAZO = 30_000;
const AGENTE =
  "farol-da-cultura-coleta (+https://github.com/Mutirao/farol-da-cultura)";

const Vinculos = z.array(
  z.object({
    event_id: z.number().int(),
    instancia: z.string(),
    base: z.string(),
    mapas_id: z.string(),
  }),
);

const Eventos = z.array(
  z.object({
    id: z.number().int(),
    title: z.string(),
    starts_at: z.string().nullable(),
  }),
);

// /api/event/find?id=EQ(n)&@select=id,name,occurrences.{id,rule}: lista com 0 ou 1 objeto.
const Registro = z.object({
  id: z.number().int(),
  name: z.string(),
  occurrences: z
    .array(
      z.object({
        rule: z
          .object({
            startsOn: z.string().nullish(),
            startsAt: z.string().nullish(),
          })
          .nullish(),
      }),
    )
    .nullish(),
});
const RespostaFind = z.array(Registro).max(1);
type Registro = z.infer<typeof Registro>;

const Confirmado = z.object({ estado: z.enum(["confirmado", "divergente"]) });

export type Contagens = {
  vinculos: number;
  confirmados: number;
  divergentes: number;
  ausentes: number;
  outra_base: number;
  mapas_id_invalido: number;
  sem_evento: number;
  sem_inicio: number;
};

/** Forma de comparação do título: sem acento, minúsculas, espaços colapsados. */
export function normalizarTitulo(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Minuto UTC: o Mapas guarda início em HH:MM local, sem segundos.
const minuto = (instante: Temporal.Instant) =>
  Math.floor(instante.epochMilliseconds / 60_000);

function iniciosDoRegistro(registro: Registro): Set<number> {
  const inicios = new Set<number>();
  for (const ocorrencia of registro.occurrences ?? []) {
    const { startsOn, startsAt } = ocorrencia.rule ?? {};
    if (!startsOn || !startsAt) continue;
    try {
      inicios.add(
        minuto(
          Temporal.PlainDateTime.from(`${startsOn}T${startsAt}`)
            .toZonedDateTime(FUSO)
            .toInstant(),
        ),
      );
    } catch {
      // Ocorrência com data ilegível não confere; as demais seguem.
    }
  }
  return inicios;
}

/** Confere se o registro da instância tem o mesmo título e uma ocorrência no mesmo início. */
export function confere(
  evento: { title: string; starts_at: string },
  registro: Registro,
): boolean {
  return (
    normalizarTitulo(evento.title) === normalizarTitulo(registro.name) &&
    iniciosDoRegistro(registro).has(
      minuto(Temporal.Instant.from(evento.starts_at)),
    )
  );
}

async function json(resposta: Response, origem: string): Promise<unknown> {
  const texto = await resposta.text();
  if (!resposta.ok) {
    throw new Error(`${origem} respondeu ${resposta.status}`);
  }
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(`${origem}: resposta não é JSON`);
  }
}

/**
 * Executa uma rodada. A base da instância passa por `resolverBase` antes de qualquer
 * requisição. Todas as leituras na instância acontecem antes da primeira confirmação:
 * resposta inválida lança sem gravar nada.
 */
export async function confirmar({
  supabaseUrl,
  chave,
  base = process.env.MAPA_CULTURAL_BASE,
  buscar = fetch,
}: {
  supabaseUrl: string;
  chave: string;
  base?: string | undefined;
  buscar?: typeof fetch;
}): Promise<Contagens> {
  const instancia = resolverBase(base);
  const cabecalhos = {
    apikey: chave,
    authorization: `Bearer ${chave}`,
    "content-type": "application/json",
  };
  const supabase = (caminho: string, init: RequestInit = {}) =>
    buscar(new URL(caminho, supabaseUrl), {
      ...init,
      headers: cabecalhos,
      signal: AbortSignal.timeout(PRAZO),
    });

  const contagens: Contagens = {
    vinculos: 0,
    confirmados: 0,
    divergentes: 0,
    ausentes: 0,
    outra_base: 0,
    mapas_id_invalido: 0,
    sem_evento: 0,
    sem_inicio: 0,
  };

  const vinculos = Vinculos.parse(
    await json(
      await supabase(
        "/rest/v1/vinculos_institucionais?estado=eq.registrado&select=event_id,instancia,base,mapas_id",
      ),
      "vinculos_institucionais",
    ),
  );
  contagens.vinculos = vinculos.length;
  if (vinculos.length === 0) return contagens;

  const eventos = new Map(
    Eventos.parse(
      await json(
        await supabase(
          `/rest/v1/events?id=in.(${vinculos.map((v) => v.event_id).join(",")})&select=id,title,starts_at`,
        ),
        "events",
      ),
    ).map((evento) => [evento.id, evento]),
  );

  // Fase 1: só leitura na instância.
  const resultados: { event_id: number; confere: boolean }[] = [];
  for (const vinculo of vinculos) {
    // Só a base desta sincronização; outra base pede a sua própria instância.
    if (vinculo.base !== FONTE) {
      contagens.outra_base++;
      continue;
    }
    if (!/^[1-9]\d{0,15}$/.test(vinculo.mapas_id)) {
      contagens.mapas_id_invalido++;
      continue;
    }
    const evento = eventos.get(vinculo.event_id);
    if (!evento) {
      contagens.sem_evento++;
      continue;
    }
    if (evento.starts_at === null) {
      contagens.sem_inicio++;
      continue;
    }

    const url = new URL("/api/event/find", instancia);
    url.search = new URLSearchParams({
      id: `EQ(${vinculo.mapas_id})`,
      "@select": "id,name,occurrences.{id,rule}",
    }).toString();
    // redirect "error": a confirmação só fala com o host resolvido acima.
    const lida = RespostaFind.safeParse(
      await json(
        await buscar(url, {
          redirect: "error",
          signal: AbortSignal.timeout(PRAZO),
          headers: { accept: "application/json", "user-agent": AGENTE },
        }),
        "instância",
      ),
    );
    if (!lida.success) {
      throw new Error("instância: resposta fora do formato esperado");
    }
    const [registro] = lida.data;
    if (!registro) {
      contagens.ausentes++;
      continue;
    }
    if (String(registro.id) !== vinculo.mapas_id) {
      throw new Error("instância: registro devolvido com outro ID");
    }
    resultados.push({
      event_id: vinculo.event_id,
      confere: confere({ ...evento, starts_at: evento.starts_at }, registro),
    });
  }

  // Fase 2: grava o resultado de cada conferência.
  for (const { event_id, confere: p_confere } of resultados) {
    const { estado } = Confirmado.parse(
      await json(
        await supabase("/rest/v1/rpc/confirmar_incorporacao", {
          method: "POST",
          body: JSON.stringify({ p_event_id: event_id, p_confere }),
        }),
        "confirmar_incorporacao",
      ),
    );
    if (estado === "confirmado") contagens.confirmados++;
    else contagens.divergentes++;
  }

  return contagens;
}

if (import.meta.main) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !chave) {
    throw new Error("defina SUPABASE_URL e SUPABASE_SECRET_KEY no ambiente");
  }
  // Só contagens no log: nada de título, ID ou chave.
  console.log(JSON.stringify(await confirmar({ supabaseUrl, chave })));
}
