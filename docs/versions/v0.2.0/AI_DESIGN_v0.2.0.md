# Syllab AI 设计 v0.2.0

**产品版本：** v0.2.0

**文档状态：** 最终验收通过 · 发布后文档补充

**文档职责：** v0.2.0 当前 AI 行为、逻辑、Prompt 策略、调用策略、恢复、缓存、可观测性、评估与局限的唯一权威事实源。
**语言规范：** 正文以中文为主；产品对象、模块名、API 字段、状态枚举与必要技术术语保留英文。

> 本文档只收口已批准、已实现、已验证的当前状态。决策缘由与被替代的历史过程见
> `DECISION_LOG_v0.2.0.md`；实现、缺陷、修复和验证证据见 `ENGINEERING_REPORT_v0.2.0.md`。

## 1. AI 角色与产品边界

Syllab 使用 AI 解释已捕获的 Course Source，并把其组织成可审查的 Assessment、
Course-wide Constraint 与 Change 候选。AI 不是事实数据库，不能绕过 Evidence、Review 或
trusted-state boundary。

1. **确定性本地逻辑** 负责发现、获取、解析、标准化、Coverage Fact、日期解析、
   schema / referential validation、状态机与持久化。在 Task A 前不对 Assessment 意义做语义预筛选。
2. **AI 语义工作** 由 Task A / Task B / Task C 在锁定 contract 内完成。
3. **用户决策** 通过 Initial Review / Change Review 决定哪些候选成为 Current Course State。

Reasoning 不能替代 JSON 合约、schema 校验、引用完整性校验、Evidence 边界、
用户 Review 或 trusted-state protection。

## 2. Task A / Task B / Task C

### 2.1 Task A — Source 级课程信息解释

Task A 读取一个 Source 或其 mechanical chunk，提取 Assessment Draft、Course-wide Constraint
Candidate、Evidence 和 unresolved issue。每个成功捕获的 Source 都进入 Task A；本地不用
语义 shortlist。多个 chunk 携带 relevant information 时才执行 Source-level consolidation；
consolidation 只能重组已有结果，不得新增未支持 Evidence。

### 2.2 Task B — Assessment 身份与规范化解析

Task B 接收完整 concise candidate index，解析 Same / Different / Uncertain、canonical identity、
component / series 结构与字段合并。本地不按名称相似度或 Source 类型缩减候选。
如模型要求已有 canonical object 的原始 Evidence，可执行最多两轮 Evidence expansion；未知 ID
或未提供 Evidence 的引用必须验证失败。

### 2.3 Task C — 课程状态变化分析

Task C 用于 maintenance 变化分析。其 current side 只能看到 trusted Current Course State；new side
只使用当前 workflow-scoped staging 的结构化新信息与 Evidence。请求还包含 Task B identity
result、Coverage Facts 与相关 User Decision / History。Task C 不直接修改 trusted state；只有合法
Change，并在必要时完成 Change Review / User Decision，才能更新 Current Course State。

## 3. Prompt 设计原则

Task A / B / C 使用锁定、版本化的 system prompt 与 context builder。Prompt 必须：

- 只使用提供的 Source / Evidence / trusted context；
- 区分明确事实、明确不知、不确定和竞争值；
- 不因“更新”、“更权威”或 wording difference 自动判定变更；
- 不要求模型推断 Semester year 等本地可确定事实；
- 使用 structured unresolved issue 表达无法安全决定的内容；
- 不暴露或保存 chain-of-thought / reasoning text。

Prompt 完整文本在 `extension/src/v2/prompts.ts` 中版本化；本文档只定义其产品级边界。

## 4. 结构化输出与校验

Provider 请求使用 `response_format: { type: "json_object" }`。Task A / B / C 分别使用
`syllab.ai.task-a/1`、`syllab.ai.task-b/1`、`syllab.ai.task-c/1`。验证顺序为：

1. JSON parse 与 exact schema validation；
2. Source、chunk、Evidence、canonical ID 的 referential integrity；
3. deterministic product invariant；
4. persistence transaction 与 expected Course revision。

Validator 不自行判断语义相似度、Source 权威或信心度。

## 5. Provider、Model 与思考模式

- Provider：DeepSeek；Endpoint：`/v1/chat/completions`；Model：`deepseek-flash`。
- Task A / B / C 显式设置 `thinking: { type: "enabled" }` 和 `reasoning_effort: "high"`；v0.2.0
  不使用 `max`。
- 不额外设置 `temperature`、`top_p`、frequency penalty 或 presence penalty。
- 单次 provider request timeout 为 300 seconds；这是临时工程基线，不是产品对延迟的承诺。
- 可记录 provider 返回的 reasoning token count，但不存储、不展示 reasoning text。

## 6. Context 与动态输出安全上限

版本化能力配置为 `deepseek-flash-2026-09-20`：Context 上限 1,000,000 tokens，provider
最大输出 384,000 tokens，启用 thinking，上限策略为 `ceiling_context_aware_v1`。这是
2026-09-20 核对的上游能力事实，变更时必须显式更新本地版本配置。

```text
estimated_input = conservative UTF-8 based estimate + fixed overhead
context_margin = max(32,000, ceil(model_context_limit * 5%))
available_generation = max(1, model_context_limit - estimated_input - context_margin)
max_tokens = max(1, min(provider_max_output, available_generation, task_guard))
```

临时的防失控安全上限为：Task A / consolidation 96,000；Task B / expansion 192,000；Task C
96,000。它们不是期望输出量、产品能力上限或永久产品承诺。

## 7. 分块、整合与 Evidence expansion

