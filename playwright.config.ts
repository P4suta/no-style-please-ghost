import { defineConfig } from "@playwright/test";
import { site } from "./tests/publication";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/setup.ts",
  workers: 1,
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  use: { baseURL: site, javaScriptEnabled: false },
  webServer: {
    command: "sh tests/start-ghost.sh",
    stderr: "ignore",
    url: `${site}ghost/api/admin/authentication/setup/`,
    timeout: 360_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 20_000 },
  },
});
