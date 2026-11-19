import {
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useLogin, useNotify } from "react-admin";
import { supabase } from "./supabaseClient";

// Login de curador sem senha: signInWithOtp com shouldCreateUser:false pede
// o código; só depois de um clique explícito de confirmação o painel chama
// verifyOtp (via authProvider.login, pelo useLogin do react-admin). Inbucket
// local está parado — ver README (seção "Como logar localmente").
export function LoginPage() {
  const login = useLogin();
  const notify = useNotify();
  const [email, setEmail] = useState("");
  const [codigoSolicitado, setCodigoSolicitado] = useState(false);
  const [token, setToken] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!supabase) return null;

  const solicitarCodigo = async () => {
    if (!supabase) return;
    setEnviando(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      notify("Código solicitado. Confira o e-mail do curador.", {
        type: "info",
      });
    } catch {
      // Não revela se o e-mail existe nem por que falhou (ex.: Inbucket
      // parado no local, SMTP fora do ar em produção): a etapa seguinte
      // sempre abre, e o curador com código provisionado localmente segue o
      // roteiro do README em vez de travar aqui.
      notify(
        "Não foi possível confirmar o envio agora. Se você tem um código provisionado localmente, informe-o a seguir.",
        { type: "warning" },
      );
    } finally {
      setCodigoSolicitado(true);
      setEnviando(false);
    }
  };

  const confirmarCodigo = async () => {
    setEnviando(true);
    try {
      await login({ email, token });
    } catch {
      notify("Código inválido ou expirado.", { type: "error" });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main
      style={{ display: "flex", justifyContent: "center", marginTop: "10vh" }}
    >
      <Card sx={{ maxWidth: 420, width: "100%" }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5">Farol — login do curador</Typography>
            <Typography variant="body2">
              Informe o e-mail do curador para receber um código de acesso.
              Cadastro público desabilitado: só curador já provisionado entra.
            </Typography>
            <TextField
              label="E-mail do curador"
              type="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              disabled={codigoSolicitado}
              autoFocus
            />
            {!codigoSolicitado ? (
              <Button
                variant="contained"
                disabled={!email || enviando}
                onClick={solicitarCodigo}
              >
                Enviar código
              </Button>
            ) : (
              <>
                <TextField
                  label="Código recebido"
                  value={token}
                  onChange={(evento) => setToken(evento.target.value)}
                  autoFocus
                />
                <Button
                  variant="contained"
                  disabled={!token || enviando}
                  onClick={confirmarCodigo}
                >
                  Confirmar código
                </Button>
                <Button
                  variant="text"
                  disabled={enviando}
                  onClick={() => {
                    setCodigoSolicitado(false);
                    setToken("");
                  }}
                >
                  Usar outro e-mail
                </Button>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </main>
  );
}
