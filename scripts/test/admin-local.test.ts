import { describe, expect, it, vi } from "vitest";
import { adminViaApi } from "../provisionar-curador.ts";

const CHAVE_SINTETICA = "teste-sem-credencial-real";

describe("Admin API restrita ao Supabase local", () => {
  it.each([
    "https://remoto.invalid",
    "http://localhost.remoto.invalid",
    "http://127.0.0.1@remoto.invalid",
    "ftp://127.0.0.1",
  ])("recusa %s antes de qualquer requisição", (base) => {
    const buscar = vi.fn<typeof fetch>();
    expect(() => adminViaApi(base, CHAVE_SINTETICA, buscar)).toThrow(
      "auth_nao_local",
    );
    expect(buscar).not.toHaveBeenCalled();
  });

  it.each([
    "http://127.0.0.1:54321",
    "http://localhost:54321",
    "http://[::1]:54321",
  ])("permite listar e criar em %s sem seguir redirects", async (base) => {
    const buscar = vi.fn<typeof fetch>();
    buscar.mockResolvedValueOnce(Response.json({ users: [] }));
    buscar.mockResolvedValueOnce(Response.json({ id: "uuid-sintetico" }));
    const admin = adminViaApi(base, CHAVE_SINTETICA, buscar);
    expect(await admin.buscarPorEmail("teste@teste.local")).toBeNull();
    expect(await admin.criar("teste@teste.local")).toBe("uuid-sintetico");
    expect(buscar).toHaveBeenNthCalledWith(
      1,
      `${base}/auth/v1/admin/users?page=1&per_page=1000`,
      expect.objectContaining({ redirect: "error" }),
    );
    expect(buscar).toHaveBeenNthCalledWith(
      2,
      `${base}/auth/v1/admin/users`,
      expect.objectContaining({ method: "POST", redirect: "error" }),
    );
  });
});
