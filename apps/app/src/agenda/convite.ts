// Mensagem de convite no formato da pesquisa de UX (relatório, slides 25 e 33):
// a chamada convida; as linhas trazem quando, onde, quanto e o link da fonte.
// Partes já formatadas chegam do caller (i18n + formatação de data/preço).

export function mensagemConvite(
  chamada: string,
  linhas: (string | null | undefined)[],
): string {
  const validas = linhas.filter(
    (linha): linha is string => typeof linha === "string" && linha.length > 0,
  );
  return [chamada, ...validas].join("\n");
}
