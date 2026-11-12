-- Fumaça F0-06: Postgres >= 17 e extensões exigidas disponíveis.
begin;
select plan(7);

select cmp_ok(
  current_setting('server_version_num')::int,
  '>=',
  170000,
  'Postgres >= 17'
);

select ok(
  exists (select 1 from pg_available_extensions where name = ext),
  format('extensão %s disponível', ext)
)
from unnest(array['postgis', 'pg_trgm', 'unaccent', 'pg_cron', 'pg_net', 'supabase_vault']) as ext;

select * from finish();
rollback;
