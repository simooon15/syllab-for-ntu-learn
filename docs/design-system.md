# Syllab popup — design system

Status: **CURRENT · applies to v0.1.0 and any surface added after it**

This document is the contract for the extension popup's visual language. Read it before adding a
surface, a component, or a state, and read the section you are about to contradict before
contradicting it — most of the rules here exist because the opposite was tried and rejected at
review, and the reason is recorded so you can judge edge cases instead of guessing.

Everything described here lives in two files:

- `extension/src/popup/popup.css` — the entire stylesheet. One file, no preprocessor.
- `extension/src/popup/index.ts` — builds the entire DOM imperatively. There is no framework, no
  component library, and no template layer.

---

## 1. What this UI is

One surface: the Chrome extension popup. Fixed `380px` wide, minimum `500px` tall, no responsive
breakpoints — the popup chrome decides the height, and content scrolls.

The entry router picks one of four sections, and each section renders its own content inside a
shared frame (masthead → lede → section strip → content → status):

| Section       | id              | What it shows                                           |
| ------------- | --------------- | ------------------------------------------------------- |
| Saved Courses | `saved-courses` | the course shelf, or an empty state                     |
| Scan          | `scan`          | ready / scanning / interrupted / waiting-for-permission |
| Review        | `review`        | candidates in Needs Review and Detected                 |
| Course Brief  | `course-brief`  | confirmed facts, calendar export                        |

The DOM is built by `render()` in `index.ts`, which calls `app.replaceChildren()` on every state
change and rebuilds from scratch. There is no diffing, no reconciliation, and no component state:
**any visual state must be expressible from the class names and attributes that `index.ts` writes.**

---

## 2. How the CSS reaches the browser

`extension/scripts/build.mjs` copies files verbatim into `extension/dist`:

- `extension/src/popup/popup.css` → `dist/popup.css`
- `extension/popup.html` → `dist/popup.html` (loads `popup.css` via `<link>`, `popup.js` as a module)
- `extension/public/fonts/` → `dist/fonts/`

Three consequences you must respect:

1. **`@font-face` URLs resolve relative to `dist/popup.css`** — write `url("fonts/x.woff2")`, never a
   path into `src/`.
2. **Do not add `import "./popup.css"` to `index.ts`.** The import makes esbuild bundle the CSS a
   second time and try to resolve its `url()` references against `src/popup/`, which fails the build.
   The `<link>` in `popup.html` and the `cp` in `build.mjs` are the only paths that should exist.
3. **The extension page has a strict CSP and no network.** Fonts, textures and images must all be
   local or `data:` URIs. There is no webfont CDN, and adding one would break offline use.

The coupling between the two files is **class names only**. `index.ts` writes `className` strings;
`popup.css` styles them. Nothing else links them, so a class that `index.ts` writes but the CSS
never styles is invisible, and a class the CSS styles but `index.ts` never writes is dead code.
Check both directions when you finish (see §12).

---

## 3. Principles

These are ordered. When two conflict, the earlier one wins.

1. **Flat. No shadows, and no background gradients.** Planes are separated by value and a hairline.
   This was tried the other way — cast shadows plus a lit top edge — and rejected as ugly. The page's
   only texture is a 5% noise overlay on `body::after`.
2. **Hierarchy comes from structure, never from making text fainter.** The failure mode is a light
   page where everything sits at the same mid-grey and the eye finds no rank. Fix rank with spacing,
   size, weight, position and containment — not by lowering contrast.
3. **Whitespace separates. Hairlines are a last resort.** A rule drawn between two things usually
   means they were not given enough room.
4. **One accent, and it means something.** Green is the product colour. The warm accent (`--clay`)
   appears only on things that need the reader to act, and never as a filled block — only as a
   2px bar or a 5px mark. A large saturated warm area on a green page reads as an alarm bolted on.
5. **No ornament that does not carry information.** If you cannot say what a decoration tells the
   reader, delete it.
6. **The type carries the character; the interface stays plain.** Fraunces is doing the personality
   work in the headings and prose. Everything around it should be quiet.

---

## 4. Colour tokens

All of them live in `:root`. Use the token, never a literal hex, so the palette stays changeable in
one place. The only literals allowed in component rules are the few hairlines that are one-offs
(documented where they appear).

