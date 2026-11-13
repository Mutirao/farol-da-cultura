import { defineConfig } from "vitest/config";

// Lógica pura e fronteira HTTP; os controles nativos continuam exigindo aparelho.
export default defineConfig({ test: { include: ["test/**/*.test.ts"] } });
