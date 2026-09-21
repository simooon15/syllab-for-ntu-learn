# Gate 3 真实环境验收 —— 发现清单 v0.2.0

> **HISTORICAL FINDINGS LOG · SUPERSEDED FOR FINAL STATUS.** 本文保留 Gate 3 当时的
> 发现与处理过程。最终结论见 `ENGINEERING_REPORT_v0.2.0.md` 与
> `FINAL_ACCEPTANCE_v0.2.0.md`。

这份文件是 Gate 3（真实 Chrome + 真实 NTU Learn + 真实 DeepSeek）本轮运行中收集到的问题清单。
**它不是验收记录，也不是设计文档**：Gate 3 的报告在 `artifacts/real-test/`，这里只记"发现了什么、
证据是什么、打算怎么改"。逐条修复后，产品方向类改动会按既有约定并入
`DIRECTION_ADJUSTMENTS_v0.2.0.md`，这份清单在收口时删除或归档。

记录时间：2026-09-19。环境：系统 Google Chrome 153.0.8010.48、QA Build（`extension/dist-qa`）、
真实学期 `AY2026/27 · Semester 1`（native term `26S1`）、真实课程 MA6081 等 5 门。

## 修复状态

**F1–F14、F17–F18、F21–F25、F27–F28、F30–F35 已修复并构建**；Gate 1 / Gate 2 重跑均
`AUTOMATED_PASS`，`npm run ci` 全绿，Production ZIP 里无 QA 层（逐标记核对）。
F26 未能复现，待 Product Owner 补充场景；**F29 已改判为缺陷**（公告正文被整个丢掉，见正文）；

| 编号 | 状态 | 修法摘要 |
| --- | --- | --- |
| F1 | ✅ 已修 | `fetch.bind(globalThis)`；新增测试用一个"只接受正确 `this`"的 fetcher 锁住语义 |
| F2 | ✅ 已修 | `VALIDATE_API_KEY` 真的调 `GET /v1/models`（免费读）并把结论写回设置 |
| F3 | ✅ 已修 | `failureCode()` / `failureRetryable()` 识别 `DeepSeekFailure`，真实错误码不再降级为 `INTERNAL` |
| F4 | ✅ 已修 | 按异常消息区分"请求没构造出来"（`AI_CONTRACT`，不可重试）与"连不上"（`NETWORK_TRANSIENT`） |
| F5 | ✅ 已修 | 接上从未被使用的 `RETRY_DELAYS_MS`；`retryDue()` 同时用于浏览器启动与 worker 启动 |
| F6 | ✅ 已修 | `paint()` 比对「将画的内容」与「已画的内容」，相同则跳过；冗余重绘消失 |
| F7 | ✅ 已修 | Settings 移到学期头部右上角（两侧栏与全屏都有） |
| F8 | ✅ 已修 | 同上；`API key needs attention` 等三类提示变为可点，侧栏点开全屏 Settings |
| F9 | ✅ 已修 | 名为 `Non-curriculum` 的学期被排除，其下课程不再进入课程列表 |
| F10 | ✅ 已修 | 去前缀 + Title Case（缩写与分节字母有专门规则，见 F10 正文） |
| F11 | ✅ 已修 | 同名截图不再互相覆盖，第二次起加后缀 |
| F12 | ✅ 已修 | 运行开始时清空 QA trace |
| F13 | ✅ 已修 | 扩展重载不再被当成窗口关闭 |
| F14 | ✅ 已修 | 改比对 profile 目录名，绕开 locale 转义 |
| F15 | ⏸ 待 Product Owner | `/design-spec` 不存在；判断为过时要求 |
| F16 | ⏸ 按指示推迟 | 标题左边缘，Product Owner 指示收尾后处理 |
| F17 | ✅ 已修 | 见正文；记录器现在**开跑前**比对执行脚本与磁盘构建，不一致就拒绝开始 |
| F18 | ⏸ 收尾处理 | 旧 repository 用 v5 打开 v6 库；产品路径不受影响，属死代码 |
| F19 | — | 原判「中断后不续跑」经复核**未成立**（当时把慢调用误读为停住），已并入 F22 重写 |
| F20 | ✅ 已修 → 见 F23 | 编号与 F23 重复，保留 F23 为准 |
| F21 | ✅ 已修 | 扫描完成且仍在当前屏 → `IRV-01`；`Waiting for your review` 整句删除 |
| F22 | ✅ 已修 | `recomputeEstablished()` 接上调用点，判据改为「至少一个对象已确认」 |
| F23 | ✅ 已修 | `queued` 按 working 渲染；`Saved` 只留给真正停住可恢复的运行 |
| F24 | ✅ 已修 | 两个 authorization 理由补上 `Open Settings` 动作 |
| F25 | ✅ 已修 | 已处理的 review item 从库中删除，Review 能推进到下一条 |
| F26 | ❓ 未复现 | 返回键正常；疑似记录脚本选择器写错，另有"worker 忙时无超时"待观察 |
| F27 | ✅ 已修 | `EngineOptions.onStage` 在阶段变化时通知界面，§5.2 的四阶段真的会走 |
| F28 | ✅ 已修并实机验证 | 恢复 offscreen 文档创建 + 跳转观察 + 授权停等（详见正文） |
| F29 | ❗ 改判为缺陷 | 内容项原结论成立；**公告正文被整个丢掉**（`body` 是对象），已修 + 加测试 |
| F30 | ✅ 已修 | `nativeItemId` 不再写成 `sourceId` |
| F31 | ✅ 已修 | 可恢复失败的退避用 `chrome.alarms` 真正排期，不再等下次浏览器启动 |
| F32 | ✅ 已修 | 注意力详情不再把它上面那句 `Course information may be out of date` 重复一遍 |
| F33 | ✅ 已修 | `Nothing to review` 整屏删除：§6.7 明确不要完成页，路由本来也到不了 |
| F34 | ✅ 已修 | `view.ts` 里三句用户可见文案收回 `copy.ts`；"未被使用的 key"检查改为能看见 view 层 |
| F35 | ✅ 已修 | 失败的模型调用现在留下响应形状（长度 / 前 40 字符 / 顶层键 / schema / truncated）；当晚据此查出真因是**答到一半被截断**，并把被截断误报成 `not valid JSON` 的文案改正 |
| F36 | ❗ 验收结论 | 五门课没有一条日期 → Calendar Export / ICS 两行**测不了**，如实记 NOT TESTED（成因见 F29 + F28 时序） |
| F37 | ⏸ 待 Product Owner | 一次 `discovered: 0`、全部读取失败的后台 Check，仍然跑了 AI 并改写了 Course State（§11.5 冲突） |

**验收结果**（`artifacts/real-test/REPORT.md`，2026-09-19 18:12 由 `npm run test:real` 产出）：
10 行中 **8 PASS / 2 NOT TESTED** —— `Semester Date Resolution` 与 `Actual ICS Download` 因为没有
日期而测不了（F36）。注意 `Calendar Preview` 那一行当时被脚本记成了 PASS（备注写着 `0 events`），
**这是脚本的判断过宽**：0 个事件只证明了"空课程下导出屏是空状态"，没有证明导出能写出日历。
脚本已改成这种情况记 NOT TESTED（F36），但**已生成的那份报告保持原样不动** —— 验收产物不事后编辑，
差异记在这里。

---

## 一、阻断级（不修则 Gate 3 无法继续）

### F1 · `fetch` 被存成字段再调用，导致真实模型调用从未成功过

**现象**：Scan 走完 Discovery（MA6081 发现 119 个来源）与 Fetch / Parse，然后在第一个 AI 阶段
（`task-a`）失败，界面显示 `Scan couldn't be completed. DeepSeek could not be reached`。

**证据链**：

