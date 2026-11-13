import { getLocales } from "expo-localization";
import i18next from "i18next";

export const resources = {
  "pt-BR": {
    translation: {
      tabs: {
        agenda: "Agenda",
        mapa: "Mapa",
        favoritos: "Favoritos",
        conta: "Conta",
      },
      agenda: {
        titulo: "Agenda cultural",
        subtitulo: "Descubra o que acontece no Ceará",
        busca: "Buscar evento, espaço ou cidade",
        filtros: "Filtrar programação",
        limpar: "Limpar filtros",
        verResultados: "Ver resultados",
        periodo: "Período",
        proximos: "Próximos eventos",
        hoje: "Hoje",
        amanha: "Amanhã",
        semana: "Próximos 7 dias",
        mes: "Próximos 30 dias",
        categoria: "Linguagem cultural",
        todasCategorias: "Todas as linguagens",
        ingresso: "Ingresso",
        todosIngressos: "Gratuitos e pagos",
        gratuito: "Gratuito",
        pago: "Pago",
        municipio: "Município",
        todosMunicipios: "Todos os municípios",
        acessibilidade: "Acessibilidade do espaço",
        todaAcessibilidade: "Todos os recursos",
        resultados: "{{count}} eventos encontrados",
        carregando: "Carregando programação…",
        atualizar: "Atualizar programação",
        erro: "Não foi possível carregar a programação. Verifique a conexão e tente novamente.",
        semConfiguracao:
          "A conexão com a agenda ainda não está configurada neste app.",
        vazio:
          "Nenhum evento com esses filtros. Tente outro período ou limpe os filtros.",
        abrir: "Ver detalhes de {{nome}}",
        dados: "Programação: Mapa Cultural do Ceará",
      },
      detalhe: {
        titulo: "Evento",
        espacoTitulo: "Espaço cultural",
        programacao: "Datas e locais",
        descricao: "Sobre o evento",
        semDescricao: "A organização não informou uma descrição.",
        semEspaco: "Local não informado",
        semEndereco: "Endereço não informado",
        semPreco: "Consulte o valor com a organização",
        semClassificacao: "Classificação etária não informada",
        classificacao: "Classificação: {{valor}}",
        fim: "Até {{data}}",
        favoritar: "Salvar nos favoritos",
        desfavoritar: "Remover dos favoritos",
        compartilhar: "Compartilhar evento",
        fonte: "Ver na fonte original",
        abrirEspaco: "Conhecer {{nome}}",
        naoEncontrado:
          "Este evento não está mais disponível na programação carregada.",
        semDatas: "Sem novas datas na programação atual.",
        voltar: "Voltar à agenda",
        mapa: "Abrir localização no mapa",
        semCoordenadas:
          "A organização não informou a localização deste espaço.",
        semRecursos: "Recursos de acessibilidade não informados",
        falhaLink: "Não foi possível abrir o link. Tente novamente.",
      },
      favoritos: {
        titulo: "Seus favoritos",
        subtitulo: "Salvos somente neste aparelho",
        vazio: "Salve um evento na agenda para encontrá-lo aqui.",
        semProximos:
          "Seus eventos salvos não têm novas datas na programação atual.",
        erroLeitura:
          "Não foi possível ler os favoritos. O arquivo foi preservado para não perder seus dados.",
        erroEscrita:
          "Não foi possível salvar. Seus favoritos anteriores foram mantidos; tente novamente.",
        indisponiveis:
          "{{count}} favoritos não estão mais na programação atual. Eles continuam salvos.",
      },
      mapa: {
        titulo: "Espaços e eventos",
        aviso:
          "Nesta versão, o mapa abre no aplicativo de mapas do aparelho. O mapa dentro do Farol ainda depende da configuração do Google Maps.",
        vazio: "Nenhum espaço com localização na programação atual.",
        programacao: "{{count}} eventos neste espaço",
      },
      // Rótulo visível e, em "...Acao", o que o leitor de tela anuncia.
      conta: {
        secao: "Informações",
        termos: "Termos de Uso",
        termosAcao: "Abrir os Termos de Uso no navegador",
        privacidade: "Política de Privacidade",
        privacidadeAcao: "Abrir a Política de Privacidade no navegador",
        sobre: "Sobre o app",
        sobreAcao: "Abrir a tela Sobre o app",
      },
      sobre: {
        titulo: "Sobre o app",
        nome: "Farol da Cultura",
        versao: "Versão {{versao}}",
        descricao:
          "O Farol da Cultura reúne a agenda de eventos culturais do Ceará.",
        fonte:
          "A programação vem do Mapa Cultural do Ceará, da Secretaria da Cultura do Estado.",
        licenca: "É software livre, sob a licença AGPL-3.0.",
      },
    },
  },
} as const;

const i18n = i18next.createInstance();
// F0: só pt-BR. Outros idiomas do aparelho usam o mesmo fallback.
i18n.init({
  resources,
  lng: getLocales()[0]?.languageTag ?? "pt-BR",
  supportedLngs: ["pt-BR"],
  fallbackLng: "pt-BR",
  initAsync: false,
  interpolation: { escapeValue: false },
});
type Textos = (typeof resources)["pt-BR"]["translation"];
// Todas as chaves "grupo.texto" que existem em resources.
type Chave = {
  [Grupo in keyof Textos]: `${Grupo}.${keyof Textos[Grupo] & string}`;
}[keyof Textos];

export const t = (key: Chave, valores?: Record<string, string | number>) =>
  i18n.t(key, { ...valores });
export default i18n;
