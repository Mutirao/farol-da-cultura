// Leitura de páginas já baixadas → lote normalizado. Sem rede: o HTML chega
// por arquivo, e a navegação (listagem, Playwright) fica para o U2.
import { readFile, stat } from "node:fs/promises";
import { type EventoColetado, type Issue, montarLote } from "./lote.ts";
import { canonicalDaPagina, parseEventPage } from "./sympla.ts";
import type { RawEvent } from "./tipos.ts";

/** Teto por arquivo; a página de evento real tem cerca de 0,6 MB. */
export const MAX_BYTES_HTML = 10 * 1024 * 1024;

export interface Preparo {
  eventos: EventoColetado[];
  issues: Issue[];
  arquivos: number;
  interpretados: number;
}

export async function prepararColeta(
  arquivos: string[],
  agora: Date,
): Promise<Preparo> {
  const raws: RawEvent[] = [];
  const issues: Issue[] = [];
  for (const arquivo of arquivos) {
    let html: string;
    try {
      if ((await stat(arquivo)).size > MAX_BYTES_HTML) {
        issues.push({
          origem: arquivo,
          etapa: "leitura",
          motivo: "arquivo_grande_demais",
        });
        continue;
      }
      html = await readFile(arquivo, "utf8");
    } catch {
      issues.push({
        origem: arquivo,
        etapa: "leitura",
        motivo: "arquivo_ilegivel",
      });
      continue;
    }
    const raw = parseEventPage(html, canonicalDaPagina(html));
    if (raw) raws.push(raw);
    else
      issues.push({
        origem: arquivo,
        etapa: "pagina",
        motivo: "pagina_nao_interpretavel",
      });
  }
  const lote = montarLote(raws, agora);
  return {
    eventos: lote.eventos,
    issues: [...issues, ...lote.issues],
    arquivos: arquivos.length,
    interpretados: raws.length,
  };
}

/**
 * Código de saída depois de gravar: 0 completo, 2 parcial (alguma página não
 * virou evento). Campo ausente não é falha: o evento entra `incomplete`.
 */
export function codigoDeSaida(issues: Issue[]): 0 | 2 {
  return issues.some(
    (issue) => issue.etapa === "leitura" || issue.etapa === "pagina",
  )
    ? 2
    : 0;
}
