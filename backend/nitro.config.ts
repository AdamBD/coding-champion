import { defineNitroConfig } from "nitropack/config"

// https://nitro.build/config
export default defineNitroConfig({
  compatibilityDate: "latest",
  srcDir: "server",
  imports: false,
  // Exclude test files and configs from being processed
  ignore: [
    "**/*.test.ts",
    "**/*.spec.ts",
    "vitest.config.ts",
    "**/test/**"
  ]
});
