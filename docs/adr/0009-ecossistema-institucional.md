# ADR-0009: Ecossistema Farol apoiado nas instâncias de Mapas Culturais

- **Status:** Aceito quanto à direção de produto e à terminologia; implementação, capacidade e operação sujeitas ao plano e aos gates.
- **Data:** 2026-11-17
- **Decisor:** usuário, em sessão: aprovou a síntese do alinhamento e autorizou aplicá-la à documentação e ao plano, incluindo Android, iOS, web, painel, múltiplos scrapers, instâncias e cidades.
- **Referências:** [ontologia e fluxo](../ONTOLOGIA-E-FLUXO.md), [plano unificado](../PLANO-UNIFICADO-2026-11-16.md), [ADR-0005](0005-app-web.md), [ADR-0007](0007-importacao-da-agenda.md), [ADR-0008](0008-plataforma-unificada.md).

## Contexto

O importador existente lê a API do Mapa Cultural do Ceará e grava uma projeção de agenda no Supabase. O plano unificado de 2026-11-16 também previa publicar registros curados do Sympla diretamente nessa agenda. Esse segundo caminho contornaria o papel institucional do Mapas definido pelo usuário.

O escopo anterior restringia o aplicativo a Android/iOS e usava Ceará e Sympla/Fortaleza como referência. A direção agora inclui web pública e múltiplas integrações e cidades. O painel continua separado do aplicativo público.

As decisões abaixo resultam de duas rodadas de alinhamento e da confirmação posterior da síntese. A aprovação é da direção e da linguagem; não constitui resultado de testes, implementação de integração, homologação institucional ou autorização de deploy.

## Decisão

1. **Autoridade institucional.** Mapas Culturais permanece como referência institucional das informações culturais. Todo o ecossistema Farol deve apoiar sua alimentação e circulação. Supabase serve à operação e à projeção de leitura; não mantém um catálogo público concorrente abastecido diretamente pela raspagem.
2. **Condição de entrada pública.** Um registro coletado só aparece na agenda após confirmação na API da instância. Preparação e curadoria ficam restritas à operação. Gerar CSV, aprovar ou tentar enviar não comprovam incorporação. Edições locais ainda não incorporadas não substituem silenciosamente os dados institucionais exibidos.
3. **Instância.** O termo abrange ambientes independentes e subsites. Bases compartilhadas são relações separadas e verificadas. Não inferir base independente ou compartilhada apenas pela URL. Funarte / mapa federal é um exemplo de necessidade de modelagem, não uma integração já comprovada.
4. **Ontologia.** Evento, ocorrência e espaço cultural são o núcleo comum, preservando dados originais. Identidades da fonte original, da instância, da base e do registro interno são vinculadas sem serem confundidas. Não fundir por título/local nem renomear ou reatribuir IDs preservados como consequência automática desta decisão.
5. **Fluxo.** Coleta → normalização → curadoria → preparação de envio → incorporação na instância → sincronização da agenda → exibição no aplicativo. Registros já existentes no Mapas entram pela sincronização. Cada etapa tem evidência própria; não há serviço obrigatório por etapa.
6. **Produto público multiplataforma.** Android, iOS e web fazem parte do escopo. Preservar a direção Expo e a camada universal do Expo; verificar navegação, armazenamento, mapas, compartilhamento, localização e acessibilidade por plataforma antes de declarar suporte. O painel administrativo web não satisfaz o requisito de aplicativo público web.
7. **Múltiplas integrações e territórios.** Planejar múltiplos scrapers, instâncias e cidades desde os contratos de identidade, cobertura e configuração. Ceará e Sympla/Fortaleza podem ser pilotos; não são restrições estruturais do produto. Novas combinações precisam de permissões, fixtures, testes de isolamento e ativação explícita.
8. **Arquitetura preservada.** Painel React-admin padrão + ra-supabase, importadores leves separados dos scrapers Chromium, Supabase/PostgREST/RPC, segurança e preservação de dados continuam válidos. Não adicionar API Node própria, ORM, fila ou microserviços por consequência da expansão de escopo.

## Relação com decisões anteriores

- **ADR-0005:** a exclusão do alvo web público é superada para o planejamento futuro. O princípio de máximo nativo no Expo permanece. O registro da Fase 0 não é reescrito como se web já tivesse sido implementada.
- **ADR-0006 / ADR-0008:** a revisão D6 por React-admin permanece. A publicação direta Sympla → agenda proposta no item 4 do ADR-0008 é superada; o destino institucional deve anteceder a sincronização pública.
- **ADR-0007:** o importador Ceará continua sendo o contrato implementado, com snapshot restrito a `mapa-cultural-ce`. Não autoriza novas instâncias nem uso desse algoritmo para scraping parcial. A hipótese histórica de alimentar a mesma RPC diretamente com raspagem não deve ser implementada.
- **Plano mobile de 2026-11-12:** permanece como histórico e roteiro das entregas M, não como exclusão atual de web, painel ou raspagem. O plano unificado revisado é a referência da evolução integrada.

## Consequências

- A integração pode demorar mais para disponibilizar um evento coletado, pois depende de sua incorporação na instituição. Esse é um custo explícito da autoridade institucional escolhida.
- Confirmação institucional precisa de vínculo verificável entre registro e destino, não de título semelhante ou de marcação manual sem conferência. Escopos de instância/cidade e fuso não podem herdar Fortaleza silenciosamente.
- O contrato atual de favoritos por `fonte:id_externo` deve continuar compatível durante a evolução. IDs internos, dados históricos, sequences e CSVs não podem ser perdidos para simplificar o modelo.
- Não deduplicar automaticamente entre bases independentes. Dentro de uma base comprovadamente compartilhada, reconhecer o mesmo registro sem duplicar sua identidade por instância de exibição.
- Múltiplos recortes exigem cobertura e limites explícitos antes de reconciliar ausência. Consulta incompleta de uma cidade não pode remover ocorrências de outra.
- A confirmação inicial pela API não define, sozinha, política de revalidação, indisponibilidade ou remoção. Essa política e os contratos de cada instância são pendências de implementação.
- Android, iOS e web exigem provas próprias de comportamento e acessibilidade; build Android e composição do painel não comprovam suporte web público ou iOS em aparelho.

## Alternativas consideradas

- **Publicar coleta curada diretamente no Farol:** não escolhida; contorna a referência institucional, mesmo com revisão editorial local.
- **Mostrar registros provisórios no aplicativo:** não escolhida pelo usuário; permanecem restritos à operação até confirmação na API.
- **Reservar “instância” só para ambiente independente:** não escolhida; a pessoa adotou o termo também para subsites, separando o compartilhamento de base.
- **Um modelo distinto por fonte:** não escolhido como linguagem central; normalização usa entidades comuns sem apagar a evidência ou os campos originais.
- **Produto limitado ao mobile e a uma cidade/fonte:** superado pelo escopo explícito Android/iOS/web, painel e múltiplas integrações e cidades.

## Limites de autorização e aceite

Esta revisão autoriza documentação e atualização do plano. Não autoriza alteração de schema ou código, migração hospedada, credenciais, agendamento, escrita nas instâncias, deploy, publicação em lojas, contratação ou arquivamento de sistemas. Tampouco ativa perfis de terminologia de agentes.

O plano deve prever testes negativos para registros apenas coletados/aprovados, positivos após confirmação institucional e isolamento entre instâncias/bases/cidades. Datas, homologações, responsáveis humanos e assinaturas ainda não obtidos permanecem pendentes, nunca preenchidos como se esta decisão os substituísse.
