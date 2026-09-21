# Syllab for NTU Learn v0.2.0 — Engineering Change Manifest

**这份文档是什么：** 按模块说明 v0.2.0 **相对接手时**主要增加 / 修改了什么，以及每一块现在由什么
测试保护。给下一位 Agent 快速定位用。

**它不是什么：** 不是产品文档、不是开发日志、不是验收记录。产品语义看 PRD / PRODUCT_HANDOFF /
Interaction & IA Spec；Product Owner 确认的方向变化看 `DIRECTION_ADJUSTMENTS_v0.2.0.md`；
发现与修复过程看 `GATE3_FINDINGS_v0.2.0.md`；当前状态看 `CURRENT_ENGINEERING_STATE_v0.2.0.md`。

**范围说明：** 接手时的仓库是 v0.1.0（popup + 单页），本次工作把它改造成 v0.2.0（Side Panel +
Full-page 两种 surface + 两套 Build + 真实验收 Runner）。新增代码几乎全部集中在
`extension/src/v2/`（79 个文件 / 约 27,200 行），v0.1.0 时期的旧模块仍在仓库里，**部分是死代码**。

---

## 0. 一张表：v0.2.0 代码在哪

| 领域 | 主要位置 | 规模 |
| --- | --- | --- |
| 产品状态与领域模型 | `extension/src/v2/schema.ts`、`domain.ts`、`course-state.ts`、`store.ts`、`storage.ts` | — |
| 工作流状态机 | `extension/src/v2/workflow.ts`（最大单文件） | — |
| AI 管线 | `extension/src/v2/ai-pipeline.ts`、`ai-context.ts`、`ai-contracts.ts`、`prompts.ts`、`chunking.ts` | — |
| DeepSeek 传输与修复轮 | `extension/src/v2/deepseek.ts`、`deepseek-complete.ts` | — |
| 平台读取（Blackboard） | `extension/src/v2/blackboard.ts`、`extension/src/discovery/`、`extension/src/fetch/`、`extension/src/parser/`、`extension/src/offscreen/` | discovery 1118 行 |
| 学期 / 课程发现 | `extension/src/v2/enrollment.ts` | — |
| 日期解析 | `extension/src/v2/date-resolution.ts`、`calendar-plan.ts`、`calendar-export.ts` | — |
| 备份 / 恢复 | `extension/src/v2/backup.ts`、`restore.ts`、`migration.ts` | — |
| 界面 | `extension/src/v2/screens/`（14 个文件）、`extension/src/v2/view.ts`、`contract.ts`、`copy.ts` | — |
| 应用外壳 | `extension/src/app/`、`extension/app.html`、`extension/sidepanel.html`、`extension/public/manifest.json` | — |
| 后台入口 | `extension/src/background/index.ts`（service worker） | — |
| 构建 | `extension/scripts/build.mjs`、`scripts/verify-build-separation.mjs` | — |
| 验收 Runner | `scripts/real-test.mjs`、`Run Syllab Real Test.command` | — |
| Gate 基础设施 | `scripts/run-gate.mjs`、`scripts/lib/`、`scripts/evidence-inventory.mjs`、`scripts/capture-screenshots.mjs`、`scripts/browser-e2e.mjs` | — |
| 交付打包 | `scripts/package-extension.mjs`、`scripts/package-delivery.mjs`、`scripts/verify-package.mjs` | — |
| 后端代理 | `backend/src/`（`app.ts`、`providers/deepseek-client.ts`、`domain/usage-guards.ts`） | — |
| 共享契约 | `packages/contracts/src/index.ts` | — |

---

## 1. Storage / 数据库

**做了什么。** IndexedDB 数据库 `syllab-local` 升到 **v6**（`V2_DATABASE_VERSION`）。新增对象仓：
`semesters`、`courses`、`assessments`、`constraints`、`facts`、`evidence`、`sources`、`reviewItems`、
`reviewDecisions`、`changes`、`workflows`、`aiRuns`、`history`、`observations`。

**为什么。** v0.1.0 的 schema 只够一次线性扫描；v0.2.0 需要 Current Course State、Review 决策、
Change 历史、工作流断点续跑与 Coverage Facts，这些都要能单独查询与单独写入。

