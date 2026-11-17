# ADR-0008: Plataforma unificada de coleta, curadoria e agenda

- **Status:** Proposta arquitetural do plano unificado; revisão D6 aceita pelo usuário em 2026-11-16. Corte, capacidade hospedada e exceção CSV continuam condicionados aos gates.
- **Data:** 2026-11-16
- **Referências:** [plano unificado](../PLANO-UNIFICADO-2026-11-16.md), [ADR-0006](0006-painel.md), [ADR-0007](0007-importacao-da-agenda.md), [prova U0.3](../relatorios/unificacao-painel-compatibilidade.md).

## Contexto

A raspagem vive em outro repositório e possui dez tabelas, dados históricos e
contratos próprios. O app Expo consulta cinco tabelas de agenda. Unificar não
significa trocar o armazenamento bruto por uma projeção pública, nem carregar
Chromium no importador API ou no app.

O ADR-0006 registrava a decisão anterior por Refine Core. O usuário reabriu D6 e
aprovou React-admin padrão com ra-supabase, condicionado à prova U0.3. Este ADR
registra a revisão sem reescrever a evidência histórica. A instalação estrita,
o typecheck, o build e a composição local dessa escolha foram exercitados.

## Decisão proposta e parte aceita

1. **Painel (D6 aceita):** SPA React-admin padrão + ra-supabase, sem Refine,
   shadcn-admin-kit ou outro kit sobreposto. Material UI é dependência do painel,
   nunca do Expo. Usar React 19.3.0 compatível com o app, sem importar a camada
   nativa ou o pacote i18n dependente de expo-localization na SPA.
2. **Monorepo e banco lógico comum:** preservar `workers/coleta` como importador
   API leve; coletor Chromium em `workers/sympla`. Uma autoridade de migrations
   em `supabase/migrations`, sem NestJS, AdminJS ou ORM paralelo. O projeto
   hospedado e seu orçamento dependem do gate humano; não presumir que o Free
   comporte HTML bruto e CSV base64.
3. **Staging restrito:** dez tabelas legadas e IDs inteiros preservados. RLS e
   grants explícitos; anon não lê coleta. Curador ativo é derivado de Auth UUID
   via `private.curator_identities` e usuário legado ativo com papel curator.
   Configuração de conectores, tokens, recibos e CSV base64 não ficam públicos.
4. **Publicação explícita:** coletar não aprova; aprovar não publica; exportar
   não publica. Sympla usa publicação incremental por fonte/ID, com controle de
   versão. Ausência na listagem parcial não apaga nem cancela conteúdo. Recoleta
   não sobrescreve o snapshot público e não desfaz despublicação. A projeção
   editorial não substitui nem modifica os dados brutos históricos.
5. **Contrato Mapa preservado:** `importar_agenda(text,jsonb)` mantém algoritmo,
   privilégios e snapshot por janela, restrito a `mapa-cultural-ce`. Sympla não
   pode chamar esse algoritmo destrutivo; terá RPCs próprias. Cinco tabelas
   mobile e suas políticas públicas não são remodeladas por conveniência.
6. **Auth:** login administrativo sem senha, cadastro público desabilitado,
   `shouldCreateUser:false` e confirmação explícita antes de `verifyOtp`. O
   adaptador de magic link ainda precisa ser implementado/testado; não é uma
   capacidade pronta atribuída a ra-supabase. Nunca service_role no cliente.
7. **CSV (condicional, não aceito como deploy):** manter bytes de lotes históricos
   e renderer caracterizado. A única exceção Edge proposta é exportações;
   compatibilidade Node/Edge e limites de CPU/memória/payload serão comparados
   com SQL e medidos em U4. Não criar fila/microserviço nem comprar capacidade
   como solução automática.

## Consequências

- Menos integrações próprias, não uma redução presumida de dependências
  transitivas. O build configurado do spike emitiu aviso de chunk grande;
  otimização será medida, não escondida alterando limites.
- App, painel e workers compartilham repositório e contratos, não processo,
  bundle ou credenciais. A exportação Android/iOS do spike não contém fontes
  MUI/React-admin nos sourcemaps.
- Integração exige preservar dados, IDs, relações, sequences e bytes de CSV;
  comparar manifestos antes do corte, ensaiar rollback e manter a origem
  intacta. Baseline DDL não é migração dos dados históricos.
- Autorização continua no banco/RPC, não em campos controlados pelo navegador.
  Não se expõe CRUD direto de curadoria para aproveitar componentes genéricos.
- A prova U0.3 não entrega o painel operacional. Não autoriza db push, migração
  hospedada, cron, deploy, encerramento do legado ou compra de infraestrutura.
- ADR-0006/0007 permanecem registros históricos. Ponteiros AGENTS.md/CLAUDE.md
  ainda mencionam a escolha anterior e só podem mudar com autorização própria.

## Gates ainda abertos

- U0/D3: destino hospedado, volume de HTML/CSV, capacidade e backup confirmados
  por humano. Sem isso, não declarar o gate U0 inteiro concluído.
- U2–U5: coletor, RPCs, publicação, exportação e painel completo com testes reais.
- U6/U7: ensaio de migração, reconciliação de dados, autorização de corte e deploy.
