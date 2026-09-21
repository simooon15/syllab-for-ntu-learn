# Syllab for NTU Learn v0.2.0 — Current Engineering State

> **HISTORICAL SNAPSHOT · SUPERSEDED 2026-09-21.** This preserves the 2026-09-19 takeover
> state. Current authority: `ENGINEERING_REPORT_v0.2.0.md` and `FINAL_ACCEPTANCE_v0.2.0.md`.

**这份文档是什么：** 下一位置工程师 / Agent（含 Codex）接手时的**入口**。它只陈述当前事实，
不提出方案、不重新定义产品、不替代任何一份已锁定的产品文档。

**它不是什么：** 不是产品文档，不是验收记录，不是方向决策日志。产品语义看 PRD / PRODUCT_HANDOFF /
Interaction & IA Spec；Product Owner 确认过的方向变化看 `DIRECTION_ADJUSTMENTS_v0.2.0.md`；
Gate 3 发现的问题、证据与修复状态看 `GATE3_FINDINGS_v0.2.0.md`。

**冻结时间：** 2026-09-19 22:27（本机时间 / 14:27:45Z）。本文件描述的是**那一刻磁盘上的工作区**。

---

## 0. 一页速览

| 项目 | 状态 |
| --- | --- |
| 分支 / HEAD | `main` / `670880fe1dd2076d0a6d571adefe8bd81d164481`（2026-09-17 21:36:35 +0800） |
| 工作区 | **DIRTY** —— 27 个已修改（未暂存）、8 个已暂存删除、225 个未跟踪文件（清单收录 223 个 / 10.07 MiB） |
| 最后一次 `npm run ci` | **2026-09-19 18:15（本机）· 全绿**，438 个测试通过（extension 416 / backend 20 / contracts 2），且**对应当前工作区源码** |
| Gate 1 | `AUTOMATED_PASS`（8/8），2026-09-19T08:57:37Z–08:59:10Z —— **STALE RELATIVE TO CURRENT WORKTREE** |
| Gate 2 | `AUTOMATED_PASS`（14/14），2026-09-19T08:59:10Z–09:00:43Z —— **STALE RELATIVE TO CURRENT WORKTREE** |
| Production ZIP | `artifacts/Syllab_Extension_v0.2.0.zip`，2026-09-19 17:00:26 —— **STALE RELATIVE TO CURRENT WORKTREE** |
| Delivery ZIP | `artifacts/Syllab_v0.2.0_delivery.zip`，2026-09-19 17:00:43 —— **STALE RELATIVE TO CURRENT WORKTREE** |
| Gate 3 真实验收 | 跑完了一轮完整验收，**8 PASS / 2 NOT TESTED**（2026-09-19 18:12 产出报告） |
| 最重要未决问题 | **F37**（后台 Check 读不到任何东西却仍调用 AI 并改写 Course State）、**F36**（五门课没有一条日期 → 导出链路未做真实端到端验证）、**F35 的输出预算问题** |
| 下一步能不能直接开发 | **不能。** 先读 §7 的「禁止假设为完成」与 §8 的「接管先审计什么」 |

---

## 1. 状态标签的含义

本文件与配套文档只用这五个标签，不混用：

| 标签 | 含义 |
| --- | --- |
| `VERIFIED AGAINST CURRENT WORKTREE` | 验证针对的**就是**当前磁盘上的源码 / 工作区，且其后没有产品代码改动 |
| `VERIFIED ON AN EARLIER BUILD` | 验证当时是对的，但**其后又有产品代码改动**，所以不能代表当前工作区 |
| `IMPLEMENTED BUT NOT REAL-ENV VERIFIED` | 代码已实现、有测试，但**没有**在真实环境（真实 NTU Learn / 真实 DeepSeek）跑过 |
| `NOT TESTED` | 没有做过这次验证，不管实现看起来多完整 |
| `UNRESOLVED` | 已知未解决的问题，或需要 Product Judgment 的未决项 |

`NOT TESTED` **不是** PASS。凡本文件写 `NOT TESTED` 的地方，都不得在下游文档里被写成已通过。

---

