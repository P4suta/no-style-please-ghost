import assert from "node:assert/strict";
import { test } from "node:test";
import config from "../playwright.config";
import { browserMutationTimeoutMs, classifyMutation, replaceOnce } from "../scripts/mutations";

test("the mutation runner allows Ghost startup, a browser test, and graceful shutdown", () => {
  const server = config.webServer;
  assert.ok(server && !Array.isArray(server));
  const startup = server.timeout ?? 60_000;
  const testTimeout = config.timeout ?? 30_000;
  const shutdown = server.gracefulShutdown?.timeout ?? 0;
  assert.ok(browserMutationTimeoutMs >= startup + testTimeout + shutdown);
});

test("a mutation must change exactly one occurrence", () => {
  assert.equal(replaceOnce("a b c", "b", "z"), "a z c");
  for (const source of ["a", "b b"]) assert.throws(() => replaceOnce(source, "b", "z"));
});

test("only a completed assertion in the selected test kills a mutation", () => {
  const result = (xml: string, code: number | null) =>
    classifyMutation(`<testsuites><testsuite>${xml}</testsuite></testsuites>`, code, "selected");
  const hit =
    '<testcase name="selected"><failure>AssertionError: unequal bytes</failure></testcase>';
  assert.equal(result('<testcase name="selected"/>', 0), "survived");
  assert.equal(result(hit, 1), "killed");
  assert.equal(result(hit, 0), "inconclusive");
  assert.equal(result(hit, null), "inconclusive");
  for (const xml of [
    "",
    '<testcase name="selected"><skipped/></testcase>',
    '<testcase name="selected"><error>setup failed</error></testcase>',
    '<testcase name="else"><failure>AssertionError</failure></testcase>',
    '<testcase name="selected"><failure>container failed to start</failure></testcase>',
    '<testcase name="selected"><failure>Test timeout of 30000ms exceeded while waiting for expect(locator).toBeVisible()</failure></testcase>',
  ]) {
    assert.equal(result(xml, 1), "inconclusive");
  }
});
