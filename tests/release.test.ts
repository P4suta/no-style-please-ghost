import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { strToU8, zipSync } from "fflate";
import { releaseInventory } from "../scripts/release-archive";

const source = "abcde12345".repeat(4);
const identity = { id: 71, draft: true, tag_name: "v0.1.0", target_commitish: source };
const expected = [
  { name: "theme.zip", digest: `sha256:${"a".repeat(64)}` },
  { name: "SHA256SUMS", digest: `sha256:${"b".repeat(64)}` },
];
const runFilter = (filter: string, args: string[], value: unknown) =>
  spawnSync("jq", ["-r", ...args, "-f", `scripts/${filter}.jq`], {
    input: JSON.stringify(value),
    encoding: "utf8",
  });
const draft = (value: unknown, commit = source, id = "71") =>
  runFilter("release-draft", ["--arg", "source", commit, "--arg", "id", id], value);
const remaining = (assets: unknown[], mode = "missing") =>
  runFilter(
    "release-assets",
    ["--argjson", "expected", JSON.stringify(expected), "--arg", "mode", mode],
    { assets },
  );
const uploaded = expected.map((asset) => ({ ...asset, state: "uploaded" }));

test("only the requested draft for the exact source and stable version can be built", () => {
  for (const tag_name of ["v0.1.0", "v1.0.0", "v12.20.37"]) {
    const result = draft({ ...identity, tag_name });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), tag_name);
  }
  for (const patch of [
    { id: 72 },
    { draft: false },
    { target_commitish: "f".repeat(40) },
    ...["0.1.0", "v01.2.3", "v1.02.3", "v1.2.03", "v1.2.3-rc.1", "v1.2.3/extra", "v1.2.3\n"].map(
      (tag_name) => ({ tag_name }),
    ),
  ]) {
    assert.notEqual(draft({ ...identity, ...patch }).status, 0, JSON.stringify(patch));
  }
  assert.notEqual(draft({ ...identity, target_commitish: "main" }, "main").status, 0);
});

test("a retry uploads only missing files with matching existing digests", () => {
  for (const [existing, names] of [
    [[], ["theme.zip", "SHA256SUMS"]],
    [[uploaded[0]], ["SHA256SUMS"]],
    [uploaded, []],
  ] as const) {
    const result = remaining([...existing]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.stdout.trim().split("\n").filter(Boolean), names);
  }
  for (const invalid of [
    { ...uploaded[1], digest: uploaded[0].digest },
    { ...uploaded[1], name: "other.zip" },
    { ...uploaded[1], state: "starter" },
    uploaded[0],
  ]) {
    assert.notEqual(remaining([uploaded[0], invalid]).status, 0, JSON.stringify(invalid));
  }
});

test("cleanup selects only an expected empty starter and rejects every conflicting asset", () => {
  const starter = { id: 83, name: "SHA256SUMS", state: "starter", size: 0, digest: null };
  const cleanup = (assets: unknown[]) => remaining(assets, "cleanup");
  const recover = cleanup([uploaded[0], starter]);
  assert.equal(recover.status, 0, recover.stderr);
  assert.equal(recover.stdout.trim(), "83");
  const emptyDigest = `sha256:${createHash("sha256").update("").digest("hex")}`;
  assert.equal(cleanup([{ ...starter, digest: emptyDigest }]).stdout.trim(), "83");
  assert.equal(cleanup(uploaded).stdout.trim(), "");
  assert.notEqual(remaining([uploaded[0], starter]).status, 0);
  for (const patch of [
    { size: 1 },
    { size: null },
    { id: 0 },
    { id: 2.5 },
    { id: "83" },
    { state: "uploaded" },
    { name: "other.zip" },
    { digest: uploaded[0].digest },
  ]) {
    const refused = cleanup([uploaded[0], { ...starter, ...patch }]);
    assert.notEqual(refused.status, 0, JSON.stringify(patch));
    assert.equal(refused.stdout, "");
  }
  assert.notEqual(cleanup([starter, { ...uploaded[0], digest: "different" }]).status, 0);
  assert.notEqual(cleanup([starter, { ...starter, id: 84 }]).status, 0);
});

const font = strToU8("fixture font");
const build = (version = "0.1.0", name = "no-style-please-ghost", license = true) =>
  zipSync({
    "package.json": strToU8(JSON.stringify({ name, version, license: "MIT" })),
    "assets/fonts/NotoSansJP.woff2": font,
    "assets/fonts/NotoSansJP.latin.woff2": font,
    ...(license
      ? { "assets/fonts/NotoSansJP-OFL.txt": strToU8("SIL OPEN FONT LICENSE Version 1.1") }
      : {}),
  });
test("the release inventory names the theme and hashes every shipped font from the ZIP", () => {
  const zip = build();
  const sbom = releaseInventory(zip, "v0.1.0");
  assert.equal(sbom.bomFormat, "CycloneDX");
  assert.equal(sbom.metadata.component.name, "no-style-please-ghost");
  assert.equal(sbom.metadata.component.version, "0.1.0");
  assert.deepEqual(sbom.metadata.component.hashes, [
    { alg: "SHA-256", content: createHash("sha256").update(zip).digest("hex") },
  ]);
  assert.deepEqual(sbom.components.map((component) => component.name).sort(), [
    "assets/fonts/NotoSansJP.latin.woff2",
    "assets/fonts/NotoSansJP.woff2",
  ]);
  for (const component of sbom.components) {
    assert.deepEqual(component.licenses, [{ license: { id: "OFL-1.1" } }]);
    assert.deepEqual(component.hashes, [
      { alg: "SHA-256", content: createHash("sha256").update(font).digest("hex") },
    ]);
  }
  assert.throws(() => releaseInventory(build("0.2.0"), "v0.1.0"), /version/i);
  assert.throws(() => releaseInventory(build("0.1.0", "another-theme"), "v0.1.0"), /name/i);
  assert.throws(
    () => releaseInventory(build("0.1.0", "no-style-please-ghost", false), "v0.1.0"),
    /license/i,
  );
});

test("the proposal tool tracks the public theme version across root build changes", () => {
  const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const config = read("release-please-config.json");
  assert.equal(config["initial-version"], "0.1.0");
  assert.equal(config.draft, true);
  assert.equal(config["force-tag-creation"], true);
  assert.deepEqual(config.packages["."]["extra-files"], [
    { type: "json", path: "theme/no-style-please-ghost/package.json", jsonpath: "$.version" },
  ]);
  const manifest = read(".release-please-manifest.json");
  const version = read("theme/no-style-please-ghost/package.json").version;
  assert.equal(readFileSync("version.txt", "utf8").trim(), version);
  if (manifest["."] !== undefined) assert.equal(manifest["."], version);
});