## 2. v0.2.0 当前做到了什么

### 2.1 产品面（已实现，测试覆盖情况见标注）

- **Semester / Course 自动发现**：从 NTU Learn 真实接口读出学期与课程（`v2/enrollment.ts`）。
  真实环境跑通 → `VERIFIED ON AN EARLIER BUILD`（F9「Non-curriculum 学期排除」在改动后未再跑真实发现）。
- **Initial Scan**：`Scan course` → 四阶段真实推进 → Initial Review → Current Course State（`v2/workflow.ts`）。
  其中「四阶段真的会走」由 `onStage` 修复（F27）保证 → 有单测，真实运行时核对过阶段文案。
- **Initial Review**：一条一条确认 / 编辑 / 排除 / Later / Merge / Split（`v2/screens/initial-review.ts`）。
  真实环境走完 10 条并回到 Course Brief，出现 `Review complete` → 见 §4。
- **Course Brief**：Assessment / Component / Series / Course-wide Constraint / 事实与证据 / 编辑 /
  手工新增（`v2/screens/course.ts`、`v2/view.ts`）。
- **Change Review**：Changed / New / Conflict / Possibly Removed / Identity Uncertain（`v2/change-reducer.ts`、
  `v2/screens/change-review.ts`）。有单测，**真实环境未走到** → `NOT TESTED`。
- **Rebuild**：确认 → 四阶段 → 预览 → 采用或保留（`v2/screens/rebuild.ts`）。有单测，
  **真实环境未走到** → `NOT TESTED`。
- **Calendar Export**：CAL-01 预览 + `.ics` 下载（`v2/calendar-plan.ts`、`v2/calendar-export.ts`）。
  **真实环境未完成端到端验证**——因为真实课程里一条日期都没有，见 §5.3 → `NOT TESTED`。
- **Settings / Backup / Restore**：AI key、两项授权、备份导出、整库恢复（Full Replace）（`v2/settings.ts`、
  `v2/backup.ts`、`v2/restore.ts`）。有单测与 v0.1.0 迁移测试。
- **Opportunity Checking / Manual Check**：定时与手动检查、指纹比对、Pending Review cue
  （`v2/opportunity.ts`）。**存在未决问题 F37**（见 §6）。

### 2.2 工程面

- **两套 Build 共用一份源码**（见 §3）。
- **一键真实验收 Runner**：`npm run test:real` / `Run Syllab Real Test.command`（见 §4）。
- **QA 观测层**：`v2/qa-telemetry.ts`，只观察不决定，且**在生产构建里被替换为空实现**。
- **Gate 基础设施**：`scripts/run-gate.mjs` + `docs/versions/v0.2.0/gate-{1,2}-*.md`。
- **交付打包**：`npm run package`（扩展 ZIP）、`npm run package:delivery`（交付 ZIP）。

---

## 3. Production / QA 两套 Build 的关系

| | Production | QA |
| --- | --- | --- |
| 命令 | `npm run build` | `npm run build:qa` |
| 输出 | `extension/dist/` | `extension/dist-qa/` |
| 产品能力 | 全部 | **完全相同** |
| QA 观测层 | **无**（`qa-telemetry.ts` 被解析为 `qa-telemetry.disabled.ts`，调用被 esbuild 内联掉） | 有（`v2/qa-telemetry.ts`） |
| 验收桥 / e2e fixture | **无**（被 `dropE2eFixtures` 移除） | 有 |
| 机械保证 | `scripts/verify-build-separation.mjs`（`npm run verify:builds`，在 `ci` 里）：比对两套输出的输入集合，业务模块不得分叉 | 同左 |

**边界规则（Product Owner 已确认）：** QA 层**只观察、不决定**——不能 Accept Candidate、不能改
Course Brief、不能跳过用户确认、不能改 Semester、不能改日期、不能改文案。

**当前两套产物的源码状态：** `extension/dist` 与 `extension/dist-qa` 的最后构建时间是
**2026-09-19 18:15:33 / 18:15:48**，即最后一次 `npm run ci`。**其后没有任何源码改动**
（其后只改过 `.md` 文档），所以这两套产物**对应当前工作区源码**。

