import assert from "node:assert/strict";
import { test } from "node:test";
import { logicalAuditScope, legacyAuditScope } from "./qa-logical-audit-scope.mjs";

const owner = () => ({
  taskRef: "task-before",
  entity: { ownerRef: "synthetic-assessment" },
  propositions: [{ propositionRef: "first" }, { propositionRef: "second" }],
  nativeContext: [
    { sourceId: "synthetic-source", locator: "page:1", excerpt: "Submit both parts." }
  ]
});

test("owner safety identity survives task, effort, context metadata and ordering changes", () => {
  const before = owner();
  const after = owner();
  after.taskRef = "task-after";
  after.reasoningEffort = "low";
  after.propositions.reverse();
  after.nativeContext[0].sourceContext = { title: "Additional provenance" };
  after.readOnlyCourseFrame = { origin: "saved cover page" };
  assert.equal(logicalAuditScope(before), logicalAuditScope(after));
  assert.equal(legacyAuditScope(before), "audit:task-before");
});

test("genuinely different owned scope or native body has a different identity", () => {
  const before = owner();
  const narrow = owner();
  narrow.propositions.pop();
  assert.notEqual(logicalAuditScope(before), logicalAuditScope(narrow));
  const changed = owner();
  changed.nativeContext[0].excerpt = "Submit either part.";
  assert.notEqual(logicalAuditScope(before), logicalAuditScope(changed));
});

test("composition is a distinct relation scope whose failed identity cannot change with dependency IDs", () => {
  const full = owner();
  const composition = {
    ...owner(),
    compositionScope: {
      operation: "owner-cross-group-composition/1",
      requiredLocalTaskRefs: ["one", "two"]
    }
  };
  assert.notEqual(logicalAuditScope(full), logicalAuditScope(composition));
  const changed = structuredClone(composition);
  changed.taskRef = "new-composition-task";
  changed.compositionScope.requiredLocalTaskRefs = ["new-one", "new-two"];
  assert.equal(logicalAuditScope(composition), logicalAuditScope(changed));
});

test("contract field completion remains separate from semantic repair", () => {
  const scope = {
    taskRef: "completion",
    contractCompletion: { operation: "missing-independent-review/1" }
  };
  assert.equal(logicalAuditScope(scope), "contract-completion:completion");
  assert.equal(legacyAuditScope(scope), undefined);
  assert.throws(() => logicalAuditScope({}), /UNKNOWN_AUDIT_SCOPE_UNREADABLE/);
});