**要点 / 坑。**
- 一个事务在函数体 `await` 让出的瞬间就 autocommit：**在一个 `read` 事务体里发起的 `write` 会死锁**，
  `complete` 永远不会触发。`store.recomputeEstablished()` 踩过这个坑，已改成「先读、再决定、最后写」。
- v0.1.0 → v0.2.0 的迁移在 `v2/migration.ts`，有专门的迁移测试。

**保护：** `v2/store.test.ts`、`v2/storage.ts`（由 store 测试覆盖）、`v2/migration.test.ts`、
`repository/schema-repository.test.ts`（v0.1.0 旧层）。

---

## 2. Domain / 状态机

**做了什么。** `v2/schema.ts` 定义全部记录类型；`v2/course-state.ts` 负责「什么是 Current Course
State」；`v2/materialize.ts` 把候选变成记录；`v2/change-reducer.ts` 把两次解析之间的差异归约成
Change；`v2/staging.ts` 暂存扫描产出。

**为什么。** 产品语义要求「Error 不能破坏已有可信 Current Course State」（Interaction Spec §11.4），
所以候选、暂存与正式状态必须分开。

**要点 / 坑。**
- `CourseRecord.established` 必须由**对象**（assessment 或 constraint）被确认来推导，不能由扫描完成来
  设置。F22 修的正是它永远不变成 true。
- 已处理的 review item 必须**从库里删除**，否则 Review 永远推进不到下一条（F25）。

**保护：** `v2/course-state.test.ts`、`v2/change-reducer.test.ts`、`v2/store.test.ts`、
`v2/contract-coverage.test.ts`（界面用到的字段都在 contract 里有定义）。

---

## 3. Workflow（工作流状态机）

**做了什么。** `v2/workflow.ts`：`queued → working → waiting / saved / failed → complete`，阶段
`discover → fetch → parse → normalize → task-a → task-b → task-c → review`，带 attempt 计数、
退避排期、断点续跑、`onStage` 通知。

**为什么。** Scan / Check / Rebuild 是同一条链路的三种入口；关闭 Side Panel 不能丢任务（§11.3）。

**要点 / 坑（全部踩过）。**
- **阶段必须真的通知界面**：`EngineOptions.onStage` 在阶段变化时回调，否则界面停在第一帧（F27）。
- **退避必须真的排期**：`chrome.alarms` 是 MV3 里唯一能在任意未来时刻唤醒 worker 的东西；
  `retryDueAt()` / `retryDue()` 既用于浏览器启动也用于 worker 启动，`scheduleParkedResume()` 把
  最近的到期时间排成一个 alarm（F5 / F31）。
- **可恢复的失败不能变成「已保存」的死状态**：`saved` 只是持久化状态，不是界面状态（F23）。
- **权限缺失要「停等」而不是「失败」**：`waitForHostPermission()` 把运行置为
  `waiting/host-permission`，用户授权后由 `RetryTask` 续跑（F28）。

**保护：** `v2/workflow.test.ts`（含阶段通知与退避排期）。

---

## 4. AI 管线

**做了什么。** `v2/prompts.ts`（Prompt baseline，与 handoff 逐字节一致）、`v2/ai-context.ts`
（Task A / B / C 的请求构造与 token 预算）、`v2/ai-contracts.ts`（结构化输出契约与 schema 版本）、
`v2/ai-pipeline.ts`（一个单元一次调用，chunk 级并行）、`v2/chunking.ts`（长来源分块）、
`v2/ai-fixtures.ts`（录制的真实回归样本）。

**为什么。** §12 Prompt Baseline / §13 Structured Output Contract 要求可复现、可对拍。

**要点 / 坑。**
- `fetch` 必须带着它所属的全局对象调用：`fetch.bind(globalThis)`，否则 Chrome 抛
  `Illegal invocation`（**F1：整个真实 AI 路径一次都没跑过**）。