---

## 4. Gate 1 / Gate 2 / Gate 3 各自走到了哪里

### 4.1 Gate 1 与 Gate 2 —— `VERIFIED ON AN EARLIER BUILD`

| | Gate 1 | Gate 2 |
| --- | --- | --- |
| 起止 | 2026-09-19T08:57:37.881Z → 08:59:10.159Z | 2026-09-19T08:59:10.666Z → 09:00:43.555Z |
| 结果 | `AUTOMATED_PASS`，8 步 8 PASS / 0 FAIL | `AUTOMATED_PASS`，14 步 14 PASS / 0 FAIL |
| Live DeepSeek | `NOT TESTED` | `NOT TESTED` |
| 真实 NTU Learn | `NOT TESTED` | `NOT TESTED` |
| Product Judgment | `PENDING` | `PENDING` |
| 报告 | `artifacts/gates/v0.2.0/gate-1/` | `artifacts/gates/v0.2.0/gate-2/` |

**⚠ `STALE RELATIVE TO CURRENT WORKTREE`。** Gate 2 在 09:00:43Z 结束，两个 ZIP 在 09:00:26Z /
09:00:43Z（本机 17:00:26 / 17:00:43）打包。**在那之后有 10 个产品源码 / 工具文件被修改**（清单见 §5.1）。
因此：

> **Gate 1 / Gate 2 的 `AUTOMATED_PASS` 与两个 ZIP 都只证明当时那个构建，不能作为当前工作区代码
> 已经通过的证明。** 本轮**没有**重跑 Gate 1 / Gate 2，这是 Product Owner 的明确指示。

### 4.2 Gate 3 —— 真实验收实际走到了哪里

运行方式：`npm run test:real`（一键 Runner，系统 Google Chrome + 独立 QA Profile + 真实 NTU Learn +
真实 DeepSeek）。报告：`artifacts/real-test/REPORT.md`（2026-09-19 18:12）。

| 检查项 | 结果 | 说明 |
| --- | --- | --- |
| System Chrome | PASS | 153.0.8010.48 |
| QA Extension | PASS | QA Build 已装入并被执行（执行脚本与磁盘构建做过 SHA 比对，见 F17） |
| Course Discovery | PASS | 1 个学期、5 门课程 |
| Real DeepSeek | PASS | 本次运行 12 次真实模型调用 |
| Initial Review | PASS | 真实走完 10 条，进度 `1 of 10` → `1 of 1`，回到 Course Brief 并出现 `Review complete` |
| Course Brief | PASS | Current Course State 被写出 |
| Semester Date Resolution | **NOT TESTED** | 没有真实日期样本，见 §5.3 |
| Calendar Preview | PASS（报告原文） | **备注写着 0 events** —— 这是脚本当时的判断过宽，见下 |
| Actual ICS Download | **NOT TESTED** | 没有可导出日期，链路未做真实端到端验证 |
| Persistence | PASS | 关闭并重开界面后 Course Brief 一致 |

**关于 `Calendar Preview` 那一行：** 报告里记成 PASS、备注是 `0 events`。0 个事件只证明了
「空课程下导出屏渲染成空状态」，**没有**证明导出能写出日历。脚本已改成这种情况记 `NOT TESTED`
（`scripts/real-test.mjs`，2026-09-19 18:15 修改），但**已生成的那份报告保持原样未改**——验收产物
不事后编辑。差异就是这一条。

**关于 `Course Brief` 与 `Real DeepSeek` 两行：** 它们是由**后台定时 Check**（每 15 分钟）跑出来的，
不是手工走查的那一步。产品确实写了 Course State、确实调用了真实 DeepSeek，但读者要知道它们来自
哪一步，而这两次后台 Check 正是 **F37** 的证据。

### 4.3 真实 NTU Learn 验证过什么

- 学期与课程发现：1 个真实学期 `AY2026/27 · Semester 1`（native term `26S1`）、5 门课程；
- Source 发现：MA6081 发现 119 个来源、MA6083 发现 52 个；
- 附件读取：MA6083 的 8 个 PDF `fetch/parse = ok/ok`；两跳跳转（`ntulearn…bbcswebdav` →
  `alt-*.blackboard.com` → `*.prod.files.blackboard.com`）与授权链路在真实浏览器里跑通（F28）；
