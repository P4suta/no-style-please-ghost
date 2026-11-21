# How the theme renders a publication

## Archives

Ghost renders the home page with `home.hbs` and later collection pages with `index.hbs` in the [index context](https://docs.ghost.org/themes/contexts/index-context).
The tag and contributor archives supply their own headings and reuse the dated list in `partials/post-list.hbs`.
Each entry links to the URL that Ghost supplies, and the pagination helper resolves the route for the current archive.
The home page queries featured articles only when the publication enables the feature.

## Articles and pages

The article header shows the publication date, reading time, title, and byline.
Cover photographs fit inside a reserved 3:2 frame so the caption and article text keep their positions as images load.
The content helper supplies the body for the current reader, including a public preview when the editor provides one.
The theme uses Ghost’s [content access template](https://docs.ghost.org/themes/members#default-cta) to show a single membership prompt.
A page can hide its title and feature image using the editor’s [page display setting](https://docs.ghost.org/themes/helpers/data/page).

## Reading layout

The page heading identifies the current publication, article, writer, or tag, following the [W3C heading guidance](https://www.w3.org/WAI/tutorials/page-structure/headings/).
The theme sets body text in relative units and uses a single reading column.
Long code lines wrap within the reading column, and wide images use the available viewport.
Readers can focus the article body and scroll a wide table with the arrow keys, following the [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
The design uses an 18-pixel default at the browser’s standard font size and standalone controls at least 48 pixels wide and tall.
Inline prose links follow the [inline target exception in the Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## Publication settings

Ghost’s heading and body font variables take precedence over the theme selections.
System fonts need no font download.
The Japanese font options use a local subset for Latin text and load the full font for Japanese characters.
All theme labels use Ghost’s translation helper, and the locale dictionaries cover the phrases used by the templates.
