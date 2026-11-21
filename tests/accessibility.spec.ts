import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { site } from "./publication";

test.use({ javaScriptEnabled: true });

for (const scheme of ["light", "dark"] as const) {
  test(`published pages pass automated WCAG A and AA checks in ${scheme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const origin = new URL(site).origin;
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
    );
    for (const path of [
      "./",
      "reading-room/",
      "about/",
      "quiet/",
      "plates/",
      "tag/books/",
      "author/river/",
      "patrons-notebook/",
      "missing/",
    ]) {
      await test.step(path, async () => {
        const response = await page.goto(path);
        expect(response?.status()).toBe(path === "missing/" ? 404 : 200);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
          .analyze();
        expect(
          results.violations.map(({ id, nodes }) => ({
            id,
            targets: nodes.map((node) => node.target),
          })),
        ).toEqual([]);
      });
    }
  });
}
