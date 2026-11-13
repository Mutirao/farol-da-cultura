import { t } from "@farol/i18n";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import { alternarFavorito, buscarAgenda, type Evento } from "./dados";
import { lerFavoritos, salvarFavoritos } from "./favoritos";

function useAgendaState() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const requisicao = useRef<AbortController | null>(null);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [favoritosProntos, setFavoritosProntos] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const gravando = useRef(false);

  const recarregar = useCallback(async () => {
    requisicao.current?.abort();
    const controller = new AbortController();
    requisicao.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30_000);
    setCarregando(true);
    setErro(null);
    try {
      const dados = await buscarAgenda(
        process.env.EXPO_PUBLIC_SUPABASE_URL,
        process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        controller.signal,
      );
      if (requisicao.current === controller) setEventos(dados);
    } catch (e) {
      if (requisicao.current === controller)
        setErro(
          e instanceof Error && e.message === "configuracao"
            ? t("agenda.semConfiguracao")
            : t("agenda.erro"),
        );
    } finally {
      clearTimeout(timeout);
      if (requisicao.current === controller) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
    return () => {
      requisicao.current?.abort();
      requisicao.current = null;
    };
  }, [recarregar]);

  useEffect(() => {
    let ativo = true;
    async function ler() {
      try {
        const dados = await lerFavoritos();
        if (ativo) {
          setFavoritos(dados);
          setFavoritosProntos(true);
        }
      } catch {
        // Nunca substitui um arquivo ilegível por uma lista vazia.
        if (ativo)
          Alert.alert(t("favoritos.titulo"), t("favoritos.erroLeitura"));
      }
    }
    void ler();
    return () => {
      ativo = false;
    };
  }, []);

  async function favoritar(chave: string) {
    if (!favoritosProntos || gravando.current) return;
    gravando.current = true;
    setSalvando(true);
    try {
      const proximos = alternarFavorito(favoritos, chave);
      await salvarFavoritos(proximos);
      setFavoritos(proximos);
    } catch {
      Alert.alert(t("favoritos.titulo"), t("favoritos.erroEscrita"));
    } finally {
      gravando.current = false;
      setSalvando(false);
    }
  }
  return {
    eventos,
    carregando,
    erro,
    recarregar,
    favoritos,
    favoritar,
    favoritosProntos,
    salvando,
  };
}

const Contexto = createContext<ReturnType<typeof useAgendaState> | null>(null);
export function AgendaProvider({ children }: { children: ReactNode }) {
  return (
    <Contexto.Provider value={useAgendaState()}>{children}</Contexto.Provider>
  );
}
export function useAgenda() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("AgendaProvider ausente");
  return contexto;
}
