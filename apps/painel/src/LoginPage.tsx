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
import { m } from "./mensagens";
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
      notify(m.login.solicitado, {
        type: "info",
      });
    } catch {
      // Não revela se o e-mail existe nem por que falhou (ex.: Inbucket
      // parado no local, SMTP fora do ar em produção): a etapa seguinte
      // sempre abre, e o curador com código provisionado localmente segue o
      // roteiro do README em vez de travar aqui.
      notify(m.login.falhaEnvio, { type: "warning" });
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
      notify(m.login.invalido, { type: "error" });
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
            <Typography variant="h5">{m.login.titulo}</Typography>
            <Typography variant="body2">{m.login.instrucoes}</Typography>
            <TextField
              label={m.login.email}
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
                {m.login.enviar}
              </Button>
            ) : (
              <>
                <TextField
                  label={m.login.codigo}
                  value={token}
                  onChange={(evento) => setToken(evento.target.value)}
                  autoFocus
                />
                <Button
                  variant="contained"
                  disabled={!token || enviando}
                  onClick={confirmarCodigo}
                >
                  {m.login.confirmar}
                </Button>
                <Button
                  variant="text"
                  disabled={enviando}
                  onClick={() => {
                    setCodigoSolicitado(false);
                    setToken("");
                  }}
                >
                  {m.login.outroEmail}
                </Button>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </main>
  );
}
