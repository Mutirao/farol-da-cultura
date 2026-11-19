# Instância de teste local

Stub HTTP de uma instância de Mapas Culturais para a Fase 0 (S0.5). Usa só
`node:http`, escuta apenas em `127.0.0.1` e serve o subconjunto da API que a
sincronização da agenda (`workers/coleta`) e a confirmação de incorporação
usam. Prova acesso à API; **não** prova incorporação numa instância real.

Os dados de `fixtures/ocorrencias.json` são fictícios: 2 eventos (9001, 9002),
3 ocorrências (8001, 8002, 8003) em janeiro de 2030 e 1 espaço (7001).

## Rodar

```bash
node scripts/instancia-teste/servidor.ts             # porta 8787, com as fixtures
node scripts/instancia-teste/servidor.ts --porta 0   # porta livre
```

A primeira linha da saída é JSON: `{"url":"http://127.0.0.1:8787","linhas":3}`.
Encerra com Ctrl+C (SIGINT) ou SIGTERM. O Node avisa que o `package.json` da
raiz não declara `"type": "module"`; o aviso não afeta o servidor.

Para a sincronização ler desta instância:

```bash
export MAPA_CULTURAL_BASE=http://127.0.0.1:8787
```

`workers/coleta` só aceita `MAPA_CULTURAL_BASE` com host `127.0.0.1` ou
`localhost` (http ou https, sem credencial, caminho, query ou fragmento);
qualquer outro valor lança antes de abrir rede. Sem a variável, a base é a
instância do Ceará. A proveniência (`FONTE = mapa-cultural-ce`) não muda.
Não rode `@farol/coleta importar` contra o banco de demonstração.

## API programática (e2e)

```ts
import {
  carregarFixtures,
  criarInstanciaTeste,
} from "./scripts/instancia-teste/servidor.ts";

const instancia = await criarInstanciaTeste({ porta: 0 }); // vazia
// ou: criarInstanciaTeste({ linhas: await carregarFixtures() })
instancia.url; // "http://127.0.0.1:<porta>"
instancia.adicionar(linha); // mesma occurrence_id + starts_on substitui
instancia.remover(9001); // remove as linhas do evento; devolve quantas
instancia.linhas(); // cópia do estado atual
await instancia.fechar();
```

- `porta`: padrão `0` (efêmera). `linhas`: padrão `[]`.
- `LinhaOcorrencia` é o formato de linha de `findOccurrences` abaixo.

## Endpoints

Só `GET`; outro método responde 405, rota desconhecida 404. Respostas em JSON.

### `GET /api/event/findOccurrences`

Parâmetros opcionais `@from` e `@to` (`YYYY-MM-DD`, inclusive, comparados com
`starts_on`); formato inválido responde 400. Os demais parâmetros (`@select`,
`@files`, `space:@select`) são ignorados: a resposta traz a linha inteira,
ordenada por `starts_on` + `starts_at`. Formato de cada linha (o que o schema
`Linha` de `workers/coleta/src/mapaCultural.ts` valida, mais campos extras):

```json
{
  "id": 9001,
  "event_id": 9001,
  "occurrence_id": 8001,
  "name": "Roda de Choro de Teste",
  "starts_on": "2030-01-10",
  "starts_at": "16:00:00",
  "shortDescription": "…",
  "longDescription": null,
  "classificacaoEtaria": "Livre",
  "terms": { "linguagem": ["Música"] },
  "rule": {
    "duration": 90,
    "price": "Gratuito",
    "startsOn": "2030-01-10",
    "startsAt": "16:00",
    "spaceId": "7001"
  },
  "space": {
    "id": 7001,
    "name": "Centro Cultural de Teste",
    "endereco": "…",
    "En_Municipio": "Fortaleza",
    "acessibilidade_fisica": "Rampa de acesso;Banheiro adaptado",
    "location": { "latitude": "-3.7300", "longitude": "-38.5200" }
  }
}
```

`starts_on`/`starts_at` são hora local de Fortaleza, como na fonte.

### `GET /api/event/find?id=EQ(<n>)&@select=<campos>`

Leitura por ID para a confirmação. Segue o formato observado na instância do
Ceará em 17/11/2026: **lista** com um objeto, ou `[]` se o ID não existe.
`id` em outro formato que não `EQ(<número>)` responde 400.

Campos aceitos em `@select` (padrão `id,name`; campo desconhecido é omitido):

- `id`, `name`, `shortDescription`, `longDescription`, `classificacaoEtaria`, `terms`;
- `occurrences` → lista de IDs de ocorrência, ex.: `[8002, 8003]`;
- `occurrences.{id,rule}` → lista de objetos; `rule` traz `startsOn`
  (`YYYY-MM-DD`), `startsAt` (`HH:MM`, hora local), `spaceId` (texto),
  `duration`, `price` e o resto da regra da linha.

```bash
curl -g 'http://127.0.0.1:8787/api/event/find?id=EQ(9002)&@select=id,name,occurrences.{id,rule}'
# [{"id":9002,"name":"Mostra de Teatro de Teste","occurrences":[{"id":8002,"rule":{…,"startsOn":"2030-01-12","startsAt":"19:30"}},{"id":8003,…}]}]
```

O início de uma ocorrência é `rule.startsOn` + `rule.startsAt` em
America/Fortaleza. Use `curl -g` (ou codifique `{}`) por causa das chaves.

## Testes

```bash
pnpm exec vitest run scripts/instancia-teste      # servidor, API e CLI (na raiz)
pnpm --filter @farol/coleta test                  # inclui buscarLinhas contra esta instância
```
