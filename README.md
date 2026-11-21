# The `no-style-please-ghost` theme

A monochrome reading theme for Ghost 6, inspired by Riccardo Graziosi’s [no-style-please](https://github.com/riggraz/no-style-please).
The home page pairs publication dates with article titles.
Each article links to its authors and tags, and the archive works without JavaScript.

## Install the theme

With Docker and Task installed, run the following commands from the repository root.

```sh
task install
task zip
```

Upload the ZIP from `dist/` under **Settings → Design & branding → Change theme**, then activate **no-style-please-ghost**.
The [setup guide](docs/setup.md) covers local preview and live editing.

## Customize the publication

Choose heading and body fonts independently in the theme settings.
The default uses a system serif, and the optional Japanese fonts ship with the theme.
Enable **Show featured posts** to place up to three public selections before the dated index.
Readers’ system preferences control the light and dark appearance.

## Develop and test

The [development instructions](docs/setup.md#run-the-tests) explain how to reproduce a reading problem with the current theme and verify a change.
The suite uploads the distribution to a disposable Ghost site and follows the same URLs readers use.
The [template guide](docs/theme-mapping.md) describes the entry points for archives, content, and navigation.

## License

See the [theme license](LICENSE) for redistribution terms.
The [licensing notes](docs/licensing.md) identify the upstream work and the licenses for the bundled fonts.
