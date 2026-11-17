# Unificação — inventário de origem e destino

**Data:** 2026-11-16. **Loop:** U0.2 do `docs/PLANO-UNIFICADO-2026-11-16.md`.

Origem inspecionada: `/mnt/data/code/farol/raspagem-farol`, HEAD `941a75866c329594fc792501734c48e19afce8ff` (confere com o plano). WIP alheios (`chart/templates/dev-postgres.yaml`, `chart/templates/migration-job.yaml`, `kimi-export-session_-20261007-011240.md`) apenas listados pelo `git status`, não tocados.

## 1. Dez tabelas legadas (DDL em `src/db/migrations/0000`–`0004`)

Todas com PK `serial` (sequences implícitas `<tabela>_id_seq`), schema `public` na origem.

| #   | Tabela                   | Colunas                                                                                                                                                                                                                                                                                                                                                                        | Constraints de checagem/unique                                                                                                               | FKs                           |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | `sources`                | id, slug, name, is_active, kind, created_at, updated_at                                                                                                                                                                                                                                                                                                                        | unique(slug); kind default 'unknown'                                                                                                         | —                             |
| 2   | `connectors`             | id, source_id, type, config_json, is_active, created_at, updated_at                                                                                                                                                                                                                                                                                                            | check type in ('crawler','api')                                                                                                              | → sources (cascade)           |
| 3   | `events`                 | id, source_id, external_id, source_url, title, description, normalized_title, starts_at, ends_at, venue_name, venue_address, venue_raw, is_free, price_min/max, price_raw, avatar_url, raw_json, version, space_match_* (3), curation_* (3), export_* (3), mapas_import_* (3), city, modality, collection_status, collection_reason, last_collected_at, created_at, updated_at | unique(source_id, external_id); checks: space_match_status, curation_status, export_status, mapas_import_status, modality, collection_status | → sources (cascade)           |
| 4   | `spaces`                 | id, mapas_space_id, source_name, normalized_name, municipality, is_active, is_stale, last_synced_at, created_at, updated_at                                                                                                                                                                                                                                                    | unique(mapas_space_id)                                                                                                                       | —                             |
| 5   | `event_space_candidates` | id, event_id, space_id, score, rank, algorithm_version, curator_decision, created_at                                                                                                                                                                                                                                                                                           | check curator_decision null or in ('accepted','rejected')                                                                                    | → events, → spaces (cascade)  |
| 6   | `job_runs`               | id, job_type, source_id, status, owner, started_at, finished_at, counters, error, lock_key, details                                                                                                                                                                                                                                                                            | check status in ('running','succeeded','partial','failed','skipped') — substituído em 0004                                                   | → sources (set null)          |
| 7   | `exports`                | id, csv_content_base64, checksum_sha256, schema_version, row_count, created_by, status, created_at, updated_at                                                                                                                                                                                                                                                                 | check status in ('pending','completed','failed')                                                                                             | —                             |
| 8   | `export_items`           | id, export_id, event_id, result, created_at                                                                                                                                                                                                                                                                                                                                    | —                                                                                                                                            | → exports, → events (cascade) |
| 9   | `users`                  | id, email, is_active, created_at, updated_at, display_name, role                                                                                                                                                                                                                                                                                                               | unique(email); role default 'curator'                                                                                                        | —                             |
| 10  | `login_tokens`           | id, user_id, token_hash, expires_at, consumed_at, request_metadata, created_at                                                                                                                                                                                                                                                                                                 | —                                                                                                                                            | → users (cascade)             |

Extensões usadas pela origem: `pg_trgm`, `unaccent` (migration 0000, confirmadas contra postgres:16-alpine no `docker-compose.test.yaml`).

## 2. Cinco tabelas mobile no destino (estado local real)

Banco local (`supabase_db_farol`, Postgres **17.11**):

| Tabela               | Linhas | Sequence (last_value)      |
| -------------------- | ------ | -------------------------- |
| `categorias`         | 25     | categorias_id_seq = 57     |
| `espacos`            | 70     | espacos_id_seq = 105       |
| `eventos`            | 176    | eventos_id_seq = 227       |
| `eventos_categorias` | 171    | —                          |
| `eventos_datas`      | 251    | eventos_datas_id_seq = 338 |

Índices existentes: 12 (pkeys, `eventos_fonte_id_externo_key`, `espacos_fonte_id_externo_key`, `eventos_datas_evento_id_externo_key`, `categorias_nome_key`, 3 índices não-unique de FK/data).

Extensões presentes no destino: `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`. **`pg_trgm` e `unaccent` NÃO existem** — o baseline DDL (U1.1) precisa criá-las com `IF NOT EXISTS`.

## 3. Prova de não-colisão de nomes

Tabelas em `public` no destino antes da integração: `categorias`, `espacos`, `eventos`, `eventos_categorias`, `eventos_datas` — 61 tabelas no total contando schemas do Supabase (`auth`, `storage`, `realtime`, `vault` etc.). Nenhuma das dez legadas (`sources`, `connectors`, `events`, `spaces`, `event_space_candidates`, `job_runs`, `exports`, `export_items`, `users`, `login_tokens`) existe em `public`; `users` existe apenas como `auth.users` (schema separado, sem conflito). Nomes distintos das cinco mobile: nenhuma renomeação necessária, conforme decisão do plano §3.2.

Migrations do destino: `20261113015139_agenda_minima.sql`, `20261113020741_importar_agenda.sql`. Numeração proposta para as novas (`20261117000100` em diante): livre, sem colisão.

## 4. Histórico de migrations da origem

Cinco SQL sequenciais em `src/db/migrations/` (Drizzle `statement-breakpoint`), 165 linhas no total; histórico `drizzle.__drizzle_migrations` existe apenas no banco hospedado da origem e será tratado como arquivo na migração de dados (U6), não como migrador ativo no destino.

## 5. Versões de dependências de origem observadas

`crawlee 3.18.1`, `playwright 1.63.0`, `cheerio ^1.2.0`, `csv-stringify ^6.8.3`, `postgres 3.4.9`, `zod 4.6.5` — conferem com os pins do plano §U2.1/U4.1. Não trazidas: NestJS 12, Express 5, AdminJS 7, Drizzle 0.45, Nodemailer, React 18 (orçamento §4.2 do plano).

## 6. Pendências humanas (não acessadas por agente)

- Banco hospedado de origem: tamanhos reais, contagem de linhas das dez tabelas, maior lote CSV/base64 — leitura humana/autorizada (plano U0.2).
- Destino hospedado: capacidade do plano Free (`farol-dev`, sa-east-1) frente a HTML bruto + base64 — gate D3, decisão humana.
