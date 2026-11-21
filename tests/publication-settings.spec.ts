import { expect, test } from "@playwright/test";
import { openCapture, signInReader, site } from "./publication";

test("the publication logo and article photograph retain their own roles and captions", async ({
  page,
}) => {
  await page.goto("./");
  const masthead = page.getByRole("main").locator("header").first();
  await expect(masthead.getByRole("heading", { level: 1 })).toHaveText("Field Notes");
  await expect(masthead.locator('img[alt=""]')).toBeVisible();
  await page.goto("reading-room/");
  const photo = page.getByRole("img", { name: "Light through a library window" });
  await expect(photo).toBeVisible();
  await expect(photo).toHaveAttribute("srcset", /960w/);
  await expect(page.locator("figcaption")).toHaveText("The east window");
  const source = await photo.evaluate((element: HTMLImageElement) => element.currentSrc);
  const resource = await page.request.get(source);
  expect(resource.status(), source).toBe(200);
  expect(resource.headers()["content-type"]).toMatch(/^image\//);
  await expect
    .poll(() =>
      photo.evaluate(
        (image: HTMLImageElement) =>
          image.complete && image.naturalWidth > 0 && image.naturalHeight > 0,
      ),
    )
    .toBe(true);
  const aspectRatio = await photo.evaluate((image) => {
    const { width, height } = image.getBoundingClientRect();
    return width / height;
  });
  expect(aspectRatio).toBeCloseTo(1.5, 2);
});

test("archive direction follows the language even when a region code contains ar", async ({
  page,
}, info) => {
  for (const [name, direction] of [
    ["arabic", "rtl"],
    ["spanish", "ltr"],
  ]) {
    await openCapture(page, info, name);
    await expect(page.locator("html")).toHaveCSS("direction", direction);
  }
});

test("a signed-in member can read the complete article and reach their account", async ({
  page,
  context,
}) => {
  await signInReader(context, "free");
  await page.goto("members-notebook/");
  await expect(page.getByRole("article")).toContainText(
    "Unpublished reading notes behind the gate.",
  );
  await expect(page.getByRole("article").locator('a[href^="#/portal/"]')).toHaveCount(0);
  await expect(page.locator('a[href="#/portal/account"]')).toHaveCount(1);
  await expect(page.locator('a[href="#/portal/signup"]')).toHaveCount(0);
});

test("script-free reading offers working navigation without inactive dialog controls", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator("[data-ghost-search]")).toBeHidden();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Subscribe" })).toHaveCount(0);
  const rss = page.getByRole("link", { name: "RSS" });
  await expect(rss).toBeVisible();
  const box = await rss.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(48);
  expect(box?.width).toBeGreaterThanOrEqual(48);
  const destination = await rss.getAttribute("href");
  expect(destination).toBe(new URL("rss/", site).href);
  expect((await page.request.get(destination ?? "")).status()).toBe(200);
});
