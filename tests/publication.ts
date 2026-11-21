import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { BrowserContext, Page, TestInfo } from "@playwright/test";
import manifest from "../theme/no-style-please-ghost/package.json";

export const site = `http://127.0.0.1:${process.env.GHOST_TEST_PORT ?? "2468"}/journal/`;
export const theme = manifest.name;
export const archive = `dist/${theme}-${manifest.version}.zip`;
export const pageSize = manifest.config.posts_per_page;
export const archiveFile = () => ({
  name: `${theme}.zip`,
  mimeType: "application/zip",
  buffer: readFileSync(archive),
});

export async function signInReader(context: BrowserContext, level: "free" | "complimentary") {
  const cookies = process.env[`GHOST_READER_${level}`];
  if (!cookies) throw new Error(`Missing ${level} reader session`);
  await context.addCookies(JSON.parse(cookies));
}

export async function openCapture(page: Page, info: TestInfo, name: string, path = "./") {
  const url = new URL(path, site).href;
  const body = await readFile(join(info.project.outputDir, `${name}.html`), "utf8");
  await page.route(url, (route) => route.fulfill({ contentType: "text/html", body }), { times: 1 });
  await page.goto(url);
}
