---

name: farol-performance
description: Use when measuring cultural lists or map performance.
---

# Performance de lista e mapa

## Fontes e pré-requisitos

Fonte: `docs/PLANO-FASE-0-REVISADO.md`, V12/V13, §5 O11, F0-10/F0-11 e §11.
Leia ADR-0002/0003 quando existirem; não invente resultado nem escolha antecipadamente a biblioteca.
Medição exige Android intermediário físico, build `preview` (release), autorização de uso do aparelho e chave Maps restrita quando aplicável.

## Procedimento

1. Registre modelo, Android, id do build, variante, dataset/seed e versão das bibliotecas. Escreva regra de decisão antes de medir; não compare dev build com release.
2. Lista: use 500 cartões com semente fixa, `expo-image` com `recyclingKey` e cerca de 20 miniaturas locais de até 480 px. Compare `@expo/ui` `List.ForEach` + `RNHostView` com FlashList compatível com Expo (`npx expo install`, referência 2.3.2 no plano).
3. Fixe 60 Hz, faça `gfxinfo reset`, 30 swipes e capture `dumpsys gfxinfo`/`framestats` em três rodadas por variante. Use `scripts/perf/measure-scroll.sh` quando existir; não afirme que o script já foi entregue.
4. Regra da lista: escolha A apenas se p95 ≤ 16 ms, janky ≤ 5% e no máximo 1 ponto percentual pior que B; senão B. Registre a incerteza quando a diferença ficar na margem de 1 ponto.
5. Mapa: use 300 pinos com semente fixa em Fortaleza; compare `expo-maps` e `react-native-maps`, cada um com/sem `supercluster`. Faça pan e zoom reproduzíveis; meça também tempo até os 300 marcadores. Defina os limiares do mapa antes do teste (o plano não os fornece).
6. Salve saídas brutas e decisão no ADR correspondente, com comandos e critérios. Restaure taxa de atualização e demais ajustes do aparelho ao terminar, inclusive em falha.

## Armadilhas

- `List.ForEach` virtualiza/recicla no SDK 58; a alegação antiga da skill oficial não substitui medição dos cartões RN.
- `expo-maps` exige dev build/release, não Expo Go; nenhuma das duas bibliotecas oferece clustering nativo segundo V13.
- Ajustes de paginação, índices, imagens e rerenders devem resolver gargalo medido, com antes/depois sob a mesma carga; não substitua lista/mapa por preferência pessoal.

## Verificação

Confirme três rodadas por variante, dataset fixo e evidência bruta legível. Sem aparelho/acesso, reporte bloqueio, não números simulados como desempenho real.
ADRs e aprovação humana continuam distintos de CI verde; use a infraestrutura existente apenas quando disponível.
