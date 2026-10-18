# Third-party artwork

## Flaticon Uicons

- Creator and source: [Uicons by Flaticon](https://www.flaticon.com/uicons).
- Package: `@flaticon/flaticon-uicons`, version `3.3.1`, Regular Rounded style.
- Licence: [Flaticon License](https://github.com/freepik-company/flaticon-uicons/blob/main/LICENSE), not MIT or a project-wide open-source licence.
- Usage: selected glyphs are converted from the installed WOFF font into inline SVG during the build. View boxes and output coordinates are normalised for the interface; the artwork remains Flaticon content.
- Attribution: a visible “Uicons by Flaticon” link appears in the shared website footer.

The semantic icon manifest is `tooling/dashboard-icons.js`. The font and complete collection remain in ignored `node_modules/`; they are not published as a standalone asset collection. The generated artwork is used within this website and must not be treated as freely redistributable stock icons. Retain the attribution and review Flaticon's terms before changing its use.

## OpenType.js

`opentype.js` version `2.0.0` is used under its [MIT licence](https://github.com/opentypejs/opentype.js/blob/master/LICENSE) to convert glyph geometry at build time. It is not included in the browser bundle. The installed package contains its licence notice.
