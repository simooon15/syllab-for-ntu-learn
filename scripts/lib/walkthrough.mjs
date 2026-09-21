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
      "SEM-02",
      "侧栏课程列表",
      "在 NTU Learn 课程页点击工具栏图标会打开侧边栏，列出本学期课程用于快速切换。"
    ],
    [
      "CRS-02",
      "Course Brief",
      "课程本身，以 Current Course State 呈现：Assessment 按类型分组，Component 缩进在父项之下，Assessment Series 的实例列在系列之下，Course-wide Constraints 放在最后。点击任意字段会原位显示它的原始证据。"
    ],
    [
      "ISC-02",
      "首次扫描",
      "一次 `Scan course` 会连续完成发现、读取、理解直到 Initial Review。界面只显示四个用户可见阶段，不显示百分比，也不暴露内部流程名。"
    ],
    [
      "IRV-01",
      "Initial Review",
      "Review 只问系统真正无法决定的问题，一次呈现一个完整 Assessment。已确认的内容立即进入 Current Course State，不必等整轮 Review 结束。"
    ],
    [
      "CRV-01",
      "Change Review",
      "之后的检查先做本地机器比对：来源没有变化就不调用模型。只有来源真实变化才会进入语义判断，也只有有意义的变化才会打扰你。"
    ],
    [
      "SET-01",
      "Settings",
      "DeepSeek API Key、两项授权、Backup / Restore 与 About 都集中在同一个 Full-page Settings 里。"
    ],
    [
      "BKP-01",
      "备份 / 恢复",
      "Backup 导出完整的本地状态；Restore 会先校验文件并展示它包含什么，确认后才整体替换本地状态。"
    ]
  ],
  en: [
    [
      "SEM-01",
      "Semester Dashboard",
      "Open Syllab from the toolbar on a page with no course context. Every Curriculum Course of the Current Semester appears with its Assessment structure and a review cue; a Course that has not been set up looks untouched and asks before it scans."
    ],
    [
      "SEM-02",
      "Side Panel Course List",
      "On an NTU Learn course page the toolbar opens the Side Panel, which lists the semester's Courses for quick switching."
    ],
    [
      "CRS-02",
      "Course Brief",
      "The Course itself, read as Current Course State: Assessments grouped by type, Components nested under their parent, Series instances listed beneath the series, and Course-wide Constraints last. Clicking any fact shows the original Evidence in place."
    ],
    [
      "ISC-02",
      "Initial Scan",
      "One `Scan course` carries discovery, reading and understanding through to Initial Review. The UI names the four user-facing stages and never shows a percentage."
    ],
    [
      "IRV-01",
      "Initial Review",
      "Review asks only for the decisions the system genuinely cannot make, one complete Assessment at a time. Confirmed items enter Current Course State immediately."
    ],
    [
      "CRV-01",
      "Change Review",
      "Later checks compare Sources by machine first. Only a real Source change reaches the model, and only a meaningful change reaches the user."
    ],
    [
      "SET-01",
      "Settings",
      "The DeepSeek key, the two authorizations, Backup / Restore and About live in one Full-page Settings surface."
    ],
    [
      "BKP-01",
      "Backup / Restore",
      "Backup exports the whole local state; Restore validates a file, shows what it contains, and then replaces the local state in one step."
    ]
  ]
};
