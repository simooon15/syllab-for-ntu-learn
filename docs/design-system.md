# Syllab — design system

Status: **CURRENT · applies to v0.2.0's Side Panel and Full-page surfaces**

This document is the contract for Syllab's visual language. Read it before adding a surface, a
component, or a state, and read the section you are about to contradict before contradicting it —
most of the rules here exist because the opposite was tried and rejected at review, and the reason
is recorded so you can judge edge cases instead of guessing.

Everything described here lives in three places:

- `extension/src/app/app.css` — the entire stylesheet. One file, no preprocessor.
- `extension/src/v2/screens/` — builds the entire DOM imperatively. There is no framework, no
  component library, and no template layer.
- `extension/src/v2/copy.ts` — every user-visible string, so no component holds literal copy.

**The v0.1.0 popup is gone.** v0.2.0 removed the Popup product form entirely: the toolbar now opens
the Side Panel with a course context and the Full-page extension page without one. Sections below
that name popup-era components (`extension/src/popup/…`, `.task-list`, `.unresolved-field`, the
three action tiers) are kept as the record of how those decisions were reached; the class names
that carry them today are in `extension/src/app/app.css`, and the screen structure they serve is in
`Interaction_and_Information_Architecture_Spec_v0.2.0.md`. Nothing in this file authorises
reintroducing a popup.

---

## 1. What this UI is

Two surfaces, one product model:

- **Side Panel** — `380px`, the working surface beside NTU Learn. Full Course Brief, Initial Scan,
  Initial Review, Change Review, Task Status, and a lightweight Course list for switching.
- **Full-page extension page** — the complete Semester Dashboard, Historical semesters, Settings
  and Backup / Restore.

They read the same Current Course State and never fork its semantics; only density differs. The
rules below that describe a fixed `380px` column and its scrolling behaviour were written for the
popup and still hold for the Side Panel.

Historical note, kept because the reasoning still applies to the Side Panel: the v0.1.0 popup was
Fixed `380px` wide, minimum `500px` tall, no responsive
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
| `--surface-2`   | `#f6f5ee` | the Dashboard's second card tone — see below                |

**The Semester Dashboard alternates two card tones.** Cards on `--surface` and `--surface-2`
alternate so that no two cards that touch share a tone; the second tone sits between the page and
the panel, so a Dashboard of many Courses reads as a rhythm instead of one repeated block.

The second tone has to be _lighter_ than `--surface`, not darker. `--ink-2` on `--surface` is already
`8.05:1`, the house floor for text on a panel, so any deeper ground drops below it: `--sunken` would
give `7.32:1`. `--surface-2` gives `8.2:1` and needs no exception to the floor.

Because that tone is close to the page's own colour its cards take `--line-strong` as their hairline;
a card on `--surface` keeps `--line`.

A Course that has not been set up takes the tone of the position it sits in, like every other card —
what marks it out is that it has no preview to show and carries a line of its own at the foot, not a
different box. `.course-card-note` gives that line exactly the box a `.status-cue` has, so the two
rows start at the same height and the text tops line up across a row. The final Interaction Spec
§3.5 now carries this later Product Owner decision; its superseded visual-only baseline remains in
DIRECTION_ADJUSTMENTS §2.20 and the version Decision Log.

`extension/src/app/stylesheet.test.ts` fails if any rule gives an untouched card a background of its
own, and recomputes the two-column breakpoints from the grid's own card width and gap.

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

## 4.1 The Product Mark

The mark is an **official, locked asset**. It is never redrawn, recoloured, re-proportioned or
substituted — not by CSS shapes, not by an emoji, not by a letterform.

| Asset                                | Use                                   |
| ------------------------------------ | ------------------------------------- |
| `assets/logo/syllab-logo-master.svg` | the single master source              |
| `assets/logo/syllab-logo-16px.png`   | Chrome toolbar, smallest legible size |
| `assets/logo/syllab-logo-32px.png`   | extension asset                       |
| `assets/logo/syllab-logo-48px.png`   | Side Panel and Full-page identity     |
| `assets/logo/syllab-logo-128px.png`  | high-resolution display               |

