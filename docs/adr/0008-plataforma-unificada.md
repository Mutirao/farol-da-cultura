# ADR-0008: Plataforma unificada de coleta, curadoria e agenda

- **Status:** Revisão D6 aceita pelo usuário em 2026-11-16; arquitetura parcialmente proposta. Publicação direta de coleta na agenda superada pelo [ADR-0009](0009-ecossistema-institucional.md), de 2026-11-17. Corte, capacidade hospedada e exceção CSV continuam condicionados aos gates.
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
4. **Fronteira institucional (revisão de 2026-11-17):** a proposta anterior
   de publicar Sympla diretamente na agenda foi superada. Coletar não aprova;
   aprovar não envia; exportar não comprova incorporação. Preparação permanece
   restrita até confirmação do registro pela API da instância de Mapas
   Culturais; a sincronização institucional então alimenta a agenda. Ausência
   em listagem parcial não prova cancelamento. Recoleta não substitui dados
   institucionais exibidos nem apaga decisões ou dados brutos históricos.
5. **Contrato Mapa preservado:** `importar_agenda(text,jsonb)` mantém algoritmo,
   privilégios e snapshot por janela, restrito a `mapa-cultural-ce`. Sympla não
   pode chamar esse algoritmo destrutivo. Múltiplas instâncias/bases/cidades
   exigem contrato de identidade, cobertura e testes antes da generalização;
   não ampliar o guard por conveniência. Cinco tabelas de agenda e suas
   políticas públicas não são remodeladas como efeito automático da revisão.
6. **Auth:** login administrativo sem senha, cadastro público desabilitado,
   `shouldCreateUser:false` e confirmação explícita antes de `verifyOtp`. O
   adaptador de magic link ainda precisa ser implementado/testado; não é uma
   capacidade pronta atribuída a ra-supabase. Nunca service_role no cliente.
7. **CSV (condicional, não aceito como deploy):** manter bytes de lotes históricos
   e renderer caracterizado. A única exceção Edge proposta é exportações;
   compatibilidade Node/Edge e limites de CPU/memória/payload serão comparados
   com SQL e medidos em U4. Não criar fila/microserviço nem comprar capacidade
   como solução automática.

8. **Escopo ampliado pelo ADR-0009:** aplicativo público Android, iOS e web;
   painel separado; múltiplos scrapers, instâncias (incluindo subsites) e
   cidades. Ceará e Sympla/Fortaleza são pilotos. Compartilhamento de base é
   registrado separadamente, com proveniência e identidade preservadas.

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
- U1.5/U2–U5: contratos multidimensionais, scrapers, curadoria, envio, confirmação na API, sincronização, exportação e painel com testes reais.
- U8: aplicativo público web e validação própria de Android/iOS/web; composição do painel e export mobile não satisfazem esse gate.
- U6/U7: ensaio de migração, reconciliação de dados, autorização de corte e deploy.
