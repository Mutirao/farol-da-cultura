import { t } from "@farol/i18n";
import { spacing } from "@farol/tokens/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text } from "react-native";
import { useAgenda } from "../../agenda/AgendaProvider";
import { abrirMapa, urlMapa } from "../../agenda/links";
import { Acao, EstadoAgenda, Paragrafo, useCores } from "../../agenda/ui";

export default function DetalheEspaco() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { eventos, carregando } = useAgenda();
  const cores = useCores();
  const router = useRouter();
  const espaco = eventos
    .flatMap((e) => e.datas)
    .find((d) => d.espaco?.id === Number(id))?.espaco;
  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t("detalhe.espacoTitulo") }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: spacing["4"],
          gap: spacing["4"],
          paddingBottom: spacing["10"],
        }}
        testID="espaco-screen"
      >
        <EstadoAgenda />
        {espaco ? (
          <>
            <Text
              accessibilityRole="header"
              style={{
                color: cores.foreground,
                fontSize: 26,
                fontWeight: "700",
              }}
            >
              {espaco.nome}
            </Text>
            <Paragrafo>
              {espaco.endereco || espaco.municipio || t("detalhe.semEndereco")}
            </Paragrafo>
            {espaco.descricao ? (
              <Paragrafo>{espaco.descricao}</Paragrafo>
            ) : null}
            {urlMapa(espaco) ? (
              <Acao
                label={t("detalhe.mapa")}
                onPress={() => void abrirMapa(espaco)}
              />
            ) : (
              <Paragrafo>{t("detalhe.semCoordenadas")}</Paragrafo>
            )}
            <Text
              accessibilityRole="header"
              style={{
                color: cores.foreground,
                fontSize: 20,
                fontWeight: "600",
              }}
            >
              {t("agenda.acessibilidade")}
            </Text>
            <Paragrafo>
              {espaco.acessibilidade_fisica.join(" · ") ||
                t("detalhe.semRecursos")}
            </Paragrafo>
            <Text
              accessibilityRole="header"
              style={{
                color: cores.foreground,
                fontSize: 20,
                fontWeight: "600",
              }}
            >
              {t("agenda.proximos")}
            </Text>
            {eventos
              .filter((e) => e.datas.some((d) => d.espaco?.id === espaco.id))
              .map((e) => (
                <Acao
                  key={e.id}
                  label={e.nome}
                  onPress={() =>
                    router.push({
                      pathname: "/evento/[id]",
                      params: { id: e.id },
                    })
                  }
                />
              ))}
          </>
        ) : !carregando ? (
          <Paragrafo>{t("detalhe.semEspaco")}</Paragrafo>
        ) : null}
      </ScrollView>
    </>
  );
}