- 解析：`pdf.worker.mjs` 在 offscreen document 里真实解析 PDF（F28a 修的 offscreen 创建）；
- 真实界面：Side Panel / Full-page 两种 surface 都在真实标签页里渲染过。

### 4.4 真实 DeepSeek 验证过什么

- API Key 被接受；`response_format: json_object` 的小体量单元**稳定成功**（本轮 trace 里 12 次
  `qa.deepseek-task` 成功；同一天早些时候 `aiRuns` 表里另有 44 条成功记录）；
- **大附件单元会被截断**（`finish_reason: "length"`），随后 JSON 解析失败 → `AI_CONTRACT`。见 F35。
- 输出预算 / 服务商上限的归属**未定** → `UNRESOLVED`。

---

## 5. 什么时候的产物对应什么时候的代码

### 5.1 最后一次 Gate（09:00:43Z / 17:00:43 本机）之后改动的共享产品代码

以下文件在 Gate 2 与两个 ZIP 生成**之后**被修改，因此使 Gate 报告与 ZIP 变为 stale：

| 时间（本机） | 文件 | 改动 |
| --- | --- | --- |
| 17:05:10 | `extension/src/v2/view.ts` | F32 注意力详情不再重复标题句；F34 三句用户可见文案收回 copy 目录 |
| 17:05:18 | `extension/src/v2/screens/initial-review.ts` | F33 删除 `Nothing to review` 整屏，兜底改为渲染 Course Brief |
| 17:05:22 | `extension/src/v2/screens/render.ts` | F33 没有 review item 时路由直接给 Course Brief |
| 17:06:56 | `extension/src/v2/screens/render.test.ts` | F33 / F34 的断言；「catalogue 无未使用 key」检查改为能看见 view 层 |
| 17:07:00 | `extension/src/v2/copy.ts` | F32 / F33 / F34 的 key 增删 |
| 17:11:14 | `extension/src/v2/ai-pipeline.ts` | F35 传 `task` 给契约失败观测 |
| 17:15:49 | `extension/src/discovery/engine.ts` | **F29 修复**：`rawTextEvidence()` 下钻 `body` 对象 |
| 17:15:55 | `extension/src/discovery/engine.test.ts` | F29 的测试 |
| 17:34:01 | `extension/src/v2/ai-pipeline.test.ts` | F35 截断文案的断言 |
| 17:44:35 | `extension/src/v2/deepseek-complete.ts` | F35 截断不再误报 `not valid JSON`；失败观测记录 `maxTokens` / `outputTokens` |
| 18:15:15 | `scripts/real-test.mjs` | 0 事件的 Calendar Preview 不再记 PASS（工具诚实性） |

### 5.2 因上述改动而 stale 的生成物

| 生成物 | 时间 | SHA-256 | 状态 |
| --- | --- | --- | --- |
| `artifacts/gates/v0.2.0/gate-1/` | 2026-09-19T08:59:10Z | — | **STALE RELATIVE TO CURRENT WORKTREE** |
| `artifacts/gates/v0.2.0/gate-2/` | 2026-09-19T09:00:43Z | — | **STALE RELATIVE TO CURRENT WORKTREE** |
| `artifacts/Syllab_Extension_v0.2.0.zip` | 2026-09-19 17:00:26 | `06df24f48b8ccedc78a352b4ed2fdff77a5b10c925e62364ee5f8274ec1d1f3d` | **STALE RELATIVE TO CURRENT WORKTREE** |
| `artifacts/Syllab_v0.2.0_delivery.zip` | 2026-09-19 17:00:43 | `18938531ccede8ae55ec7869279b541550fb1ed9df4fdc9b87626ba54ceeaa54` | **STALE RELATIVE TO CURRENT WORKTREE** |

