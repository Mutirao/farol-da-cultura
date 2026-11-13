import { t } from "@farol/i18n";
import { spacing } from "@farol/tokens/native";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useAgenda } from "../../agenda/AgendaProvider";
import { type Espaco, filtrar, filtrosIniciais } from "../../agenda/dados";
import { abrirMapa, urlMapa } from "../../agenda/links";
import { Acao, EstadoAgenda, Paragrafo, Tela, useCores } from "../../agenda/ui";

export default function Mapa() {
  const { eventos, carregando } = useAgenda();
  const router = useRouter();
  const cores = useCores();
  const proximos = filtrar(eventos, filtrosIniciais);
  const espacos = new Map<number, Espaco>();
  for (const evento of proximos)
    for (const data of evento.datas) {
      if (data.espaco && urlMapa(data.espaco))
        espacos.set(data.espaco.id, data.espaco);
    }
  return (
    <Tela titulo={t("mapa.titulo")}>
      <EstadoAgenda />
      <ScrollView
        contentContainerStyle={{
          padding: spacing["4"],
          gap: spacing["4"],
          paddingBottom: spacing["10"],
        }}
      >
        <Paragrafo>{t("mapa.aviso")}</Paragrafo>
        {!carregando && !espacos.size ? (
          <Paragrafo>{t("mapa.vazio")}</Paragrafo>
        ) : null}
        {[...espacos.values()]
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
          .map((espaco) => (
            <View
              key={espaco.id}
              style={{
                borderBottomWidth: 1,
                borderColor: cores.border,
                paddingBottom: spacing["4"],
                gap: spacing["2"],
              }}
            >
              <Text
                accessibilityRole="header"
                style={{
                  color: cores.foreground,
                  fontSize: 20,
                  fontWeight: "600",
                }}
              >
                {espaco.nome}
              </Text>
              <Paragrafo>
                {espaco.endereco ||
                  espaco.municipio ||
                  t("detalhe.semEndereco")}
              </Paragrafo>
              <Paragrafo>
                {t("mapa.programacao", {
                  count: proximos.filter((e) =>
                    e.datas.some((d) => d.espaco?.id === espaco.id),
                  ).length,
                })}
              </Paragrafo>
              <Acao
                label={t("detalhe.mapa")}
                onPress={() => void abrirMapa(espaco)}
              />
              <Acao
                label={t("detalhe.abrirEspaco", { nome: espaco.nome })}
                onPress={() =>
                  router.push({
                    pathname: "/espaco/[id]",
                    params: { id: espaco.id },
                  })
                }
              />
            </View>
          ))}
      </ScrollView>
    </Tela>
  );
}
