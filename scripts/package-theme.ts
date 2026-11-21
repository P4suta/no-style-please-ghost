import {
  globSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, posix, resolve } from "node:path";
import { type Zippable, zipSync } from "fflate";
import Handlebars from "handlebars";
import manifest from "../theme/no-style-please-ghost/package.json";

const source = join("theme", manifest.name);
const output = resolve(process.argv[2] ?? "dist");
const filename = `${manifest.name}-${manifest.version}.zip`;
const entries: Zippable = {};
const required = new Set([
  "package.json",
  "default.hbs",
  "home.hbs",
  "index.hbs",
  "post.hbs",
  "page.hbs",
  "tag.hbs",
  "author.hbs",
  "error.hbs",
  "error-404.hbs",
  "assets/css/style.css",
  "LICENSE",
]);
const patterns = [
  "*.hbs",
  "partials/**/*.hbs",
  "locales/*.json",
  "assets/css/*.css",
  "assets/fonts/*",
  "LICENSE",
  "README.md",
  "robots.txt",
  "package.json",
];
const references = new Handlebars.Visitor();
references.PartialStatement = ({ name }) => {
  if ("original" in name && !name.original.startsWith("@")) {
    required.add(`partials/${name.original}.hbs`);
  }
};
for (const name of globSync(patterns, { cwd: source }).sort()) {
  const path = name.replaceAll("\\", "/");
  const bytes = readFileSync(join(source, path));
  if (path.endsWith(".hbs")) references.accept(Handlebars.parse(bytes.toString()));
  if (path.endsWith(".css")) {
    for (const [, font] of bytes.toString().matchAll(/url\(["']?([^"')]+\.woff2)["']?\)/g)) {
      required.add(posix.join(posix.dirname(path), font));
    }
  }
  if (path.endsWith(".woff2")) required.add(path.replace(/(?:\.latin)?\.woff2$/, "-OFL.txt"));
  if (bytes.length === 0) throw new Error(`Empty theme file: ${path}`);
  entries[path] = path.endsWith(".woff2") ? [bytes, { level: 0 }] : bytes;
}
for (const path of required) {
  if (!Object.hasOwn(entries, path)) throw new Error(`Missing theme file: ${path}`);
}
mkdirSync(output, { recursive: true });
const stage = mkdtempSync(join(output, ".theme-"));
try {
  writeFileSync(join(stage, filename), zipSync(entries, { mtime: new Date(1980, 0, 1) }));
  renameSync(join(stage, filename), join(output, filename));
  console.log(join(output, filename));
} finally {
  rmSync(stage, { recursive: true, force: true });
}
