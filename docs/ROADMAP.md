# Farol da Cultura — roadmap

**Atualizado:** 2026-11-19. **Referências:** [plano unificado](PLANO-UNIFICADO-2026-11-16.md)
(contratos e tarefas U0–U8), [ontologia e fluxo](ONTOLOGIA-E-FLUXO.md),
[ADR-0009](adr/0009-ecossistema-institucional.md).

Este documento mostra a ordem de entrega. Ele não substitui os contratos e
gates do plano unificado: cada item aponta para a tarefa U de que é parte.

## 1. Fase 0 por frente (esqueleto ponta a ponta)

Objetivo: um comando local mostra um evento atravessando toda a corrente
(scraper → painel → envio → instância → sincronização → app Android e web) e
mostra também que um evento aprovado, mas não incorporado, fica fora da agenda.
Cada frente entrega só a fatia mais fina que se liga à seguinte.

A instância usada na Fase 0 é uma **instância de teste local** (stub HTTP com
fixtures, só em `127.0.0.1`). Ela prova o protocolo de confirmação, não uma
incorporação real em Mapas Culturais.

| Tarefa | Frente            | Entrega                                                                                                                      | Depende de             | Parte de         |
| ------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------- |
| S0.1   | Docs              | README como mapa das frentes, este roadmap, seção no plano unificado                                                         | —                      | —                |
| S0.2   | F1 Dados          | tabela privada de vínculo coletado ↔ institucional e RPCs `registrar_incorporacao`/`confirmar_incorporacao`, com RLS e pgTAP | —                      | U1.5, U3.2, U3.3 |
| S0.3   | F2 Coleta         | `workers/sympla` com parser e normalização de uma fixture, gravação restrita idempotente                                     | S0.2                   | U2.1–U2.4        |
| S0.4   | F3/F4 Painel      | login local, lista de coletados, aprovar, exportar, registrar incorporação, estado da confirmação                            | S0.2, S0.3             | U5.1–U5.4        |
| S0.5   | F5 Sincronização  | instância de teste local; `workers/coleta` aceita base só local                                                              | —                      | U1.5, U3.3       |
| S0.6   | F4/F5 Confirmação | após a sincronização, conferir na API da instância o ID e o conteúdo e confirmar o vínculo                                   | S0.2, S0.5             | U3.3             |
| S0.7   | F6 App            | alvo web habilitado: agenda, busca, detalhe, favoritos no navegador                                                          | —                      | U8.1–U8.2        |
| S0.8   | F7 Hospedagem     | imagem estática única para painel e app web, manifests Skaffold que renderizam, sem deploy                                   | S0.4, S0.7             | U8.4             |
| S0.9   | Todas             | `pnpm e2e:esqueleto` local e no CI, com o caso negativo como asserção                                                        | S0.3, S0.4, S0.6, S0.7 | U3.5, U5.5       |
| S0.10  | Gate              | verificação independente e atualização do status no README                                                                   | todas                  | U7.3 (prévia)    |

```text
Raízes em paralelo: S0.1, S0.2, S0.5, S0.7
S0.2 ──► S0.3 ──► S0.4
S0.2 + S0.5 ──► S0.6
S0.4 + S0.7 ──► S0.8
S0.3 + S0.4 + S0.6 + S0.7 ──► S0.9
todas ──► S0.10
```

Limites da Fase 0: nenhum deploy, segredo, coleta viva, escrita em instância
real ou publicação em loja. Coleta externa em rede, CSV compatível de 29 colunas
e contratos completos de múltiplas instâncias ficam para o roadmap mínimo.

## 2. Roadmap mínimo depois da Fase 0

| Marco                           | Resultado                                                                                                     | Tarefas U         | Gates humanos                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------- |
| M1 Dados reais do piloto        | agenda do Ceará sincronizada no Supabase hospedado; app Android interno                                       | U0.2, U1          | projeto/capacidade (D3), permissão da Secult, ativar `coleta.yml` |
| M2 Coleta externa               | Sympla, depois Outgo e um segundo recorte homologado; replay, concorrência e agendamento desligado por padrão | U2                | permissão, cobertura e ativação por fonte                         |
| M3 Curadoria completa           | decisão auditada, preparação de envio, CSV compatível com o legado, painel operacional                        | U3.1–U3.2, U4, U5 | exceção CSV/Edge, canal de alerta                                 |
| M4 Primeira instância real      | contrato e permissão de uma instância, confirmação contra a API real, instâncias com base compartilhada       | U1.5, U3.3–U3.5   | permissão institucional, política de revalidação                  |
| M5 Três plataformas publicáveis | Android, iOS e web com paridade testada; hospedagem no modelo do painel; corte e aposentadoria do legado      | U6, U7, U8.3–U8.4 | lojas, Apple, hospedagem, janela de corte                         |

### Expansão da coleta externa (U2)

| Ordem | Fonte              | Próxima prova                                                                                                                                            |
| ----- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Sympla             | Aproveitar o parser de detalhe existente e provar descoberta, fim de paginação e cobertura por HTTP no recorte; navegador só se necessário e autorizado. |
| 2     | Outgo              | Confirmar recorte municipal, paginação e ID estável; testar a leitura do HTML renderizado no servidor se não houver feed autorizado.                     |
| 3     | Ingresse           | Buscar contrato de catálogo autorizado; avaliar navegador apenas se o catálogo público for permitido e depender de renderização.                         |
| 4     | Bilheteria Digital | Provar busca, recorte e ID estável no detalhe; a vitrine HTML, sozinha, não é cobertura.                                                                 |

M2 tem como mínimo Sympla, Outgo e dois recortes testados. Ingresse e
Bilheteria Digital ampliam U2 depois desse mínimo.
O [plano dos crawlers](plans/2026-11-19-gitnexus-plan-crawler-quatro-fontes.md)
registra evidências, tarefas e critérios de aceite. Uma fonte só avança para
operação após aceite técnico, permissão, cobertura comprovada e aprovação
humana; o aceite da documentação não habilita coleta.

## 3. Melhorias registradas

| Melhoria                                                                                                                      | Onde                                         | Observação                                              |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| Regra "todo PR = uma tarefa, com branch próprio" diverge do fluxo real (commit direto na `main`)                              | `AGENTS.md`                                  | exige autorização para editar instruções de agente      |
| 9 avisos do Biome: non-null assertions no app e nos testes; `FAROL_DATABASE_URL` fora do `turbo.json`; supressão sem efeito   | `apps/app`, `scripts/provisionar-curador.ts` | sem impacto no CI hoje                                  |
| Script `lint` do app chama `expo lint`, que instala ESLint e suja o workspace                                                 | `apps/app/package.json`                      | Biome é o único linter                                  |
| Chunk do painel acima de 500 kB                                                                                               | `apps/painel`                                | medir antes de dividir; não esconder alterando o limite |
| Pendências da fundação: F0-10 (lista, branch `spike/lista`), F0-11 (mapa), checklist de acessibilidade, build iOS nunca feito | `docs/PLANO-APP-MOBILE.md`                   | seguem como gates de M5                                 |
| ADR-0007 sem decisor assinado                                                                                                 | `docs/adr/0007-importacao-da-agenda.md`      | decisão humana                                          |
| Supabase Free pausa após ~7 dias sem uso                                                                                      | projeto `farol-dev`                          | relevante para M1                                       |