- 契约失败要能修：先修一次（把 schema 错误与被拒响应回灌），再从头重试一次（更大预算）。
- **失败的调用必须留下痕迹**：`qa.deepseek-task` 只在成功时写，所以失败当时完全不可诊断（F35）。
- **截断 ≠ JSON 不合法**：截断且解析失败时报告「被截断」，不要报 `not valid JSON`（F35 附）。

**保护：** `v2/ai-pipeline.test.ts`、`v2/ai-contracts.test.ts`、`v2/ai-context.test.ts`、
`v2/chunking.test.ts`、`v2/ai-regression.test.ts`（录制回归）、`ai/d015-boundary.test.ts`（旧层）。

**未决：** `TASK_A_MAX_TOKENS = 8000` 是否够用 → `UNRESOLVED`，见状态文档 §6.1。

---

## 5. DeepSeek transport

**做了什么。** `v2/deepseek.ts`：一个 provider 调用 + 把抛出的 fetch 变成有错误码的失败
（`AI_AUTH` / `AI_RATE_LIMIT` / `AI_PROVIDER` / `NETWORK_TRANSIENT` / `AI_CONTRACT`）；`verify()`
用一个**免费读**（`GET /v1/models`）判断 key 是否被接受。`v2/deepseek-complete.ts`：修复轮与重试
升级、用法累计、幂等键复用、契约失败观测。

**为什么。** 用户自带 API Key（BYOK），key 只在产品设置里，不进仓库、不进日志。

**要点 / 坑。**
- 区分「请求没构造出来」（不可重试）与「连不上」（可重试）——两者都是 `TypeError`，只有消息能分开（F4）。
- **错误码不能在 `workflow.fail()` 里被降级**：`AiUnitFailure` 不是 `EngineError`，曾经的
  `error instanceof EngineError ? error.code : "INTERNAL"` 把真实错误码全丢了（F3）。
- `Check key` 必须真的验证，不能只重建视图（F2）。

**保护：** `v2/deepseek.test.ts`、`v2/ai-pipeline.test.ts`、`ai/http-transport.test.ts`（旧层）。

---

## 6. Course discovery（平台读取）

**做了什么。** `extension/src/discovery/engine.ts` 走平台的 contents / announcements 接口，
分页、去重、限深，为每个来源取详情、抓附件候选；`extension/src/v2/blackboard.ts` 是 v2 的端口适配。
`extension/src/fetch/` 负责下载（含跳转观察与权限规划），`extension/src/parser/` + `offscreen/` +
`parser-worker/` 在 offscreen document 里解析 PDF。

**为什么。** 真实课程内容散在目录、公告、附件与 Ultra 评估接口里，必须逐类取。

**要点 / 坑（本轮改动最大的地方）。**
- **`rawTextEvidence()` 只接受字符串形态的 `body`**，而平台的 `body` 是
  `{ rawText, displayText, webLocation, fileLocation }` 对象；嵌套下钻列表里也没有 `body`。
  结果：所有公告正文被丢掉（真实测量：MA6081 七个公告全 0 字符，其中一个含 1475 字符的展示时间表）。
  **F29，已修 + 加测试。只对重新扫描生效。**
- **offscreen document 必须真的被创建**：`chrome.offscreen.createDocument` 的调用点曾经随着被删掉的
  parse-runner 一起消失，于是所有 PDF 都读不到（F28a）。
- **下载会跳到未授权的 origin**：`ntulearn…bbcswebdav` → `alt-*.blackboard.com` →
  `*.prod.files.blackboard.com`；必须用 `chrome.webRequest.onBeforeRedirect` 观察并把缺失的 origin
  转成一次授权请求，而不是报失败（F28b）。
- **`nativeItemId` 不能写成 `sourceId`**：否则调用方拿到的「原生 id」其实是个复合字符串，据此构造的
  URL 必然 400（F30）。

**保护：** `discovery/engine.test.ts`（含 F29 的测试）、`discovery/summary.test.ts`、
`fetch/*.test.ts`（4 个）、`parser/*.test.ts`（2 个）、`normalize/normalizer.test.ts`、
`repository/*.test.ts`（4 个）。

---

## 7. Semester / 课程发现

