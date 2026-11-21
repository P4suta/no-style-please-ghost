import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  cpSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { test } from "node:test";
import { unzipSync } from "fflate";
import { archive, theme } from "./publication";

test("the upload command builds a repeatable ZIP containing the runtime theme and its licenses", (t) => {
  const output = mkdtempSync(join(tmpdir(), "ghost-theme-"));
  t.after(() => rmSync(output, { recursive: true, force: true }));
  const build = () => {
    execFileSync("bun", ["run", "zip", output], { stdio: "pipe" });
    return readFileSync(join(output, basename(archive)));
  };
  const first = build();
  assert.deepEqual(build(), first);
  const files = unzipSync(first);
  for (const path of [
    "default.hbs",
    "index.hbs",
    "post.hbs",
    "partials/navigation.hbs",
    "locales/ja.json",
    "assets/css/style.css",
    "assets/fonts/MPLUS1Code.latin.woff2",
    "assets/fonts/NotoSansJP.latin.woff2",
    "assets/fonts/NotoSerifJP.latin.woff2",
    "LICENSE",
  ]) {
    assert.ok(files[path]?.length, path);
  }
  for (const path of Object.keys(files)) {
    assert.doesNotMatch(path, /(^|\/)(src|node_modules|\.git|\.DS_Store|tests)(\/|$)/);
    if (path.endsWith(".woff2")) assert.ok(files[path.replace(/(?:\.latin)?\.woff2$/, "-OFL.txt")]);
  }
  assert.equal(JSON.parse(new TextDecoder().decode(files["package.json"])).name, theme);
  assert.deepEqual(
    Buffer.from(files["assets/css/style.css"]),
    readFileSync(`theme/${theme}/assets/css/style.css`),
  );
});

for (const missing of [
  "post.hbs",
  "partials/reading-content.hbs",
  "partials/components/feature-image.hbs",
  "assets/css/style.css",
  "assets/fonts/NotoSansJP.woff2",
  "assets/fonts/NotoSansJP.latin.woff2",
  "assets/fonts/NotoSansJP-OFL.txt",
]) {
  test(`a missing ${missing} stops packaging and preserves the previous upload`, (t) => {
    const root = mkdtempSync(join(tmpdir(), "ghost-package-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const source = join(root, "theme", theme);
    const output = join(root, "dist");
    const filename = basename(archive);
    cpSync(`theme/${theme}`, source, { recursive: true });
    appendFileSync(join(source, "post.hbs"), "\n{{!-- Example markup: {{> sample}} --}}\n");
    const script = resolve("scripts/package-theme.ts");
    const build = () => execFileSync("bun", [script, output], { cwd: root, stdio: "pipe" });
    build();
    const original = readFileSync(join(output, filename));
    const path = join(source, missing);
    renameSync(path, join(root, "withheld"));
    assert.throws(build, (error: Error) => error.message.includes(missing));
    assert.deepEqual(readdirSync(output), [filename]);
    assert.deepEqual(readFileSync(join(output, filename)), original);
    renameSync(join(root, "withheld"), path);
    build();
    assert.deepEqual(readFileSync(join(output, filename)), original);
  });
}
