import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { openCapture } from "./publication";

test("publication settings select featured articles, fonts, and localized interface labels", async ({
  page,
}, info) => {
  for (const state of ["featured", "japanese"]) {
    await openCapture(page, info, state);
    const japanese = state === "japanese";
    await expect(page.locator("html")).toHaveAttribute("lang", japanese ? "ja" : "en");
    if (japanese) {
      const date = page.getByRole("region", { name: "新着記事" }).locator("time").first();
      await expect(date).toHaveText("2025年3月1日");
    }
    await expect(
      page
        .getByRole("region", { name: japanese ? "注目の記事" : "Featured" })
        .getByRole("link", { name: "Reading room" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: japanese ? "新着記事" : "Latest posts" }),
    ).toBeVisible();
    await expect(page.locator("body")).toHaveCSS("font-family", /Noto Sans JP/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-family", /serif/);
  }
});

test("theme colors keep text, controls, and images distinct without filters", async ({ page }) => {
  const css = await readFile("theme/no-style-please-ghost/assets/css/style.css", "utf8");
  const rejected = [
    "color: red",
    "border: 1px solid #777",
    "background: linear-gradient(black,white)",
    "opacity: .8",
    "filter: invert(1)",
    "box-shadow: 0 1px black",
    "mix-blend-mode: multiply",
  ];
  const results = await page.evaluate(
    ({ css, rejected }) => {
      const probe = document.createElement("span");
      document.body.append(probe);
      function inspect(source: string) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(source);
        const findings: string[] = [];
        function walk(rules: CSSRuleList) {
          for (const rule of rules) {
            if (rule instanceof CSSGroupingRule) walk(rule.cssRules);
            if (!(rule instanceof CSSStyleRule)) continue;
            for (const property of rule.style) {
              const value = rule.style.getPropertyValue(property);
              if (
                /gradient\(/i.test(value) ||
                (/^(?:filter|backdrop-filter|box-shadow|text-shadow)$/.test(property) &&
                  value !== "none") ||
                (/blend-mode$/.test(property) && value !== "normal") ||
                (property === "opacity" && Number(value) !== 1)
              ) {
                findings.push(`${property}: ${value}`);
              }
              const tokens =
                value.match(
                  /(?:rgba?|hsla?|hwb|oklch|lab|lch|color)\([^)]*\)|#[\da-f]+\b|[\w-]+/gi,
                ) ?? [];
              for (const token of tokens) {
                if (
                  /^(?:inherit|initial|unset|revert|currentcolor)$/i.test(token) ||
                  !CSS.supports("color", token)
                )
                  continue;
                probe.style.color = token;
                if (!["rgb(0, 0, 0)", "rgb(255, 255, 255)"].includes(getComputedStyle(probe).color))
                  findings.push(token);
              }
            }
          }
        }
        walk(sheet.cssRules);
        return findings;
      }
      return [
        inspect(css),
        inspect("p {color: black; background: white}"),
        ...rejected.map((value) => inspect(`p {${value}}`)),
      ];
    },
    { css, rejected },
  );
  expect(results[0]).toEqual([]);
  expect(results[1]).toEqual([]);
  for (const result of results.slice(2)) expect(result.length).toBeGreaterThan(0);
});
