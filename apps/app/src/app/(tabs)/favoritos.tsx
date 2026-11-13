import { t } from "@farol/i18n";
import { spacing } from "@farol/tokens/native";
import { View } from "react-native";
import { useAgenda } from "../../agenda/AgendaProvider";
import { chaveEvento, filtrar, filtrosIniciais } from "../../agenda/dados";
import { EstadoAgenda, ListaEventos, Paragrafo, Tela } from "../../agenda/ui";

export default function Favoritos() {
  const { eventos, favoritos, carregando } = useAgenda();
  const salvos = eventos.filter((evento) =>
    favoritos.includes(chaveEvento(evento)),
  );
  const indisponiveis = favoritos.length - salvos.length;
  return (
    <Tela titulo={t("favoritos.titulo")} descricao={t("favoritos.subtitulo")}>
      <EstadoAgenda />
      {!carregando && indisponiveis > 0 ? (
        <View style={{ padding: spacing["4"] }}>
          <Paragrafo>
            {t("favoritos.indisponiveis", { count: indisponiveis })}
          </Paragrafo>
        </View>
      ) : null}
      {!carregando ? (
        <ListaEventos
          eventos={filtrar(salvos, filtrosIniciais)}
          filtros={filtrosIniciais}
          vazio={
            salvos.length ? t("favoritos.semProximos") : t("favoritos.vazio")
          }
        />
      ) : null}
    </Tela>
  );
}
