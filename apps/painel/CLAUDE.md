@../../AGENTS.md

## Específico de `apps/painel`

Painel administrativo separado do aplicativo público. D6 revisada em 16/11/2026: React-admin padrão + ra-supabase (ver `docs/adr/0008-plataforma-unificada.md`; `0006-painel.md` é histórico do Refine). Hoje há só a prova de composição U0.3 (ver `README.md`). O painel opera coleta, curadoria, preparação de envio e confirmação na API institucional; nunca publica registro coletado direto na agenda (ADR-0009). Não importar Expo/React Native nem `@farol/i18n` inteiro.
