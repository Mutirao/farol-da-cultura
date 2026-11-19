import { Chip } from "@mui/material";
import type { EstadoVinculo } from "./acoes";

const ROTULOS: Record<EstadoVinculo["estado"], string> = {
  registrado: "Registrado (não confirmado)",
  confirmado: "Confirmado na instância",
  divergente: "Divergente — revisar",
};

// Cores por chave de paleta do MUI, nunca hex literal (regra do projeto).
const CORES: Record<EstadoVinculo["estado"], "warning" | "success" | "error"> =
  {
    registrado: "warning",
    confirmado: "success",
    divergente: "error",
  };

export function EstadoVinculoTexto({
  vinculo,
}: {
  vinculo: EstadoVinculo | undefined;
}) {
  if (!vinculo) {
    return <Chip label="Sem vínculo institucional" size="small" />;
  }
  return (
    <Chip
      label={ROTULOS[vinculo.estado]}
      color={CORES[vinculo.estado]}
      size="small"
    />
  );
}
