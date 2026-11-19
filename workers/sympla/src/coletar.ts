// Coleta mínima do Sympla: lê páginas de evento já baixadas, normaliza e
// entrega o lote a public.registrar_coleta_minima (gravação restrita, nunca
// na agenda).
//
//   node src/coletar.ts [--run-key=<uuid>] pagina.html [outra.html ...]
//
// Ambiente: SUPABASE_URL e SUPABASE_SECRET_KEY. Para reenviar o mesmo lote
// depois de perder a resposta, repita o run key impresso na saída.
// Saída: 0 completo, 2 gravado mas parcial, 1 nada gravado.
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { z } from "zod";
import { codigoDeSaida, prepararColeta } from "./coleta.ts";
import {
  registrarColetaMinima,
  resolverUrlSupabase,
  SOURCE_SLUG,
} from "./rpc.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { "run-key": { type: "string" } },
});
if (positionals.length === 0) {
  throw new Error("uso: coletar [--run-key=<uuid>] pagina.html [...]");
}
const runKey = z
  .uuid()
  .parse(values["run-key"] ?? process.env.RUN_KEY ?? randomUUID());
const url = resolverUrlSupabase(process.env.SUPABASE_URL);
const chave = process.env.SUPABASE_SECRET_KEY;
if (!chave) throw new Error("defina SUPABASE_SECRET_KEY no ambiente");

const preparo = await prepararColeta(positionals, new Date());
// Só contagens, arquivos, ids externos e códigos: nada do conteúdo nem da chave.
const relatorio = {
  run_key: runKey,
  fonte: SOURCE_SLUG,
  arquivos: preparo.arquivos,
  interpretados: preparo.interpretados,
  enviados: preparo.eventos.length,
  issues: preparo.issues,
};

if (preparo.eventos.length === 0) {
  console.log(JSON.stringify({ ...relatorio, resultado: null }));
  console.error("nenhum evento interpretado: nada enviado");
  process.exitCode = 1;
} else {
  const { eventos, ...contagens } = await registrarColetaMinima({
    url,
    chave,
    runKey,
    eventos: preparo.eventos,
  });
  console.log(
    JSON.stringify({
      ...relatorio,
      resultado: { ...contagens, event_ids: eventos.map((e) => e.event_id) },
    }),
  );
  process.exitCode = codigoDeSaida(preparo.issues);
}
