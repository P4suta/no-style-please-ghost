import { expect, test } from "@playwright/test";
import { openCapture, pageSize, site } from "./publication";

const notebooks = Array.from({ length: pageSize }, (_, index) => `notebook-${pageSize - index}/`);
for (const route of ["./", "tag/books/", "author/river/"]) {
  test(`the ${route} archive lists every matching article once in publication order`, async ({
    page,
  }) => {
    const expected =
      route === "tag/books/"
        ? ["reading-room/", ...notebooks]
        : [
            "reading-room/",
            "members-notebook/",
            ...notebooks,
            "patrons-notebook/",
            "bindery-ledger/",
          ];
    await page.goto(route);
    for (let offset = 0; offset < expected.length; offset += pageSize) {
      const links = page.getByRole("main").getByRole("list").getByRole("link");
      const entries = expected
        .slice(offset, offset + pageSize)
        .map((slug) => new URL(slug, site).href);
      await expect
        .poll(() =>
          links.evaluateAll((items) => items.map((item) => (item as HTMLAnchorElement).href)),
        )
        .toEqual(entries);
      const older = page.getByRole("link", { name: "Older posts" });
      if (offset + pageSize < expected.length) {
        await older.click();
        await expect(page).toHaveURL(new URL("page/2/", new URL(route, site)).href);
      } else {
        await expect(older).toHaveCount(0);
      }
    }
  });
}

test("featured and related lists respect visibility, tags, and the current article", async ({
  page,
}, info) => {
  await openCapture(page, info, "featured");
  await expect(page.getByRole("region", { name: "Featured" }).getByRole("link")).toHaveText([
    "Reading room →",
  ]);
  await page.goto("reading-room/");
  const related = page.getByRole("region", { name: "Read next" }).getByRole("link");
  expect(
    await related.evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href)),
  ).toEqual(notebooks.slice(0, 3).map((slug) => new URL(slug, site).href));
});
