import { join } from "node:path";
import { expect, type Route, test } from "@playwright/test";
import portal from "@tryghost/portal/package.json";
import search from "@tryghost/sodo-search/package.json";
import { site } from "./publication";

test.use({ javaScriptEnabled: true });

test.beforeEach(async ({ page }) => {
  const assets = new Map<string, string>();
  for (const [pkg, files] of [
    [portal, ["portal.min.js", "portal.css"]],
    [search, ["sodo-search.min.js", "main.css"]],
  ] as const) {
    const name = pkg.name.split("/")[1];
    const version = pkg.version.split(".").slice(0, 2).join(".");
    for (const file of files) {
      assets.set(
        `https://cdn.jsdelivr.net/ghost/${name}@~${version}/umd/${file}`,
        join("node_modules", pkg.name, "umd", file),
      );
    }
  }
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (new URL(url).origin === new URL(site).origin) return route.continue();
    const path = assets.get(url);
    if (path) return route.fulfill({ path, headers: { "Access-Control-Allow-Origin": "*" } });
    return route.abort();
  });
});

test("Ghost search finds and opens a published article by keyboard", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Search", exact: true }).press("Enter");
  const searchFrame = page.frameLocator('iframe[title="Search posts, tags and authors"]');
  const input = searchFrame.getByRole("combobox");
  await expect(input).toBeFocused();
  await input.fill("Reading room");
  const result = searchFrame.getByRole("option", { name: /Reading room/ });
  await expect(result).toBeVisible();
  await input.press("Enter");
  await expect(page).toHaveURL(new URL("reading-room/", site).href);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reading room");
});

for (const [label, route] of [
  ["Sign in", "signin"],
  ["Subscribe", "signup"],
]) {
  test(`the ${label} link opens the Ghost Portal form even during initialization`, async ({
    page,
  }) => {
    let pending: Route | undefined;
    await page.route(/\/members\/api\/member\/?(?:\?|$)/, (route) => {
      pending = route;
    });
    await page.goto("./", { waitUntil: "domcontentloaded" });
    await expect.poll(() => Boolean(pending)).toBe(true);
    const link = page.getByRole("link", { name: label, exact: true });
    await expect(link).toHaveAttribute("href", `#/portal/${route}`);
    await link.press("Enter");
    await pending?.continue();
    const modal = page.frameLocator('iframe[title="portal-popup"]');
    await expect(modal.locator('input[type="email"]')).toBeVisible();
    await expect(modal.locator('button[type="submit"]')).toHaveAccessibleName(/Continue|Sign up/);
    await expect(
      modal.getByRole("button", { name: route === "signin" ? "Sign up" : "Sign in", exact: true }),
    ).toBeVisible();
    await modal.locator('input[type="email"]').press("Escape");
    await expect(page.locator('iframe[title="portal-popup"]')).toBeHidden();
  });
}