Task A 保持 sequential execution。分块 target 为 10,000 Unicode characters，hard limit 14,000，
overlap 为最后一个完整 paragraph（最多 800 characters），并优先使用 page / slide / section /
table boundary。Task A consolidation 只在多个 chunk 含 relevant information 时调用。Task B 保持
一次 base call 加最多两轮 Evidence expansion。v0.2.0 不引入 multi-source packing 或 concurrency。

## 8. 按失败类型重试与有界恢复

| Failure class | v0.2.0 处理 |
| --- | --- |
| explicit truncation | 重算 dynamic ceiling，一次 fresh retry；不在原 ceiling 下 repair |
| empty, non-truncated | 一次 fresh retry；无 content 时不做 JSON repair |
| JSON / schema mismatch | 安全确定性 local normalization，否则一次 targeted repair |
| 429 / 5xx / network / provider transient | workflow-level retry + bounded backoff |
| timeout | 一次 delayed retry，然后 fail-soft / park；不做 JSON repair |
| auth / invalid configuration | 立即失败，不 retry |

终结的 contract failure 不再进入通用三轮 workflow retry。Transient workflow backoff 为 5 minutes、
30 minutes、2 hours。Rebuild 可在正常 Task A pass 后对 terminally failed logical unit 执行一次
bounded recovery；只重试失败 unit，复用成功结果与原始捕获输入，不重跑整门 Course。

## 9. 成功结果复用、缓存与 invocation fingerprint

成功 AI result 可在 retry、resume、reload 和 workflow recovery 中复用。缓存还必须匹配 invocation
fingerprint，其覆盖 provider / model / 能力版本、Task / Prompt / schema 版本、thinking /
`reasoning_effort`、上限 / 重试策略版本、计算后的 `max_tokens` 与标准化语义请求摘要。
Fingerprint 不含 secret 或原始 prompt。

## 10. 过期 worker 与 generation guard

异步 completion 在写 aiRun、staging、provisional result 或推进 workflow 前，必须重新校验 worker
的 workflow generation / lease ownership。时间戳过期本身不会杀死仍持有同一 generation 的长 AI
调用；只有 ownership 已被 supersede 才丢弃 late completion。它可写安全诊断事件，但不得重建
staging、preview 或 trusted state。

## 11. 失败与不完整语义

- discovery / fetch / permission / parse 失败只能成为 Coverage Fact，旧 parsed content 不得伪造
  current `new-source` 或 machine-different evidence。
- 后台 opportunity 无可读 NTU Learn tab 时零 AI、零 Review、trusted state 不变。
- Source-level fail-soft 保证其他 Source 继续，但不声称失败 Source 已被理解。
- terminal failed AI Source 使 Rebuild 保持 PARTIAL；partial preview 只供 inspection，不允许 adoption。
- unresolved / competing fact 保留 unresolved。

## 12. Trusted Current Course State 保护

Task A / B output 是 provisional semantic state。Pending、deferred 或 excluded draft 不属于 trusted Current
Course State，不得进入 Course Brief、Semester preview 或 Task C current side。

- Initial Scan 只把用户 Confirm 的 Assessment 立即写入 Current State。
- Maintenance 把 Task A / B 留在 workflow-scoped staging，只通过 Task C 形成合法 Change。
- Rebuild preview 与 current Course 分离；只有完整且被用户采用的结果才能替换 trusted state。
- 所有决策写入校验 `expectedCourseRevision`。

## 13. 可观测性与隐私边界

Production 与 QA build 机械隔离。仅 QA 使用的 telemetry 可记录 Task、逻辑单元、尝试类型、provider、
model、thinking、reasoning effort、计算后的上限、估算 / provider 报告的 token 用量、结束原因、延迟、
失败 / 重试类型、缓存状态和 invocation fingerprint。不得记录或暴露 reasoning text、raw prompt、
Course 原文、API key、Authorization、cookie、login credential 或 secret。BYOK key 不进入 backup、
telemetry、Git 或文档。

## 14. 评估与回归验证

Blind Evaluation：Task A 6 / 6 Pass；Task B 5 Pass / 1 Needs Review，随后在 Prompt 不变的更清晰
fixture 上完成校准；Task C 8 / 8 Pass；确定性强校验 20 cases / 0 violations；
最终未解决 Product Review 项为 0。

回归验证覆盖 Prompt / schema 合约、引用完整性、动态上限边界、按失败类型重试、
缓存复用 / fingerprint 失效、失败单元恢复、过期 worker 拒绝、Rebuild fail-soft / adoption guard、
trusted-state 隔离与 Task C 的 current/new 边界。v0.2.0 最终 current-source CI 为 476 tests PASS。
Phase 2 MA6081 Rebuild 完成 119 / 119 Sources，终结失败 Source 为 0，没有发生应用定义的输出上限截断。

## 15. 已知 AI 局限与后续工作

已知局限：Task A 仍为 serial；尚无 multi-source packing；Mixed / image-only PDF 只读 text layer；
`PARTIALLY_UNDERSTOOD` 没有正向真实样本；部分 Office、损坏、无文本或超大 Source 真实覆盖
仍不完整；用户可见 progress 不展示 raw reasoning / prompt / Course content。

后续版本可研究 adaptive bounded parallelism、multi-source / token-aware packing、privacy-safe AI progress
monitoring、OCR / multimodal expansion、AI runtime performance / cost optimization，以及这些变更后的
fresh real-course Rebuild。它们都不属于 v0.2.0 capability。

## 16. 事实源规则

v0.2.0 AI current truth 以本文档为唯一权威归属。PRD 只保留产品角色、需求与边界；
Product Handoff 只保留交接摘要与本文档入口；Decision Log 记录决策过程；Engineering Report
记录实现与验证；Technical Design 记录 modules、interfaces、data flow 与架构；Final Acceptance /
Final Closure 只保留验收与状态索引。历史文档不为去重而破坏性改写。
