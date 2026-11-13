# Demonstração do app mobile no Android — 13/11/2026

**Status:** versão de desenvolvimento funcionando no Moto G35 5G, não publicada.
Não é paridade completa com o app antigo nem aprovação das tarefas/portões restantes.

## O que esta entrega acrescenta

- Agenda lida da API REST do Supabase, com validação de resposta, paginação, prazo de espera,
  erro recuperável e atualização ao puxar a lista.
- Busca por evento, descrição, espaço ou município, sem exigir caixa ou acentos.
- Filtros de período, linguagem, ingresso, município e acessibilidade do espaço.
  Os filtros combinam atributos da mesma ocorrência, não de datas diferentes do evento.
- Detalhes de evento com imagem, classificação, descrição, datas, preços e locais;
  detalhes de espaço com endereço, recursos de acessibilidade e programação.
- Favoritos sem conta, guardados no arquivo privado do app. Identidade pela fonte + id externo,
  independente do id do banco. Gravação temporária antes de substituir o arquivo anterior;
  leitura inválida não apaga os dados.
- Compartilhamento e links para a fonte original; locais abertos no aplicativo de mapas.
- Integração da aba Conta e tela Sobre, implementadas anteriormente na M6.

Só a URL e a chave publishable entram no cliente. A demonstração usa o Supabase **local**,
com 176 eventos reais e 251 datas importados do Mapa Cultural do Ceará; nenhum deploy remoto.
Amostras fictícias foram retiradas apenas deste banco local, não do seed versionado.

## Verificações observadas no aparelho

Variante `development`, pacote `br.com.farol.cultura.dev`, versão 0.1.0. O app de produção
instalado não foi substituído nem teve dados alterados.

| Verificação       | Resultado                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Agenda e detalhes | Cartões reais, imagens e detalhes renderizados; XML com rótulos acessíveis                            |
| Período Hoje      | 9 eventos                                                                                             |
| Hoje + Gratuito   | 8 eventos                                                                                             |
| Busca inexistente | Vazio com orientação para limpar filtros                                                              |
| Limpar filtros    | Restaura 176 eventos                                                                                  |
| Favoritos         | Dois eventos continuaram salvos depois de encerrar e reabrir o processo                               |
| Conta → Sobre     | Rótulos dos três controles; nome, versão, fonte e licença na tela Sobre                               |
| Fonte 2.0         | Agenda inspecionada visualmente após reiniciar o app; títulos quebram em linhas, sem corte horizontal |

Fonte e configuração de manter tela acesa foram restauradas aos valores originais depois do teste.
O `adb` original não enumerava o Motorola; outro servidor na porta 5038 resolveu sem mudar o telefone.
Os redirecionamentos de Metro/API precisam ser refeitos após reconectar o USB.

Evidências: [agenda](../evidencias/app-mobile/agenda.png),
[hoje + gratuitos](../evidencias/app-mobile/hoje-gratuitos.png),
[fonte 2.0](../evidencias/app-mobile/agenda-fonte-2.png).

## Problemas encontrados durante a demonstração

- Títulos longos ultrapassavam a largura da ponte de reciclagem: os cartões passaram a receber
  largura explícita, descontando os insets. A fonte ampliada foi conferida depois da correção.
- Um `Host` dentro da janela nativa de `Sheet` derrubou o dev build ao tocar nos seletores,
  com `RootViewUtil.getRootView`. Os filtros passaram a ser expansíveis na própria tela.
  A seleção de período/ingresso funcionou depois da mudança; a biblioteca nativa não foi modificada.
- A busca não deve ecoar cada tecla de volta ao estado nativo: a sincronização agora só ocorre
  para mudanças externas. O teste final recebeu `zzzinexistente` inteiro e retornou zero eventos.
- Reconectar o USB remove os redirecionamentos: sem eles, o app mostrou o erro de conexão;
  refazê-los restaurou a leitura. O modo dev também apresentou um erro transitório do Metro
  durante edições ao vivo; foi necessário reiniciar o cliente. Não é evidência de estabilidade de release.

## Testes automatizados

- `pnpm turbo run typecheck test`: 9 tarefas; app 35 testes, coleta 30, tokens 122, ui-native 7.
- `pnpm supabase test db`: 67 testes pgTAP.
- `pnpm biome ci .`: passa; restam avisos de asserções não nulas, sem erros.
- Export Android/iOS: registrado na verificação final do commit; não equivale a build nativo iOS.

## O que continua pendente

- Mapa **embutido**, localização atual e ordenação por distância: faltam configuração/chave e validação.
  A aba atual oferece espaços e abre o Maps externo; não equivale ao mapa do app antigo.
- Login, migração de contas/favoritos antigos, notificações, avaliações, banners e grupos de programação.
- TalkBack/VoiceOver humanos, modo escuro e inspeção de fonte máxima em todas as telas.
  Rótulos no XML e uma captura de fonte 2.0 não certificam acessibilidade.
- Medição de lista F0-10/ADR-0002 e de mapa F0-11/ADR-0003: seguem abertas.
  A lista universal é provisória, não uma escolha aprovada por benchmark.
- Ativação da importação agendada, permissão de uso dos dados, Supabase de produção e publicação nas lojas.
- O `expo install --check` já reclamava dos patches novos de Expo/dev-client antes desta entrega.
  Não foram alteradas versões do SDK nem suas exceções de instalação aqui.

O Metro e a API local precisam permanecer ativos para esta demonstração pelo USB.
Não há suporte offline completo: os favoritos persistem, mas a programação é carregada da API.
