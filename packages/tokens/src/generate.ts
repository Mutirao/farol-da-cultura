import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { renderCss, renderNative } from "./render.ts";
import { parseTokens } from "./schema.ts";

const root = new URL("../", import.meta.url);
const doc = parseTokens(
  JSON.parse(readFileSync(new URL("tokens.json", root), "utf8")),
);

mkdirSync(new URL("dist/", root), { recursive: true });
writeFileSync(new URL("dist/theme.css", root), renderCss(doc));
writeFileSync(new URL("dist/native.ts", root), renderNative(doc));
console.log("@farol/tokens: dist/theme.css e dist/native.ts gerados");
