import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Every message the contract declares must have a case in the handler.
 *
 * Calendar Export was declared in `ViewMessage`, sent by the surface, and never handled: the
 * message fell to the handler's `default` and the user got "This action is not available." The
 * type system could not see it — the union and the switch are not connected — and a render test
 * cannot see it either, because the screen it renders was never the problem.
 *
 * This is a source-level check rather than a behavioural one. It proves the case exists, not that
 * it works; what it works on is covered by the tests around each message.
 */

const read = async (relative: string): Promise<string> =>
  readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const contract = await read("./contract.ts");
const handler = await read("./handler.ts");

/** The `ViewMessage` union, sliced out so `Mutation`'s kinds are not mistaken for message types. */
const union = contract.slice(
  contract.indexOf("export type ViewMessage ="),
  contract.indexOf("export type Mutation =")
);

const declared = [...union.matchAll(/^\s*type:\s*"([A-Z_]+)"/gm)].map(
  (match) => match[1] as string
);
const handled = new Set(
  [...handler.matchAll(/^\s*case "([A-Z_]+)":/gm)].map((match) => match[1] as string)
);

describe("the message contract and the handler", () => {
  it("declares message types to check", () => {
    expect(declared.length).toBeGreaterThan(0);
  });

  it("handles every message the contract declares", () => {
    expect(declared.filter((type) => !handled.has(type))).toEqual([]);
  });
});