**做了什么。** `v2/enrollment.ts` 读 `users/{id}/memberships?expand=course` 与 `terms/{id}`，
映射成产品的 Semester / Course 记录；`Non-curriculum` 学期被排除。

**为什么。** **PRD §5.1.5 要求 Curriculum Courses 自动进入当前 Semester、Non-curriculum 默认排除。**
v0.1.0 时期**运行时根本没有任何代码创建 Semester 或 Course 记录**，因此真实用户打开 Syllab 看到的
是空界面 —— 这是「既有产品要求的漏实现」，不是新能力（DIRECTION_ADJUSTMENTS §2.24.1）。

**要点 / 坑。** 学期名 `26S1` 要映射成 `AY2026/27 · Semester 1`，否则其下课程的日期全部无法解析（F9）。

**保护：** `v2/enrollment.test.ts`。

---

## 8. Date Resolver（Semester-aware）

**做了什么。** `v2/date-resolution.ts`：把来源里写死的日期补上 Semester 上下文给出的年份；
按来源判定「这是不是一个日期」，再决定落不落得下去。`calendar-plan.ts` 合并 event-equivalent facts、
排除未解决的 Conflict、保留 Keep 的 Possibly Removed 日期。

**为什么。** **Product Definition Change（DIRECTION_ADJUSTMENTS §2.17）**：年份不再由模型猜，
由 Semester context 决定。

**要点 / 坑。**
- 三种 CAL-01 状态（可导出 / 完全落不下去 / 没有日期）必须是**三句不同的文案**：
  课程确实有日期、只是读不出年份时，说「没有日期」是不实的。
- 观测要求：`qa.date-resolution` 必须记录每个日期的原文、解析结果与 `resolutionSource`。

**保护：** `v2/date-resolution.test.ts`、`v2/calendar-export.test.ts`、
`v2/view.test.ts`（预览与导出共用同一个输入构造函数）、`calendar/calendar.test.ts`（旧层）。

**未决：** 真实环境**没有拿到任何真实日期样本** → `NOT TESTED`。

---

## 9. Calendar Export

**做了什么。** `v2/calendar-export.ts` 写 `.ics`；CAL-01 预览屏由 `v2/view.ts::exportPreview` 投影。
入口在 `Course More → Export calendar`（不在 Course header 常驻按钮）。

**为什么。** **Calendar Export 曾经从未接到产品上**：逻辑与测试都在，界面里没有入口
（DIRECTION_ADJUSTMENTS §2.16）。

**要点 / 坑。**
- **预览与实际导出必须用同一个输入构造函数**，否则会出现「界面列了事件、文件是空的」——这个缺陷
  真实发生过，现在由 `view.test.ts` 里那条跨层断言锁住。
- 导出文件名必须用用户能识别的 Course Code / Name。

**保护：** `v2/calendar-export.test.ts`、`v2/view.test.ts`。

---

## 10. Backup / Restore

**做了什么。** `v2/backup.ts`（导出完整本地状态，**不含 API Key**）、`v2/restore.ts`（Full Replace，
原子写入）、`v2/migration.ts`。

**为什么。** Settings → Data 要求可备份、可整库恢复；v0.2.0 **不支持 Merge Restore**。

**要点 / 坑。** 恢复过程用户不能看到半恢复状态；失败时原状态必须完整保持；成功后 API Key 不受影响。

**保护：** `v2/backup.test.ts`、`v2/restore.test.ts`、`v2/migration.test.ts`、`repository/*`（旧层）。

---

## 11. 界面：Side Panel / Full-page

**做了什么。** `extension/src/v2/screens/` 下 13 个渲染模块 + `render.ts`（唯一的屏幕裁决者
`resolveScreen`）+ `patterns.ts`（共享组件）+ `copy.ts`（**全部用户可见英文**）+ `mount.ts`（挂载与
动作）+ `test-dom.ts`（测试用最小 DOM）。两个 surface：`sidepanel.html` 与 `app.html`。

**为什么。** Interaction & IA Spec 定义 47 个 Screen / State，两种 surface 语义统一、密度自适应。