1. IndexedDB `aiRuns` 表**为空** —— 一次模型调用都没成功过；对应 workflow 停在 `phase: "task-a"`。
2. workflow 记录：`errorCode: "INTERNAL"`、`lastErrorDetail: "DeepSeek could not be reached"`。
3. 挂 CDP `Network` 域到运行中的 service worker，触发重试 —— **一条出网请求都没有**。
4. 给观测层加一条临时记录后抓到真实异常：

   ```json
   {"event":"qa.ai-transport-failed",
    "endpoint":"https://api.deepseek.com/v1/chat/completions",
    "name":"TypeError",
    "reason":"Failed to execute 'fetch' on 'WorkerGlobalScope': Illegal invocation"}
   ```

5. 同环境下三种调用方式对照实验：

   ```text
   存起来再调用 (产品现在的做法) → TypeError: Illegal invocation
   直接调用                     → 401 ✓
   bind 之后调用 (修法)          → 401 ✓
   ```

**根因**：`extension/src/v2/deepseek.ts` 的构造函数把全局 `fetch` 存进字段
（`private readonly fetcher: typeof fetch = fetch`），之后以 `this.fetcher(...)` 调用。`fetch`
必须带着它所属的全局对象调用，`this` 一旦变成 transport 实例，浏览器直接抛 `Illegal invocation`，
**请求根本没有构造出来**。

**为什么一直没被发现**：

- 单元测试与 E2E 都注入假的 fetcher（普通函数），普通函数不关心 `this`；
- 真实模型调用是需要 API Key 的可选项，Gate 报告里恒为 `NOT TESTED`。

**结论**：v0.2.0 的**真实 AI 路径一次都没有执行过**。这正是 Gate 3 存在的理由。

**修法**：默认值改为 `fetch.bind(globalThis)`（或在调用处 `this.fetcher.call(globalThis, ...)`）。
另加一条测试：用一个断言 `this` 的 fetcher，锁住这个语义。

---

## 二、由 F1 暴露出来的次生缺陷

### F2 · `Check key` 是空实现

`extension/src/v2/handler.ts` 的 `VALIDATE_API_KEY` 分支只重建视图，**从不真的验证**。
用户因此看到 `Saved key ends with ••••ce6f` 后永远停在 `Not checked yet.`，无法自行判断 key 是否有问题
——这直接延长了 F1 的排查。已锁定要求（SET-02 承诺可校验）未实现。

### F3 · 错误码在 `workflow.fail()` 里被降级

`extension/src/v2/workflow.ts:981`：

```ts
const code = error instanceof EngineError ? error.code : "INTERNAL";
```

AI 路径抛的是 `AiUnitFailure`（继承 `DeepSeekFailure`，**不是** `EngineError`），所以真实的
`NETWORK_TRANSIENT` / `AI_AUTH` / `AI_CONTRACT` 全部被替换成 `INTERNAL`。产品在最需要这条信息的
地方把它丢掉了。

### F4 · transport 的 catch 过宽，把本地错误说成网络错误

`extension/src/v2/deepseek.ts` 的 `catch { throw new DeepSeekFailure("NETWORK_TRANSIENT", …, "DeepSeek could not be reached") }`
吞掉一切异常。F1 这种"浏览器拒绝构造请求"被讲成"DeepSeek 连不上"，把排查方向引向网络而非本地。

### F5 · 中断后不会自己续跑

`resumeInterrupted()` 只挂在 `chrome.runtime.onStartup`（浏览器启动）。service worker 被回收后重启时，
处于 `saved` 状态的工作流不会续跑，界面停在 `Progress saved.`。

---

## 三、交互与体验

### F6 · 每次点击整页重绘

`extension/src/v2/screens/render.ts` 的 `paint()` 用 `root.replaceChildren(...)` 替换整棵 DOM 树，
任何状态变化都重建全部界面。用户感受为"每点一个东西页面就刷新一下"。

### F7 · Settings 在左下角，不在右上角

全屏与侧栏的 Settings 入口都是页面末尾的 trailing action。用户已两次提到期望在右上角。

### F8 · 侧栏没有 Settings 入口，且 `API key needs attention` 不可点

侧栏的 `API key needs attention` 是纯文本，而侧栏本来也没有别的入口到 Settings —— 告诉用户"有问题"
却不给解决的地方。Interaction Spec §12 写的是「需要时打开 Full-page Settings」。**已修**：三类提示
（`api-key` / `permission` / `authorization`）变为可点，侧栏点开的是**全屏** Settings 而不是把四段式
配置页塞进 380px 的窄栏。

---

## 四、数据正确性

### F9 · `Non-curriculum` 学期下的课程被当成正式课程

真实发现结果里出现：

```text
semester-detected  AY2026/27 · Semester 1   Current
semester-detected  Non-curriculum           Historical
course-detected    26S1_YLGC01   （学期 _11_1）
course-detected    26S1_SLGC01   （学期 _11_1）
```

PRD §5.1.5 规定 Non-curriculum 默认排除，这两门不应出现。另外该学期名解析不出学年与 term，
会让其下课程的日期全部无法解析。

### F10 · 课程名带长前缀，且全大写

```text
现在  26S1-MAE-MSc-MA6081-FUNDAMENTALS OF PROJECT MANAGEMENT - B
目标  MA6081 Fundamentals of Project Management - B
```

两件事一起做，落在同一个函数里：

1. **去掉前缀**（Product Owner 指令）：去掉学期 / 学院 / 代码这一段，保留代码与其后的内容；
2. **Title Case**（Product Owner 指令）：实词首字母大写，虚词（冠词 / 并列连词 / 介词）小写，
   首词与末词永远大写。

**已修**，缩写判据比原计划更窄（原计划"≤ 4 个字母的全大写即缩写"会把 `COST`、`THE` 也当成缩写）：

- 含数字的词原样保留（`MA6081`、`26S1`）；
- 虚词先判：`OF` → `of`，`FOR` → `for`；出现在首或末位时按英语规则仍大写（`THE` → `The`）；
- 剩下的全大写词里，**长度 ≤ 3 或不含元音**的按缩写保留：`AI`、`PDF`、`NTU`、`HTML` 是缩写，
  `COST`、`DATA`、`EXAM` 是词。带元音的 4 字母缩写（如 `IEEE`）会被读成词——两个方向的误判里这是
  更少见的那个；
- **单个字母按分节符保留大写**：`… - A and F` 里的 `A` 是分节编号，不是冠词。

---

## 五、工具与记录

### F11 · 截图被覆盖

`01-course-discovery.png` 被截两次；`02-scan.png` 先被 ISC-05 覆盖、又被 ISC-02 覆盖。
记录器按"屏幕变化"截图，同一名字没有去重。

### F12 · `chrome.storage.session` 跨浏览器重启保留

上次运行的 QA trace 会被读回来当成本次结果，导致误判（本轮为此误判过两次）。**已修**：记录器在
每次运行开始前清空 trace。

### F13 · 记录器把"扩展重载"当成"窗口被关"

刷新扩展会销毁它拥有的全部页面（含记录器的观察页）。旧实现据此判定窗口被关并**关闭 Chrome**。
已修：观察页可重建，只有浏览器真的断开才算结束。

### F14 · `ps` 在非 UTF-8 locale 下转义非 ASCII 字节

`--user-data-dir` 路径含中文时读回来是 `M-eM^IM-…`，路径比对永远失败，导致记录器重复启动 Chrome。
已修：改比对 profile 目录名。

---

## 六、待 Product Owner 决定或另行处理

### F15 · `/design-spec` 技能与文档均不存在

