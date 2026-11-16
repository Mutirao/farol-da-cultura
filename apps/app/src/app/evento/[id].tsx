import { t } from "@farol/i18n";
import { radius, spacing } from "@farol/tokens/native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, ScrollView, Share, Text, View } from "react-native";
import { useAgenda } from "../../agenda/AgendaProvider";
import { mensagemConvite } from "../../agenda/convite";
import {
  chaveEvento,
  formatarData,
  formatarDataLonga,
} from "../../agenda/dados";
import { distanciaEvento, formatarDistancia } from "../../agenda/distancia";
import { abrirComoChegar, abrirPagina } from "../../agenda/links";
import { localizacaoConhecida } from "../../agenda/localizacao";
import { Acao, EstadoAgenda, Paragrafo, useCores } from "../../agenda/ui";

export default function DetalheEvento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    eventos,
    favoritos,
    favoritar,
    favoritosProntos,
    salvando,
    carregando,
  } = useAgenda();
  const cores = useCores();
  const router = useRouter();
  const evento = eventos.find((e) => e.id === Number(id));
  const cabecalho = (
    <Stack.Screen options={{ headerShown: true, title: t("detalhe.titulo") }} />
  );
  if (!evento)
    return (
      <View style={{ flex: 1 }}>
        {cabecalho}
        <EstadoAgenda />
        {!carregando ? (
          <>
            <Paragrafo>{t("detalhe.naoEncontrado")}</Paragrafo>
            <Acao
              label={t("detalhe.voltar")}
              onPress={() => router.replace("/agenda")}
            />
          </>
        ) : null}
      </View>
    );
  const salvo = favoritos.includes(chaveEvento(evento));
  const datas = [...evento.datas].sort(
    (a, b) => Date.parse(a.inicio) - Date.parse(b.inicio),
  );
  const urlFonte =
    evento.fonte === "mapa-cultural-ce" && /^\d+$/.test(evento.id_externo)
      ? `https://mapacultural.secult.ce.gov.br/evento/${evento.id_externo}/`
      : null;
  const primeiraData = datas[0];
  const espacoPrincipal = primeiraData?.espaco ?? null;
  const origemConhecida = localizacaoConhecida();
  const distancia =
    espacoPrincipal && origemConhecida
      ? distanciaEvento(evento, origemConhecida)
      : null;
  const convite = mensagemConvite(t("detalhe.compartilharChamada"), [
    primeiraData
      ? t("detalhe.compartilharQuando", {
          quando: formatarData(primeiraData.inicio),
          nome: evento.nome,
        })
      : evento.nome,
    primeiraData?.espaco
      ? t("detalhe.compartilharLocal", { local: primeiraData.espaco.nome })
      : null,
    primeiraData
      ? t("detalhe.compartilharIngresso", {
          ingresso:
            primeiraData.gratuito === true
              ? t("agenda.gratuito")
              : (primeiraData.preco ?? t("detalhe.semPreco")),
        })
      : null,
    urlFonte,
  ]);
  async function compartilhar() {
    try {
      await Share.share({ message: convite });
    } catch {
      Alert.alert(t("detalhe.compartilhar"), t("detalhe.falhaLink"));
    }
  }
  return (
    <>
      {cabecalho}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: spacing["4"],
          paddingBottom: spacing["10"],
          gap: spacing["4"],
        }}
        testID="evento-screen"
      >
        {evento.imagem_url ? (
          <Image
            source={{ uri: evento.imagem_url }}
            contentFit="contain"
            accessibilityLabel={evento.nome}
            style={{
              height: 250,
              borderRadius: radius.md,
              backgroundColor: cores.muted,
            }}
          />
        ) : null}
        <Text
          accessibilityRole="header"
          style={{ color: cores.foreground, fontSize: 26, fontWeight: "700" }}
        >
          {evento.nome}
        </Text>
        <Text style={{ color: cores.primary, fontSize: 16 }}>
          {evento.categorias.map((c) => c.categorias.nome).join(" · ")}
        </Text>
        {primeiraData ? (
          <View
            accessible
            accessibilityLabel={[
              formatarDataLonga(primeiraData.inicio),
              primeiraData.gratuito === true
                ? t("agenda.gratuito")
                : (primeiraData.preco ?? t("detalhe.semPreco")),
              primeiraData.espaco?.nome ?? t("detalhe.semEspaco"),
              evento.classificacao_etaria
                ? t("detalhe.classificacao", {
                    valor: evento.classificacao_etaria,
                  })
                : "",
            ]
              .filter(Boolean)
              .join(", ")}
            style={{
              padding: spacing["3"],
              gap: spacing["2"],
              backgroundColor: cores.muted,
              borderRadius: radius.md,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{
                color: cores.highlight,
                fontSize: 19,
                fontWeight: "700",
              }}
            >
              {formatarDataLonga(primeiraData.inicio)}
            </Text>
            {primeiraData.fim ? (
              <Paragrafo>
                {t("detalhe.fim", { data: formatarData(primeiraData.fim) })}
              </Paragrafo>
            ) : null}
            <Paragrafo>
              {primeiraData.gratuito === true
                ? t("agenda.gratuito")
                : (primeiraData.preco ?? t("detalhe.semPreco"))}
            </Paragrafo>
            <Paragrafo>
              {[primeiraData.espaco?.nome, primeiraData.espaco?.municipio]
                .filter(Boolean)
                .join(" · ") || t("detalhe.semEspaco")}
            </Paragrafo>
            {distancia !== null ? (
              <Paragrafo>{formatarDistancia(distancia)}</Paragrafo>
            ) : null}
            {evento.classificacao_etaria ? (
              <Paragrafo>
                {t("detalhe.classificacao", {
                  valor: evento.classificacao_etaria,
                })}
              </Paragrafo>
            ) : null}
            {espacoPrincipal ? (
              <Acao
                label={t("detalhe.comoChegar", { nome: espacoPrincipal.nome })}
                onPress={() => void abrirComoChegar(espacoPrincipal)}
              />
            ) : null}
          </View>
        ) : (
          <Paragrafo>
            {evento.classificacao_etaria
              ? t("detalhe.classificacao", {
                  valor: evento.classificacao_etaria,
                })
              : t("detalhe.semClassificacao")}
          </Paragrafo>
        )}
        <Acao
          label={salvo ? t("detalhe.desfavoritar") : t("detalhe.favoritar")}
          disabled={!favoritosProntos || salvando}
          onPress={() => void favoritar(chaveEvento(evento))}
        />
        <Text
          accessibilityRole="header"
          style={{ fontSize: 20, color: cores.foreground, fontWeight: "600" }}
        >
          {t("detalhe.descricao")}
        </Text>
        <Paragrafo>
          {evento.descricao_longa ||
            evento.descricao_curta ||
            t("detalhe.semDescricao")}
        </Paragrafo>
        <Text
          accessibilityRole="header"
          style={{ fontSize: 20, color: cores.foreground, fontWeight: "600" }}
        >
          {t("detalhe.programacao")}
        </Text>
        {!datas.length ? <Paragrafo>{t("detalhe.semDatas")}</Paragrafo> : null}
        {datas.map((data) => (
          <View
            key={data.id}
            style={{
              padding: spacing["3"],
              gap: spacing["2"],
              backgroundColor: cores.muted,
              borderRadius: radius.md,
            }}
          >
            <Text
              style={{
                color: cores.highlight,
                fontSize: 18,
                fontWeight: "600",
              }}
            >
              {formatarData(data.inicio)}
            </Text>
            {data.fim ? (
              <Paragrafo>
                {t("detalhe.fim", { data: formatarData(data.fim) })}
              </Paragrafo>
            ) : null}
            <Paragrafo>
              {data.gratuito === true
                ? t("agenda.gratuito")
                : (data.preco ?? t("detalhe.semPreco"))}
            </Paragrafo>
            <Paragrafo>{data.espaco?.nome ?? t("detalhe.semEspaco")}</Paragrafo>
            {data.espaco ? (
              <>
                <Paragrafo>
                  {data.espaco.endereco ||
                    data.espaco.municipio ||
                    t("detalhe.semEndereco")}
                </Paragrafo>
                <Acao
                  label={t("detalhe.abrirEspaco", { nome: data.espaco.nome })}
                  onPress={() =>
                    router.push({
                      pathname: "/espaco/[id]",
                      params: { id: data.espaco!.id },
                    })
                  }
                />
              </>
            ) : null}
          </View>
        ))}
        <Acao
          label={t("detalhe.compartilhar")}
          onPress={() => void compartilhar()}
        />
        {urlFonte ? (
          <Acao
            label={t("detalhe.fonte")}
            onPress={() => void abrirPagina(urlFonte)}
          />
        ) : null}
      </ScrollView>
    </>
  );
}
