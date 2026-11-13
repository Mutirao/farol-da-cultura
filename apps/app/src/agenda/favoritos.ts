import { File, Paths } from "expo-file-system";
import { FavoritosSchema } from "./dados";

export async function lerFavoritos(): Promise<string[]> {
  const arquivo = new File(Paths.document, "favoritos-v1.json");
  return arquivo.exists
    ? FavoritosSchema.parse(JSON.parse(await arquivo.text()))
    : [];
}

export async function salvarFavoritos(chaves: string[]): Promise<void> {
  const temporario = new File(Paths.document, "favoritos-v1.tmp");
  await temporario.write(JSON.stringify(FavoritosSchema.parse(chaves)));
  // Só troca o arquivo anterior depois de completar a gravação.
  await temporario.move(new File(Paths.document, "favoritos-v1.json"), {
    overwrite: true,
  });
}
