import { expect, test } from "@playwright/test";

test("editor images keep their captions and width settings while wide tables scroll within the article", async ({
  page,
}) => {
  await page.goto("plates/");
  const article = page.getByRole("article");
  await expect(article.locator("figcaption")).toHaveText([
    "A regular plate",
    "A wide plate",
    "A full plate",
  ]);
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const figures = await article
      .getByRole("figure")
      .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().width));
    const [regular, wide, full] = figures;
    expect(full).toBe(width);
    expect(wide).toBeLessThan(full);
    if (width === 1280) expect(regular).toBeLessThan(wide);
    for (const size of ["regular", "wide", "full"]) {
      await expect(article.getByRole("img", { name: `The ${size} plate` })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  }
  const lastColumn = article.getByRole("columnheader", { name: "Shelf 16" });
  const rightEdge = () =>
    lastColumn.evaluate((cell) => {
      const label = document.createRange();
      label.selectNodeContents(cell);
      return label.getBoundingClientRect().right;
    });
  expect(await rightEdge()).toBeGreaterThan(320);
  const region = article.getByRole("region", { name: "Plate sizes" });
  await expect
    .poll(
      async () => {
        await page.keyboard.press("Tab");
        return region.evaluate((element) => element === document.activeElement);
      },
      { intervals: [25] },
    )
    .toBe(true);
  await expect
    .poll(
      async () => {
        await page.keyboard.press("ArrowRight", { delay: 100 });
        return rightEdge();
      },
      { intervals: [50] },
    )
    .toBeLessThanOrEqual(320);
});

test("long code lines remain readable without horizontal scrolling at 320 CSS pixels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("reading-room/");
  const code = page.getByRole("article").locator("pre");
  expect(await code.innerText()).toContain("long-code-line".repeat(30));
  expect(await code.evaluate((block) => block.scrollWidth - block.clientWidth)).toBe(0);
});
