@../../AGENTS.md

## Específico de `workers/coleta`

Sincronização da agenda a partir da API do Mapa Cultural do Ceará (piloto): `src/mapaCultural.ts` + RPC `public.importar_agenda`, cujo guard aceita só `mapa-cultural-ce`. Não adicionar Chromium/Crawlee aqui nem reutilizar o snapshot para scraping ou outra instância sem contrato e testes (ver `README.md`, `docs/ONTOLOGIA-E-FLUXO.md` e `docs/PLANO-UNIFICADO-2026-11-16.md`). A raspagem legada fica em `/mnt/data/code/farol/raspagem-farol` (`Mutirao/Raspagem-Farol`) e será portada para pacote próprio.
