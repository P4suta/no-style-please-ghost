---
date: 2026-11-21
status: proposed
---

# Render the reading archive in Ghost

## Context

Readers enter a publication through its home page, an article, a tag, or a contributor profile.
Each entry point needs a permanent address and a way to continue reading without JavaScript.

## Decision

Render a shared dated index from the [Ghost index context](https://docs.ghost.org/themes/contexts/index-context).
Render each article from the content supplied for the current reader.
Delegate search and registration to the publication’s [Ghost membership settings](https://docs.ghost.org/themes/members).

## Alternatives

A client-side index could filter an entire archive in place, at the cost of fetching it and reproducing Ghost’s routing and access decisions.
Separate templates for each collection support distinct layouts but duplicate the rules for dates, empty archives, and navigation.

## Consequences

Reading and pagination require only HTML and CSS.
Search and account dialogs use Ghost’s scripts.
Revisit client-side filtering if a publication needs to search fields outside Ghost’s index.

## Confirmation

Activate the theme in a disposable Ghost site and follow an article to its tag, byline, and paginated archive.
Check an anonymous reader’s view of restricted content and repeat the reading journey without JavaScript.
