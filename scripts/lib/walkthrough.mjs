/**
 * The README Product Walkthrough, kept separate from the script that writes it so the backfill
 * itself can be checked without running it against the repository.
 *
 * Each language owns a marked region. The backfill replaces what is between the markers and never
 * appends, which is what makes a repeated run a no-op instead of a second copy.
 */

export const SCREENSHOT_MARKERS = {
  zh: ["<!-- SYLLAB_SCREENSHOTS_ZH_START -->", "<!-- SYLLAB_SCREENSHOTS_ZH_END -->"],
  en: ["<!-- SYLLAB_SCREENSHOTS_EN_START -->", "<!-- SYLLAB_SCREENSHOTS_EN_END -->"]
};

/**
 * Replaces everything between a marker pair, keeping the markers themselves. Throws when a marker
 * is absent or out of order: silently appending is how the walkthrough ended up duplicated six
 * times, so a missing marker is a failure rather than something to work around.
 */
export function replaceBetween(text, markers, body) {
  const [start, end] = markers;
  const from = text.indexOf(start);
  const to = text.indexOf(end);
  if (from < 0 || to < 0 || to < from) throw new Error(`MARKER_MISSING:${start}`);
  return `${text.slice(0, from + start.length)}\n\n${body}\n\n${text.slice(to)}`;
}

/** One walkthrough block per screen: heading, screenshot, description. */
export function walkthroughSection(entries) {
  return entries
    .flatMap(([id, title, body]) => [
      `### ${title}`,
      "",
      `![${title}](docs/versions/v0.2.0/images/${id}.png)`,
      "",
      body,
      ""
    ])
    .join("\n")
    .trimEnd();
}

/** The curated walkthrough, per language. Product object names stay English in both. */
export const README_WALKTHROUGH = {
  zh: [
    [
      "SEM-01",
      "学期总览",
      "当前页面没有课程上下文时，从工具栏打开 Syllab 会进入这里。当前学期的全部 Curriculum Courses 都会列出，各自带 Assessment 结构与待确认提示；尚未被 Syllab 建立过的课程保持「未被接触」的样子，点击后会先询问再扫描——自动发现不等于自动扫描。"
    ],
    [
      "CRS-02",
      "Course Brief",
      "课程本身，以 Current Course State 呈现：Assessment 按类型分组，Component 缩进在父项之下，Assessment Series 的实例列在系列之下，Course-wide Constraints 放在最后。点击任意字段会原位显示它的原始证据。"
    ],
    [
      "IRV-01",
      "Initial Review",
      "Review 只问系统真正无法决定的问题，一次呈现一个完整 Assessment。已确认的内容立即进入 Current Course State，不必等整轮 Review 结束。"
    ],
    [
      "SET-01",
      "Settings",
      "DeepSeek API Key、两项授权、Backup / Restore 与 About 都集中在同一个 Full-page Settings 里。"
    ]
  ],
  en: [
    [
      "SEM-01",
      "Semester Dashboard",
      "Open Syllab from the toolbar on a page with no course context. Every Curriculum Course of the Current Semester appears with its Assessment structure and a review cue; a Course that has not been set up looks untouched and asks before it scans."
    ],
    [
      "CRS-02",
      "Course Brief",
      "The Course itself, read as Current Course State: Assessments grouped by type, Components nested under their parent, Series instances listed beneath the series, and Course-wide Constraints last. Clicking any fact shows the original Evidence in place."
    ],
    [
      "IRV-01",
      "Initial Review",
      "Review asks only for the decisions the system genuinely cannot make, one complete Assessment at a time. Confirmed items enter Current Course State immediately."
    ],
    [
      "SET-01",
      "Settings",
      "The DeepSeek key, the two authorizations, Backup / Restore and About live in one Full-page Settings surface."
    ]
  ]
};
