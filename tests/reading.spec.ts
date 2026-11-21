import { expect, test } from "@playwright/test";
import { openCapture, site } from "./publication";

test("the dated archive leads to the article, tag, author, and older issues", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Field Notes");
  const latest = page.getByRole("region", { name: "Latest posts" });
  const first = latest.getByRole("listitem").first();
  await expect(first.locator("time")).toHaveAttribute("datetime", "2025-03-01");
  await first.getByRole("link", { name: "Reading room" }).click();
  await expect(page.getByRole("article").getByRole("heading", { level: 1 })).toHaveText(
    "Reading room",
  );
  await expect(page.getByRole("article")).toContainText("Light reached the library.");
  await page.getByRole("article").getByRole("link", { name: "Books", exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Books");
  await page.getByRole("main").getByRole("link", { name: "Reading room" }).click();
  await page.getByRole("article").getByRole("link", { name: "River Avery" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("River Avery");
  await page.getByRole("link", { name: "Older posts" }).click();
  await expect(page).toHaveURL(/\/journal\/author\/river\/page\/2\//);
  await page.getByRole("link", { name: "Newer posts" }).click();
  await expect(page).toHaveURL(/\/journal\/author\/river\/$/);
  await page.goto("./page/2/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Latest posts");
  await expect(page.getByRole("link", { name: "Older posts" })).toHaveCount(0);
  await page.getByRole("link", { name: "Newer posts" }).click();
  await expect(page).toHaveURL(site);
});

test("keyboard readers can skip site navigation on every route", async ({ page }) => {
  for (const path of ["./", "reading-room/", "about/", "tag/books/", "author/river/", "missing/"]) {
    await page.goto(path);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
    await expect(
      page
        .getByRole("navigation", { name: "Menu", exact: true })
        .getByRole("link", { name: "About" }),
    ).toBeVisible();
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: "Colophon" }),
    ).toBeVisible();
  }
});

test("standalone pages respect the editor title toggle and identify the current link", async ({
  page,
}) => {
  await page.goto("about/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("About the library");
  await expect(page.getByRole("main")).toContainText("Open on Sundays.");
  await expect(
    page
      .getByRole("navigation", { name: "Menu", exact: true })
      .getByRole("link", { name: "About" }),
  ).toHaveAttribute("aria-current", "page");
  await page.goto("quiet/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Inside the library");
  await expect(page.getByText("Hidden page title", { exact: true })).toHaveCount(0);
});

test("a missing address offers a working route back to the publication", async ({ page }) => {
  expect((await page.goto("not-on-the-shelf/"))?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Page not found");
  await expect(page.getByRole("main").locator("pre")).toHaveCount(0);
  await page.getByRole("main").getByRole("link", { name: "Go to the front page" }).click();
  await expect(page).toHaveURL(site);
});

test("restricted articles have one access prompt and keep the private body out of the response", async ({
  page,
}) => {
  await page.goto("members-notebook/");
  const article = page.getByRole("article");
  await expect(article).toContainText("This post is for subscribers only");
  await expect(article.locator('a[href="#/portal/signup"]')).toHaveCount(1);
  await expect(article.locator('a[href="#/portal/signin"]')).toHaveCount(1);
  expect(await page.content()).not.toContain("Unpublished reading notes behind the gate.");
});

test("empty and private publications only offer available actions", async ({ page }, info) => {
  for (const state of ["empty", "invite", "closed"]) {
    await openCapture(page, info, state);
    await expect(page.getByRole("main")).toContainText("No posts yet.");
    await expect(page.getByRole("navigation", { name: "Pagination" })).toHaveCount(0);
    await expect(page.locator('a[href="#/portal/signup"]')).toHaveCount(state === "empty" ? 1 : 0);
    await expect(page.locator('a[href="#/portal/signin"]')).toHaveCount(state === "closed" ? 0 : 1);
    await expect(page.locator("[data-members-form]")).toHaveCount(0);
  }
});

test("reading typography reflows at narrow widths and follows the system palette", async ({
  page,
}) => {
  await page.goto("reading-room/");
  const article = page.getByRole("article");
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      scheme === "light" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)",
    );
    await expect(page.locator("body")).toHaveCSS("filter", "none");
    const paragraph = article.getByText("Light reached the library.", { exact: true });
    await expect(paragraph).toHaveCSS("font-size", "18px");
    await expect(paragraph).toHaveCSS("line-height", "31.5px");
  }
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  }
  await page.setViewportSize({ width: 320, height: 800 });
  await page.evaluate(() => {
    const stylesheet = document.createElement("style");
    stylesheet.textContent = "html {font-size:200%} * {letter-spacing:.12em;word-spacing:.16em}";
    document.head.append(stylesheet);
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
