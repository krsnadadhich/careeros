import { defineConfig } from "@playwright/test";
import os from "node:os";
import path from "node:path";

export default defineConfig({
  testDir: "./tests/e2e",
  // E:\ is exFAT (no NTFS reparse-point/ACL support), which Playwright's
  // artifact handling can choke on — write test artifacts to an NTFS temp
  // dir instead.
  outputDir: path.join(os.tmpdir(), "careeros-playwright-results"),
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/sign-in",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
