---

version: alpha
name: Painel Farol
description: Extensão operacional do painel React-admin, sem novo tema.
colors:
primary: "#1976D2"
paper: "#FFFFFF"
ink: "rgba(0, 0, 0, 0.87)"
typography:
body:
fontFamily: Roboto, Helvetica, Arial, sans-serif
fontSize: 1rem
spacing:
unit: 8px
---

## Overview

A tela de instâncias oficiais segue o tema React-admin/MUI do painel. A ação
principal é consultar; atualizar a agenda é uma decisão separada. A interface
identifica a origem e não usa formulário técnico por evento.

## Colors

Herdar todos os tokens do tema ativo; os valores acima descrevem o padrão claro,
não substituem o tema nem o modo escuro. Avisos e erros também são escritos em texto.

## Typography

Título da página, nome da instância e texto de apoio seguem a tipografia MUI.
Use `body2` só para metadados, não para o aviso de impacto da sincronização.

## Layout

Uma coluna, com título e ação no primeiro bloco, separados dos resultados por
linha fina e espaço. Sem imagens. O número de eventos e ocorrências abre a
prévia; a lista de amostra é legível mesmo a 375 px. Mantém barra superior e
menu lateral do painel, e quebra as ações em linhas em telas estreitas.

## Components

`Alert` para vazio, falha e resultado, `Button` para consultar e sincronizar,
`Dialog` com foco inicial em Cancelar para confirmar a atualização. Sem escrita
otimista: o resultado só aparece depois da resposta do servidor.

## Do's and Don'ts

- Identifique o período da consulta e informe se a lista é uma amostra.
- Não confunda agenda pública com fila de curadoria nem sincronização com envio ao Mapas.
- Não adicione entrada de URL livre à operação do piloto.