**不要**用这两个 ZIP 代表当前工作区，也不要因为「ZIP 已经生成过」就认为当前代码已经通过 Gate。
本轮**没有**重新生成它们（那需要重跑 Gate 2，Product Owner 明确要求不跑）。

### 5.3 仍然 `VERIFIED AGAINST CURRENT WORKTREE` 的验证

| 验证 | 时间 | 覆盖 |
| --- | --- | --- |
| `npm run ci` | 2026-09-19 18:15（本机） | 格式、构建、严格类型检查、lint、438 个测试、manifest、密钥扫描、文档事实核对、README 回填、QA 构建、双构建隔离 —— **全绿** |
| 执行脚本 = 磁盘构建（F17 的锁） | 2026-09-19 18:20 前后 | QA Chrome 里 V8 实际执行的 `background.js` 与 `extension/dist-qa/background.js` **SHA-256 相同** |

`npm run ci` 是在**最后一次产品代码改动之后**跑的（最后一次源码改动 18:15:33 之前，构建 18:15:48），
所以它**对应当前工作区**。但注意它**不包含**真实环境验证，也**不重新生成** §5.2 里的 ZIP。

---

## 6. 当前已知问题与未决项

### 6.1 必须原样交接的未决问题

**F37 —— 读不到任何东西的后台 Check 仍然调用 AI 并改写 Course State（`UNRESOLVED`，未修）**

- **观察到的实际行为（2026-09-19，trace 时间 09:41:38Z 与 09:56:38Z 各一次）：**
  `scan-started {kind:"check", hasTab:false}` → `discovery-sources {discovered:0}` → 25 条
  `source-read` 全部 `SOURCE_NOT_DISCOVERED / fetchStatus:"failed"` → **随后仍然**
  `course-brief {assessments:17, facts:26, reviewItems:6}`。产品在什么都读不到的情况下调用了 12 次 AI，
  并把 MA6081 从 11 个 assessment / 16 条 fact / 0 条待审改成 17 / 26 / **6 条新待审**。
- **证据：** `artifacts/real-test/qa-events.json`（148 条事件，含上述序列）；
  交接包内的 sanitized 副本见 `docs/versions/v0.2.0/handoff/evidence/`。
- **与产品定义冲突的位置：** Interaction Spec **§11.5**「单次 background failure：默认静默；
  后续 opportunity 再重试；**不制造 Review**」；**§11.2**「Source 未变 → 不调用 AI；Source 变但无
  meaningful change → 静默结束」。
- **为什么上一轮没有直接修：** 修法牵涉行为判断，至少三条路（0 个来源就当这次检查没发生 / 重新
  discovery 后再决定 / 读不到就不许写 Course State），对用户可见行为的影响不同；按 AGENTS.md
  「用户可见的改动是产品决定」，留给 Product Owner。
- **需要的 Product Judgment：** 上述三条路选哪条；以及「课程真的被清空」这种合法情况下如何区分。

**F36 —— 导出链路没有真实端到端验证（`NOT TESTED` + `UNRESOLVED`）**

- 五门真实课程**没有任何一条 `deadline` / `weight`**（逐库核对：MA6081 16 条事实全是练习测验元数据；
  MA6083 3 条；MA6084 / MA6086 / MA6094 为 0 条）。因此 `Semester Date Resolution` 与
  `Actual ICS Download` 两行**测不了**，只能如实记 `NOT TESTED`。
- 没有「凑一个日期」的余地：唯一能造出日期的产品路径是手工新增 Assessment，那需要一个**人填的**
  日期，制造出来的证据不是证据。
- **成因（两条都已确认）：**
  1. **F29**：公告正文（含一张 1475 字符的小组展示时间表）被 `rawTextEvidence()` 整个丢掉；
  2. **F28 的时序**：MA6081 的 19 个附件全部 `lastFetchedAt` 有、`parsed` 无——那次扫描跑在 F28
     修复**之前**，当次根本读不到附件。它的 Course State 只建立在文本来源上。
- **F29 的修复只对重新扫描生效**：已建立课程里存的是旧解析结果，公告文本仍是空的。

**F35 —— 真实模型的输出预算问题（部分修复，部分 `UNRESOLVED`）**