| Token           | Value     | Role                                                        |
| --------------- | --------- | ----------------------------------------------------------- |
| `--page`        | `#fdfcf8` | the popup background — warm paper                           |
| `--surface`     | `#f0f4ea` | a pale green panel: cards, the brand tile                   |
| `--sunken`      | `#e2ebd9` | a well inside a panel                                       |
| `--ink`         | `#191f18` | headings, and the raw specimen data                         |
| `--ink-2`       | `#434c3d` | body, labels, links, anything on a panel                    |
| `--ink-3`       | `#5d6656` | marginalia — **page ground only**, see below                |
| `--line`        | `#e6ecdc` | panel outline                                               |
| `--line-strong` | `#c7d5bb` | control outlines, and the rule beside raw data              |
| `--line-soft`   | `#eef2e7` | the one divider above the status footer                     |
| `--green`       | `#3c6a45` | the accent: primary button, hover                           |
| `--green-deep`  | `#305537` | filled shapes with light type; accent text on light grounds |
| `--green-tint`  | `#e2efe4` | hover fills and selection only                              |
| `--clay`        | `#bd6a3f` | the attention accent: a bar, a dot, a hover                 |
| `--clay-wash`   | `#f7e8de` | the attention band's fill (opaque)                          |

### Rules that are not obvious

**`--ink-3` is for text on the page, not on a panel.** On `--page` it reaches 5.8:1; on `--surface`
it only reaches 5.4:1. Both pass AA, but a tinted ground costs legibility beyond what the ratio
suggests, and small mono suffers most — so the house floor for anything on a panel is `--ink-2`
(8.0:1), not the WCAG minimum. Treat the panel figure as the real budget.

**Keep the accent hue in the forest range (~131°), not emerald (~150°).** 149° reads as "too jade",
and it also sits 65° away from the warm panel, which is why those fills clashed. Compute hue as
`60 × (2 + (B − R) / (max − min))` when green is the max channel.

**Never composite a translucent warm tint over a green ground.** It mixes to a grey-olive every
time: `rgb(150 112 63 / 9%)` over `#f0f4ea` lands on `#e8e8db`, which reads as mud. Use an opaque
value and check the composite before trusting it.

**No mid-tone green fills.** A desaturated green in the middle of the range reads dated. Filled
shapes take `--green-deep` with light type; quiet shapes take a hairline outline; the pale tint is
only ever a hover.

---

## 5. Type

Three voices, three jobs. There is no fourth.

| Token            | Family            | Job                                              |
| ---------------- | ----------------- | ------------------------------------------------ |
| `--font-display` | Fraunces          | headings, and prose the reader is meant to read  |
| `--font-ui`      | Plus Jakarta Sans | labels, body, buttons, anything operated         |
| `--font-mono`    | Space Mono        | specimen data, evidence locators, status metrics |

All three are bundled under `extension/public/fonts/` (licences in `fonts/OFL.txt`). Fraunces and
Plus Jakarta Sans stand in for Copernicus and Styrene B, which are licensed to Anthropic and cannot
be redistributed.

### Which voice goes where

**Read it → Fraunces. Operate it → Plus Jakarta Sans. Machine data → Space Mono.**

So the lede, course names, empty states and calendar event titles are serif; buttons, the section
strip, tags and status labels are sans; JSON, evidence lines and footer metrics are mono. An audit
state whose text is a sentence the reader must parse (`date: Needs review`) is sans, because it is
an annotation on a control, not content.

### Fraunces settings

- Body-sized prose (`.lede`, `.empty-state`, calendar labels) pins `font-variation-settings: "opsz" 11`
  — the reading end of the axis, which gives a sturdier stroke at 13–15px. Headings are left on
  `font-optical-sizing: auto` so larger sizes get the sharper display cut automatically.
- **Serif body needs more leading than sans.** Prose uses `line-height: 1.6–1.65`; the sans body is
  `1.6`. Dropping prose to 1.5 makes it visibly cramped.
- **`wght` defaults to 900 in this build.** Any element that sets `--font-display` without an
  explicit `font-weight` renders Black. Always set it: 500 for headings, 400 for prose.

---

## 6. Space and shape

| Token      | Value   | Use                              |
| ---------- | ------- | -------------------------------- |
| `--r-card` | `14px`  | panels                           |
| `--r-ctl`  | `10px`  | buttons, inputs                  |
| `--r-sm`   | `8px`   | tags, wells, small inset regions |
| —          | `999px` | pills and outline tags           |

Radii are deliberately not uniform: a panel is a bigger object than a control, and both are bigger
than a tag. Using one radius everywhere is what makes an interface read as a template.

Page padding is `20px 20px 26px` on `main`, so the content column is `340px`. Vertical rhythm uses a
small set of steps — `8 / 10 / 12 / 14 / 16` inside a component, `22 / 26` between blocks. Reach for
an existing step before inventing one.

---

## 7. Component vocabulary

All styling hangs off these class names. Reuse the class before writing a new rule.

