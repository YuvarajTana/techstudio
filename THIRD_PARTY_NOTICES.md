# Third-party notices

Assets bundled with TECKSTUDIO and their licences. Full licence texts live next
to the vendored files.

## Icons (`packages/design-spec/src/icons/generated`)

Vendored by `npm run icons:vendor` from the list in
`packages/design-spec/src/icons/required.json`.

| Source | Version | Licence | Licence text |
|---|---|---|---|
| [Tabler Icons](https://tabler.io/icons) | see `icons.manifest.json` | MIT | `packages/design-spec/licenses/tabler-icons-LICENSE.txt` |
| [Simple Icons](https://simpleicons.org) | see `icons.manifest.json` | CC0-1.0 (per-icon exceptions recorded on each icon) | `packages/design-spec/licenses/simple-icons-LICENSE.md` |

**Trademarks.** Product logos (ids starting with `logo:`, plus Tabler `brand-*`
icons) are trademarks of their owners. They are included only to refer to those
products (for example in an architecture diagram). Do not use them to imply
endorsement or affiliation. See `packages/design-spec/licenses/simple-icons-DISCLAIMER.md`.

A few Simple Icons carry their own licence, which is stored on the icon entry.
For example, `logo:git` is CC-BY-3.0 and needs attribution: "Git logo via Simple
Icons, CC-BY-3.0". The vendoring script rejects share-alike licences.

## Fonts

Self-hosted through `@fontsource/*` packages under the SIL Open Font Licence 1.1:
Inter, Outfit, JetBrains Mono and Playfair Display.
