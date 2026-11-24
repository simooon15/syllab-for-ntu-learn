import { describe, it, expect } from "vitest";
import {
  runDirectCourse,
  type DirectRun,
  type DirectCapture,
  type DirectRunPort
} from "./direct-course-runner";
import { prepareDirectCourse, DIRECT_COURSE_SCHEMA, type DirectCourseInput } from "./direct-course";
import { TASK_B_SCHEMA } from "./ai-contracts";

const input: DirectCourseInput = {
  course: { courseCode: "TEST", courseName: "Synthetic" },
  sources: [
    {
      sourceId: "s",
      courseId: "c",
      nativeItemId: "n",
      title: "Synthetic",
      kind: "attachment",
      updatedAt: "now",
      parsed: { text: "Synthetic text", structure: [] }
    }
  ]
};
function captured(): DirectCapture {
  return {
    raw: JSON.stringify({
      schema: DIRECT_COURSE_SCHEMA,
      snapshot: prepareDirectCourse(input, "id").snapshot,
      coverage: [
        {
          sourceId: "s",
          examinedNativeLocators: ["native-text"],
          unresolvedNativeLocators: [],
          limitations: []
        }
      ],
      output: {
        schema: TASK_B_SCHEMA,
        identityResolutions: [],
        canonicalAssessmentProposals: [],
        courseWideConstraintProposals: [],
        fieldConsolidationResults: [],
        structuralRelationships: [],
        unresolvedIssues: []
      }
    }),
    finishReason: "stop",
    streamDone: true,
    usage: { inputTokens: 10, outputTokens: 10, usageKnown: true }
  };
}
function harness() {
  const records = new Map<string, DirectRun>();
  let authorized = false;
  let executions = 0;
  let reply = captured();
  let transportError = false;
  let crashOnAccept = false;
  const port: DirectRunPort = {
    load: async (id) => {
      await Promise.resolve();
      const r = records.get(id);
      return r ? structuredClone(r) : undefined;
    },
    claim: async (run) => {
      await Promise.resolve();
      if (records.has(run.id)) return false;
      records.set(run.id, structuredClone(run));
      return true;
    },
    save: async (run) => {
      await Promise.resolve();
      if (crashOnAccept && run.state === "accepted") throw Error("synthetic persistence crash");
      records.set(run.id, structuredClone(run));
    },
    authorize: async () => {
      await Promise.resolve();
      if (!authorized) throw Error("not authorized");
    },
    execute: async () => {
      await Promise.resolve();
      executions++;
      if (transportError) throw Error("synthetic connection loss");
      return reply;
    }
  };
  return {
    port,
    records,
    executions: () => executions,
    authorize: () => {
      authorized = true;
    },
    reply: (r: DirectCapture) => {
      reply = r;
    },
    transportError: () => {
      transportError = true;
    },
    crash: (on: boolean) => {
      crashOnAccept = on;
    }
  };
}
describe("isolated direct runtime durability", () => {
  it("fails closed without authorization and never dispatches on resume", async () => {
    const h = harness();
    expect((await runDirectCourse(input, "id", h.port)).run.state).toBe("blocked");
    h.authorize();
    expect((await runDirectCourse(input, "id", h.port)).run.state).toBe("blocked");
    expect(h.executions()).toBe(0);
  });
  it("atomically admits one concurrent dispatch and replays without spending", async () => {
    const h = harness();
    h.authorize();
    await Promise.all([runDirectCourse(input, "id", h.port), runDirectCourse(input, "id", h.port)]);
    expect(h.executions()).toBe(1);
    expect((await runDirectCourse(input, "id", h.port)).result).toBeDefined();
    expect(h.executions()).toBe(1);
  });
  it("preserves unknown connection outcome and forbids automatic retry", async () => {
    const h = harness();
    h.authorize();
    h.transportError();
    expect((await runDirectCourse(input, "id", h.port)).run.state).toBe("unverified");
    await runDirectCourse(input, "id", h.port);
    expect(h.executions()).toBe(1);
  });
  it.each([{ finishReason: "length" }, { streamDone: false }])(
    "rejects a parseable unfinished response %j",
    async (override) => {
      const h = harness();
      h.authorize();
      h.reply({ ...captured(), ...override });
      const r = await runDirectCourse(input, "id", h.port);
      expect(r.run.problem).toBe("INCOMPLETE");
      expect(r.result).toBeUndefined();
      expect(r.run.capture?.raw).toBe(captured().raw);
    }
  );
  it("retains invalid JSON verbatim, without manufacturing a final answer", async () => {
    const h = harness();
    h.authorize();
    h.reply({ ...captured(), raw: "{incomplete" });
    const r = await runDirectCourse(input, "id", h.port);
    expect(r.run.problem).toBe("JSON");
    expect(r.run.capture?.raw).toBe("{incomplete");
    await runDirectCourse(input, "id", h.port);
    expect(h.executions()).toBe(1);
  });
  it("recovers a captured response after persistence interruption without dispatch", async () => {
    const h = harness();
    h.authorize();
    h.crash(true);
    await expect(runDirectCourse(input, "id", h.port)).rejects.toThrow("persistence crash");
    expect(h.records.get("id")?.state).toBe("captured");
    h.crash(false);
    expect((await runDirectCourse(input, "id", h.port)).run.state).toBe("accepted");
    expect(h.executions()).toBe(1);
  });
  it("never reuses candidate output for changed source content", async () => {
    const h = harness();
    h.authorize();
    await runDirectCourse(input, "id", h.port);
    const changed = structuredClone(input);
    const source = changed.sources[0];
    if (!source?.parsed) throw Error("synthetic parsed missing");
    source.parsed.text = "Changed text";
    await expect(runDirectCourse(changed, "id", h.port)).rejects.toThrow("RESUME_MISMATCH");
    expect(h.executions()).toBe(1);
  });
});
it("recovers only an exact trailing Markdown fence and retains raw response bytes without another dispatch", async () => {
  const h = harness();
  h.authorize();
  const raw = captured().raw + "```";
  h.reply({ ...captured(), raw });
  const result = await runDirectCourse(input, "fence", h.port);
  expect(result.run.state).toBe("accepted");
  expect(result.run.formatRecovery).toBe("TRAILING_MARKDOWN_FENCE");
  expect(result.run.capture?.raw).toBe(raw);
  await runDirectCourse(input, "fence", h.port);
  expect(h.executions()).toBe(1);
  const bad = harness();
  bad.authorize();
  bad.reply({ ...captured(), raw: captured().raw + " unwanted text" });
  expect((await runDirectCourse(input, "bad-tail", bad.port)).run.problem).toBe("JSON");
});
it("recovers unmatched closing delimiters without touching raw bytes and rejects a second answer", async () => {
  const h = harness();
  h.authorize();
  const raw = captured().raw + "}";
  h.reply({ ...captured(), raw });
  const r = await runDirectCourse(input, "extra-brace", h.port);
  expect(r.run.state).toBe("accepted");
  expect(r.run.formatRecovery).toBe("EXCESS_CLOSING_BRACES");
  expect(r.run.capture?.raw).toBe(raw);
  await runDirectCourse(input, "extra-brace", h.port);
  expect(h.executions()).toBe(1);
  const two = harness();
  two.authorize();
  two.reply({ ...captured(), raw: captured().raw + "{}" });
  expect((await runDirectCourse(input, "second-answer", two.port)).run.problem).toBe("JSON");
});