`~/.claude/CLAUDE.md:67` 与 `~/.claude/rules/design-review.md:3` 都要求"UI/前端设计前必须先调用
`/design-spec` 技能"，但按名字搜索整个用户目录、`~/.claude/` 与项目目录，**都没有这个技能，也没有
这个文档**；已安装的设计技能只有 `frontend-design`（讲美术方向，不讲对齐规范）。
Product Owner 判断这可能是过时要求。本仓库真正的设计规范是 `docs/design-system.md`。

### F16 · 课程标题左边缘不齐

返回键 `‹` 占 header 的 leading 列，课程代码与标题排在它之后；而上方 `Syllab` 按页面内边距起排，
同一屏出现两条左边缘。窄的 Side Panel 里最明显。Product Owner 指示放到收尾之后处理。

---

## 七、重跑验收期间新发现（2026-09-19 下午）

### F17 · Chrome 会继续执行重新构建前的 service worker 脚本，验收跑在了旧构建上

**现象**：重跑验收时，记录器抓到的第一段 trace 仍然出现 `Non-curriculum` 学期与
`26S1_YLGC01` / `26S1_SLGC01` 两门课 —— 而 F9 的过滤代码明明在磁盘上。也就是说这一轮验收
一直在观测一个不含 F9 的旧构建。

**证据链**（都是只读的比对，没有改动产品）：

1. 磁盘上的构建文件：`extension/dist-qa/background.js` = 314,895 字节，SHA-256 `4b8a525b…`，
   含 `NON_CURRICULUM_TERM` 过滤；
2. 通过 `chrome.runtime.getURL("background.js")` 在运行中的 worker 里取回同一个文件，哈希一致
   —— **资源读取器是新的**，所以"装的是旧目录"这个方向是错的；
3. 改用 CDP `Debugger.getScriptSource` 读 **V8 正在执行的那份脚本**：311,206 字符，不含过滤，
   `hasFilter: false`；
4. 在 profile 里找到它的来源：

   ```text
   .tmp/syllab-qa-profile/Default/Service Worker/ScriptCache/6c038e3570d6abf1_0
   311,628 bytes   15:41   ← V8 执行的这份
   extension/dist-qa/background.js   314,895 bytes   15:53   ← 磁盘上的新构建
   ```

   Chrome 进程启动于 15:53:54，晚于构建完成 1 秒，**仍然复用了 ScriptCache 里的旧脚本**。

**结论**：对一个 unpacked 扩展，重新构建 + 重启浏览器**不足以保证**跑的是新代码。这正是
`AGENTS.md` 的完成门禁要求"reload the unpacked extension"的原因，但这条要求此前只靠人记得。
本轮通过 `chrome.runtime.reload()` 解决，重载后 V8 执行的脚本与磁盘一致。

**待办**：记录器应当在**开跑前**做这项校验（比对执行脚本与磁盘构建的哈希），不一致就拒绝开始，
否则任何一轮验收都可能悄悄测了旧构建。这是工具侧缺陷，不影响产品。

### F18 · 旧 repository 层用 v5 打开一个已经升到 v6 的数据库（死代码）

`extension/src/repository/local-database.ts:60` 的 `openLocalDatabase()` 以
`indexedDB.open("syllab-local", 5)` 打开，而 `extension/src/v2/schema.ts:49` 的
`V2_DATABASE_VERSION = 6` —— 同一个库。库里已经是 v6 时，旧函数会直接
`VersionError: The requested version (5) is less than the existing version (6)`。

**影响范围**：`parser/` `normalize/` `review/` `brief/` 四个旧 repository 只被
`background/{parse,normalize,extraction}-runner.ts` 引用，而这三个 runner 在 v0.2.0 里
**已经没有任何模块引用**（v0.1.0 遗留）。所以产品路径不受影响，本轮验收未因此失败。

**待办**：属收尾范畴 —— 要么删除这批死代码，要么把版本号改为引用同一个常量。记录在此，
避免下一个会话再被它绊一次（本轮清理脚本就先被它挡了一次）。

### F20 · 扫描进行中，界面显示 `Progress saved.`

`engine.start()` 建出的工作流初始 `state: "queued"`（`extension/src/v2/course-state.ts:144`），
而 `taskStatus()`（`extension/src/v2/view.ts:627`）把**除 working / waiting / failed 之外的一切**
都映射成 `saved`，渲染为 `Progress saved.`（`copy.ts:37`）。

于是点下 `Scan course` 的**第一次绘制**就是 `Progress saved.`；此后界面只在
`notifySurfaces()` 时更新，而它挂在 `engine.run()` 结束之后 —— 一次 119 来源的扫描要跑几分钟，
这几分钟里用户看到的就是这一句。**"正在跑"和"停住了"在界面上完全同形。**

### F21 · 扫描结束后没有入口进入 Initial Review（阻断）

**现象**：MA6081 的扫描已经完成（工作流 `state: "waiting"`、`phase: "review"`、23 次真实模型调用
全部 `succeeded`），但用户走不到 Review。实测：

```text
点 MA6081 卡片   → SEM-07  This course hasn't been set up yet.  + [Scan course]
点 Scan course   → ISC-04  Waiting for your review / Finish the review to continue.
                            ← 没有任何按钮
```

**根因**：进入 Review 的唯一入口是课程卡片上的 `pending-review` 状态区
（`extension/src/v2/screens/patterns.ts:364`，注释写明 "The status area is the only entry to
Review"），而它由 `courseCues()` 产出，`semesterCard()` 在**课程未 established 时直接返回空状态**
（`extension/src/v2/view.ts:373`）。同时 `CourseRecord.established` 在 v0.2.0 的完整路径里
**从来不会被置为 true** —— 全仓库只有 `fixtures.ts` 与 `handler.ts:459`（后者写的是
AssessmentRecord 上的同名字段）出现过 `established: true`。

于是：扫描产出 Review 之前课程不 established，不 established 就没有 Review 入口 —— 锁死。
`scanScreen()` 又把 waiting+review 映射到 ISC-04（`render.ts:291`），而 ISC-04 的
`waitingCopy("review")` 没有 action（`patterns.ts:581`）。

**修法**：见 F22–F25。这一条违反的是 **Interaction Spec §5.4**（Scan 完成且存在待确认 Assessment →
直接进入 Initial Review）与 **§11.7**（`Waiting` 只有四个用户可解决的理由，`review` 不在其中）。

### F22 · `CourseRecord.established` 永远不会变成 true

**证据**：`extension/src/v2/store.ts:427` 的 `recomputeEstablished()` —— 注释自己写着
"Source of truth for 'is this Course established' is the aggregate, not a cached flag" ——
**全仓库没有任何调用者**。`established` 只在 `fixtures.ts`、v0.1→v0.2 的 `migration.ts`
以及 `handler.ts:459`（那个写的是 AssessmentRecord 上的同名字段）出现过 `true`。

**后果**（三处已锁定要求同时落空）：

- §3.1「点击 Pending Review status → 对应 Review」—— 卡片根本没有状态区，因为
  `semesterCard()` 在 `view.ts:373` 对未建立课程直接返回空状态；
- §4.2「Course Brief 是默认主体」—— 未建立课程永远进不去 Brief（`view.ts:250-258`）；
- §6.7「最后一条处理完后直接回 Course Brief」—— 回不去。

**判据修正**：原始实现用「有任何非 superseded 的 Assessment / Constraint」。实测当前数据是
**11 个 assessment、11 个都挂着待确认的 review item、0 个已确认** —— 这条判据会在用户一条都没
确认时就把课程标成已建立，而 §3.5 明确要求 Not Established 课程**不显示任何状态文字**。
结合 §6.7「Confirm 后立即进入 Current Course State，不等待全部 Review 完成」，正确判据是
**「至少有一个对象已确认」**（即不再挂在 review 里）。第一次 Confirm 即建立。

### F23 · `queued` 被渲染成 `Progress saved.`

