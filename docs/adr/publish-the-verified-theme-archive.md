---
date: 2026-11-21
status: proposed
---

# Publish the verified theme archive

## Context

Ghost accepts a ZIP with the theme manifest at its root.
GitHub’s generated source archive also contains development tools and wraps the theme in another directory.

## Decision

Use release-please to open version proposals and create a draft when a proposal lands.
Test the ZIP from the tagged commit and attach the verified files before publishing the immutable release.

## Alternatives

A manually uploaded ZIP would spare the project a release workflow but would leave readers unable to verify which build they received.

## Consequences

A release waits for the theme tests and approval of the publication job.
Revisit the distribution format if Ghost starts accepting repository source archives.

## Confirmation

Compare the downloaded ZIP with the build digest and verify its attestation.
Reject a mismatched version or a draft asset whose digest differs from the original build.

[Release-please action](https://github.com/googleapis/release-please-action) · [Immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
