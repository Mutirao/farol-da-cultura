import { Text } from "react-native";

const t = (k: string) => k;

export const Fixo = () => <Text>Agenda cultural</Text>;
export const Traduzido = () => <Text>{t("abas.agenda")}</Text>;
export const SoEspaco = () => (
  <Text>
    {t("abas.mapa")} {t("abas.favoritos")}
  </Text>
);