**文档**：§11.3「`Saved` 主要是 persistence / recoverability state，**不作为常驻视觉状态**」；
PRD §5.6.5 同；§11.7 要求 Working / Waiting / Failed / Saved 四个状态在用户看来可区分。

**实现**：`engine.start()` 建出的工作流是 `state: "queued"`（`course-state.ts:144`），
`taskStatus()`（`view.ts:627`）把除 working / waiting / failed 之外的一切都映射为 `saved`。
于是点下 `Scan course` 的第一帧就是 `Progress saved.`，且界面只在 `engine.run()` 结束后才更新 ——
一次 119 来源的扫描要跑 3 分钟以上，这几分钟里「正在跑」和「停住了」完全同形。

**后续（Product Owner 指示）：整句删除。** `Progress saved.` 这句话在**全部产品文档里一次都没出现过**
（PRD 只定义了状态 `Saved`，§5.6.5/§11.3 且要求它不作为常驻视觉状态），是 v0.2.0 实现自行写进
`copy.ts` 的。`saved` 作为**工作流状态**保留（§5.6.5 定义的就是它，`fail()` 与 `retryDueAt()` 都在用），
但**不再是界面状态**：

- `TaskStatusView["state"]` 收窄为 `"working" | "waiting" | "failed"`；
- `taskStatus()` 只区分这三者，停在重试排期上的运行仍按它**本来就是的那个任务**呈现（Syllab 自己在
  五分钟 / 三十分钟后接着跑）；
- `patterns.ts` 的 saved 分支、`copy.ts` 的 `taskSaved`、`fixtures.ts` 的 "TASK (saved)" 用例一并删除。

### F24 · Authorization 的 Waiting 屏没有动作（与 F21 同类死路）

**文档**：§5.6 的两张 Waiting 屏都带动作（`[ Open Settings ]` / `[ Grant permission ]`）；
§11.7 要求 Waiting「系统知道缺少什么，而且用户可以解决」。

**实现**：`taskStatus()`（`view.ts:650-658`）只为 `api-key` 设 `action: "OpenSettings"`、
为 `host-permission` 设 `"GrantPermission"`；`privacy-authorization` 与
`api-usage-authorization` **不设 action**，而 `taskBlock()` 的兜底也只认 api-key
（`patterns.ts:519`）。于是 ISC-04 会显示 "Permission required / Allow course content to be
sent to the AI to continue."，**没有任何按钮**。

### F25 · Initial Review 已处理的 review item 从不删除（数据正确性）

**证据**：`store.commitMutation()` 对 `reviewItems` 只做 `putMany`（upsert，`storage.ts:176`），
而 `readSnapshot()` 把表里所有该课程的 item 都当作 pending（`store.ts:91`，无任何过滤）。
Initial Review 的三个分支（`handler.ts:435` Exclude / `463` Confirm / `476` SameAssessmentAs）
提交后**都没有调用 `deleteReviewItems`** —— 该函数只在 Change Review 路径被调用
（`handler.ts:612`）。

**后果**：`buildReview()` 取 `snapshot.reviewItems[0]`（`view.ts:534-556`），已确认的那条仍在表里，
所以**第一条确认之后会原地打转**，永远停在同一个 item 上。

**为什么之前的 Gate 没抓到**：`scripts/browser-e2e.mjs:113-123` 用 fixture seed 了
`initial-review`，只确认了**一条**就转去测 Change Review；`workflow.test.ts` 的
"runs discovery through review in one start" 只验证引擎跑到 review，不跑 review 循环本身。

### F26 · 返回键有时候按下去没反应（未能复现，待 Product Owner 补充场景）

Product Owner 在 2026-09-19 实机反馈："返回键有的时候会卡住"。

**本轮实测：未能复现。** 修复后按真实点击路径走了一遍（IRV-01 → 点 `‹` → CRS-02），返回正常，
并且正确落到 Course Brief + 状态区 `Review · 10`。（第一次尝试看起来"卡住"是**记录脚本自己的
选择器写错了** —— 那个按钮的可访问名是 `Back to course`，不是 `‹`；换对选择器后立刻正常。
这条也提醒：下次报"某控件没反应"之前，先确认点击真的落在了控件上。）

**代码层面确实存在的可疑机制**（尚未与实机症状对上）：`extension/src/v2/screens/mount.ts` 的
`runRequest()` 对 `chrome.runtime.sendMessage` **不设超时**（`mount.ts:223-232`）。Service Worker
在扫描期间正跑着几十秒量级的模型调用或 IndexedDB 阶段，消息会排在它后面；在它回应之前，界面不会
有任何变化，也没有"正在处理"的反馈。扫描时长可达数分钟（见 F23），症状会表现为"有时候卡住"。

**待补**：需要 Product Owner 记下具体一次 —— 哪一屏、当时有没有扫描在跑。若确实是上面的机制，
修法是给这类请求一个超时与可见反馈，而不是继续无限等待。

### F27 · 扫描期间界面阶段不推进（§5.2）

**文档**：§5.2 要求 Scan 屏显示「当前真实用户阶段」（四个固定阶段之一），不显示百分比。

**实现**：`background/index.ts:142-147` 的 `driveWorkflow()` 只在 `engine.run()` **整体结束之后**
调用一次 `notifySurfaces()`；引擎在阶段之间从不通知界面。§5.2 的四个阶段因此只有第一个会出现，
后面三个阶段在用户看来从未发生过 —— 一轮真实扫描是分钟级，这期间屏幕停在
`Finding course content…`（F23 修好之后至少不再是 `Progress saved.`，但仍不是文档要求的真实阶段）。

**修法**：`EngineOptions` 增加 `onStage` 回调，在 `advance()` 与 `complete()` 真正改变阶段时触发；
`background/index.ts` 把它接到 `notifySurfaces()`。按**阶段**触发而不是按每一步 —— 一个 119 来源的
Course 每一步都通知会让界面被无意义的重建淹没。

### F28 · 附件解析请求发给了一个从不存在的 Offscreen Document —— 全部 PDF 读不到（阻断）

Product Owner 反馈"assessment 捕获结果非常差"。逐层对照后，问题不在 Prompt：
三套 Prompt 与 `PRODUCT_HANDOFF_v0.2.0.md §12` 的 accepted baseline **逐字节一致**
（7972 / 9048 / 8536 字符）。问题在**喂给模型的输入**。

**实测数据**（MA6081，真实运行）：

```text
119 个来源：20 个读到文本 → 只有 20 次 Task A
           19 个 attachment  · 失败 19  · PARSER_RUNTIME_FAILED
           70 个 course-content-item · 失败 57 · NO_EXTRACTABLE_TEXT
           23 个 assignment · 失败 16 · NO_EXTRACTABLE_TEXT
            7 个 announcement · 失败 7 · NO_EXTRACTABLE_TEXT
```

课程大纲、讲义、试卷、Group Presentation 指南全是 PDF —— 也就是**产出 Assessment 的关键来源
一个都没进过模型**，Task A 只看到了少量练习测验，Review 里因此出现 11 条 "Practice Course Quiz N"。

**根因**（三重证据）：

1. 创建 Offscreen Document 的代码在 `extension/src/background/parse-runner.ts:17`
   （`chrome.offscreen.createDocument`），而该文件在 v0.2.0 里**没有任何模块引用**
   —— 就是 F18 记录的那批 v0.1.0 遗留死代码；
2. v0.2.0 真正在跑的 `extension/src/background/index.ts` 中
   `parseAttachment()`（:237-279）直接 `chrome.runtime.sendMessage({type:"PARSE_ATTACHMENT"})`，
   **全文件 `offscreen` 出现 0 次** —— 从不创建那个文档；
3. 从运行中的 Service Worker 实测：`chrome.offscreen.hasDocument()` → `false`，
   而 `offscreen.html` 与 `parser-worker.js` 都在构建产物里。