| Class                                                                 | Element               | What it is                                                  |
| --------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------- |
| `.masthead` / `.brand-mark` / `.heading-group` / `.eyebrow` / `h1`    | header                | product mark, small label, page title                       |
| `.lede`                                                               | `p`                   | the one-sentence explanation under the title                |
| `.surface-list`                                                       | `ul > li > button`    | the four section pills — **a status indicator, not a menu** |
| `.primary-action`                                                     | `button`              | the one thing to do on this state                           |
| `.secondary-action`                                                   | `button`              | every other action; standalone ones go full width           |
| `.saved-course-card`                                                  | `button`              | a course on the shelf                                       |
| `.review-content` / `.review-card` / `.brief-content` / `.brief-card` | `div` / `article`     | the card lists                                              |
| `.brief-section` / `.brief-child`                                     | `section`             | the Brief's category groups and nested requirements         |
| `.unresolved-field`                                                   | `div` / `p`           | the attention band (see §8)                                 |
| `.relationship-context`                                               | `p`                   | an outline tag naming the parent assessment                 |
| `.evidence`                                                           | `p`                   | a source locator, inside `<details>`                        |
| `.calendar-export`                                                    | `section`             | the `.ics` checklist                                        |
| `.permission-origin`                                                  | `p`                   | one attachment host asking for access                       |
| `.scan-issues`                                                        | `section`             | the ledger of sources that could not be read                |
| `.task-list`                                                          | `ol > li[data-state]` | scan progress; `complete` / `active` / `pending`            |
| `.empty-state`                                                        | `p`                   | nothing here yet                                            |
| `.status` / `.status-label` / `.status-text`                          | `p` + `span`s         | the footer's own account of itself                          |

Two patterns worth copying when you add something:

- **Raw machine data is a well, not a quote.** `pre` is a plain `<pre>`; the CSS gives it a hanging
  rule (`border-left: 2px solid var(--line-strong)`) and `--ink` text, the darkest ink in the popup,
  because it is the card's actual content. A filled container was tried here and rejected as a white
  block stuck inside the card.
- **The attention band.** `.unresolved-field` is full width with a 2px `--clay` left bar, a
  `--clay-wash` fill and right-rounded corners. **Do not shrink it to `fit-content`, and do not add
  `border` all round.** Full width makes it read as a marking _on_ the card; shrunk to its own text
  width the same colours make it read as an object _placed on_ the card, which is what made it feel
  like it had appeared from nowhere.

- **The working marker.** In `.task-list` the three states share one circle: pending is a hollow
  outline, complete is a filled circle with a drawn tick, and active is the same circle with one
  green quarter, turning (`border-top-color` over a `--line-strong` ring, 0.9s). It is the one
  animation in the product allowed to run indefinitely, and reduced motion freezes it — a ring with
  a green quarter still reads as "working".
  **The turn is eased, and that is safe as long as the curve has non-zero slope at both ends.**
  A 360° loop with a zero-slope easing stalls visibly at the seam: measured frame-to-frame movement
  falls to 16% of its peak with `ease-in-out`, against 82% for `linear` and 44% for
  `cubic-bezier(0.4, 0.2, 0.6, 0.8)`, which is what ships. The rule is `y1/x1 > 0` and
  `(1 − y2)/(1 − x2) > 0`, not "use linear".

---

## 8. The three tiers of action

Inside a review card, `index.ts` appends the actions in a fixed order: any number of relationship
tags first, then `Confirm`, `Edit`, `Ignore`, `Skip for now`, `View source`. The CSS turns that order
into three tiers using positional selectors:

| Position                  | Tier             | Treatment                          |
| ------------------------- | ---------------- | ---------------------------------- |
| `:nth-last-child(n + 6)`  | relationship tag | outline pill, `--green-deep` text  |
| `:nth-last-child(5)`      | `Confirm`        | the only filled button in the card |
| `:nth-last-child(-n + 4)` | everything else  | quiet underlined link              |

That is why most candidates can be declined without the card becoming a wall of buttons. **If you
reorder the appends in `appendReview`, the tiers degrade** — nothing breaks, but everything falls
back to looking like a link. Keep the order, or update both the code and this table together.

---

## 9. Contrast floors

Measured against the token values in §4, not estimated. Keep them when you change anything.

| Pair                                            | Ratio       |
| ----------------------------------------------- | ----------- |
| `--ink` on `--page` / on `--surface`            | 16.4 / 15.1 |
| `--ink-2` on `--page` / on `--surface`          | 8.7 / 8.0   |
| `--ink-3` on `--page` / on `--surface`          | 5.8 / 5.4   |
| light type (`--page`) on `--green-deep`         | 8.2         |
| `--green-deep` on `--surface`                   | 7.6         |
| `--clay` on `--page` (a graphic mark, needs ≥3) | 3.9         |

**Re-measure after changing any token.** The panel colour moved once and silently invalidated six
figures in this table; a short script over `:root` is enough to catch it.