- 已修：截断被误报成 `the response was not valid JSON` 的问题。**注意**：这句话会经
  `workflow.lastErrorDetail` → `view.ts` 变成**用户可见的失败原因**，所以这不只是内部日志问题。
- **未修、不要自行提高预算**：task-a 的 `TASK_A_MAX_TOKENS = 8000` 与修复轮的
  `min(16000, budget×2)` 是否够用没有定论。证据是「加预算就变长」（说明是预算/上限在卡），但
  6601 字符（约 1.6k token）就报 `finish_reason:"length"`，**服务商侧存在更低硬上限**是更可能的解释。
  要分辨需要真实失败样本里同时有 `maxTokens` 与 `outputTokens` ——本轮已把这两个字段加进
  `qa.ai-contract-failure`，**但还没有拿到新的真实失败样本** → `IMPLEMENTED BUT NOT REAL-ENV VERIFIED`。

### 6.2 其他未决 / 仍未解决

| 项 | 状态 | 说明 |
| --- | --- | --- |
| F15 `/design-spec` 技能与文档不存在 | `UNRESOLVED` | 待 Product Owner 判断是否过时要求 |
| F16 课程标题左边缘不齐 | `UNRESOLVED` | Product Owner 指示收尾后处理 |
| F18 旧 repository 层用 v5 打开已升到 v6 的库 | `UNRESOLVED` | 死代码，产品路径不受影响 |
| F26 返回键「偶尔没反应」 | `UNRESOLVED` | 未能复现；另有「worker 忙时无超时」待观察 |
| F29 修复的实际效果 | `IMPLEMENTED BUT NOT REAL-ENV VERIFIED` | 有单测；真实效果要等重新扫描 |
| F32 / F33 / F34 的修复 | `VERIFIED AGAINST CURRENT WORKTREE` | 有测试；`ci` 在改动之后跑过 |
| Documentation Consolidation | `UNRESOLVED`（**未开始**，Product Owner 明确延后） | 涉及 PRD / PRODUCT_HANDOFF / Interaction & IA / design-system / Technical Design / Implementation Plan / Acceptance docs 的统一回填 |
| 已知有意不一致的文档 | `UNRESOLVED` | Interaction Spec §2.2（工具栏入口落点）与 §3.5（未建立课程状态表达）被 v0.2.0 有意覆盖，等 Consolidation 统一 |

---

## 7. 禁止假设为完成的部分

下一位置 Agent **不得**把以下任一项当成已完成：

1. **当前工作区已通过 Gate 1 / Gate 2** —— 不能。没有在当前源码上重跑过。
2. **`Syllab_v0.2.0_delivery.zip` / `Syllab_Extension_v0.2.0.zip` 代表当前代码** —— 不能。它们比当前
   源码旧，见 §5.2。
3. **Calendar Export 端到端可用** —— 真实环境未验证，`NOT TESTED`。
4. **Semester Date Resolution 在真实数据上工作** —— 没有真实日期样本，`NOT TESTED`。
5. **Change Review / Rebuild 真实可用** —— 有单测，真实环境未走到，`NOT TESTED`。
6. **F29 的修复已经让提取变好** —— 只对重新扫描生效，且尚未在真实环境复测。
7. **F35 的预算问题已解决** —— 只修了「报错文案」，预算本身没动。
8. **F37 已被处理** —— 没有。它原样留在 §6.1。
9. **产品定义已收口** —— Product Owner 明确延后 Documentation Consolidation。

---

## 8. 接管时应该先审计什么

按这个顺序，每一步都能独立得出结论：

1. **核对冻结是否仍然成立。** 重跑 `git status --short -uall`、`git rev-parse HEAD`，与
   `docs/versions/v0.2.0/handoff/worktree-state.json` 对比。不一致说明交接包之后又有人动过工作区。
2. **核对 `npm run ci` 是否仍然代表当前源码。** 比较 `extension/dist/background.js` 与
   `extension/dist-qa/background.js` 的构建时间与源码 mtime；若源码更新，`ci` 的结论作废。
