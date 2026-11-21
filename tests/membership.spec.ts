import { expect, test } from "@playwright/test";
import { openCapture, signInReader } from "./publication";

for (const signedIn of [false, true]) {
  test(`a ${signedIn ? "free member" : "visitor"} can read the paid preview and reach the appropriate membership action`, async ({
    page,
    context,
  }) => {
    if (signedIn) await signInReader(context, "free");
    const response = await page.goto("patrons-notebook/");
    expect(response?.status()).toBe(200);
    expect(await response?.text()).not.toContain("The complete patrons’ edition.");
    const article = page.getByRole("article");
    await expect(article.getByText("A sample from the patrons’ edition.")).toBeVisible();
    await expect(article.getByRole("heading", { name: "Paid members only" })).toBeVisible();
    const prompt = article.getByRole("complementary");
    const actions = signedIn ? ["account/plans"] : ["signup", "signin"];
    await expect(prompt.locator("a")).toHaveCount(actions.length);
    for (const action of actions) {
      await expect(prompt.locator(`a[href="#/portal/${action}"]`)).toHaveCount(1);
    }
  });
}

test("archive links tell free and paid articles apart before readers open them", async ({
  page,
}) => {
  await page.goto("tag/patrons/");
  await expect(
    page.getByRole("main").getByRole("link", { name: "Patrons’ notebook Paid members only" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: `Bindery ledger Paid members only · ${process.env.GHOST_TEST_TIER}`,
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("./");
  await expect(
    page.getByRole("main").getByRole("link", { name: "Members’ notebook Members only" }),
  ).toBeVisible();
});

test("a free reader sees the required tier and an entitled reader can read both editions", async ({
  page,
  context,
}) => {
  await signInReader(context, "free");
  const response = await page.goto("bindery-ledger/");
  expect(await response?.text()).not.toContain("The binding inventory for this tier.");
  await expect(
    page.getByRole("heading", {
      name: `Paid members only · ${process.env.GHOST_TEST_TIER}`,
      exact: true,
    }),
  ).toBeVisible();
  await signInReader(context, "complimentary");
  for (const [slug, body] of [
    ["bindery-ledger/", "The binding inventory for this tier."],
    ["patrons-notebook/", "The complete patrons’ edition."],
  ]) {
    await page.goto(slug);
    await expect(page.getByRole("article").getByText(body)).toBeVisible();
    await expect(page.getByRole("article").locator('a[href^="#/portal/"]')).toHaveCount(0);
  }
});

test("related posts and translated archives identify the required membership tier", async ({
  page,
}, info) => {
  await page.goto("patrons-notebook/");
  await expect(
    page.getByRole("region", { name: "Read next" }).getByRole("link", {
      name: `Bindery ledger Paid members only · ${process.env.GHOST_TEST_TIER}`,
      exact: true,
    }),
  ).toBeVisible();
  await openCapture(page, info, "japanese-patrons", "tag/patrons/");
  await expect(
    page.getByRole("main").getByRole("link", {
      name: `Bindery ledger 有料会員限定 · ${process.env.GHOST_TEST_TIER}`,
      exact: true,
    }),
  ).toBeVisible();
});
