import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname) },
      { find: "@/app", replacement: path.resolve(__dirname, "app") },
      { find: "@/app", replacement: path.resolve(__dirname, "src/app") },

      { find: "@/components", replacement: path.resolve(__dirname, "components") },
      { find: "@/components", replacement: path.resolve(__dirname, "src/components") },

      { find: "@/lib", replacement: path.resolve(__dirname, "src/lib") },
      { find: "@/lib", replacement: path.resolve(__dirname, "lib") },

      { find: "@/state", replacement: path.resolve(__dirname, "src/state") },
      { find: "@/state", replacement: path.resolve(__dirname, "state") },

      { find: "@/plugins", replacement: path.resolve(__dirname, "src/plugins") },
      { find: "@/plugins", replacement: path.resolve(__dirname, "plugins") }
    ]
  }
});
