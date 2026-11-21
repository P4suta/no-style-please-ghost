import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";

const workflow = (name: string) => parse(readFileSync(`.github/workflows/${name}.yml`, "utf8"));

test("the credential check can only read this repository on a manual run", () => {
  const check = workflow("verify-release-access");
  assert.deepEqual(Object.keys(check.on), ["workflow_dispatch"]);
  assert.deepEqual(check.permissions, { contents: "read" });
  const job = check.jobs.verify;
  assert.equal(job.environment, "release-please");
  const token = job.steps.find((s: { uses?: string }) =>
    s.uses?.startsWith("actions/create-github-app-token@"),
  ).with;
  assert.equal(token["permission-contents"], "read");
  assert.ok(!Object.values(token).includes("write"));
});

test("only a release proposal creates a draft and only the publication job can publish verified files", () => {
  const proposal = workflow("release-please");
  assert.deepEqual(proposal.on.push.branches, ["main"]);
  assert.equal(proposal.jobs.propose.environment, "release-please");
  assert.match(proposal.jobs.distribute.if, /release_created == 'true'/);
  const jobs = workflow("publish-theme").jobs;
  assert.deepEqual(jobs.build.permissions, { contents: "read" });
  const buildCommands = jobs.build.steps.map((step: { run?: string }) => step.run ?? "").join("\n");
  assert.doesNotMatch(buildCommands, /gh api .*\/releases\//);
  assert.match(buildCommands, /git merge-base --is-ancestor/);
  assert.ok(
    jobs.build.steps.some((step: { run?: string }) => step.run?.includes("bun run test:mutations")),
  );
  assert.equal(jobs.attest.needs, "build");
  assert.equal(jobs.attest.permissions.contents, "read");
  assert.ok(
    jobs.attest.steps.every(
      (step: { uses?: string }) => !step.uses?.startsWith("actions/checkout@"),
    ),
  );
  assert.deepEqual(jobs.publish.needs, ["build", "attest"]);
  assert.equal(jobs.publish.environment, "release-publish");
  assert.deepEqual(jobs.publish.permissions, { contents: "write", attestations: "read" });
  const publish = jobs.publish.steps.at(-1).run as string;
  assert.match(publish, /check_draft\s+eligible=\$\(asset_plan cleanup\)/);
  assert.match(
    publish,
    /gh api --method DELETE[^\n]+\n[\s\S]*?check_draft\s+missing=\$\(asset_plan missing\)[\s\S]*?gh release upload/,
  );
});
