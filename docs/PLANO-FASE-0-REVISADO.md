---
schema_version: hermes_plan/v1
status: accepted
source: generic
review_gate:
  architect: not_observed
  critic: not_observed
accepted_at: 2026-11-12T02:18:13Z
status_note: "Fase 0 Farol aceita: repo Mutirao/farol-da-cultura publico; Supabase gerenciado sa-east-1 dev+hml; acessos H2-H5 informados; ADR-0006 painel na F0-03"
---

# Hermes Plan: # Farol da Cultura — Fase 0: plano revisado

<!-- FAROL-F0-PLAN:BEGIN -->

**Status:** aceito pela pessoa em 11/11/2026 (execução ainda não autorizada) · **Data:** 11/11/2026 · **Base:** `docs/PLANO-EXECUCAO.md` v1.0
**Escopo:** a Fase 0 inteira (0.1 a 0.9) até o PORTÃO 0. A execução começa por 0.1 e 0.2, como pede o §15.
**Ainda não foi feito:** execução, CI, revisão de código e aceite de tarefa. Nenhum arquivo do projeto foi criado.

---

## 1. Resumo

- A Fase 0 cabe no plano original, mas 27 pontos dele divergem da documentação atual (seção 3). Os que mudam comandos ou configuração:
  - O marketplace `claude-plugins-official` precisa de `marketplace add` antes de instalar pela linha de comando.
  - Regras `Write(...)` nas permissões nunca casam.
  - `--filter=...[HEAD]` deixa de fora o que o agente já comitou.
  - O Expo SDK 58 fixa o TypeScript em 6.0.3, não no 7.0 que o npm traz como mais recente.
  - `NativeTabs` agora é estável e se importa de `expo-router/native-tabs`.
  - O Supabase CLI 3 trocou as flags (`--remote`, `--yes`).
  - O plugin `supabase` traz um MCP sem escopo de projeto e com permissão de escrita.
- **Achado de segurança novo para a 0.9:**
  - O keystore Android `agendaCultural.jks` está versionado no `farol-cultural` desde o commit inicial.
  - Ele também é **público** em `Instituto-Dragao-do-Mar/agenda_cultural` e no fork `Mutirao/farol_agenda_cultural`.
  - `android/key.properties` está versionado no repositório privado.
  - Nenhum desses arquivos foi aberto nem copiado.
- **O caminho crítico da fase não é código, são acessos:** conta Apple paga, Android intermediário, conta Expo, chave Google Maps e a decisão sobre Supabase hospedado. Sem eles, a 0.5 (iOS), a 0.6 (VoiceOver/TalkBack) e a 0.7 (medições) ficam bloqueadas.

## 2. Fatos observados (11/11/2026)

**Pastas e repositórios**
- `/mnt/data/code/farol` **não é um repositório git**. Contém os clones `farol-cultural` (Flutter, `farolcultura-dev/farol-cultural`, último commit 7a26d28 em 08/09/2026) e `importador-idm` (.NET), mais `.nvmrc` = `26.10.0`. Como o plano pede um repositório novo e vazio, ele precisa de uma pasta nova (pergunta Q1).
- O Raspagem-Farol está em `/mnt/data/code/mutirao/raspagem-farol` (`Mutirao/Raspagem-Farol`, HEAD 941a758). Todos os caminhos citados no §10 existem. Ele só entra na Fase 1.

**Segredos versionados (`git ls-files`)**
- `farol-cultural`: `android/key.properties` e `android/app/agendaCultural.jks`.
- `importador-idm`: `appsettings.json`, `appsettings.Development.json`, `appsettings.Production.json`, além de cópias em `bin/`.
- O `AndroidManifest` do app antigo contém uma chave Google Maps.
- Repositórios públicos com `agendaCultural.jks`: `Instituto-Dragao-do-Mar/agenda_cultural` e `Mutirao/farol_agenda_cultural` (fork). Lá não há `key.properties`.

**Identidade visual**
- Cores do app antigo em `farol-cultural/lib`: `#008EA3` 26×, `#EA5B0C` 6×, `#999999` 14×. Batem com o §3.1.
- Os contrastes da tabela 3.1 foram recalculados pela fórmula de luminância da WCAG: os 8 valores batem com duas casas decimais.
- `imagens/farol/` tem 24 PNG e nenhum SVG. A conversão para SVG não é tarefa da Fase 0.

**Máquina (Linux)**
- Instalado: Node 26.10.0, pnpm 10.34.5, corepack 0.34.2, Docker 29.9.3 (**daemon parado**), Deno 2.9.8, psql 18.6, `claude` 2.1.322, `gh` (logado como `lpirola`, escopos `admin:org`, `repo` e `workflow`), `jq` e `bwrap`.
- `eas-cli` 16.28.0 está instalado, mas não logado.
- Faltam: Supabase CLI, Android SDK e emulador, macOS, `gitleaks` e `typescript-language-server`.
- `adb` funciona, mas não há aparelho conectado.

**Claude Code**
- Marketplaces configurados: o embutido `anthropic-plugin-directory`, `anthropic-agent-skills` e `comite-popular-tech`.
- `claude-plugins-official` não está registrado, e nenhum plugin do plano está instalado.

**Versões mais recentes no npm**
| Grupo | Versões |
| --- | --- |
| Expo | expo 58.0.24, react-native 0.88.1, expo-router 58.0.31, @expo/ui 58.0.28, expo-maps 58.0.11, @shopify/flash-list 2.3.3 (o Expo fixa 2.3.2) |
| Ferramentas | eas-cli 27.7.2, typescript 7.0.2 (o Expo fixa ~6.0.3), pnpm 12.18.0, turbo 2.11.11, @biomejs/biome 2.6.7, skills 1.8.1 |
| Supabase | supabase CLI 3.1.0, supabase-js 2.119.0 |
| Painel | @refinedev/core 5.0.12 (publicado em 02/04/2026), @refinedev/supabase 6.0.2, shadcn 4.23.0, tailwindcss 4.3.5 |

## 3. Divergências entre o plano e a documentação atual

Regra 0.7 do plano: quando a documentação diverge, segue-se a documentação e a divergência é registrada. Esta tabela vira o ADR-0001 (tarefa F0-03).

