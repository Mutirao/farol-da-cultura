# Farol da Cultura — ontologia e fluxo institucional

**Decisões aprovadas:** 2026-11-17, pelo usuário em sessão. **Escopo:** linguagem do domínio e direção do produto; não é evidência de implementação.

Referências: [ADR-0009](adr/0009-ecossistema-institucional.md) e [plano unificado vigente](PLANO-UNIFICADO-2026-11-16.md).

## 1. Propósito e fronteira institucional

Mapas Culturais é a referência institucional das informações culturais. O aplicativo Farol e seu ecossistema apoiam a alimentação, a consulta e a circulação dessas informações. Supabase pode armazenar a operação e a projeção de leitura da agenda; não é um catálogo institucional concorrente.

Um registro coletado só pode aparecer na agenda pública após confirmação na API da instância de Mapas Culturais. Coleta, normalização, aprovação, geração de CSV ou tentativa de envio não satisfazem essa condição. Registros em preparação ficam restritos à operação.

A confirmação precisa corresponder ao registro institucional e aos dados que serão exibidos. Encontrar um título parecido ou um ID de outra base não confirma incorporação. Uma edição local ainda não incorporada também não pode substituir silenciosamente os campos institucionais da agenda.

“Institucional” indica a procedência do registro no Mapas. Não significa que o evento é realizado por órgão público, recebeu chancela oficial ou teve toda a informação verificada por um agente público.

## 2. Vocabulário comum

| Termo                        | Definição e orientação de uso                                                                                                                                | Distinto de                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Instância de Mapas Culturais | Ambiente ou subsite conectado ao ecossistema Mapas. Usar “instância” para ambos e registrar separadamente se compartilham base.                              | Projeto Supabase, cidade, base compartilhada.                                           |
| Base compartilhada           | Identidade da base institucional na qual os IDs dos registros têm significado. A relação entre instâncias e base exige evidência técnica.                    | URL, identidade visual ou marca de um subsite.                                          |
| Fonte de dados               | Origem consultada: plataforma, site, perfil de rede social ou instância. Identificar o recorte efetivamente consultado.                                      | Conector ou destino de envio.                                                           |
| Conector                     | Implementação que acessa uma fonte por API ou raspagem e extrai os registros.                                                                                | Fonte, execução agendada ou autorização de publicação.                                  |
| Scraper                      | Conector que extrai informações de páginas. Pode atender múltiplos recortes e cidades se o contrato da fonte permitir.                                       | Todo conector: leitura de API também é coleta, mas não precisa ser chamada de raspagem. |
| Registro coletado            | Informação extraída, acompanhada da identificação original e da evidência necessária. Pode estar inválida ou incompleta.                                     | Registro aprovado ou incorporado.                                                       |
| Registro normalizado         | Informação representada no modelo interno, com tipos e regras comuns, preservando os dados originais necessários.                                            | Informação aprovada ou institucionalmente incorporada.                                  |
| Evento                       | A atividade cultural descrita, independente de suas datas de realização.                                                                                     | Ocorrência, anúncio ou execução de coleta.                                              |
| Ocorrência                   | Realização de um evento em determinada data/horário, com espaço associado quando identificado.                                                               | Evento inteiro ou regra de recorrência ainda não expandida.                             |
| Espaço cultural              | Entidade que representa o local, quando identificado. Um texto de endereço ou nome extraído é evidência para vínculo, não uma identidade comprovada.         | Cidade, coordenada ou local provisório de um anúncio.                                   |
| Categoria                    | Vocabulário usado para classificar eventos, com mapeamento explícito quando as instâncias usam taxonomias diferentes.                                        | Classificação etária ou categoria inferida sem evidência.                               |
| Cidade / município           | Recorte territorial do evento, ocorrência, espaço ou operação, conforme o dado disponível. Manter identidade territorial estável além do rótulo de exibição. | Instância, base ou fonte.                                                               |
| Curadoria                    | Revisão do registro, das evidências e dos vínculos; decide sua elegibilidade para envio.                                                                     | Incorporação no Mapas ou publicação na agenda.                                          |
| Preparação de envio          | Formação de um lote/artefato ou requisição para uma instância de destino.                                                                                    | Entrada efetiva dos dados na instância.                                                 |
| Incorporação na instância    | Entrada dos dados no Mapas, comprovada pela leitura do registro correspondente na API da instância.                                                          | CSV gerado, upload tentado ou retorno de envio isolado.                                 |
| Sincronização da agenda      | Leitura da API institucional, validação e atualização da projeção de leitura do Farol.                                                                       | Scraping externo ou incorporação no Mapas.                                              |
| Agenda pública do Farol      | Projeção de registros institucionais confirmados, sujeita às regras de visibilidade do Farol.                                                                | Área de coleta e curadoria ou segunda base institucional.                               |
| Exibição no aplicativo       | Apresentação da agenda em Android, iOS e web, inclusive tela inicial, busca, filtros e detalhes.                                                             | Publicação institucional ou persistência dos dados.                                     |

