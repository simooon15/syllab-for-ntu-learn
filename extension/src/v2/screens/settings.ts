import { append, data, el } from "../../app/dom";
import { t } from "../copy";
import type { AppView, ScreenId } from "../contract";
import {
  actionRow,
  backAction,
  linkAction,
  noticeFor,
  primaryAction,
  screenNode,
  secondaryAction,
  sectionHeading,
  type ScreenContext,
  brandMark
} from "./patterns";

/** SET-01 … SET-05, BKP-01, BKP-02, BKP-05 — one Full-page Settings entry, four sections. */
export function renderSettings(ctx: ScreenContext): HTMLElement {
  const settings = ctx.view.settings;
  const root = screenNode(el("section", `screen settings-screen ${ctx.surface}`), "SET-01");
  const returnContext = ctx.view.returnContext;
  const header = el("header", "settings-header");
  header.append(
    backAction("previous", () => {
      ctx.open(
        returnContext?.screen ?? "SEM-01",
        returnContext?.courseId === undefined ? undefined : { courseId: returnContext.courseId }
      );
    }),
    el("h1", "screen-title", t("settingsTitle"))
  );
  root.append(header);
  append(root, noticeFor(ctx));
  if (!settings) return root;

  root.append(renderAiSection(ctx, settings));
  root.append(renderAuthorizationSection(ctx, settings));
  root.append(renderDataSection(ctx));
  root.append(renderAboutSection(settings.version));
  return root;
}

/** The settings view model the renderer reads; every section degrades when it is absent. */
type SettingsViewModel = NonNullable<AppView["settings"]>;

function section(name: string, heading: string, screen?: ScreenId): HTMLElement {
  const node = el("section", "settings-section");
  data(node, { section: name });
  if (screen !== undefined) node.dataset.screen = screen;
  node.append(sectionHeading(heading));
  return node;
}

/** SET-02 the key itself, SET-03 its validation state. */
function renderAiSection(ctx: ScreenContext, settings: SettingsViewModel): HTMLElement {
  const block = section("ai", t("settingsAi"));
  const keyBlock = screenNode(el("div", "api-key-block"), "SET-02");
  keyBlock.append(el("h3", "subsection-heading", t("apiKeyLabel")));

  if (settings.apiKey.maskedSuffix !== undefined) {
    keyBlock.append(
      el("p", "api-key-stored", t("apiKeyStoredSuffix", { suffix: settings.apiKey.maskedSuffix }))
    );
  }

  const row = el("div", "field-row");
  const input = el("input", "text-input api-key-input");
  input.type = ctx.ui.apiKeyReveal ? "text" : "password";
  input.value = ctx.ui.apiKeyDraft;
  input.placeholder = t("apiKeyPlaceholder");
  input.setAttribute("autocomplete", "off");
  input.addEventListener("input", () => {
    ctx.ui.apiKeyDraft = input.value;
  });
  row.append(
    input,
    linkAction(ctx.ui.apiKeyReveal ? t("apiKeyHide") : t("apiKeyReveal"), () => {
      ctx.ui.apiKeyReveal = !ctx.ui.apiKeyReveal;
      ctx.repaint();
    })
  );
  keyBlock.append(row);
  keyBlock.append(
    actionRow(
      primaryAction(t("apiKeySave"), () => {
        const value = ctx.ui.apiKeyDraft.trim();
        if (value.length === 0) return;
        ctx.ui.apiKeyDraft = "";
        ctx.actions.onSetApiKey(value);
      }),
      secondaryAction(t("apiKeyCheck"), () => {
        ctx.actions.onValidateApiKey();
      })
    )
  );

  const status = screenNode(el("p", "api-key-status"), "SET-03");
  data(status, { state: settings.apiKey.state });
  const statusCopy = apiKeyStatusCopy(settings.apiKey.state);
  status.append(
    el("strong", "status-label", statusCopy.title),
    el("span", "status-body", statusCopy.body)
  );
  keyBlock.append(status);
  block.append(keyBlock);
  return block;
}

function apiKeyStatusCopy(state: "missing" | "unvalidated" | "valid" | "invalid"): {
  title: string;
  body: string;
} {
  switch (state) {
    case "missing":
      return { title: t("apiKeyMissing"), body: t("apiKeyMissingBody") };
    case "invalid":
      return { title: t("apiKeyInvalid"), body: t("apiKeyInvalidBody") };
    case "valid":
      return { title: t("apiKeyValid"), body: t("apiKeyValidBody") };
    case "unvalidated":
      return { title: t("apiKeyUnvalidated"), body: t("apiKeyUnvalidatedBody") };
  }
}

/** SET-04 — the two authorizations are separate decisions. */
function renderAuthorizationSection(ctx: ScreenContext, settings: SettingsViewModel): HTMLElement {
  const block = section(
    "settings-section authorization-section",
    t("settingsAuthorization"),
    "SET-04"
  );
  block.append(
    toggleRow("privacy", t("privacyLabel"), t("privacyBody"), settings.privacy, (granted) => {
      ctx.actions.onSetAuthorization("privacy", granted);
    }),
    toggleRow("apiUsage", t("apiUsageLabel"), t("apiUsageBody"), settings.apiUsage, (granted) => {
      ctx.actions.onSetAuthorization("apiUsage", granted);
    })
  );
  return block;
}