`sendMessage` 随即以 "Could not establish connection. Receiving end does not exist." 被拒，
`catch` 把它换成 `PARSER_RUNTIME_FAILED`（`background/index.ts:276-278`）。这是**毫秒级**失败，
所以 119 条 observation 全部落在 08:01 这一分钟内 —— 不是超时，是根本没有收件方。

**这条正是 Gate 3 存在的理由**：Attachment → PDF 是一条**真实产品路径**，单元测试与 e2e 都注入假的
parser，从未经过浏览器；`Technical Design §8.3` 还写明逐页栅格化是 "Planned / not implemented"，
但那是"读到空文本"，而实际发生的是**连解析都发起不了**。

**已修，并已在真实环境验证。** 修法是把 v0.1.0 的 retained adapters 接回活路径（不是新写）：

- `background/index.ts` 恢复 `ensureOffscreenDocument()`，在发送 `PARSE_ATTACHMENT` 前创建文档；
- 同一文件恢复 `observeFirstUnapprovedRedirectOrigin` 的 `webRequest` 端口、`recordPermissionOrigin`
  与**真实的** `missingPermissionOrigins()`（原来硬编码 `Promise.resolve([])`）；
- `blackboard.ts` 取附件前先观察跳转，命中未授权 origin 就记录并报 `permission-denied`；
- `workflow.ts` 的取数单元遇到缺权限时 `waitForHostPermission()` 停等（不记成失败）；
- `handler.ts` 的 `RetryTask` 同时恢复 `failed` 与 `waiting/host-permission` 两种运行；
- `mount.ts` 的 `Grant permission` 在**点击的同一个手势里**调 `chrome.permissions.request`
  （请求的就是 manifest 里声明的那两个 optional pattern —— 更宽或更窄都不对）。

**验证记录**（真实 Chrome、真实 NTU Learn）：

```text
授权前（MA6084）  +5s  ISC-02  Finding course content…      ← 阶段在推进
                  +10s ISC-04  Permission required / Allow access to continue.  [Grant permission]
                  workflow: state=waiting phase=fetch waitingReason=host-permission

授权后（MA6083）  recordedOrigins = [ alt-5dcb73f79ba4c.blackboard.com,
                                      prod01-apse1-prod01-xythos.prod.files.blackboard.com ]
                  8 个 PDF  attachment · ok/ok        ← 下载并解析成功
                  2 个 PDF  attachment · HOST_PERMISSION_REQUIRED
```

两跳 origin 都被发现并记录，与 manifest 声明的两个 optional pattern 一一对应 —— 设计预判正确。

### F29 · 100 个非附件来源里 80 个没有文本 —— **改判：一半是 Coverage Fact，一半是真 bug**

第一次核对（本轮早些时候）的结论是"这些来源本身就没有正文可读"，依据是逐个取内容详情接口看到
`description` 为空、只剩元数据。**那个结论对内容项成立，但把公告一起算进去了，而公告是有正文的。**

2026-09-19 傍晚的重新核对（同一条通路，直接看真实响应）：

- 内容项（70 个）：确认大部分是目录、文件外壳、测验链接、外链，`description` 确实为空 ——
  原结论成立；
- **公告（7 个）：全部有正文，而且一个都没被读到。** 列表接口就直接返回
  `body`，形状是 `{ rawText, displayText, webLocation, fileLocation }` ——
  `announcement:_807789_1`（"Group Presentation schedule and time"）的 `body.rawText` 是
  **1475 字符的 HTML，里面是一张小组展示时间表**。七个公告里就这一个就带着日期。

**根因**：`extension/src/discovery/engine.ts:147`
`rawTextEvidence()` 对 `body` 只接受字符串（`typeof value === "string"`），而平台的 `body` 是对象；
紧接着的嵌套下钻列表（`["content", "contentDetail", "data"]`）里**没有 `body`**，所以那个
`rawText` 从来没有被取出来过。函数把 `body` 排在键列表第一位，说明本意就是要读它 —— 是形状假设
错了，不是有意跳过。

**影响**：所有公告的正文，以及任何把正文放在 `body.rawText` / `body.displayText` 的内容项，
都不参与 AI 理解。MA6081 的 119 个来源里只有 20 个带文本（13 个内容项 + 7 个 assignment），
公告 7 个全是 0 字符 —— 这正是 Product Owner 说的"assessment 捕获结果非常差"的一个直接来源，
也是 F36 的成因之一。

**修法**：把 `body` 加进嵌套下钻列表（一行），并加一条用真实形状 `body` 的测试
（`discovery/engine.test.ts`：`reads the text out of a body that is an object rather than a string`）。

**注意**：这条修复只对**重新扫描**生效。已建立的课程里存的是旧的解析结果，公告文本仍是空的；
要看到效果需要 Rebuild 或重新 Scan 一门课（会消耗 API 额度，由 Product Owner 决定）。

### F30 · `SourceRecord.nativeItemId` 被写成了 `sourceId`（数据卫生）

`extension/src/v2/workflow.ts:454` 建 SourceRecord 时写的是 `nativeItemId: source.sourceId`，
而 `blackboard.ts::discover()` 甚至没有把 `DiscoveredSource.nativeItemId` 传出来
（`MachinePort.discover()` 只返回 sourceId / title / kind / parentSourceId）。

**影响**：产品自己不读这个字段，功能不受影响；但它让"nativeItemId"这个名字指向了错的东西 ——
本轮排查中我两次据此构造出非法 URL（`/contents/content%3A_6043575_1` → HTTP 400），
误判成产品缺陷。**已修**：`discover()` 传出真实 native id，`unitDiscover` 写入它。

### F31 · 可恢复的失败会停在 `Progress saved.`，而退避到期时没有任何东西唤醒 worker

Product Owner 问"`Progress saved.` 什么情况才会触发"。查清了，而且它触发得比想象的容易：

`extension/src/v2/workflow.ts:1058` 的 `fail()`：

```ts
state: exhausted ? "failed" : "saved"
```

即**任何可重试的步骤失败**（`failureRetryable(error) === true` 且 `attempt < MAX_ATTEMPTS = 3`，
典型是 `NETWORK_TRANSIENT`）都会把运行停在 `saved`。而界面只在 `state === "failed"` 时渲染
`Try again`（`patterns.ts:540`），所以用户看到的是**一句 `Progress saved.`、没有任何按钮** ——
正是 Product Owner 最初截图里的那一屏。

**两处违反已锁定要求：**

1. **§5.5**「临时可恢复 failure **先自动 Retry**」—— 而 `retryDue()` 虽然按
   `RETRY_DELAYS_MS`（5 分钟 / 30 分钟 / 2 小时）算出了到期时刻，**却没有任何东西在那一刻醒着**：
   `resumeInterrupted()` 只挂在 worker 启动上，15 分钟的 `syllab-opportunity-check` 闹钟也不调它。
   实际效果是：这次运行要等到**下一次浏览器启动**才会续跑。F5 当初"接上 `RETRY_DELAYS_MS`"
   只补了一半 —— 排期算出来了，但没有排期。
2. **§11.3**「`Saved` …**不作为常驻视觉状态**」—— 而它一停就是几十分钟到几小时。

**已修**：

- `workflow.ts` 新增 `retryDueAt()`，明确给出"哪一刻到期"（`retryDue()` 改为基于它），
  这样才有东西可以被安排；
- `background/index.ts` 新增 `scheduleParkedResume()`：扫描所有停等的运行，用
  `chrome.alarms` 为最早到期的那一刻**预订一次唤醒**；`driveWorkflow` 收尾与
  `resumeInterrupted()` 都会调用它，闹钟到点直接调 `resumeInterrupted()`。
  闹钟是 MV3 里唯一能在任意未来时刻唤醒 worker 的机制，这正是它该被用的地方。