3. **核对执行构建（若要用 QA Profile 验收）。** 用 `Debugger.getScriptSource` 读 V8 实际执行的
   `background.js`，与磁盘上的 `extension/dist-qa/background.js` 比 SHA-256——**不要只看文件是否
   存在于磁盘**（F17：Chrome 会继续执行缓存里的旧 service worker 脚本）。
4. **读 `GATE3_FINDINGS_v0.2.0.md`**，尤其是一、七、八、九、十各节，以及 §6.1 的三条未决问题。
5. **审计 F37 的现场**：`qa-events.json` 里 `scan-started{hasTab:false}` → `discovery-sources{0}`
   → 全部 `SOURCE_NOT_DISCOVERED` → `course-brief` 这条链，判断它是否仍然可复现。
6. **审计 `extension/src/v2/`**：这是 v0.2.0 的新架构（79 个文件 / 约 27k 行），与仓库里 v0.1.0 时期
   的旧模块（`ai/`、`fetch/`、`repository/`、`brief/`、`review/` 等）**同时存在**。先弄清哪些旧模块
   仍在产品路径上、哪些已是死代码（F18 就是一个例子），再动手。
7. **审计测试保护面**：`extension/src/v2/*.test.ts` 与 `extension/src/v2/screens/render.test.ts` 是
   主要保护；`docs/versions/v0.2.0/IMPLEMENTATION_PLAN_v0.2.0.md` 记录了计划与实际。
8. **在动任何产品行为之前，先确认它是不是 Product Judgment。** 见 README 的「不应该直接做什么」。

---

## 9. 交接包内与本文件配套的东西

| 位置 | 内容 |
| --- | --- |
| `00_ENGINEERING_HANDOFF_README.md` | ZIP 根目录的入口页 |
| `docs/versions/v0.2.0/CURRENT_ENGINEERING_STATE_v0.2.0.md` | 本文件 |
| `docs/versions/v0.2.0/ENGINEERING_CHANGE_MANIFEST_v0.2.0.md` | 按模块的工程变更清单 |
| `docs/versions/v0.2.0/DIRECTION_ADJUSTMENTS_v0.2.0.md` | Product Owner 已确认的方向变化 |
| `docs/versions/v0.2.0/GATE3_FINDINGS_v0.2.0.md` | Gate 3 发现的问题、证据、修复状态、未决事项 |
| `docs/versions/v0.2.0/handoff/` | 工作区冻结快照：`WORKTREE_STATE.txt`、`worktree-state.json`、`WORKTREE_DIFF.txt`、`UNTRACKED_FILES.txt` |
| `docs/versions/v0.2.0/handoff/evidence/` | Gate 1 / Gate 2 / Gate 3 报告与凭证的 **sanitized** 副本，以及一份「哪些原始 evidence 因隐私没有进入交接包」的说明 |
| `ENGINEERING_HANDOFF_MANIFEST.txt` | 交接 ZIP 内全部文件的路径、字节数与 SHA-256 |

---

## 10. 交接包本身的说明

**包名：** `Syllab_v0.2.0_engineering_handoff.zip`（与 `Syllab_v0.2.0_delivery.zip` **不是一回事**：
delivery 包是给用户加载的交付物，本包是给下一位工程师 / Agent 的工程全貌）。

**整包 SHA-256** 写在旁边的 `Syllab_v0.2.0_engineering_handoff.zip.sha256`。它**不能写在本文件里**——
本文件在 ZIP 内部，写进去就会改变 ZIP 的哈希。包内每个文件的路径、字节数与 SHA-256 见 ZIP 根目录的
`ENGINEERING_HANDOFF_MANIFEST.txt`。

**包内有什么：** 见 ZIP 根目录 `00_ENGINEERING_HANDOFF_README.md` §8。

**因隐私没有进包的原始 evidence（原始文件未被修改、未被删除）：**

| 原始路径 | 为什么不进包 |
| --- | --- |
| `artifacts/real-test/screenshots/*.png`（7 张） | 真实课程界面截图，含真实课程名、Assessment 名称与部分事实值 |
| `artifacts/acceptance-evidence/*.png`（2 张） | v0.1.0 时期的日历导入截图，含真实 Assessment 名称与日期 |
| `.tmp/syllab-qa-profile/` | QA Chrome Profile（登录态所在），硬规则：不复制、不打包、不读取 |

