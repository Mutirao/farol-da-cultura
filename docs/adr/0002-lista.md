# ADR-0002: Lista de cartões — `@expo/ui` `List.ForEach` + `RNHostView` × FlashList

- **Status:** Proposto
- **Data:** 2026-11-12
- **Decisores:** _______________________ (aprovação humana pendente; este ADR não se aprova sozinho)
- **Requisitos:** DES-02, DES-04 (tarefa F0-10, item 0.7a do plano; lacuna G1; divergência V12)

## Contexto

O plano revisado (F0-10) pede para decidir a lista de cartões do app por medição, não por
opinião: no Expo SDK 58, o `List.ForEach` universal de `@expo/ui` virtualiza e recicla
linhas, e cartões React Native entram via `RNHostView`, mas o desempenho disso com cartões
RN não está documentado (G1). A alternativa é FlashList.

O spike vive no branch `spike/lista`, que **não é mergeado**; só este ADR e
`scripts/perf/measure-scroll.sh` saem dele.

### O que foi medido

| Item          | Valor                                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dados         | 500 cartões falsos de `apps/app/src/spike/fakeCards.ts`, PRNG `mulberry32` com semente fixa `0x0f0010`; título, data, categoria e miniatura (`index % 20`)                                                                     |
| Miniaturas    | 20 PNGs locais em `assets/spike-lista/`, no máximo 480 px                                                                                                                                                                      |
| Cartão        | `apps/app/src/spike/SpikeCard.tsx`, altura fixa 96 dp, `expo-image` com `recyclingKey={card.id}` (chave estável, não índice), `transition={0}`                                                                                 |
| Variante A    | `@expo/ui` 58.0.28: `Host` > `List` > `List.ForEach` (`keyExtractor`, `estimatedItemSize=96`) > `RNHostView matchContents={{ vertical: true }}` > cartão; rota `(dev)/spike-lista-a.tsx`                                       |
| Variante B    | `@shopify/flash-list` 2.3.2 (resolvida por `npx expo install`, igual à do plano), `keyExtractor` estável; rota `(dev)/spike-lista-b.tsx`                                                                                       |
| Build         | perfil EAS `preview` (release, `br.com.farol.cultura.preview`), id do build: _pendente_                                                                                                                                        |
| Aparelho      | _pendente_                                                                                                                                                                                                                     |
| Android       | _pendente_                                                                                                                                                                                                                     |
| Protocolo     | `scripts/perf/measure-scroll.sh <package> <a\|b> 3`: 60 Hz fixos, abertura a frio por deep link, espera 5 s, `dumpsys gfxinfo reset`, 30 swipes (20 para baixo + 10 para cima, x=540, y 1900↔500, 200 ms, pausa 0,4 s), coleta |
| Saídas brutas | `docs/adr/assets/0002/<a\|b>-rodada<N>.txt` (`framestats` + `gfxinfo`) e `docs/adr/assets/0002/resumo.csv`                                                                                                                     |

### Regra de decisão (escrita antes de medir)

Texto do plano: escolher A só se p95 ≤ 16 ms **e** janky ≤ 5% **e** não ficar mais de 1
ponto percentual pior que B; senão, B.

Como os números são agregados (fixado antes da primeira medição, neste commit):

- **p95** de uma variante = mediana do `95th percentile` das 3 rodadas.
- **janky** de uma variante = soma de `Janky frames` ÷ soma de `Total frames rendered` das
  3 rodadas, em %.
- "1 ponto percentual pior que B" compara o janky: A passa se `janky(A) ≤ janky(B) + 1,0`.
- Todos os valores saem da seção `dumpsys gfxinfo <package>` de cada arquivo bruto (a
  primeira ocorrência, que é o agregado do processo). Se a diferença ficar dentro de
  ±1 ponto, a incerteza é registrada aqui.

## Resultados

_Pendente: a medição ainda não rodou. Nenhum número abaixo pode ser preenchido sem as saídas
brutas em `docs/adr/assets/0002/`._

| Variante | Rodada | Total de quadros | Janky | Janky % | p50 (ms) | p90 (ms) | p95 (ms) | p99 (ms) |
| -------- | ------ | ---------------- | ----- | ------- | -------- | -------- | -------- | -------- |
| A        | 1–3    | pendente         |       |         |          |          |          |          |
| B        | 1–3    | pendente         |       |         |          |          |          |          |

## Decisão

_Pendente da medição e da aprovação humana._

## Consequências

- A variante escolhida vira a lista de cartões da agenda na Fase 2; a outra só volta com
  nova medição sob o mesmo protocolo.
- O protocolo vale para um único aparelho intermediário. Um aparelho de entrada pode mudar o
  resultado, e isso deve ser revisto antes do lançamento.

## Alternativas consideradas

- `FlatList` do React Native: fora do escopo do plano (V12 compara só `@expo/ui` e FlashList).
- Decidir sem medir, pela preferência de "máximo nativo no Expo": rejeitada, porque o plano
  exige que a decisão saia de medição (T12).
