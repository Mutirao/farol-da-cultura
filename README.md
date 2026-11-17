# Farol da Cultura

Ecossistema de informações culturais apoiado nas instâncias de Mapas Culturais:
aplicativo público **Android, iOS e web**, painel administrativo separado,
múltiplos scrapers/conectores, instâncias conectadas e cidades.

Mapas Culturais é a referência institucional. A coleta externa passa por
normalização, curadoria e incorporação na instância; só depois da confirmação
pela API pode alimentar a agenda pública do Farol. Supabase apoia a operação e
a projeção de leitura, sem substituir essa referência.

## Documentação vigente

- [Ontologia e fluxo institucional](docs/ONTOLOGIA-E-FLUXO.md): termos, entidades,
  proveniência, instâncias/bases/cidades e etapas do fluxo.
- [Plano unificado](docs/PLANO-UNIFICADO-2026-11-16.md): evolução integrada e gates.
- [ADR-0009](docs/adr/0009-ecossistema-institucional.md): decisões aprovadas em
  2026-11-17 e relação com os ADRs anteriores.
- [Plano mobile](docs/PLANO-APP-MOBILE.md) e [Fase 0](docs/PLANO-FASE-0-REVISADO.md):
  histórico das entregas e pendências, sem limitar o escopo atual.

## Estado da implementação

O app Expo tem demonstração Android e importador da API do Mapa Cultural do
Ceará. O alvo web público ainda precisa ser habilitado e validado; iOS exige
prova própria em aparelho. O painel é uma composição mínima React-admin +
ra-supabase, ainda sem operação completa. Múltiplos scrapers, instâncias e
cidades são requisitos planejados, não integrações já entregues.

## Requisitos

- Node 26 (`.nvmrc`)
- pnpm 12.18.0 (`packageManager`)

## Comandos

```bash
pnpm install
pnpm biome ci .
pnpm turbo run typecheck test
```

## Licença

[AGPL-3.0](LICENSE) (`AGPL-3.0-only`).
