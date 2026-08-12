import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    pool: "threads",
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      // server-only throws in non-React-Server contexts; stub it out for Vitest.
      "server-only": fileURLToPath(
        new URL("./src/test/__mocks__/server-only.ts", import.meta.url),
      ),
    },
  },
});
