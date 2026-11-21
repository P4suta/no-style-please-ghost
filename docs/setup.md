# Work with the Ghost theme

## Preview a distribution

Install Docker with Compose and the [Task command](https://taskfile.dev/installation/).
Copy the example environment and start a local publication.

```sh
cp .env.example .env
task install
task zip
task up
```

Open the administration panel at `http://localhost:2368/ghost/` and complete the initial setup.
Under **Settings → Design & branding → Change theme**, upload the versioned ZIP from `dist/` and activate **no-style-please-ghost**.
Visit `http://localhost:2368/` to read the publication.

Compose checks both services every five seconds during startup.
The preview is ready when Ghost serves the home page and MySQL accepts a query on the publication database.
For slow disks, adjust `GHOST_START_PERIOD` or `MYSQL_START_PERIOD` in `.env` to change the time available for initialization.

## Edit the mounted theme

Run `task dev` to mount `theme/no-style-please-ghost/` in the local Ghost installation.
Select the theme from **Installed** in the theme settings.
Run `task watch` in a second terminal while editing CSS.
Run `task restart` after changing the theme manifest.

The Docker tasks install Linux dependencies in `.docker-modules/`.
Host commands use their own installation in `node_modules/`.

## Run the tests

Use the Node.js version in `.nvmrc` and the Bun version in `package.json`.
The tests require jq, Docker, and the Chromium, Firefox, and WebKit builds supplied by Playwright.

```sh
bun install --frozen-lockfile
bun x playwright install --with-deps --only-shell chromium firefox webkit
bun run verify
```

To change reader behavior, write a failing test under `tests/`, then run it with the packaged theme.

```sh
bun run zip
bun x playwright test -g "keyboard readers"
```

Change the theme, rebuild the ZIP, and run the test again.
Run `bun run verify` for formatting, linting, type checking, distribution tests, reader journeys, and GScan.
The browser suite starts a disposable Ghost site under `/journal/` with a separate in-memory filesystem.
The suite uploads the ZIP, signs in test readers, and exercises search and membership dialogs with Ghost’s published client scripts.
The accessibility tests run axe on nine page views in light and dark mode.
The keyboard tests exercise focus, search results, and wide tables.
Set `GHOST_TEST_PORT` to choose a loopback port other than 2468.

## Run mutation tests

Run `bun run test:mutations --list` to see the configured faults and `bun run test:mutations` to exercise them.
The runner changes one file at a time in a temporary copy, runs the named test before and after the change, and checks its assertion result.
The `--unit` option selects packaging and release checks, and `--browser` exercises the installed theme in Chromium.
Set `GHOST_MUTATION_PORT` to choose a loopback port other than 2496.

## Publish a release

Release-please opens a version proposal from Conventional Commits on `main`.
Merging the proposal creates a version tag and a draft, then starts **Publish the verified theme ZIP** on that tag.
The build installs the ZIP in Ghost, runs the mutation tests, checks GScan, and creates a CycloneDX inventory of the bundled fonts.
The publication job verifies the build attestation and fills in missing draft assets after checking their digests.
Before approving the `release-publish` environment, confirm that the version tag, source commit, and build match the intended release.
Check that the repository enforces Immutable Releases.

If publication stops after uploading some files, rerun the failed job in the original build to keep its attestation bundle.
If the build dispatch fails before a build starts, select the version tag in **Publish the verified theme ZIP** and supply the numeric draft release ID.
The workflow refuses a conflicting draft or an already published release.

For a new installation of the automation, run **Verify release App access** on `main`.
Give the repository variable `RELEASE_PROPOSALS_ENABLED` the value `true` and run **Release proposal**.
The `release-please` environment holds the read-only Doppler service token for the repository’s `automation` config.

## Measure page loading

Install Chrome and activate the ZIP on the preview publication.
Run Lighthouse on the home page and repeat the command with an article URL.

```sh
bun x --package lighthouse@13.6.0 lighthouse http://localhost:2368/ --chrome-flags="--headless=new" --output=html --output-path=home.html
```

Use the same Chrome version, font settings, and published content for each comparison.
Run each URL three times with the mobile preset and compare the median performance score, transfer size, and cumulative layout shift.
Add `--preset=desktop` to measure desktop loading.
The browser tests also check font transfer sizes and the position of article text while a cover image loads.

After replacing a bundled font, run `sh scripts/subset-fonts.sh` with [uv](https://docs.astral.sh/uv/) installed to rebuild the Latin font files.

## Stop the preview

Run `task down` to stop the preview services.
Docker keeps the publication in its named volumes.