`extension/public/icons/` ships the same PNGs, which is what `manifest.json` and the in-app mark
load. Production palette: left folded sheet `#3B5151`, main brief sheet `#EEEAE3`, bookmark fold
`#405259`.

**Do not regenerate the PNGs.** They are hand-exported from the master at their own sizes; deriving
them by rescaling would silently change the small sizes. There is deliberately no icon-generation
script in this repository.

In the UI, `brandMark(size)` in `extension/src/v2/screens/patterns.ts` is the only way to render it,
so a surface cannot invent its own mark.

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

### 6.1 Radii

| Token      | Value   | Use                              |
| ---------- | ------- | -------------------------------- |
| `--r-card` | `14px`  | panels                           |
| `--r-ctl`  | `10px`  | buttons, inputs                  |
| `--r-sm`   | `8px`   | tags, wells, small inset regions |
| —          | `999px` | pills and outline tags           |

Radii are deliberately not uniform: a panel is a bigger object than a control, and both are bigger
than a tag. Using one radius everywhere is what makes an interface read as a template.

### 6.2 The spacing scale

Nine steps. Each one means exactly one relationship, and that is the whole point — §3.2 makes spacing
the primary way to establish rank, so the steps have to carry meaning rather than taste.

| Step | Relationship                                                                                                                        |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `2`  | Optical only. A control's own padding where an equal negative margin cancels it, or a nudge that must not change a box's footprint. |
| `4`  | Lines that belong together inside one block — a label and its body, an Evidence locator and its excerpt.                            |
| `6`  | A glyph or dot and the text beside it.                                                                                              |
| `8`  | Sibling items inside a list or a card.                                                                                              |
| `10` | Items in a group; two pieces of text on one line.                                                                                   |
| `12` | Blocks inside a card.                                                                                                               |
| `16` | Card padding; the gap between cards; controls side by side.                                                                         |
| `22` | Between sections; from a screen header down to its content.                                                                         |
| `28` | Below the shell's identity line.                                                                                                    |

The scale is enforced, not advisory: `extension/src/app/stylesheet.test.ts` fails on any spacing
value outside it. That test exists because the scale had already drifted — "inside a card" alone was
carrying `8 / 10 / 14 / 16 / 18`, and "two things on one line" was carrying `8 / 10 / 12 / 14 / 16`.
No single value was wrong; having five of them for one relationship is what reads as untidiness the
eye cannot name and cannot stop adjusting for. Converging them is a spacing change only — it moves
no element, changes no size, and alters no colour.

**Two axes deliberately sit outside the scale**, because neither is a distance between two things:

- **Page padding** — `40px` top and bottom with `24px` sides on the full page; `32px` and `16px` on
  the Side Panel and on any viewport under 560px. Top and bottom are the side padding plus `16`, and
  equal to each other. They were once `24px` top against `40px` bottom, which put the content block
  visibly high: inside a centred 1120px column the sides sit about `54px` from the window edge, so a
  `24px` top gives the page less room above it than beside it. The two densities stay different on
  purpose — the Side Panel is the same product at a tighter setting, not the same measurement.
- **The label column** — `116px` on the full page, `96px` in the Side Panel. A value that aligns to
  the column starts at that width plus the `10px` column gap, so `.competing-values` is indented
  `126px` / `106px`. Those three numbers are one fact, not three choices: changing the label width
  without changing the corresponding indent breaks the column, and the stylesheet test checks the
  arithmetic.

### 6.3 Writing a new rule

Reach for a step above before inventing a value, and name the relationship the value expresses in
the rule's comment when it is not obvious from the selector. A value that does not fit any row is a
signal that the rule is describing a relationship this scale has not named yet — that is worth a
conversation, not a new number.

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

- **Nothing clickable is underlined.** A rule line under a control reads as a document link and
  makes an application surface look like prose. `.link-action`, `.menu-item` and
  `.evidence-locator` all rest on `text-decoration: none` and signal affordance with colour
  (`--ink-2` → `--green-deep` on hover, 140ms). `src/app/stylesheet.test.ts` fails if an underline
  reappears anywhere in the sheet, so this cannot drift back one rule at a time.