进包的实为**脱敏副本**：`docs/versions/v0.2.0/handoff/evidence/`。脱敏只改一处——真实运行 trace 里
`head`（无法使用的模型响应的前若干字符），替换为 `[redacted: N chars of model output]`。逐条说明见
`docs/versions/v0.2.0/handoff/evidence/EVIDENCE_SANITIZATION.md`。

**整包敏感数据扫描结果：`PASS`。** 结论：

- 真实 DeepSeek Key **不在包内**：按该 key 自己的前缀单独匹配，0 处命中（本文件不写出该前缀）；
- Cookie / session token / 密码 / MFA secret / `.env` 实文件 / QA Profile / 私有本地配置 / 密钥文件
  **均不在包内**（按路径逐条检查）；
- 唯一命中的 `sk-…` 形态是 `extension/src/v2/qa-telemetry.test.ts` 里的**合成测试值**
  一个 `sk-` 加 16 位 ASCII 的**合成值**（它存在的目的正是验证脱敏逻辑本身，因此必须留着）；
- 文本扫描命中的 `Authorization` / `Bearer` 全部是**代码在构造请求头、测试夹具、或文档在描述脱敏规则**，
  没有一处是真实的凭据值。逐条已人工核对。

包内**不含** `.git/`、`node_modules/`、`.tmp/`、`.claude/`、`.codex/`、`.DS_Store`、旧的 `*.zip`、
`*.log`。

---

## 11. 这份文档的生成方式与边界

- 本文件由工程侧在 Product Owner 的交接指令下生成，**只陈述现状**。
- 文中所有时间均标注来源（本机时间或 UTC/ISO），未做换算润色。
- 文中所有 SHA-256 都是当场计算的，可用 `shasum -a 256` 复核。
- **本文件不修改、不重新定义任何产品语义。** 版本优先级以
  `DIRECTION_ADJUSTMENTS_v0.2.0.md` §0.1 记录的规则为准：PRD / PRODUCT_HANDOFF / Interaction & IA
  Spec 是**开工前的 baseline**，而该文件中**明确记录、且由 Product Owner 确认过的正式调整**晚于
  baseline——当后续正式指令明确覆盖旧规则时，**以后续调整为准**，旧文档的历史不一致留待
  `Documentation Consolidation & Final Acceptance` 统一回填。已明确发生覆盖的是 §2.20（覆盖
  Interaction Spec §3.5）与 §2.25（覆盖 Interaction Spec §2.2）。**Claude 自己提出、Product Owner
  未确认的建议不获得这种覆盖权。**

---

## 12. 旧的 Codex 开发交接文件已失效

仓库根目录下仍然存在两份 v0.2.0 **开发开始之前**的临时开发交接文件：

```text
OBSOLETE HISTORICAL HANDOFF — DO NOT EXECUTE
```

| 文件 | 现状 |
| --- | --- |
| `00_CODEX_START_HERE_v0.2.0.md` | **已失效。** 它指示的执行路径是「读 PRD → Technical Design → Implementation → Gate 1 → Gate 2」——那条路径**已经走完**（Gate 1 / Gate 2 见 §4）。 |
| `CODEX_START_PROMPT_v0.2.0.txt` | **已失效。** 同上，是当时用来启动开发的提示词。 |

**规则：**

- 这两份文件**只作为开发历史 / provenance 保留**，本轮**没有删除**（原始文件仍在仓库根目录）；
- **下一位 Codex 不得按其中的指令重新开发 v0.2.0**；
- **当前唯一的接管入口是 `00_ENGINEERING_HANDOFF_README.md`**（交接 ZIP 根目录）；
- **新的 Codex 接管 Prompt 由 Product Owner 在独立审阅当前 Engineering Handoff 之后另行提供**，
  本包不包含、也不预设它。

这两份文件在 `ENGINEERING_HANDOFF_MANIFEST.txt` 里同样被标注为 obsolete。
