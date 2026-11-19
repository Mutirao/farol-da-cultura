// Mensagens do painel web: não depende de expo-localization.
export const m = {
  titulo: "Farol — curadoria",
  semConfiguracao:
    "VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY não configurados. Veja o README deste pacote para rodar e logar localmente.",
  menu: { curadoria: "Curadoria", operacao: "Operação" },
  recursos: {
    events: "Eventos coletados",
    sources: "Fontes de eventos",
    spaces: "Espaços",
    job_runs: "Execuções de jobs",
    exports: "Exportações",
  },
  campos: {
    id: "ID",
    slug: "Identificador",
    name: "Nome",
    kind: "Tipo",
    is_active: "Ativo",
    created_at: "Criado em",
    updated_at: "Atualizado em",
    normalized_name: "Nome normalizado",
    municipality: "Município",
    is_stale: "Desatualizado",
    last_synced_at: "Última sincronização",
    mapas_space_id: "ID do espaço no Mapas",
    job_type: "Tipo de job",
    status: "Status",
    owner: "Responsável",
    started_at: "Iniciado em",
    finished_at: "Finalizado em",
    counters: "Contadores",
    error: "Erro",
    row_count: "Linhas",
    checksum_sha256: "Checksum (SHA-256)",
    schema_version: "Versão do esquema",
    created_by: "Criado por",
    title: "Título",
    description: "Descrição",
    source_id: "Fonte",
    city: "Cidade",
    starts_at: "Início (Fortaleza)",
    ends_at: "Fim (Fortaleza)",
    venue_name: "Local",
    is_free: "Gratuito",
    collection_status: "Coleta",
    curation_status: "Curadoria",
    space_match_status: "Correspondência de espaço",
    export_status: "Exportação",
    mapas_import_status: "Importação no Mapas",
    version: "Versão",
    vinculo: "Vínculo institucional",
  },
  filtros: {
    titulo: "Buscar no título",
    inicioDe: "Início a partir de (Fortaleza)",
    inicioAte: "Início até (Fortaleza)",
    pending: "Pendente",
    approved: "Aprovado",
    rejected: "Rejeitado",
  },
  login: {
    titulo: "Farol — login do curador",
    instrucoes:
      "Informe o e-mail do curador para receber um código de acesso. Cadastro público desabilitado: só curador já provisionado entra.",
    email: "E-mail do curador",
    codigo: "Código recebido",
    enviar: "Enviar código",
    confirmar: "Confirmar código",
    outroEmail: "Usar outro e-mail",
    solicitado: "Código solicitado. Confira o e-mail do curador.",
    falhaEnvio:
      "Não foi possível confirmar o envio agora. Se você tem um código provisionado localmente, informe-o a seguir.",
    invalido: "Código inválido ou expirado.",
  },
  evento: {
    titulo: "Evento coletado",
    aprovar: "Aprovar",
    rejeitar: "Rejeitar",
    sobreInstancias:
      "Para consultar ou sincronizar eventos já publicados no Mapas Culturais, use Instâncias oficiais. Aprovar este evento não o envia ao Mapas nem o publica na agenda.",
    divergencia:
      "Version divergente: outra coleta ou curadoria mudou o evento; recarregue a página.",
    semCurador: "Operador sem vínculo de curador ativo.",
    falhaCuradoria: "Falha ao registrar a curadoria.",
    aprovado: "Evento aprovado.",
    rejeitado: "Evento rejeitado.",
  },
  instancias: {
    titulo: "Instâncias oficiais",
    instrucao:
      "Consulte os eventos publicados na fonte oficial sem alterar a agenda do Farol.",
    buscar: "Buscar eventos",
    buscando: "Buscando eventos…",
    sincronizar: "Sincronizar agenda",
    sincronizando: "Sincronizando…",

    carregando: "Carregando instâncias…",
    tentar: "Tentar novamente",
    semInstancias: "Nenhuma instância oficial configurada.",
    abrirSite: "Abrir site oficial",
    desativada:
      "Sincronização pelo painel desativada neste ambiente. A busca continua disponível.",
    previa: "Prévia da consulta",
    periodo: (de: string, ate: string) =>
      `De ${de} a ${ate} (horário da instância)`,
    totais: (eventos: number, datas: number) =>
      `${eventos} ${eventos === 1 ? "evento" : "eventos"} · ${datas} ${datas === 1 ? "ocorrência" : "ocorrências"}`,
    contarOcorrencias: (n: number) =>
      `${n} ${n === 1 ? "ocorrência" : "ocorrências"}`,
    amostra: (n: number) =>
      `A prévia mostra os primeiros ${n} eventos. A sincronização abrange todo o período consultado.`,
    rejeitadas: (n: number) =>
      `Linhas excluídas da prévia (inválidas, repetidas ou fora do período): ${n}. Não é possível sincronizar com uma resposta incompleta.`,
    semEventos:
      "A instância não retornou eventos válidos neste período. Nenhum dado foi alterado.",
    confirmarTitulo: "Sincronizar a agenda do Farol?",
    impacto: (nome: string) =>
      `A agenda pública do Farol será atualizada com os eventos de ${nome} no período consultado. Datas que não constam mais na fonte podem sair da agenda. Nenhum dado será enviado ao Mapas Culturais.`,
    cancelar: "Cancelar",
    confirmar: "Confirmar sincronização",
    resultado: (
      novos: number,
      alterados: number,
      novasDatas: number,
      datasAlteradas: number,
      removidas: number,
    ) =>
      `Agenda sincronizada. Eventos: ${novos} novos, ${alterados} atualizados. Datas: ${novasDatas} novas, ${datasAlteradas} atualizadas, ${removidas} removidas.`,
    erros: {
      sessao_necessaria:
        "Sua sessão não está ativa. Entre novamente no painel.",
      curador_necessario:
        "Esta operação exige uma sessão com curadoria ativa. Se a sessão expirou, entre novamente.",
      painel_indisponivel:
        "O serviço de instâncias está indisponível. Verifique se a função está configurada ou tente novamente.",
      instancia_indisponivel:
        "A instância não respondeu com uma agenda válida. Tente buscar novamente.",
      importacao_recusada:
        "Não foi possível confirmar a sincronização. Consulte a agenda antes de tentar novamente.",
      sincronizacao_desativada:
        "Sincronização pelo painel desativada neste ambiente.",
      previa_desatualizada:
        "Os dados da instância mudaram. Busque os eventos novamente antes de sincronizar.",
      agenda_alterada:
        "Outra sincronização atualizou a agenda. Busque os eventos novamente antes de sincronizar.",
      lote_inseguro:
        "A resposta não cobre o período com dados válidos. Sincronização bloqueada.",
      pedido_invalido: "A operação solicitada não está disponível.",
    },
  },
  exportar: {
    csv: "CSV mínimo de aprovados",
    json: "JSON mínimo de aprovados",
    csvCurto: "CSV mínimo",
    jsonCurto: "JSON mínimo",
    gerada:
      "Exportação mínima gerada — não é o CSV compatível com o Mapas Culturais.",
    falha: "Falha ao gerar a exportação mínima.",
  },
} as const;

export const formatoData = { timeZone: "America/Fortaleza" };
