---

name: farol-sync-rules
description: Use when changing cultural-data synchronization.
---

# Sincronização de dados culturais

## Fontes e limites

Base: `docs/PLANO-FASE-0-REVISADO.md`, F0-09a, V18/V19 e §12.
Os §§8–11 tratam de bootstrap, riscos e verificações, não definem o protocolo de sync.
As regras de reconciliação abaixo são orientações inferidas para Fases 1–4, sujeitas à revisão humana; não descrevem um serviço já implementado.

## Procedimento

1. Leia migrações, contrato do conector e ADRs existentes antes de escolher a chave de sincronização. Registre identidade da fonte + identificador externo estável; não use título ou URL mutável como identidade sem justificar.
2. Separe registro coletado, normalizado e publicado. Preserve proveniência e campos editoriais: uma coleta não deve sobrescrever curadoria silenciosamente. Defina a precedência por campo antes de programar o upsert.
3. Faça cada lote idempotente e transacional quando necessário. Confirme persistência antes de avançar cursor/checkpoint; repetições ou falhas no meio não podem duplicar eventos nem perder atualizações.
4. Defina como tratar datas, fuso, cancelamentos e exclusões. Ausência em uma coleta parcial ou falha de rede não autoriza apagar registros; exija evidência de remoção e estratégia explícita de recuperação.
5. Limite concorrência, registre contagens de recebidos/criados/alterados/rejeitados e aplique retry limitado com backoff para falhas transitórias. Erros permanentes vão para diagnóstico sanitizado, não para loop infinito.
6. Mantenha escrita privilegiada no servidor. Mudanças de schema/acesso exigem `farol-rls`; nenhum segredo ou `service_role` no cliente.

## Armadilhas

- Não presuma que converter sessão anônima mescla outro aparelho: V19 exige tratar a mesclagem explicitamente nas Fases 2/3.
- Não introduza fila, protocolo offline ou conflito last-write-wins como decisão aceita sem contrato/ADR.

## Verificação

Teste em fixtures: mesmo lote duas vezes, atualização da mesma identidade, colisão entre fontes, coleta parcial, cancelamento e retomada após falha antes/depois do checkpoint.
Comprove que curadoria é preservada e que contagens e estado final coincidem; reporte comandos e resultados reais no PR.
