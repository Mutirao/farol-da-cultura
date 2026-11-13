import { t } from "@farol/i18n";
import { colors, radius, spacing } from "@farol/tokens/native";
import { Button, Collection, NativeUIProvider } from "@farol/ui-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { type ReactNode, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAgenda } from "./AgendaProvider";
import {
  datasFiltradas,
  type Evento,
  type Filtros,
  formatarData,
} from "./dados";

export function useCores() {
  return colors[useColorScheme() === "dark" ? "dark" : "light"];
}

export function Tela({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  const cores = useCores();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: cores.background }}
    >
      <View style={{ padding: spacing["4"], gap: spacing["2"] }}>
        <Text
          accessibilityRole="header"
          style={{ color: cores.foreground, fontSize: 28, fontWeight: "700" }}
        >
          {titulo}
        </Text>
        {descricao ? (
          <Text style={{ color: cores.mutedForeground, fontSize: 15 }}>
            {descricao}
          </Text>
        ) : null}
      </View>
      {children}
    </SafeAreaView>
  );
}

export function Paragrafo({ children }: { children: ReactNode }) {
  const cores = useCores();
  return (
    <Text style={{ color: cores.foreground, fontSize: 16, lineHeight: 25 }}>
      {children}
    </Text>
  );
}

export function Acao({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <NativeUIProvider matchContents={{ vertical: true }}>
      <Button
        accessibilityLabel={label}
        label={label}
        onPress={onPress}
        disabled={disabled}
      />
    </NativeUIProvider>
  );
}

export function EstadoAgenda() {
  const { carregando, erro, recarregar } = useAgenda();
  const cores = useCores();
  return (
    <View style={{ paddingHorizontal: spacing["4"], gap: spacing["2"] }}>
      {carregando ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing["2"],
          }}
        >
          <ActivityIndicator
            color={cores.primary}
            accessibilityLabel={t("agenda.carregando")}
          />
          <Paragrafo>{t("agenda.carregando")}</Paragrafo>
        </View>
      ) : null}
      {erro ? (
        <>
          <Text accessibilityRole="alert" style={{ color: cores.destructive }}>
            {erro}
          </Text>
          <Acao
            label={t("agenda.atualizar")}
            onPress={() => void recarregar()}
          />
        </>
      ) : null}
    </View>
  );
}

const chave = (evento: Evento) => String(evento.id);
export function ListaEventos({
  eventos,
  filtros,
  vazio,
}: {
  eventos: Evento[];
  filtros: Filtros;
  vazio: string;
}) {
  const { recarregar } = useAgenda();
  const cores = useCores();
  const renderItem = useCallback(
    (evento: Evento) => <CartaoEvento evento={evento} filtros={filtros} />,
    [filtros],
  );
  if (!eventos.length)
    return (
      <View style={{ padding: spacing["4"] }}>
        <Paragrafo>{vazio}</Paragrafo>
      </View>
    );
  return (
    <View style={{ flex: 1, backgroundColor: cores.background }}>
      <NativeUIProvider>
        <Collection
          data={eventos}
          keyExtractor={chave}
          renderItem={renderItem}
          onRefresh={recarregar}
          accessibilityLabel={t("tabs.agenda")}
        />
      </NativeUIProvider>
    </View>
  );
}

function CartaoEvento({
  evento,
  filtros,
}: {
  evento: Evento;
  filtros: Filtros;
}) {
  const cores = useCores();
  const data = datasFiltradas(evento, filtros, new Date())[0];
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <Link
      href={{ pathname: "/evento/[id]", params: { id: evento.id } }}
      asChild
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t("agenda.abrir", { nome: evento.nome })}. ${data ? formatarData(data.inicio) : ""}`}
        style={{
          // A ponte de reciclagem precisa da largura explícita para quebrar títulos longos.
          width: width - insets.left - insets.right,
          backgroundColor: cores.card,
          borderBottomWidth: 1,
          borderColor: cores.border,
          padding: spacing["4"],
          gap: spacing["2"],
        }}
      >
        <Text
          style={{ color: cores.highlight, fontWeight: "700", fontSize: 14 }}
        >
          {data ? formatarData(data.inicio) : t("detalhe.semDatas")}
        </Text>
        <View
          style={{
            flexDirection: "row",
            gap: spacing["3"],
            alignItems: "flex-start",
          }}
        >
          {evento.imagem_url ? (
            <Image
              source={{ uri: evento.imagem_url }}
              recyclingKey={String(evento.id)}
              contentFit="cover"
              transition={0}
              accessible={false}
              style={{
                width: 88,
                height: 100,
                borderRadius: radius.md,
                backgroundColor: cores.muted,
              }}
            />
          ) : null}
          <View style={{ flex: 1, gap: spacing["2"] }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: cores.cardForeground,
              }}
            >
              {evento.nome}
            </Text>
            <Text style={{ fontSize: 14, color: cores.primary }}>
              {evento.categorias.map((c) => c.categorias.nome).join(" · ")}
            </Text>
            <Text style={{ fontSize: 14, color: cores.mutedForeground }}>
              {data?.espaco?.nome ?? t("detalhe.semEspaco")}
            </Text>
            <Text style={{ fontSize: 14, color: cores.mutedForeground }}>
              {data?.gratuito === true
                ? t("agenda.gratuito")
                : (data?.preco ?? t("detalhe.semPreco"))}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
