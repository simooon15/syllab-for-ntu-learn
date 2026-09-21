# Syllab for NTU Learn

<img src="assets/logo/syllab-logo-master.svg" alt="Syllab" width="72" height="72">

[中文](#中文) · [English](#english)

## 中文

Syllab 是一款面向 NTU Learn（Blackboard Ultra）的 Chrome 扩展。它把学期里的课程整理成一份
可持续维护的 Current Course State，以 Assessment（考核事项）为核心，每条信息都可回溯到原始
来源，并完全保存在本地。

### 为什么做 Syllab

课程日期、考核权重、提交要求和课程级规则往往分散在不同页面与文件中，既难以快速掌握，也很难
在学期中途确认“这条信息现在还成立吗”。Syllab 在 NTU Learn 之上提供一层个人信息整理能力：
第一次把一门课整理成少量真正的 Assessment，之后持续维护同一份课程状态。

### 核心能力

- **Semester 视角**：自动发现当前学期的 Curriculum Courses，区分 Current / Historical Semester。
- **一次启动的 Initial Scan**：发现、读取、理解、整理自动推进，只在真正需要你决定时暂停。
- **Assessment 中心**：同一真实考核跨来源、跨别名归并为同一个长期对象；Component 与
  Assessment Series 按课程本身的结构表达。
- **用户可读的 Course Brief**：没有 Raw JSON，没有内部 ID；点击任意字段即可原位查看原始证据。
- **持续维护**：后台机会式检查先做本地机器比对，来源未变不调用 AI；只有真正有意义的变化才打扰你。
- **Manual Check 与受保护的 Rebuild**：可主动检查更新，也可从头生成独立预览；确认采用前，临时 AI 结果不会进入 Current Course State。
- **Change Review**：Changed / New / Conflict / Possibly Removed / Identity Uncertain 各自有明确的
  用户决定，且永不静默覆盖你已经确认的状态。
- **Local-first + BYOK**：长期课程数据保存在本地，使用你自己的 DeepSeek API Key；网络或 AI
  不可用时已有数据仍可阅读。
- **Backup / Restore**：完整导出本地状态并在新环境中恢复；API Key 不随备份迁移。
- **Calendar Export**：只导出已确认且归一后的日期事实，同一现实 Deadline 只产生一个事件。

### 产品走查

以下截图来自 v0.2.0 的最终实现，由 `npm run gate:2` 的自动化浏览器路径捕获，不是设计稿或生成
式示意图。

<!-- SYLLAB_SCREENSHOTS_ZH_START -->

### 学期总览

![学期总览](docs/versions/v0.2.0/images/SEM-01.png)

当前页面没有课程上下文时，从工具栏打开 Syllab 会进入这里。当前学期的全部 Curriculum Courses 都会列出，各自带 Assessment 结构与待确认提示；尚未被 Syllab 建立过的课程保持「未被接触」的样子，点击后会先询问再扫描——自动发现不等于自动扫描。

### Course Brief

![Course Brief](docs/versions/v0.2.0/images/CRS-02.png)

课程本身，以 Current Course State 呈现：Assessment 按类型分组，Component 缩进在父项之下，Assessment Series 的实例列在系列之下，Course-wide Constraints 放在最后。点击任意字段会原位显示它的原始证据。

### Initial Review

![Initial Review](docs/versions/v0.2.0/images/IRV-01.png)

Review 只问系统真正无法决定的问题，一次呈现一个完整 Assessment。已确认的内容立即进入 Current Course State，不必等整轮 Review 结束。

### Settings

![Settings](docs/versions/v0.2.0/images/SET-01.png)

DeepSeek API Key、两项授权、Backup / Restore 与 About 都集中在同一个 Full-page Settings 里。

<!-- SYLLAB_SCREENSHOTS_ZH_END -->

### 下载即用（推荐给使用者）

不需要安装 Node，不需要构建，不需要运行任何服务。扩展已经打包好：

**下载 →** [`syllab-for-ntu-learn-v0.2.0.zip`](https://github.com/simooon15/syllab-for-ntu-learn/releases/download/v0.2.0/syllab-for-ntu-learn-v0.2.0.zip)

1. **下载并解压** 上面这个 zip。解压后会得到一个 `Syllab-v0.2.0/` 文件夹。
   **请把它放在一个之后不会删掉的位置** —— Chrome 每次启动都从这个文件夹加载扩展，删掉扩展就会失效。
   文件夹里的 `HOW-TO-INSTALL.txt` 有同样的说明（中英双语）。

2. **打开扩展管理页**：地址栏输入 `chrome://extensions`

3. **开启右上角的「开发者模式」。**

4. **点击「加载已解压的扩展程序」，选中刚才那个 `Syllab-v0.2.0/` 文件夹**
   （要选包含 `manifest.json` 的那一层，不是它的上级目录）。

5. **把 Syllab 固定到工具栏**：点击工具栏的拼图图标，找到 Syllab 并「固定」。

6. **打开你的 NTU Learn 课程页**，点击工具栏上的 Syllab 图标，侧边栏会打开这门课程。

7. **按提示填入你自己的 DeepSeek API Key**（Settings → AI）。Key 保存在当前 Chrome profile，
   并在校验与 AI 推理时直接发送给 DeepSeek；它不会进入备份文件或本仓库。

8. **在还没建立的课程上点击 `Scan course`**，然后在 Initial Review 中确认课程信息。之后正常使用
   NTU Learn 即可，Syllab 会在后台安静地维护这门课的状态。

> **这是开发者版本，不是 Chrome 应用商店版本。** 所以需要手动「加载已解压的扩展程序」。
> 发布候选 ZIP 由 `npm run package` 生成，并由 `npm run package:verify` 从 ZIP 解压后以
> 「加载已解压的扩展程序」方式验证。

### 从源码运行（开发者）

1. `npm install && npm run build`
2. 在 Chrome 中以未打包扩展加载 `extension/dist/`（步骤同上第 2–5 步）。
3. 打开一个 NTU Learn 课程页面，点击工具栏上的 Syllab Product Mark。
4. 未建立的 Course 会先询问再扫描；选择 **Scan course** 后由 Syllab 自动推进。
5. 在 Initial Review 中确认、编辑或排除每一条 Assessment。
6. 之后正常使用 NTU Learn 即可，Syllab 会在后台安静地维护这门课的状态。

### 当前版本

**v0.2.0 — Engineering Freeze 与 Final Acceptance 已通过，等待本地整合后的发布批准。**

v0.2.0 把产品从“能够生成 Course Brief 的单课程 MVP”推进为“围绕一个 Semester 持续维护课程
状态的完整个人课程信息工具”，并收口了 v0.1.0 遗留的 KR-07、KR-08 与 E3。

最终定义、工程报告、决策记录与验收结论见
[docs/versions/v0.2.0/](docs/versions/v0.2.0/)。

### 已知限制

- Calendar/F36 在 Phase 2 没有自然产生可信日期样本，因此为 `NOT TESTED`；这不代表该能力已获真实环境验收。
- Mixed/image-only PDF 目前只读取可用文本层，不提供 OCR 或多模态页面理解。
- 当前发布方式为本地加载的开发者扩展，不是 Chrome Web Store 安装包。

### 技术栈

- Chrome Manifest V3 扩展（Side Panel + Full-page，无 Popup）
- TypeScript 与 esbuild
- IndexedDB（本地 Course State）+ `chrome.storage.local`（设置与授权）
- PDF.js、`fast-xml-parser` 与 `fflate` 文档处理
- 扩展内直接调用 DeepSeek `https://api.deepseek.com/v1`（BYOK，无中间后端）
- Vitest、Playwright 与 ESLint / Prettier

DeepSeek API Key 只保存在本机扩展存储中，不进入 Backup、日志或仓库。

### 本地运行

环境要求：Node.js 22 或更高版本、npm、Chrome 120 或更高版本、NTU Learn 访问权限，以及你自己
的 DeepSeek API Key（在扩展的 Settings 中填写）。

```bash
npm install
npm run ci
```

构建扩展：

```bash
npm run build
```

加载扩展：

1. 打开 `chrome://extensions`。
2. 启用 **Developer mode**。
3. 选择 **Load unpacked**，选择 `extension/dist/`。
4. 每次重新构建或重新加载扩展后，刷新所有已经打开的 NTU Learn 标签页。

一键 Gate 验收：

```bash
npm run gate:1
```

```bash
npm run gate:2
```

### 项目状态

v0.2.0 已完成开发、真实验证、Engineering Freeze 与 Final Acceptance；当前仓库正在等待
Product Owner 批准后续 tag、push 与 GitHub Release。本状态不等于已经公开发布。

### License / Contribution

项目目前尚未发布开源许可证或公开贡献流程。在此之前，请勿默认拥有再分发或复用权。

---

## English

Syllab is a Chrome extension for NTU Learn (Blackboard Ultra). It keeps one Course's Current Course
State up to date over a semester, organised around Assessments, with every fact traceable to its
original source and all of it stored locally.

### Why Syllab

Course dates, assessment weights, submission requirements and course-wide rules are spread across
different pages and files. They are hard to understand at a glance and harder still to trust half way
through a semester. Syllab adds a personal organisation layer on top of NTU Learn: it organises a
course once, and then maintains the same course state.

### Core capabilities

- **Semester view**: discovers the Current Semester's Curriculum Courses and separates Current from
  Historical semesters.
- **One-start Initial Scan**: discovery, reading, understanding and organising advance automatically
  and pause only when you actually have to decide something.
- **Assessment-centric**: the same real assessment is reconciled across sources and aliases into one
  long-lived object; Components and Assessment Series follow the course's own structure.
- **Readable Course Brief**: no raw JSON and no internal identifiers; clicking any fact reveals the
  original evidence in place.
- **Continuous maintenance**: background opportunity checks compare sources locally first and call no
  model when a source is unchanged; only a meaningful change reaches you.
- **Manual Check and protected Rebuild**: check on demand or build a fresh preview; provisional AI
  results cannot enter Current Course State before a legal adoption or Review decision.
- **Change Review**: Changed, New, Conflict, Possibly Removed and Identity Uncertain each have their
  own explicit decision, and none of them ever silently overwrites confirmed state.
- **Local-first + BYOK**: long-term course data stays on your machine and uses your own DeepSeek API
  key; existing data stays readable when the network or the model is unavailable.
- **Backup / Restore**: export the complete local state and restore it in a clean environment. The
  API key is never part of a backup.
- **Calendar Export**: exports only confirmed, normalised date facts, with one event per real deadline.

### Product walkthrough

These screenshots come from the final v0.2.0 implementation and were captured by the automated
browser path in `npm run gate:2`. They are not mockups or generated illustrations.

<!-- SYLLAB_SCREENSHOTS_EN_START -->

### Semester Dashboard

![Semester Dashboard](docs/versions/v0.2.0/images/SEM-01.png)

Open Syllab from the toolbar on a page with no course context. Every Curriculum Course of the Current Semester appears with its Assessment structure and a review cue; a Course that has not been set up looks untouched and asks before it scans.

### Course Brief

![Course Brief](docs/versions/v0.2.0/images/CRS-02.png)

The Course itself, read as Current Course State: Assessments grouped by type, Components nested under their parent, Series instances listed beneath the series, and Course-wide Constraints last. Clicking any fact shows the original Evidence in place.

### Initial Review

![Initial Review](docs/versions/v0.2.0/images/IRV-01.png)

Review asks only for the decisions the system genuinely cannot make, one complete Assessment at a time. Confirmed items enter Current Course State immediately.

### Settings

![Settings](docs/versions/v0.2.0/images/SET-01.png)

The DeepSeek key, the two authorizations, Backup / Restore and About live in one Full-page Settings surface.

<!-- SYLLAB_SCREENSHOTS_EN_END -->

### Download and use (for users)

No Node install, no build, no server. The extension is packaged:

**Download →** [`syllab-for-ntu-learn-v0.2.0.zip`](https://github.com/simooon15/syllab-for-ntu-learn/releases/download/v0.2.0/syllab-for-ntu-learn-v0.2.0.zip)

1. **Download and unzip** that archive. You get a folder named `Syllab-v0.2.0/`.
   **Keep it somewhere you will not delete** — Chrome loads the extension from that folder on every
   start, so removing it disables Syllab. `HOW-TO-INSTALL.txt` inside the folder says the same thing,
   in English and Chinese.

2. **Open the extensions page:** type `chrome://extensions` in the address bar.

3. **Turn on "Developer mode"** (top-right corner).

4. **Click "Load unpacked" and select the `Syllab-v0.2.0/` folder** — the one containing
   `manifest.json`, not its parent.

5. **Pin Syllab to the toolbar** (puzzle-piece icon → pin).

6. **Open your NTU Learn course page** and click the Syllab mark. The Side Panel opens on that
   course.

7. **Add your own DeepSeek API key when asked** (Settings → AI). The key is stored in this Chrome
   profile and sent directly to DeepSeek for validation and AI inference. It never enters a backup
   or this repository.

8. **Choose `Scan course`** on a course that has not been set up, then confirm it in Initial Review.
   After that, keep using NTU Learn normally — Syllab maintains that course quietly in the
   background.

> **This is a developer build, not a Chrome Web Store listing**, which is why step 4 uses
> "Load unpacked". `npm run package` creates the release candidate and `npm run package:verify`
> extracts that exact ZIP into a clean profile and verifies the unpacked extension.

### Run from source (for developers)

1. `npm install && npm run build`
2. Load `extension/dist/` in Chrome as an unpacked extension (steps 2–5 above).
3. Open an NTU Learn course page and click the Syllab Product Mark in the toolbar.
4. A course that has not been set up asks before scanning; choose **Scan course** and Syllab advances
   on its own.
5. Confirm, edit or exclude each Assessment in Initial Review.
6. Keep using NTU Learn normally — Syllab maintains that course quietly in the background.

### Current version

**v0.2.0 — Engineering Freeze and Final Acceptance passed; awaiting publication approval after local consolidation.**

v0.2.0 turns the single-course Course Brief MVP into a personal course information tool that keeps one
semester's course state current, and closes the v0.1.0 defects KR-07, KR-08 and E3.

The final definition, Engineering Report, Decision Log and acceptance record live under
[docs/versions/v0.2.0/](docs/versions/v0.2.0/).

### Known limitations

- Calendar/F36 had no natural trustworthy date sample in Phase 2 and remains `NOT TESTED`; this is
  not a claim of real-environment acceptance.
- Mixed/image-only PDFs are limited to available text layers; OCR and multimodal page reading are
  not included.
- Distribution is a locally loaded developer extension, not a Chrome Web Store package.

### Technology

- Chrome Manifest V3 extension (Side Panel + full page, no popup)
- TypeScript and esbuild
- IndexedDB for local Course State plus `chrome.storage.local` for settings and authorizations
- PDF.js, `fast-xml-parser` and `fflate` for document handling
- Direct DeepSeek calls from the extension to `https://api.deepseek.com/v1` (BYOK, no intermediary
  backend)
- Vitest, Playwright, ESLint and Prettier

The DeepSeek API key lives only in local extension storage; it is never written to a backup, a log or
this repository.

### Run locally

Requirements: Node.js 22 or newer, npm, Chrome 120 or newer, access to NTU Learn, and your own
DeepSeek API key (entered in the extension's Settings).

```bash
npm install
npm run ci
```

Build the extension:

```bash
npm run build
```

Load it:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select `extension/dist/`.
4. After any rebuild or extension reload, refresh every already-open NTU Learn tab.

One-command Gate acceptance:

```bash
npm run gate:1
```

```bash
npm run gate:2
```

### Project status

v0.2.0 development, real verification, Engineering Freeze and Final Acceptance are complete. The
repository is awaiting Product Owner approval for tag, push and GitHub Release; it is not yet a
public release.

### License / contributions

No open-source licence or public contribution process is published yet, so no redistribution or reuse
right is granted by default.
