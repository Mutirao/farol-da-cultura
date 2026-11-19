// S0.9 — autenticação mínima do e2e: JWT HS256 assinado à mão com o segredo da pilha
// isolada (equivalente ao que o Supabase Auth emitiria) e provisionamento direto do curador
// de teste. Evita depender de e-mail/Inbucket (parado localmente, ver handoff do S0.4) e do
// fluxo de magic link; só é chamado depois que pilha.verificarIsolamento() aprova o alvo.
import { createHmac, randomUUID } from "node:crypto";
import type postgres from "postgres";

function base64url(valor: string): string {
  return Buffer.from(valor).toString("base64url");
}

/**
 * JWT HS256 mínimo com os claims que o PostgREST local verifica e expõe como
 * `request.jwt.claims` (sub, role, aud, exp) — o suficiente para `auth.uid()` e
 * `public.current_curator()` resolverem o curador por trás do `authUserId`.
 */
export function assinarJwtCurador(
  authUserId: string,
  jwtSecret: string,
): string {
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const corpo = base64url(
    JSON.stringify({
      sub: authUserId,
      role: "authenticated",
      aud: "authenticated",
      iat: agora,
      exp: agora + 3600,
    }),
  );
  const dados = `${cabecalho}.${corpo}`;
  const assinatura = createHmac("sha256", jwtSecret)
    .update(dados)
    .digest("base64url");
  return `${dados}.${assinatura}`;
}

export interface CuradorTeste {
  authUserId: string;
  userId: number;
  jwt: string;
}

/**
 * Insere `auth.users` + `public.users` + `private.curator_identities` direto por SQL, com o
 * mesmo padrão mínimo de colunas que os pgTAP 002/007 já provam funcionar (id, aud, role,
 * email, created_at, updated_at). Só serve para o banco isolado: `sql` vem de
 * `pilha.status.DB_URL`, já validado por `verificarIsolamento`.
 */
export async function provisionarCuradorTeste(
  sql: postgres.Sql,
  jwtSecret: string,
  email = `e2e-curador-${randomUUID()}@teste.local`,
): Promise<CuradorTeste> {
  const authUserId = randomUUID();
  await sql`
    insert into auth.users (id, aud, role, email, created_at, updated_at)
    values (${authUserId}, 'authenticated', 'authenticated', ${email}, now(), now())
  `;
  const linhas = await sql<{ id: number }[]>`
    insert into public.users (email, is_active, role)
    values (${email}, true, 'curator')
    returning id
  `;
  const criado = linhas[0];
  if (!criado)
    throw new Error(
      "provisionarCuradorTeste: insert em public.users não voltou id",
    );
  await sql`
    insert into private.curator_identities (auth_user_id, user_id)
    values (${authUserId}, ${criado.id})
  `;
  return {
    authUserId,
    userId: criado.id,
    jwt: assinarJwtCurador(authUserId, jwtSecret),
  };
}
