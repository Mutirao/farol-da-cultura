import { FavoritosSchema } from "./dados";

// expo-file-system não tem implementação web (só avisos); no navegador os
// favoritos ficam no localStorage da origem, com a mesma interface e regras.
const CHAVE = "farol:favoritos-v1";

function armazenamento(): Storage {
  // Ausente (SSR, armazenamento bloqueado) é erro, nunca lista vazia silenciosa.
  const local = globalThis.localStorage;
  if (!local) throw new Error("localStorage indisponível");
  return local;
}

export async function lerFavoritos(): Promise<string[]> {
  const bruto = armazenamento().getItem(CHAVE);
  return bruto === null ? [] : FavoritosSchema.parse(JSON.parse(bruto));
}

export async function salvarFavoritos(chaves: string[]): Promise<void> {
  // setItem troca o valor inteiro ou lança (ex.: cota): o anterior permanece.
  armazenamento().setItem(CHAVE, JSON.stringify(FavoritosSchema.parse(chaves)));
}