- **The working marker.** In `.task-list` the three states share one circle: pending is a hollow
  outline, complete is a filled circle with a drawn tick, and active is the same circle with one
  green quarter, turning (`border-top-color` over a `--line-strong` ring, 0.9s). It is one of the
  two animations in the product allowed to run indefinitely, and reduced motion freezes it — a ring
  with a green quarter still reads as "working".
  **The turn is eased, and that is safe as long as the curve has non-zero slope at both ends.**
  A 360° loop with a zero-slope easing stalls visibly at the seam: measured frame-to-frame movement
  falls to 16% of its peak with `ease-in-out`, against 82% for `linear` and 44% for
  `cubic-bezier(0.4, 0.2, 0.6, 0.8)`, which is what ships. The rule is `y1/x1 > 0` and
  `(1 − y2)/(1 − x2) > 0`, not "use linear".

### The motion vocabulary

Motion exists to explain a change of state, never to decorate it. Everything animates once and
stops; only the working marker and the active Scan stage may loop. `stylesheet.test.ts` enforces all
of the rules below.

| Moment                                        | Rule                                                                                 | Why it stays quiet                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Navigating to another screen                  | `.workspace` / `.screen`, `settle` 160ms                                             | The eye follows a page that arrives rather than snaps     |
| A list of Courses or Assessments              | `.course-card` / `.assessment` / `.constraint`, `settle` 160ms, 0/30/60/90ms stagger | Reading order, not a wipe                                 |
| Fact ↔ Evidence (`CRS-05`)                    | `.is-evidence` / `.is-fact`, `swap-in` 180ms, fade from 0.4 with 1px lift            | One line changes in place; no modal, no new row           |
| Disclosure (`More…`, hints, attention detail) | `disclose` 150ms, fade with a 2px drop                                               | The panel belongs to the control that opened it           |
| Exclude / Undo / Export feedback              | `.notice` / `.toast` / `.undo`, `notice-in` 160ms                                    | Lightweight feedback, never a completion page             |
| Background check in progress                  | `.task-phase.is-working`, `stage-breath` 2.4s loop                                   | One shallow breath says "still working" without a spinner |

**Two rules govern every curve here.** First, a loop must have non-zero slope at both ends — a
seam that stalls is visible as a jerk, which is why `linear` and `ease-in-out` are both wrong for a
360° turn and `cubic-bezier(0.4, 0.2, 0.6, 0.8)` is right. Second, nothing decorative may exceed a
quarter second; a 100ms floor keeps a change legible instead of a flicker. Both are asserted
mechanically, so a new animation cannot quietly opt out.

---

## 8. The three tiers of action

Inside a review card, `index.ts` appends the actions in a fixed order: any number of relationship
tags first, then `Confirm`, `Edit`, `Ignore`, `Skip for now`, `View source`. The CSS turns that order
into three tiers using positional selectors:

| Position                  | Tier             | Treatment                                |
| ------------------------- | ---------------- | ---------------------------------------- |
| `:nth-last-child(n + 6)`  | relationship tag | outline pill, `--green-deep` text        |
| `:nth-last-child(5)`      | `Confirm`        | the only filled button in the card       |
| `:nth-last-child(-n + 4)` | everything else  | quiet link — colour change, no underline |

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
| `--ink-2` on `--surface-2`                      | 8.2         |
| `--green-deep` on `--surface`                   | 7.6         |
| `--clay` on `--page` (a graphic mark, needs ≥3) | 3.9         |

**Re-measure after changing any token.** The panel colour moved once and silently invalidated six
figures in this table; a short script over `:root` is enough to catch it.

Body text needs 4.5:1; graphics need 3:1. Focus is always visible: `:focus-visible` draws a 2px
`--green` outline at 2px offset. Reduced motion is honoured — `prefers-reduced-motion: reduce`
neutralises every animation and transition, and every motion added since needs no reduced-motion
special case because removing it only removes the explanation of a change that is still visible
afterwards.

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

**Underlined text on anything clickable.** A rule line under a control reads as a document link and
makes an application surface look like prose. Affordance comes from colour (`--ink-2` →
`--green-deep`) and weight. `extension/src/app/stylesheet.test.ts` fails if an underline rule, an
underlined class, or an unreset `a`/`u` default reappears.

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