Body text needs 4.5:1; graphics need 3:1. Focus is always visible: `:focus-visible` draws a 2px
`--green` outline at 2px offset. Reduced motion is honoured — `prefers-reduced-motion: reduce`
neutralises every animation and transition.

---

## 10. Adding a new surface or component

1. **Read §3 and §4 first.** Most new work is covered by an existing token and an existing class.
2. **Build the DOM in `index.ts` with existing class names** where they fit. A new class needs a
   reason that survives being written down.
3. **If it is a surface** (a fifth section), it needs: an entry in the `surfaces` array, a
   `viewCopy()` branch, a branch in `render()`, and styling for the section strip's current pill.
   Note that the strip is a **status indicator** — its buttons are disabled by design and read as
   "where you are", not as navigation. Do not make them clickable without a product decision.
4. **If it presents confirmed facts**, it must not invent a summary. Facts come from the Brief layer
   only, and a derived title is a product-visible change — see §11.
5. **Style it flat**, with `--ink` / `--ink-2`, and check which ground it sits on before choosing an
   ink (§4).
6. **Run the checklist in §12.**

---

## 11. Two project rules that constrain the UI

**Product-visible changes need sign-off.** Adding a derived value, changing what a control does, or
changing confirmed copy is a product decision, not a styling one. Raise it before implementing.
(The Brief cards currently have no heading at all — `index.ts` never creates one for `brief-card`,
only for `review-card` and `brief-child` — so each card opens on raw JSON. Deriving a title from the
confirmed value is the known fix and is pending a product decision.)

**Never put secrets in the popup, in a fixture, or in this repository.** It is a local extension; the
DeepSeek key belongs to the backend and is supplied by the user's own shell.

---

## 12. Verifying a change

Before calling UI work done:

1. `npm run ci` — Prettier, build, strict typecheck, ESLint, tests, manifest validation, secret scan.
2. **Check both directions of the class contract.** Every class `index.ts` writes should have a rule,
   and every class in the CSS should be written by something:
   ```sh
   grep -o 'className = "[^"]*"' extension/src/popup/index.ts | sort -u
   grep -oE '^\.[a-z-]+' extension/src/popup/popup.css | sort -u
   ```
3. **Look at it.** A stylesheet that reads correctly can still render wrong; several defects in this
   file were only found in a screenshot (a missing container rule for `.brief-child` twice, a section
   strip indented by an invisible marker). `Syllab_UI_Preview.html` in the repository root renders
   every state at the real 380px width from the built stylesheet — open it in Chrome. It reads
   `extension/dist/popup.css`, so run a build first, and delete the file once it has served its
   purpose.
4. **Reload the extension and refresh the NTU Learn tab.** A reloaded unpacked extension leaves
   already-open tabs with a dead content script.

---

## 13. Rejected directions — do not reintroduce

Each of these was tried, reviewed and removed. The reason matters more than the prohibition.

| Removed                                                                                        | Why                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Torn-paper edges, stamp mottling, text displacement filters                                    | Read as busy and dated. Also needed an SVG filter block in `popup.html`, coupling two files.                                                                                                     |
| Micro-rotations on cards                                                                       | Character without meaning.                                                                                                                                                                       |
| Leaf bullets, leader dots, folio numbering                                                     | Ornament. The section strip in particular was misread as navigation.                                                                                                                             |
| Drop shadows and a lit top edge on panels                                                      | Reviewed as ugly; the colours were already distinguishable. Shadows are now gone everywhere.                                                                                                     |
| Background gradients                                                                           | Reviewed as unwanted; a white→green radial also pushed the bottom of the page toward green and made it look grubby.                                                                              |
| Mid-tone green fills (`#bedbb8` and friends)                                                   | "A bit dated." Both ends of the range read better than the middle.                                                                                                                               |
| Emerald green (~150°)                                                                          | "Don't use such a jade green." Also clashed with the warm panel.                                                                                                                                 |
| A saturated warning orange (`#b4552b`)                                                         | The only foreign colour on the page; read as an alarm bolted on.                                                                                                                                 |
| A white inset well for JSON inside a green card                                                | Looked stuck on. The darkest ink on the panel reads better.                                                                                                                                      |
| A `fit-content` attention band                                                                 | Turned a marking into an object. See §7.                                                                                                                                                         |
| Italic empty states                                                                            | Explicitly requested off. Italic survives only on the card's kind captions.                                                                                                                      |
| An ink-drop ripple, and a twelve-dot ring with a travelling wave, as the scan's working marker | Both were built and reviewed out. The ripple read as noise at 16px, and the dot ring's "breathing" (a whole-ring scale) read as bouncing. A conventional spinner is what was asked for and kept. |
| All-caps tracked labels, numbered eyebrows                                                     | Generic tells; the labels are sentence case.                                                                                                                                                     |
