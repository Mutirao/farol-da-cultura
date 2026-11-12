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
export const t = (
  key: `tabs.${keyof (typeof resources)["pt-BR"]["translation"]["tabs"]}`,
) => i18n.t(key);
export default i18n;
