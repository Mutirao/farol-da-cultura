# Setup da máquina de desenvolvimento (F0-01)

- Node 26.10.0 (`.nvmrc`)
- `npm i -g pnpm@12.18.0` (o corepack 0.34.2 não roda o pnpm 12)
- `npm i -g eas-cli@27.7.2 typescript-language-server typescript@6.0.3`
- `gitleaks` 8.30.1 (gerenciador de pacotes ou release oficial)
- Docker com o daemon ativo (`docker info`)

Verificação: `pnpm -v` = 12.18.0; `docker info` responde; `command -v gitleaks typescript-language-server`.
