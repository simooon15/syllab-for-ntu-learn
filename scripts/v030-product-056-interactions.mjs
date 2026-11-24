/** Actual shipped UI on isolated clones. Diagnostic seed is never semantic/Human acceptance. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { waitNativeCondition } from "./qa-native-wait.mjs";
import { verifyCandidateBinding } from "./qa-candidate-binding.mjs";
const priv = resolve(
    process.argv.find((arg) => arg.startsWith("--output-dir="))?.slice("--output-dir=".length) ??
      "evidence/private/gate5-remediation-056"
  ),
  diagnostic = process.argv.includes("--diagnostic-ui");
const captureAllScopes = process.argv.includes("--capture-all-scopes");
const entry = JSON.parse(
  await fs.readFile(join(priv, diagnostic ? "DIAGNOSTIC_QA_ENTRY.json" : "QA_ENTRY.json"), "utf8")
);
const results = [];
for (const width of [380, 1280]) {
  const profile = await fs.mkdtemp(join(priv, `click-${String(width)}-`));
  await fs.cp(entry.profile, profile, { recursive: true });
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    reducedMotion: "reduce",
    viewport: { width, height: 900 },
    args: [`--disable-extensions-except=${entry.extension}`, `--load-extension=${entry.extension}`]
  });
  try {
    await context.route("https://**/*", (r) => r.abort());
    const control = await context.newPage();
    await control.goto(entry.origin + "/control.html");
    const inspect = () => control.evaluate((id) => window.inspect054(id), entry.courseId);
    const initial = await inspect();
    const candidateBinding = verifyCandidateBinding(
      entry,
      await control.evaluate((id) => window.archive056(id), entry.courseId)
    );
    assert.equal(initial.decisions.length, 0);
    assert.equal(initial.trusted.facts.length, 0);
    assert.equal(initial.trusted.constraints.length, 0, "PENDING_RULE_SUMMARY_LEAK");
    const page = await context.newPage();
    await page.goto(entry.url);
    await page.evaluate(async (e) => {
      const r = await chrome.runtime.sendMessage({
        contract: 2,
        type: "OPEN_SCREEN",
        surface: "full-page",
        screen: "IRV-01",
        courseId: e.courseId
      });
      if (!r.ok) throw Error(r.error.code);
    }, entry);
    await page.reload();
    await page.locator(".review-navigation select").waitFor();
    const getView = () =>
      page.evaluate(async () => {
        const r = await chrome.runtime.sendMessage({
          contract: 2,
          type: "GET_VIEW",
          surface: "full-page"
        });
        if (!r.ok) throw Error(r.error.code);
        return r.view;
      });
    const visit = async (id) => {
      await page.locator(".review-navigation select").selectOption(id);
      await waitNativeCondition(
        page,
        async (id) => {
          const r = await chrome.runtime.sendMessage({
            contract: 2,
            type: "GET_VIEW",
            surface: "full-page"
          });
          return r.ok && r.view.review?.reviewItemId === id;
        },
        id
      );
    };
    const ids = initial.snapshot.reviewItems.map((i) => i.reviewItemId);
    const scopeScreenshots = [];
    const scopeDirectory = join(profile, "review-scopes");
    if (captureAllScopes) await fs.mkdir(scopeDirectory, { recursive: true });
    for (const [index, id] of ids.entries()) {
      await visit(id);
      if (captureAllScopes) {
        const screenshot = join(scopeDirectory, `scope-${index + 1}.png`);
        await page.screenshot({ path: screenshot, fullPage: true, timeout: 30000 });
        scopeScreenshots.push({ reviewItemId: id, screenshot });
      }
    }
    assert.equal((await inspect()).decisions.length, 0);
    assert.equal((await inspect()).trusted.facts.length, 0);
    await visit(ids[0]);
    await page.screenshot({
      path: join(priv, `diagnostic-nav-${String(width)}.png`),
      fullPage: true,
      timeout: 30000
    });
    const beforeDefer = (await getView()).review.reviewItemId;
    await page.getByRole("button", { name: "Review later", exact: true }).click();
    await waitNativeCondition(
      control,
      async ({ courseId, id }) => {
        const s = await window.inspect054(courseId);
        return (
          s.snapshot.reviewItems.find((i) => i.reviewItemId === id)?.payload.deferredAt !==
          undefined
        );
      },
      { courseId: entry.courseId, id: beforeDefer }
    );
    await page.reload();
    assert.notEqual((await getView()).review.reviewItemId, beforeDefer);
    const excluded = (await getView()).review.reviewItemId;
    await page.getByRole("button", { name: "Exclude", exact: true }).click();
    await waitNativeCondition(
      control,
      async ({ courseId, id }) =>
        !(await window.inspect054(courseId)).snapshot.reviewItems.some(
          (i) => i.reviewItemId === id
        ),
      { courseId: entry.courseId, id: excluded }
    );
    await page.reload();
    await page.locator(".excluded-reviews summary").click();
    await page
      .getByRole("button", { name: /^Undo exclusion ·/ })
      .first()
      .click();
    await waitNativeCondition(
      control,
      async ({ courseId, id }) =>
        (await window.inspect054(courseId)).snapshot.reviewItems.some((i) => i.reviewItemId === id),
      { courseId: entry.courseId, id: excluded }
    );
    assert.equal((await inspect()).trusted.facts.length, 0);
    const snap = (await inspect()).snapshot;
    const target = snap.reviewItems.find(
      (i) =>
        i.payload.ownerScope &&
        i.payload.scopeFactIds?.length &&
        snap.facts.some(
          (f) => i.payload.scopeFactIds.includes(f.factId) && f.value.state === "KNOWN"
        )
    );
    assert(target);
    await visit(target.reviewItemId);
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const selected = target.payload.scopeFactIds.find(
      (id) => snap.facts.find((f) => f.factId === id)?.value.state === "KNOWN"
    );
    assert(selected);
    const state = page.locator(
      `select[data-edit-key="review:${target.reviewItemId}:state:${selected}"]`
    );
    await state.selectOption("UNCERTAIN");
    const facets = {
      modality: "permitted",
      conditions: ["DIAGNOSTIC: only if assigned"],
      exceptions: []
    };
    const sourceFact = snap.facts.find((f) => f.factId === selected);
    assert(sourceFact?.product || sourceFact?.semanticClause);
    await page
      .locator(`input[data-edit-key="review:${target.reviewItemId}:modality:${selected}"]`)
      .fill(facets.modality);
    await page
      .locator(`textarea[data-edit-key="review:${target.reviewItemId}:conditions:${selected}"]`)
      .fill(facets.conditions.join("\n"));
    await page
      .locator(`textarea[data-edit-key="review:${target.reviewItemId}:exceptions:${selected}"]`)
      .fill("");
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await waitNativeCondition(
      control,
      async ({ courseId, id }) =>
        (await window.inspect054(courseId)).snapshot.facts.find((f) => f.factId === id)?.value
          .state === "UNCERTAIN",
      { courseId: entry.courseId, id: selected }
    );
    await page.reload();
    const after = await inspect();
    const changedFact = after.snapshot.facts.find((f) => f.factId === selected);
    assert(changedFact?.userEdited);
    assert.deepEqual(changedFact.humanSemantics, facets);
    assert.deepEqual(changedFact.product, sourceFact.product);
    assert.deepEqual(changedFact.semanticClause, sourceFact.semanticClause);
    assert.deepEqual(changedFact.evidenceRefs, sourceFact.evidenceRefs);
    assert(!after.snapshot.reviewItems.some((i) => i.reviewItemId === target.reviewItemId));
    assert(after.snapshot.reviewItems.length > 0);
    assert.equal(after.trusted.constraints.length, 0, "UNREVIEWED_RULES_MUST_NOT_BE_BRIEF");
    for (const r of after.snapshot.reviewItems)
      for (const id of r.payload.scopeFactIds ?? [])
        assert(!after.trusted.facts.some((f) => f.factId === id));
    const edited = after.decisions.find((d) => d.kind === "Edit");
    assert.deepEqual(edited.details.scopeFactIds, target.payload.scopeFactIds);
    assert.equal(edited.details.courseRevision, snap.course.currentRevision);
    assert.deepEqual(
      edited.details.acceptedFacts.find((f) => f.factId === selected).humanSemantics,
      facets
    );
    await page.evaluate(async (id) => {
      const r = await chrome.runtime.sendMessage({
        contract: 2,
        type: "OPEN_SCREEN",
        surface: "full-page",
        screen: "CRS-01",
        courseId: id
      });
      if (!r.ok) throw Error(r.error.code);
    }, entry.courseId);
    await page.reload();
    const displayedFact = page.locator(`.fact[data-fact-id="${selected}"]`).first();
    if (!(await displayedFact.count()))
      await page
        .locator(
          `article.assessment[data-assessment-id="${sourceFact.assessmentId}"] button.assessment-name`
        )
        .first()
        .click();
    await displayedFact.waitFor({ state: "attached" });
    const ancestors = displayedFact.locator("xpath=ancestor::details");
    for (let i = 0; i < (await ancestors.count()); i++) {
      const detail = ancestors.nth(i);
      if ((await detail.getAttribute("open")) === null)
        await detail.locator(":scope > summary").click();
    }
    await displayedFact.waitFor({ state: "visible" });
    assert((await displayedFact.innerText()).includes(facets.conditions[0]));
    if (!(await page.locator(".assessment-detail").count())) {
      await page
        .locator(
          `article.assessment[data-assessment-id="${sourceFact.assessmentId}"] button.assessment-name`
        )
        .first()
        .click();
    }
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    assert.equal(
      await page.locator(`input[data-edit-key="fact:${selected}"]`).inputValue(),
      changedFact.value.value
    );
    await page.locator(`select[data-edit-key="fact:${selected}:state"]`).selectOption("KNOWN");
    const briefFacets = {
      modality: "must",
      conditions: ["DIAGNOSTIC: final approved condition"],
      exceptions: ["DIAGNOSTIC: approved exception"]
    };
    await page
      .locator(`input[data-edit-key="fact:${selected}:modality"]`)
      .fill(briefFacets.modality);
    await page
      .locator(`textarea[data-edit-key="fact:${selected}:conditions"]`)
      .fill(briefFacets.conditions.join("\n"));
    await page
      .locator(`textarea[data-edit-key="fact:${selected}:exceptions"]`)
      .fill(briefFacets.exceptions.join("\n"));
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await waitNativeCondition(
      control,
      async ({ courseId, id }) =>
        (await window.inspect054(courseId)).snapshot.facts.find((f) => f.factId === id)
          ?.humanSemantics?.modality === "must",
      { courseId: entry.courseId, id: selected }
    );
    await page.reload();
    const briefEdited = (await inspect()).snapshot.facts.find((f) => f.factId === selected);
    assert.deepEqual(briefEdited.humanSemantics, briefFacets);
    assert.equal(briefEdited.value.state, "KNOWN");
    assert.equal(
      briefEdited.value.value,
      changedFact.value.value,
      "QUALIFIERS_MUST_NOT_BE_COPIED_INTO_VALUE"
    );
    assert.deepEqual(briefEdited.semanticClause, sourceFact.semanticClause);
    assert.deepEqual(briefEdited.product, sourceFact.product);
    const referenceFacts = initial.snapshot.facts.filter(
      (f) => f.product && ["REFERENCE", "BACKGROUND"].includes(f.product.disposition)
    );
    if (referenceFacts.length) {
      const referenceIds = referenceFacts.map((f) => f.factId);
      for (const item of initial.snapshot.reviewItems)
        assert(
          !item.payload.scopeFactIds?.some((id) => referenceIds.includes(id)),
          "REFERENCE_APPROVAL_LEAK"
        );
      const brief = (await getView()).course;
      assert(
        referenceIds.every((id) => brief.sourceContext.referenceFacts.some((f) => f.factId === id)),
        "REFERENCE_NOT_REACHABLE_IN_BRIEF"
      );
      const reference = page
        .locator(`.source-context-details .fact[data-fact-id="${referenceIds[0]}"]`)
        .first();
      await reference.waitFor({ state: "attached" });
      const referenceAncestors = reference.locator("xpath=ancestor::details");
      for (let i = 0; i < (await referenceAncestors.count()); i++) {
        const detail = referenceAncestors.nth(i);
        if ((await detail.getAttribute("open")) === null)
          await detail.locator(":scope > summary").click();
      }
      await reference.waitFor({ state: "visible" });
      assert((await reference.innerText()).length > 0);
      for (const id of referenceIds) {
        const row = page.locator(`.source-context-details .fact[data-fact-id="${id}"]`).first();
        const parents = row.locator("xpath=ancestor::details");
        for (let i = 0; i < (await parents.count()); i++) {
          const detail = parents.nth(i);
          if ((await detail.getAttribute("open")) === null)
            await detail.locator(":scope > summary").click();
        }
        assert(await row.isVisible(), "REFERENCE_RENDERING_UNREACHABLE");
      }
      assert(
        !(await inspect()).trusted.facts.some((f) => referenceIds.includes(f.factId)),
        "REFERENCE_TRUST_LEAK"
      );
    }
    if (!(await page.locator(`.fact[data-fact-id="${selected}"]`).count()))
      await page
        .locator(
          `article.assessment[data-assessment-id="${sourceFact.assessmentId}"] button.assessment-name`
        )
        .first()
        .click();
    await page.locator(`.fact[data-fact-id="${selected}"]`).first().waitFor({ state: "attached" });
    const screenshot = join(priv, `diagnostic-after-edit-${String(width)}.png`);
    await page.screenshot({ path: screenshot, fullPage: true, timeout: 30000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, "MOBILE_HORIZONTAL_OVERFLOW");
    results.push({
      width,
      profile,
      ...candidateBinding,
      browsed: ids.length,
      decisionsBeforeBrowse: 0,
      trustedBeforeDecisions: 0,
      deferAdvanced: true,
      excludeUndoReload: true,
      editUncertainPersisted: true,
      humanFacetsPersistedAndDisplayed: true,
      briefEditFacetsAndKnowledgePersisted: true,
      qualifiersNotDuplicatedIntoValue: true,
      immutableProvenancePreserved: true,
      scopeIDsRecorded: true,
      independentPendingUntrusted: true,
      referenceReachableWithoutApproval: referenceFacts.length > 0,
      paidCalls: 0,
      semanticAcceptance: false,
      humanAcceptance: false,
      diagnosticSeed: diagnostic,
      screenshot,
      scopeScreenshots
    });
    await fs.writeFile(
      join(priv, diagnostic ? "diagnostic-interactions.json" : "interactions.json"),
      JSON.stringify(results, null, 2) + "\n"
    );
    process.stdout.write(JSON.stringify({ phase: "viewport-verified", width }) + "\n");
  } finally {
    await context.close();
  }
}
await fs.writeFile(
  join(priv, diagnostic ? "diagnostic-interactions.json" : "rc2-interactions.json"),
  JSON.stringify(results, null, 2) + "\n"
);
console.log(
  JSON.stringify({
    status: "INTERACTION_CHECKS_PASS_NOT_HUMAN_ACCEPTANCE",
    viewports: results.map((r) => r.width),
    paidCalls: 0,
    diagnosticSeed: diagnostic
  })
);
