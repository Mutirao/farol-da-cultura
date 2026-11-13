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

export const t = (key: Chave, valores?: Record<string, string>) =>
  i18n.t(key, { ...valores });
export default i18n;
