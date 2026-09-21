/**
 * A deliberately small DOM for the render tests. The repository runs vitest in a node
 * environment and does not take a DOM dependency, so the tests build the same tree the
 * extension builds in Chrome: elements, attributes, dataset, classes, events and selectors.
 *
 * It supports exactly the subset the renderer uses. Anything missing is a test that needs a
 * different assertion, not a reason to grow a browser.
 */

type Listener = (event: TestEvent) => void;

export interface TestEvent {
  type: string;
  target?: unknown;
  preventDefault(): void;
  stopPropagation(): void;
}

export interface TestFile {
  name: string;
  text(): Promise<string>;
}

function toAttributeName(key: string): string {
  return `data-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

export class TestNode {
  parentNode: TestNode | null = null;
  childNodes: TestNode[] = [];

  get textContent(): string {
    return this.childNodes.map((child) => child.textContent).join("");
  }

  set textContent(value: string) {
    const text = new TestText(value);
    text.parentNode = this;
    this.childNodes = value === "" ? [] : [text];
  }

  appendChild<T extends TestNode>(child: T): T {
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  append(...nodes: Array<TestNode | string>): void {
    for (const node of nodes) {
      this.appendChild(typeof node === "string" ? new TestText(node) : node);
    }
  }

  replaceChildren(...nodes: Array<TestNode | string>): void {
    this.childNodes = [];
    this.append(...nodes);
  }

  /** Standard DOM method the shell uses to put the identity line ahead of a screen's content. */
  prepend(...nodes: Array<TestNode | string>): void {
    const added = nodes.map((node) => (typeof node === "string" ? new TestText(node) : node));
    for (const node of added) node.parentNode = this;
    this.childNodes = [...added, ...this.childNodes];
  }

  remove(): void {
    const parent = this.parentNode;
    if (!parent) return;
    parent.childNodes = parent.childNodes.filter((child) => child !== this);
    this.parentNode = null;
  }
}

class TestText extends TestNode {
  constructor(private readonly data: string) {
    super();
  }

  override get textContent(): string {
    return this.data;
  }
}

export class TestElement extends TestNode {
  readonly tagName: string;
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Listener[]>();
  readonly dataset: Record<string, string>;

  className = "";
  id = "";
  value = "";
  type = "";
  checked = false;
  disabled = false;
  hidden = false;
  placeholder = "";
  accept = "";
  title = "";
  files: TestFile[] | null = null;
  scrollTop = 0;

  constructor(tagName: string) {
    super();
    this.tagName = tagName.toUpperCase();
    const attributes = this.attributes;
    const store: Record<string, string> = {};
    this.dataset = new Proxy(store, {
      get: (_target, key: string | symbol) =>
        typeof key === "string" ? attributes.get(toAttributeName(key)) : undefined,
      set: (_target, key: string | symbol, value: unknown) => {
        if (typeof key === "string") attributes.set(toAttributeName(key), String(value));
        return true;
      },
      has: (_target, key: string | symbol) =>
        typeof key === "string" && attributes.has(toAttributeName(key)),
      deleteProperty: (_target, key: string | symbol) => {
        if (typeof key === "string") attributes.delete(toAttributeName(key));
        return true;
      }
    });
  }

  get classList(): {
    contains(name: string): boolean;
    add(name: string): void;
    remove(name: string): void;
  } {
    const read = (): string[] => this.className.split(" ").filter((part) => part.length > 0);
    return {
      contains: (name) => read().includes(name),
      add: (name) => {
        if (!read().includes(name)) this.className = [...read(), name].join(" ");
      },
      remove: (name) => {
        this.className = read()
          .filter((part) => part !== name)
          .join(" ");
      }
    };
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name === "class") this.className = value;
    if (name === "id") this.id = value;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  addEventListener(type: string, listener: Listener): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((item) => item !== listener)
    );
  }

  dispatchEvent(event: TestEvent): void {
    for (const listener of this.listeners.get(event.type) ?? []) listener(event);
  }

  click(): void {
    this.dispatchEvent(createEvent("click", this));
  }

  querySelector(selector: string): TestElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): TestElement[] {
    const results: TestElement[] = [];
    for (const group of selector.split(",")) {
      const parts = parseSelector(group.trim());
      collectMatches(this, parts, results);
    }
    return results;
  }

  matches(selector: string): boolean {
    return this.querySelectorAll(selector).includes(this);
  }
}

interface SelectorPart {
  combinator: "" | " " | ">";
  tag: string | undefined;
  classes: string[];
  attributes: Array<{ name: string; value: string | undefined }>;
}

function parseSelector(selector: string): SelectorPart[] {
  const parts: SelectorPart[] = [];
  const tokens = selector
    .replace(/>/g, " > ")
    .split(/\s+/)
    .filter((token) => token.length > 0);
  let combinator: "" | " " | ">" = "";
  for (const token of tokens) {
    if (token === ">") {
      combinator = ">";
      continue;
    }
    parts.push({ combinator, ...parseCompound(token) });
    combinator = " ";
  }
  return parts;
}

function parseCompound(token: string): Omit<SelectorPart, "combinator"> {
  const tag = /^[a-zA-Z][a-zA-Z0-9-]*/.exec(token)?.[0];
  const classes = [...token.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map((match) => match[1] ?? "");
  const attributes = [...token.matchAll(/\[([^\]=]+)(?:=["']([^"']*)["'])?\]/g)].map((match) => ({
    name: match[1] ?? "",
    value: match[2]
  }));
  const id = /#([a-zA-Z0-9_-]+)/.exec(token)?.[1];
  return {
    tag,
    classes,
    attributes: id === undefined ? attributes : [...attributes, { name: "id", value: id }]
  };
}

function matchesPart(element: TestElement, part: Omit<SelectorPart, "combinator">): boolean {
  if (part.tag !== undefined && element.tagName !== part.tag.toUpperCase()) return false;
  for (const className of part.classes) {
    if (!element.classList.contains(className)) return false;
  }
  for (const attribute of part.attributes) {
    const value = attribute.name === "id" ? element.id : element.attributes.get(attribute.name);
    if (value === undefined) return false;
    if (attribute.value !== undefined && value !== attribute.value) return false;
  }
  return true;
}

function matchesSelector(element: TestElement, parts: SelectorPart[]): boolean {
  const last = parts[parts.length - 1];
  if (!last || !matchesPart(element, last)) return false;
  let current: TestElement | null = element;
  for (let index = parts.length - 2; index >= 0; index -= 1) {
    const part = parts[index] as SelectorPart;
    const next = parts[index + 1] as SelectorPart;
    if (next.combinator === ">") {
      current = current.parentNode instanceof TestElement ? current.parentNode : null;
      if (!current || !matchesPart(current, part)) return false;
      continue;
    }
    let ancestor: TestNode | null = current.parentNode;
    let found: TestElement | null = null;
    while (ancestor) {
      if (ancestor instanceof TestElement && matchesPart(ancestor, part)) {
        found = ancestor;
        break;
      }
      ancestor = ancestor.parentNode;
    }
    if (!found) return false;
    current = found;
  }
  return true;
}

function collectMatches(root: TestElement, parts: SelectorPart[], results: TestElement[]): void {
  for (const child of root.childNodes) {
    if (!(child instanceof TestElement)) continue;
    if (matchesSelector(child, parts)) results.push(child);
    collectMatches(child, parts, results);
  }
}

export function createEvent(type: string, target: TestElement): TestEvent {
  return {
    type,
    target,
    preventDefault: () => undefined,
    stopPropagation: () => undefined
  };
}

export class TestDocument {
  readonly documentElement: TestElement;
  readonly head: TestElement;
  readonly body: TestElement;
  readonly scrollingElement: TestElement;

  constructor() {
    this.documentElement = new TestElement("html");
    this.head = new TestElement("head");
    this.body = new TestElement("body");
    this.documentElement.append(this.head, this.body);
    this.scrollingElement = this.documentElement;
  }

  createElement(tag: string): TestElement {
    const element = new TestElement(tag);
    if (element.tagName === "OPTION") element.value = "";
    return element;
  }

  createTextNode(text: string): TestNode {
    const node = new TestText(text);
    return node;
  }

  querySelector(selector: string): TestElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): TestElement[] {
    return this.documentElement.querySelectorAll(selector);
  }
}

/** Installs the shim as the page the renderer sees. Call it before any render. */
export function installTestDom(surface: "side-panel" | "full-page" = "full-page"): TestDocument {
  const document = new TestDocument();
  document.documentElement.dataset.surface = surface;
  globalThis.document = document as unknown as typeof globalThis.document;
  globalThis.HTMLElement = TestElement as unknown as typeof globalThis.HTMLElement;
  return document;
}

/** A mount point for the runtime, mirroring `<main id="app">` in both HTML pages. */
export function installAppRoot(document: TestDocument): TestElement {
  const main = document.createElement("main");
  main.id = "app";
  document.body.append(main);
  return main;
}
