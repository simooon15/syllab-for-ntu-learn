import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const raw = await readFile(fileURLToPath(new URL("./app.css", import.meta.url)), "utf8");
/** Comments carry the reasoning for a rule but must not confuse a selector scan. */
const stylesheet = raw.replace(/\/\*[\s\S]*?\*\//g, "");

interface StyleRule {
  selector: string;
  body: string;
}

const rules: StyleRule[] = [...stylesheet.matchAll(/([^{}]+)\{([^}]*)\}/g)].flatMap((match) =>
  (match[1] as string)
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.startsWith("@"))
    .map((selector) => ({ selector, body: match[2] as string }))
);

function ruleFor(selector: string): string {
  const found = rules.find((rule) => rule.selector === selector);
  if (!found) throw new Error(`MISSING_RULE:${selector}`);
  return found.body;
}

describe("stylesheet contract", () => {
  it("never underlines anything the user can click", () => {
    // Colour and weight carry the affordance; a rule line under a control reads as a document
    // link and makes an app surface look like prose.
    const underlined = [...stylesheet.matchAll(/text-decoration:\s*underline/g)].length;
    expect(underlined).toBe(0);
    for (const selector of [".link-action", ".menu-item", ".evidence-locator"]) {
      expect(ruleFor(selector)).toContain("text-decoration: none");
    }
    // The browser underlines `a` and `u` by itself, and that default never appears in this file,
    // so a source-level sweep alone would miss it. The reset has to name them.
    expect(ruleFor("a")).toContain("text-decoration: none");
    expect(ruleFor("u")).toContain("text-decoration: none");
  });

  it("draws no rule line under anything the user can click", () => {
    // An underline can also be a border rather than a `text-decoration`, and a border is what a
    // stylesheet scan cannot tell apart from a legitimate list divider. Every rule that draws one
    // is therefore named here, so a new ``border-bottom`` on a control fails this test.
    // Structural dividers only: a row boundary in a list, or a section boundary in Settings.
    // `.constraint` draws its line ABOVE the row, so it separates one constraint from the next
    // rather than sitting under the text the user clicks.
    const dividers = new Set([".calendar-event", ".settings-section", ".constraint"]);
    for (const rule of rules) {
      if (!/border-(bottom|top)\s*:\s*[^;]*\b(solid|dashed|dotted)\b/.test(rule.body)) continue;
      expect(dividers.has(rule.selector)).toBe(true);
    }
    // The evidence trigger in particular: its affordance is a hover tint, never a line.
    expect(ruleFor(".fact-value.is-swappable")).not.toContain("border-bottom");
    expect(ruleFor(".fact-value.is-swappable:hover")).toContain("background");
  });

  it("neutralises every animation and transition for reduced motion", () => {
    const block = stylesheet.slice(stylesheet.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(block).toContain("animation: none !important");
    expect(block).toContain("transition: none !important");
  });

  it("keeps motion inside the unhurried band and out of the way of loops", () => {
    const durations = rules.flatMap((rule) =>
      [...rule.body.matchAll(/animation:\s*[^;]*(?:^|[\s(])([\d.]+)(ms|s)\b/g)].map((match) =>
        match[2] === "s" ? Number(match[1]) * 1000 : Number(match[1])
      )
    );
    expect(durations.length).toBeGreaterThan(0);
    for (const duration of durations) {
      // Fast enough to follow, slow enough to read as deliberate rather than as a flicker.
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThanOrEqual(2500);
    }
  });

  it("declares the two indefinite animations the Interaction Spec allows", () => {
    // Everything else animates once and stops.
    const infinite = rules
      .flatMap((rule) => [...rule.body.matchAll(/animation:\s*([\w-]+)[^;]*infinite/g)])
      .map((match) => match[1]);
    expect(new Set(infinite)).toEqual(new Set(["working", "stage-breath"]));
  });

  it("gives every loop a curve with non-zero slope at both ends", () => {
    // A 360° loop eased with a zero-slope curve stalls visibly at the seam.
    const curves = rules
      .flatMap((rule) => [
        ...rule.body.matchAll(/animation:[^;]*cubic-bezier\(([^)]+)\)[^;]*infinite/g)
      ])
      .map((match) => (match[1] as string).split(",").map((part) => Number(part.trim())));
    expect(curves.length).toBeGreaterThan(0);
    for (const [x1, y1, x2, y2] of curves) {
      expect((y1 as number) / ((x1 as number) || Number.EPSILON)).toBeGreaterThan(0);
      expect((1 - (y2 as number)) / (1 - (x2 as number) || Number.EPSILON)).toBeGreaterThan(0);
    }
  });

  it("lays every screen header out the same way", () => {
    // One header shape: the back affordance and the screen's own title group on the same row.
    // Without it the chevron sat on a line of its own on some screens and shared a row on others.
    for (const selector of [".review-header", ".course-header", ".settings-header"]) {
      expect(ruleFor(selector)).toContain("display: flex");
    }
    // Only the masthead's wordmark is the brand; a screen heading must not borrow that class.
    expect(rules.some((rule) => rule.selector === ".screen-title")).toBe(true);
  });

  it("lets no screen-scoped rule re-lay-out a shared header", () => {
    // `.prompt-screen .course-header { display: grid }` outranked the shared header rule and threw
    // that screen's back affordance into the middle of the row. A header's layout belongs to one
    // rule; a screen may style its own content, not the header's box.
    const headers = [".course-header", ".review-header", ".settings-header", ".masthead"];
    for (const rule of rules) {
      const scoped = headers.some(
        (header) => rule.selector.includes(header) && rule.selector !== header
      );
      if (!scoped) continue;
      // The override that broke this was `align-items`, not `display`, so both are barred.
      expect(rule.body).not.toMatch(/display\s*:/);
      expect(rule.body).not.toMatch(/align-items\s*:/);
    }
  });

  it("sizes the Product Mark container to the image it holds", () => {
    // The mark was once a CSS-shape placeholder in a fixed 26px box; dropping a 48px image into
    // that box overflowed it and the mark overlapped the wordmark. Both halves are required.
    const box = ruleFor(".brand-mark");
    expect(box).toMatch(/width:\s*\d+px/);
    expect(box).toMatch(/height:\s*\d+px/);
    // The export's art sits inside a transparent margin, so a box at or below that margin would
    // render the mark smaller than it looks and the fold detail closes up.
    expect(Number(/width:\s*(\d+)px/.exec(box)?.[1])).toBeGreaterThanOrEqual(28);
    expect(ruleFor(".brand-mark-image")).toContain("width: 100%");
    expect(ruleFor(".brand-mark-image")).toContain("height: 100%");
  });

  it("animates the state changes the Interaction Spec calls out", () => {
    for (const selector of [
      ".is-evidence",
      ".is-fact",
      ".task-phase.is-working",
      ".notice",
      ".more-items"
    ]) {
      expect(ruleFor(selector)).toContain("animation");
    }
  });

  it("left-aligns text in a control its container stretches", () => {
    // A button centres its own text. `.more-menu` and `.more-items` are grids, so their buttons
    // stretch to the full column — `More` and every menu entry drew themselves in the middle of the
    // page while every line around them started at the left edge.
    for (const selector of [".link-action", ".menu-item"]) {
      expect(ruleFor(selector)).toContain("text-align: left");
    }
  });

  it("gives a page the same room above it as below", () => {
    // The content block once started 24px from the top while the column sat ~54px from the window's
    // side edges, so a page read as pushed up. Top now equals bottom, and both are the side padding
    // plus 16 — the rule the design system states, checked rather than trusted.
    const paddingOf = (selector: string): number[] =>
      (/padding:\s*([^;]+)/.exec(ruleFor(selector))?.[1] ?? "")
        .split(/\s+/)
        .map((part) => Number(part.replace("px", "")));
    for (const selector of [".screen", 'html[data-surface="side-panel"] .screen']) {
      const [top, sides, bottom] = paddingOf(selector);
      expect(`${selector} top/bottom: ${String(top)}/${String(bottom)}`).toBe(
        `${selector} top/bottom: ${String(bottom)}/${String(bottom)}`
      );
      expect(`${selector} top vs sides: ${String(top)}`).toBe(
        `${selector} top vs sides: ${String((sides ?? 0) + 16)}`
      );
    }
    // The narrow-viewport rule has to agree with the Side Panel it mirrors.
    const narrow = /@media \(max-width: 560px\)[\s\S]*?\.screen \{\s*padding:\s*([^;]+);/.exec(
      stylesheet
    )?.[1];
    expect(narrow).toBe("32px 16px 32px");
  });

  it("alternates the Dashboard's card tones so no two neighbours match", () => {
    // The Dashboard is a checkerboard: no two cards that touch share a tone. Plain parity is a
    // checkerboard only at an odd column count, so the two-column case states the pattern itself.
    expect(ruleFor(".course-grid .course-card:nth-child(odd)")).toContain(
      "background: var(--surface)"
    );
    expect(ruleFor(".course-grid .course-card:nth-child(even)")).toContain(
      "background: var(--surface-2)"
    );
    // Every card takes the tone of the position it sits in — including one that has not been set up,
    // which is marked by a line at its foot rather than by a different box. No rule may give an
    // untouched card a background of its own.
    const untouchedBackgrounds = rules.filter(
      (rule) => rule.selector.includes(".is-untouched") && /background\s*:/.test(rule.body)
    );
    expect(untouchedBackgrounds.map((rule) => rule.selector)).toEqual([]);

    // The two-column breakpoints have to be the ones the grid actually produces, or the pattern
    // silently comes apart when the card width or the gap changes. Recomputed from the rule.
    const grid = ruleFor(".course-grid");
    const minCard = Number(/minmax\((\d+)px/.exec(grid)?.[1]);
    const gap = Number(/gap:\s*(\d+)px/.exec(grid)?.[1]);
    const screenPadding = (/padding:\s*([^;]+)/.exec(ruleFor(".screen"))?.[1] ?? "")
      .split(/\s+/)
      .map((part) => Number(part.replace("px", "")));
    const sidePadding = screenPadding[1] ?? 0;
    expect(minCard).toBeGreaterThan(0);
    const columnsAt = (viewport: number): number => {
      const content = Math.min(1120, viewport) - 2 * sidePadding;
      return Math.floor((content + gap) / (minCard + gap));
    };
    const twoColumnWidths: number[] = [];
    for (let viewport = 320; viewport <= 2000; viewport += 1) {
      if (columnsAt(viewport) === 2) twoColumnWidths.push(viewport);
    }
    const bounds = /@media \(min-width: (\d+)px\) and \(max-width: (\d+)px\)/.exec(stylesheet);
    expect(bounds).not.toBeNull();
    expect([Number(bounds?.[1]), Number(bounds?.[2])]).toEqual([
      twoColumnWidths[0],
      twoColumnWidths[twoColumnWidths.length - 1]
    ]);
    // Four columns need 1168px of content and the column is at most 1072px, so the pattern above
    // never has to cover an even count other than two.
    expect(columnsAt(2000)).toBeLessThanOrEqual(3);
  });

  it("lets no screen-scoped rule reach the masthead's wordmark", () => {
    // `.settings-screen .product-name` was written for the restore screens' page title, but
    // `.settings-screen` matches the masthead as well: a 22px bottom margin made the wordmark's
    // margin box 48px inside the 28px masthead row, so centring drew it 10px above the top of its
    // own row on every Settings screen. Only the brand itself may style the wordmark.
    for (const rule of rules) {
      if (!rule.selector.includes(".product-name")) continue;
      expect([".product-name", ".masthead .product-name"]).toContain(rule.selector);
    }
    // And the wordmark must carry no vertical margin of its own for a page rule to inflate.
    expect(ruleFor(".product-name")).toContain("margin: 0");
  });

  it("spaces everything from the one scale, by relationship", () => {
    // Nine steps, one meaning each; see design-system.md §6.2. The scale had drifted — "inside a
    // card" alone was carrying 8/10/14/16/18 and "two things on one line" was carrying
    // 8/10/12/14/16. No single value was wrong; five values for one relationship is what reads as
    // untidiness the eye cannot name. This test is what makes the scale binding rather than advice.
    const scale = new Set([2, 4, 6, 8, 10, 12, 16, 22, 28]);
    // Neither of these is a distance between two things. Page padding is a page margin; the label
    // column is a measurement that aligned values are indented to (width + the column gap).
    const outsideTheScale = new Set([24, 32, 40, 96, 106, 116, 126]);
    // A negative margin is a pull, and its magnitude is what has to be on the scale.
    const spaced = /^(margin|padding|gap|row-gap|column-gap)(-[a-z]+)?$/;
    const offenders = rules.flatMap((rule) =>
      rule.body
        .split(";")
        .map((declaration) => declaration.trim())
        .filter((declaration) => declaration.length > 0)
        .flatMap((declaration) => {
          const [property, ...value] = declaration.split(":");
          if (!spaced.test((property ?? "").trim())) return [];
          return [...value.join(":").matchAll(/-?\d+px/g)]
            .map((match) => Math.abs(Number(match[0].replace("px", ""))))
            .filter((size) => size !== 0 && !scale.has(size) && !outsideTheScale.has(size))
            .map((size) => `${rule.selector} ${declaration} (${String(size)}px)`);
        })
    );
    expect(offenders).toEqual([]);
  });

  it("keeps the label column and the values aligned to it in step", () => {
    // `.competing-values` is indented to where a fact value's first character sits: the label's
    // width plus the column gap between label and value. Three numbers, one fact — changing the
    // label width without the indent breaks the column, which is invisible until you see it.
    const factGap = ruleFor(".fact");
    const columnGap = Number(/(?:column-gap:\s*|gap:\s*\S+\s+)(\d+)px/.exec(factGap)?.[1]);
    expect(columnGap).toBeGreaterThan(0);
    // [label rule, aligned-values rule, the label column's width] per density.
    const densities: Array<[string, string, number]> = [
      [".fact-label", ".competing-values", 116],
      [
        'html[data-surface="side-panel"] .fact-label',
        'html[data-surface="side-panel"] .competing-values',
        96
      ]
    ];
    for (const [labelSelector, valuesSelector, width] of densities) {
      expect(ruleFor(labelSelector)).toContain(`min-width: ${String(width)}px`);
      expect(ruleFor(valuesSelector)).toContain(`padding-left: ${String(width + columnGap)}px`);
    }
  });
});
