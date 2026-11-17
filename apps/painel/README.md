# Painel — prova de compatibilidade U0.3

Pacote mínimo React-admin padrão + ra-supabase; ainda não é o painel operacional.
D6 revisada pelo usuário em 2026-11-16; ver [ADR-0008](../../docs/adr/0008-plataforma-unificada.md).

```bash
pnpm install --frozen-lockfile --strict-peer-dependencies
pnpm --filter @farol/painel typecheck
pnpm --filter @farol/painel build
pnpm --filter @farol/painel dev
```

Sem configuração, a SPA mostra somente o resultado da composição. A composição
React-admin usa `ready` para a tela sem recursos; não descobre tabelas, não
habilita CRUD, não solicita sessão e desliga telemetria. O aspecto é o padrão do
framework, não o design final U5.

O operador pode fornecer `VITE_SUPABASE_URL` e
`VITE_SUPABASE_PUBLISHABLE_KEY` para compor o data provider. **Tudo com prefixo
VITE é público; nunca usar service_role.** Não há arquivos de credenciais nesta
prova. A verificação de build configurado utilizou uma string sintética sem
permissão, sem chamadas ao backend, apenas para impedir que o bundler eliminasse
React-admin por falta de configuração.

Não há login por senha nem magic link implementado aqui. O adaptador sem senha,
a confirmação de OTP e as ações autenticadas/RPCs pertencem ao restante do plano.

## Papel no ecossistema

O painel operacional deverá atender múltiplas fontes/scrapers, instâncias e
cidades, com relações de base compartilhada explicitadas. Curadoria, preparação
de envio, confirmação na API institucional e sincronização têm evidências e
ações distintas. Registros coletados não são publicados diretamente na agenda
pelo painel: precisam ser incorporados na instância de Mapas Culturais e
confirmados na API. Essa operação ainda não está implementada nesta prova.

Aplicativo público Android/iOS/web e painel web são interfaces separadas.
Referências: [ontologia e fluxo](../../docs/ONTOLOGIA-E-FLUXO.md),
[ADR-0009](../../docs/adr/0009-ecossistema-institucional.md) e
[plano unificado](../../docs/PLANO-UNIFICADO-2026-11-16.md).

Resultados e limites: [relatório U0.3](../../docs/relatorios/unificacao-painel-compatibilidade.md).
O arquivo CLAUDE.md local ainda descreve a decisão anterior; não foi modificado
porque mudanças de instruções precisam de autorização específica.