#### F28 补充 · 还有第二重阻断：下载被重定向到未授权的 origin，而检测它的代码也是死的

把附件 URL 直接拿去取（NTU Learn 的 `bbcswebdav` 地址），CDP 抓到的是：

```text
sent    https://ntulearn.ntu.edu.sg/bbcswebdav/pid-6010317-.../xid-64703757_1
sent    https://alt-5dcb73f79ba4c.blackboard.com/bbcswebdav/pid-6010317-.../xid-...
FAILED  net::ERR_FAILED   WildcardOriginNotAllowed
```

NTU Learn 把下载**重定向到 Blackboard 的 CDN**，而 `manifest.json` 的 `host_permissions` 只有
`ntulearn.ntu.edu.sg` 与 `api.deepseek.com`。跨到未授权 origin 后按普通 CORS 处理，CDN 回
`Access-Control-Allow-Origin: *`，而**带凭证的跨域请求遇到通配符必须被拒绝**。逐个变体实测：

```text
ntu + include    → Failed to fetch        （CORS 拒绝）
ntu + omit       → Failed to fetch
cdn + include    → Failed to fetch
cdn + omit       → 200 但 content-type=text/html   （返回的是网页，不是文件）
ntu + manual     → opaqueredirect          （不可读）
```

**也就是说：换到哪个页面、点不点进去，都取不到。**

而产品**本来设计好了这一步**：`extension/src/fetch/redirect-observer.ts` 的
`observeFirstUnapprovedRedirectOrigin()` 专门用来发现"重定向到了未授权 origin"，
再由工作流进入 `waiting/"host-permission"`，界面上出现「Permission required / [Grant permission]」，
用户授权后重试。**v0.2.0 只保留了这条链的 UI 一侧**：

- `WaitingReason`、`waitingReason: "host-permission"`、`view.ts` 的文案与
  `GrantPermission` 动作、`fixtures.ts:498` 的用例 —— 都在；
- 而检测它的 `fetch-runner.ts` **零引用**（同 parse-runner / normalize-runner / extraction-runner，
  四个 runner 全部零引用）；
- 活代码里 `background/index.ts:94` 的 `missingPermissionOrigins: () => Promise.resolve([])`
  —— **硬编码返回空**，这个 Waiting 状态在 v0.2.0 里永远不会被触发。

**这解释了 Product Owner 问的"为什么之前可以"**：v0.1.0 里这整条链是活的（offscreen 文档会被创建、
重定向会被观察并转成授权请求）。v0.2.0 用 v2 引擎重写了取数流程，换掉了这批 runner，
只留下了它们的界面表现。（重定向到今天仍在，见上面的实测；v0.1.0 当时是否已经存在该重定向，
代码里没有记录，只能从 `observeFirstUnapprovedRedirectOrigin` 的存在推断它被真实观察到过。）

### F29 · 100 个非附件来源里 80 个没有文本（未查完）

同一批数据里，非附件的 100 个来源有 80 个 `NO_EXTRACTABLE_TEXT`
（`extension/src/v2/blackboard.ts:141`：`rawText` 为空）。其中相当一部分是**本来就无正文的容器
与链接**（`Media Gallery`、`Zoom Meeting for Students`、`Library Resource Gallery`、`Content`、
`Assignment` 这类目录项），但并非全部：例如 `content:_6043575_1` 的详情接口**确实返回 750 字符的
`description`**，`rawTextEvidence()` 的第二顺位就是 `description`，理论上应该读到。

未查完的原因：复现脚本用错了通路（标签页的 Content Script 在扩展重载后成了孤儿，`sendMessage`
返回 `null`），**那次复现无效**。下一步需要一个有效复现：刷新 NTU Learn 标签页后，用引擎同一条
`chrome.tabs.sendMessage` 通路连续取这 80 个来源的详情，确认是**详情请求失败**
（119 次密集请求被限流？）还是**解析层没取到字段**。

---

## 八、产品定义复查：还有哪里"私自加了东西"（2026-09-19 傍晚）

Product Owner 的提问是：除了 `Progress saved.`，还有没有别的地方实现了产品文档里没有的东西。
复查方法不是读代码找可疑之处，而是**让文档来判**：

1. 把 `copy.ts` 的 167 条文案逐条拿去三份产品文档里找回声（`PRD`、`Interaction & IA Spec`、
   `PRODUCT_HANDOFF`，外加本版技术文档）。119 条有明确出处；剩下 48 条人工逐条对照它所属的
   Screen 章节。
2. 把代码的 `ScreenId` 全集与 Spec 的 Screen 表逐个比对（47 个，完全一致，无多无少）。
3. 逐个检查界面上的控件、派生值、状态字段是否有文档依据。

结论：**大部分"文档没写"的文案只是文档给控件留的余地**（`Back to course`、`Show less`、
`Save key` 之类，文档画了控件没写死英文），但**三处是真的加了文档里没有的东西**，外加一处
只是写错了位置。

### F32 · "Course information may be out of date" 在同一块里出现了两次

§4.17 / §11.6 画出的是：

```text
Needs attention            ← 状态条
Course information may be out of date    ← 展开后的标题
Last successful check: 8 Sep             ← 展开后的第二行
Try again
```

`extension/src/v2/view.ts` 把第二行写成了
`Course information may be out of date. Last successful check: 8 Sep`，而渲染层
（`screens/patterns.ts::attentionDetail`）在上面又原样打印了一遍标题。用户看到的是同一句话连着
两遍；当课程从未成功检查过时，第二行退化成 `Course information may be out of date.`，就是同
一句话加个句号。

**修法**：`detail` 只留 `Last successful check: {date}`（新增 catalogue key
`attentionLastCheck`），没有日期时整行不出现。空着比重复好——§4.17 也只在有日期时才画这一行。

### F33 · `Nothing to review` 是一整屏文档里没有的界面

§6.7 写得很清楚：最后一条处理完**直接回 Course Brief**；可以短暂显示 `Review complete`，
**不建立完成页**。而 `screens/initial-review.ts` 里有一个 `renderReviewEmpty()`，渲染
`Nothing to review` / `There are no review items waiting in this course.`（两条 catalogue key），
带一个返回键。

两个问题叠在一起：

- 它是完成页，且是一个空状态，而文档明确不要完成页；
- **路由根本到不了它**。`resolveScreen()` 是唯一的裁决者：没有 review item 时
  `reviewLayout()` 返回 `changed`，屏幕被解析成 `CRV-01`，`renderInitialReview()` 只有带着
  review item 才会被调用。这个函数之所以还活着，是因为渲染测试里有一个 fixture 直接把它渲染出来
  （`render.test.ts::copy > uses every catalogue key`），用来让"catalogue 无未使用 key"这条断言
  通过 —— 和 `Progress saved.` 一样，是**被 fixture 而不是被产品养着的界面**。

**修法**：`renderReviewEmpty()`、两条 copy key、那条 fixture 断言全部删除。没有 review item 时
由 `resolveScreen()` 直接给出 Course Brief（`CRS-01` / `CRS-02`），这正是 §6.7 说的行为；
`renderInitialReview()` 的兜底分支也渲染 Course Brief，而不是自造一屏。测试改成断言这个行为：
没有 review item 的 `IRV-01` 路由必须渲染出 Course，且**不能**出现 `review-screen`。

### F34 · `view.ts` 里三句用户可见的话从未进过 copy 目录

`copy.ts` 的文件头写着"渲染层不带用户可见字面量"。但用户看到的话不只来自渲染层：
`view.ts` 负责**造出**渲染层要打印的值，那里写了三句文档里没有、也不在任何 copy 目录里的话：

