# @farol/tsconfig

Base de TypeScript compartilhada. Compatível com o TS 7 (V14): sem `baseUrl`,
resolução `bundler` e `types` explícito (cada pacote declara os seus).

```json
{
  "extends": "@farol/tsconfig/base.json",
  "compilerOptions": { "types": ["node"] }
}
```
