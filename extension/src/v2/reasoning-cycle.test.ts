import { expect, it } from "vitest";
import { ReasoningCycleGuard } from "./reasoning-cycle";
it("does not mistake repeated JSON property layouts for a reasoning loop", () => {
  const guard = new ReasoningCycleGuard();
  for (let i = 0; i < 10; i++) {
    expect(
      guard.add(
        `Construct independent proposition ${String(i)}.\n{\n"relation":"INDEPENDENT",\n"modality":"descriptive",\n"conditions":[],\n"exceptions":[]\n}\n`
      )
    ).toBe(false);
  }
});
it("permits two verification passes and stops a third identical checkpoint sequence across token fragments", () => {
  const guard = new ReasoningCycleGuard();
  const checkpoint =
    "Check the authored deadline and its applicability.\nCheck the independent submission channel.\nCheck the exception and its evidence.\n";
  for (const char of checkpoint.repeat(2)) expect(guard.add(char)).toBe(false);
  let stopped = false;
  for (const char of checkpoint) {
    if (guard.add(char)) {
      stopped = true;
      break;
    }
  }
  expect(stopped).toBe(true);
});
it("does not turn long evolving reasoning into a normal workload token ceiling", () => {
  const guard = new ReasoningCycleGuard();
  for (let i = 0; i < 20000; i++)
    expect(
      guard.add(`New independent evidence reference ${String(i)} with different applicability.\n`)
    ).toBe(false);
});