| 位置 | 文案 | 什么时候出现 |
| --- | --- | --- |
| `view.ts:774` | `Course change` | review item 既没有对应 Assessment 也没有对应字段时的标题 |
| `view.ts:684` | `This task could not be completed.` | 失败任务没有 `lastErrorDetail` 时的原因行 |
| `view.ts:132` | `Course source` | Evidence 的来源记录已不存在时的来源名 |

三句都是**合理的兜底**（不是错的文案），问题在于它们在目录之外：既查不到出处，也过不了
"catalogue 无未使用 key / 界面无未定义 key"这层检查。**修法**：措辞一字不改，收回 `copy.ts`
（`reviewCourseChange` / `taskCouldNotComplete` / `evidenceCourseSource`）。

顺带修掉了让这三句一直看不见的原因：那条检查用 `usedCopyKeys()` 统计，而它只记录**渲染**过程中
被问到的 key，`view.ts` 不参与渲染，所以 view 层的话对它完全不可见。现在这条断言改成
"渲染过程问到过 **或** 源码里任一模块点名过"，并且**跳过 `copy.ts` 自身**——不跳过的话每个 key
都被自己的声明点名，这条检查就永远通过了。

### 复查过、判定为"文档给的余地"而不是私自添加的部分

如实列出，供 Product Owner 复核：

- **`unvalidated`（API key 的第四种状态，SET-03）**：Spec §10.2 / SET-03 只写了 Valid / Invalid /
  Missing。`Not checked yet.` 是"已保存但还没验过"（比如离线时保存的），是三者之外的一个真实的
  中间态，不覆盖也不冲突；
- **`ISC-02` 的标题 `Setting up this course`**：§5.2 只定义四个阶段文案，没定义标题。屏幕需要
  一个标题，这句是描述正在发生的事；
- **`There are no confirmed dates to export yet.` / `No dates can be exported yet.`（CAL-01）**：
  §9.1 只画了有事件时的样子。第二句是刻意分开的——课程确实有日期、只是产品读不出年份时，说
  "没有日期"是不实的（这条是 F 系列早先的修复）；
- **`This backup contains` / `This replaces everything` / `Replace everything`（BKP-02）**：§10.6 /
  §10.7 要求"必须明确告诉用户会覆盖当前本地 state"，画了摘要没写死英文；
- **`Current` / `Latest` / `Other values` 这三个标签有两个出处**：§7.2 / §7.4 / §7.7 用的正是这三
  个词，但 `view.ts` 写了一份、`copy.ts` 也有一份，渲染时取的是 `view.ts` 那份。文案一致，
  只是重复。**未改**——它不产生用户可见的差异，属于整理而非纠偏；
- **`TaskStatusView.waiting.copy` 与部分 `StatusCue.copy` 是死字段**：渲染层对同样几个状态自己
  取 catalogue（`waitingCopy()` / `statusText()`），这两个字段当前没有任何渲染路径读取。
  同样是"两个出处只用一个"，**未改**。

### 复查方法与结论的可复现性

这次复查用的脚本（`.tmp/audit-copy.mjs`）不进 Git，但方法写在这里，任何一次都能重跑：
把 catalogue 的取值做归一化（去占位符、去标点、转小写），在三份文档里找最长匹配窗口；没有
任何窗口命中的条目就是人工复核清单。**它只能证明"文档里没有这句话"，不能证明"这句话不该存在"**
——48 条里最后只有 3 条是真的越界，剩下的是文档给控件留的余地。这一步必须人工判。

---

## 九、跑完验收时新发现的两条（2026-09-19 傍晚）

Product Owner 通过权限后重跑验收，得到的结果不是"全绿"，而是两条更靠后的阻断。如实记录。

### F35 · 失败的模型调用不留任何痕迹，所以"AI_CONTRACT"当时无法解释

**症状**：MA6083（`_2707110_1`）和 MA6084（`_2707113_1`）两门课的 workflow 都停在
`saved / task-a`，`attempt: 2`，`errorCode: AI_CONTRACT`，`lastErrorDetail` 分别是
`the response was not valid JSON` 和 `AI_CONTRACT:schema:syllab.ai/task-a/1`。

**为什么查不下去**：产品的 `aiRuns` 表只写**成功**的调用（`deepseek-complete.ts` 在成功分支才
返回；`workflow.ts:931` 的 `qaTrace("qa.deepseek-task", …)` 在失败时会先抛异常），所以库里
44 条记录**全是 succeeded**，失败那三次的响应内容一个字都没留下。QA trace 里也没有。也就是说：
一次真实的验收可以报告"AI 契约失败"，而任何人都无法说出模型到底返回了什么 —— 是空白？是
markdown 代码块？还是 `schema` 字段拼错了？这三者的修法完全不同。

**修法（只加观测，不改行为）**：新增 `qa.ai-contract-failure` 事件，在 `completeJson()` 每一轮
契约失败时记录：第几轮、失败描述、`finish_reason === "length"` 与否、响应长度、**前 40 个字符**、
以及（若能解析成对象）顶层键名和 `schema` 字段的值。不记录 prompt，不记录完整答案 —— 产品里
"不记录 prompt、不记录答案"的原则保留；`qaTrace` 本身也会先脱敏再写入。生产构建里这个调用被
`dropQaTelemetry` 换成空函数，shipped bundle 不受影响。

**状态**：观测已加，并且**当晚就用上了** —— 见下。

#### F35 附 · 16 分钟后同一个 bug 被解释清楚了

MA6083 / MA6084 的退避排期在 17:28:59 / 17:32:15 到期（`chrome.alarms`，F31 修的），重试在
验收脚本的观察下真的跑了。新加的 trace 一次性给出了答案，13 条失败记录里**每一条
`truncated` 都是 `true`**：

```text
{"attempt":1,"detail":"the response was not valid JSON","length":6601,
 "head":"{ \"schema\": \"syllab.ai/task-a/1\", \"sourc","truncated":true}
{"attempt":2,"detail":"the response was not valid JSON","length":15800,
 "head":"{ \"schema\": \"syllab.ai/task-a/1\", \"sourc","truncated":true}
{"attempt":1,"detail":"the response contained no message content","length":24000,
 "head":"{\"id\":\"1da87b13-fa99-4598-8a76-260417108","truncated":true}
```

**根因（已确认的部分）**：模型**答到一半被截断**了（`finish_reason: "length"`），JSON 没有收尾，
所以 `JSON.parse` 失败。头部显示 `schema` 是**对的**（`syllab.ai/task-a/1`），也就是说模型完全明白
要什么，只是没写完。加预算能让它多写：同一单元第一次 6601 字符、第二次（预算翻倍）15800 字符，
第三次仍 `truncated`，且长度顶到 24000 —— 那正好是 `MALFORMED_EXCERPT_CHARS`，说明截断前的真实
响应比记录下来的还长。

**还不能确定的部分（不要在结论里替它下判断）**：撞的到底是产品自己传的 `max_tokens`
（`TASK_A_MAX_TOKENS = 8_000`，第三次重试是 `min(16000, 8000×2)`）还是服务商对
`deepseek-flash` 的隐藏输出上限。证据是"加预算就变长"（说明是预算/上限在卡），但 6601 字符
（约 1.6k token）离 8000 还很远就报了 `length`，所以**服务商侧还有一个更低的硬上限**是更可能的
解释。要分辨这两者，下一次需要把**请求的 `maxTokens` 和响应头/用量一起记进 trace** ——
本轮没记，所以不写死结论。

撞线的都是**附件单元**（一门课里最大的那些 PDF），也就是 F28 刚刚修好、刚刚才第一次真正读到
内容的那一批 —— 链路修通之后暴露出来的是下一环不够用。