**要点 / 坑。**
- **`resolveScreen()` 是唯一的屏幕裁决者**；本地 UI 状态（编辑中、展开中、More 打开）优先于路由。
- **目录之外不得有用户可见文案**：`copy.ts` 是唯一来源。渲染层曾经有 200+ 处字面量，`view.ts` 里也曾
  藏了三句（F34）。现在由 `render.test.ts` 的两条断言锁住：渲染出的每个词要么来自 catalogue、
  要么来自 view model；且每个 catalogue key 都必须被某个模块点名（跳过 `copy.ts` 自身，否则它会
  自己给自己作证）。
- **不要发明产品文档里没有的界面状态**：`Progress saved.` 与 `Nothing to review` 都属此类，已删（F23 / F33）。
- **返回键的可访问名是 `Back to course` 之类，不是 `‹`**；`‹` 只是可见字形。
- `paint()` 会比较「将画的内容」与「已画的内容」，相同则跳过——每次点击整页重绘会让人以为页面在刷新（F6）。

**保护：** `screens/render.test.ts`（屏幕裁决、catalogue 完整性、无字面量、无原始机器数据）、
`v2/view.test.ts`、`app/index.test.ts`、`app/stylesheet.test.ts`、`v2/contract-coverage.test.ts`。

---

## 12. Production / QA 两套 Build

**做了什么。** `extension/scripts/build.mjs` 加 `--qa` 开关；`qa-telemetry.ts` ↔
`qa-telemetry.disabled.ts`、`e2e-fixtures.ts` ↔ `e2e-fixtures.disabled.ts` 的解析替换；
`scripts/verify-build-separation.mjs` 机械比对两套输出的输入集合。

**为什么。** **Product Owner 指令（DIRECTION_ADJUSTMENTS §2.23.1）**：不建大型 Harness，
两套 Build 共用同一套产品源码；**QA 层只观察、不决定**。

**要点 / 坑。**
- 观测调用点必须写在产品代码里（事件名内联），生产构建用 esbuild 插件把模块换成空实现后内联掉，
  否则两套 bundle 会因为分支而产生行为分叉。
- **`.build-meta/` 记录了每次构建的输入集合**，`verify:builds` 据此判断业务模块有没有分叉。

**保护：** `scripts/verify-build-separation.mjs`（在 `ci` 里）、`v2/qa-telemetry.test.ts`。

---

## 13. Real-test Runner（一键真实验收）

**做了什么。** `scripts/real-test.mjs` + `Run Syllab Real Test.command`：启动系统 Google Chrome
（独立 QA Profile）→ CDP 接管 → 确认 QA Build 已装入 → 打开 NTU Learn → 探测登录 → 跑真实流程 →
读回 QA trace → 写截图与报告。两种模式：`--auto`（脚本驱动）与默认的**手动模式（用户操作、脚本观察）**。

**为什么。** **Product Owner 已确认的 Gate 3 方式**：不建大型 Harness；需要人做的三件事（首次装入扩展、
NTU 登录 / MFA、Chrome 保存对话框）脚本停下来等，做完自动继续；**产品判断（Same / Different /
Uncertain、Accept / Ignore）由 Product Owner 做，QA 层不代做**。

**要点 / 坑（全部踩过）。**
- **Chrome 会继续执行缓存里的旧 service worker 脚本**：重新构建 ≠ 正在运行新代码。Runner 与所有
  探针都必须用 `Debugger.getScriptSource` 比对 V8 实际执行的脚本与磁盘构建的 SHA-256（F17）。
- **不要把 Product Owner 的日常 Chrome Profile 当作工作对象**：不打开、不复制、不读取；不取密码、
  不自动填密码、不绕过 MFA、不导出 Cookie。
- 截图按屏幕变化命名，同名不覆盖（F11）；运行开始前清空 QA trace（F12）；扩展重载不等于窗口被关（F13）。
- 报告里的每一行都要能被 trace 证明；**0 个事件的预览不是 PASS**（脚本已按此修改）。

**保护：** 自身即验收工具；无单测（属工具链，`ci` 只做格式与 lint）。

---

