# Checklist de contenção — Fase 0 (F0-12, SEG-01)

**Status:** documento aberto para execução humana · **Data de criação:** 12/11/2026
**Origem:** `docs/PLANO-FASE-0-REVISADO.md`, seção 0.9 (F0-12) e seção 13 (Lacunas de evidência).

> O agente que escreveu este checklist **nunca leu nem manipulou valores de
> segredo**. Nenhum item abaixo foi executado por um agente. Os campos
> **responsável**, **data**, **evidência** e **assinatura** são preenchidos por
> uma pessoa, no momento em que o item correspondente é executado. O campo
> **assinatura** fica **em branco** até a execução humana real — nunca
> preencha com um nome, iniciais ou "ok" em nome de alguém.
>
> Este documento entra no **PORTÃO 0**: a Fase 0 não se conclui enquanto os
> itens abaixo não estiverem todos assinados.

## Como preencher cada item

- **Responsável:** nome da pessoa que executou a ação (não um agente).
- **Data:** data da execução (`DD/MM/AAAA`).
- **Evidência:** link, print, ID de ticket ou trecho de log que comprove a
  ação (sem incluir o valor do segredo em si).
- **Assinatura:** nome e confirmação explícita da pessoa responsável. **Em
  branco neste documento.**

---

## 1. Keystore `agendaCultural.jks` público e `key.properties` versionado

Contexto: o keystore Android `agendaCultural.jks` está versionado no
repositório privado `farol-cultural` (junto com `android/key.properties`) e é
também **público** em dois repositórios: `Instituto-Dragao-do-Mar/agenda_cultural`
e no fork `Mutirao/farol_agenda_cultural`.

### 1.1 Conferir no Play Console se o Play App Signing está ativo

- Responsável: _______________________
- Data: _______________________
- Evidência: _______________________
- Assinatura: _______________________

### 1.2 Pedir o reset da upload key

- Responsável: _______________________
- Data: _______________________
- Evidência: _______________________
- Assinatura: _______________________

### 1.3 Nunca reusar essa chave no EAS

- Responsável: _______________________
- Data: _______________________
- Evidência: _______________________
- Assinatura: _______________________

### 1.4 Tornar privado ou arquivar `Mutirao/farol_agenda_cultural`

- Responsável: _______________________
- Data: _______________________
- Evidência: _______________________
- Assinatura: _______________________

### 1.5 Pedir o mesmo ao Instituto Dragão do Mar (`Instituto-Dragao-do-Mar/agenda_cultural`)

- Responsável: _______________________
- Data: _______________________
- Evidência: _______________________
- Assinatura: _______________________

## 2. Credenciais do `importador-idm`

Contexto: `appsettings.json`, `appsettings.Development.json`,
`appsettings.Production.json` e as cópias em `bin/` estão versionados com
credenciais.

- Responsável: _______________________
- Data: _______________________
- Evidência: _______________________
- Assinatura: _______________________

## 3. Chave Google Maps do `AndroidManifest` do app antigo

Contexto: o `AndroidManifest` do app antigo (`farol-cultural`) contém uma
chave Google Maps versionada. Restringir (por pacote/assinatura/IP) ou
trocar a chave.

- Responsável: _______________________
- Data: _______________________
- Evidência: _______________________
- Assinatura: _______________________

## 4. Segredos da API Node antiga

Contexto: o repositório da API Node antiga (`resetarsenha`, `enviaremail`)
não está acessível nesta máquina. O dono do repositório precisa confirmar
quais segredos existem e seu estado.

- Responsável: _______________________
- Data: _______________________
- Evidência: _______________________
- Assinatura: _______________________

## 5. Desligar `resetarsenha` e `enviaremail`

Contexto: desligar os endpoints `resetarsenha` e `enviaremail` da API Node
antiga. Isso faz o app antigo perder a troca de senha, então é preciso
combinar e publicar uma mensagem avisando os usuários **antes** de desligar.

- Responsável: _______________________
- Data: _______________________
- Evidência (inclui a mensagem combinada e o canal onde foi publicada): _______________________
- Assinatura: _______________________

## 6. Confirmar os selos com a Secult

Contexto: confirmar com a Secult quais selos são válidos e quem mantém a
lista oficial de selos.

- Responsável: _______________________
- Data: _______________________
- Evidência: _______________________
- Assinatura: _______________________

