export type InstanciaOficial = {
  id: string;
  nome: string;
  site: string;
  fuso: string;
};
export type CatalogoOficial = {
  instancias: InstanciaOficial[];
  sincronizacao: boolean;
};
export type PedidoInstancias =
  | { acao: "listar" }
  | { acao: "buscar"; instancia: string }
  | { acao: "sincronizar"; instancia: string; revisao: string };

export type PreviaOficial = {
  de: string;
  ate: string;
  totalEventos: number;
  ocorrencias: number;
  rejeitadas: number;
  eventos: {
    id: string;
    nome: string;
    inicio: string;
    municipio: string | null;
    ocorrencias: number;
  }[];
  revisao: string;
  sincronizavel: boolean;
};

export type ResultadoSync = {
  eventos: { criados: number; alterados: number };
  datas: { criadas: number; alteradas: number; removidas: number };
};