| # | Seção | O plano diz | A documentação atual diz (fonte) | O que este plano faz |
| --- | --- | --- | --- | --- |
| V01 | 5.1 | `claude plugin install X@claude-plugins-official` | O id continua válido. Comandos de shell não registram esse marketplace (só sessões interativas registram), e o escopo padrão é o do usuário (code.claude.com/docs/en/discover-plugins, /plugins/troubleshooting) | `claude plugin marketplace add anthropics/claude-plugins-official` antes, instalação com `--scope project`, `enabledPlugins` e `extraKnownMarketplaces` comitados, e um script de bootstrap para cada pessoa da equipe |
| V02 | 5.1 | `security-guidance` | Existe (v2.0.17). Adiciona o próprio hook Stop, com revisão por LLM que consome cota, e grava em `~/.claude/security/` (code.claude.com/docs/en/security-guidance) | Manter. Regras do projeto em `.claude/claude-security-guidance.md`. Medir a latência combinada com o nosso Stop |
| V03 | 5.1 | `npx skills add ...` | Sem `-a claude-code -y` o comando é interativo e instala em todos os agentes detectados. Fixação por `@tag`/`@sha` e `skills-lock.json` (github.com/vercel-labs/skills, docs/commands.md) | CLI `skills@1.8.1` fixado, fonte fixada por SHA ou tag depois da leitura, `skills-lock.json` comitado e `skills check` no CI |
| V04 | 5.1 | Supabase: skills via `npx skills` + MCP só de dev em modo leitura | O plugin `supabase` traz um MCP sem `project_ref` e sem `read_only` (github.com/supabase-community/supabase-plugin) | Não instalar o plugin. Skills vêm de `supabase/agent-skills@v0.1.9`. MCP configurado à mão no `.mcp.json` com `project_ref` + `read_only=true` |
| V05 | 5.1 | `pnpm dlx skills add shadcn/ui` dentro de `apps/painel` | O comando existe, mas também oferece `migrate-radix-to-base`, e `apps/painel` só nasce na Fase 3 (ui.shadcn.com/docs/skills) | Instalar com `-s shadcn` na raiz agora (o painel é parte do monorepo) |
| V06 | 5.4 | Hook PostToolUse em "Edit/Write de *.ts(x)" | O matcher é uma lista de nomes (`Edit\|MultiEdit\|Write`). O caminho do arquivo chega pelo stdin (`.tool_input.file_path`). Saída com código 0 e stderr não aparece para o Claude; para avisar, sair com 2 ou mandar `additionalContext` (code.claude.com/docs/en/hooks) | Os scripts em `.claude/hooks/` leem o stdin, usam código 2 para erro e `additionalContext` para aviso, e têm testes |
| V07 | 5.4 | Stop: `pnpm turbo typecheck --filter=...[HEAD]` | `...[HEAD]` só vê o que não foi comitado. `--affected` compara com `main...HEAD` e inclui o que não foi comitado (turborepo.com/docs/reference/run; teste local com turbo 2.11.11) | `pnpm turbo run typecheck --affected --output-logs=errors-only`, com proteção `stop_hook_active` contra loop |
| V08 | 5.4 | Negar "leitura e escrita" e `supabase db push --linked` "fora do CI" | Regras `Write(path)` são aceitas mas nunca casam; o certo é `Read` + `Edit`. Regras de Bash não pegam `npx`/`pnpm exec`/`sh -c` nem flags reordenadas. Não existe regra condicionada ao CI (code.claude.com/docs/en/permissions). No CLI v3, `--linked` está obsoleto e foi trocado por `--remote` (supabase/cli v3.0.0) | Pares `Read`+`Edit`. Negar `supabase db push *` em geral, incluindo variações com `npx`/`pnpm exec`/`pnpm dlx`. Hook PreToolUse de guarda para Bash e sandbox com `denyRead` dos segredos. "Fora do CI" vale porque o CI não roda o Claude Code |
| V09 | 4, 0.5 | "template do SDK mais recente" | Durante a transição, `create-expo-app@latest` sem `--template` ainda cria um projeto SDK 57. O template gera `AGENTS.md` e `.claude/settings.json` próprios (docs.expo.dev/more/create-expo; `--help` local) | `npx create-expo-app@latest apps/app --template default@sdk-58 --no-agents-md --no-install`. Dependências do Expo instaladas com `npx expo install` (React fica em 19.3.0) |
| V10 | 4 | `NativeTabs` estável | É estável, com import `expo-router/native-tabs`. A skill oficial `expo-router` ainda mostra `unstable-native-tabs`. A issue expo/expo#52613 diz que falta `expo-symbols` na checagem de tipos. Máximo de 5 abas. No Android a barra é Material Components (docs.expo.dev/router/advanced/native-tabs) | Usar o import estável, instalar `expo-symbols` explicitamente e registrar na skill `farol-native-ui` que ela prevalece sobre a skill oficial |
| V11 | 6 | Um wrapper por controle com `.ios.tsx` e `.android.tsx`; "se houver componentes universais, wrapper fino" | O SDK 58 tem uma camada universal (`@expo/ui`): Button, Switch, List, BottomSheet, Picker e outros, com um único import (docs.expo.dev/versions/latest/sdk/ui/universal) | Os 4 controles da 0.6 viram wrappers finos sobre a camada universal. Divisão por plataforma só quando faltar uma prop |
| V12 | 4, 11 | Lista reciclável do Expo UI "se cobrir cartões personalizados" | No SDK 58, `List.ForEach` virtualiza e recicla. Cartões RN entram via `RNHostView`, mas o desempenho disso não está documentado. A skill oficial `expo-ui` diz que a List "não é virtualizada", o que está desatualizado (changelog do SDK 58) | O spike F0-10 mede exatamente isso. FlashList entra via `npx expo install` (2.3.2) |
| V13 | 4, 11 | `expo-maps` × `react-native-maps` | `expo-maps` não roda no Expo Go, então exige dev build, e no Android precisa de chave Google Maps. Nenhuma das duas bibliotecas tem clustering nativo (docs.expo.dev/versions/latest/sdk/maps) | O spike F0-11 testa as duas, com e sem `supercluster`. Pede a chave (H5) |
| V14 | 4, 10 | TypeScript (sem versão; o npm mais recente é 7.0.2) | O SDK 58 fixa `typescript ~6.0.3`, e o `expo install --check` cobra isso. O TS 7.0 não tem API de compilador e remove `baseUrl` e `node10` (api.expo.dev/v2/versions; devblogs TS 7.0) | `~6.0.3` via catalog do pnpm. O tsconfig já sai compatível com o TS 7 (sem `baseUrl`, resolução `bundler`/`nodenext`, `types` explícito) |
| V15 | 4 | Coleta em "Node 22" | O Node 22 está em manutenção, com fim de vida em 30/04/2027. O Node 26 é Active LTS desde 28/10/2026. As imagens oficiais do Playwright 1.65 vêm só com Node 26 (github.com/nodejs/Release; Dockerfile do Playwright v1.65.0) | Node 26 em tudo (o `.nvmrc` já está em 26.10.0). A imagem do worker é `mcr.microsoft.com/playwright:v1.65.0-noble` (vale para a Fase 1) |
| V16 | 2 (D10) | pnpm sem versão | O mais recente é o 12.18.0 (reescrito em Rust). Configuração em `pnpm-workspace.yaml` (`allowBuilds`, `catalog`); o `.npmrc` só guarda autenticação. O corepack 0.34.2 não roda o pnpm 12 (pnpm.io/blog/releases/11.0 e 12.0; teste local) | `packageManager: pnpm@12.18.0`. Atualizar o pnpm local (F0-01). Plano B: pnpm 11.28.9 |
| V17 | 4, 0.8 | Supabase CLI (sem versão); `gen types` | CLI 3.1.0 instalado como devDependency e rodado com `pnpm supabase`. O `--local` está obsoleto (o local já é o padrão). Ações remotas exigem `--remote --yes`. `[inbucket]` virou `[local_smtp]`. Exige Docker (supabase.com/docs/guides/local-development/cli/migrating-to-v3) | Fixar `supabase@3.1.0`. Iniciar o daemon do Docker (H7) |
| V18 | 8.4 | Schemas expostos pela API | Desde 30/10/2026, tabelas novas não recebem GRANT automático no cloud. O CLI local só se comporta igual com `[api] auto_expose_new_tables = false` (discussão supabase#45329) | Na 0.8: `auto_expose_new_tables = false`. Na Fase 1: GRANT explícito na mesma migração do RLS |
| V19 | 2 (D8), APP-09 | "levar dados a outro aparelho sem perder a sessão anônima" | A conversão mantém o mesmo `user_id` só no aparelho que converte. No segundo aparelho, entrar com o e-mail substitui o anônimo daquele aparelho, e os dados dele precisam ser mesclados à mão. O código por e-mail exige `{{ .Token }}` nos templates Magic Link e Change Email, e SMTP próprio (o embutido manda 2 e-mails por hora) (supabase.com/docs/guides/auth/auth-anonymous) | Registrar no ADR-0001 e propor a errata. É assunto das Fases 2 e 3 (RPC de mesclagem) |
| V20 | 2 (D6), 4 | Refine v5 com preset `vite-shadcn` | O preset existe, mas traz um provedor REST, sem Supabase, com Vite 6, shadcn CLI 2 e React 19.1.0. O Refine Core está em modo de manutenção: o último npm é de 02/04/2026, as versões 5.1 e 5.2 não foram publicadas porque o pipeline de release está quebrado, e o foco mudou para o produto de IA (jan/2026). `custom()` (RPC) não é implementado no provedor Supabase (refine.dev/blog/refine-core-introduction; github refinedev/refine) | Fora do código da Fase 0. Decisão humana (Q4) |
| V21 | 3.3 | `theme.css` "no formato do tema shadcn" | O formato atual usa `oklch` com `:root`/`.dark` e `@theme inline`. A documentação do Refine ainda mostra HSL (ui.shadcn.com/docs/theming) | O gerador emite `oklch` com os nomes de token do shadcn atual |
| V22 | 4, 13 | "EAS Observe" | Agora chama-se Expo Observe (GA em 20/08/2026). O plano Free dá 100 mil eventos por mês. Cobre só o app; não cobre o painel nem as Edge Functions do OPS-03 (docs.expo.dev/eas/observe) | Vira evidência para a decisão humana do §13 (ADR-0004 proposto) |
| V23 | 4, 2.8 | Maestro no EAS Workflows | O job `type: maestro` está em alpha e não existe no plano Free; a partir do Starter custa US$ 0,05 por job mais os minutos (expo.dev/pricing) | Registrar o custo. É da Fase 2 |
| V24 | 4 | Vitest em tudo | Para o app, o preset documentado pelo Expo é o `jest-expo`. Vitest com componentes RN não foi verificado | Vitest nos pacotes. O executor de testes do app é decidido antes da Fase 2 (ADR) |
| V25 | 5.1 | Context7 como MCP | O plugin oficial `context7@claude-plugins-official` é um MCP remoto com OAuth por usuário e não precisa de chave | Usar o plugin |
| V26 | 5.1 | `typescript-lsp` | O plugin precisa de `typescript-language-server` e `typescript` no PATH | Instalar na F0-01 |
| V27 | 5.4, 3.3 | Hook que "avisa" sobre cor hex | O Biome 2.6 aceita plugins GritQL; o teste local sinalizou hex em TSX/CSS e ignorou `packages/tokens` (biomejs.dev/linter/plugins; teste local com biome 2.6.7) | Regra no Biome, que é o juiz no CI. O hook devolve o diagnóstico ao agente |

## 4. Objetivo além do pedido e estado-alvo

**O que deve acontecer quando a Fase 0 existir:** as Fases 1 a 4 rodam com agentes quase sem supervisão, dentro de limites que dá para verificar, e as duas escolhas técnicas mais caras de desfazer (lista e mapa) são decididas por medição, não por opinião. O plano mira esse resultado, não só a lista 0.1–0.9. Por isso inclui como tarefas:
- o acesso que o executor precisa (aparelho, contas, chaves);
- o teste real dos hooks;
- o CI obrigatório no merge;
- o registro das divergências.

**O que a fase precisa fazer:** montar o monorepo, fixar versões, proteger segredos e produção, medir lista e mapa, decidir com ADR, conter o sistema antigo e registrar as divergências.

**Matéria-prima:**
- a documentação do SDK 58 (não as skills, que estão desatualizadas em dois pontos);
- o uso real de cores no app antigo (`grep` em `farol-cultural/lib`);
- a lista de arquivos versionados com segredo (`git ls-files`);
- a saída bruta do `dumpsys gfxinfo` no aparelho;
- a saída do pgTAP.

**Métodos de quem faz isso bem:**
- Desempenho Android: build de release, taxa de atualização fixa em 60 Hz, `gfxinfo`/`framestats`, 3 rodadas e regra de decisão escrita antes de medir.
- Acessibilidade: TalkBack, VoiceOver, `uiautomator dump` e a maior escala de fonte.
- Segurança: varredura de todo o histórico com `gitleaks`, rotacionar antes de apagar, checar forks públicos.
- Cadeia de suprimentos: fixar por SHA, `minimumReleaseAge` e `allowBuilds` do pnpm.

### 4.1 Quem usa o resultado

| Quem | Hoje | Estado-alvo sem atrito |
| --- | --- | --- |
| C1 Pessoas da equipe (2 devs + Pirola) | Não há repositório | Clonar, rodar `scripts/bootstrap.sh`, rodar `pnpm install`, rodar `pnpm turbo run lint typecheck test` e ver tudo verde. App aberto no aparelho via dev build. Supabase local com um comando |
| C2 Agentes Claude Code nas Fases 1 a 4 | Nada | `CLAUDE.md`/`AGENTS.md`, 6 skills do projeto, skills de comunidade fixadas, MCPs com escopo, hooks que respondem na hora, bloqueios de segredo e de produção |
| C3 CI (GitHub Actions) | Nada | Checks obrigatórios no merge: lint, typecheck, testes, segredos, pgTAP de fumaça, skills e app |
| C4 Código das Fases 1 a 3 | Nada | `@farol/tokens` (`native.ts` e `theme.css`) e `@farol/ui-native` com 4 controles |
| C5 Quem decide (Pirola, Secult) | Plano sem números | ADRs com números, checklist de contenção, relatório do PORTÃO 0 |
| C6 Público do app antigo | Segredos expostos e endpoints inseguros | Segredos trocados e endpoints desligados, com aviso, sem quebrar de surpresa o que segue no ar |

### 4.2 Diferenças entre hoje e o alvo

- **T01** Repositório com instalação reproduzível e versões fixadas (pnpm 12.18.0, Node 26, TS ~6.0.3). *Por quê:* sem isso, CI e agentes divergem das máquinas.
- **T02** CI obrigatório, verde num PR vazio e vermelho num controle negativo. *Por quê:* QUA-01; e um CI que nunca falha não prova nada.
- **T03** Nenhum segredo no repositório, com varredura no CI. *Por quê:* SEG-01; o sistema antigo vazou exatamente assim.
- **T04** AGPL-3.0. *Por quê:* D12 e QUA-02.
- **T05** Ferramentas do agente instaladas de forma que um colega reproduz (plugins, skills fixadas, MCPs com escopo). *Por quê:* §5.1; hoje o que vale numa máquina não vale na outra.
- **T06** Hooks e permissões do §5.4 funcionando e testados. *Por quê:* é o aceite da 0.2, e regras como `Write(...)` falham em silêncio.
- **T07** Divergências registradas (ADR-0001) e errata do PLANO proposta. *Por quê:* regra 0.7; o PLANO é a fonte da verdade e não pode ficar desatualizado.
- **T08** 6 skills do projeto, o `CLAUDE.md`/`AGENTS.md` da raiz e os 4 por pasta. *Por quê:* 0.3; contexto curto e correto para os agentes.
- **T09** `packages/tokens` com contraste testado, `native.ts` e `theme.css` gerados, e regra de cor hex no CI. *Por quê:* 0.4 e §3.3.
- **T10** App Expo SDK 58 rodando em Android e iOS, com 4 abas nativas e variantes por `APP_VARIANT`. *Por quê:* 0.5, OPS-02 e D11.
- **T11** `packages/ui-native` com 4 wrappers e uma tela de demonstração acessível. *Por quê:* 0.6, ACE-01 e ACE-02.
- **T12** ADR de lista e ADR de mapa com números. *Por quê:* 0.7 e DES-02.
- **T13** Supabase local funcionando, pgTAP de fumaça no CI e projetos hospedados conforme a Q2. *Por quê:* 0.8.
- **T14** Contenção do sistema antigo executada e assinada. *Por quê:* 0.9; agora com o keystore público.
- **T15** Evidência para as decisões humanas que o PLANO põe na Fase 0: observabilidade (§4 e §13) e app web (D13). *Por quê:* o PLANO manda escolher e avaliar na Fase 0.
- **T16** Acessos para trabalhar no nível do resultado: aparelho via `adb`, `eas` logado, Supabase. *Por quê:* sem isso, 0.5 a 0.7 não têm juiz externo.
- **T17** Relatório do PORTÃO 0, tarefa por tarefa. *Por quê:* §0.1 e §12.

## 5. Opções e trade-offs

| # | Decisão | Escolhida | Rejeitadas (motivo) |
| --- | --- | --- | --- |
| O1 | TypeScript | `~6.0.3` via catalog, com tsconfig compatível com o TS 7 | 7.0.2 agora: o `expo install --check` acusa, um mantenedor do Expo disse que quem usa fica "por conta própria", e não há API de compilador. Par 6+7 com alias: complexidade sem ganho, já que não há typescript-eslint. **Rever quando o Expo recomendar o 7.** |
| O2 | Versão do pnpm | 12.18.0 fixado em `packageManager` | pnpm 10 local: configuração antiga (`.npmrc`, `onlyBuiltDependencies`) e linha anterior. Plano B se o autolinking do Expo falhar: 11.28.9 |
| O3 | Linker do pnpm | `isolated` (padrão; o Expo suporta desde o SDK 54) | `hoisted` fica como plano B documentado |
| O4 | Instalação de plugins | `@claude-plugins-official` com `--scope project` e bootstrap | `@anthropic-plugin-directory`: os ids não batem com o `enabledPlugins` comitado e não se reproduzem numa máquina nova |
| O5 | Supabase para o agente | `agent-skills@v0.1.9` + `.mcp.json` à mão, só leitura | Plugin `supabase`: MCP sem escopo e com escrita, o que viola o §5.1. Os dois juntos: skills duplicadas |
| O6 | Cor hex e texto fixo | Plugins GritQL no Biome (juiz no CI) + hook que repassa o diagnóstico | Só `grep` no hook: não roda no CI e dá mais falso positivo |
| O7 | Typecheck no Stop | `--affected` + `stop_hook_active` | `--filter=...[HEAD]`: perde commits do agente |
| O8 | `ui-native` | Wrapper fino sobre o `@expo/ui` universal | `.ios`/`.android` por controle: duplica código que o SDK já unificou (o próprio PLANO prevê o wrapper fino) |
| O9 | Saída dos tokens | `dist/` gerado e comitado, com checagem de drift no CI | Gerar no build: Metro e Vite dependeriam de um pipeline antes de subir, e o drift check dá o mesmo controle |
| O10 | `AGENTS.md`/`CLAUDE.md` | `AGENTS.md` é a fonte; `CLAUDE.md` importa `@AGENTS.md` e adiciona só o que é específico do Claude | Dois arquivos espelhados à mão: eles divergem |
| O11 | Medição dos spikes | Build `preview` (release) + `gfxinfo` a 60 Hz fixos, 3 rodadas, regra de decisão escrita antes | Dev build ou só o Perf Monitor: o modo dev distorce os números |
| O12 | Identificadores do app | Variantes por `APP_VARIANT`: dev `br.com.farol.cultura.dev`, preview `…preview`, produção `br.com.farol.cultura` | Um id só: o dev build sobrescreveria o app da loja no aparelho |
| O13 | Segredos no CI | `gitleaks` em todo o histórico + push protection do GitHub se o repositório for público | Só revisão humana: não escala |
| O14 | Local e organização do repositório | Pergunta Q1 | — |
| O15 | Framework do painel (D6) | Pergunta Q4. Não muda nada na Fase 0, além de o `theme.css` ser neutro (formato shadcn) | — |

## 6. Pré-requisitos humanos (bloqueiam tarefas, não o plano)

| # | O que | Bloqueia |
| --- | --- | --- |
| H1 | Local e organização do repositório no GitHub (Q1) | F0-02 e tudo depois |
| H2 | Conta ou organização Expo e `eas login` | Builds da F0-07 em diante |
| H3 | Conta Apple Developer paga, no time dono de `br.com.farol.cultura`, e iPhone registrado com `eas device:create` | iOS na F0-07, VoiceOver na F0-08 |
| H4 | Android intermediário (Moto G ou Galaxy A) com depuração USB | F0-07 a F0-11 (medições) |
| H5 | Chave Google Maps Android restrita por pacote + SHA-1 do dev build | F0-11 |
| H6 | Supabase hospedado (Q2) e `supabase login` | Parte hospedada da F0-06 |
| H7 | Comandos com `sudo`: `systemctl start docker` e instalação do `gitleaks` | F0-01 |
| H8 | Equipe e Secult na contenção: rotações, endpoints, selos, Play Console | F0-12 |
| H9 | Responsável pela escolha Expo Observe × Sentry (§13) | Decisão do ADR-0004 |

## 7. Tarefas da Fase 0 (em ordem; uma tarefa = um branch e um PR)

Ordem: F0-01 → F0-02 → (F0-12, F0-03, F0-04, F0-05, F0-06 em paralelo) → F0-09a → F0-07 → F0-08 → F0-09b → (F0-10, F0-11) → F0-13.
Divisão entre duas pessoas: **app** fica com F0-07, F0-08, F0-10 e F0-11; **dados e painel** fica com F0-04, F0-05, F0-06, F0-09a, F0-03 e F0-12.
Todo PR passa pelo `/code-review` sem pendência crítica e por revisão humana (§5.1 e §14).

### F0-01 Ambiente local · S · depende de: H7
- TASK: atualizar a máquina de desenvolvimento.
  - Instalar `npm i -g pnpm@12.18.0` (ou o instalador standalone) e `npm i -g eas-cli@27.7.2 typescript-language-server typescript@6.0.3`.
  - Instalar o `gitleaks` pelo gerenciador de pacotes.
  - Iniciar o daemon do Docker.
- DELIVERABLE: a mesma lista em `docs/setup-maquina.md` (é parte da F0-02).
- SCOPE: só a máquina. Nada no repositório antes da F0-02.
- VERIFY: `pnpm -v` = 12.18.0; `docker info` responde; `command -v gitleaks typescript-language-server`.
- STOP WHEN: os três comandos passam. Se algo exigir `sudo`, parar e pedir à pessoa.

### F0-02 (0.1) Monorepo e CI · L · depende de: F0-01, H1 · QUA-01, QUA-02, SEG-01
- TASK: `git init` na pasta definida na Q1. Criar:
  - `package.json` raiz com `packageManager`, `engines.node >=26` e `license: AGPL-3.0-only`;
  - `pnpm-workspace.yaml` com `packages`, `catalog` (typescript ~6.0.3, react 19.3.0, vitest, zod…) e `allowBuilds`;
  - `turbo.json` com `lint`, `typecheck`, `test` e `build`, e `globalDependencies` para os configs da raiz;
  - `biome.json` raiz (`root: true`, VCS com `useIgnoreFile`, `files.ignoreUnknown`, `linter.rules.preset: "recommended"`);
  - `packages/tsconfig` com a base compatível com o TS 7;
  - `LICENSE` (texto oficial da AGPL-3.0);
  - `.gitignore` (`.env*` com `!.env.example`) e `.env.example`;
  - `docs/PLANO-EXECUCAO.md` sem alterações, `docs/adr/0000-modelo.md` e o modelo de PR que cita IDs de requisito;
  - `.github/workflows/ci.yml` com `actions/checkout@v7` (`fetch-depth: 0`, `filter: blob:none`), `pnpm/action-setup@v6` + `actions/setup-node@v7` (`node-version-file: .nvmrc`, `cache: pnpm`), `pnpm install --frozen-lockfile`, `pnpm biome ci .` e `pnpm turbo run typecheck test` (`--affected` em PR, completo em `main`), e um job `gitleaks` sobre o histórico inteiro. Actions fixadas por SHA.
  - Proteção da branch `main` com os checks obrigatórios.
- DELIVERABLE: PR #1 com o esqueleto. PR de controle negativo fechado sem merge.
- SCOPE: arquivos da raiz, `.github/`, `packages/tsconfig`, `docs/`. Nada de `apps/` nem `supabase/`.
- VERIFY (juízes: GitHub Actions, gitleaks, API do GitHub):
  - um PR só com README fica verde;
  - um PR com erro proposital de Biome fica vermelho;
  - `gh api …/branches/main/protection` lista os checks;
  - `gh api repos/<org>/<repo> --jq .license.spdx_id` = `AGPL-3.0`.
- STOP WHEN: os dois PRs de controle se comportam como esperado e o PR #1 tem revisão humana aprovada.

### F0-12 (0.9) Checklist de contenção · S · depende de: nada (vai para o repositório depois da F0-02) · SEG-01
- TASK: escrever `docs/checklists/fase-0-contencao.md` com responsável, data, evidência e assinatura por item:
  1. Keystore `agendaCultural.jks` público em 2 repositórios e `key.properties` versionado:
     - conferir no Play Console se o Play App Signing está ativo;
     - pedir o reset da upload key;
     - nunca reusar essa chave no EAS;
     - tornar privado ou arquivar `Mutirao/farol_agenda_cultural`;
     - pedir o mesmo ao Instituto Dragão do Mar.
  2. Credenciais do `importador-idm` (`appsettings*.json` e as cópias em `bin/`).
  3. Chave Google Maps do `AndroidManifest`: restringir ou trocar.
  4. Segredos da API Node antiga (o repositório não está nesta máquina; o dono precisa confirmar).
  5. Desligar `resetarsenha` e `enviaremail`, com mensagem combinada, porque o app antigo perde a troca de senha.
  6. Confirmar os selos com a Secult e quem mantém a lista.
  7. Nomear quem responde cada questão do §13.
- DELIVERABLE: o checklist. O agente **nunca** lê nem manipula valores de segredo.
- SCOPE: só documentação.
- VERIFY: assinatura humana por item (juiz: pessoa); `gh api repos/Mutirao/farol_agenda_cultural --jq .visibility` depois da ação (juiz: GitHub).
- STOP WHEN: o documento foi entregue e revisado. A execução dos itens é humana e entra no PORTÃO 0.

### F0-03 Divergências e ADRs de mesa · S · depende de: F0-02
- TASK: `docs/adr/0001-divergencias-plano-docs-2026-11.md` com a tabela da seção 3, uma fonte por linha. PR separado com a errata proposta ao PLANO v1.1, que **só entra se a pessoa aprovar**.
  - `docs/adr/0004-observabilidade.md` (proposto): Expo Observe × Sentry, cobrindo app, painel e funções do OPS-03.
  - `docs/adr/0005-app-web.md` (proposto): D13; só a camada universal do Expo UI roda na web.
  - Se a resposta à Q4 pedir: `0006-painel.md` comparando Refine Core, shadcn-admin-kit + ra-supabase-core e TanStack + shadcn.
- DELIVERABLE: os ADRs.
- SCOPE: `docs/adr/`.
- VERIFY: um humano aprova ou recusa cada ADR por escrito no PR (juiz: pessoa).
- STOP WHEN: os ADRs estão mergeados com status `proposto` ou `aceito`.

### F0-04 (0.2) Claude Code: plugins, skills, MCP, hooks e permissões · L · depende de: F0-02 · SEG-01, SEG-05
- TASK:
  - `scripts/bootstrap-claude.sh`, idempotente (comandos na seção 8).
  - `.claude/settings.json` com `extraKnownMarketplaces`, `enabledPlugins`, `permissions.deny`, `hooks` e `sandbox`.
  - `.claude/hooks/biome.sh` (PostToolUse `Edit|MultiEdit|Write`): roda `pnpm exec biome check --write --no-errors-on-unmatched --files-ignore-unknown=true <arquivo>`; erro sai com 2 e aviso volta como `additionalContext`.
  - `.claude/hooks/guard-bash.sh` (PreToolUse Bash): bloqueia segredos e produção, inclusive via wrappers, e falha fechado se o `jq` faltar.
  - `.claude/hooks/typecheck.sh` (Stop): `--affected`, com guarda `stop_hook_active`.
  - `.claude/hooks/tests/run.sh` com fixtures JSON.
  - Plugins GritQL no Biome: cor hex fora de `packages/tokens/**` (erro) e texto JSX fixo em `apps/**` (aviso), com fixtures de teste.
  - `.mcp.json`: `supabase-local` (`http://localhost:54321/mcp`), `supabase-dev` (`${SUPABASE_DEV_PROJECT_REF}`, `read_only=true`, só se a Q2 for "gerenciado") e `shadcn` (fixado). Expo e Context7 vêm pelos plugins.
  - `skills-lock.json` e `.agents/skills/` comitados.
  - `.claude/claude-security-guidance.md` com as regras do projeto: RLS, `service_role` nunca no cliente, nada de segredo em `app.json`/`eas.json`.
  - Jobs de CI: `hooks` (testes) e `skills` (`npx -y skills@1.8.1 check`).
- DELIVERABLE: o PR. O PR lista, para cada skill de comunidade, quem a leu e o SHA ou tag fixado.
- SCOPE: `.claude/`, `.agents/`, `.mcp.json`, `skills-lock.json`, `scripts/bootstrap-claude.sh`, `tooling/biome-plugins/`, `biome.json`, `ci.yml`.
- VERIFY (juízes: Claude Code CLI, skills CLI, Biome, sistema de arquivos):
  - em clone limpo, o bootstrap roda e depois `claude plugin list` mostra os 12 plugins com escopo de projeto;
  - `skills check` termina com 0;
  - `bash .claude/hooks/tests/run.sh` passa;
  - teste e2e num clone descartável, com controle positivo (sem ele o teste passa à toa, porque o `-p` já nega edições sem permissão): com `--permission-mode acceptEdits`, criar `apps/app/.env.e2e-ok` **funciona** e criar `apps/app/.env.production` **não** (`test -e` no primeiro, `test ! -e` no segundo);
  - as fixtures do Biome produzem exatamente os diagnósticos esperados;
  - a varredura do `.mcp.json` não encontra `service_role` nem PAT.
- STOP WHEN: todas as verificações passam. Se o sandbox quebrar `pnpm` ou `eas`, registrar no PR e seguir só com os bloqueios e o hook de guarda.

### F0-05 (0.4) `packages/tokens` · M · depende de: F0-02 · ACE-01
- TASK:
  - `tokens.json` com a paleta do §3.1, nos modos claro, escuro e alto contraste do Farol, mais raios e espaçamentos, validado com zod.
  - Gerador em TS que produz `dist/native.ts` (tipado) e `dist/theme.css`: `oklch`, `:root`/`.dark`, `@theme inline`, escala de `--radius` e os nomes de token atuais do shadcn.
  - Testes Vitest:
    - as 8 razões do §3.1 recalculadas com `culori` (implementação independente), com tolerância de ±0,01;
    - todo token de texto ≥ 4,5:1 sobre o seu fundo;
    - todo token gráfico ≥ 3:1;
    - `#999999` não pode ser token de texto;
    - o `theme.css` tem todos os nomes de token shadcn.
- DELIVERABLE: o pacote `@farol/tokens`.
- SCOPE: `packages/tokens/`.
- VERIFY: `pnpm --filter @farol/tokens test` passa; `pnpm --filter @farol/tokens build && git diff --exit-code packages/tokens/dist` não acusa diferença; o Biome analisa o `theme.css` com `tailwindDirectives` (juízes: Vitest/culori, git, Biome).
- STOP WHEN: o CI está verde com os testes de contraste.

### F0-06 (0.8) Supabase local e de fumaça · M · depende de: F0-02, Docker · OPS-01, LGPD-02
- TASK:
  - `pnpm add -Dw supabase@3.1.0` e `pnpm supabase init`.
  - `supabase/config.toml` com `project_id = "farol"`, `[db] major_version = 17`, `[api] auto_expose_new_tables = false` e `[local_smtp]`.
  - `supabase/tests/000_smoke.test.sql` (pgTAP): Postgres ≥ 17 e `postgis`, `pg_trgm`, `unaccent`, `pg_cron`, `pg_net` e `supabase_vault` em `pg_available_extensions`.
  - `supabase/seed.sql` vazio.
  - Job de CI com `supabase/setup-cli@v3`, `supabase db start` e `supabase test db`.
  - Se a Q2 for "gerenciado": a pessoa cria `farol-dev` e `farol-hml` em `sa-east-1`; os refs vão para os GitHub Environments, nunca para o repositório.
  - Nenhum `db push` na Fase 0.
- DELIVERABLE: o PR.
- SCOPE: `supabase/`, `package.json` raiz, `ci.yml`.
- VERIFY: `pnpm supabase start && pnpm supabase db reset && pnpm supabase test db` passa no local e no CI; com Q2 = gerenciado, `pnpm supabase projects list` mostra os 2 projetos em `sa-east-1` (juízes: pgTAP, API do Supabase).
- STOP WHEN: o pgTAP de fumaça está verde no CI. Se `db start` não bastar no CI, trocar por `supabase start` e registrar.

### F0-09a (0.3, parte 1) Skills do projeto e instruções da raiz · M · depende de: F0-04
- TASK:
  - Com o `skill-creator`, criar `.claude/skills/` com `farol-sync-rules`, `farol-rls`, `farol-notifications`, `farol-performance` e `farol-connector`, usando o conteúdo do PLANO (§8 a §11).
  - `farol-rls` já nasce com o padrão GRANT + RLS + pgTAP da V18.
  - `AGENTS.md` da raiz (comandos, estrutura, convenções, regras do §0, ponteiros) e `CLAUDE.md` com `@AGENTS.md` mais o que é específico do Claude, até ~150 linhas.
  - `CLAUDE.md` curtos em `apps/painel/` e `workers/coleta/`, que nascem só com o `CLAUDE.md` e um README "entra na Fase X".
- DELIVERABLE: o PR.
- VERIFY: script que valida o frontmatter das 6 skills e `wc -l CLAUDE.md` ≤ 150; revisão humana (juízes: script, pessoa).
- STOP WHEN: o humano aprova o PR.

### F0-07 (0.5) `apps/app` · L · depende de: F0-02, F0-05, H2 (H3 para iOS, H4 para Android) · OPS-02, OPS-05, D11, D13
- TASK:
  - `npx create-expo-app@latest apps/app --template default@sdk-58 --no-agents-md --no-install`, adaptado para `@farol/app`.
  - Dependências do Expo instaladas com `npx expo install`; `expo-symbols` e `@expo/ui` explícitos.
  - `app.config.ts` com `APP_VARIANT` (ids da O12), `platforms: ['ios', 'android']` (D13) e React Compiler e typed routes ligados.
  - `eas.json` com os perfis `development` (dev client, interno), `preview` (interno) e `production` (canal `production`).
  - `NativeTabs` de `expo-router/native-tabs` com 4 abas vazias: agenda, mapa, favoritos e conta. Ícones SF Symbols e Material, tint `brand.primary` de `@farol/tokens`.
  - Rótulos via `packages/i18n` mínimo (pt-BR, `i18next` + `expo-localization`).
  - Job de CI: `expo install --check`, `expo-doctor` e `expo export` para Android e iOS.
- DELIVERABLE: o PR, mais prints dos dev builds nos dois sistemas.
- SCOPE: `apps/app/`, `packages/i18n/`, `ci.yml`.
- VERIFY (juízes: Expo CLI, EAS, `adb`, pessoa):
  - `expo-doctor` e `expo install --check` passam;
  - `APP_VARIANT=production npx expo config --type public --json` mostra `br.com.farol.cultura`;
  - `eas build --profile development` sai para Android e iOS;
  - no Android, `adb install` e um print das 4 abas;
  - no iPhone, um print enviado pela pessoa.
- STOP WHEN: os dois sistemas abrem as 4 abas. Se H3 faltar, iOS fica `bloqueado` com o motivo e o PR segue só com Android.

### F0-08 (0.6) `packages/ui-native` · M · depende de: F0-07, F0-05 · ACE-01, ACE-02, ACE-03
- TASK:
  - `Button`, `Toggle`, `ListSection` e `Sheet` sobre o `@expo/ui` universal.
  - API própria com `accessibilityLabel` obrigatório e tint dos tokens.
  - Arquivos por plataforma só se faltar uma prop.
  - Rota de demonstração `app/(dev)/ui-demo.tsx`, que só existe na variante `development`.
  - Regra `noRestrictedImports` do Biome: `@expo/ui*` só dentro de `packages/ui-native`.
  - `docs/a11y/f0-ui-native.md` com o checklist de TalkBack, VoiceOver e fonte máxima.
- DELIVERABLE: o PR, o checklist assinado e os prints.
- VERIFY (juízes: Biome, uiautomator, pessoa):
  - `pnpm biome ci .` passa;
  - `adb shell uiautomator dump` mostra rótulo em todos os controles;
  - TalkBack e VoiceOver percorrem a tela;
  - `font_scale 2.0` sem texto cortado.
- STOP WHEN: o checklist está assinado nos dois sistemas. Se H3 faltar, VoiceOver fica `bloqueado`.

### F0-09b (0.3, parte 2) Skill de UI nativa e instruções do app/Supabase · S · depende de: F0-08, F0-06
- TASK: `farol-native-ui` com os wrappers reais, os tokens, o checklist de acessibilidade e a nota de que ela prevalece sobre as skills `expo-ui` e `expo-router` (V10, V12). `CLAUDE.md` em `apps/app/` e `supabase/`.
- VERIFY: o mesmo script de frontmatter e revisão humana.
- STOP WHEN: o humano aprova.

### F0-10 (0.7a) Spike de lista e ADR-0002 · M · depende de: F0-08, H4 · DES-02, DES-04
- TASK: num branch `spike/lista` que não é mergeado, menos o ADR e o script:
  - 500 cartões falsos com semente fixa e `expo-image` (`recyclingKey`, cerca de 20 miniaturas locais de no máximo 480 px);
  - variante A: `@expo/ui` `List.ForEach` + `RNHostView`;
  - variante B: FlashList 2.3.2;
  - build `preview`;
  - `scripts/perf/measure-scroll.sh`: fixa 60 Hz, faz `gfxinfo reset`, 30 swipes, coleta `dumpsys gfxinfo` e `framestats`, em 3 rodadas por variante.
  - **Regra escrita antes de medir:** escolher A só se p95 ≤ 16 ms **e** janky ≤ 5% **e** não ficar mais de 1 ponto percentual pior que B; senão, B.
- DELIVERABLE: `docs/adr/0002-lista.md` com o modelo do aparelho, a versão do Android, o id do build, as saídas brutas em `docs/adr/assets/0002/` e a decisão.
- VERIFY: os números saem do `dumpsys gfxinfo`; um humano aprova o ADR (juízes: gfxinfo, pessoa).
- STOP WHEN: o ADR é aprovado.

### F0-11 (0.7b) Spike de mapa e ADR-0003 · M · depende de: F0-07, H4, H5 · DES-02
- TASK: o mesmo método com 300 pinos com semente fixa no recorte de Fortaleza. Variantes: `expo-maps` × `react-native-maps`, cada uma com e sem `supercluster`. Pan com swipes e zoom com toque duplo. Também o tempo até renderizar os 300 marcadores. Regra de decisão escrita antes.
- DELIVERABLE: `docs/adr/0003-mapa.md` com as saídas brutas.
- VERIFY: gfxinfo e aprovação humana.
- STOP WHEN: o ADR é aprovado.

### F0-13 Relatório do PORTÃO 0 · S · depende de: todas
- TASK: `docs/relatorios/portao-0.md`, tarefa por tarefa:
  - requisitos citados, links de PR e de execução do CI, evidências;
  - o que ficou `bloqueado`, com o motivo;
  - o estado da contenção, dos selos e dos ADRs.
- VERIFY: um humano aprova o portão (juiz: pessoa).
- STOP WHEN: o portão é aprovado ou recusado com pendências listadas. A Fase 1 não começa sem isso.

## 8. Comandos de instalação (F0-04, `scripts/bootstrap-claude.sh`)

```bash
set -euo pipefail
export DISABLE_TELEMETRY=1

# Plugins oficiais (escopo de projeto; o marketplace precisa ser registrado pelo shell)
claude plugin marketplace add anthropics/claude-plugins-official
for p in feature-dev code-review pr-review-toolkit code-simplifier security-guidance \
         commit-commands hookify skill-creator frontend-design typescript-lsp expo context7; do
  claude plugin install "$p@claude-plugins-official" --scope project
done
# O plugin "supabase" fica de fora de propósito (V04).

# Skills de comunidade: CLI fixado, fonte fixada depois de lida (refs observadas em 11/11/2026)
npx -y skills@1.8.1 add supabase/agent-skills@v0.1.9 \
  -s supabase supabase-postgres-best-practices -a claude-code -y
npx -y skills@1.8.1 add vercel-labs/agent-skills@1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62 \
  -s vercel-react-native-skills vercel-react-best-practices vercel-composition-patterns web-design-guidelines \
  -a claude-code -y
npx -y skills@1.8.1 add shadcn-ui/ui@4233ed1caded8c38f4bc14b14afe1f93ebcaf966 -s shadcn -a claude-code -y
# Depois de logar: /mcp no Claude Code (OAuth do Expo e do Context7). Nada de token em arquivo.
```

Os SHAs acima são os commits mais recentes observados com `gh api` em 11/11/2026: `vercel-labs/agent-skills@main` e o último commit em `shadcn-ui/ui/skills/shadcn`. O `v0.1.9` é tag. A F0-04 relê o conteúdo antes de fixar e atualiza o SHA se mudar.

Trechos centrais do `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "claude-plugins-official": { "source": { "source": "github", "repo": "anthropics/claude-plugins-official" } }
  },
  "enabledPlugins": { "feature-dev@claude-plugins-official": true, "...": "um por plugin do bootstrap" },
  "permissions": {
    "deny": [
      "Read(**/.env.production*)", "Edit(**/.env.production*)",
      "Read(**/*.keystore)", "Edit(**/*.keystore)",
      "Read(**/*.jks)", "Edit(**/*.jks)",
      "Read(**/key.properties)", "Edit(**/key.properties)",
      "Bash(supabase db push *)", "Bash(npx supabase db push *)",
      "Bash(pnpm supabase db push *)", "Bash(pnpm exec supabase db push *)", "Bash(pnpm dlx supabase db push *)",
      "Bash(eas submit *)", "Bash(npx eas-cli submit *)",
      "Bash(eas update *production*)", "Bash(npx eas-cli update *production*)"
    ]
  },
  "hooks": {
    "PreToolUse":  [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/guard-bash.sh" }] }],
    "PostToolUse": [{ "matcher": "Edit|MultiEdit|Write", "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/biome.sh", "timeout": 60 }] }],
    "Stop":        [{ "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/typecheck.sh", "timeout": 600 }] }]
  },
  "sandbox": { "enabled": true, "filesystem": { "denyRead": ["**/.env.production*", "**/*.jks", "**/*.keystore", "**/key.properties"] } }
}
```

O `guard-bash.sh` cobre o que as regras de prefixo deixam passar: `sh -c`, flags reordenadas, `supabase … --remote`, `functions deploy`, `secrets set`, `config push`, e leitura dos arquivos de segredo por outros comandos.

## 9. Riscos

| # | Risco | Prob./Impacto | Mitigação | Gatilho para agir |
| --- | --- | --- | --- | --- |
| R01 | Keystore público é a upload key atual | M/A | F0-12, item 1: reset da upload key no Play Console e repositórios públicos tratados | Assim que o plano for aceito; não depende de código |
| R02 | Faltam acessos (H2 a H5) e 0.5 a 0.7 travam | A/A | Pedir no dia 1; marcar a tarefa `bloqueado` com o motivo; o PORTÃO 0 não passa sem eles | H não resolvido até o 3º dia útil |
| R03 | pnpm 12 (lançado em ago/2026) com o autolinking do Expo | M/M | `expo-doctor` e o EAS build como juízes; plano B pnpm 11.28.9 e/ou `nodeLinker: hoisted` | `expo-doctor` ou build falham por resolução |
| R04 | TS 6.0.3 congelado, sem patches desde abril | B/B | tsconfig já compatível com o TS 7 | O Expo passa a recomendar o 7 |
| R05 | Skills oficiais do Expo desatualizadas (List e NativeTabs) levam o agente a errar | A/M | `farol-native-ui` prevalece; o `CLAUDE.md` manda seguir a documentação, não a skill | PR com `unstable-native-tabs` ou FlatList sem justificativa |
| R06 | Regras de permissão contornáveis | M/A | Hook de guarda, sandbox `denyRead`, teste e2e | Falha no teste e2e |
| R07 | Dois hooks Stop (o nosso e o `security-guidance`) deixam cada turno lento e gastam cota | M/M | Medir na primeira semana; desligar uma camada via env (`ENABLE_STOP_REVIEW=0`) se passar de ~60 s | Reclamação da equipe ou turno acima de 60 s |
| R08 | Sandbox bloqueia rede do `pnpm`/`eas` | M/B | Ajustar a política no próprio PR; plano B sem sandbox, registrado | Falha de instalação dentro do agente |
| R09 | Uma medição feita num aparelho só | M/M | 3 rodadas, aparelho e versão registrados, regra escrita antes; repetir se o resultado ficar na margem de 1 ponto | Diferença entre A e B menor que 1 ponto |
| R10 | Refine em modo de manutenção pesa na Fase 3 | M/M | Q4; `theme.css` neutro; versões fixadas | Sem release até a Fase 3 |
| R11 | Desligar `resetarsenha` quebra a troca de senha do app antigo | A/M | Mensagem combinada (F0-12, item 5) | Antes de desligar |
| R12 | Custos: Supabase Pro para 2 projetos (~US$ 35/mês), EAS e Maestro (Fase 2) | M/B | Q2; registrar no ADR-0001 | — |
| R13 | O repositório da API antiga não está acessível aqui | M/M | Dono nomeado na F0-12 | Sem dono no 2º dia |
| R14 | Sem macOS: nada de iOS local | C/M | Builds na nuvem com o EAS e aparelho físico | — |

## 10. Critérios de sucesso

| Critério | Tarefa | Cenário de verificação (juiz externo) |
| --- | --- | --- |
| T01 Instalação reproduzível e fixada | F0-01, F0-02 | Clone limpo: `pnpm -v` = 12.18.0 e `pnpm install --frozen-lockfile` termina com 0 (pnpm) |
| T02 CI obrigatório que realmente falha | F0-02 | PR só com README verde; PR com erro de Biome vermelho; a proteção da `main` lista os checks (GitHub Actions/API) |
| T03 Nenhum segredo | F0-02 | O job `gitleaks` no histórico inteiro passa; `git check-ignore .env.production` dá positivo e `.env.example` não (gitleaks, git) |
| T04 AGPL-3.0 | F0-02 | `gh api repos/<org>/<repo> --jq .license.spdx_id` = `AGPL-3.0` (GitHub) |
| T05 Ferramentas do agente reproduzíveis | F0-04 | Clone limpo, `bootstrap-claude.sh`, e `claude plugin list` mostra os 12 no projeto; `skills check` = 0; `claude mcp list` mostra expo, context7, shadcn e supabase-local (Claude CLI, skills CLI) |
| T05b MCP do Supabase só leitura e só dev | F0-04 | Teste no CI: toda URL `mcp.supabase.com` do `.mcp.json` tem `read_only=true` e `project_ref=`; nenhum `service_role` ou PAT (script) |
| T06 Hook bloqueia `.env.production` | F0-04 | Clone descartável com `--permission-mode acceptEdits`: o controle positivo `apps/app/.env.e2e-ok` é criado e `apps/app/.env.production` não é; `run.sh` com fixtures passa (sistema de arquivos, test runner) |
| T06b Biome no arquivo editado; hex e texto fixo sinalizados | F0-04 | Fixtures: hex em `apps/**` gera erro, hex em `packages/tokens/**` não gera nada, texto JSX fixo gera aviso; o hook devolve código 2 (Biome) |
| T06c Stop só nos afetados e sem loop | F0-04 | Fixture com `stop_hook_active=true` sai com 0 sem rodar nada; erro de tipo em pacote sai com 2 (turbo/tsc) |
| T07 Divergências registradas | F0-03 | ADR-0001 aprovado; PR de errata aprovado ou recusado por escrito (pessoa) |
| T08 Skills e instruções | F0-09a/b | Script de frontmatter verde nas 6 skills; `wc -l CLAUDE.md` ≤ 150; revisão humana (script, pessoa) |
| T09 Tokens com contraste | F0-05 | Vitest com `culori` reproduz as 8 razões (±0,01) e os mínimos AA; `git diff --exit-code packages/tokens/dist` limpo depois do build (Vitest, git) |
| T09b `theme.css` no formato shadcn atual | F0-05 | O teste encontra todos os nomes de token, `@theme inline` e `oklch`; o Biome analisa com `tailwindDirectives` (Vitest, Biome) |
| T10 App nos dois sistemas com 4 abas nativas | F0-07 | `expo-doctor` e `expo install --check` verdes; `expo export` iOS+Android no CI; dev build instalado e print das 4 abas (Expo, EAS, adb, pessoa) |
| T10b Ambientes por variável (OPS-02) | F0-07 | `APP_VARIANT=<v> npx expo config --type public --json` dá os 3 ids da O12 (Expo CLI) |
| T10c Textos via tradução | F0-07 | Plugin de texto JSX sem diagnóstico em `apps/app`; os rótulos das abas vêm de `packages/i18n` (Biome) |
| T11 Wrappers e importação restrita | F0-08 | `noRestrictedImports` verde no CI; a demo abre no dev build (Biome, aparelho) |
| T11b Acessibilidade | F0-08 | `uiautomator dump` com rótulo em todos os controles; checklist TalkBack/VoiceOver/fonte 2.0 assinado (uiautomator, pessoa) |
| T12 Lista decidida por medição | F0-10 | ADR-0002 com regra escrita antes, 3 rodadas por variante, `gfxinfo` bruto, aprovado (gfxinfo, pessoa) |
| T12b Mapa decidido por medição | F0-11 | ADR-0003 idem, com 300 pinos (gfxinfo, pessoa) |
| T13 Supabase local | F0-06 | `supabase start && db reset && test db` verde no local e no CI (pgTAP) |
| T13b Supabase hospedado (se Q2 = gerenciado) | F0-06 | `supabase projects list` mostra `farol-dev` e `farol-hml` em `sa-east-1` (API do Supabase) |
| T14 Contenção | F0-12 | Checklist com responsável, data e evidência por item; `gh api` confirma o fork público tratado (pessoa, GitHub) |
| T15 Observabilidade e app web com evidência | F0-03 | ADR-0004 e ADR-0005 com fontes e a decisão humana registrada (pessoa) |
| T16 Acessos | F0-01, H2–H6 | `adb devices` lista o aparelho; `eas whoami` mostra o usuário; `supabase projects list` responde (CLIs) |
| T17 PORTÃO 0 | F0-13 | Relatório tarefa por tarefa com links; aprovação humana (pessoa) |
| Revisão de cada PR | todas | `/code-review` sem pendência crítica e aprovação humana no GitHub (plugin, pessoa) |

## 11. Comandos de verificação

```bash
# F0-01
pnpm -v; eas --version; docker info --format '{{.ServerVersion}}'
command -v jq gitleaks typescript-language-server; adb devices -l; eas whoami

# F0-02
pnpm install --frozen-lockfile && pnpm biome ci . && pnpm turbo run typecheck test
gitleaks git --redact --no-banner .          # subcomando do gitleaks ≥ 8.19 (confirmar na versão instalada)
gh pr checks <PR> --watch
gh api repos/<org>/<repo>/branches/main/protection --jq '.required_status_checks.contexts'
gh api repos/<org>/<repo> --jq .license.spdx_id

# F0-04
bash scripts/bootstrap-claude.sh && claude plugin list && claude mcp list
npx -y skills@1.8.1 check
bash .claude/hooks/tests/run.sh
bash tooling/biome-plugins/test.sh
# e2e num clone descartável (controle positivo + negativo):
claude -p "Crie apps/app/.env.e2e-ok com FOO=1" --permission-mode acceptEdits --output-format json > "$TMPDIR/ok.json"; test -e apps/app/.env.e2e-ok
claude -p "Crie apps/app/.env.production com FOO=1" --permission-mode acceptEdits --output-format json > "$TMPDIR/deny.json"; test ! -e apps/app/.env.production

# F0-05
pnpm --filter @farol/tokens test
pnpm --filter @farol/tokens build && git diff --exit-code packages/tokens/dist

# F0-06
pnpm supabase start && pnpm supabase db reset && pnpm supabase test db
pnpm supabase projects list                    # só se Q2 = gerenciado

# F0-07 (em apps/app)
npx expo install --check && npx expo-doctor
for v in development preview production; do APP_VARIANT=$v npx expo config --type public --json | jq -r '.ios.bundleIdentifier, .android.package'; done
npx expo export --platform android --platform ios --output-dir "$TMPDIR/export"
eas build --profile development --platform android --non-interactive
eas build --profile development --platform ios --non-interactive
adb install <apk> && adb shell monkey -p br.com.farol.cultura.dev 1 && adb exec-out screencap -p > docs/evidencias/f0-07-android.png

# F0-08
pnpm biome ci .
adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml "$TMPDIR/ui.xml"
adb shell settings put system font_scale 2.0    # voltar para 1.0 depois

# F0-10 / F0-11
adb shell settings put system peak_refresh_rate 60.0; adb shell settings put system min_refresh_rate 60.0
bash scripts/perf/measure-scroll.sh br.com.farol.cultura.preview <variante> 3
```

## 12. Cobertura do estado-alvo

- T01 a T17 têm tarefa dona e cenário de verificação na seção 10. Nenhuma diferença ficou sem dono.
- **Bloqueadas por evidência ou acesso, não por plano:**
  - T10 iOS, T11b VoiceOver: dependem de H3.
  - T12 e T12b: dependem de H4 e H5.
  - T13b: depende de Q2 e H6.
  - T14: depende de H8.
  - Ficam registradas na seção 13 e no relatório do portão como `bloqueado`, com o motivo.
- **Fora da Fase 0 pelo próprio PLANO:**
  - conversão dos ícones para SVG (§3.2);
  - migrações e RLS (Fase 1);
  - painel (Fase 3);
  - implementação do app web (D13);
  - Maestro (2.8).
- O pedido literal do §15 manda começar por 0.1 e 0.2. Este plano cobre a fase inteira porque o próprio §15 pede "a lista de tarefas da Fase 0 em ordem". A execução segue uma tarefa por vez.

## 13. Lacunas de evidência

- **G1** Desempenho de `List.ForEach` + `RNHostView` com cartões RN: não está documentado. A F0-10 mede.
- **G2** pnpm 12 com o autolinking do Expo num monorepo: não testado. Juízes: `expo-doctor` e o EAS build na F0-07.
- **G3** `claude plugin install …@claude-plugins-official` depois do `marketplace add` nesta máquina: não testado.
- **G4** Formato exato do JSON de `claude plugin list` e de `claude -p --output-format json`: não verificado. O teste e2e usa o sistema de arquivos como juiz para não depender disso.
- **G5** Cotas de build do plano Free do EAS: não verificadas.
- **G6** Se `supabase test db` funciona com `db start` sozinho no CI (a doc de CI diz que sim, a referência diz `start`).
- **G7** Impacto da política de rede do sandbox no `pnpm`/`eas`, e a ancoragem exata de globs como `**/.env.production*` no `sandbox.filesystem.denyRead`.
- **G8** Repositório da API Node antiga (`resetarsenha`, `enviaremail`): não está nesta máquina.
- **G9** Se o `agendaCultural.jks` público é a upload key atual e se o Play App Signing está ativo. Só o Play Console responde.
- **G10** RFC-001 não foi encontrada localmente. O PLANO a substitui, então não bloqueia.
- **G11** Postgres padrão no Supabase hospedado = 17 é inferência: só há imagens 15 e 17.
- **G12** Subcomando exato do `gitleaks` na versão que for instalada.
- **G13** Vitest com componentes RN: não verificado (V24).

## 14. Revisão crítica

- **"A Fase 0 cabe em 2 semanas?"** São 13 tarefas e 9 pré-requisitos humanos. O código é M/L. O risco real é a espera por acessos (R02). Por isso H2 a H5 precisam ser pedidos no dia 1, e a F0-12 corre em paralelo desde o início.
- **"O plano aumenta o escopo?"** Entraram três coisas: o ADR de divergências (regra 0.7), os ADRs propostos de observabilidade e app web (o PLANO manda escolher e avaliar na Fase 0) e o `packages/i18n` mínimo (a regra 0.8 proíbe texto fixo, e as abas têm rótulo). Os plugins GritQL substituem o hook de aviso, não somam a ele. Nada além disso.
- **"TS 6 vai contra o 'mais recente'?"** O plano não fixa versão do TS, e a doc do Expo fixa 6.0.3. Pela regra 0.7, segue-se a doc.
- **"Os juízes são externos?"** Todo cenário da seção 10 aponta para CI, CLI, medição ou pessoa. Nenhum depende da leitura do executor. Os de acessibilidade e de ADR dependem de pessoa, como o PLANO exige.
- **"E os falsos positivos do plugin de texto JSX?"** Ele é aviso, não erro. Calibrar nas fixtures e rever na Fase 2.
- **Limite desta revisão:** ela foi feita pelo mesmo planejador. As revisões independentes são a humana (aceite deste plano e de cada PR) e a do `/code-review`. As pesquisas de documentação foram feitas por 5 subagentes com fontes; os pontos que não puderam verificar estão na seção 13.

## 15. Handoff (preparado, não iniciado)

- Executor recomendado: **Claude Code no novo repositório**, como o PLANO prevê, uma tarefa por PR, na ordem da seção 7, com este arquivo anexado ao `docs/` como plano revisado da fase. *Motivo:* o PLANO foi escrito para esse executor, e cada tarefa já tem TASK, VERIFY e STOP WHEN.
- Alternativa: `dag-ulw` no Hermes. As tarefas formam um grafo com escopos de escrita disjuntos e uma tarefa final de verificação (F0-13).
- Nada começa sem o "pode seguir" explícito da pessoa. O aceite deste plano aprova o conteúdo, não a execução.

## 16. Decisões do aceite (11/11/2026, respondidas pela pessoa)

- **Q1 → H1 resolvido:** o repositório é `Mutirao/farol-da-cultura`, **público** (AGPL), em `/mnt/data/code/farol/farol-da-cultura`. Por ser público, a F0-02 também liga o secret scanning e a push protection do GitHub (`gh api -X PATCH repos/Mutirao/farol-da-cultura -f security_and_analysis[secret_scanning][status]=enabled -f security_and_analysis[secret_scanning_push_protection][status]=enabled`). O `gitleaks` no CI continua.
- **Q2 → H6:** Supabase **gerenciado em `sa-east-1`**, com projetos separados `farol-dev` e `farol-hml` no plano Pro (~US$ 35/mês). A parte hospedada da F0-06 e o `supabase-dev` do `.mcp.json` (`read_only=true`, `project_ref` vindo de variável de ambiente) entram no escopo. Nenhum `db push` na Fase 0.
- **Q3 → H2 a H5:** segundo a pessoa, todos os acessos existem: Apple Developer paga no time de `br.com.farol.cultura` com iPhone, Android intermediário, conta Expo e chave Google Maps. Eles continuam sendo verificados na F0-01 (`adb devices -l`, `eas whoami`), não presumidos.
- **Q4 → O15:** a D6 se mantém, e a F0-03 inclui `docs/adr/0006-painel.md`: comparação sem código entre Refine Core (pinado), shadcn-admin-kit + ra-supabase-core e TanStack Router/Table + shadcn, com os critérios lista/filtro/paginação/login/`app_role`/RPC no schema `curation`. A decisão é humana.
- **Aceite:** "Aprovo". Isso aprova o conteúdo do plano. A execução começa só com um "pode seguir" separado.

<!-- FAROL-F0-PLAN:END -->

Artifact: `2026-11-12T021812361556Z-farol-da-cultura-fase-0-plano-revisado-farol-f0-plan-begin-statu-12cae8.md`

## Task Statement

# Farol da Cultura — Fase 0: plano revisado

<!-- FAROL-F0-PLAN:BEGIN -->

**Status:** aceito pela pessoa em 11/11/2026 (execução ainda não autorizada) · **Data:** 11/11/2026 · **Base:** `docs/PLANO-EXECUCAO.md` v1.0
**Escopo:** a Fase 0 inteira (0.1 a 0.9) até o PORTÃO 0. A execução começa por 0.1 e 0.2, como pede o §15.
**Ainda não foi feito:** execução, CI, revisão de código e aceite de tarefa. Nenhum arquivo do projeto foi criado.

---

## 1. Resumo

- A Fase 0 cabe no plano original, mas 27 pontos dele divergem da documentação atual (seção 3). Os que mudam comandos ou configuração:
  - O marketplace `claude-plugins-official` precisa de `marketplace add` antes de instalar pela linha de comando.
  - Regras `Write(...)` nas permissões nunca casam.
  - `--filter=...[HEAD]` deixa de fora o que o agente já comitou.
  - O Expo SDK 58 fixa o TypeScript em 6.0.3, não no 7.0 que o npm traz como mais recente.
  - `NativeTabs` agora é estável e se importa de `expo-router/native-tabs`.
  - O Supabase CLI 3 trocou as flags (`--remote`, `--yes`).
  - O plugin `supabase` traz um MCP sem escopo de projeto e com permissão de escrita.
- **Achado de segurança novo para a 0.9:**
  - O keystore Android `agendaCultural.jks` está versionado no `farol-cultural` desde o commit inicial.
  - Ele também é **público** em `Instituto-Dragao-do-Mar/agenda_cultural` e no fork `Mutirao/farol_agenda_cultural`.
  - `android/key.properties` está versionado no repositório privado.
  - Nenhum desses arquivos foi aberto nem copiado.
- **O caminho crítico da fase não é código, são acessos:** conta Apple paga, Android intermediário, conta Expo, chave Google Maps e a decisão sobre Supabase hospedado. Sem eles, a 0.5 (iOS), a 0.6 (VoiceOver/TalkBack) e a 0.7 (medições) ficam bloqueadas.

## 2. Fatos observados (11/11/2026)

**Pastas e repositórios**
- `/mnt/data/code/farol` **não é um repositório git**. Contém os clones `farol-cultural` (Flutter, `farolcultura-dev/farol-cultural`, último commit 7a26d28 em 08/09/2026) e `importador-idm` (.NET), mais `.nvmrc` = `26.10.0`. Como o plano pede um repositório novo e vazio, ele precisa de uma pasta nova (pergunta Q1).
- O Raspagem-Farol está em `/mnt/data/code/mutirao/raspagem-farol` (`Mutirao/Raspagem-Farol`, HEAD 941a758). Todos os caminhos citados no §10 existem. Ele só entra na Fase 1.

**Segredos versionados (`git ls-files`)**
- `farol-cultural`: `android/key.properties` e `android/app/agendaCultural.jks`.
- `importador-idm`: `appsettings.json`, `appsettings.Development.json`, `appsettings.Production.json`, além de cópias em `bin/`.
- O `AndroidManifest` do app antigo contém uma chave Google Maps.
- Repositórios públicos com `agendaCultural.jks`: `Instituto-Dragao-do-Mar/agenda_cultural` e `Mutirao/farol_agenda_cultural` (fork). Lá não há `key.properties`.

**Identidade visual**
- Cores do app antigo em `farol-cultural/lib`: `#008EA3` 26×, `#EA5B0C` 6×, `#999999` 14×. Batem com o §3.1.
- Os contrastes da tabela 3.1 foram recalculados pela fórmula de luminância da WCAG: os 8 valores batem com duas casas decimais.
- `imagens/farol/` tem 24 PNG e nenhum SVG. A conversão para SVG não é tarefa da Fase 0.

**Máquina (Linux)**
- Instalado: Node 26.10.0, pnpm 10.34.5, corepack 0.34.2, Docker 29.9.3 (**daemon parado**), Deno 2.9.8, psql 18.6, `claude` 2.1.322, `gh` (logado como `lpirola`, escopos `admin:org`, `repo` e `workflow`), `jq` e `bwrap`.
- `eas-cli` 16.28.0 está instalado, mas não logado.
- Faltam: Supabase CLI, Android SDK e emulador, macOS, `gitleaks` e `typescript-language-server`.
- `adb` funciona, mas não há aparelho conectado.

**Claude Code**
- Marketplaces configurados: o embutido `anthropic-plugin-directory`, `anthropic-agent-skills` e `comite-popular-tech`.
- `claude-plugins-official` não está registrado, e nenhum plugin do plano está instalado.

**Versões mais recentes no npm**
| Grupo | Versões |
| --- | --- |
| Expo | expo 58.0.24, react-native 0.88.1, expo-router 58.0.31, @expo/ui 58.0.28, expo-maps 58.0.11, @shopify/flash-list 2.3.3 (o Expo fixa 2.3.2) |
| Ferramentas | eas-cli 27.7.2, typescript 7.0.2 (o Expo fixa ~6.0.3), pnpm 12.18.0, turbo 2.11.11, @biomejs/biome 2.6.7, skills 1.8.1 |
| Supabase | supabase CLI 3.1.0, supabase-js 2.119.0 |
| Painel | @refinedev/core 5.0.12 (publicado em 02/04/2026), @refinedev/supabase 6.0.2, shadcn 4.23.0, tailwindcss 4.3.5 |

## 3. Divergências entre o plano e a documentação atual

Regra 0.7 do plano: quando a documentação diverge, segue-se a documentação e a divergência é registrada. Esta tabela vira o ADR-0001 (tarefa F0-03).

| # | Seção | O plano diz | A documentação atual diz (fonte) | O que este plano faz |
| --- | --- | --- | --- | --- |
| V01 | 5.1 | `claude plugin install X@claude-plugins-official` | O id continua válido. Comandos de shell não registram esse marketplace (só sessões interativas registram), e o escopo padrão é o do usuário (code.claude.com/docs/en/discover-plugins, /plugins/troubleshooting) | `claude plugin marketplace add anthropics/claude-plugins-official` antes, instalação com `--scope project`, `enabledPlugins` e `extraKnownMarketplaces` comitados, e um script de bootstrap para cada pessoa da equipe |
| V02 | 5.1 | `security-guidance` | Existe (v2.0.17). Adiciona o próprio hook Stop, com revisão por LLM que consome cota, e grava em `~/.claude/security/` (code.claude.com/docs/en/security-guidance) | Manter. Regras do projeto em `.claude/claude-security-guidance.md`. Medir a latência combinada com o nosso Stop |
| V03 | 5.1 | `npx skills add ...` | Sem `-a claude-code -y` o comando é interativo e instala em todos os agentes detectados. Fixação por `@tag`/`@sha` e `skills-lock.json` (github.com/vercel-labs/skills, docs/commands.md) | CLI `skills@1.8.1` fixado, fonte fixada por SHA ou tag depois da leitura, `skills-lock.json` comitado e `skills check` no CI |
| V04 | 5.1 | Supabase: skills via `npx skills` + MCP só de dev em modo leitura | O plugin `supabase` traz um MCP sem `project_ref` e sem `read_only` (github.com/supabase-community/supabase-plugin) | Não instalar o plugin. Skills vêm de `supabase/agent-skills@v0.1.9`. MCP configurado à mão no `.mcp.json` com `project_ref` + `read_only=true` |
| V05 | 5.1 | `pnpm dlx skills add shadcn/ui` dentro de `apps/painel` | O comando existe, mas também oferece `migrate-radix-to-base`, e `apps/painel` só nasce na Fase 3 (ui.shadcn.com/docs/skills) | Instalar com `-s shadcn` na raiz agora (o painel é parte do monorepo) |
| V06 | 5.4 | Hook PostToolUse em "Edit/Write de *.ts(x)" | O matcher é uma lista de nomes (`Edit\|MultiEdit\|Write`). O caminho do arquivo chega pelo stdin (`.tool_input.file_path`). Saída com código 0 e stderr não aparece para o Claude; para avisar, sair com 2 ou mandar `additionalContext` (code.claude.com/docs/en/hooks) | Os scripts em `.claude/hooks/` leem o stdin, usam código 2 para erro e `additionalContext` para aviso, e têm testes |
| V07 | 5.4 | Stop: `pnpm turbo typecheck --filter=...[HEAD]` | `...[HEAD]` só vê o que não foi comitado. `--affected` compara com `main...HEAD` e inclui o que não foi comitado (turborepo.com/docs/reference/run; teste local com turbo 2.11.11) | `pnpm turbo run typecheck --affected --output-logs=errors-only`, com proteção `stop_hook_active` contra loop |
| V08 | 5.4 | Negar "leitura e escrita" e `supabase db push --linked` "fora do CI" | Regras `Write(path)` são aceitas mas nunca casam; o certo é `Read` + `Edit`. Regras de Bash não pegam `npx`/`pnpm exec`/`sh -c` nem flags reordenadas. Não existe regra condicionada ao CI (code.claude.com/docs/en/permissions). No CLI v3, `--linked` está obsoleto e foi trocado por `--remote` (supabase/cli v3.0.0) | Pares `Read`+`Edit`. Negar `supabase db push *` em geral, incluindo variações com `npx`/`pnpm exec`/`pnpm dlx`. Hook PreToolUse de guarda para Bash e sandbox com `denyRead` dos segredos. "Fora do CI" vale porque o CI não roda o Claude Code |
| V09 | 4, 0.5 | "template do SDK mais recente" | Durante a transição, `create-expo-app@latest` sem `--template` ainda cria um projeto SDK 57. O template gera `AGENTS.md` e `.claude/settings.json` próprios (docs.expo.dev/more/create-expo; `--help` local) | `npx create-expo-app@latest apps/app --template default@sdk-58 --no-agents-md --no-install`. Dependências do Expo instaladas com `npx expo install` (React fica em 19.3.0) |
| V10 | 4 | `NativeTabs` estável | É estável, com import `expo-router/native-tabs`. A skill oficial `expo-router` ainda mostra `unstable-native-tabs`. A issue expo/expo#52613 diz que falta `expo-symbols` na checagem de tipos. Máximo de 5 abas. No Android a barra é Material Components (docs.expo.dev/router/advanced/native-tabs) | Usar o import estável, instalar `expo-symbols` explicitamente e registrar na skill `farol-native-ui` que ela prevalece sobre a skill oficial |
| V11 | 6 | Um wrapper por controle com `.ios.tsx` e `.android.tsx`; "se houver componentes universais, wrapper fino" | O SDK 58 tem uma camada universal (`@expo/ui`): Button, Switch, List, BottomSheet, Picker e outros, com um único import (docs.expo.dev/versions/latest/sdk/ui/universal) | Os 4 controles da 0.6 viram wrappers finos sobre a camada universal. Divisão por plataforma só quando faltar uma prop |
| V12 | 4, 11 | Lista reciclável do Expo UI "se cobrir cartões personalizados" | No SDK 58, `List.ForEach` virtualiza e recicla. Cartões RN entram via `RNHostView`, mas o desempenho disso não está documentado. A skill oficial `expo-ui` diz que a List "não é virtualizada", o que está desatualizado (changelog do SDK 58) | O spike F0-10 mede exatamente isso. FlashList entra via `npx expo install` (2.3.2) |
| V13 | 4, 11 | `expo-maps` × `react-native-maps` | `expo-maps` não roda no Expo Go, então exige dev build, e no Android precisa de chave Google Maps. Nenhuma das duas bibliotecas tem clustering nativo (docs.expo.dev/versions/latest/sdk/maps) | O spike F0-11 testa as duas, com e sem `supercluster`. Pede a chave (H5) |
| V14 | 4, 10 | TypeScript (sem versão; o npm mais recente é 7.0.2) | O SDK 58 fixa `typescript ~6.0.3`, e o `expo install --check` cobra isso. O TS 7.0 não tem API de compilador e remove `baseUrl` e `node10` (api.expo.dev/v2/versions; devblogs TS 7.0) | `~6.0.3` via catalog do pnpm. O tsconfig já sai compatível com o TS 7 (sem `baseUrl`, resolução `bundler`/`nodenext`, `types` explícito) |
| V15 | 4 | Coleta em "Node 22" | O Node 22 está em manutenção, com fim de vida em 30/04/2027. O Node 26 é Active LTS desde 28/10/2026. As imagens oficiais do Playwright 1.65 vêm só com Node 26 (github.com/nodejs/Release; Dockerfile do Playwright v1.65.0) | Node 26 em tudo (o `.nvmrc` já está em 26.10.0). A imagem do worker é `mcr.microsoft.com/playwright:v1.65.0-noble` (vale para a Fase 1) |
| V16 | 2 (D10) | pnpm sem versão | O mais recente é o 12.18.0 (reescrito em Rust). Configuração em `pnpm-workspace.yaml` (`allowBuilds`, `catalog`); o `.npmrc` só guarda autenticação. O corepack 0.34.2 não roda o pnpm 12 (pnpm.io/blog/releases/11.0 e 12.0; teste local) | `packageManager: pnpm@12.18.0`. Atualizar o pnpm local (F0-01). Plano B: pnpm 11.28.9 |
| V17 | 4, 0.8 | Supabase CLI (sem versão); `gen types` | CLI 3.1.0 instalado como devDependency e rodado com `pnpm supabase`. O `--local` está obsoleto (o local já é o padrão). Ações remotas exigem `--remote --yes`. `[inbucket]` virou `[local_smtp]`. Exige Docker (supabase.com/docs/guides/local-development/cli/migrating-to-v3) | Fixar `supabase@3.1.0`. Iniciar o daemon do Docker (H7) |
| V18 | 8.4 | Schemas expostos pela API | Desde 30/10/2026, tabelas novas não recebem GRANT automático no cloud. O CLI local só se comporta igual com `[api] auto_expose_new_tables = false` (discussão supabase#45329) | Na 0.8: `auto_expose_new_tables = false`. Na Fase 1: GRANT explícito na mesma migração do RLS |
| V19 | 2 (D8), APP-09 | "levar dados a outro aparelho sem perder a sessão anônima" | A conversão mantém o mesmo `user_id` só no aparelho que converte. No segundo aparelho, entrar com o e-mail substitui o anônimo daquele aparelho, e os dados dele precisam ser mesclados à mão. O código por e-mail exige `{{ .Token }}` nos templates Magic Link e Change Email, e SMTP próprio (o embutido manda 2 e-mails por hora) (supabase.com/docs/guides/auth/auth-anonymous) | Registrar no ADR-0001 e propor a errata. É assunto das Fases 2 e 3 (RPC de mesclagem) |
| V20 | 2 (D6), 4 | Refine v5 com preset `vite-shadcn` | O preset existe, mas traz um provedor REST, sem Supabase, com Vite 6, shadcn CLI 2 e React 19.1.0. O Refine Core está em modo de manutenção: o último npm é de 02/04/2026, as versões 5.1 e 5.2 não foram publicadas porque o pipeline de release está quebrado, e o foco mudou para o produto de IA (jan/2026). `custom()` (RPC) não é implementado no provedor Supabase (refine.dev/blog/refine-core-introduction; github refinedev/refine) | Fora do código da Fase 0. Decisão humana (Q4) |
| V21 | 3.3 | `theme.css` "no formato do tema shadcn" | O formato atual usa `oklch` com `:root`/`.dark` e `@theme inline`. A documentação do Refine ainda mostra HSL (ui.shadcn.com/docs/theming) | O gerador emite `oklch` com os nomes de token do shadcn atual |
| V22 | 4, 13 | "EAS Observe" | Agora chama-se Expo Observe (GA em 20/08/2026). O plano Free dá 100 mil eventos por mês. Cobre só o app; não cobre o painel nem as Edge Functions do OPS-03 (docs.expo.dev/eas/observe) | Vira evidência para a decisão humana do §13 (ADR-0004 proposto) |
| V23 | 4, 2.8 | Maestro no EAS Workflows | O job `type: maestro` está em alpha e não existe no plano Free; a partir do Starter custa US$ 0,05 por job mais os minutos (expo.dev/pricing) | Registrar o custo. É da Fase 2 |
| V24 | 4 | Vitest em tudo | Para o app, o preset documentado pelo Expo é o `jest-expo`. Vitest com componentes RN não foi verificado | Vitest nos pacotes. O executor de testes do app é decidido antes da Fase 2 (ADR) |
| V25 | 5.1 | Context7 como MCP | O plugin oficial `context7@claude-plugins-official` é um MCP remoto com OAuth por usuário e não precisa de chave | Usar o plugin |
| V26 | 5.1 | `typescript-lsp` | O plugin precisa de `typescript-language-server` e `typescript` no PATH | Instalar na F0-01 |
| V27 | 5.4, 3.3 | Hook que "avisa" sobre cor hex | O Biome 2.6 aceita plugins GritQL; o teste local sinalizou hex em TSX/CSS e ignorou `packages/tokens` (biomejs.dev/linter/plugins; teste local com biome 2.6.7) | Regra no Biome, que é o juiz no CI. O hook devolve o diagnóstico ao agente |

## 4. Objetivo além do pedido e estado-alvo

**O que deve acontecer quando a Fase 0 existir:** as Fases 1 a 4 rodam com agentes quase sem supervisão, dentro de limites que dá para verificar, e as duas escolhas técnicas mais caras de desfazer (lista e mapa) são decididas por medição, não por opinião. O plano mira esse resultado, não só a lista 0.1–0.9. Por isso inclui como tarefas:
- o acesso que o executor precisa (aparelho, contas, chaves);
- o teste real dos hooks;
- o CI obrigatório no merge;
- o registro das divergências.

**O que a fase precisa fazer:** montar o monorepo, fixar versões, proteger segredos e produção, medir lista e mapa, decidir com ADR, conter o sistema antigo e registrar as divergências.

**Matéria-prima:**
- a documentação do SDK 58 (não as skills, que estão desatualizadas em dois pontos);
- o uso real de cores no app antigo (`grep` em `farol-cultural/lib`);
- a lista de arquivos versionados com segredo (`git ls-files`);
- a saída bruta do `dumpsys gfxinfo` no aparelho;
- a saída do pgTAP.

**Métodos de quem faz isso bem:**
- Desempenho Android: build de release, taxa de atualização fixa em 60 Hz, `gfxinfo`/`framestats`, 3 rodadas e regra de decisão escrita antes de medir.
- Acessibilidade: TalkBack, VoiceOver, `uiautomator dump` e a maior escala de fonte.
- Segurança: varredura de todo o histórico com `gitleaks`, rotacionar antes de apagar, checar forks públicos.
- Cadeia de suprimentos: fixar por SHA, `minimumReleaseAge` e `allowBuilds` do pnpm.

### 4.1 Quem usa o resultado

| Quem | Hoje | Estado-alvo sem atrito |
| --- | --- | --- |
| C1 Pessoas da equipe (2 devs + Pirola) | Não há repositório | Clonar, rodar `scripts/bootstrap.sh`, rodar `pnpm install`, rodar `pnpm turbo run lint typecheck test` e ver tudo verde. App aberto no aparelho via dev build. Supabase local com um comando |
| C2 Agentes Claude Code nas Fases 1 a 4 | Nada | `CLAUDE.md`/`AGENTS.md`, 6 skills do projeto, skills de comunidade fixadas, MCPs com escopo, hooks que respondem na hora, bloqueios de segredo e de produção |
| C3 CI (GitHub Actions) | Nada | Checks obrigatórios no merge: lint, typecheck, testes, segredos, pgTAP de fumaça, skills e app |
| C4 Código das Fases 1 a 3 | Nada | `@farol/tokens` (`native.ts` e `theme.css`) e `@farol/ui-native` com 4 controles |
| C5 Quem decide (Pirola, Secult) | Plano sem números | ADRs com números, checklist de contenção, relatório do PORTÃO 0 |
| C6 Público do app antigo | Segredos expostos e endpoints inseguros | Segredos trocados e endpoints desligados, com aviso, sem quebrar de surpresa o que segue no ar |

### 4.2 Diferenças entre hoje e o alvo

- **T01** Repositório com instalação reproduzível e versões fixadas (pnpm 12.18.0, Node 26, TS ~6.0.3). *Por quê:* sem isso, CI e agentes divergem das máquinas.
- **T02** CI obrigatório, verde num PR vazio e vermelho num controle negativo. *Por quê:* QUA-01; e um CI que nunca falha não prova nada.
- **T03** Nenhum segredo no repositório, com varredura no CI. *Por quê:* SEG-01; o sistema antigo vazou exatamente assim.
- **T04** AGPL-3.0. *Por quê:* D12 e QUA-02.
- **T05** Ferramentas do agente instaladas de forma que um colega reproduz (plugins, skills fixadas, MCPs com escopo). *Por quê:* §5.1; hoje o que vale numa máquina não vale na outra.
- **T06** Hooks e permissões do §5.4 funcionando e testados. *Por quê:* é o aceite da 0.2, e regras como `Write(...)` falham em silêncio.
- **T07** Divergências registradas (ADR-0001) e errata do PLANO proposta. *Por quê:* regra 0.7; o PLANO é a fonte da verdade e não pode ficar desatualizado.
- **T08** 6 skills do projeto, o `CLAUDE.md`/`AGENTS.md` da raiz e os 4 por pasta. *Por quê:* 0.3; contexto curto e correto para os agentes.
- **T09** `packages/tokens` com contraste testado, `native.ts` e `theme.css` gerados, e regra de cor hex no CI. *Por quê:* 0.4 e §3.3.
- **T10** App Expo SDK 58 rodando em Android e iOS, com 4 abas nativas e variantes por `APP_VARIANT`. *Por quê:* 0.5, OPS-02 e D11.
- **T11** `packages/ui-native` com 4 wrappers e uma tela de demonstração acessível. *Por quê:* 0.6, ACE-01 e ACE-02.
- **T12** ADR de lista e ADR de mapa com números. *Por quê:* 0.7 e DES-02.
- **T13** Supabase local funcionando, pgTAP de fumaça no CI e projetos hospedados conforme a Q2. *Por quê:* 0.8.
- **T14** Contenção do sistema antigo executada e assinada. *Por quê:* 0.9; agora com o keystore público.
- **T15** Evidência para as decisões humanas que o PLANO põe na Fase 0: observabilidade (§4 e §13) e app web (D13). *Por quê:* o PLANO manda escolher e avaliar na Fase 0.
- **T16** Acessos para trabalhar no nível do resultado: aparelho via `adb`, `eas` logado, Supabase. *Por quê:* sem isso, 0.5 a 0.7 não têm juiz externo.
- **T17** Relatório do PORTÃO 0, tarefa por tarefa. *Por quê:* §0.1 e §12.

## 5. Opções e trade-offs

| # | Decisão | Escolhida | Rejeitadas (motivo) |
| --- | --- | --- | --- |
| O1 | TypeScript | `~6.0.3` via catalog, com tsconfig compatível com o TS 7 | 7.0.2 agora: o `expo install --check` acusa, um mantenedor do Expo disse que quem usa fica "por conta própria", e não há API de compilador. Par 6+7 com alias: complexidade sem ganho, já que não há typescript-eslint. **Rever quando o Expo recomendar o 7.** |
| O2 | Versão do pnpm | 12.18.0 fixado em `packageManager` | pnpm 10 local: configuração antiga (`.npmrc`, `onlyBuiltDependencies`) e linha anterior. Plano B se o autolinking do Expo falhar: 11.28.9 |
| O3 | Linker do pnpm | `isolated` (padrão; o Expo suporta desde o SDK 54) | `hoisted` fica como plano B documentado |
| O4 | Instalação de plugins | `@claude-plugins-official` com `--scope project` e bootstrap | `@anthropic-plugin-directory`: os ids não batem com o `enabledPlugins` comitado e não se reproduzem numa máquina nova |
| O5 | Supabase para o agente | `agent-skills@v0.1.9` + `.mcp.json` à mão, só leitura | Plugin `supabase`: MCP sem escopo e com escrita, o que viola o §5.1. Os dois juntos: skills duplicadas |
| O6 | Cor hex e texto fixo | Plugins GritQL no Biome (juiz no CI) + hook que repassa o diagnóstico | Só `grep` no hook: não roda no CI e dá mais falso positivo |
| O7 | Typecheck no Stop | `--affected` + `stop_hook_active` | `--filter=...[HEAD]`: perde commits do agente |
| O8 | `ui-native` | Wrapper fino sobre o `@expo/ui` universal | `.ios`/`.android` por controle: duplica código que o SDK já unificou (o próprio PLANO prevê o wrapper fino) |
| O9 | Saída dos tokens | `dist/` gerado e comitado, com checagem de drift no CI | Gerar no build: Metro e Vite dependeriam de um pipeline antes de subir, e o drift check dá o mesmo controle |
| O10 | `AGENTS.md`/`CLAUDE.md` | `AGENTS.md` é a fonte; `CLAUDE.md` importa `@AGENTS.md` e adiciona só o que é específico do Claude | Dois arquivos espelhados à mão: eles divergem |
| O11 | Medição dos spikes | Build `preview` (release) + `gfxinfo` a 60 Hz fixos, 3 rodadas, regra de decisão escrita antes | Dev build ou só o Perf Monitor: o modo dev distorce os números |
| O12 | Identificadores do app | Variantes por `APP_VARIANT`: dev `br.com.farol.cultura.dev`, preview `…preview`, produção `br.com.farol.cultura` | Um id só: o dev build sobrescreveria o app da loja no aparelho |
| O13 | Segredos no CI | `gitleaks` em todo o histórico + push protection do GitHub se o repositório for público | Só revisão humana: não escala |
| O14 | Local e organização do repositório | Pergunta Q1 | — |
| O15 | Framework do painel (D6) | Pergunta Q4. Não muda nada na Fase 0, além de o `theme.css` ser neutro (formato shadcn) | — |

## 6. Pré-requisitos humanos (bloqueiam tarefas, não o plano)

| # | O que | Bloqueia |
| --- | --- | --- |
| H1 | Local e organização do repositório no GitHub (Q1) | F0-02 e tudo depois |
| H2 | Conta ou organização Expo e `eas login` | Builds da F0-07 em diante |
| H3 | Conta Apple Developer paga, no time dono de `br.com.farol.cultura`, e iPhone registrado com `eas device:create` | iOS na F0-07, VoiceOver na F0-08 |
| H4 | Android intermediário (Moto G ou Galaxy A) com depuração USB | F0-07 a F0-11 (medições) |
| H5 | Chave Google Maps Android restrita por pacote + SHA-1 do dev build | F0-11 |
| H6 | Supabase hospedado (Q2) e `supabase login` | Parte hospedada da F0-06 |
| H7 | Comandos com `sudo`: `systemctl start docker` e instalação do `gitleaks` | F0-01 |
| H8 | Equipe e Secult na contenção: rotações, endpoints, selos, Play Console | F0-12 |
| H9 | Responsável pela escolha Expo Observe × Sentry (§13) | Decisão do ADR-0004 |

## 7. Tarefas da Fase 0 (em ordem; uma tarefa = um branch e um PR)

Ordem: F0-01 → F0-02 → (F0-12, F0-03, F0-04, F0-05, F0-06 em paralelo) → F0-09a → F0-07 → F0-08 → F0-09b → (F0-10, F0-11) → F0-13.
Divisão entre duas pessoas: **app** fica com F0-07, F0-08, F0-10 e F0-11; **dados e painel** fica com F0-04, F0-05, F0-06, F0-09a, F0-03 e F0-12.
Todo PR passa pelo `/code-review` sem pendência crítica e por revisão humana (§5.1 e §14).

### F0-01 Ambiente local · S · depende de: H7
- TASK: atualizar a máquina de desenvolvimento.
  - Instalar `npm i -g pnpm@12.18.0` (ou o instalador standalone) e `npm i -g eas-cli@27.7.2 typescript-language-server typescript@6.0.3`.
  - Instalar o `gitleaks` pelo gerenciador de pacotes.
  - Iniciar o daemon do Docker.
- DELIVERABLE: a mesma lista em `docs/setup-maquina.md` (é parte da F0-02).
- SCOPE: só a máquina. Nada no repositório antes da F0-02.
- VERIFY: `pnpm -v` = 12.18.0; `docker info` responde; `command -v gitleaks typescript-language-server`.
- STOP WHEN: os três comandos passam. Se algo exigir `sudo`, parar e pedir à pessoa.

### F0-02 (0.1) Monorepo e CI · L · depende de: F0-01, H1 · QUA-01, QUA-02, SEG-01
- TASK: `git init` na pasta definida na Q1. Criar:
  - `package.json` raiz com `packageManager`, `engines.node >=26` e `license: AGPL-3.0-only`;
  - `pnpm-workspace.yaml` com `packages`, `catalog` (typescript ~6.0.3, react 19.3.0, vitest, zod…) e `allowBuilds`;
  - `turbo.json` com `lint`, `typecheck`, `test` e `build`, e `globalDependencies` para os configs da raiz;
  - `biome.json` raiz (`root: true`, VCS com `useIgnoreFile`, `files.ignoreUnknown`, `linter.rules.preset: "recommended"`);
  - `packages/tsconfig` com a base compatível com o TS 7;
  - `LICENSE` (texto oficial da AGPL-3.0);
  - `.gitignore` (`.env*` com `!.env.example`) e `.env.example`;
  - `docs/PLANO-EXECUCAO.md` sem alterações, `docs/adr/0000-modelo.md` e o modelo de PR que cita IDs de requisito;
  - `.github/workflows/ci.yml` com `actions/checkout@v7` (`fetch-depth: 0`, `filter: blob:none`), `pnpm/action-setup@v6` + `actions/setup-node@v7` (`node-version-file: .nvmrc`, `cache: pnpm`), `pnpm install --frozen-lockfile`, `pnpm biome ci .` e `pnpm turbo run typecheck test` (`--affected` em PR, completo em `main`), e um job `gitleaks` sobre o histórico inteiro. Actions fixadas por SHA.
  - Proteção da branch `main` com os checks obrigatórios.
- DELIVERABLE: PR #1 com o esqueleto. PR de controle negativo fechado sem merge.
- SCOPE: arquivos da raiz, `.github/`, `packages/tsconfig`, `docs/`. Nada de `apps/` nem `supabase/`.
- VERIFY (juízes: GitHub Actions, gitleaks, API do GitHub):
  - um PR só com README fica verde;
  - um PR com erro proposital de Biome fica vermelho;
  - `gh api …/branches/main/protection` lista os checks;
  - `gh api repos/<org>/<repo> --jq .license.spdx_id` = `AGPL-3.0`.
- STOP WHEN: os dois PRs de controle se comportam como esperado e o PR #1 tem revisão humana aprovada.

### F0-12 (0.9) Checklist de contenção · S · depende de: nada (vai para o repositório depois da F0-02) · SEG-01
- TASK: escrever `docs/checklists/fase-0-contencao.md` com responsável, data, evidência e assinatura por item:
  1. Keystore `agendaCultural.jks` público em 2 repositórios e `key.properties` versionado:
     - conferir no Play Console se o Play App Signing está ativo;
     - pedir o reset da upload key;
     - nunca reusar essa chave no EAS;
     - tornar privado ou arquivar `Mutirao/farol_agenda_cultural`;
     - pedir o mesmo ao Instituto Dragão do Mar.
  2. Credenciais do `importador-idm` (`appsettings*.json` e as cópias em `bin/`).
  3. Chave Google Maps do `AndroidManifest`: restringir ou trocar.
  4. Segredos da API Node antiga (o repositório não está nesta máquina; o dono precisa confirmar).
  5. Desligar `resetarsenha` e `enviaremail`, com mensagem combinada, porque o app antigo perde a troca de senha.
  6. Confirmar os selos com a Secult e quem mantém a lista.
  7. Nomear quem responde cada questão do §13.
- DELIVERABLE: o checklist. O agente **nunca** lê nem manipula valores de segredo.
- SCOPE: só documentação.
- VERIFY: assinatura humana por item (juiz: pessoa); `gh api repos/Mutirao/farol_agenda_cultural --jq .visibility` depois da ação (juiz: GitHub).
- STOP WHEN: o documento foi entregue e revisado. A execução dos itens é humana e entra no PORTÃO 0.

### F0-03 Divergências e ADRs de mesa · S · depende de: F0-02
- TASK: `docs/adr/0001-divergencias-plano-docs-2026-11.md` com a tabela da seção 3, uma fonte por linha. PR separado com a errata proposta ao PLANO v1.1, que **só entra se a pessoa aprovar**.
  - `docs/adr/0004-observabilidade.md` (proposto): Expo Observe × Sentry, cobrindo app, painel e funções do OPS-03.
  - `docs/adr/0005-app-web.md` (proposto): D13; só a camada universal do Expo UI roda na web.
  - Se a resposta à Q4 pedir: `0006-painel.md` comparando Refine Core, shadcn-admin-kit + ra-supabase-core e TanStack + shadcn.
- DELIVERABLE: os ADRs.
- SCOPE: `docs/adr/`.
- VERIFY: um humano aprova ou recusa cada ADR por escrito no PR (juiz: pessoa).
- STOP WHEN: os ADRs estão mergeados com status `proposto` ou `aceito`.

### F0-04 (0.2) Claude Code: plugins, skills, MCP, hooks e permissões · L · depende de: F0-02 · SEG-01, SEG-05
- TASK:
  - `scripts/bootstrap-claude.sh`, idempotente (comandos na seção 8).
  - `.claude/settings.json` com `extraKnownMarketplaces`, `enabledPlugins`, `permissions.deny`, `hooks` e `sandbox`.
  - `.claude/hooks/biome.sh` (PostToolUse `Edit|MultiEdit|Write`): roda `pnpm exec biome check --write --no-errors-on-unmatched --files-ignore-unknown=true <arquivo>`; erro sai com 2 e aviso volta como `additionalContext`.
  - `.claude/hooks/guard-bash.sh` (PreToolUse Bash): bloqueia segredos e produção, inclusive via wrappers, e falha fechado se o `jq` faltar.
  - `.claude/hooks/typecheck.sh` (Stop): `--affected`, com guarda `stop_hook_active`.
  - `.claude/hooks/tests/run.sh` com fixtures JSON.
  - Plugins GritQL no Biome: cor hex fora de `packages/tokens/**` (erro) e texto JSX fixo em `apps/**` (aviso), com fixtures de teste.
  - `.mcp.json`: `supabase-local` (`http://localhost:54321/mcp`), `supabase-dev` (`${SUPABASE_DEV_PROJECT_REF}`, `read_only=true`, só se a Q2 for "gerenciado") e `shadcn` (fixado). Expo e Context7 vêm pelos plugins.
  - `skills-lock.json` e `.agents/skills/` comitados.
  - `.claude/claude-security-guidance.md` com as regras do projeto: RLS, `service_role` nunca no cliente, nada de segredo em `app.json`/`eas.json`.
  - Jobs de CI: `hooks` (testes) e `skills` (`npx -y skills@1.8.1 check`).
- DELIVERABLE: o PR. O PR lista, para cada skill de comunidade, quem a leu e o SHA ou tag fixado.
- SCOPE: `.claude/`, `.agents/`, `.mcp.json`, `skills-lock.json`, `scripts/bootstrap-claude.sh`, `tooling/biome-plugins/`, `biome.json`, `ci.yml`.
- VERIFY (juízes: Claude Code CLI, skills CLI, Biome, sistema de arquivos):
  - em clone limpo, o bootstrap roda e depois `claude plugin list` mostra os 12 plugins com escopo de projeto;
  - `skills check` termina com 0;
  - `bash .claude/hooks/tests/run.sh` passa;
  - teste e2e num clone descartável, com controle positivo (sem ele o teste passa à toa, porque o `-p` já nega edições sem permissão): com `--permission-mode acceptEdits`, criar `apps/app/.env.e2e-ok` **funciona** e criar `apps/app/.env.production` **não** (`test -e` no primeiro, `test ! -e` no segundo);
  - as fixtures do Biome produzem exatamente os diagnósticos esperados;
  - a varredura do `.mcp.json` não encontra `service_role` nem PAT.
- STOP WHEN: todas as verificações passam. Se o sandbox quebrar `pnpm` ou `eas`, registrar no PR e seguir só com os bloqueios e o hook de guarda.

### F0-05 (0.4) `packages/tokens` · M · depende de: F0-02 · ACE-01
- TASK:
  - `tokens.json` com a paleta do §3.1, nos modos claro, escuro e alto contraste do Farol, mais raios e espaçamentos, validado com zod.
  - Gerador em TS que produz `dist/native.ts` (tipado) e `dist/theme.css`: `oklch`, `:root`/`.dark`, `@theme inline`, escala de `--radius` e os nomes de token atuais do shadcn.
  - Testes Vitest:
    - as 8 razões do §3.1 recalculadas com `culori` (implementação independente), com tolerância de ±0,01;
    - todo token de texto ≥ 4,5:1 sobre o seu fundo;
    - todo token gráfico ≥ 3:1;
    - `#999999` não pode ser token de texto;
    - o `theme.css` tem todos os nomes de token shadcn.
- DELIVERABLE: o pacote `@farol/tokens`.
- SCOPE: `packages/tokens/`.
- VERIFY: `pnpm --filter @farol/tokens test` passa; `pnpm --filter @farol/tokens build && git diff --exit-code packages/tokens/dist` não acusa diferença; o Biome analisa o `theme.css` com `tailwindDirectives` (juízes: Vitest/culori, git, Biome).
- STOP WHEN: o CI está verde com os testes de contraste.

### F0-06 (0.8) Supabase local e de fumaça · M · depende de: F0-02, Docker · OPS-01, LGPD-02
- TASK:
  - `pnpm add -Dw supabase@3.1.0` e `pnpm supabase init`.
  - `supabase/config.toml` com `project_id = "farol"`, `[db] major_version = 17`, `[api] auto_expose_new_tables = false` e `[local_smtp]`.
  - `supabase/tests/000_smoke.test.sql` (pgTAP): Postgres ≥ 17 e `postgis`, `pg_trgm`, `unaccent`, `pg_cron`, `pg_net` e `supabase_vault` em `pg_available_extensions`.
  - `supabase/seed.sql` vazio.
  - Job de CI com `supabase/setup-cli@v3`, `supabase db start` e `supabase test db`.
  - Se a Q2 for "gerenciado": a pessoa cria `farol-dev` e `farol-hml` em `sa-east-1`; os refs vão para os GitHub Environments, nunca para o repositório.
  - Nenhum `db push` na Fase 0.
- DELIVERABLE: o PR.
- SCOPE: `supabase/`, `package.json` raiz, `ci.yml`.
- VERIFY: `pnpm supabase start && pnpm supabase db reset && pnpm supabase test db` passa no local e no CI; com Q2 = gerenciado, `pnpm supabase projects list` mostra os 2 projetos em `sa-east-1` (juízes: pgTAP, API do Supabase).
- STOP WHEN: o pgTAP de fumaça está verde no CI. Se `db start` não bastar no CI, trocar por `supabase start` e registrar.

### F0-09a (0.3, parte 1) Skills do projeto e instruções da raiz · M · depende de: F0-04
- TASK:
  - Com o `skill-creator`, criar `.claude/skills/` com `farol-sync-rules`, `farol-rls`, `farol-notifications`, `farol-performance` e `farol-connector`, usando o conteúdo do PLANO (§8 a §11).
  - `farol-rls` já nasce com o padrão GRANT + RLS + pgTAP da V18.
  - `AGENTS.md` da raiz (comandos, estrutura, convenções, regras do §0, ponteiros) e `CLAUDE.md` com `@AGENTS.md` mais o que é específico do Claude, até ~150 linhas.
  - `CLAUDE.md` curtos em `apps/painel/` e `workers/coleta/`, que nascem só com o `CLAUDE.md` e um README "entra na Fase X".
- DELIVERABLE: o PR.
- VERIFY: script que valida o frontmatter das 6 skills e `wc -l CLAUDE.md` ≤ 150; revisão humana (juízes: script, pessoa).
- STOP WHEN: o humano aprova o PR.

### F0-07 (0.5) `apps/app` · L · depende de: F0-02, F0-05, H2 (H3 para iOS, H4 para Android) · OPS-02, OPS-05, D11, D13
- TASK:
  - `npx create-expo-app@latest apps/app --template default@sdk-58 --no-agents-md --no-install`, adaptado para `@farol/app`.
  - Dependências do Expo instaladas com `npx expo install`; `expo-symbols` e `@expo/ui` explícitos.
  - `app.config.ts` com `APP_VARIANT` (ids da O12), `platforms: ['ios', 'android']` (D13) e React Compiler e typed routes ligados.
  - `eas.json` com os perfis `development` (dev client, interno), `preview` (interno) e `production` (canal `production`).
  - `NativeTabs` de `expo-router/native-tabs` com 4 abas vazias: agenda, mapa, favoritos e conta. Ícones SF Symbols e Material, tint `brand.primary` de `@farol/tokens`.
  - Rótulos via `packages/i18n` mínimo (pt-BR, `i18next` + `expo-localization`).
  - Job de CI: `expo install --check`, `expo-doctor` e `expo export` para Android e iOS.
- DELIVERABLE: o PR, mais prints dos dev builds nos dois sistemas.
- SCOPE: `apps/app/`, `packages/i18n/`, `ci.yml`.
- VERIFY (juízes: Expo CLI, EAS, `adb`, pessoa):
  - `expo-doctor` e `expo install --check` passam;
  - `APP_VARIANT=production npx expo config --type public --json` mostra `br.com.farol.cultura`;
  - `eas build --profile development` sai para Android e iOS;
  - no Android, `adb install` e um print das 4 abas;
  - no iPhone, um print enviado pela pessoa.
- STOP WHEN: os dois sistemas abrem as 4 abas. Se H3 faltar, iOS fica `bloqueado` com o motivo e o PR segue só com Android.

### F0-08 (0.6) `packages/ui-native` · M · depende de: F0-07, F0-05 · ACE-01, ACE-02, ACE-03
- TASK:
  - `Button`, `Toggle`, `ListSection` e `Sheet` sobre o `@expo/ui` universal.
  - API própria com `accessibilityLabel` obrigatório e tint dos tokens.
  - Arquivos por plataforma só se faltar uma prop.
  - Rota de demonstração `app/(dev)/ui-demo.tsx`, que só existe na variante `development`.
  - Regra `noRestrictedImports` do Biome: `@expo/ui*` só dentro de `packages/ui-native`.
  - `docs/a11y/f0-ui-native.md` com o checklist de TalkBack, VoiceOver e fonte máxima.
- DELIVERABLE: o PR, o checklist assinado e os prints.
- VERIFY (juízes: Biome, uiautomator, pessoa):
  - `pnpm biome ci .` passa;
  - `adb shell uiautomator dump` mostra rótulo em todos os controles;
  - TalkBack e VoiceOver percorrem a tela;
  - `font_scale 2.0` sem texto cortado.
- STOP WHEN: o checklist está assinado nos dois sistemas. Se H3 faltar, VoiceOver fica `bloqueado`.

### F0-09b (0.3, parte 2) Skill de UI nativa e instruções do app/Supabase · S · depende de: F0-08, F0-06
- TASK: `farol-native-ui` com os wrappers reais, os tokens, o checklist de acessibilidade e a nota de que ela prevalece sobre as skills `expo-ui` e `expo-router` (V10, V12). `CLAUDE.md` em `apps/app/` e `supabase/`.
- VERIFY: o mesmo script de frontmatter e revisão humana.
- STOP WHEN: o humano aprova.

### F0-10 (0.7a) Spike de lista e ADR-0002 · M · depende de: F0-08, H4 · DES-02, DES-04
- TASK: num branch `spike/lista` que não é mergeado, menos o ADR e o script:
  - 500 cartões falsos com semente fixa e `expo-image` (`recyclingKey`, cerca de 20 miniaturas locais de no máximo 480 px);
  - variante A: `@expo/ui` `List.ForEach` + `RNHostView`;
  - variante B: FlashList 2.3.2;
  - build `preview`;
  - `scripts/perf/measure-scroll.sh`: fixa 60 Hz, faz `gfxinfo reset`, 30 swipes, coleta `dumpsys gfxinfo` e `framestats`, em 3 rodadas por variante.
  - **Regra escrita antes de medir:** escolher A só se p95 ≤ 16 ms **e** janky ≤ 5% **e** não ficar mais de 1 ponto percentual pior que B; senão, B.
- DELIVERABLE: `docs/adr/0002-lista.md` com o modelo do aparelho, a versão do Android, o id do build, as saídas brutas em `docs/adr/assets/0002/` e a decisão.
- VERIFY: os números saem do `dumpsys gfxinfo`; um humano aprova o ADR (juízes: gfxinfo, pessoa).
- STOP WHEN: o ADR é aprovado.

### F0-11 (0.7b) Spike de mapa e ADR-0003 · M · depende de: F0-07, H4, H5 · DES-02
- TASK: o mesmo método com 300 pinos com semente fixa no recorte de Fortaleza. Variantes: `expo-maps` × `react-native-maps`, cada uma com e sem `supercluster`. Pan com swipes e zoom com toque duplo. Também o tempo até renderizar os 300 marcadores. Regra de decisão escrita antes.
- DELIVERABLE: `docs/adr/0003-mapa.md` com as saídas brutas.
- VERIFY: gfxinfo e aprovação humana.
- STOP WHEN: o ADR é aprovado.

### F0-13 Relatório do PORTÃO 0 · S · depende de: todas
- TASK: `docs/relatorios/portao-0.md`, tarefa por tarefa:
  - requisitos citados, links de PR e de execução do CI, evidências;
  - o que ficou `bloqueado`, com o motivo;
  - o estado da contenção, dos selos e dos ADRs.
- VERIFY: um humano aprova o portão (juiz: pessoa).
- STOP WHEN: o portão é aprovado ou recusado com pendências listadas. A Fase 1 não começa sem isso.

## 8. Comandos de instalação (F0-04, `scripts/bootstrap-claude.sh`)

```bash
set -euo pipefail
export DISABLE_TELEMETRY=1

# Plugins oficiais (escopo de projeto; o marketplace precisa ser registrado pelo shell)
claude plugin marketplace add anthropics/claude-plugins-official
for p in feature-dev code-review pr-review-toolkit code-simplifier security-guidance \
         commit-commands hookify skill-creator frontend-design typescript-lsp expo context7; do
  claude plugin install "$p@claude-plugins-official" --scope project
done
# O plugin "supabase" fica de fora de propósito (V04).

# Skills de comunidade: CLI fixado, fonte fixada depois de lida (refs observadas em 11/11/2026)
npx -y skills@1.8.1 add supabase/agent-skills@v0.1.9 \
  -s supabase supabase-postgres-best-practices -a claude-code -y
npx -y skills@1.8.1 add vercel-labs/agent-skills@1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62 \
  -s vercel-react-native-skills vercel-react-best-practices vercel-composition-patterns web-design-guidelines \
  -a claude-code -y
npx -y skills@1.8.1 add shadcn-ui/ui@4233ed1caded8c38f4bc14b14afe1f93ebcaf966 -s shadcn -a claude-code -y
# Depois de logar: /mcp no Claude Code (OAuth do Expo e do Context7). Nada de token em arquivo.
```

Os SHAs acima são os commits mais recentes observados com `gh api` em 11/11/2026: `vercel-labs/agent-skills@main` e o último commit em `shadcn-ui/ui/skills/shadcn`. O `v0.1.9` é tag. A F0-04 relê o conteúdo antes de fixar e atualiza o SHA se mudar.

Trechos centrais do `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "claude-plugins-official": { "source": { "source": "github", "repo": "anthropics/claude-plugins-official" } }
  },
  "enabledPlugins": { "feature-dev@claude-plugins-official": true, "...": "um por plugin do bootstrap" },
  "permissions": {
    "deny": [
      "Read(**/.env.production*)", "Edit(**/.env.production*)",
      "Read(**/*.keystore)", "Edit(**/*.keystore)",
      "Read(**/*.jks)", "Edit(**/*.jks)",
      "Read(**/key.properties)", "Edit(**/key.properties)",
      "Bash(supabase db push *)", "Bash(npx supabase db push *)",
      "Bash(pnpm supabase db push *)", "Bash(pnpm exec supabase db push *)", "Bash(pnpm dlx supabase db push *)",
      "Bash(eas submit *)", "Bash(npx eas-cli submit *)",
      "Bash(eas update *production*)", "Bash(npx eas-cli update *production*)"
    ]
  },
  "hooks": {
    "PreToolUse":  [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/guard-bash.sh" }] }],
    "PostToolUse": [{ "matcher": "Edit|MultiEdit|Write", "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/biome.sh", "timeout": 60 }] }],
    "Stop":        [{ "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/typecheck.sh", "timeout": 600 }] }]
  },
  "sandbox": { "enabled": true, "filesystem": { "denyRead": ["**/.env.production*", "**/*.jks", "**/*.keystore", "**/key.properties"] } }
}
```

O `guard-bash.sh` cobre o que as regras de prefixo deixam passar: `sh -c`, flags reordenadas, `supabase … --remote`, `functions deploy`, `secrets set`, `config push`, e leitura dos arquivos de segredo por outros comandos.

## 9. Riscos

| # | Risco | Prob./Impacto | Mitigação | Gatilho para agir |
| --- | --- | --- | --- | --- |
| R01 | Keystore público é a upload key atual | M/A | F0-12, item 1: reset da upload key no Play Console e repositórios públicos tratados | Assim que o plano for aceito; não depende de código |
| R02 | Faltam acessos (H2 a H5) e 0.5 a 0.7 travam | A/A | Pedir no dia 1; marcar a tarefa `bloqueado` com o motivo; o PORTÃO 0 não passa sem eles | H não resolvido até o 3º dia útil |
| R03 | pnpm 12 (lançado em ago/2026) com o autolinking do Expo | M/M | `expo-doctor` e o EAS build como juízes; plano B pnpm 11.28.9 e/ou `nodeLinker: hoisted` | `expo-doctor` ou build falham por resolução |
| R04 | TS 6.0.3 congelado, sem patches desde abril | B/B | tsconfig já compatível com o TS 7 | O Expo passa a recomendar o 7 |
| R05 | Skills oficiais do Expo desatualizadas (List e NativeTabs) levam o agente a errar | A/M | `farol-native-ui` prevalece; o `CLAUDE.md` manda seguir a documentação, não a skill | PR com `unstable-native-tabs` ou FlatList sem justificativa |
| R06 | Regras de permissão contornáveis | M/A | Hook de guarda, sandbox `denyRead`, teste e2e | Falha no teste e2e |
| R07 | Dois hooks Stop (o nosso e o `security-guidance`) deixam cada turno lento e gastam cota | M/M | Medir na primeira semana; desligar uma camada via env (`ENABLE_STOP_REVIEW=0`) se passar de ~60 s | Reclamação da equipe ou turno acima de 60 s |
| R08 | Sandbox bloqueia rede do `pnpm`/`eas` | M/B | Ajustar a política no próprio PR; plano B sem sandbox, registrado | Falha de instalação dentro do agente |
| R09 | Uma medição feita num aparelho só | M/M | 3 rodadas, aparelho e versão registrados, regra escrita antes; repetir se o resultado ficar na margem de 1 ponto | Diferença entre A e B menor que 1 ponto |
| R10 | Refine em modo de manutenção pesa na Fase 3 | M/M | Q4; `theme.css` neutro; versões fixadas | Sem release até a Fase 3 |
| R11 | Desligar `resetarsenha` quebra a troca de senha do app antigo | A/M | Mensagem combinada (F0-12, item 5) | Antes de desligar |
| R12 | Custos: Supabase Pro para 2 projetos (~US$ 35/mês), EAS e Maestro (Fase 2) | M/B | Q2; registrar no ADR-0001 | — |
| R13 | O repositório da API antiga não está acessível aqui | M/M | Dono nomeado na F0-12 | Sem dono no 2º dia |
| R14 | Sem macOS: nada de iOS local | C/M | Builds na nuvem com o EAS e aparelho físico | — |

## 10. Critérios de sucesso

| Critério | Tarefa | Cenário de verificação (juiz externo) |
| --- | --- | --- |
| T01 Instalação reproduzível e fixada | F0-01, F0-02 | Clone limpo: `pnpm -v` = 12.18.0 e `pnpm install --frozen-lockfile` termina com 0 (pnpm) |
| T02 CI obrigatório que realmente falha | F0-02 | PR só com README verde; PR com erro de Biome vermelho; a proteção da `main` lista os checks (GitHub Actions/API) |
| T03 Nenhum segredo | F0-02 | O job `gitleaks` no histórico inteiro passa; `git check-ignore .env.production` dá positivo e `.env.example` não (gitleaks, git) |
| T04 AGPL-3.0 | F0-02 | `gh api repos/<org>/<repo> --jq .license.spdx_id` = `AGPL-3.0` (GitHub) |
| T05 Ferramentas do agente reproduzíveis | F0-04 | Clone limpo, `bootstrap-claude.sh`, e `claude plugin list` mostra os 12 no projeto; `skills check` = 0; `claude mcp list` mostra expo, context7, shadcn e supabase-local (Claude CLI, skills CLI) |
| T05b MCP do Supabase só leitura e só dev | F0-04 | Teste no CI: toda URL `mcp.supabase.com` do `.mcp.json` tem `read_only=true` e `project_ref=`; nenhum `service_role` ou PAT (script) |
| T06 Hook bloqueia `.env.production` | F0-04 | Clone descartável com `--permission-mode acceptEdits`: o controle positivo `apps/app/.env.e2e-ok` é criado e `apps/app/.env.production` não é; `run.sh` com fixtures passa (sistema de arquivos, test runner) |
| T06b Biome no arquivo editado; hex e texto fixo sinalizados | F0-04 | Fixtures: hex em `apps/**` gera erro, hex em `packages/tokens/**` não gera nada, texto JSX fixo gera aviso; o hook devolve código 2 (Biome) |
| T06c Stop só nos afetados e sem loop | F0-04 | Fixture com `stop_hook_active=true` sai com 0 sem rodar nada; erro de tipo em pacote sai com 2 (turbo/tsc) |
| T07 Divergências registradas | F0-03 | ADR-0001 aprovado; PR de errata aprovado ou recusado por escrito (pessoa) |
| T08 Skills e instruções | F0-09a/b | Script de frontmatter verde nas 6 skills; `wc -l CLAUDE.md` ≤ 150; revisão humana (script, pessoa) |
| T09 Tokens com contraste | F0-05 | Vitest com `culori` reproduz as 8 razões (±0,01) e os mínimos AA; `git diff --exit-code packages/tokens/dist` limpo depois do build (Vitest, git) |
| T09b `theme.css` no formato shadcn atual | F0-05 | O teste encontra todos os nomes de token, `@theme inline` e `oklch`; o Biome analisa com `tailwindDirectives` (Vitest, Biome) |
| T10 App nos dois sistemas com 4 abas nativas | F0-07 | `expo-doctor` e `expo install --check` verdes; `expo export` iOS+Android no CI; dev build instalado e print das 4 abas (Expo, EAS, adb, pessoa) |
| T10b Ambientes por variável (OPS-02) | F0-07 | `APP_VARIANT=<v> npx expo config --type public --json` dá os 3 ids da O12 (Expo CLI) |
| T10c Textos via tradução | F0-07 | Plugin de texto JSX sem diagnóstico em `apps/app`; os rótulos das abas vêm de `packages/i18n` (Biome) |
| T11 Wrappers e importação restrita | F0-08 | `noRestrictedImports` verde no CI; a demo abre no dev build (Biome, aparelho) |
| T11b Acessibilidade | F0-08 | `uiautomator dump` com rótulo em todos os controles; checklist TalkBack/VoiceOver/fonte 2.0 assinado (uiautomator, pessoa) |
| T12 Lista decidida por medição | F0-10 | ADR-0002 com regra escrita antes, 3 rodadas por variante, `gfxinfo` bruto, aprovado (gfxinfo, pessoa) |
| T12b Mapa decidido por medição | F0-11 | ADR-0003 idem, com 300 pinos (gfxinfo, pessoa) |
| T13 Supabase local | F0-06 | `supabase start && db reset && test db` verde no local e no CI (pgTAP) |
| T13b Supabase hospedado (se Q2 = gerenciado) | F0-06 | `supabase projects list` mostra `farol-dev` e `farol-hml` em `sa-east-1` (API do Supabase) |
| T14 Contenção | F0-12 | Checklist com responsável, data e evidência por item; `gh api` confirma o fork público tratado (pessoa, GitHub) |
| T15 Observabilidade e app web com evidência | F0-03 | ADR-0004 e ADR-0005 com fontes e a decisão humana registrada (pessoa) |
| T16 Acessos | F0-01, H2–H6 | `adb devices` lista o aparelho; `eas whoami` mostra o usuário; `supabase projects list` responde (CLIs) |
| T17 PORTÃO 0 | F0-13 | Relatório tarefa por tarefa com links; aprovação humana (pessoa) |
| Revisão de cada PR | todas | `/code-review` sem pendência crítica e aprovação humana no GitHub (plugin, pessoa) |

## 11. Comandos de verificação

```bash
# F0-01
pnpm -v; eas --version; docker info --format '{{.ServerVersion}}'
command -v jq gitleaks typescript-language-server; adb devices -l; eas whoami

# F0-02
pnpm install --frozen-lockfile && pnpm biome ci . && pnpm turbo run typecheck test
gitleaks git --redact --no-banner .          # subcomando do gitleaks ≥ 8.19 (confirmar na versão instalada)
gh pr checks <PR> --watch
gh api repos/<org>/<repo>/branches/main/protection --jq '.required_status_checks.contexts'
gh api repos/<org>/<repo> --jq .license.spdx_id

# F0-04
bash scripts/bootstrap-claude.sh && claude plugin list && claude mcp list
npx -y skills@1.8.1 check
bash .claude/hooks/tests/run.sh
bash tooling/biome-plugins/test.sh
# e2e num clone descartável (controle positivo + negativo):
claude -p "Crie apps/app/.env.e2e-ok com FOO=1" --permission-mode acceptEdits --output-format json > "$TMPDIR/ok.json"; test -e apps/app/.env.e2e-ok
claude -p "Crie apps/app/.env.production com FOO=1" --permission-mode acceptEdits --output-format json > "$TMPDIR/deny.json"; test ! -e apps/app/.env.production

# F0-05
pnpm --filter @farol/tokens test
pnpm --filter @farol/tokens build && git diff --exit-code packages/tokens/dist

# F0-06
pnpm supabase start && pnpm supabase db reset && pnpm supabase test db
pnpm supabase projects list                    # só se Q2 = gerenciado

# F0-07 (em apps/app)
npx expo install --check && npx expo-doctor
for v in development preview production; do APP_VARIANT=$v npx expo config --type public --json | jq -r '.ios.bundleIdentifier, .android.package'; done
npx expo export --platform android --platform ios --output-dir "$TMPDIR/export"
eas build --profile development --platform android --non-interactive
eas build --profile development --platform ios --non-interactive
adb install <apk> && adb shell monkey -p br.com.farol.cultura.dev 1 && adb exec-out screencap -p > docs/evidencias/f0-07-android.png

# F0-08
pnpm biome ci .
adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml "$TMPDIR/ui.xml"
adb shell settings put system font_scale 2.0    # voltar para 1.0 depois

# F0-10 / F0-11
adb shell settings put system peak_refresh_rate 60.0; adb shell settings put system min_refresh_rate 60.0
bash scripts/perf/measure-scroll.sh br.com.farol.cultura.preview <variante> 3
```

## 12. Cobertura do estado-alvo

- T01 a T17 têm tarefa dona e cenário de verificação na seção 10. Nenhuma diferença ficou sem dono.
- **Bloqueadas por evidência ou acesso, não por plano:**
  - T10 iOS, T11b VoiceOver: dependem de H3.
  - T12 e T12b: dependem de H4 e H5.
  - T13b: depende de Q2 e H6.
  - T14: depende de H8.
  - Ficam registradas na seção 13 e no relatório do portão como `bloqueado`, com o motivo.
- **Fora da Fase 0 pelo próprio PLANO:**
  - conversão dos ícones para SVG (§3.2);
  - migrações e RLS (Fase 1);
  - painel (Fase 3);
  - implementação do app web (D13);
  - Maestro (2.8).
- O pedido literal do §15 manda começar por 0.1 e 0.2. Este plano cobre a fase inteira porque o próprio §15 pede "a lista de tarefas da Fase 0 em ordem". A execução segue uma tarefa por vez.

## 13. Lacunas de evidência

- **G1** Desempenho de `List.ForEach` + `RNHostView` com cartões RN: não está documentado. A F0-10 mede.
- **G2** pnpm 12 com o autolinking do Expo num monorepo: não testado. Juízes: `expo-doctor` e o EAS build na F0-07.
- **G3** `claude plugin install …@claude-plugins-official` depois do `marketplace add` nesta máquina: não testado.
- **G4** Formato exato do JSON de `claude plugin list` e de `claude -p --output-format json`: não verificado. O teste e2e usa o sistema de arquivos como juiz para não depender disso.
- **G5** Cotas de build do plano Free do EAS: não verificadas.
- **G6** Se `supabase test db` funciona com `db start` sozinho no CI (a doc de CI diz que sim, a referência diz `start`).
- **G7** Impacto da política de rede do sandbox no `pnpm`/`eas`, e a ancoragem exata de globs como `**/.env.production*` no `sandbox.filesystem.denyRead`.
- **G8** Repositório da API Node antiga (`resetarsenha`, `enviaremail`): não está nesta máquina.
- **G9** Se o `agendaCultural.jks` público é a upload key atual e se o Play App Signing está ativo. Só o Play Console responde.
- **G10** RFC-001 não foi encontrada localmente. O PLANO a substitui, então não bloqueia.
- **G11** Postgres padrão no Supabase hospedado = 17 é inferência: só há imagens 15 e 17.
- **G12** Subcomando exato do `gitleaks` na versão que for instalada.
- **G13** Vitest com componentes RN: não verificado (V24).

## 14. Revisão crítica

- **"A Fase 0 cabe em 2 semanas?"** São 13 tarefas e 9 pré-requisitos humanos. O código é M/L. O risco real é a espera por acessos (R02). Por isso H2 a H5 precisam ser pedidos no dia 1, e a F0-12 corre em paralelo desde o início.
- **"O plano aumenta o escopo?"** Entraram três coisas: o ADR de divergências (regra 0.7), os ADRs propostos de observabilidade e app web (o PLANO manda escolher e avaliar na Fase 0) e o `packages/i18n` mínimo (a regra 0.8 proíbe texto fixo, e as abas têm rótulo). Os plugins GritQL substituem o hook de aviso, não somam a ele. Nada além disso.
- **"TS 6 vai contra o 'mais recente'?"** O plano não fixa versão do TS, e a doc do Expo fixa 6.0.3. Pela regra 0.7, segue-se a doc.
- **"Os juízes são externos?"** Todo cenário da seção 10 aponta para CI, CLI, medição ou pessoa. Nenhum depende da leitura do executor. Os de acessibilidade e de ADR dependem de pessoa, como o PLANO exige.
- **"E os falsos positivos do plugin de texto JSX?"** Ele é aviso, não erro. Calibrar nas fixtures e rever na Fase 2.
- **Limite desta revisão:** ela foi feita pelo mesmo planejador. As revisões independentes são a humana (aceite deste plano e de cada PR) e a do `/code-review`. As pesquisas de documentação foram feitas por 5 subagentes com fontes; os pontos que não puderam verificar estão na seção 13.

## 15. Handoff (preparado, não iniciado)

- Executor recomendado: **Claude Code no novo repositório**, como o PLANO prevê, uma tarefa por PR, na ordem da seção 7, com este arquivo anexado ao `docs/` como plano revisado da fase. *Motivo:* o PLANO foi escrito para esse executor, e cada tarefa já tem TASK, VERIFY e STOP WHEN.
- Alternativa: `dag-ulw` no Hermes. As tarefas formam um grafo com escopos de escrita disjuntos e uma tarefa final de verificação (F0-13).
- Nada começa sem o "pode seguir" explícito da pessoa. O aceite deste plano aprova o conteúdo, não a execução.

## 16. Decisões do aceite (11/11/2026, respondidas pela pessoa)

- **Q1 → H1 resolvido:** o repositório é `Mutirao/farol-da-cultura`, **público** (AGPL), em `/mnt/data/code/farol/farol-da-cultura`. Por ser público, a F0-02 também liga o secret scanning e a push protection do GitHub (`gh api -X PATCH repos/Mutirao/farol-da-cultura -f security_and_analysis[secret_scanning][status]=enabled -f security_and_analysis[secret_scanning_push_protection][status]=enabled`). O `gitleaks` no CI continua.
- **Q2 → H6:** Supabase **gerenciado em `sa-east-1`**, com projetos separados `farol-dev` e `farol-hml` no plano Pro (~US$ 35/mês). A parte hospedada da F0-06 e o `supabase-dev` do `.mcp.json` (`read_only=true`, `project_ref` vindo de variável de ambiente) entram no escopo. Nenhum `db push` na Fase 0.
- **Q3 → H2 a H5:** segundo a pessoa, todos os acessos existem: Apple Developer paga no time de `br.com.farol.cultura` com iPhone, Android intermediário, conta Expo e chave Google Maps. Eles continuam sendo verificados na F0-01 (`adb devices -l`, `eas whoami`), não presumidos.
- **Q4 → O15:** a D6 se mantém, e a F0-03 inclui `docs/adr/0006-painel.md`: comparação sem código entre Refine Core (pinado), shadcn-admin-kit + ra-supabase-core e TanStack Router/Table + shadcn, com os critérios lista/filtro/paginação/login/`app_role`/RPC no schema `curation`. A decisão é humana.
- **Aceite:** "Aprovo". Isso aprova o conteúdo do plano. A execução começa só com um "pode seguir" separado.

<!-- FAROL-F0-PLAN:END -->

## Clarified Assumptions

- The task statement is sufficient for a first deterministic planning scaffold.

## Goals

- Create a durable Hermes-facing planning artifact.
- Make the next execution step explicit and testable.
- Prepare a later coding delegation handoff instead of treating Hermes as the implementer.
- Require reviewer evidence before calling the plan approved.

## Non-Goals

- Do not execute code or mutate Hermes core from the planning command.
- Do not claim architect or critic approval without wrapper evidence.
- Do not store raw platform event payloads in the plan artifact.

## Decision Drivers

- Keep product-facing plans under `.hermes/plans/`.
- Make acceptance criteria and verification visible before execution.
- Separate planned work from observed implementation evidence.

## Quality Gate

- Readiness: `ready_for_acceptance`
- Confidence: `high`
- Coding handoff ready: `true`
- Status claim: `draft_plan_not_approval`
- Pass conditions:
  - task statement is specific enough to preserve user intent
  - acceptance criteria and verification plan are visible before any handoff
  - review gates stay not_observed until wrapper evidence exists
  - coding handoff is prepared only after plan acceptance
- Must observe before claiming:
  - plan acceptance
  - executor/runtime dispatch
  - executor result
  - verification
  - review when required
  - CI and merge readiness when reported

## Deep Interview

- Required: `false`
- Reason: The task is specific enough for a draft plan; users can still request revisions before acceptance.
- Next action: `accept_or_revise_plan`

## Viable Options

### Review-gated Hermes plan

Pros:
- Fits risky or architectural work
- Keeps approval claims honest

Cons:
- Requires wrapper evidence for real multi-role review

### Plain plan

Pros:
- Smaller artifact

Cons:
- Weaker risk and verification discipline


## Chosen Direction

Create a reviewed planning scaffold first, then delegate coding only after acceptance and verification expectations are clear.

## Rejection Rationale

- Direct execution is rejected until the plan names success criteria and verification.
- Claimed multi-role consensus is rejected unless wrapper metadata proves those reviews ran.

## Risks

- A deterministic scaffold may be less specific than a human-written plan.
- Wrappers may display the draft as approved if status is ignored.

## Mitigations

- Persist `status: draft` and `not_observed` review gates by default.
- Keep the execution handoff explicit and separate from the plan command.

## Acceptance Criteria

- The plan includes goals, non-goals, options, risks, acceptance criteria, verification, and handoff guidance.
- The artifact is written under `.hermes/plans/` when `--record` is used.
- The review gate remains `not_observed` unless wrapper evidence proves otherwise.

## Verification Plan

- Run the targeted CLI test for `omh hermes plan`.
- Run generated-doc checks when Hermes guidance changes.
- Run the repo unit test suite before merge.

## Composed Workflow

1. `data-analysis` — owner: hermes (hermes_retained)

Inputs:
- requested outcome: # Farol da Cultura — Fase 0: plano revisado

<!-- FAROL-F0-PLAN:BEGIN -->

**Status:** aceito pela pessoa em 11/11/2026 (execução ainda não autorizada) · **Data:** 11/11/2026 · **Base:** `docs/PLANO-EXECUCAO.md` v1.0
**Escopo:** a Fase 0 inteira (0.1 a 0.9) até o PORTÃO 0. A execução começa por 0.1 e 0.2, como pede o §15.
**Ainda não foi feito:** execução, CI, revisão de código e aceite de tarefa. Nenhum arquivo do projeto foi criado.

---

## 1. Resumo

- A Fase 0 cabe no plano original, mas 27 pontos dele divergem da documentação atual (seção 3). Os que mudam comandos ou configuração:
  - O marketplace `claude-plugins-official` precisa de `marketplace add` antes de instalar pela linha de comando.
  - Regras `Write(...)` nas permissões nunca casam.
  - `--filter=...[HEAD]` deixa de fora o que o agente já comitou.
  - O Expo SDK 58 fixa o TypeScript em 6.0.3, não no 7.0 que o npm traz como mais recente.
  - `NativeTabs` agora é estável e se importa de `expo-router/native-tabs`.
  - O Supabase CLI 3 trocou as flags (`--remote`, `--yes`).
  - O plugin `supabase` traz um MCP sem escopo de projeto e com permissão de escrita.
- **Achado de segurança novo para a 0.9:**
  - O keystore Android `agendaCultural.jks` está versionado no `farol-cultural` desde o commit inicial.
  - Ele também é **público** em `Instituto-Dragao-do-Mar/agenda_cultural` e no fork `Mutirao/farol_agenda_cultural`.
  - `android/key.properties` está versionado no repositório privado.
  - Nenhum desses arquivos foi aberto nem copiado.
- **O caminho crítico da fase não é código, são acessos:** conta Apple paga, Android intermediário, conta Expo, chave Google Maps e a decisão sobre Supabase hospedado. Sem eles, a 0.5 (iOS), a 0.6 (VoiceOver/TalkBack) e a 0.7 (medições) ficam bloqueadas.

## 2. Fatos observados (11/11/2026)

**Pastas e repositórios**
- `/mnt/data/code/farol` **não é um repositório git**. Contém os clones `farol-cultural` (Flutter, `farolcultura-dev/farol-cultural`, último commit 7a26d28 em 08/09/2026) e `importador-idm` (.NET), mais `.nvmrc` = `26.10.0`. Como o plano pede um repositório novo e vazio, ele precisa de uma pasta nova (pergunta Q1).
- O Raspagem-Farol está em `/mnt/data/code/mutirao/raspagem-farol` (`Mutirao/Raspagem-Farol`, HEAD 941a758). Todos os caminhos citados no §10 existem. Ele só entra na Fase 1.

**Segredos versionados (`git ls-files`)**
- `farol-cultural`: `android/key.properties` e `android/app/agendaCultural.jks`.
- `importador-idm`: `appsettings.json`, `appsettings.Development.json`, `appsettings.Production.json`, além de cópias em `bin/`.
- O `AndroidManifest` do app antigo contém uma chave Google Maps.
- Repositórios públicos com `agendaCultural.jks`: `Instituto-Dragao-do-Mar/agenda_cultural` e `Mutirao/farol_agenda_cultural` (fork). Lá não há `key.properties`.

**Identidade visual**
- Cores do app antigo em `farol-cultural/lib`: `#008EA3` 26×, `#EA5B0C` 6×, `#999999` 14×. Batem com o §3.1.
- Os contrastes da tabela 3.1 foram recalculados pela fórmula de luminância da WCAG: os 8 valores batem com duas casas decimais.
- `imagens/farol/` tem 24 PNG e nenhum SVG. A conversão para SVG não é tarefa da Fase 0.

**Máquina (Linux)**
- Instalado: Node 26.10.0, pnpm 10.34.5, corepack 0.34.2, Docker 29.9.3 (**daemon parado**), Deno 2.9.8, psql 18.6, `claude` 2.1.322, `gh` (logado como `lpirola`, escopos `admin:org`, `repo` e `workflow`), `jq` e `bwrap`.
- `eas-cli` 16.28.0 está instalado, mas não logado.
- Faltam: Supabase CLI, Android SDK e emulador, macOS, `gitleaks` e `typescript-language-server`.
- `adb` funciona, mas não há aparelho conectado.

**Claude Code**
- Marketplaces configurados: o embutido `anthropic-plugin-directory`, `anthropic-agent-skills` e `comite-popular-tech`.
- `claude-plugins-official` não está registrado, e nenhum plugin do plano está instalado.

**Versões mais recentes no npm**
| Grupo | Versões |
| --- | --- |
| Expo | expo 58.0.24, react-native 0.88.1, expo-router 58.0.31, @expo/ui 58.0.28, expo-maps 58.0.11, @shopify/flash-list 2.3.3 (o Expo fixa 2.3.2) |
| Ferramentas | eas-cli 27.7.2, typescript 7.0.2 (o Expo fixa ~6.0.3), pnpm 12.18.0, turbo 2.11.11, @biomejs/biome 2.6.7, skills 1.8.1 |
| Supabase | supabase CLI 3.1.0, supabase-js 2.119.0 |
| Painel | @refinedev/core 5.0.12 (publicado em 02/04/2026), @refinedev/supabase 6.0.2, shadcn 4.23.0, tailwindcss 4.3.5 |

## 3. Divergências entre o plano e a documentação atual

Regra 0.7 do plano: quando a documentação diverge, segue-se a documentação e a divergência é registrada. Esta tabela vira o ADR-0001 (tarefa F0-03).

| # | Seção | O plano diz | A documentação atual diz (fonte) | O que este plano faz |
| --- | --- | --- | --- | --- |
| V01 | 5.1 | `claude plugin install X@claude-plugins-official` | O id continua válido. Comandos de shell não registram esse marketplace (só sessões interativas registram), e o escopo padrão é o do usuário (code.claude.com/docs/en/discover-plugins, /plugins/troubleshooting) | `claude plugin marketplace add anthropics/claude-plugins-official` antes, instalação com `--scope project`, `enabledPlugins` e `extraKnownMarketplaces` comitados, e um script de bootstrap para cada pessoa da equipe |
| V02 | 5.1 | `security-guidance` | Existe (v2.0.17). Adiciona o próprio hook Stop, com revisão por LLM que consome cota, e grava em `~/.claude/security/` (code.claude.com/docs/en/security-guidance) | Manter. Regras do projeto em `.claude/claude-security-guidance.md`. Medir a latência combinada com o nosso Stop |
| V03 | 5.1 | `npx skills add ...` | Sem `-a claude-code -y` o comando é interativo e instala em todos os agentes detectados. Fixação por `@tag`/`@sha` e `skills-lock.json` (github.com/vercel-labs/skills, docs/commands.md) | CLI `skills@1.8.1` fixado, fonte fixada por SHA ou tag depois da leitura, `skills-lock.json` comitado e `skills check` no CI |
| V04 | 5.1 | Supabase: skills via `npx skills` + MCP só de dev em modo leitura | O plugin `supabase` traz um MCP sem `project_ref` e sem `read_only` (github.com/supabase-community/supabase-plugin) | Não instalar o plugin. Skills vêm de `supabase/agent-skills@v0.1.9`. MCP configurado à mão no `.mcp.json` com `project_ref` + `read_only=true` |
| V05 | 5.1 | `pnpm dlx skills add shadcn/ui` dentro de `apps/painel` | O comando existe, mas também oferece `migrate-radix-to-base`, e `apps/painel` só nasce na Fase 3 (ui.shadcn.com/docs/skills) | Instalar com `-s shadcn` na raiz agora (o painel é parte do monorepo) |
| V06 | 5.4 | Hook PostToolUse em "Edit/Write de *.ts(x)" | O matcher é uma lista de nomes (`Edit\|MultiEdit\|Write`). O caminho do arquivo chega pelo stdin (`.tool_input.file_path`). Saída com código 0 e stderr não aparece para o Claude; para avisar, sair com 2 ou mandar `additionalContext` (code.claude.com/docs/en/hooks) | Os scripts em `.claude/hooks/` leem o stdin, usam código 2 para erro e `additionalContext` para aviso, e têm testes |
| V07 | 5.4 | Stop: `pnpm turbo typecheck --filter=...[HEAD]` | `...[HEAD]` só vê o que não foi comitado. `--affected` compara com `main...HEAD` e inclui o que não foi comitado (turborepo.com/docs/reference/run; teste local com turbo 2.11.11) | `pnpm turbo run typecheck --affected --output-logs=errors-only`, com proteção `stop_hook_active` contra loop |
| V08 | 5.4 | Negar "leitura e escrita" e `supabase db push --linked` "fora do CI" | Regras `Write(path)` são aceitas mas nunca casam; o certo é `Read` + `Edit`. Regras de Bash não pegam `npx`/`pnpm exec`/`sh -c` nem flags reordenadas. Não existe regra condicionada ao CI (code.claude.com/docs/en/permissions). No CLI v3, `--linked` está obsoleto e foi trocado por `--remote` (supabase/cli v3.0.0) | Pares `Read`+`Edit`. Negar `supabase db push *` em geral, incluindo variações com `npx`/`pnpm exec`/`pnpm dlx`. Hook PreToolUse de guarda para Bash e sandbox com `denyRead` dos segredos. "Fora do CI" vale porque o CI não roda o Claude Code |
| V09 | 4, 0.5 | "template do SDK mais recente" | Durante a transição, `create-expo-app@latest` sem `--template` ainda cria um projeto SDK 57. O template gera `AGENTS.md` e `.claude/settings.json` próprios (docs.expo.dev/more/create-expo; `--help` local) | `npx create-expo-app@latest apps/app --template default@sdk-58 --no-agents-md --no-install`. Dependências do Expo instaladas com `npx expo install` (React fica em 19.3.0) |
| V10 | 4 | `NativeTabs` estável | É estável, com import `expo-router/native-tabs`. A skill oficial `expo-router` ainda mostra `unstable-native-tabs`. A issue expo/expo#52613 diz que falta `expo-symbols` na checagem de tipos. Máximo de 5 abas. No Android a barra é Material Components (docs.expo.dev/router/advanced/native-tabs) | Usar o import estável, instalar `expo-symbols` explicitamente e registrar na skill `farol-native-ui` que ela prevalece sobre a skill oficial |
| V11 | 6 | Um wrapper por controle com `.ios.tsx` e `.android.tsx`; "se houver componentes universais, wrapper fino" | O SDK 58 tem uma camada universal (`@expo/ui`): Button, Switch, List, BottomSheet, Picker e outros, com um único import (docs.expo.dev/versions/latest/sdk/ui/universal) | Os 4 controles da 0.6 viram wrappers finos sobre a camada universal. Divisão por plataforma só quando faltar uma prop |
| V12 | 4, 11 | Lista reciclável do Expo UI "se cobrir cartões personalizados" | No SDK 58, `List.ForEach` virtualiza e recicla. Cartões RN entram via `RNHostView`, mas o desempenho disso não está documentado. A skill oficial `expo-ui` diz que a List "não é virtualizada", o que está desatualizado (changelog do SDK 58) | O spike F0-10 mede exatamente isso. FlashList entra via `npx expo install` (2.3.2) |
| V13 | 4, 11 | `expo-maps` × `react-native-maps` | `expo-maps` não roda no Expo Go, então exige dev build, e no Android precisa de chave Google Maps. Nenhuma das duas bibliotecas tem clustering nativo (docs.expo.dev/versions/latest/sdk/maps) | O spike F0-11 testa as duas, com e sem `supercluster`. Pede a chave (H5) |
| V14 | 4, 10 | TypeScript (sem versão; o npm mais recente é 7.0.2) | O SDK 58 fixa `typescript ~6.0.3`, e o `expo install --check` cobra isso. O TS 7.0 não tem API de compilador e remove `baseUrl` e `node10` (api.expo.dev/v2/versions; devblogs TS 7.0) | `~6.0.3` via catalog do pnpm. O tsconfig já sai compatível com o TS 7 (sem `baseUrl`, resolução `bundler`/`nodenext`, `types` explícito) |
| V15 | 4 | Coleta em "Node 22" | O Node 22 está em manutenção, com fim de vida em 30/04/2027. O Node 26 é Active LTS desde 28/10/2026. As imagens oficiais do Playwright 1.65 vêm só com Node 26 (github.com/nodejs/Release; Dockerfile do Playwright v1.65.0) | Node 26 em tudo (o `.nvmrc` já está em 26.10.0). A imagem do worker é `mcr.microsoft.com/playwright:v1.65.0-noble` (vale para a Fase 1) |
| V16 | 2 (D10) | pnpm sem versão | O mais recente é o 12.18.0 (reescrito em Rust). Configuração em `pnpm-workspace.yaml` (`allowBuilds`, `catalog`); o `.npmrc` só guarda autenticação. O corepack 0.34.2 não roda o pnpm 12 (pnpm.io/blog/releases/11.0 e 12.0; teste local) | `packageManager: pnpm@12.18.0`. Atualizar o pnpm local (F0-01). Plano B: pnpm 11.28.9 |
| V17 | 4, 0.8 | Supabase CLI (sem versão); `gen types` | CLI 3.1.0 instalado como devDependency e rodado com `pnpm supabase`. O `--local` está obsoleto (o local já é o padrão). Ações remotas exigem `--remote --yes`. `[inbucket]` virou `[local_smtp]`. Exige Docker (supabase.com/docs/guides/local-development/cli/migrating-to-v3) | Fixar `supabase@3.1.0`. Iniciar o daemon do Docker (H7) |
| V18 | 8.4 | Schemas expostos pela API | Desde 30/10/2026, tabelas novas não recebem GRANT automático no cloud. O CLI local só se comporta igual com `[api] auto_expose_new_tables = false` (discussão supabase#45329) | Na 0.8: `auto_expose_new_tables = false`. Na Fase 1: GRANT explícito na mesma migração do RLS |
| V19 | 2 (D8), APP-09 | "levar dados a outro aparelho sem perder a sessão anônima" | A conversão mantém o mesmo `user_id` só no aparelho que converte. No segundo aparelho, entrar com o e-mail substitui o anônimo daquele aparelho, e os dados dele precisam ser mesclados à mão. O código por e-mail exige `{{ .Token }}` nos templates Magic Link e Change Email, e SMTP próprio (o embutido manda 2 e-mails por hora) (supabase.com/docs/guides/auth/auth-anonymous) | Registrar no ADR-0001 e propor a errata. É assunto das Fases 2 e 3 (RPC de mesclagem) |
| V20 | 2 (D6), 4 | Refine v5 com preset `vite-shadcn` | O preset existe, mas traz um provedor REST, sem Supabase, com Vite 6, shadcn CLI 2 e React 19.1.0. O Refine Core está em modo de manutenção: o último npm é de 02/04/2026, as versões 5.1 e 5.2 não foram publicadas porque o pipeline de release está quebrado, e o foco mudou para o produto de IA (jan/2026). `custom()` (RPC) não é implementado no provedor Supabase (refine.dev/blog/refine-core-introduction; github refinedev/refine) | Fora do código da Fase 0. Decisão humana (Q4) |
| V21 | 3.3 | `theme.css` "no formato do tema shadcn" | O formato atual usa `oklch` com `:root`/`.dark` e `@theme inline`. A documentação do Refine ainda mostra HSL (ui.shadcn.com/docs/theming) | O gerador emite `oklch` com os nomes de token do shadcn atual |
| V22 | 4, 13 | "EAS Observe" | Agora chama-se Expo Observe (GA em 20/08/2026). O plano Free dá 100 mil eventos por mês. Cobre só o app; não cobre o painel nem as Edge Functions do OPS-03 (docs.expo.dev/eas/observe) | Vira evidência para a decisão humana do §13 (ADR-0004 proposto) |
| V23 | 4, 2.8 | Maestro no EAS Workflows | O job `type: maestro` está em alpha e não existe no plano Free; a partir do Starter custa US$ 0,05 por job mais os minutos (expo.dev/pricing) | Registrar o custo. É da Fase 2 |
| V24 | 4 | Vitest em tudo | Para o app, o preset documentado pelo Expo é o `jest-expo`. Vitest com componentes RN não foi verificado | Vitest nos pacotes. O executor de testes do app é decidido antes da Fase 2 (ADR) |
| V25 | 5.1 | Context7 como MCP | O plugin oficial `context7@claude-plugins-official` é um MCP remoto com OAuth por usuário e não precisa de chave | Usar o plugin |
| V26 | 5.1 | `typescript-lsp` | O plugin precisa de `typescript-language-server` e `typescript` no PATH | Instalar na F0-01 |
| V27 | 5.4, 3.3 | Hook que "avisa" sobre cor hex | O Biome 2.6 aceita plugins GritQL; o teste local sinalizou hex em TSX/CSS e ignorou `packages/tokens` (biomejs.dev/linter/plugins; teste local com biome 2.6.7) | Regra no Biome, que é o juiz no CI. O hook devolve o diagnóstico ao agente |

## 4. Objetivo além do pedido e estado-alvo

**O que deve acontecer quando a Fase 0 existir:** as Fases 1 a 4 rodam com agentes quase sem supervisão, dentro de limites que dá para verificar, e as duas escolhas técnicas mais caras de desfazer (lista e mapa) são decididas por medição, não por opinião. O plano mira esse resultado, não só a lista 0.1–0.9. Por isso inclui como tarefas:
- o acesso que o executor precisa (aparelho, contas, chaves);
- o teste real dos hooks;
- o CI obrigatório no merge;
- o registro das divergências.

**O que a fase precisa fazer:** montar o monorepo, fixar versões, proteger segredos e produção, medir lista e mapa, decidir com ADR, conter o sistema antigo e registrar as divergências.

**Matéria-prima:**
- a documentação do SDK 58 (não as skills, que estão desatualizadas em dois pontos);
- o uso real de cores no app antigo (`grep` em `farol-cultural/lib`);
- a lista de arquivos versionados com segredo (`git ls-files`);
- a saída bruta do `dumpsys gfxinfo` no aparelho;
- a saída do pgTAP.

**Métodos de quem faz isso bem:**
- Desempenho Android: build de release, taxa de atualização fixa em 60 Hz, `gfxinfo`/`framestats`, 3 rodadas e regra de decisão escrita antes de medir.
- Acessibilidade: TalkBack, VoiceOver, `uiautomator dump` e a maior escala de fonte.
- Segurança: varredura de todo o histórico com `gitleaks`, rotacionar antes de apagar, checar forks públicos.
- Cadeia de suprimentos: fixar por SHA, `minimumReleaseAge` e `allowBuilds` do pnpm.

### 4.1 Quem usa o resultado

| Quem | Hoje | Estado-alvo sem atrito |
| --- | --- | --- |
| C1 Pessoas da equipe (2 devs + Pirola) | Não há repositório | Clonar, rodar `scripts/bootstrap.sh`, rodar `pnpm install`, rodar `pnpm turbo run lint typecheck test` e ver tudo verde. App aberto no aparelho via dev build. Supabase local com um comando |
| C2 Agentes Claude Code nas Fases 1 a 4 | Nada | `CLAUDE.md`/`AGENTS.md`, 6 skills do projeto, skills de comunidade fixadas, MCPs com escopo, hooks que respondem na hora, bloqueios de segredo e de produção |
| C3 CI (GitHub Actions) | Nada | Checks obrigatórios no merge: lint, typecheck, testes, segredos, pgTAP de fumaça, skills e app |
| C4 Código das Fases 1 a 3 | Nada | `@farol/tokens` (`native.ts` e `theme.css`) e `@farol/ui-native` com 4 controles |
| C5 Quem decide (Pirola, Secult) | Plano sem números | ADRs com números, checklist de contenção, relatório do PORTÃO 0 |
| C6 Público do app antigo | Segredos expostos e endpoints inseguros | Segredos trocados e endpoints desligados, com aviso, sem quebrar de surpresa o que segue no ar |

### 4.2 Diferenças entre hoje e o alvo

- **T01** Repositório com instalação reproduzível e versões fixadas (pnpm 12.18.0, Node 26, TS ~6.0.3). *Por quê:* sem isso, CI e agentes divergem das máquinas.
- **T02** CI obrigatório, verde num PR vazio e vermelho num controle negativo. *Por quê:* QUA-01; e um CI que nunca falha não prova nada.
- **T03** Nenhum segredo no repositório, com varredura no CI. *Por quê:* SEG-01; o sistema antigo vazou exatamente assim.
- **T04** AGPL-3.0. *Por quê:* D12 e QUA-02.
- **T05** Ferramentas do agente instaladas de forma que um colega reproduz (plugins, skills fixadas, MCPs com escopo). *Por quê:* §5.1; hoje o que vale numa máquina não vale na outra.
- **T06** Hooks e permissões do §5.4 funcionando e testados. *Por quê:* é o aceite da 0.2, e regras como `Write(...)` falham em silêncio.
- **T07** Divergências registradas (ADR-0001) e errata do PLANO proposta. *Por quê:* regra 0.7; o PLANO é a fonte da verdade e não pode ficar desatualizado.
- **T08** 6 skills do projeto, o `CLAUDE.md`/`AGENTS.md` da raiz e os 4 por pasta. *Por quê:* 0.3; contexto curto e correto para os agentes.
- **T09** `packages/tokens` com contraste testado, `native.ts` e `theme.css` gerados, e regra de cor hex no CI. *Por quê:* 0.4 e §3.3.
- **T10** App Expo SDK 58 rodando em Android e iOS, com 4 abas nativas e variantes por `APP_VARIANT`. *Por quê:* 0.5, OPS-02 e D11.
- **T11** `packages/ui-native` com 4 wrappers e uma tela de demonstração acessível. *Por quê:* 0.6, ACE-01 e ACE-02.
- **T12** ADR de lista e ADR de mapa com números. *Por quê:* 0.7 e DES-02.
- **T13** Supabase local funcionando, pgTAP de fumaça no CI e projetos hospedados conforme a Q2. *Por quê:* 0.8.
- **T14** Contenção do sistema antigo executada e assinada. *Por quê:* 0.9; agora com o keystore público.
- **T15** Evidência para as decisões humanas que o PLANO põe na Fase 0: observabilidade (§4 e §13) e app web (D13). *Por quê:* o PLANO manda escolher e avaliar na Fase 0.
- **T16** Acessos para trabalhar no nível do resultado: aparelho via `adb`, `eas` logado, Supabase. *Por quê:* sem isso, 0.5 a 0.7 não têm juiz externo.
- **T17** Relatório do PORTÃO 0, tarefa por tarefa. *Por quê:* §0.1 e §12.

## 5. Opções e trade-offs

| # | Decisão | Escolhida | Rejeitadas (motivo) |
| --- | --- | --- | --- |
| O1 | TypeScript | `~6.0.3` via catalog, com tsconfig compatível com o TS 7 | 7.0.2 agora: o `expo install --check` acusa, um mantenedor do Expo disse que quem usa fica "por conta própria", e não há API de compilador. Par 6+7 com alias: complexidade sem ganho, já que não há typescript-eslint. **Rever quando o Expo recomendar o 7.** |
| O2 | Versão do pnpm | 12.18.0 fixado em `packageManager` | pnpm 10 local: configuração antiga (`.npmrc`, `onlyBuiltDependencies`) e linha anterior. Plano B se o autolinking do Expo falhar: 11.28.9 |
| O3 | Linker do pnpm | `isolated` (padrão; o Expo suporta desde o SDK 54) | `hoisted` fica como plano B documentado |
| O4 | Instalação de plugins | `@claude-plugins-official` com `--scope project` e bootstrap | `@anthropic-plugin-directory`: os ids não batem com o `enabledPlugins` comitado e não se reproduzem numa máquina nova |
| O5 | Supabase para o agente | `agent-skills@v0.1.9` + `.mcp.json` à mão, só leitura | Plugin `supabase`: MCP sem escopo e com escrita, o que viola o §5.1. Os dois juntos: skills duplicadas |
| O6 | Cor hex e texto fixo | Plugins GritQL no Biome (juiz no CI) + hook que repassa o diagnóstico | Só `grep` no hook: não roda no CI e dá mais falso positivo |
| O7 | Typecheck no Stop | `--affected` + `stop_hook_active` | `--filter=...[HEAD]`: perde commits do agente |
| O8 | `ui-native` | Wrapper fino sobre o `@expo/ui` universal | `.ios`/`.android` por controle: duplica código que o SDK já unificou (o próprio PLANO prevê o wrapper fino) |
| O9 | Saída dos tokens | `dist/` gerado e comitado, com checagem de drift no CI | Gerar no build: Metro e Vite dependeriam de um pipeline antes de subir, e o drift check dá o mesmo controle |
| O10 | `AGENTS.md`/`CLAUDE.md` | `AGENTS.md` é a fonte; `CLAUDE.md` importa `@AGENTS.md` e adiciona só o que é específico do Claude | Dois arquivos espelhados à mão: eles divergem |
| O11 | Medição dos spikes | Build `preview` (release) + `gfxinfo` a 60 Hz fixos, 3 rodadas, regra de decisão escrita antes | Dev build ou só o Perf Monitor: o modo dev distorce os números |
| O12 | Identificadores do app | Variantes por `APP_VARIANT`: dev `br.com.farol.cultura.dev`, preview `…preview`, produção `br.com.farol.cultura` | Um id só: o dev build sobrescreveria o app da loja no aparelho |
| O13 | Segredos no CI | `gitleaks` em todo o histórico + push protection do GitHub se o repositório for público | Só revisão humana: não escala |
| O14 | Local e organização do repositório | Pergunta Q1 | — |
| O15 | Framework do painel (D6) | Pergunta Q4. Não muda nada na Fase 0, além de o `theme.css` ser neutro (formato shadcn) | — |

## 6. Pré-requisitos humanos (bloqueiam tarefas, não o plano)

| # | O que | Bloqueia |
| --- | --- | --- |
| H1 | Local e organização do repositório no GitHub (Q1) | F0-02 e tudo depois |
| H2 | Conta ou organização Expo e `eas login` | Builds da F0-07 em diante |
| H3 | Conta Apple Developer paga, no time dono de `br.com.farol.cultura`, e iPhone registrado com `eas device:create` | iOS na F0-07, VoiceOver na F0-08 |
| H4 | Android intermediário (Moto G ou Galaxy A) com depuração USB | F0-07 a F0-11 (medições) |
| H5 | Chave Google Maps Android restrita por pacote + SHA-1 do dev build | F0-11 |
| H6 | Supabase hospedado (Q2) e `supabase login` | Parte hospedada da F0-06 |
| H7 | Comandos com `sudo`: `systemctl start docker` e instalação do `gitleaks` | F0-01 |
| H8 | Equipe e Secult na contenção: rotações, endpoints, selos, Play Console | F0-12 |
| H9 | Responsável pela escolha Expo Observe × Sentry (§13) | Decisão do ADR-0004 |

## 7. Tarefas da Fase 0 (em ordem; uma tarefa = um branch e um PR)

Ordem: F0-01 → F0-02 → (F0-12, F0-03, F0-04, F0-05, F0-06 em paralelo) → F0-09a → F0-07 → F0-08 → F0-09b → (F0-10, F0-11) → F0-13.
Divisão entre duas pessoas: **app** fica com F0-07, F0-08, F0-10 e F0-11; **dados e painel** fica com F0-04, F0-05, F0-06, F0-09a, F0-03 e F0-12.
Todo PR passa pelo `/code-review` sem pendência crítica e por revisão humana (§5.1 e §14).

### F0-01 Ambiente local · S · depende de: H7
- TASK: atualizar a máquina de desenvolvimento.
  - Instalar `npm i -g pnpm@12.18.0` (ou o instalador standalone) e `npm i -g eas-cli@27.7.2 typescript-language-server typescript@6.0.3`.
  - Instalar o `gitleaks` pelo gerenciador de pacotes.
  - Iniciar o daemon do Docker.
- DELIVERABLE: a mesma lista em `docs/setup-maquina.md` (é parte da F0-02).
- SCOPE: só a máquina. Nada no repositório antes da F0-02.
- VERIFY: `pnpm -v` = 12.18.0; `docker info` responde; `command -v gitleaks typescript-language-server`.
- STOP WHEN: os três comandos passam. Se algo exigir `sudo`, parar e pedir à pessoa.

### F0-02 (0.1) Monorepo e CI · L · depende de: F0-01, H1 · QUA-01, QUA-02, SEG-01
- TASK: `git init` na pasta definida na Q1. Criar:
  - `package.json` raiz com `packageManager`, `engines.node >=26` e `license: AGPL-3.0-only`;
  - `pnpm-workspace.yaml` com `packages`, `catalog` (typescript ~6.0.3, react 19.3.0, vitest, zod…) e `allowBuilds`;
  - `turbo.json` com `lint`, `typecheck`, `test` e `build`, e `globalDependencies` para os configs da raiz;
  - `biome.json` raiz (`root: true`, VCS com `useIgnoreFile`, `files.ignoreUnknown`, `linter.rules.preset: "recommended"`);
  - `packages/tsconfig` com a base compatível com o TS 7;
  - `LICENSE` (texto oficial da AGPL-3.0);
  - `.gitignore` (`.env*` com `!.env.example`) e `.env.example`;
  - `docs/PLANO-EXECUCAO.md` sem alterações, `docs/adr/0000-modelo.md` e o modelo de PR que cita IDs de requisito;
  - `.github/workflows/ci.yml` com `actions/checkout@v7` (`fetch-depth: 0`, `filter: blob:none`), `pnpm/action-setup@v6` + `actions/setup-node@v7` (`node-version-file: .nvmrc`, `cache: pnpm`), `pnpm install --frozen-lockfile`, `pnpm biome ci .` e `pnpm turbo run typecheck test` (`--affected` em PR, completo em `main`), e um job `gitleaks` sobre o histórico inteiro. Actions fixadas por SHA.
  - Proteção da branch `main` com os checks obrigatórios.
- DELIVERABLE: PR #1 com o esqueleto. PR de controle negativo fechado sem merge.
- SCOPE: arquivos da raiz, `.github/`, `packages/tsconfig`, `docs/`. Nada de `apps/` nem `supabase/`.
- VERIFY (juízes: GitHub Actions, gitleaks, API do GitHub):
  - um PR só com README fica verde;
  - um PR com erro proposital de Biome fica vermelho;
  - `gh api …/branches/main/protection` lista os checks;
  - `gh api repos/<org>/<repo> --jq .license.spdx_id` = `AGPL-3.0`.
- STOP WHEN: os dois PRs de controle se comportam como esperado e o PR #1 tem revisão humana aprovada.

### F0-12 (0.9) Checklist de contenção · S · depende de: nada (vai para o repositório depois da F0-02) · SEG-01
- TASK: escrever `docs/checklists/fase-0-contencao.md` com responsável, data, evidência e assinatura por item:
  1. Keystore `agendaCultural.jks` público em 2 repositórios e `key.properties` versionado:
     - conferir no Play Console se o Play App Signing está ativo;
     - pedir o reset da upload key;
     - nunca reusar essa chave no EAS;
     - tornar privado ou arquivar `Mutirao/farol_agenda_cultural`;
     - pedir o mesmo ao Instituto Dragão do Mar.
  2. Credenciais do `importador-idm` (`appsettings*.json` e as cópias em `bin/`).
  3. Chave Google Maps do `AndroidManifest`: restringir ou trocar.
  4. Segredos da API Node antiga (o repositório não está nesta máquina; o dono precisa confirmar).
  5. Desligar `resetarsenha` e `enviaremail`, com mensagem combinada, porque o app antigo perde a troca de senha.
  6. Confirmar os selos com a Secult e quem mantém a lista.
  7. Nomear quem responde cada questão do §13.
- DELIVERABLE: o checklist. O agente **nunca** lê nem manipula valores de segredo.
- SCOPE: só documentação.
- VERIFY: assinatura humana por item (juiz: pessoa); `gh api repos/Mutirao/farol_agenda_cultural --jq .visibility` depois da ação (juiz: GitHub).
- STOP WHEN: o documento foi entregue e revisado. A execução dos itens é humana e entra no PORTÃO 0.

### F0-03 Divergências e ADRs de mesa · S · depende de: F0-02
- TASK: `docs/adr/0001-divergencias-plano-docs-2026-11.md` com a tabela da seção 3, uma fonte por linha. PR separado com a errata proposta ao PLANO v1.1, que **só entra se a pessoa aprovar**.
  - `docs/adr/0004-observabilidade.md` (proposto): Expo Observe × Sentry, cobrindo app, painel e funções do OPS-03.
  - `docs/adr/0005-app-web.md` (proposto): D13; só a camada universal do Expo UI roda na web.
  - Se a resposta à Q4 pedir: `0006-painel.md` comparando Refine Core, shadcn-admin-kit + ra-supabase-core e TanStack + shadcn.
- DELIVERABLE: os ADRs.
- SCOPE: `docs/adr/`.
- VERIFY: um humano aprova ou recusa cada ADR por escrito no PR (juiz: pessoa).
- STOP WHEN: os ADRs estão mergeados com status `proposto` ou `aceito`.

### F0-04 (0.2) Claude Code: plugins, skills, MCP, hooks e permissões · L · depende de: F0-02 · SEG-01, SEG-05
- TASK:
  - `scripts/bootstrap-claude.sh`, idempotente (comandos na seção 8).
  - `.claude/settings.json` com `extraKnownMarketplaces`, `enabledPlugins`, `permissions.deny`, `hooks` e `sandbox`.
  - `.claude/hooks/biome.sh` (PostToolUse `Edit|MultiEdit|Write`): roda `pnpm exec biome check --write --no-errors-on-unmatched --files-ignore-unknown=true <arquivo>`; erro sai com 2 e aviso volta como `additionalContext`.
  - `.claude/hooks/guard-bash.sh` (PreToolUse Bash): bloqueia segredos e produção, inclusive via wrappers, e falha fechado se o `jq` faltar.
  - `.claude/hooks/typecheck.sh` (Stop): `--affected`, com guarda `stop_hook_active`.
  - `.claude/hooks/tests/run.sh` com fixtures JSON.
  - Plugins GritQL no Biome: cor hex fora de `packages/tokens/**` (erro) e texto JSX fixo em `apps/**` (aviso), com fixtures de teste.
  - `.mcp.json`: `supabase-local` (`http://localhost:54321/mcp`), `supabase-dev` (`${SUPABASE_DEV_PROJECT_REF}`, `read_only=true`, só se a Q2 for "gerenciado") e `shadcn` (fixado). Expo e Context7 vêm pelos plugins.
  - `skills-lock.json` e `.agents/skills/` comitados.
  - `.claude/claude-security-guidance.md` com as regras do projeto: RLS, `service_role` nunca no cliente, nada de segredo em `app.json`/`eas.json`.
  - Jobs de CI: `hooks` (testes) e `skills` (`npx -y skills@1.8.1 check`).
- DELIVERABLE: o PR. O PR lista, para cada skill de comunidade, quem a leu e o SHA ou tag fixado.
- SCOPE: `.claude/`, `.agents/`, `.mcp.json`, `skills-lock.json`, `scripts/bootstrap-claude.sh`, `tooling/biome-plugins/`, `biome.json`, `ci.yml`.
- VERIFY (juízes: Claude Code CLI, skills CLI, Biome, sistema de arquivos):
  - em clone limpo, o bootstrap roda e depois `claude plugin list` mostra os 12 plugins com escopo de projeto;
  - `skills check` termina com 0;
  - `bash .claude/hooks/tests/run.sh` passa;
  - teste e2e num clone descartável, com controle positivo (sem ele o teste passa à toa, porque o `-p` já nega edições sem permissão): com `--permission-mode acceptEdits`, criar `apps/app/.env.e2e-ok` **funciona** e criar `apps/app/.env.production` **não** (`test -e` no primeiro, `test ! -e` no segundo);
  - as fixtures do Biome produzem exatamente os diagnósticos esperados;
  - a varredura do `.mcp.json` não encontra `service_role` nem PAT.
- STOP WHEN: todas as verificações passam. Se o sandbox quebrar `pnpm` ou `eas`, registrar no PR e seguir só com os bloqueios e o hook de guarda.

### F0-05 (0.4) `packages/tokens` · M · depende de: F0-02 · ACE-01
- TASK:
  - `tokens.json` com a paleta do §3.1, nos modos claro, escuro e alto contraste do Farol, mais raios e espaçamentos, validado com zod.
  - Gerador em TS que produz `dist/native.ts` (tipado) e `dist/theme.css`: `oklch`, `:root`/`.dark`, `@theme inline`, escala de `--radius` e os nomes de token atuais do shadcn.
  - Testes Vitest:
    - as 8 razões do §3.1 recalculadas com `culori` (implementação independente), com tolerância de ±0,01;
    - todo token de texto ≥ 4,5:1 sobre o seu fundo;
    - todo token gráfico ≥ 3:1;
    - `#999999` não pode ser token de texto;
    - o `theme.css` tem todos os nomes de token shadcn.
- DELIVERABLE: o pacote `@farol/tokens`.
- SCOPE: `packages/tokens/`.
- VERIFY: `pnpm --filter @farol/tokens test` passa; `pnpm --filter @farol/tokens build && git diff --exit-code packages/tokens/dist` não acusa diferença; o Biome analisa o `theme.css` com `tailwindDirectives` (juízes: Vitest/culori, git, Biome).
- STOP WHEN: o CI está verde com os testes de contraste.

### F0-06 (0.8) Supabase local e de fumaça · M · depende de: F0-02, Docker · OPS-01, LGPD-02
- TASK:
  - `pnpm add -Dw supabase@3.1.0` e `pnpm supabase init`.
  - `supabase/config.toml` com `project_id = "farol"`, `[db] major_version = 17`, `[api] auto_expose_new_tables = false` e `[local_smtp]`.
  - `supabase/tests/000_smoke.test.sql` (pgTAP): Postgres ≥ 17 e `postgis`, `pg_trgm`, `unaccent`, `pg_cron`, `pg_net` e `supabase_vault` em `pg_available_extensions`.
  - `supabase/seed.sql` vazio.
  - Job de CI com `supabase/setup-cli@v3`, `supabase db start` e `supabase test db`.
  - Se a Q2 for "gerenciado": a pessoa cria `farol-dev` e `farol-hml` em `sa-east-1`; os refs vão para os GitHub Environments, nunca para o repositório.
  - Nenhum `db push` na Fase 0.
- DELIVERABLE: o PR.
- SCOPE: `supabase/`, `package.json` raiz, `ci.yml`.
- VERIFY: `pnpm supabase start && pnpm supabase db reset && pnpm supabase test db` passa no local e no CI; com Q2 = gerenciado, `pnpm supabase projects list` mostra os 2 projetos em `sa-east-1` (juízes: pgTAP, API do Supabase).
- STOP WHEN: o pgTAP de fumaça está verde no CI. Se `db start` não bastar no CI, trocar por `supabase start` e registrar.

### F0-09a (0.3, parte 1) Skills do projeto e instruções da raiz · M · depende de: F0-04
- TASK:
  - Com o `skill-creator`, criar `.claude/skills/` com `farol-sync-rules`, `farol-rls`, `farol-notifications`, `farol-performance` e `farol-connector`, usando o conteúdo do PLANO (§8 a §11).
  - `farol-rls` já nasce com o padrão GRANT + RLS + pgTAP da V18.
  - `AGENTS.md` da raiz (comandos, estrutura, convenções, regras do §0, ponteiros) e `CLAUDE.md` com `@AGENTS.md` mais o que é específico do Claude, até ~150 linhas.
  - `CLAUDE.md` curtos em `apps/painel/` e `workers/coleta/`, que nascem só com o `CLAUDE.md` e um README "entra na Fase X".
- DELIVERABLE: o PR.
- VERIFY: script que valida o frontmatter das 6 skills e `wc -l CLAUDE.md` ≤ 150; revisão humana (juízes: script, pessoa).
- STOP WHEN: o humano aprova o PR.

### F0-07 (0.5) `apps/app` · L · depende de: F0-02, F0-05, H2 (H3 para iOS, H4 para Android) · OPS-02, OPS-05, D11, D13
- TASK:
  - `npx create-expo-app@latest apps/app --template default@sdk-58 --no-agents-md --no-install`, adaptado para `@farol/app`.
  - Dependências do Expo instaladas com `npx expo install`; `expo-symbols` e `@expo/ui` explícitos.
  - `app.config.ts` com `APP_VARIANT` (ids da O12), `platforms: ['ios', 'android']` (D13) e React Compiler e typed routes ligados.
  - `eas.json` com os perfis `development` (dev client, interno), `preview` (interno) e `production` (canal `production`).
  - `NativeTabs` de `expo-router/native-tabs` com 4 abas vazias: agenda, mapa, favoritos e conta. Ícones SF Symbols e Material, tint `brand.primary` de `@farol/tokens`.
  - Rótulos via `packages/i18n` mínimo (pt-BR, `i18next` + `expo-localization`).
  - Job de CI: `expo install --check`, `expo-doctor` e `expo export` para Android e iOS.
- DELIVERABLE: o PR, mais prints dos dev builds nos dois sistemas.
- SCOPE: `apps/app/`, `packages/i18n/`, `ci.yml`.
- VERIFY (juízes: Expo CLI, EAS, `adb`, pessoa):
  - `expo-doctor` e `expo install --check` passam;
  - `APP_VARIANT=production npx expo config --type public --json` mostra `br.com.farol.cultura`;
  - `eas build --profile development` sai para Android e iOS;
  - no Android, `adb install` e um print das 4 abas;
  - no iPhone, um print enviado pela pessoa.
- STOP WHEN: os dois sistemas abrem as 4 abas. Se H3 faltar, iOS fica `bloqueado` com o motivo e o PR segue só com Android.

### F0-08 (0.6) `packages/ui-native` · M · depende de: F0-07, F0-05 · ACE-01, ACE-02, ACE-03
- TASK:
  - `Button`, `Toggle`, `ListSection` e `Sheet` sobre o `@expo/ui` universal.
  - API própria com `accessibilityLabel` obrigatório e tint dos tokens.
  - Arquivos por plataforma só se faltar uma prop.
  - Rota de demonstração `app/(dev)/ui-demo.tsx`, que só existe na variante `development`.
  - Regra `noRestrictedImports` do Biome: `@expo/ui*` só dentro de `packages/ui-native`.
  - `docs/a11y/f0-ui-native.md` com o checklist de TalkBack, VoiceOver e fonte máxima.
- DELIVERABLE: o PR, o checklist assinado e os prints.
- VERIFY (juízes: Biome, uiautomator, pessoa):
  - `pnpm biome ci .` passa;
  - `adb shell uiautomator dump` mostra rótulo em todos os controles;
  - TalkBack e VoiceOver percorrem a tela;
  - `font_scale 2.0` sem texto cortado.
- STOP WHEN: o checklist está assinado nos dois sistemas. Se H3 faltar, VoiceOver fica `bloqueado`.

### F0-09b (0.3, parte 2) Skill de UI nativa e instruções do app/Supabase · S · depende de: F0-08, F0-06
- TASK: `farol-native-ui` com os wrappers reais, os tokens, o checklist de acessibilidade e a nota de que ela prevalece sobre as skills `expo-ui` e `expo-router` (V10, V12). `CLAUDE.md` em `apps/app/` e `supabase/`.
- VERIFY: o mesmo script de frontmatter e revisão humana.
- STOP WHEN: o humano aprova.

### F0-10 (0.7a) Spike de lista e ADR-0002 · M · depende de: F0-08, H4 · DES-02, DES-04
- TASK: num branch `spike/lista` que não é mergeado, menos o ADR e o script:
  - 500 cartões falsos com semente fixa e `expo-image` (`recyclingKey`, cerca de 20 miniaturas locais de no máximo 480 px);
  - variante A: `@expo/ui` `List.ForEach` + `RNHostView`;
  - variante B: FlashList 2.3.2;
  - build `preview`;
  - `scripts/perf/measure-scroll.sh`: fixa 60 Hz, faz `gfxinfo reset`, 30 swipes, coleta `dumpsys gfxinfo` e `framestats`, em 3 rodadas por variante.
  - **Regra escrita antes de medir:** escolher A só se p95 ≤ 16 ms **e** janky ≤ 5% **e** não ficar mais de 1 ponto percentual pior que B; senão, B.
- DELIVERABLE: `docs/adr/0002-lista.md` com o modelo do aparelho, a versão do Android, o id do build, as saídas brutas em `docs/adr/assets/0002/` e a decisão.
- VERIFY: os números saem do `dumpsys gfxinfo`; um humano aprova o ADR (juízes: gfxinfo, pessoa).
- STOP WHEN: o ADR é aprovado.

### F0-11 (0.7b) Spike de mapa e ADR-0003 · M · depende de: F0-07, H4, H5 · DES-02
- TASK: o mesmo método com 300 pinos com semente fixa no recorte de Fortaleza. Variantes: `expo-maps` × `react-native-maps`, cada uma com e sem `supercluster`. Pan com swipes e zoom com toque duplo. Também o tempo até renderizar os 300 marcadores. Regra de decisão escrita antes.
- DELIVERABLE: `docs/adr/0003-mapa.md` com as saídas brutas.
- VERIFY: gfxinfo e aprovação humana.
- STOP WHEN: o ADR é aprovado.

### F0-13 Relatório do PORTÃO 0 · S · depende de: todas
- TASK: `docs/relatorios/portao-0.md`, tarefa por tarefa:
  - requisitos citados, links de PR e de execução do CI, evidências;
  - o que ficou `bloqueado`, com o motivo;
  - o estado da contenção, dos selos e dos ADRs.
- VERIFY: um humano aprova o portão (juiz: pessoa).
- STOP WHEN: o portão é aprovado ou recusado com pendências listadas. A Fase 1 não começa sem isso.

## 8. Comandos de instalação (F0-04, `scripts/bootstrap-claude.sh`)

```bash
set -euo pipefail
export DISABLE_TELEMETRY=1

# Plugins oficiais (escopo de projeto; o marketplace precisa ser registrado pelo shell)
claude plugin marketplace add anthropics/claude-plugins-official
for p in feature-dev code-review pr-review-toolkit code-simplifier security-guidance \
         commit-commands hookify skill-creator frontend-design typescript-lsp expo context7; do
  claude plugin install "$p@claude-plugins-official" --scope project
done
# O plugin "supabase" fica de fora de propósito (V04).

# Skills de comunidade: CLI fixado, fonte fixada depois de lida (refs observadas em 11/11/2026)
npx -y skills@1.8.1 add supabase/agent-skills@v0.1.9 \
  -s supabase supabase-postgres-best-practices -a claude-code -y
npx -y skills@1.8.1 add vercel-labs/agent-skills@1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62 \
  -s vercel-react-native-skills vercel-react-best-practices vercel-composition-patterns web-design-guidelines \
  -a claude-code -y
npx -y skills@1.8.1 add shadcn-ui/ui@4233ed1caded8c38f4bc14b14afe1f93ebcaf966 -s shadcn -a claude-code -y
# Depois de logar: /mcp no Claude Code (OAuth do Expo e do Context7). Nada de token em arquivo.
```

Os SHAs acima são os commits mais recentes observados com `gh api` em 11/11/2026: `vercel-labs/agent-skills@main` e o último commit em `shadcn-ui/ui/skills/shadcn`. O `v0.1.9` é tag. A F0-04 relê o conteúdo antes de fixar e atualiza o SHA se mudar.

Trechos centrais do `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "claude-plugins-official": { "source": { "source": "github", "repo": "anthropics/claude-plugins-official" } }
  },
  "enabledPlugins": { "feature-dev@claude-plugins-official": true, "...": "um por plugin do bootstrap" },
  "permissions": {
    "deny": [
      "Read(**/.env.production*)", "Edit(**/.env.production*)",
      "Read(**/*.keystore)", "Edit(**/*.keystore)",
      "Read(**/*.jks)", "Edit(**/*.jks)",
      "Read(**/key.properties)", "Edit(**/key.properties)",
      "Bash(supabase db push *)", "Bash(npx supabase db push *)",
      "Bash(pnpm supabase db push *)", "Bash(pnpm exec supabase db push *)", "Bash(pnpm dlx supabase db push *)",
      "Bash(eas submit *)", "Bash(npx eas-cli submit *)",
      "Bash(eas update *production*)", "Bash(npx eas-cli update *production*)"
    ]
  },
  "hooks": {
    "PreToolUse":  [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/guard-bash.sh" }] }],
    "PostToolUse": [{ "matcher": "Edit|MultiEdit|Write", "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/biome.sh", "timeout": 60 }] }],
    "Stop":        [{ "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/typecheck.sh", "timeout": 600 }] }]
  },
  "sandbox": { "enabled": true, "filesystem": { "denyRead": ["**/.env.production*", "**/*.jks", "**/*.keystore", "**/key.properties"] } }
}
```

O `guard-bash.sh` cobre o que as regras de prefixo deixam passar: `sh -c`, flags reordenadas, `supabase … --remote`, `functions deploy`, `secrets set`, `config push`, e leitura dos arquivos de segredo por outros comandos.

## 9. Riscos

| # | Risco | Prob./Impacto | Mitigação | Gatilho para agir |
| --- | --- | --- | --- | --- |
| R01 | Keystore público é a upload key atual | M/A | F0-12, item 1: reset da upload key no Play Console e repositórios públicos tratados | Assim que o plano for aceito; não depende de código |
| R02 | Faltam acessos (H2 a H5) e 0.5 a 0.7 travam | A/A | Pedir no dia 1; marcar a tarefa `bloqueado` com o motivo; o PORTÃO 0 não passa sem eles | H não resolvido até o 3º dia útil |
| R03 | pnpm 12 (lançado em ago/2026) com o autolinking do Expo | M/M | `expo-doctor` e o EAS build como juízes; plano B pnpm 11.28.9 e/ou `nodeLinker: hoisted` | `expo-doctor` ou build falham por resolução |
| R04 | TS 6.0.3 congelado, sem patches desde abril | B/B | tsconfig já compatível com o TS 7 | O Expo passa a recomendar o 7 |
| R05 | Skills oficiais do Expo desatualizadas (List e NativeTabs) levam o agente a errar | A/M | `farol-native-ui` prevalece; o `CLAUDE.md` manda seguir a documentação, não a skill | PR com `unstable-native-tabs` ou FlatList sem justificativa |
| R06 | Regras de permissão contornáveis | M/A | Hook de guarda, sandbox `denyRead`, teste e2e | Falha no teste e2e |
| R07 | Dois hooks Stop (o nosso e o `security-guidance`) deixam cada turno lento e gastam cota | M/M | Medir na primeira semana; desligar uma camada via env (`ENABLE_STOP_REVIEW=0`) se passar de ~60 s | Reclamação da equipe ou turno acima de 60 s |
| R08 | Sandbox bloqueia rede do `pnpm`/`eas` | M/B | Ajustar a política no próprio PR; plano B sem sandbox, registrado | Falha de instalação dentro do agente |
| R09 | Uma medição feita num aparelho só | M/M | 3 rodadas, aparelho e versão registrados, regra escrita antes; repetir se o resultado ficar na margem de 1 ponto | Diferença entre A e B menor que 1 ponto |
| R10 | Refine em modo de manutenção pesa na Fase 3 | M/M | Q4; `theme.css` neutro; versões fixadas | Sem release até a Fase 3 |
| R11 | Desligar `resetarsenha` quebra a troca de senha do app antigo | A/M | Mensagem combinada (F0-12, item 5) | Antes de desligar |
| R12 | Custos: Supabase Pro para 2 projetos (~US$ 35/mês), EAS e Maestro (Fase 2) | M/B | Q2; registrar no ADR-0001 | — |
| R13 | O repositório da API antiga não está acessível aqui | M/M | Dono nomeado na F0-12 | Sem dono no 2º dia |
| R14 | Sem macOS: nada de iOS local | C/M | Builds na nuvem com o EAS e aparelho físico | — |

## 10. Critérios de sucesso

| Critério | Tarefa | Cenário de verificação (juiz externo) |
| --- | --- | --- |
| T01 Instalação reproduzível e fixada | F0-01, F0-02 | Clone limpo: `pnpm -v` = 12.18.0 e `pnpm install --frozen-lockfile` termina com 0 (pnpm) |
| T02 CI obrigatório que realmente falha | F0-02 | PR só com README verde; PR com erro de Biome vermelho; a proteção da `main` lista os checks (GitHub Actions/API) |
| T03 Nenhum segredo | F0-02 | O job `gitleaks` no histórico inteiro passa; `git check-ignore .env.production` dá positivo e `.env.example` não (gitleaks, git) |
| T04 AGPL-3.0 | F0-02 | `gh api repos/<org>/<repo> --jq .license.spdx_id` = `AGPL-3.0` (GitHub) |
| T05 Ferramentas do agente reproduzíveis | F0-04 | Clone limpo, `bootstrap-claude.sh`, e `claude plugin list` mostra os 12 no projeto; `skills check` = 0; `claude mcp list` mostra expo, context7, shadcn e supabase-local (Claude CLI, skills CLI) |
| T05b MCP do Supabase só leitura e só dev | F0-04 | Teste no CI: toda URL `mcp.supabase.com` do `.mcp.json` tem `read_only=true` e `project_ref=`; nenhum `service_role` ou PAT (script) |
| T06 Hook bloqueia `.env.production` | F0-04 | Clone descartável com `--permission-mode acceptEdits`: o controle positivo `apps/app/.env.e2e-ok` é criado e `apps/app/.env.production` não é; `run.sh` com fixtures passa (sistema de arquivos, test runner) |
| T06b Biome no arquivo editado; hex e texto fixo sinalizados | F0-04 | Fixtures: hex em `apps/**` gera erro, hex em `packages/tokens/**` não gera nada, texto JSX fixo gera aviso; o hook devolve código 2 (Biome) |
| T06c Stop só nos afetados e sem loop | F0-04 | Fixture com `stop_hook_active=true` sai com 0 sem rodar nada; erro de tipo em pacote sai com 2 (turbo/tsc) |
| T07 Divergências registradas | F0-03 | ADR-0001 aprovado; PR de errata aprovado ou recusado por escrito (pessoa) |
| T08 Skills e instruções | F0-09a/b | Script de frontmatter verde nas 6 skills; `wc -l CLAUDE.md` ≤ 150; revisão humana (script, pessoa) |
| T09 Tokens com contraste | F0-05 | Vitest com `culori` reproduz as 8 razões (±0,01) e os mínimos AA; `git diff --exit-code packages/tokens/dist` limpo depois do build (Vitest, git) |
| T09b `theme.css` no formato shadcn atual | F0-05 | O teste encontra todos os nomes de token, `@theme inline` e `oklch`; o Biome analisa com `tailwindDirectives` (Vitest, Biome) |
| T10 App nos dois sistemas com 4 abas nativas | F0-07 | `expo-doctor` e `expo install --check` verdes; `expo export` iOS+Android no CI; dev build instalado e print das 4 abas (Expo, EAS, adb, pessoa) |
| T10b Ambientes por variável (OPS-02) | F0-07 | `APP_VARIANT=<v> npx expo config --type public --json` dá os 3 ids da O12 (Expo CLI) |
| T10c Textos via tradução | F0-07 | Plugin de texto JSX sem diagnóstico em `apps/app`; os rótulos das abas vêm de `packages/i18n` (Biome) |
| T11 Wrappers e importação restrita | F0-08 | `noRestrictedImports` verde no CI; a demo abre no dev build (Biome, aparelho) |
| T11b Acessibilidade | F0-08 | `uiautomator dump` com rótulo em todos os controles; checklist TalkBack/VoiceOver/fonte 2.0 assinado (uiautomator, pessoa) |
| T12 Lista decidida por medição | F0-10 | ADR-0002 com regra escrita antes, 3 rodadas por variante, `gfxinfo` bruto, aprovado (gfxinfo, pessoa) |
| T12b Mapa decidido por medição | F0-11 | ADR-0003 idem, com 300 pinos (gfxinfo, pessoa) |
| T13 Supabase local | F0-06 | `supabase start && db reset && test db` verde no local e no CI (pgTAP) |
| T13b Supabase hospedado (se Q2 = gerenciado) | F0-06 | `supabase projects list` mostra `farol-dev` e `farol-hml` em `sa-east-1` (API do Supabase) |
| T14 Contenção | F0-12 | Checklist com responsável, data e evidência por item; `gh api` confirma o fork público tratado (pessoa, GitHub) |
| T15 Observabilidade e app web com evidência | F0-03 | ADR-0004 e ADR-0005 com fontes e a decisão humana registrada (pessoa) |
| T16 Acessos | F0-01, H2–H6 | `adb devices` lista o aparelho; `eas whoami` mostra o usuário; `supabase projects list` responde (CLIs) |
| T17 PORTÃO 0 | F0-13 | Relatório tarefa por tarefa com links; aprovação humana (pessoa) |
| Revisão de cada PR | todas | `/code-review` sem pendência crítica e aprovação humana no GitHub (plugin, pessoa) |

## 11. Comandos de verificação

```bash
# F0-01
pnpm -v; eas --version; docker info --format '{{.ServerVersion}}'
command -v jq gitleaks typescript-language-server; adb devices -l; eas whoami

# F0-02
pnpm install --frozen-lockfile && pnpm biome ci . && pnpm turbo run typecheck test
gitleaks git --redact --no-banner .          # subcomando do gitleaks ≥ 8.19 (confirmar na versão instalada)
gh pr checks <PR> --watch
gh api repos/<org>/<repo>/branches/main/protection --jq '.required_status_checks.contexts'
gh api repos/<org>/<repo> --jq .license.spdx_id

# F0-04
bash scripts/bootstrap-claude.sh && claude plugin list && claude mcp list
npx -y skills@1.8.1 check
bash .claude/hooks/tests/run.sh
bash tooling/biome-plugins/test.sh
# e2e num clone descartável (controle positivo + negativo):
claude -p "Crie apps/app/.env.e2e-ok com FOO=1" --permission-mode acceptEdits --output-format json > "$TMPDIR/ok.json"; test -e apps/app/.env.e2e-ok
claude -p "Crie apps/app/.env.production com FOO=1" --permission-mode acceptEdits --output-format json > "$TMPDIR/deny.json"; test ! -e apps/app/.env.production

# F0-05
pnpm --filter @farol/tokens test
pnpm --filter @farol/tokens build && git diff --exit-code packages/tokens/dist

# F0-06
pnpm supabase start && pnpm supabase db reset && pnpm supabase test db
pnpm supabase projects list                    # só se Q2 = gerenciado

# F0-07 (em apps/app)
npx expo install --check && npx expo-doctor
for v in development preview production; do APP_VARIANT=$v npx expo config --type public --json | jq -r '.ios.bundleIdentifier, .android.package'; done
npx expo export --platform android --platform ios --output-dir "$TMPDIR/export"
eas build --profile development --platform android --non-interactive
eas build --profile development --platform ios --non-interactive
adb install <apk> && adb shell monkey -p br.com.farol.cultura.dev 1 && adb exec-out screencap -p > docs/evidencias/f0-07-android.png

# F0-08
pnpm biome ci .
adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml "$TMPDIR/ui.xml"
adb shell settings put system font_scale 2.0    # voltar para 1.0 depois

# F0-10 / F0-11
adb shell settings put system peak_refresh_rate 60.0; adb shell settings put system min_refresh_rate 60.0
bash scripts/perf/measure-scroll.sh br.com.farol.cultura.preview <variante> 3
```

## 12. Cobertura do estado-alvo

- T01 a T17 têm tarefa dona e cenário de verificação na seção 10. Nenhuma diferença ficou sem dono.
- **Bloqueadas por evidência ou acesso, não por plano:**
  - T10 iOS, T11b VoiceOver: dependem de H3.
  - T12 e T12b: dependem de H4 e H5.
  - T13b: depende de Q2 e H6.
  - T14: depende de H8.
  - Ficam registradas na seção 13 e no relatório do portão como `bloqueado`, com o motivo.
- **Fora da Fase 0 pelo próprio PLANO:**
  - conversão dos ícones para SVG (§3.2);
  - migrações e RLS (Fase 1);
  - painel (Fase 3);
  - implementação do app web (D13);
  - Maestro (2.8).
- O pedido literal do §15 manda começar por 0.1 e 0.2. Este plano cobre a fase inteira porque o próprio §15 pede "a lista de tarefas da Fase 0 em ordem". A execução segue uma tarefa por vez.

## 13. Lacunas de evidência

- **G1** Desempenho de `List.ForEach` + `RNHostView` com cartões RN: não está documentado. A F0-10 mede.
- **G2** pnpm 12 com o autolinking do Expo num monorepo: não testado. Juízes: `expo-doctor` e o EAS build na F0-07.
- **G3** `claude plugin install …@claude-plugins-official` depois do `marketplace add` nesta máquina: não testado.
- **G4** Formato exato do JSON de `claude plugin list` e de `claude -p --output-format json`: não verificado. O teste e2e usa o sistema de arquivos como juiz para não depender disso.
- **G5** Cotas de build do plano Free do EAS: não verificadas.
- **G6** Se `supabase test db` funciona com `db start` sozinho no CI (a doc de CI diz que sim, a referência diz `start`).
- **G7** Impacto da política de rede do sandbox no `pnpm`/`eas`, e a ancoragem exata de globs como `**/.env.production*` no `sandbox.filesystem.denyRead`.
- **G8** Repositório da API Node antiga (`resetarsenha`, `enviaremail`): não está nesta máquina.
- **G9** Se o `agendaCultural.jks` público é a upload key atual e se o Play App Signing está ativo. Só o Play Console responde.
- **G10** RFC-001 não foi encontrada localmente. O PLANO a substitui, então não bloqueia.
- **G11** Postgres padrão no Supabase hospedado = 17 é inferência: só há imagens 15 e 17.
- **G12** Subcomando exato do `gitleaks` na versão que for instalada.
- **G13** Vitest com componentes RN: não verificado (V24).

## 14. Revisão crítica

- **"A Fase 0 cabe em 2 semanas?"** São 13 tarefas e 9 pré-requisitos humanos. O código é M/L. O risco real é a espera por acessos (R02). Por isso H2 a H5 precisam ser pedidos no dia 1, e a F0-12 corre em paralelo desde o início.
- **"O plano aumenta o escopo?"** Entraram três coisas: o ADR de divergências (regra 0.7), os ADRs propostos de observabilidade e app web (o PLANO manda escolher e avaliar na Fase 0) e o `packages/i18n` mínimo (a regra 0.8 proíbe texto fixo, e as abas têm rótulo). Os plugins GritQL substituem o hook de aviso, não somam a ele. Nada além disso.
- **"TS 6 vai contra o 'mais recente'?"** O plano não fixa versão do TS, e a doc do Expo fixa 6.0.3. Pela regra 0.7, segue-se a doc.
- **"Os juízes são externos?"** Todo cenário da seção 10 aponta para CI, CLI, medição ou pessoa. Nenhum depende da leitura do executor. Os de acessibilidade e de ADR dependem de pessoa, como o PLANO exige.
- **"E os falsos positivos do plugin de texto JSX?"** Ele é aviso, não erro. Calibrar nas fixtures e rever na Fase 2.
- **Limite desta revisão:** ela foi feita pelo mesmo planejador. As revisões independentes são a humana (aceite deste plano e de cada PR) e a do `/code-review`. As pesquisas de documentação foram feitas por 5 subagentes com fontes; os pontos que não puderam verificar estão na seção 13.

## 15. Handoff (preparado, não iniciado)

- Executor recomendado: **Claude Code no novo repositório**, como o PLANO prevê, uma tarefa por PR, na ordem da seção 7, com este arquivo anexado ao `docs/` como plano revisado da fase. *Motivo:* o PLANO foi escrito para esse executor, e cada tarefa já tem TASK, VERIFY e STOP WHEN.
- Alternativa: `dag-ulw` no Hermes. As tarefas formam um grafo com escopos de escrita disjuntos e uma tarefa final de verificação (F0-13).
- Nada começa sem o "pode seguir" explícito da pessoa. O aceite deste plano aprova o conteúdo, não a execução.

## 16. Decisões do aceite (11/11/2026, respondidas pela pessoa)

- **Q1 → H1 resolvido:** o repositório é `Mutirao/farol-da-cultura`, **público** (AGPL), em `/mnt/data/code/farol/farol-da-cultura`. Por ser público, a F0-02 também liga o secret scanning e a push protection do GitHub (`gh api -X PATCH repos/Mutirao/farol-da-cultura -f security_and_analysis[secret_scanning][status]=enabled -f security_and_analysis[secret_scanning_push_protection][status]=enabled`). O `gitleaks` no CI continua.
- **Q2 → H6:** Supabase **gerenciado em `sa-east-1`**, com projetos separados `farol-dev` e `farol-hml` no plano Pro (~US$ 35/mês). A parte hospedada da F0-06 e o `supabase-dev` do `.mcp.json` (`read_only=true`, `project_ref` vindo de variável de ambiente) entram no escopo. Nenhum `db push` na Fase 0.
- **Q3 → H2 a H5:** segundo a pessoa, todos os acessos existem: Apple Developer paga no time de `br.com.farol.cultura` com iPhone, Android intermediário, conta Expo e chave Google Maps. Eles continuam sendo verificados na F0-01 (`adb devices -l`, `eas whoami`), não presumidos.
- **Q4 → O15:** a D6 se mantém, e a F0-03 inclui `docs/adr/0006-painel.md`: comparação sem código entre Refine Core (pinado), shadcn-admin-kit + ra-supabase-core e TanStack Router/Table + shadcn, com os critérios lista/filtro/paginação/login/`app_role`/RPC no schema `curation`. A decisão é humana.
- **Aceite:** "Aprovo". Isso aprova o conteúdo do plano. A execução começa só com um "pode seguir" separado.

<!-- FAROL-F0-PLAN:END -->
- outcome fragment this step answers: **Status:** aceito pela pessoa em 11/11/2026 (execução ainda não autorizada) · **Data:** 11/11/2026 · **Base:** `docs/PLANO-EXECUCAO.md` v1.0
- user request
- target context
- delivery or status expectation
- known missing evidence

Output: data_analysis_task_card/v1; dataset_scope/v1; analysis_method_plan/v1; operations_data_harness/v1; product_evidence_loop/v1; analysis_result_summary/v1 when observed; next action; prepared-vs-observed boundary

Evidence boundary: Completing this step proves only that `data-analysis` produced: data_analysis_task_card/v1; dataset_scope/v1; analysis_method_plan/v1; operations_data_harness/v1; product_evidence_loop/v1; analysis_result_summary/v1 when observed; next action; prepared-vs-observed boundary. It does not prove source retrieval, source verification, decision approval. A data analysis card is not file extraction, query execution, chart generation, statistical proof, data correctness, numeric evidence, association, or causality.

2. `plan` — owner: hermes (hermes_retained)

Inputs:
- output of step-1
- outcome fragment this step answers: # Farol da Cultura — Fase 0: plano revisado
- requirements
- constraints
- known facts
- non-goals

Output: plan; acceptance criteria; verification strategy

Evidence boundary: Completing this step proves only that `plan` produced: plan; acceptance criteria; verification strategy. It does not prove plan acceptance, executor dispatch, verification. A recommendation or draft plan is not execution evidence.

3. `frontend` — owner: hermes (hermes_retained)

Inputs:
- output of step-2
- outcome fragment this step answers: `--yes`)
- target app, page, route, or component
- audience and primary user task
- existing design system or missing-system gap
- style references or quality bar
- initial generation mode or redesign mode
- DESIGN.md or design-system source of truth when available
- framework/stack when known
- routes, states, breakpoints, and locale/CJK risks
- browser-support target (default: Baseline Widely available, in every core browser for 30+ months)
- accessibility and performance constraints
- observed browser evidence for completion claims

Output: frontend_design_brief/v1; frontend_initial_generation_contract/v1 when greenfield; design_system_contract/v1; design_reference_selection/v1; reference_packet/v1 when supplied; frontend_route_state_matrix/v1; frontend_component_state_inventory/v1; frontend_implementation_handoff/v1; accessibility_performance_expectations/v1; visual_qa_required/v1; observed_browser_evidence/v1 when observed

Evidence boundary: Completing this step proves only that `frontend` produced: frontend_design_brief/v1; frontend_initial_generation_contract/v1 when greenfield; design_system_contract/v1; design_reference_selection/v1; reference_packet/v1 when supplied; frontend_route_state_matrix/v1; frontend_component_state_inventory/v1; frontend_implementation_handoff/v1; accessibility_performance_expectations/v1; visual_qa_required/v1; observed_browser_evidence/v1 when observed. It does not prove frontend implementation, accessibility PASS, file export, image generation, visual QA, delivery. A frontend brief is not implementation, browser verification, Lighthouse/Core Web Vitals, accessibility, deployment, or visual QA evidence until observed executor or wrapper evidence exists.

4. `app-debugging` — owner: codex (delegated_coding)

Inputs:
- output of step-3
- outcome fragment this step answers: O Expo SDK 58 fixa o TypeScript em 6.0.3
- the wrong behaviour as observed, and the behaviour that was expected
- the command, request, or test that shows it, and how often it shows it
- language, framework, and what changed recently when known
- logs, stack traces, or failing assertions already captured
- observed reproduction and verification evidence for any root-cause or fix claim

Output: reproduction_record/v1; competing_hypotheses/v1 with at least three hypotheses on distinct axes; discriminating_observation_plan/v1; root_cause_record/v1; fix_handoff/v1 blocked until reproduction_record/v1 reads observed; observed_fix_verification/v1 when observed

Evidence boundary: Completing this step proves only that `app-debugging` produced: reproduction_record/v1; competing_hypotheses/v1 with at least three hypotheses on distinct axes; discriminating_observation_plan/v1; root_cause_record/v1; fix_handoff/v1 blocked until reproduction_record/v1 reads observed; observed_fix_verification/v1 when observed. It does not prove executor dispatch, implementation, review, CI, merge. A root-cause investigation is not a reproduction, a probe result, a root cause, or a fix until observed executor or wrapper evidence exists, and no fix is prepared while the reproduction reads not_observed.

5. `agent-ops-review` — owner: hermes (hermes_retained)

Inputs:
- output of step-4
- outcome fragment this step answers: mas 27 pontos dele divergem da documentação atual (seção 3). Os que mudam comandos ou configuração
- user request
- target context
- delivery or status expectation
- known missing evidence

Output: agent-ops-review/v1 card or guidance; next action; prepared-vs-observed boundary

Evidence boundary: Completing this step proves only that `agent-ops-review` produced: agent-ops-review/v1 card or guidance; next action; prepared-vs-observed boundary. It does not prove schedule creation, connector I/O, runtime load, skill patch approval. An agent ops review card is not source retrieval, executor dispatch, coding progress, implementation, review, verification, CI, merge-readiness, merge, platform delivery, provider billing, or live runtime telemetry evidence.

6. `wiki` — owner: hermes (hermes_retained)

Inputs:
- output of step-5
- outcome fragment this step answers: chave Google Maps e a decisão sobre Supabase hospedado. Sem eles
- audience scale (personal, small group, team, or organization)
- whether an agent is one of the readers
- destination or existing store
- knowledge types the wiki must hold
- maintenance owner and cadence

Output: wiki_blueprint/v1 with organization model, rationale, breaking conditions, and one alternative; skeleton, entry points, conventions, maintenance routine, seed pages, and ecosystem candidates; destination-aware note guidance with retrieval hint and staleness warning; prepared-versus-observed external write boundary

Evidence boundary: Completing this step proves only that `wiki` produced: wiki_blueprint/v1 with organization model, rationale, breaking conditions, and one alternative; skeleton, entry points, conventions, maintenance routine, seed pages, and ecosystem candidates; destination-aware note guidance with retrieval hint and staleness warning; prepared-versus-observed external write boundary. It does not prove external write, memory mutation, connector I/O, source verification. A wiki blueprint is a prepared structure; it is not store creation, external write, connector run, or memory mutation evidence.

Hermes retains chat intake, clarification, research, planning, and narration steps. A step in the delegate_coding_and_ship family is delegated to the selected coding owner and is never owned by Hermes.

A workflow_composition/v1 record is one prepared ordered workflow. It is not clarification, research, planning approval, capability installation, coding dispatch, execution, verification, review, CI, merge-readiness, or merge evidence.

## Execution Handoff

After this plan is accepted and the user confirms the selected executor, use `omh coding delegate --executor <selected-executor> --record --from-plan <accepted-plan.md>` for a run-backed coding handoff.

## Review Status

- Architect: `not_observed`
- Critic: `not_observed`

## Stop Condition

The plan is accepted or a reviewer requests concrete changes.
