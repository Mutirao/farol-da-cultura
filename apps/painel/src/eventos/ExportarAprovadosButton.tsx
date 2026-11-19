import DownloadIcon from "@mui/icons-material/Download";
import { Box, Button, Stack } from "@mui/material";
import { useState } from "react";
import { useDataProvider, useNotify } from "react-admin";
import { m } from "../mensagens";
import {
  type EventoColetado,
  gerarCsvAprovados,
  gerarJsonAprovados,
} from "./acoes";

function baixarArquivo(nomeArquivo: string, conteudo: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Exportação mínima no navegador: busca os aprovados independente da
// paginação/filtro atual da lista e gera CSV/JSON só para o curador levar
// consigo. Não é o CSV compatível com o Mapas Culturais (isso é U4).
export function ExportarAprovadosButton() {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const [carregando, setCarregando] = useState(false);

  const exportar = async (formato: "csv" | "json") => {
    setCarregando(true);
    try {
      const { data } = await dataProvider.getList("events", {
        filter: { curation_status: "approved" },
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "id", order: "ASC" },
      });
      const aprovados = data as unknown as EventoColetado[];
      if (formato === "csv") {
        baixarArquivo(
          "farol-aprovados-minimo.csv",
          gerarCsvAprovados(aprovados),
          "text/csv",
        );
      } else {
        baixarArquivo(
          "farol-aprovados-minimo.json",
          gerarJsonAprovados(aprovados),
          "application/json",
        );
      }
      notify(m.exportar.gerada, { type: "info" });
    } catch {
      notify(m.exportar.falha, { type: "error" });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{ minWidth: 0, flexWrap: "wrap", justifyContent: "flex-end" }}
    >
      <Button
        aria-label={m.exportar.csv}
        startIcon={<DownloadIcon />}
        disabled={carregando}
        onClick={() => exportar("csv")}
      >
        <Box component="span" sx={{ display: { xs: "inline", md: "none" } }}>
          {m.exportar.csvCurto}
        </Box>
        <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
          {m.exportar.csv}
        </Box>
      </Button>
      <Button
        aria-label={m.exportar.json}
        disabled={carregando}
        onClick={() => exportar("json")}
      >
        <Box component="span" sx={{ display: { xs: "inline", md: "none" } }}>
          {m.exportar.jsonCurto}
        </Box>
        <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
          {m.exportar.json}
        </Box>
      </Button>
    </Stack>
  );
}
