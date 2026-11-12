# F0-08 — checklist humano de acessibilidade

Não executado. Preencher somente após avaliação humana no aparelho indicado.
Testes automatizados não substituem TalkBack, VoiceOver nem inspeção visual.

## Ambiente

- Build/commit: _______________________
- Variante: _______________________
- Android/aparelho: _______________________
- iOS/aparelho: _______________________
- Pessoa responsável/data: _______________________

## TalkBack (Android)

- [ ] Percorrer a demo e ouvir os rótulos de Button, Toggle, ListSection e Sheet.
- [ ] Alternar Toggle e ouvir estado ligado/desligado.
- [ ] Abrir/fechar Sheet; verificar foco inicial, filhos navegáveis e retorno ao botão.
- [ ] Conferir alvos de toque, ordem de leitura e controle desabilitado.
- Evidência (uiautomator, gravação/prints): _______________________
- Assinatura/data: _______________________

## VoiceOver (iOS)

- [ ] Percorrer a demo e ouvir os rótulos dos quatro componentes.
- [ ] Alternar Toggle e ouvir estado; verificar ordem e ações.
- [ ] Abrir/fechar Sheet, navegar pelos filhos e verificar retorno do foco.
- [ ] Conferir alvos de toque e controle desabilitado.
- Evidência (gravação/prints): _______________________
- Assinatura/data: _______________________

## Fonte máxima

- [ ] Android: registrar valor original, aplicar `adb shell settings put system font_scale 2.0`.
- [ ] Android: capturar a demo e o Sheet sem textos cortados, sobrepostos ou inacessíveis.
- [ ] Android: restaurar o valor original de `font_scale` ao terminar.
- [ ] iOS: usar maior tamanho de acessibilidade e repetir a inspeção visual.
- Evidência (prints e escala original/restaurada): _______________________
- Assinatura/data: _______________________