## 14. 构建 / 测试 / Gate 基础设施

**做了什么。** `npm run ci` 串起 11 步（格式、构建、严格类型检查、lint、测试、manifest、密钥扫描、
文档事实核对、README 回填、QA 构建、双构建隔离）。`scripts/run-gate.mjs` 跑 Gate 1 / Gate 2 并写
`artifacts/gates/`。`scripts/evidence-inventory.mjs` 核对必截图的屏幕都已实现且生产包不含测试桥。

**为什么。** Gate 1 / Gate 2 要能自动重跑（Product Owner 指令）。

**要点 / 坑。**
- `scripts/verify-documented-facts.mjs` 会核对技术文档里的 IndexedDB 版本号与 Gate 报告和 JSON 是否一致
  ——改 schema 版本或改 Gate 报告时要一起改。
- `scripts/secret-scan.mjs` 扫描仓库里的凭据形态；**加新文件前先想它会不会被扫到**。

**保护：** 自身即基础设施；`npm run ci` 是完成门槛（AGENTS.md）。

---

## 15. 文档与截图回填

**做了什么。** `docs/versions/v0.2.0/` 下的 PRD / PRODUCT_HANDOFF / Interaction & IA Spec / Technical
Design / Implementation Plan / DIRECTION_ADJUSTMENTS / GATE3_FINDINGS / Gate 报告；
`docs/design-system.md`；`docs/versions/v0.2.0/images/`（39 张**合成 fixture** 界面截图）。

**为什么。** Interaction Spec §14 要求每个 `必须` 标记的 Screen 至少回填一张最终截图。

**边界（重要）。**
- `docs/versions/v0.2.0/images/` 里的截图是**用 fixture 渲染的界面截图**，**不是**真实课程证据；
  真实课程证据在 `artifacts/real-test/`（机器本地，不进 Git）。
- **Documentation Consolidation 未开始**（Product Owner 明确延后）：PRD / PRODUCT_HANDOFF /
  Interaction & IA Spec / design-system 尚未统一回填；Interaction Spec §2.2 与 §3.5 与 v0.2.0 实现
  有意不一致，等 Consolidation 统一。

**保护：** `scripts/verify-readme-backfill.mjs`（README 走查图与文案可重现）、`scripts/verify-documented-facts.mjs`。

---

## 16. 仓库里仍在、但不属于 v0.2.0 产品路径的模块（审计提示）

以下目录来自 v0.1.0，v0.2.0 的产品路径**基本不再经过它们**，但仍有测试、也仍有部分被引用。
下一位置 Agent 动手前应先确认「它还在不在产品路径上」：

| 目录 | 现状 |
| --- | --- |
| `extension/src/popup/` | **已删除**（v0.2.0 移除 popup；`extension/popup.html` 已删） |
| `extension/src/ai/`、`extension/src/brief/`、`extension/src/review/`、`extension/src/recovery/`、`extension/src/scan-again/`、`extension/src/repository/` | 旧层残余，可能是死代码（F18 就是一个例子：旧 repository 用 v5 打开已经升到 v6 的库） |
| `extension/src/fetch/`、`extension/src/parser/`、`extension/src/import`（`normalize/`）、`extension/src/discovery/` | **仍在产品路径上**（v2 通过 `blackboard.ts` 调用它们） |
| `backend/` | 独立的 AI 代理 workspace，v0.2.0 里**不是**扩展的产品路径（扩展直接调 DeepSeek）；保留在仓库中作为版本化的 API 契约一侧 |

**注意：** 上表是**审计提示，不是结论**。判断某个模块是不是死代码，必须自己读调用链，不要因为
「看起来像旧的」就删除。

---

## 17. 这份清单的生成方式

- 依据是当前工作区的实际文件、`npm run ci` 的输出、`GATE3_FINDINGS_v0.2.0.md` 与
  `DIRECTION_ADJUSTMENTS_v0.2.0.md` 的既有记录。
- 未重新定义任何产品语义；未把 Claude 自己提出、Product Owner 未确认的建议写成产品决定。
- 行数、文件数均为当场统计，可用 `find` / `wc -l` 复核。
