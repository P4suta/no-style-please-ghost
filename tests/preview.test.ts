import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

test("the preview can wait for a cold database and checks the Ghost database over TCP", () => {
  const config = execFileSync(
    "docker",
    ["compose", "--env-file", ".env.example", "config", "--format", "json"],
    {
      encoding: "utf8",
      env: { ...process.env, GHOST_START_PERIOD: "37m", MYSQL_START_PERIOD: "11m" },
    },
  );
  const { ghost, mysql } = JSON.parse(config).services;
  assert.match(ghost.healthcheck.start_period, /^37m(?:0s)?$/);
  assert.match(mysql.healthcheck.start_period, /^11m(?:0s)?$/);
  assert.equal(ghost.healthcheck.start_interval, "5s");
  assert.equal(mysql.healthcheck.start_interval, "5s");
  assert.equal(ghost.depends_on.mysql.condition, "service_healthy");
  assert.match(mysql.healthcheck.test.join(" "), /--protocol=TCP/i);
  assert.match(mysql.healthcheck.test.join(" "), /SELECT 1/);
});
