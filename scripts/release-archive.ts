import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { strFromU8, unzipSync } from "fflate";

const theme = "no-style-please-ghost";
const hashes = (data: Uint8Array) => [
  { alg: "SHA-256", content: createHash("sha256").update(data).digest("hex") },
];

export function releaseInventory(zip: Uint8Array, tag: string) {
  const entries = unzipSync(zip);
  const manifest = JSON.parse(strFromU8(entries["package.json"]));
  if (manifest.name !== theme) throw new Error("Unexpected theme name in the ZIP");
  if (`v${manifest.version}` !== tag)
    throw new Error("Theme version does not match the release tag");
  const components = Object.keys(entries)
    .filter((name) => name.endsWith(".woff2"))
    .sort()
    .map((name) => {
      const license = entries[name.replace(/(?:\.latin)?\.woff2$/, "-OFL.txt")];
      if (!license || !/SIL OPEN FONT LICENSE\s*(?:,\s*)?Version 1\.1/i.test(strFromU8(license)))
        throw new Error(`Missing Open Font License for ${name}`);
      return {
        type: "file",
        name,
        licenses: [{ license: { id: "OFL-1.1" } }],
        hashes: hashes(entries[name]),
      };
    });
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.6",
    version: 1,
    metadata: {
      component: {
        type: "application",
        name: theme,
        version: manifest.version,
        licenses: [{ license: { id: manifest.license } }],
        hashes: hashes(zip),
      },
    },
    components,
  };
}

if (import.meta.main) {
  const [tag, directory] = process.argv.slice(2);
  const name = `${theme}-${tag.slice(1)}.zip`;
  const zip = readFileSync(join(directory, name));
  const sbom = `${JSON.stringify(releaseInventory(zip, tag), null, 2)}\n`;
  writeFileSync(join(directory, "theme.cdx.json"), sbom);
  writeFileSync(
    join(directory, "SHA256SUMS"),
    `${hashes(zip)[0].content}  ${name}\n${hashes(Buffer.from(sbom))[0].content}  theme.cdx.json\n`,
  );
}
