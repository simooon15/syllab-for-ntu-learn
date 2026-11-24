/** Isolated synthetic profile only. Every provider reply is injected; network generation is blocked. */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launchExtension } from "./lib/browser-harness.mjs";

const compiled = await build({
  stdin: {
    contents: `export { WorkflowEngine } from './extension/src/v2/workflow';
      export { LocalStore } from './extension/src/v2/store';
      export { LocalDatabase } from './extension/src/v2/storage';
      export { RebuildStagingStore } from './extension/src/v2/staging';
      export { runSession } from './extension/src/v2/architecture-runner';`,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  globalName: "GZeroArchitecture"
});
const app = await launchExtension();
let attemptedGeneration = 0;
await app.fullPage.context().route("**/chat/completions**", async (route) => {
  attemptedGeneration++;
  await route.abort();
});
try {
  await app.fullPage.evaluate(compiled.outputFiles[0].text);
  const workflow = await app.fullPage.evaluate(async () => {
    const { WorkflowEngine, LocalStore, LocalDatabase, RebuildStagingStore } =
      globalThis.GZeroArchitecture;
    const store = new LocalStore(new LocalDatabase());
    await store.initialize();
    const course = {
      courseId: "g-zero-synthetic",
      semesterId: "synthetic",
      courseCode: "ZERO",
      courseName: "Synthetic course",
      curriculum: true,
      established: false,
      currentRevision: 0,
      consecutiveCheckFailures: 0,
      updatedAt: "2026-10-08T00:00:00.000Z"
    };
    await store.upsertCourse(course);
    await store.writeDraft({
      assessments: [
        {
          assessmentId: "synthetic-user",
          courseId: course.courseId,
          name: "Preserved user object",
          aliases: [],
          role: "assessment",
          kind: "other",
          createdBy: "user",
          marks: ["Edited"],
          createdAt: course.updatedAt,
          updatedAt: course.updatedAt
        }
      ]
    });
    const sourceIds = ["synthetic-a", "synthetic-b"];
    const calls = [];
    const ai = {
      apiKey: () => Promise.resolve("injected-provider-only"),
      privacyAuthorized: () => Promise.resolve(true),
      usageAuthorized: () => Promise.resolve(true),
      execute: (call) => {
        calls.push({ task: call.task, promptVersion: call.promptVersion });
        const envelope = JSON.parse(call.user),
          input = JSON.parse(envelope.delivery);
        let output;
        if (call.promptVersion === "a-session/4") {
          const sourceId = input.index.sourceId;
          output = {
            schema: "syllab.ai.task-a/1",
            sourceId,
            sourceResult: "RELEVANT_INFORMATION_FOUND",
            assessmentDrafts: [
              {
                draftId: "d",
                name: "Synthetic task",
                type: "assignment",
                role: "assessment",
                aliases: [],
                fields: [
                  {
                    fieldName: "weight",
                    state: "KNOWN",
                    value: "20%",
                    competingValues: [],
                    evidence: [
                      {
                        evidenceId: "local-e1",
                        sourceId,
                        locator: "native-body",
                        excerpt: "Synthetic task 20%."
                      }
                    ]
                  }
                ],
                requirements: [],
                unresolvedIssues: []
              }
            ],
            courseWideConstraintCandidates: [],
            unresolvedIssues: []
          };
        } else if (call.promptVersion === "b1-session/4") {
          output = {
            operations: [
              {
                id: "group",
                recordId: "g",
                expectedRevision: 0,
                kind: "put",
                record: {
                  id: "g",
                  revision: 1,
                  kind: "group",
                  payload: { memberDraftIds: input.drafts.map((d) => d.id), trustedObjectId: null }
                }
              },
              ...input.drafts.map((d, i) => ({
                id: `op-${i}`,
                recordId: `disposition-${i}`,
                expectedRevision: 0,
                kind: "put",
                record: {
                  id: `disposition-${i}`,
                  revision: 1,
                  kind: "draft-disposition",
                  payload: { inputId: d.id, disposition: "assigned", targetId: "g" }
                }
              }))
            ]
          };
        } else {
          if (call.promptVersion !== "b2-session/4") throw Error("UNAUTHORIZED_STAGE");
          output = {
            schema: "syllab.ai.task-b/1",
            upstream: {
              groupId: input.group.id,
              revision: input.group.revision,
              memberDraftIds: input.group.payload.memberDraftIds
            },
            identityResolutions: [],
            canonicalAssessmentProposals: [
              {
                proposalId: "g",
                canonicalName: "Synthetic canonical task",
                type: "assignment",
                role: "assessment",
                aliases: [],
                consolidatedFields: input.members[0].payload.fields,
                requirements: [],
                supportingEvidence: input.members.flatMap((m) => m.payload.fields[0].evidence),
                unresolvedIssues: []
              }
            ],
            courseWideConstraintProposals: [],
            fieldConsolidationResults: [],
            structuralRelationships: [],
            unresolvedIssues: []
          };
        }
        return Promise.resolve({
          call,
          value: {
            schema: "syllab.ai/session/1",
            roundId: envelope.roundId,
            segmentId: envelope.segmentId,
            kind: "ROUND_COMPLETE_FINAL",
            carry: {},
            output
          },
          consumesApi: false
        });
      }
    };
    const machine = {
      missingPermissionOrigins: () => Promise.resolve([]),
      discover: () =>
        Promise.resolve({
          coverage: { status: "Complete", pagesProcessed: 1, issueCodes: [] },
          sources: sourceIds.map((sourceId) => ({
            sourceId,
            nativeItemId: sourceId,
            kind: "announcement",
            title: "Synthetic input"
          }))
        }),
      fetchAndParse: (source) =>
        Promise.resolve({
          sourceId: source.sourceId,
          nativeItemId: source.nativeItemId,
          kind: source.kind,
          title: source.title,
          text: "Synthetic task 20%.",
          structure: ["native-body"],
          units: [{ locator: "native-body", text: "Synthetic task 20%.", partial: false }],
          fetchStatus: "ok",
          parseStatus: "ok"
        })
    };
    const disabled = () => {
      throw Error("LEGACY_DISPATCH_FORBIDDEN");
    };
    const staging = new RebuildStagingStore(chrome.storage.local);
    const engine = new WorkflowEngine({
      store,
      machine,
      ai,
      staging,
      newArchitecture: true,
      clock: { now: () => new Date("2026-10-08T00:00:00.000Z") },
      buildTaskACalls: disabled,
      buildTaskAConsolidationCall: disabled,
      buildTaskBCalls: disabled,
      buildTaskBExpansionCall: disabled,
      buildTaskCCalls: disabled,
      planChunks: disabled
    });
    const before = await store.readTrustedSnapshot(course.courseId);
    const first = await engine.start(course, "initial");
    await engine.run(first.workflowId);
    const initial = await staging.read(course.courseId, first.workflowId);
    const count = calls.length;
    await engine.run(first.workflowId);
    const resumeCalls = calls.length - count;
    const check = await engine.start(course, "check");
    await engine.run(check.workflowId);
    const unchangedCalls = calls.length - count;
    const rebuild = await engine.start(course, "rebuild");
    await engine.run(rebuild.workflowId);
    const preview = await staging.read(course.courseId, rebuild.workflowId);
    const after = await store.readTrustedSnapshot(course.courseId);
    return {
      initialObjects: initial?.assessments.length,
      rebuiltObjects: preview?.assessments.length,
      independentStaging:
        first.workflowId !== rebuild.workflowId && initial.workflowId !== preview.workflowId,
      resumeCalls,
      unchangedCalls,
      trustedPreserved: JSON.stringify(before.assessments) === JSON.stringify(after.assessments),
      historyCount: (await store.readHistory(course.courseId)).length,
      calls,
      states: (await store.listWorkflows())
        .filter((w) =>
          [first.workflowId, check.workflowId, rebuild.workflowId].includes(w.workflowId)
        )
        .map((w) => ({ kind: w.kind, state: w.state }))
    };
  });
  assert.equal(workflow.initialObjects, 1);
  assert.equal(workflow.rebuiltObjects, 1);
  assert.equal(workflow.resumeCalls, 0);
  assert.equal(workflow.unchangedCalls, 0);
  assert.equal(workflow.trustedPreserved, true);
  assert.equal(workflow.independentStaging, true);
  assert.equal(workflow.historyCount, 0);
  assert.equal(workflow.calls.length, 8);
  assert(workflow.states.some((s) => s.kind === "check" && s.state === "complete"));
  await app.fullPage.reload();
  await app.fullPage.evaluate(compiled.outputFiles[0].text);
  const restart = await app.fullPage.evaluate(async () => {
    const { runSession } = globalThis.GZeroArchitecture;
    const prefix = "g-zero-restart";
    let dispatches = 0;
    const port = {
      load: async () => (await chrome.storage.local.get(prefix))[prefix],
      save: (session) => chrome.storage.local.set({ [prefix]: session }),
      resolve: (reads) => Promise.resolve(reads),
      validateFinal: (value) => {
        if (value.done !== true) throw Error("FINAL_INVALID");
      },
      execute: (call) => {
        dispatches++;
        const d = JSON.parse(call.user);
        return Promise.resolve({
          call,
          value: {
            schema: "syllab.ai/session/1",
            roundId: d.roundId,
            segmentId: d.segmentId,
            kind: "ROUND_COMPLETE_FINAL",
            carry: {},
            output: { done: true }
          },
          consumesApi: false
        });
      }
    };
    await runSession(prefix, "B2", {}, port);
    await runSession(prefix, "B2", {}, port);
    return {
      dispatches,
      effectiveRounds: (await chrome.storage.local.get(prefix))[prefix].effectiveRounds
    };
  });
  assert.deepEqual(restart, { dispatches: 1, effectiveRounds: 1 });
  await app.fullPage.reload();
  await app.fullPage.evaluate(compiled.outputFiles[0].text);
  const recovered = await app.fullPage.evaluate(async () => {
    let dispatches = 0;
    await globalThis.GZeroArchitecture.runSession(
      "g-zero-restart",
      "B2",
      {},
      {
        load: async () => (await chrome.storage.local.get("g-zero-restart"))["g-zero-restart"],
        save: (session) => chrome.storage.local.set({ "g-zero-restart": session }),
        resolve: (reads) => Promise.resolve(reads),
        execute: () => {
          dispatches++;
          throw Error("UNEXPECTED_REDISPATCH");
        },
        validateFinal: () => {}
      }
    );
    return { dispatches };
  });
  assert.deepEqual(recovered, { dispatches: 0 });
  assert.equal(attemptedGeneration, 0);
  const out = resolve(
    process.argv.includes("--p2e-034")
      ? "artifacts/v0.3.0/semantic-034/zero-browser"
      : "artifacts/v0.3.0/g-zero-033"
  );
  await mkdir(out, { recursive: true });
  const report = {
    status: "PASS",
    generatedAt: new Date().toISOString(),
    profile: "isolated synthetic",
    actualModelInvocations: 0,
    attemptedGeneration,
    workflow,
    restart,
    recoveredAfterReload: recovered,
    adoptionActions: 0
  };
  await writeFile(resolve(out, "browser.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await app.close();
}
