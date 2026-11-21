import { expect, type Response, test } from "@playwright/test";
import { openCapture, site } from "./publication";

for (const [family, stem] of [
  ["M PLUS 1 Code", "MPLUS1Code"],
  ["Noto Sans JP", "NotoSansJP"],
  ["Noto Serif JP", "NotoSerifJP"],
]) {
  test(`Latin text downloads under 100 KiB with ${family} and Japanese retains the full font`, async ({
    page,
  }, info) => {
    const fonts: Response[] = [];
    page.on("response", (response) => {
      if (response.url().includes(`/assets/fonts/${stem}`)) fonts.push(response);
    });
    await openCapture(page, info, "empty");
    await page.evaluate((family) => {
      document.body.dataset.bodyFont = family;
    }, family);
    expect(
      await page.locator("body").evaluate((body) => getComputedStyle(body).fontFamily),
    ).toContain(family);
    await expect.poll(() => fonts.length).toBe(1);
    expect(fonts[0].ok()).toBe(true);
    expect((await fonts[0].body()).byteLength).toBeLessThan(100 * 1024);

    await page.evaluate(() => {
      const sample = document.createElement("p");
      sample.textContent = "漢字とかな";
      document.body.append(sample);
    });
    await expect
      .poll(() => fonts.map((response) => new URL(response.url()).pathname))
      .toContain(new URL(`assets/fonts/${stem}.woff2`, site).pathname);
    expect(fonts).toHaveLength(2);
    expect(fonts.every((response) => response.ok())).toBe(true);
  });
}

test("a delayed portrait cover keeps the article text in place and displays the whole image", async ({
  page,
}) => {
  let releaseImage = () => {};
  const delayed = new Promise<void>((resolve) => {
    releaseImage = resolve;
  });
  await page.route("**/content/images/**", async (route) => {
    await delayed;
    await route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="640"></svg>',
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const text = page.getByText("Light reached the library.", { exact: true });
  const position = () => text.evaluate((element) => element.getBoundingClientRect().top);
  try {
    await page.goto("reading-room/", { waitUntil: "domcontentloaded" });
    await expect
      .poll(() =>
        text.evaluate((element) => {
          element.getBoundingClientRect();
          return document.fonts.status;
        }),
      )
      .toBe("loaded");
    const before = await position();
    releaseImage();
    await page.waitForLoadState("load");
    expect(Math.abs((await position()) - before)).toBeLessThanOrEqual(1);
    const cover = page.getByRole("img", { name: "Light through a library window" });
    await expect(cover).toHaveCSS("object-fit", "contain");
    const ratio = await cover.evaluate(
      (image: HTMLImageElement) => image.naturalWidth / image.naturalHeight,
    );
    expect(ratio).toBeCloseTo(0.5, 2);
  } finally {
    releaseImage();
  }
});

test("the masthead reserves the logo space and requests a rendition suited to its display size", async ({
  page,
}) => {
  await page.goto("./");
  const logo = page.locator(".masthead-logo");
  const source = await logo.evaluate((image: HTMLImageElement) => image.currentSrc);
  expect(new URL(source).pathname).toMatch(/\/content\/images\/size\/w(?:320|600)\//);
  expect(await logo.getAttribute("width")).toMatch(/^[1-9]\d*$/);
  expect(await logo.getAttribute("height")).toMatch(/^[1-9]\d*$/);
  await expect(logo).toHaveCSS("object-fit", "contain");
});

test("the browser icon resolves under the publication path with and without a custom icon", async ({
  page,
}, info) => {
  for (const state of ["empty", "publication-icon"]) {
    await openCapture(page, info, state);
    const icons = page.locator('head link[rel~="icon"]');
    await expect(icons).toHaveCount(1);
    const source = new URL((await icons.getAttribute("href")) ?? "", site);
    expect(source.href.startsWith(site)).toBe(true);
    expect(source.pathname.endsWith("/favicon.ico")).toBe(state === "empty");
    const image = await page.request.get(source.href);
    expect(image.ok()).toBe(true);
    expect(image.headers()["content-type"]).toMatch(/^image\//);
  }
});
