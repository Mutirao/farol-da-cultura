import { t } from "@farol/i18n";
import { radius, spacing } from "@farol/tokens/native";
import { Link, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAgenda } from "../agenda/AgendaProvider";
import {
  datasFiltradas,
  filtrosIniciais,
  formatarData,
  proximosFavoritos,
} from "../agenda/dados";
import { pedirLocalizacao } from "../agenda/localizacao";
import { Acao, Paragrafo, Tela, useCores } from "../agenda/ui";

export default function Home() {
  const { eventos, favoritos, favoritosProntos } = useAgenda();
  const cores = useCores();
  const router = useRouter();
  const naAgenda = useMemo(
    () => proximosFavoritos(eventos, favoritos, 3),
    [eventos, favoritos],
  );
  const chips = [
    { label: t("home.hoje"), href: "/agenda?periodo=hoje" },
    { label: t("home.fimDeSemana"), href: "/agenda?periodo=fimdesemana" },
    { label: t("home.gratis"), href: "/agenda?ingresso=gratuito" },
  ] as const;
  async function irPerto() {
    // O toque no chip é o gesto: a permissão só é pedida aqui.
    const coordenada = await pedirLocalizacao();
    router.push(coordenada ? "/agenda?ordem=perto" : "/agenda");
  }
  return (
    <Tela titulo={t("home.titulo")} descricao={t("home.subtitulo")}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: spacing["4"],
          paddingBottom: spacing["10"],
          gap: spacing["4"],
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontSize: 20, color: cores.foreground, fontWeight: "600" }}
        >
          {t("home.chipsTitulo")}
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: spacing["2"],
          }}
        >
          {chips.map((chip) => (
            <Link key={chip.href} href={chip.href} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={chip.label}
                style={{
                  backgroundColor: cores.muted,
                  borderRadius: radius["4xl"],
                  paddingHorizontal: spacing["4"],
                  paddingVertical: spacing["2"],
                }}
              >
                <Text style={{ color: cores.foreground, fontSize: 16 }}>
                  {chip.label}
                </Text>
              </Pressable>
            </Link>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("home.perto")}
            onPress={() => void irPerto()}
            style={{
              backgroundColor: cores.muted,
              borderRadius: radius["4xl"],
              paddingHorizontal: spacing["4"],
              paddingVertical: spacing["2"],
            }}
          >
            <Text style={{ color: cores.foreground, fontSize: 16 }}>
              {t("home.perto")}
            </Text>
          </Pressable>
        </View>
        <Text
          accessibilityRole="header"
          style={{ fontSize: 20, color: cores.foreground, fontWeight: "600" }}
        >
          {t("home.naSuaAgenda")}
        </Text>
        {favoritosProntos && !naAgenda.length ? (
          <Paragrafo>{t("home.semFavoritos")}</Paragrafo>
        ) : null}
        {naAgenda.map((evento) => {
          const data = datasFiltradas(evento, filtrosIniciais, new Date())[0];
          return (
            <Link
              key={evento.id}
              href={{ pathname: "/evento/[id]", params: { id: evento.id } }}
              asChild
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t("agenda.abrir", { nome: evento.nome })}. ${data ? formatarData(data.inicio) : ""}`}
                style={{
                  backgroundColor: cores.card,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: cores.border,
                  padding: spacing["3"],
                  gap: spacing["1"],
                }}
              >
                <Text
                  style={{
                    color: cores.highlight,
                    fontWeight: "700",
                    fontSize: 14,
                  }}
                >
                  {data ? formatarData(data.inicio) : t("detalhe.semDatas")}
                </Text>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "600",
                    color: cores.cardForeground,
                  }}
                >
                  {evento.nome}
                </Text>
                <Text style={{ fontSize: 14, color: cores.mutedForeground }}>
                  {data?.espaco?.nome ?? t("detalhe.semEspaco")}
                </Text>
              </Pressable>
            </Link>
          );
        })}
        <Acao
          label={t("home.verAgenda")}
          onPress={() => router.push("/agenda")}
        />
      </ScrollView>
    </Tela>
  );
}
