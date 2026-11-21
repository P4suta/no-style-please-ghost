type Target = "distribution" | "release" | "browser";
export type Mutation = readonly [
  name: string,
  file: string,
  before: string,
  after: string,
  target: Target,
  test: string,
];

const pack = "scripts/package-theme.ts";
const draft = "scripts/release-draft.jq";
const assets = "scripts/release-assets.jq";
const inventory = "scripts/release-archive.ts";
const theme = "theme/no-style-please-ghost/";
const identity = "only the requested draft";
const retry = "a retry uploads only missing files";
const cleanup = "cleanup selects only an expected empty starter";
const sbom = "the release inventory";
const zip = "the upload command builds a repeatable ZIP";

export const mutations: Mutation[] = [
  [
    "missing article template",
    pack,
    '"post.hbs",',
    '"index.hbs",',
    "distribution",
    "a missing post.hbs",
  ],
  [
    "missing nested partial",
    pack,
    'if ("original" in name &&',
    'if (false && "original" in name &&',
    "distribution",
    "a missing partials/reading-content.hbs",
  ],
  [
    "missing referenced font",
    pack,
    "required.add(posix.join(posix.dirname(path), font))",
    "void font",
    "distribution",
    "a missing assets/fonts/NotoSansJP.woff2",
  ],
  [
    "missing font license",
    pack,
    'required.add(path.replace(/(?:\\.latin)?\\.woff2$/, "-OFL.txt"))',
    "void path",
    "distribution",
    "a missing assets/fonts/NotoSansJP-OFL.txt",
  ],
  [
    "empty theme file",
    pack,
    "bytes.length === 0",
    "bytes.length < 0",
    "distribution",
    "an empty theme file",
  ],
  ["crawler rules omitted", pack, '"robots.txt",', '"absent.txt",', "distribution", zip],
  ["authoring files shipped", pack, '"*.hbs",', '"src/**/*.css", "*.hbs",', "distribution", zip],
  ["wrong draft id", draft, "(.id | tostring) == $id", "true", "release", identity],
  ["published target", draft, ".draft == true", "true", "release", identity],
  ["wrong source commit", draft, ".target_commitish == $source", "true", "release", identity],
  [
    "branch used as source",
    draft,
    "($source | test(",
    '($source == "main" or test(',
    "release",
    identity,
  ],
  [
    "invalid release tag",
    draft,
    "(.tag_name | test(",
    '(.tag_name != "" or test(',
    "release",
    identity,
  ],
  [
    "duplicate draft asset",
    assets,
    'then error("Duplicate release asset")',
    "then .",
    "release",
    retry,
  ],
  ["wrong draft digest", assets, ".digest == $asset.digest", "true", "release", retry],
  ["incomplete upload", assets, '.state == "uploaded"', "true", "release", retry],
  ["unknown asset", assets, ".name == $asset.name", "true", "release", retry],
  ["nonempty asset removed", assets, ".size == 0", "true", "release", cleanup],
  ["completed asset removed", assets, '.state == "starter"', "true", "release", cleanup],
  ["wrong theme name", inventory, "manifest.name !== theme", "false", "release", sbom],
  ["wrong theme version", inventory, " !== tag)", " === null)", "release", sbom],
  [
    "missing font license in inventory",
    inventory,
    "if (!license || !/",
    "if (license && !/",
    "release",
    sbom,
  ],
  [
    "font subset missing from inventory",
    inventory,
    'name.endsWith(".woff2")',
    'name.endsWith(".woff2") && !name.endsWith(".latin.woff2")',
    "release",
    sbom,
  ],
  [
    "skip link skips the article",
    `${theme}default.hbs`,
    'href="#content"',
    'href="#missing"',
    "browser",
    "keyboard readers can skip site navigation on every route",
  ],
  [
    "membership prompt loses plan link",
    `${theme}partials/content-cta.hbs`,
    'href="#/portal/account/plans"',
    'href="#/portal/account"',
    "browser",
    "a free member can read the paid preview",
  ],
  [
    "older archive links back to current page",
    `${theme}partials/pagination.hbs`,
    "{{page_url next}}",
    "{{page_url page}}",
    "browser",
    "the dated archive leads to the article",
  ],
  [
    "portrait image loses its reserved space",
    `${theme}src/css/layout.css`,
    "aspect-ratio: 3 / 2;",
    "aspect-ratio: auto;",
    "browser",
    "a delayed portrait cover keeps the article text in place",
  ],
];