O núcleo comum aprovado é evento, ocorrência e espaço cultural. Agentes culturais, projetos, oportunidades e outras entidades do Mapas não foram incluídos automaticamente nesta revisão; precisam de requisitos e contratos próprios.

## 3. Instâncias, bases e cidades

O produto deve atender múltiplos scrapers, múltiplas instâncias conectadas e múltiplas cidades, com painel separado do aplicativo público Android/iOS/web.

- Uma instância pode atender várias cidades; uma cidade pode ser atendida por várias instâncias e fontes.
- Instâncias podem compartilhar base sem deixar de ser chamadas de instâncias. Isso não significa que todo ID e todo endpoint tenham o mesmo contrato: a equivalência precisa ser verificada por tipo de entidade.
- Uma fonte pode alimentar mais de uma instância de destino. O encaminhamento deve ser explícito, sem escolher o destino apenas por proximidade, nome de cidade ou host parecido.
- URL, abrangência territorial, fuso, taxonomias, permissões, capacidades de API e limites são aspectos distintos da configuração de uma integração.
- Ausência de localização não equivale a coordenada `0,0`; município desconhecido não vira Fortaleza; horário sem fuso não recebe `America/Fortaleza` por conveniência.
- O Ceará e o Sympla/Fortaleza são pilotos existentes ou planejados, não limites do produto. Uma nova combinação permanece desativada até ter contrato, permissão e testes próprios.

O exemplo Funarte / mapa federal do MinC motivou essa distinção. A relação concreta entre suas bases, IDs, APIs e recortes ainda precisa de verificação; esta documentação não a declara comprovada nem habilita uma conexão.

## 4. Identidade e proveniência

Preservar e vincular quatro referências, sem tratá-las como um único ID:

1. Fonte original e identificador externo, incluindo URL de evidência quando apropriado.
2. Instância consultada ou de destino e identificador atribuído no Mapas.
3. Base institucional compartilhada e tipo de entidade ao qual o ID pertence.
4. Identificador interno do Farol e histórico dos vínculos entre as referências.

A identidade institucional é compreendida no contexto de **base + tipo de entidade + ID**. IDs iguais em bases distintas não provam identidade; eventos e espaços com o mesmo número também não. Instâncias da mesma base podem exibir um mesmo registro sem criar novas identidades institucionais. Isso não autoriza juntar registros distintos de bases diferentes.

Um anúncio e um registro institucional podem ter IDs diferentes. O vínculo precisa de evidência; similaridade de título, horário ou local pode produzir candidato para revisão, não fusão automática. Encaminhar o mesmo anúncio a outra instância exige rastrear o resultado daquele destino separadamente.

No código atual, `eventos`/`espacos` usam `fonte` + `id_externo`, e favoritos usam `fonte:id_externo`. Na coleta legada, `events` usa `source_id` + `external_id`. O vocabulário novo não altera essas chaves automaticamente: a evolução será aditiva, com migração de vínculos e compatibilidade dos favoritos demonstradas antes do corte. Preservar IDs, relacionamentos, sequences e bytes das exportações históricas.

## 5. Etapas e evidências do fluxo

```text
Fontes externas: redes sociais, plataformas, sites
    → coleta
    → normalização
    → curadoria
    → preparação de envio
    → incorporação na instância de Mapas Culturais
    → sincronização da agenda pela API da instância
    → exibição no aplicativo Android / iOS / web

Registros já existentes nas instâncias de Mapas Culturais
    → sincronização da agenda pela API da instância
    → exibição no aplicativo Android / iOS / web
```