## 7. Nomear quem responde cada questão da seção 13 (ADR-0004 e demais lacunas)

Contexto: a seção 13 do `docs/PLANO-FASE-0-REVISADO.md` lista as lacunas de
evidência (G1 a G13). Cada uma precisa de um responsável nomeado por uma
pessoa — este item não decide as respostas, só nomeia quem responde.

| Lacuna | Pergunta (resumo)                                                                                       | Responsável nomeado     | Data                    | Evidência               | Assinatura              |
| ------ | ------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------- | ----------------------- | ----------------------- |
| G1     | Desempenho de `List.ForEach` + `RNHostView` com cartões RN                                              | _______________________ | _______________________ | _______________________ | _______________________ |
| G2     | pnpm 12 com autolinking do Expo num monorepo                                                            | _______________________ | _______________________ | _______________________ | _______________________ |
| G3     | `claude plugin install …@claude-plugins-official` após `marketplace add` nesta máquina                  | _______________________ | _______________________ | _______________________ | _______________________ |
| G4     | Formato exato do JSON de `claude plugin list` e `claude -p --output-format json`                        | _______________________ | _______________________ | _______________________ | _______________________ |
| G5     | Cotas de build do plano Free do EAS                                                                     | _______________________ | _______________________ | _______________________ | _______________________ |
| G6     | Se `supabase test db` funciona com `db start` sozinho no CI                                             | _______________________ | _______________________ | _______________________ | _______________________ |
| G7     | Impacto da política de rede do sandbox no `pnpm`/`eas`, e ancoragem de globs como `**/.env.production*` | _______________________ | _______________________ | _______________________ | _______________________ |
| G8     | Repositório da API Node antiga (`resetarsenha`, `enviaremail`) não está nesta máquina                   | _______________________ | _______________________ | _______________________ | _______________________ |
| G9     | Se o `agendaCultural.jks` público é a upload key atual e se o Play App Signing está ativo               | _______________________ | _______________________ | _______________________ | _______________________ |
| G10    | RFC-001 não encontrada localmente (não bloqueia, o PLANO a substitui)                                   | _______________________ | _______________________ | _______________________ | _______________________ |
| G11    | Postgres padrão no Supabase hospedado (inferência: 17)                                                  | _______________________ | _______________________ | _______________________ | _______________________ |
| G12    | Subcomando exato do `gitleaks` na versão instalada                                                      | _______________________ | _______________________ | _______________________ | _______________________ |
| G13    | Vitest com componentes RN (V24)                                                                         | _______________________ | _______________________ | _______________________ | _______________________ |

Além das lacunas G1–G13, a decisão específica do **ADR-0004** (Expo Observe ×
Sentry, cobrindo app, painel e funções do OPS-03) precisa de um responsável
nomeado:

| Decisão                          | Responsável nomeado     | Data                    | Evidência               | Assinatura              |
| -------------------------------- | ----------------------- | ----------------------- | ----------------------- | ----------------------- |
| ADR-0004 — Expo Observe × Sentry | _______________________ | _______________________ | _______________________ | _______________________ |

---

## Status geral

| Item | Descrição                                            | Assinado? |
| ---- | ---------------------------------------------------- | --------- |
| 1.1  | Play App Signing ativo?                              | [ ]       |
| 1.2  | Reset da upload key pedido                           | [ ]       |
| 1.3  | Chave nunca reusada no EAS                           | [ ]       |
| 1.4  | `Mutirao/farol_agenda_cultural` privado ou arquivado | [ ]       |
| 1.5  | Pedido equivalente ao Instituto Dragão do Mar        | [ ]       |
| 2    | Credenciais do `importador-idm` contidas             | [ ]       |
| 3    | Chave Google Maps restringida ou trocada             | [ ]       |
| 4    | Segredos da API Node antiga confirmados pelo dono    | [ ]       |
| 5    | `resetarsenha`/`enviaremail` desligados com aviso    | [ ]       |
| 6    | Selos confirmados com a Secult                       | [ ]       |
| 7    | Responsáveis pela seção 13 e pelo ADR-0004 nomeados  | [ ]       |

Este documento só se considera concluído quando todas as linhas acima
estiverem marcadas e todas as assinaturas (seções 1–7) estiverem
preenchidas por pessoas reais.
