# Documentação — índice, ordem de leitura e vigência

**Vigência verificada em 2026-11-19** (commit `0b59355`).

Regra: todo documento de `docs/` declara o próprio status no topo.

- **Vigente** — orienta o trabalho atual.
- **Histórico** — congelado na data indicada. Descreve o que já foi feito; **não** é ordem de serviço.
- **Stub** — documento ausente, registrado por rastreabilidade.

## Comece por aqui

| Você vai                             | Leia nesta ordem                                                                                                                                                                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entender o produto                   | [`../README.md`](../README.md) → [`ONTOLOGIA-E-FLUXO.md`](ONTOLOGIA-E-FLUXO.md) → [`ROADMAP.md`](ROADMAP.md)                                                                                                                              |
| Trabalhar numa frente                | [`../AGENTS.md`](../AGENTS.md) → [`ROADMAP.md`](ROADMAP.md) → [`PLANO-UNIFICADO-2026-11-16.md`](PLANO-UNIFICADO-2026-11-16.md) (tarefa U correspondente) → [`plans/`](plans/) se houver detalhamento → README da pasta                    |
| Agente/IA sem contexto               | [`../AGENTS.md`](../AGENTS.md) → este arquivo → [`ONTOLOGIA-E-FLUXO.md`](ONTOLOGIA-E-FLUXO.md) → [`ROADMAP.md`](ROADMAP.md) → [`../README.md`](../README.md)                                                                              |
| Mexer em dados, instâncias ou coleta | [`ONTOLOGIA-E-FLUXO.md`](ONTOLOGIA-E-FLUXO.md) §4–§6 → [`PLANO-UNIFICADO-2026-11-16.md`](PLANO-UNIFICADO-2026-11-16.md) §4 → [`adr/0009`](adr/0009-ecossistema-institucional.md) → [`../supabase/`](../supabase/) e `workers/*/README.md` |
| Preparar a máquina                   | [`setup-maquina.md`](setup-maquina.md)                                                                                                                                                                                                    |

Não leia [`PLANO-FASE-0-REVISADO.md`](PLANO-FASE-0-REVISADO.md) nem [`PLANO-APP-MOBILE.md`](PLANO-APP-MOBILE.md) para decidir o que fazer agora: os dois são históricos.

## Vigente

| Documento                                                                     | Papel                                                         | Verificado |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------- |
| [`../README.md`](../README.md)                                                | mapa do produto, frentes F1–F7, estado medido                 | 19/11/2026 |
| [`../AGENTS.md`](../AGENTS.md)                                                | convenções operacionais, comandos, segurança                  | 19/11/2026 |
| [`../CLAUDE.md`](../CLAUDE.md)                                                | específico do Claude Code; importa `AGENTS.md`                | 19/11/2026 |
| [`ONTOLOGIA-E-FLUXO.md`](ONTOLOGIA-E-FLUXO.md)                                | **glossário único** do domínio e fluxo de 7 etapas            | 19/11/2026 |
| [`ROADMAP.md`](ROADMAP.md)                                                    | Fase 0 por frente, marcos M1–M5 e ordem dos crawlers          | 19/11/2026 |
| [`PLANO-UNIFICADO-2026-11-16.md`](PLANO-UNIFICADO-2026-11-16.md)              | contratos, tarefas U0–U8 e gates                              | 19/11/2026 |
| [Plano dos crawlers](plans/2026-11-19-gitnexus-plan-crawler-quatro-fontes.md) | pesquisa e detalhamento de U2; implementação não iniciada     | 19/11/2026 |
| [`setup-maquina.md`](setup-maquina.md)                                        | versões exigidas da máquina de desenvolvimento                | 11/11/2026 |
| [`adr/`](adr/)                                                                | decisões; cada ADR declara o próprio status e o que o superou | 19/11/2026 |
| `../apps/*/README.md`, `../workers/*/README.md`, `../packages/*/README.md`    | como rodar e testar cada pacote                               | 19/11/2026 |

## Histórico — congelado, não orienta trabalho novo

| Documento                                                          | Encerrado em | Substituído por                                                                               |
| ------------------------------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------- |
| [`PLANO-FASE-0-REVISADO.md`](PLANO-FASE-0-REVISADO.md)             | 12/11/2026   | [`ROADMAP.md`](ROADMAP.md) + [`PLANO-UNIFICADO-2026-11-16.md`](PLANO-UNIFICADO-2026-11-16.md) |
| [`PLANO-APP-MOBILE.md`](PLANO-APP-MOBILE.md)                       | 17/11/2026   | [`PLANO-UNIFICADO-2026-11-16.md`](PLANO-UNIFICADO-2026-11-16.md) §U8                          |
| [Relatório do painel](relatorios/painel-funcional.md)              | 19/11/2026   | evidência da validação da curadoria em lote                                                   |
| [`relatorios/`](relatorios/)                                       | —            | evidência datada do que foi medido; não é instrução                                           |
| [`evidencias/`](evidencias/)                                       | —            | prova visual de tela                                                                          |
| [`checklists/fase-0-contencao.md`](checklists/fase-0-contencao.md) | —            | documento pronto; a execução dos 7 itens é humana e não ocorreu                               |
| [`a11y/f0-ui-native.md`](a11y/f0-ui-native.md)                     | —            | checklist não executado (TalkBack, VoiceOver, `font_scale`)                                   |

## Stub

| Documento                                | Situação                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| [`PLANO-EXECUCAO.md`](PLANO-EXECUCAO.md) | a v1.0 nunca foi fornecida a este repositório; o texto original não existe aqui |

## Lacunas conhecidas

- **ADR-0002 (lista) e ADR-0003 (mapa) não existem.** A numeração tem buraco porque F0-10 e F0-11 nunca mediram. As citações a esses ADRs em `AGENTS.md`, `PLANO-APP-MOBILE.md` e `packages/ui-native/src/Collection.tsx` apontam para documento inexistente; até haver medição, a escolha de lista e de mapa é provisória.
- **F0-10 e F0-11 seguem abertos** — ver [`relatorios/portao-0.md`](relatorios/portao-0.md).
- Pendências técnicas abertas da Fase 0 (corrida TOCTOU, unicidade de vínculo, TLS do ingress, i18n no painel) estão listadas no [README raiz](../README.md#estado-por-frente).
