import { t } from "@farol/i18n";
import { spacing } from "@farol/tokens/native";
import { NativeUIProvider, SearchField, Select } from "@farol/ui-native";
import { useMemo, useState } from "react";
import {
  Keyboard,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useAgenda } from "../../agenda/AgendaProvider";
import { type Filtros, filtrar, filtrosIniciais } from "../../agenda/dados";
import {
  Acao,
  EstadoAgenda,
  ListaEventos,
  Tela,
  useCores,
} from "../../agenda/ui";

export default function Agenda() {
  const { eventos, carregando, erro } = useAgenda();
  const cores = useCores();
  const { height } = useWindowDimensions();
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [aberto, setAberto] = useState(false);
  const filtrados = useMemo(
    () => filtrar(eventos, filtros),
    [eventos, filtros],
  );
  const categorias = [
    ...new Set(
      eventos.flatMap((e) => e.categorias.map((c) => c.categorias.nome)),
    ),
  ].sort();
  const espacos = eventos.flatMap((e) =>
    e.datas.flatMap((d) => (d.espaco ? [d.espaco] : [])),
  );
  const municipios = [
    ...new Map(
      espacos.flatMap((e) =>
        e.municipio
          ? [[e.municipio.toLocaleLowerCase("pt-BR"), e.municipio] as const]
          : [],
      ),
    ).values(),
  ].sort();
  const recursos = [
    ...new Set(espacos.flatMap((e) => e.acessibilidade_fisica)),
  ].sort();
  const mudar = (campo: keyof Filtros, value: string) =>
    setFiltros((atual) => ({ ...atual, [campo]: value }));
  const campos = [
    {
      campo: "periodo",
      label: t("agenda.periodo"),
      options: [
        { value: "proximos", label: t("agenda.proximos") },
        { value: "hoje", label: t("agenda.hoje") },
        { value: "amanha", label: t("agenda.amanha") },
        { value: "semana", label: t("agenda.semana") },
        { value: "mes", label: t("agenda.mes") },
      ],
    },
    {
      campo: "categoria",
      label: t("agenda.categoria"),
      options: [
        { value: "", label: t("agenda.todasCategorias") },
        ...categorias.map((c) => ({ value: c, label: c })),
      ],
    },
    {
      campo: "ingresso",
      label: t("agenda.ingresso"),
      options: [
        { value: "", label: t("agenda.todosIngressos") },
        { value: "gratuito", label: t("agenda.gratuito") },
        { value: "pago", label: t("agenda.pago") },
      ],
    },
    {
      campo: "municipio",
      label: t("agenda.municipio"),
      options: [
        { value: "", label: t("agenda.todosMunicipios") },
        ...municipios.map((m) => ({ value: m, label: m })),
      ],
    },
    {
      campo: "acessibilidade",
      label: t("agenda.acessibilidade"),
      options: [
        { value: "", label: t("agenda.todaAcessibilidade") },
        ...recursos.map((r) => ({ value: r, label: r })),
      ],
    },
  ] satisfies {
    campo: keyof Filtros;
    label: string;
    options: { value: string; label: string }[];
  }[];
  return (
    <Tela titulo={t("agenda.titulo")} descricao={t("agenda.subtitulo")}>
      <View style={{ paddingHorizontal: spacing["4"], gap: spacing["2"] }}>
        <NativeUIProvider matchContents={{ vertical: true }}>
          <SearchField
            accessibilityLabel={t("agenda.busca")}
            value={filtros.busca}
            onChangeText={(value) => mudar("busca", value)}
          />
        </NativeUIProvider>
        <Acao
          label={t("agenda.filtros")}
          onPress={() => {
            Keyboard.dismiss();
            setAberto((atual) => !atual);
          }}
        />
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: cores.mutedForeground }}
        >
          {t("agenda.resultados", { count: filtrados.length })}
        </Text>
      </View>
      {aberto ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: height * 0.5, backgroundColor: cores.background }}
          contentContainerStyle={{ padding: spacing["4"], gap: spacing["3"] }}
        >
          {campos.map(({ campo, label, options }) => (
            <View key={campo} style={{ gap: spacing["1"] }}>
              <Text style={{ color: cores.foreground, fontSize: 16 }}>
                {label}
              </Text>
              <NativeUIProvider matchContents={{ vertical: true }}>
                <Select
                  accessibilityLabel={label}
                  value={filtros[campo]}
                  options={options}
                  onValueChange={(value) => mudar(campo, value)}
                />
              </NativeUIProvider>
            </View>
          ))}
          <Acao
            label={t("agenda.limpar")}
            onPress={() => setFiltros(filtrosIniciais)}
          />
          <Acao
            label={t("agenda.verResultados")}
            onPress={() => setAberto(false)}
          />
        </ScrollView>
      ) : null}
      <EstadoAgenda />
      {!carregando && !erro ? (
        <ListaEventos
          eventos={filtrados}
          filtros={filtros}
          vazio={t("agenda.vazio")}
        />
      ) : null}
    </Tela>
  );
}
