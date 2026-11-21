import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { test } from "node:test";
import { theme } from "./publication";

const root = `theme/${theme}`;
const usage = new Map<string, Set<string>>();
for (const file of globSync("**/*.hbs", { cwd: root })) {
  const template = readFileSync(join(root, file), "utf8");
  for (const [, phrase] of template.matchAll(/[({]\s*t\s+"([^"]+)"/g)) {
    const paths = usage.get(phrase) ?? new Set<string>();
    paths.add(file.replaceAll("\\", "/"));
    usage.set(phrase, paths);
  }
}
const locales = globSync("locales/*.json", { cwd: root }).filter(
  (file) => basename(file) !== "context.json",
);

test("the distribution retains every supported translation and identifies the templates using each phrase", () => {
  const supported =
    "ar de de-CH en es fr ga gd hi it ja ko nl pt pt-BR ru sv tr uk zh zh-Hant".split(" ");
  assert.deepEqual(locales.map((file) => basename(file, ".json")).sort(), supported.sort());
  const context = JSON.parse(readFileSync(join(root, "locales/context.json"), "utf8"));
  assert.deepEqual(Object.keys(context).sort(), [...usage.keys()].sort());
  for (const [phrase, paths] of usage) {
    assert.deepEqual(context[phrase].split(", ").sort(), [...paths].sort(), phrase);
  }
});

test("translations cover the rendered labels and preserve Ghost interpolation values", () => {
  const tokens = (text: string) => (text.match(/\{[^{}]+\}|%/g) ?? []).sort();
  for (const file of locales) {
    const translations = JSON.parse(readFileSync(join(root, file), "utf8"));
    assert.deepEqual(Object.keys(translations).sort(), [...usage.keys()].sort(), file);
    for (const phrase of usage.keys()) {
      const translated = translations[phrase];
      assert.equal(typeof translated, "string", file);
      if (basename(file) === "en.json" && translated === "") continue;
      assert.ok(translated.trim(), `${file}: ${phrase}`);
      assert.deepEqual(tokens(translated), tokens(phrase), `${file}: ${phrase}`);
    }
  }
});
