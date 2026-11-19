import { describe, expect, it, vi } from "vitest";
import { criarAuthProvider } from "../src/authProvider";

function clienteFalso(opcoes: {
  sessao?: unknown;
  curadorId?: number | null;
  erroRpc?: unknown;
  erroVerifyOtp?: unknown;
}) {
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const verifyOtp = vi
    .fn()
    .mockResolvedValue({ error: opcoes.erroVerifyOtp ?? null });
  const getSession = vi
    .fn()
    .mockResolvedValue({ data: { session: opcoes.sessao ?? null } });
  const rpc = vi.fn().mockResolvedValue({
    data: opcoes.curadorId ?? null,
    error: opcoes.erroRpc ?? null,
  });
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: "u1", email: "curador@teste.local" } },
  });
  const cliente = {
    auth: { getSession, verifyOtp, signOut, getUser },
    rpc,
  } as never;
  return { cliente, signOut, verifyOtp, getSession, rpc };
}

describe("authProvider.checkAuth", () => {
  it("nega (rejeita) sem sessão", async () => {
    const { cliente } = clienteFalso({ sessao: null });
    const authProvider = criarAuthProvider(cliente);
    await expect(authProvider.checkAuth({})).rejects.toBeFalsy();
  });

  it("nega sem curador ativo mesmo com sessão válida, e desloga", async () => {
    const { cliente, signOut } = clienteFalso({
      sessao: { user: { id: "u1" } },
      curadorId: null,
    });
    const authProvider = criarAuthProvider(cliente);
    await expect(authProvider.checkAuth({})).rejects.toBeTruthy();
    expect(signOut).toHaveBeenCalled();
  });

  it("nega quando a RPC current_curator devolve erro", async () => {
    const { cliente, signOut } = clienteFalso({
      sessao: { user: { id: "u1" } },
      erroRpc: { message: "permission denied" },
    });
    const authProvider = criarAuthProvider(cliente);
    await expect(authProvider.checkAuth({})).rejects.toBeTruthy();
    expect(signOut).toHaveBeenCalled();
  });

  it("resolve com sessão e curador ativo", async () => {
    const { cliente, signOut } = clienteFalso({
      sessao: { user: { id: "u1" } },
      curadorId: 9741,
    });
    const authProvider = criarAuthProvider(cliente);
    await expect(authProvider.checkAuth({})).resolves.toBeUndefined();
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe("authProvider.login", () => {
  it("chama verifyOtp com e-mail e código (2ª etapa, depois da confirmação)", async () => {
    const { cliente, verifyOtp } = clienteFalso({});
    const authProvider = criarAuthProvider(cliente);
    await authProvider.login({ email: "curador@teste.local", token: "123456" });
    expect(verifyOtp).toHaveBeenCalledWith({
      email: "curador@teste.local",
      token: "123456",
      type: "email",
    });
  });

  it("propaga erro de código inválido/expirado", async () => {
    const { cliente } = clienteFalso({
      erroVerifyOtp: { message: "token has expired or is invalid" },
    });
    const authProvider = criarAuthProvider(cliente);
    await expect(
      authProvider.login({ email: "curador@teste.local", token: "000000" }),
    ).rejects.toBeTruthy();
  });
});

describe("authProvider.checkError", () => {
  it("desloga em 401/403", async () => {
    const { cliente, signOut } = clienteFalso({});
    const authProvider = criarAuthProvider(cliente);
    await expect(
      authProvider.checkError?.({ status: 401 }),
    ).rejects.toBeTruthy();
    expect(signOut).toHaveBeenCalled();
  });

  it("não desloga em outros status", async () => {
    const { cliente, signOut } = clienteFalso({});
    const authProvider = criarAuthProvider(cliente);
    await authProvider.checkError?.({ status: 500 });
    expect(signOut).not.toHaveBeenCalled();
  });
});
