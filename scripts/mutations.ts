import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { XMLParser } from "fast-xml-parser";
import { type Mutation, mutations } from "./mutation-cases";

export function replaceOnce(source: string, before: string, after: string) {
  const parts = source.split(before);
  if (parts.length !== 2 || before === after)
    throw new Error(`Expected one mutation site: ${before}`);
  return parts.join(after);
}

interface TestCase {
  name: string;
  failure?: unknown;
  error?: unknown;
  skipped?: unknown;
}
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  isArray: (name) => ["testsuite", "testcase"].includes(name),
});

export function classifyMutation(xml: string, status: number | null, title: string) {
  if (!xml || status === null) return "inconclusive";
  const report = parser.parse(xml) as { testsuites?: { testsuite?: { testcase?: TestCase[] }[] } };
  const all = (report.testsuites?.testsuite ?? []).flatMap((suite) => suite.testcase ?? []);
  const target = all.filter((test) => test.name.includes(title) && test.skipped === undefined);
  if (target.length !== 1 || all.some((test) => test.error !== undefined)) return "inconclusive";
  const failure = target[0].failure;
  if (status === 0 && failure === undefined) return "survived";
  if (status !== 1 || failure === undefined) return "inconclusive";
  const detail = JSON.stringify(failure);
  if (/test timeout of \d+\s*ms exceeded|test timed out after/i.test(detail)) return "inconclusive";
  return /AssertionError|Assertion failed|expect\(.*?\)\.|ERR_ASSERTION/i.test(detail)
    ? "killed"
    : "inconclusive";
}

function runTests(work: string, target: Mutation[4], title: string) {
  const junit = join(work, "mutation.xml");
  rmSync(junit, { force: true });
  const env = {
    ...process.env,
    GHOST_TEST_PORT: process.env.GHOST_MUTATION_PORT ?? "2496",
    PLAYWRIGHT_JUNIT_OUTPUT_FILE: junit,
    FORCE_COLOR: "0",
  };
  const browser = target === "browser";
  if (browser) {
    const build = spawnSync("bun", ["run", "zip"], {
      cwd: work,
      env,
      stdio: "pipe",
      timeout: 60_000,
    });
    if (build.status !== 0) throw new Error(`Mutation fixture failed to build: ${build.stderr}`);
  }
  const pattern = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const args = browser
    ? [
        "x",
        "playwright",
        "test",
        "--project=chromium",
        "--workers=1",
        "--grep",
        pattern,
        "--reporter=junit",
      ]
    : [
        "test",
        `tests/${target}.test.ts`,
        "--timeout",
        "30000",
        "--reporter=junit",
        "--reporter-outfile",
        junit,
        "-t",
        pattern,
      ];
  const r = spawnSync("bun", args, {
    cwd: work,
    env,
    encoding: "utf8",
    timeout: browser ? 240_000 : 60_000,
  });
  const xml = existsSync(junit) ? readFileSync(junit, "utf8") : "";
  const verdict = classifyMutation(xml, r.status, title);
  if (verdict === "inconclusive")
    console.error(xml.slice(-4200), r.stderr?.slice(-1000), r.error?.message ?? "");
  return verdict;
}

function campaign(arg?: string) {
  if (arg && !["--list", "--unit", "--browser"].includes(arg))
    throw new Error(`Unknown mutation selection: ${arg}`);
  const selected = mutations.filter((m) =>
    arg === "--unit" ? m[4] !== "browser" : arg === "--browser" ? m[4] === "browser" : true,
  );
  for (const [name, file, before, after] of selected) {
    replaceOnce(readFileSync(file, "utf8"), before, after);
    if (arg === "--list") console.log(name);
  }
  if (arg === "--list") return;
  const work = mkdtempSync(join(tmpdir(), "ghost-theme-mutants-"));
  try {
    for (const file of [
      "scripts",
      "tests",
      "theme",
      "package.json",
      "playwright.config.ts",
      "version.txt",
      "release-please-config.json",
      ".release-please-manifest.json",
    ])
      cpSync(file, join(work, file), { recursive: true });
    symlinkSync(resolve("node_modules"), join(work, "node_modules"), "dir");
    const baselines = new Set<string>();
    const failed: string[] = [];
    for (const [name, file, before, after, target, title] of selected) {
      const key = `${target}/${title}`;
      if (!baselines.has(key)) {
        if (runTests(work, target, title) !== "survived")
          throw new Error(`Baseline failed: ${key}`);
        baselines.add(key);
      }
      const path = join(work, file);
      const original = readFileSync(path, "utf8");
      writeFileSync(path, replaceOnce(original, before, after));
      const verdict = runTests(work, target, title);
      writeFileSync(path, original);
      console.log(`${verdict}: ${name}`);
      if (verdict !== "killed") failed.push(`${verdict}: ${name}`);
    }
    console.log(`${selected.length - failed.length}/${selected.length} mutations detected`);
    if (failed.length) throw new Error(failed.join("\n"));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (import.meta.main) campaign(process.argv[2]);
