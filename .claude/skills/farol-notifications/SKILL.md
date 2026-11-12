---

name: farol-notifications
description: Use when changing cultural-event notifications.
---

# Notificações de eventos culturais

## Fontes e limites

Base: F0-09a, V19 e regras de segurança de `docs/PLANO-FASE-0-REVISADO.md` e `.claude/claude-security-guidance.md`.
Os §§8–11 não especificam notificações; o plano original é stub.
Este procedimento é inferido do domínio agenda cultural para Fases 2–4: provedor, fila, horários e limites ainda precisam de contrato, não são decisões implementadas.

## Procedimento

1. Defina o gatilho (lembrete, alteração ou cancelamento), público, consentimento, canal e horário/fuso. Negação de permissão, logout e opt-out devem ter comportamento explícito; não reative envios sem consentimento.
2. Separe registro de dispositivo, preferências do usuário e tentativa de entrega. Proteja tokens e preferências com RLS por proprietário; credenciais do provedor ficam só no servidor.
3. Defina chave idempotente por destinatário, evento, tipo e versão/ocorrência do aviso. Reprocessar um job não pode criar entrega duplicada; escolha uma estratégia transacional para enfileirar após persistir o evento.
4. Valide destino e dados no servidor. Use payload mínimo, sem dados pessoais sensíveis; deep link deve revalidar sessão e autorização antes de abrir conteúdo protegido.
5. Trate retry transitório com backoff e limite; invalide destinos expirados/revogados. Não registre tokens, e-mail completo ou payload privado em logs.
6. Diferencie aceitação pelo provedor de recebimento/exibição no aparelho; monitore contagens sanitizadas de tentativa, falha e descarte, sem prometer entrega garantida.

## Armadilhas

Conversão anônima não mescla automaticamente o segundo aparelho (V19); preserve preferências e reavalie propriedade com autorização explícita.
Não escolha um provedor pago nem faça envio em massa/produção para testar esta skill.

## Verificação

Use doubles do provedor e relógio controlado para consentimento negado, opt-out antes do envio, fuso, evento alterado/cancelado, retry duplicado, token inválido e acesso entre dois usuários.
Quando houver integração autorizada, teste em dispositivo de desenvolvimento com destinatário controlado; registre a diferença entre aceite do provedor e recebimento observado.