function toggleRow(
  kind: "privacy" | "apiUsage",
  label: string,
  body: string,
  checked: boolean,
  onChange: (granted: boolean) => void
): HTMLElement {
  const row = el("label", "toggle-row");
  data(row, { kind, granted: String(checked) });
  const box = el("input", "toggle-input");
  box.type = "checkbox";
  box.checked = checked;
  box.addEventListener("change", () => {
    onChange(box.checked);
  });
  const text = el("span", "toggle-text");
  text.append(
    el("span", "toggle-label", label),
    el("span", "toggle-body", body),
    el("span", "toggle-state", checked ? t("authorizationOn") : t("authorizationOff"))
  );
  row.append(box, text);
  return row;
}

/** BKP-01 the Data entry, BKP-02 the Restore summary and Full Replace warning. */
function renderDataSection(ctx: ScreenContext): HTMLElement {
  const block = section("data", t("settingsData"), "BKP-01");

  const backup = el("div", "data-block");
  backup.append(el("h3", "subsection-heading", t("dataBackupHeading")));
  backup.append(el("p", "settings-body", t("dataBackupBody")));
  backup.append(el("p", "settings-note", t("backupKeyNotice")));
  backup.append(
    actionRow(
      primaryAction(t("exportBackup"), () => {
        ctx.actions.onExportBackup();
      })
    )
  );
  block.append(backup);

  const restore = el("div", "data-block");
  restore.append(el("h3", "subsection-heading", t("dataRestoreHeading")));
  restore.append(el("p", "settings-body", t("dataRestoreBody")));
  if (ctx.view.backupSummary) {
    restore.append(renderRestoreSummary(ctx));
  } else {
    restore.append(renderRestorePicker(ctx));
  }
  block.append(restore);
  return block;
}

function renderRestorePicker(ctx: ScreenContext): HTMLElement {
  const picker = el("div", "restore-picker");
  const input = el("input", "file-input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.setAttribute("aria-label", t("restoreChooseFile"));
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    void file.text().then((text) => {
      let payload: unknown = text;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
      ctx.actions.onRestoreBackup(payload);
    });
  });
  picker.append(
    input,
    secondaryAction(t("restoreFromBackup"), () => {
      input.click();
    })
  );
  return picker;
}

/** BKP-02 — what the file contains, then the explicit Full Replace warning. */
function renderRestoreSummary(ctx: ScreenContext): HTMLElement {
  const summary = ctx.view.backupSummary;
  const block = screenNode(el("div", "restore-summary"), "BKP-02");
  if (!summary) return block;
  block.append(el("h3", "subsection-heading", t("restoreSummaryHeading")));
  const list = el("ul", "summary-list");
  for (const semester of summary.semesters) list.append(el("li", "summary-item", semester));
  list.append(el("li", "summary-item", t("restoreSummaryCourses", { count: summary.courseCount })));
  list.append(
    el("li", "summary-item", t("restoreSummaryAssessments", { count: summary.assessmentCount }))
  );
  block.append(list);
  const warning = el("div", "restore-warning");
  warning.append(
    el("strong", "warning-title", t("restoreWarningTitle")),
    el("span", "warning-body", t("restoreWarningBody"))
  );
  block.append(warning);
  block.append(
    actionRow(
      primaryAction(t("restoreConfirm"), () => {
        ctx.actions.onConfirmRestore();
      }),
      secondaryAction(t("cancel"), () => {
        ctx.actions.onCancelRestore();
      })
    )
  );
  return block;
}

/** SET-05 — Product Mark and Product Version, nothing else. */
function renderAboutSection(version: string): HTMLElement {
  const block = section("about", t("settingsAbout"), "SET-05");
  const line = el("div", "about-line");
  line.append(
    brandMark(48),
    el("span", "about-name", t("productName")),
    el("span", "about-version", t("aboutVersion", { version }))
  );
  block.append(line);
  return block;
}

/** BKP-03 — Reading / Validating / Restoring. Never a percentage. */
export function renderRestoreWorking(ctx: ScreenContext, stage: number): HTMLElement {
  const root = screenNode(el("section", `screen settings-screen ${ctx.surface}`), "BKP-03");
  root.append(el("h1", "screen-title", t("restoreWorkingTitle")));
  const list = el("ol", "task-list");
  [t("restoreReading"), t("restoreValidating"), t("restoreRestoring")].forEach((copy, index) => {
    const row = el("li", "task-step", copy);
    row.dataset.state = index < stage ? "complete" : index === stage ? "active" : "pending";
    list.append(row);
  });
  root.append(list);
  root.append(el("span", "working-marker"));
  return root;
}

/** BKP-04 — a failed restore leaves the previous state exactly as it was. */
export function renderRestoreFailed(ctx: ScreenContext): HTMLElement {
  const root = screenNode(el("section", `screen settings-screen ${ctx.surface}`), "BKP-04");
  root.append(el("h1", "screen-title", t("restoreFailedTitle")));
  root.append(el("p", "settings-body", t("restoreFailedBody")));
  root.append(
    actionRow(
      linkAction(t("done"), () => {
        ctx.open("SET-01");
      })
    )
  );
  return root;
}