| Etapa                     | Saída ou evidência exigida                                                                                     | O que não comprova                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Coleta                    | Registro e identificação da fonte, execução, cobertura e falhas conhecidas.                                    | Validade, aprovação ou cancelamento por ausência em uma listagem parcial. |
| Normalização              | Evento, ocorrências e espaço quando disponível; dados inválidos/incompletos identificados sem inventar campos. | Aprovação editorial.                                                      |
| Curadoria                 | Decisão auditável, versão revisada e vínculos aceitos ou pendentes.                                            | Envio ou incorporação.                                                    |
| Preparação de envio       | Destino explícito, versão e lote/artefato identificável; CSV histórico imutável.                               | Importação bem-sucedida no Mapas.                                         |
| Incorporação na instância | Correspondência de identidade e conteúdo confirmada na API, com destino e instante da verificação.             | Elegibilidade de uma edição local posterior ainda não incorporada.        |
| Sincronização da agenda   | Dados institucionais validados, cobertura da consulta e projeção atualizada sem expor preparação.              | Completude de outra cidade, janela, base ou instância.                    |
| Exibição no aplicativo    | Agenda pública consistente nas plataformas, procedência e links institucionais quando disponíveis.             | Publicação em lojas ou paridade de plataformas já verificada.             |

Essas etapas não exigem um serviço por etapa nem um estado único que substitua todos os ciclos existentes. Curadoria, matching de espaço, preparação/exportação, confirmação institucional e visibilidade da agenda permanecem distintos. Recoleta não apaga decisões nem comprova que a alteração foi incorporada.

“Publicar” deve indicar o destino: **incorporar na instância** ou **disponibilizar na agenda do Farol**. “Importar” e “carregar” também devem indicar origem/destino. Para a operação `Mapas → Farol`, preferir **sincronizar a agenda**. Para `fonte externa → modelo interno`, preferir **coletar e normalizar**.

A aprovação da arquitetura não escolhe automaticamente escrita via API. CSV e importação assistida podem ser o primeiro caminho, desde que preservem a comprovação posterior pela API. Automação de escrita exige capacidade documentada, permissão e autorização próprias.

## 6. Sincronização e cobertura

A consulta deve declarar instância, base, recorte territorial, janela, paginação e completude. Reconciliar ausência só é permitido dentro do recorte cuja cobertura integral foi demonstrada. Não apagar ocorrências de outra cidade/base porque um lote parcial não as contém.

O algoritmo atual de snapshot está autorizado somente para `mapa-cultural-ce`. Não ampliar o guard nem reutilizá-lo para Sympla ou outra instância sem revisar contrato e testes. Uma execução falha, incompleta, vazia de forma suspeita ou com erro de parser não comprova cancelamento ou retirada institucional.

O prazo de revalidação e a política para indisponibilidade, ocultação ou remoção na API ainda exigem decisão técnica/operacional. Devem distinguir falha de consulta de retirada comprovada; a implementação não pode resolver isso apagando tudo ou exibindo indefinidamente dados revogados sem regra explícita.

## 7. Plataformas e operação

- **Aplicativo público:** Android, iOS e web no escopo. A direção continua Expo, Expo Router e camada universal do Expo, com adaptações comprovadas por plataforma. Não presumir que NativeTabs, arquivos locais, mapas, compartilhamento e permissões funcionam no navegador sem verificação. A versão web é hospedada no mesmo modelo do painel, em artefato e domínio próprios.
- **Painel:** aplicação administrativa separada, React-admin padrão + ra-supabase. Opera fontes, scrapers, instâncias, bases, cidades, curadoria, preparação, confirmação e saúde das sincronizações; não publica registros externos diretamente na agenda.
- **Workers:** múltiplos conectores e scrapers com limites e agendamento por configuração. Isolar Chromium do importador leve e dos bundles de app/painel; múltiplos scrapers não exigem microserviços ou um framework por fonte.
- **Segurança:** dados de preparação, evidências restritas e credenciais não ficam públicos. RLS e grants explícitos, papéis de servidor nos workers e autorização de operador no backend; nunca credencial privilegiada no aplicativo ou no painel.

Para distinguir as capacidades verificadas dos objetivos de produto, consulte o [estado por frente](../README.md#estado-por-frente).
