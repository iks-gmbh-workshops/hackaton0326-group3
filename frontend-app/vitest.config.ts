import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

const nextIntlMockPath = fileURLToPath(
  new URL("./src/test/mocks/next-intl.tsx", import.meta.url)
);

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      "next-intl": nextIntlMockPath,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      all: true,
      include: ["src/lib/**/*.{ts,tsx}", "src/app/api/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/**/*.test.{ts,tsx}", "src/lib/types.ts"],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
    },
  },
});