**第二个 bug（同一个晚上修掉）**：截断的信息在错误文案里被丢掉了。`readProviderCompletion()`
先看"解析成功没有"，截断只在"解析成功"时才被上报，于是"答到一半被截断"被报成了
`the response was not valid JSON` —— 而这句话会出现在 `workflow.lastErrorDetail` 上，
`view.ts` 把它当作**用户可见的失败原因**显示。用户看到的是一句既不准确也没法行动的诊断。

**修法**：

- `readProviderCompletion()`：截断且解析失败时，结论是"被截断"而不是"JSON 不合法"——两件事
  走的是同一扇门（JSON 没解析出来），但说的是两个不同的问题。文案复用产品里已有的那句
  `the response was cut off before it finished`（提为常量 `TRUNCATION_PROBLEM`，两处共用一个措辞）。
  加了测试 `flags truncation, missing content and unusable JSON` 的新断言；
- **没有动**输出预算。`TASK_A_MAX_TOKENS` 该不该调、修复轮要不要直接跳到 16000 上限、还是把
  大附件分得更细（`chunking.ts` 已经存在，task-a 本来就是按 chunk 逐个调用的）—— 这是**产品
  决策**：它直接改变每次扫描的 API 花费。留给 Product Owner 定。本轮只把问题说清楚。

### F36 · 五门课没有一门有日期，所以 Calendar Export 这一半验收**测不了**

这是本轮最重要的结论，也是 Product Owner 反复说的"assessment 捕获结果非常差"的量化版本。

`qa.calendar-preview`（产品自己上报的）对 MA6081 报的是 `{ dates: 0, preview: 0, unresolved: 0 }`，
CAL-01 屏幕上写的是 `There are no confirmed dates to export yet.`。逐库核对五门课的事实：

| 课程 | 事实条数 | 字段 | 日期 |
| --- | --- | --- | --- |
| MA6081 | 16 | `access_password` / `backtracking` / `duration` / `questionCount` / `requirement` … | **0** |
| MA6083 | 3 | `isGraded` / `name` / `type` | **0** |
| MA6084 | 0 | — | **0** |
| MA6086 | 0 | — | **0** |
| MA6094 | 0 | — | **0** |

**全库没有任何一条 `deadline` / `weight`。** MA6081 的 16 条全是练习测验的元数据
（"35 minutes"、"Password: 12345" 这类），真正的作业与考试没被提取出来。

因此：

- `Calendar Preview` / `Actual ICS Download` / `Semester Date Resolution` 三行**无法通过** ——
  不是导出坏了，是**没有可导出的日期**；
- 而且这里没有"凑一个日期"的余地：验收里唯一能造出日期的路径是 Manual Add Assessment，
  那需要一个人工填的日期，制造出来的证据不是证据。**这一行只能如实记 NOT TESTED。**

**成因**：两个都**已确认**，合起来解释了为什么喂给 AI 的文本这么少 ——

1. **公告正文被整个丢掉（F29，已修）**：MA6081 的 7 个公告全 0 字符，其中一个（"Group Presentation
   schedule and time"）真实正文是 1475 字符的 HTML 时间表。喂给 AI 的文本本来就不足；
2. **MA6081 的 19 个附件一个都没解析成功（F28 的时序）**：19 个 attachment 全部有
   `lastFetchedAt`（取过了）但 `parsed` 全部缺失（没解析出来），因为那次扫描跑在 F28 修复**之前** ——
   当时根本没有 offscreen 文档可用。它们的标题是 `2025_S1- MA6081_Exam Paper(watermark)`、
   `Declaration of Academic Integrity_MSc PM` 这类真实课件的名字，其中就可能有日期。
   也就是说 MA6081 的 Course State 只建立在文本来源上，而文本来源又被 F29 砍掉了一大块。

**下一步（需要 Product Owner 决定，因为要花 API 额度）**：在修好 F29 的构建上 Rebuild 或重新
Scan **一门**课，看 `qa.date-resolution` 是否出现日期。那是这条链路的真正验收，本轮没有做。

---

## 十、验收跑完时 trace 暴露的第三条（2026-09-19 18:00，未修，待 Product Owner 定）

### F37 · 一次"什么都读不到"的 Check for updates，照样跑了 AI 并改写了 Course State

**症状**：MA6081 的 `syllab-opportunity-check` 定时到点时（每 15 分钟一次），trace 里是这样：

```text
09:41:38 scan-started       {"courseCode":"MA6081","established":true,"hasTab":false,"kind":"check"}
09:41:38 discovery-sources  {"courseCode":"MA6081","discovered":0,"kinds":[]}    ← 发现了 0 个来源
（25 条 source-read，全部 SOURCE_NOT_DISCOVERED / fetchStatus: failed）
09:41:40 course-brief       {"assessments":17,"facts":26,"reviewItems":6,"sources":119}
```

09:56:38 那一次一模一样：`discovered: 0` → 全部读取失败 → 仍然写了一份 Course Brief。

**两处都不对**：

1. **`hasTab: false` 时 discovery 返回 0 个来源，但 check 继续往下跑。** 产品读不到平台的任何时候
   都读不到内容，这次检查在物理上不可能发现任何变化；
2. **读取全部失败，Course State 还是被改写了** —— 而且是**变大**：这次检查把 MA6081 从
   11 个 assessment / 16 条 fact / 0 个待审，改成了 **17 个 assessment / 26 条 fact / 6 个待审**。
   我在验收里手工确认掉的那 10 条刚清空，这次检查又造出 6 条新的。

**这与产品定义冲突**：§11.5「单次 background failure：默认静默；后续 opportunity 再重试；
**不制造 Review**」；§11.2「Source 未变 → 不调用 AI；Source 变但无 meaningful change → 静默结束」。
一次**什么都没读到**的后台检查既调用了 AI（trace 里 12 次 `deepseek-task`），又制造了 Review。

**为什么读不到**：`qa.source-read` 全部是 `SOURCE_NOT_DISCOVERED` —— 那是
`blackboard.ts::fetchAndParse()` 在**发现缓存**（`cacheDiscoveredSources`，模块级 Map）里找不到该
来源时的错误码。缓存随 service worker 重启清空，而 discovery 这次返回 0 条，于是缓存里什么都没有。
`hasTab: false` 是起点：没有可读的 NTU Learn 标签页。

**没有修，原因**：修法牵涉行为判断 —— 是"0 个来源就当这次检查没发生、静默结束"，还是
"重新 discovery 后再决定"，还是"读不到就不许写 Course State"？三条路对用户可见行为的影响不同
（尤其是课程真的被清空时的合法情况），按 AGENTS.md「用户可见的改动是产品决定」留给 Product Owner。

**顺带**：这一条也让验收报告的 `Course Brief` 与 `Real DeepSeek` 两行**不是**由我这一次手工走查
产生的，而是由这两次后台检查产生的 —— 报告里的 `12 model calls` 就是它们。这两行仍然是真的
（产品确实写了 Course State、确实调用了真实 DeepSeek），但读者应该知道它们来自哪一步。

---

## 附：本轮已经确认可用的部分

不是所有东西都坏了，以下在真实环境里确认通过：

- **学期 / 课程自动发现**：真实拉取 7 门课程、2 个学期，学期名 `26S1` 正确映射为 `AY2026/27 · Semester 1`；
- **Source 发现与读取**：MA6081 发现 119 个来源、MA6083 发现 52 个，逐个 fetch / parse 并逐条记录结果；
- **工具栏入口**：在 NTU Learn 上点图标打开 Side Panel（本轮按 Product Owner 指令改，已构建）；
- **未建立课程的空状态**：空数据库时显示 `No courses found yet.` + Settings，而不是白屏；
- **Production / QA 隔离**：整个 QA 观测层加入共享源码后，Production ZIP 的 SHA-256 未变。
