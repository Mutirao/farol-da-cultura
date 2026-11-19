-- S0.6: leitura do evento coletado pela confirmação da incorporação.
-- workers/coleta/src/confirmar.ts compara título e início do evento coletado com o
-- registro na API da instância. service_role não tinha SELECT em public.events
-- (a 0200 fechou os default privileges). Só as colunas que a conferência usa;
-- anon e authenticated não mudam.
grant select (id, title, starts_at) on public.events to service_role;
