# Syllab for NTU Learn — Direction Adjustments v0.3.0

**版本：** v0.3.0  
**状态：** Active provenance record  
**用途：** 记录开发开始后由 Product Owner 明确提出、会改变当前 Product / AI Processing 行为的方向调整。最终有效规则应回填至对应正式事实源；本文不替代 PRD / Interaction & IA / Technical Design。

---

## DA-001｜在 Task A 前新增 AI Source Triage

**日期：** 2026-10-04  
**状态：** APPROVED / SUPERSEDED BY DA-002 FOR ROUTING ARCHITECTURE  
**触发背景：** v0.3.0 真实课程测试中，19 个附件产生 880 个 native units 和 876 个 visual-gap units。只读 Source Scope Analysis 确认其中 10 个明确位于 Blackboard Lecture 1–5 结构下的 PDF 贡献 802 / 876 个 visual gaps（91.55%）。同时，876 页全部命中 `vector-layout`，805 页同时命中 `embedded-image`；现有机械 gap 标记不能证明每页都存在需要视觉语义理解的信息。

### 1. 产品判断

Syllab 的核心目标是整理课程管理和 Assessment 相关信息，而不是完整理解全部教学内容。

因此，v0.3.0 在正式 File Understanding / visual completion / Task A 之前新增一个轻量的 **AI Source Triage** 阶段，用于判断哪些 Source 值得进入昂贵的课程管理语义处理链路。

新的主链路为：

```text
Discovery
→ Fetch
→ Local native parse / metadata extraction
→ AI Source Triage
    ├─ PRODUCT_RELEVANT → File Understanding → selective visual completion → Task A
    ├─ UNCERTAIN        → File Understanding → selective visual completion → Task A
    └─ TEACHING_ONLY    → Inventory + fingerprint + triage provenance → Stop
→ Shared Working Context
→ Task B
→ Review / Task C（按原入口语义）
```

### 2. Local / AI 边界

Local 继续只做确定性工作，例如：

- Blackboard hierarchy / parent container / native content type；
- Source title / attachment metadata；
- Source identity / fingerprint；
- 文件类型；
- native parse；
- 少量、确定性的 native text / structure sample；
- Source Profile 组装；
- routing / state / retry / cache / coverage。

Local **不得**通过文件名关键词、目录名关键词、标题相似度、扩展名、正则或其他启发式规则自行判断 `TEACHING_ONLY` / `PRODUCT_RELEVANT`。

“这个 Source 是否只是教学内容、是否值得进入课程管理语义处理”属于语义判断，由 AI Source Triage 负责。

### 3. AI Source Triage 输入

Triage 不完整理解原文件，也不做 Vision。

每个 Source 只提供轻量 **Source Profile**，可包含：

- Source ID；
- title；
- Blackboard hierarchy / parent titles / native content type；
- surrounding Blackboard item text；
- file type；
- page / slide / native-unit count 等机械 metadata；
- 少量 native text / structure sample；
- 必要 provenance。

不得为了 Triage 先 rasterize 全部页面、生成视觉截图或把完整文件送给模型。

### 4. AI Source Triage 输出

每个 Source 至少返回：

- `classification`: `PRODUCT_RELEVANT | TEACHING_ONLY | UNCERTAIN`；
- `confidence`: 非数值的可解释等级；
- `reasonCode`；
- `evidenceUsed`：只引用 Source Profile 中实际提供的字段；
- 必要的简短 rationale，用于 QA / trace，不作为正式课程事实。

含有课程管理信息与教学内容的混合 Source 应进入 `PRODUCT_RELEVANT`，不能因为主要篇幅是教学内容而跳过。

`confidence` 保留为 QA / telemetry 字段，但**不再作为 routing gate**。是否安全停止由 AI 对“是否存在产品相关信息”和“当前 Source Profile 是否足够支持判断”的显式输出决定；Local 只做确定性 schema / routing 校验，不自行做课程语义判断。

### 5. 调用方式与成本原则

优先采用课程级批量 Triage 或少量批次，而不是默认一个 Source 一次模型调用。

不得新设“每批 N 个 Source”之类未经验证的固定容量限制。只有实际 Provider context / request body 等已验证外部边界需要时才技术分割。

Triage 使用现有 Provider / 模型路径，不新增本地视觉模型或新的外部 AI Provider。

Triage 的 invocation、latency、usage、cache、retry 和 cost 必须作为独立阶段进入现有 runtime ledger，不得隐藏在 Task A 统计中。

### 6. Teaching-only Source 的状态与后续 Check

`TEACHING_ONLY` Source 仍然：

- 保留 Source identity；
- 保留 fingerprint；
- 保留 Blackboard provenance；
- 保留 triage classification / policy version / evidence metadata；
- 继续存在于 Source Inventory。

它不是“被删除”或“不存在”。

后续 Source fingerprint 变化时先重新执行必要的 Triage；若仍为 `TEACHING_ONLY`，不进入 Task A / B / C。若 Source 内容、位置或 Triage policy/version 变化导致分类不再可复用，则重新分类。

不得把历史 `TEACHING_ONLY` 当成永久黑名单。

### 7. Visual-gap detection 是独立问题

Source Triage 不能用来掩盖现有 visual-gap false positive。

对于通过 Triage、确实进入 File Understanding 的 Source，仍需修正 selective visual completion 的机械判定：

- `constructPath` / `shadingFill`、线条、边框、背景、渐变、装饰等不能仅因存在 drawing operation 就自动等于有意义的视觉语义缺口；
- `embedded-image` 存在本身也不能自动证明必须调用 Vision；
- Local 只做 coverage / representation 的机械判断，不通过课程关键词判断图片语义；
- 扫描页、image-only page、真实无法由 native structure 表达的图表 / 截图等仍应触发视觉补全；
- 无法安全判断的 coverage 不能伪装成 Complete。

### 8. 产品安全边界

本调整不能通过减少真实产品相关内容来获得性能改善。

必须继续满足：

- Assessment / Assignment / Announcement / Course Information / grading / submission / deadline / course-rule 等可能相关 Source 不被静默过滤；
- `UNCERTAIN` 保守进入下游；
- 不 silent skip / silent truncate；
- Source / Locator / Evidence provenance 保留；
- trusted Current Course State safety、Review 规则和 Task A/B/C 语义边界不变。

### 9. 验证要求

在恢复完整真实课程测试前，先完成：

1. Triage schema / routing / cache / recovery 的确定性 regression；
2. Triage 不调用 Vision、不完整发送原文件的验证；
3. 批量 Triage 在真实 Provider 边界下的 request-size 验证，不设置新猜测容量；
4. 使用当前课程已保存 metadata / native text 进行 targeted real-model Triage evaluation；
5. 输出分类明细与 Source Profile evidence，不通过标题关键词硬编码已知 Lecture 结果；
6. 对通过 Triage 的 PDF samples 修复并验证 visual-gap false positive，同时保留真实扫描页 / image-only / meaningful visual gap；
7. 重新生成 scope projection：总 Sources、AI-eligible Sources、TEACHING_ONLY、UNCERTAIN、预计进入 Task A 的附件 / native units / visual gaps。

这些通过后先返回 Product Side；未经 Product Side 确认，不启动新的 full real-course run 或第二门 cold-start course。

### 10. 文档回填

本调整批准后：

- 将最终有效规则回填 `PRD_v0.3.0.md` 的 Scope、AI Processing、Core Workflow、Local/AI boundary、Acceptance 与完成条件；
- Technical Design 只记录工程实现；
- Engineering Report 记录实现和验证事实；
- Interaction & IA 只有在用户可见流程确实变化时才需要修改；
- 不创建新的 AI Design 或重复 Source Triage spec。

### 11. 2026-10-05 Product Scope Review Clarification｜取消 HIGH confidence gate，改为显式 Safe-to-Skip 合同

Targeted real-model Triage 验证得到 117 Sources → 59 `PRODUCT_RELEVANT`、48 `TEACHING_ONLY`、10 `UNCERTAIN`，但 0 个 `TEACHING_ONLY` 达到 HIGH confidence，因此没有任何 Source 被排除。该阶段本身约耗时 127.778 秒，并产生明显额外 Token。与此同时，六份 Lecture 1–3 PDF 的 native outline 确实包含 assignment / marking / submission 等产品相关信息并被判断为 `PRODUCT_RELEVANT`，说明不能退回 Blackboard 目录或文件名硬过滤。

因此 Product Side 保留 AI Source Triage，但修正 routing 合同：

每个完成深度 Triage 的 Source 至少输出：

- `classification`: `PRODUCT_RELEVANT | TEACHING_ONLY | UNCERTAIN`；
- `productRelevantEvidence`: `PRESENT | ABSENT | UNCERTAIN`；
- `profileCoverage`: `SUFFICIENT | INSUFFICIENT`；
- `confidence`: 继续保留用于 QA / telemetry，但不参与停止判断；
- `reasonCode`；
- `evidenceUsed`。

只有以下组合可确定性路由为 `SAFE_TO_SKIP_TASK_A`：

```text
classification = TEACHING_ONLY
AND productRelevantEvidence = ABSENT
AND profileCoverage = SUFFICIENT
```

其他任何情况，包括 `PRODUCT_RELEVANT`、`UNCERTAIN`、`productRelevantEvidence = PRESENT / UNCERTAIN`、`profileCoverage = INSUFFICIENT`、mixed-use、输入冲突，都进入 File Understanding + Task A。

这不是把 HIGH 改成另一个 confidence threshold，也不得新增数值 confidence cutoff。

#### 11.1 Coarse-to-fine 两级 Triage

Triage 改为两级轻量路由，以减少“所有 Source 都发送较重 profile”的额外成本：

**Pass 1｜Coarse Triage**

- 面向全部需 Triage 的 Source；
- 只使用更轻量的 metadata / hierarchy / native type / 最小必要 native sample；
- 只允许输出“直接进入下游”或“进入 Deep Triage candidate”；
- **Pass 1 绝不能直接跳过任何 Source**。

**Pass 2｜Deep Triage**

- 只对 Pass 1 判断为可能纯教学、值得进一步确认的 candidate 执行；
- 可使用更丰富但仍非完整文件的 native text / structure profile；
- 按上述 `classification + productRelevantEvidence + profileCoverage` 合同决定 `SAFE_TO_SKIP_TASK_A` 或继续处理。

不得为了 Triage 做 rasterization / Vision，不得发送完整原文件，不得按固定 Source 数拍脑袋分批；技术分割仍只依据已验证 Provider 边界。

#### 11.2 下一轮验证要求

在任何 full real-course run 前，先完成：

1. **Parser-only real measurement**：只用现有缓存的 19 个附件运行最新 parser，不调用 Vision / Task A / 模型，得到修复后的真实 visual-gap 数和 trigger breakdown；
2. **Revised Triage targeted evaluation**：使用已有真实 Source Profiles 验证两级 Triage 和 Safe-to-Skip 合同；
3. 对所有 `SAFE_TO_SKIP_TASK_A` 结果检查其实际 profile evidence，确认没有 Assessment / deadline / submission / grading / course-rule 等已提供信息；
4. 对明确产品相关 Source 做反例验证，确保不会因 Lecture / teaching context 被排除；
5. 分别报告 Pass 1 / Pass 2 的 invocation、latency、usage、repair、physical calls，以及最终减少的 Task A eligible Sources / 附件 / native units / visual gaps；
6. 不设置新的 confidence threshold、batch-size、timeout、memory 或 retry 猜测限制；
7. 完成后再次停在 Product Scope Review，不启动大课程 clean run 或新课程 cold-start。

---

## 当前有效性

DA-001 保留为历史 provenance：它证明了 AI 语义 routing 必须位于 Local 语义判断之外，也证明 Blackboard 目录 / 文件名不能作为本地过滤依据。其 HIGH-confidence gate 与 coarse-to-fine Source-level routing 已被 DA-002 取代，不再作为当前生产方向。

---

## DA-002｜Index-first AI-driven Selective Retrieval

**日期：** 2026-10-05  
**状态：** APPROVED / SUPERSEDED BY DA-003 FOR ROUTING MECHANISM  
**触发背景：** parser-only real measurement 已确认 19 / 19 附件内容 hash 与既有 Source 记录一致；880 native units 保持不变，旧 parser 的 876 visual-gap units 在最新 parser 下仅降至 852，24 units 转为 native-complete，locator 与 native text 守恒。剩余 852 gaps 只表示 Local 无法仅凭 native representation 证明完整 coverage，**不等于 852 个 unit 都应进入 Vision**。与此同时，Source-level Triage 的前两版真实验证均显示：若为了安全给 AI 发送较重 Source Profile，Triage 自身会产生明显 latency / token 开销；若仅依赖文件名 / Blackboard hierarchy 又会漏掉 Lecture-context 中真实存在的 assignment / marking / submission 信息。

### 1. 产品判断

v0.3.0 不再把“Source-level classification → 决定整份文件是否继续”作为主要前置架构。

当前方向改为：

> **Index first → AI requests refs → Local selectively expands refs → Vision only when selected relevant content still has unresolved visual coverage.**

核心目标是同时满足：

- 不把整门课程所有课件 / PPT / PDF 的完整 native content 全部发送给 AI；
- 不让 Local 通过关键词、标题、目录名或其他启发式方式推断教学 / Assessment 语义；
- 所有 Source / natural unit 仍必须被索引覆盖，避免 blind sampling 导致“AI 从未知道某个 unit 存在”；
- AI 负责决定“还需要看什么”，Local 只负责“这里有什么、在哪里、如何精确取回”；
- technically Partial / visual-gap 只表示可用性状态，不直接等于 Vision work queue。

### 2. 当前主链路

```text
Discovery / Fetch
→ Local native parse
→ Build complete lightweight Course Content Index
→ AI Retrieval Planner
    → PROCESS / NO_FURTHER_EXPANSION / REQUEST_REFS
→ Local resolves requested Source / Unit refs
→ AI continues selective retrieval
    → request deeper native refs when needed
    → request visual completion only for selected relevant units whose native coverage is insufficient
→ Local rasterizes only explicitly requested eligible units
→ Vision completion for those units only
→ Task A（仍保持 one Source = one primary logical package）
→ Shared Working Context
→ Task B
→ Review / Task C（按入口原有语义）
```

Source-level Triage / Safe-to-Skip 可以作为历史实现或内部优化素材保留，但**不再要求先把每个 Source 组装成较重 semantic profile 再做整文件二分类**。

### 3. Complete Lightweight Course Content Index

初始 Index 必须覆盖全部已发现 Source；对于有 natural units 的文件，也必须让全部 unit 在索引中可寻址。**全量索引覆盖 ≠ 全量正文发送。**

Local 可以放入 Index 的信息仅限确定性、非语义判断事实，例如：

- Source identity / fingerprint；
- Blackboard hierarchy / parent relationship / native content type；
- 文件类型与自然 unit 数；
- Source / Unit Ref；
- native structure 中已经存在的标题、heading、table / image / text-block 等结构信息；
- text / table / image / vector 等机械 presence / counts / coverage state；
- 可由原生结构机械取得的 compact native anchors / descriptors；
- provenance 与 locator。

约束：

- Index 不得包含 Local 生成的“这页讲什么”“是否 Assessment”“是否教学材料”等语义摘要；
- 不允许仅展示随机或固定 first-N units；所有 units 必须可见 / 可寻址；
- compact descriptor 的具体压缩 / representation 由 Technical Design 决定，但不得通过未经验证的任意固定 page / char / unit cap 制造 silent omission；
- Index 若不足以让 AI 安全结束判断，AI 必须请求 expansion，而不是把“不知道”解释为“不相关”。

### 4. AI Retrieval Planner

AI Retrieval Planner 的职责是：

1. 阅读 Course Content Index；
2. 判断哪些 Source / Unit 明显需要继续，哪些当前不需要进一步展开；
3. 对信息不足但可能相关的内容返回稳定 Ref 请求；
4. 阅读 Local 返回的 requested native content；
5. 必要时继续请求更深 Ref；
6. 只有在某个**已被选中且产品相关 / 可能相关**的 unit native coverage 仍不足时，才请求 visual completion。

Planner 不产生 trusted course fact，不替代 Task A / B / C，不直接写入 Current Course State。

Planner 的停止必须是显式的：对尚未展开的内容，如果 Index evidence 不足以排除产品相关性，应继续 `REQUEST_REFS` 或保留 uncertain，不得 silent skip。

### 5. Local / AI 边界

Local 可以：

- parse；
- 建 inventory / index；
- 记录 Source / Unit Ref；
- 提供机械 structure / coverage metadata；
- 按 AI 请求精确取回 native content；
- 对 AI 明确请求且确有 unresolved visual coverage 的 unit 做 rasterization；
- schema / checkpoint / retry / cache / provider-boundary / state-machine 管理。

Local 不可以：

- 判断某 Source / page / slide 是 teaching-only / product-relevant；
- 用文件名、目录名、关键词、正则、字符串相似度决定是否展开或是否 Vision；
- 根据课程语义自行选择需要看的 page；
- 把 visual gap 直接解释为“必须 Vision”或“可以忽略”。

AI 负责所有课程语义相关的 relevance / expansion / evidence sufficiency 判断。

### 6. Visual Completion 的新语义

`visualGap = true` 继续只表示：

> 如果未来需要完整理解这个 unit，当前 native representation 不能证明 coverage 完整。

它**不再直接形成 Vision queue**。

只有同时满足以下条件时才进入 Vision：

1. AI Retrieval Planner 已选择该 Source / Unit 为产品相关或可能相关；
2. AI 已读取可用 native evidence 后仍明确需要视觉信息；
3. Local 确认该 unit 的 visual coverage unresolved 且可被安全定位 / rasterize。

因此 `852 visual gaps` 是 coverage inventory，不是 852 次视觉理解任务。

### 7. 与 Task A / B / C 的关系

- Retrieval Planner 负责“看什么 / 还要什么 evidence”；
- Task A 负责“在一个 Source 内把已取得的 relevant evidence 理解并组织成 provisional Assessment Draft”；
- Task B 负责跨 Source Same / Different / Uncertain 与 Canonical Assessment Identity；
- Task C 负责 latest result vs trusted state 的变化判断。

Task A 的 canonical rule 不变：**one file / Source = one primary Task A logical processing package**。Selective retrieval 只改变 Task A 前“哪些 evidence 被取回并送入昂贵理解”的方式，不重新引入多-Source Task A package。

### 8. Cache / Check / Re-scan

Index、retrieval decisions 与 requested refs 必须有 version / fingerprint / policy provenance。

- Source / unit fingerprint 未变且 relevant planner policy / representation identity 未变时，可复用既有 index / retrieval checkpoint；
- 内容、位置、native representation 或 planner policy 变化时，相关部分重新规划；
- 不能把历史“未展开”永久视为 teaching-only blacklist；
- Check 仍先执行 Local Source fingerprint comparison；unchanged Source 不重复调用 AI，changed / new Source 进入当前 retrieval planning 路径。

### 9. 验证要求

在 full large-course clean run / cold-start 前，先做 targeted validation：

1. 确认完整 Course Content Index 覆盖全部 117 Sources / 880 native units，不 blind sample、不 silent omit；
2. 证明 Index 不携带 Local semantic classification；
3. 使用真实模型执行 Retrieval Planner，但只做 index / native Ref expansion，不运行 Task A / B / C；
4. 记录每轮 Planner request、expanded refs、native bytes / chars / tokens、latency、usage、repair / failure；
5. 统计 852 visual-gap units 中：从未被 Planner 选中、被选中但 native 已足够、最终明确请求 Vision 的数量；
6. 对已知包含 assignment / marking / submission 的 Lecture-context Source 验证 Planner 能发现并展开对应 evidence；
7. 对明确 Assessment / Announcement / Course Information 等 Source 做 recall-oriented cases；
8. 对 planner 未展开的 Source / unit 做抽样人工审查 / 对照既有完整 native evidence，检查是否遗漏已存在的产品相关内容；
9. 比较该方案的 AI 前置开销与此前 127.778s / 168.191s Source-Triage probes，并同时报告 projected Task A / Vision work reduction；
10. 不通过 Local keyword filtering、固定 first-N sampling、降低 coverage safety 或新增未经验证容量限制制造收益。

Targeted validation 完成后再次停在 Product Scope Review；未经 Product 接受，不启动 full large-course clean run 或 new-course cold-start。

### 10. 历史实现处理

已实现但尚未验收的 coarse-to-fine Source Triage / Safe-to-Skip 代码作为 engineering checkpoint 保留，不需要先删除再重写。Engineering 应评估可复用的 schema、checkpoint、ledger、Ref retrieval 和 provider-boundary 基础，并将其收敛到 DA-002，而不是并行保留两套生产 routing。

---

## 当前有效性

DA-002 是当前最新 Product Direction。若 DA-001 的 Source-level classification / Safe-to-Skip / coarse-to-fine routing 与 DA-002 冲突，以 DA-002 为准；DA-001 保留为历史探索与决策 provenance。Task A / B / C、Review、trusted-state safety、Local semantic boundary 与 No Arbitrary / Unverified Capacity Limits 规则继续有效。

---

## DA-003｜Exhaustive Lightweight Routing + Selective Deep Read

**日期：** 2026-10-05  
**状态：** APPROVED / SUPERSEDED BY DA-005 FOR ROUTING MECHANISM  
**触发背景：** DA-002 的 Index-first 核心方向已证明有价值，但其实现逐步演化为 Primary Planner → Ref expansion → cumulative selection → explicit removal → COMPLETE → Coverage Auditor → repair / checkpoint 的多轮 agentic state machine。真实验证连续暴露了 protocol-state complexity：读取完成与不相关混淆、selection continuity、clean coverage carry-over、unread acquisition miss、Auditor range accounting 越界，以及历史 300 秒绝对请求时限截断 repair。最新 Coverage Audit 的首个真实语义响应已经自然找到此前遗漏的 page:73 / page:74，说明 Index-first 的轻量索引本身有用；但继续修补 Planner + Auditor 协议的复杂度已经高于 Syllab 实际需要。

### 1. 产品判断

保留 DA-002 的核心原则：

> **所有 Source / natural unit 先进入完整轻量 Index；昂贵 native full content / Vision 仍然只对少量内容选择性展开。**

但不再采用“AI 自主探索式多轮 Retrieval Planner + Coverage Auditor”作为生产 routing 主机制。

当前方向简化为：

> **Complete lightweight Index → AI Exhaustive Routing → deterministic 100% routing coverage check → selective native deep read → Task A；需要视觉时由 Task A 基于已选 native evidence 请求 exact visual refs。**

目标是用一次完整轻量 routing 换取确定性覆盖，避免为了省少量 Index token 引入复杂的多轮 agent 状态机。

### 2. Exhaustive Lightweight Routing

Local 在 native parse 后建立完整轻量 Index。对于有 natural units 的 Source，每个 unit 必须有稳定 Ref 与 lightweight descriptor；对于没有 natural units 的 Source，Source 本身作为可路由条目。

AI Routing 对**每一个 routing entry**必须返回且只能返回以下一个状态：

- `EXPAND`：需要读取该 entry 的 native content；
- `SKIP`：仅凭 lightweight descriptor 已足够判断，不需要进一步读取；
- `UNCERTAIN`：Index 信息不足，保守进入 native deep read。

`UNCERTAIN` 与 `EXPAND` 都进入后续 native expansion。

Local 只做 exact coverage / schema validation：

- routing 输入 N 个 entries；
- routing 输出必须精确覆盖 N / N；
- 不允许缺失、未知 Ref、重复冲突或 silent omission；
- Local 不解释某个 entry 为什么应 EXPAND / SKIP / UNCERTAIN；
- 不通过 keyword / title / folder / regex / adjacency 等本地启发式补 routing。

AI 负责所有语义 relevance 判断。

### 3. 不再保留生产 Planner / Auditor 状态机

新的生产 routing 不再依赖：

- `requestRefs` 多轮 acquisition loop；
- Primary Planner `CONTINUE / COMPLETE`；
- cumulative selected set / explicit removal reducer；
- Coverage Auditor / unread coverage declaration；
- 为 Planner completion 维护的跨轮状态机。

已有代码与证据作为历史 provenance / regression material保留；Engineering 可复用 Index assembly、stable Refs、schema、ledger、checkpoint、exact native retrieval 等确定性基础，但不得并行保留两套 production routing。

### 4. Selective Native Deep Read

Routing 完成后：

```text
EXPAND + UNCERTAIN
→ Local exact native expansion
→ 按 Source 归并为 Task A evidence scope
→ Task A
```

`SKIP` entry 仍保留 identity / fingerprint / Index descriptor / provenance / routing decision，不从 Source Inventory 删除，也不成为永久 blacklist。Source / unit fingerprint 或 routing policy / representation identity 变化时重新 routing。

Task A 继续遵守：

> **one file / Source = one primary logical Task A package**

Natural units 只决定该 Source package 内实际送入 Task A 的 evidence scope，不重新把 page / slide 变成独立 Task A logical invocation。

### 5. Vision 请求归入 Task A evidence sufficiency

不再设置独立 Planner visual-intent state。

对于已经通过 `EXPAND / UNCERTAIN` 进入 Task A 的 unit：

1. Local 提供 native evidence 与机械 coverage metadata；
2. Task A 先基于 native evidence理解并组织；
3. 若 Task A 判断某个**产品相关 / 可能相关且 unresolved visual coverage 的 exact unit**仍需要视觉信息，返回 exact `visualRequestRefs`；
4. Local只验证 Ref / unresolved coverage / renderability并 rasterize；
5. visual evidence 返回同一 Source Task A context继续完成组织。

这个 evidence-progress loop 只发生在已经 routing 进深读的 Source 内，不是课程级自主探索 Agent。不得设置未经验证的固定 round count；无新 evidence progress 时明确 no-progress failure。

### 6. 完整性与效率原则

完整性来自：

> **全量轻量 Index + N/N exhaustive routing contract**

而不是来自“AI 自己记得还要不要看什么”。

效率来自：

- 只把 lightweight descriptors 全量送入 routing；
- `SKIP` 不发送完整 native正文；
- `EXPAND / UNCERTAIN` 才发送 native content；
- Vision 只对 Task A 明确请求的 exact Partial units执行；
- 不把 852 technical visual gaps 直接变成 Vision queue。

若真实 routing 结果最终把接近全部 880 units 都标为 `EXPAND / UNCERTAIN`，应以真实 evidence 返回 Product Review；不得通过 Local heuristic / confidence threshold / arbitrary cap 强行制造效率。

### 7. No Arbitrary / Unverified Fixed Limits 再确认

Product Owner 从未要求通过任意固定数字限制系统正常工作。

当前 production path 中所有仍生效的 fixed limit 必须按既有 `docs/project-governance.md` 与 Global Limit Inventory 处理：

- **真实 Provider / Browser / platform hard boundary** → 保留并记录来源；
- **经 benchmark / stress / real-course evidence 证明的资源控制** → 可保留，但必须说明测量依据；
- **arbitrary / unverified fixed limit** → 不得继续作为正常 capacity / runtime gate。

尤其：`DEEPSEEK_REQUEST_TIMEOUT_MS = 300_000` / L19 的 300 秒绝对请求截止已经被 Engineering 明确标记为 `ARBITRARY / UNVERIFIED LIMIT`，不能继续截断仍在正常 progress 的模型请求，也不能简单换成另一个猜测秒数。

长请求应基于可观测事实治理：

- stream / response 持续有 progress → 继续；
- 明确 network / provider failure → recovery / fail；
- workflow ownership lost / user cancellation → abort；
- 无 progress → 进入可观测 stall handling；
- Browser / Service Worker 真实生命周期约束单独处理并记录。

如果某个 stall boundary 未来需要固定值，必须来自已验证外部约束或测量证据，而不是拍脑袋数字。

### 8. 下一轮验证

在下一次 known large-course clean Rebuild 前先完成：

1. 生产 routing 从 Planner + Auditor 收敛为 Exhaustive Routing；
2. 对 117 Sources / 880 units 构建 routing entries，证明 exact N/N coverage；
3. 使用真实模型做一次 targeted routing validation，不运行 Task A/B/C/Vision/full workflow；
4. known recall oracle 只做外部验收，不进入 prompt；已知 24 locators 所在 units 必须进入 `EXPAND / UNCERTAIN`；4 / 4 dueDate Sources、16 / 16 assignments、7 / 7 announcements routing 不得被错误 SKIP；
5. 报告 `EXPAND / SKIP / UNCERTAIN` 数量、selected Sources / units、routing tokens / latency / repair / failure、预计 Task A scope；
6. 对被 `SKIP` 的真实样本做人工 / evidence audit，验证没有已知课程管理事实；
7. 清理当前 active production path 的 arbitrary / unverified fixed limits，并对 retained limits 给出 provenance；尤其移除 300 秒 absolute request cutoff，改为 progress / failure / cancellation 驱动；
8. full CI PASS；
9. 完成后返回 Product Scope Review，不自动启动 full run，先让 Product 确认简化架构的真实 routing scope / cost。

### 9. 当前有效性

DA-003 是当前最新 Product Direction。

DA-002 保留为历史 provenance，其中以下原则继续有效：

- complete lightweight Index；
- Local 不做课程语义判断；
- selective native / visual completion；
- `visualGap=true` 不等于 Vision work queue；
- one Source = one primary Task A package；
- trusted-state / Review safety。

DA-002 的多轮 AI-driven Ref acquisition / Planner completion mechanism，以及后续 Coverage Auditor refinement，已被 DA-003 的 Exhaustive Lightweight Routing 取代。

---

## DA-004｜Failure Recovery & Paid Retry Policy

**日期：** 2026-10-05  
**状态：** APPROVED / CURRENT CROSS-CUTTING PRODUCT RULE  
**触发背景：** P2E-012 清理 active arbitrary / unverified limits 时确认，当前 workflow 仍存在 `MAX_ATTEMPTS=3`、固定 backoff、timeout 第 2 次 terminal、额外一次 Source recovery、协议 repair 等相互叠加路径。简单移除这些数字会造成无界自动付费；改成另一个固定次数或等待时间又违反 No Arbitrary / Unverified Limits。该问题需要由 Product 明确统一“什么可以自动恢复、什么必须由用户决定再次付费”。

### 1. 核心原则

> **系统可以自动恢复状态，但不能在不确定会不会再次产生付费 AI invocation 的情况下，自动替用户决定重新派发。**

因此不再以“最多自动重试 N 次 / 等待 N 分钟”作为统一恢复策略。

### 2. 可以自动执行的恢复

只要不会新增一次不必要的付费 AI inference，以下恢复可以自动进行：

- worker / service-worker 重启后的本地 state reconstruction；
- checkpoint / successful result reuse；
- 同一 workflow 已持久化成功结果的恢复；
- 本地 deterministic parse / schema normalization / JSON syntax repair；
- 本地 Fetch / parse / render 等不产生 AI inference 的可恢复操作；
- Provider 明确返回可安全重试语义（例如明确未执行 generation 且提供 `Retry-After`）时，严格按 Provider 信号恢复，不使用本地猜测 fallback delay。

所有自动恢复都必须 progress-driven：没有新状态 / 新 evidence / 明确外部恢复信号时停止，不形成无界 loop。

### 3. 不得自动重新派发的付费 AI 情况

以下情况不得自动再发一个新的模型 invocation：

- 已经收到任何模型 output / usage 后又发生 transport interruption；
- Provider 是否已执行 / 计费无法确定的网络中断；
- 模型返回 invalid JSON / schema / contract result，且本地 deterministic repair 无法修复；
- Task A / B / Routing 等 logical item 已经有一次完整模型响应但结果不合合同；
- 阶段结束后为了“再试一次”额外重跑 failed Source / package；
- workflow retry 会再次调用已失败的 AI item，而没有用户显式 Retry。

这些情况必须保留全部成功结果、标记失败 / interrupted item，并交给现有用户 Retry 路径。用户显式 Retry 时只重跑失败 / interrupted items，不重跑成功 items，也不要求固定最大人工 Retry 次数。

### 4. Provider Retry-After / 网络恢复

自动 Provider retry 只能建立在明确外部事实之上：

- Provider 明确拒绝本次 generation、没有产生语义输出，并给出 `Retry-After` / equivalent safe-retry signal → 可按该信号自动恢复；
- 无 `Retry-After` 时不创建 1s / 5min / 30min 等本地 fallback；
- 网络恢复事件可以恢复本地 workflow 调度，但不能自动重发一个“可能已经在 Provider 执行过”的付费 AI request；
- 如果 dispatch 是否发生不可证明，按 ambiguous paid retry 处理，等待用户 Retry。

### 5. Model contract repair

优先做 zero-cost deterministic repair：

- JSON syntax repair；
- enum / envelope 的确定性兼容修复；
- 可以在不改变语义的前提下明确纠正的格式问题。

如果必须再次调用模型才能修复，则视为新的付费 invocation，不自动执行。保留失败证据，等待用户 Retry。

### 6. Worker ownership / abandoned workflow

workflow ownership 不再以 10min lease / 5min heartbeat 等固定 TTL 作为“是否允许重新派发 AI”的决定依据。

应使用可证明的 execution-session / owner token / startup reconciliation：

- 新 worker 启动时识别上一 execution session 是否已结束；
- 已持久化成功结果继续复用；
- 纯本地未完成工作可恢复；
- 对已 dispatch 但最终状态未知的付费 AI request，不因 lease 到期自动重派；
- user cancellation / ownership change 立即阻止 stale write。

Heartbeat / polling 允许作为 observability implementation detail，但不能作为付费 retry 的语义授权。

### 7. Scheduler tuning 与安全边界

并发算法里的初始值、AIMD 调整参数等，如果只影响吞吐、不截断 coverage、不终止任务、不触发额外付费重试，可以暂作为 **unvalidated tuning** 保留并在 real-course telemetry 中测量。

它们不得被描述为已验证 capacity / safety limit，也不得导致 silent skip / fail。若某数值实际承担 hard admission / termination / coverage boundary，则必须回到 No Arbitrary Limits 规则处理。

### 8. Archive / decompression safety

不能用随意的 64MiB / 128MiB 等固定大小阈值冒充文件安全。

对于 ZIP / OOXML 等压缩内容，目标实现应优先使用：

- isolated worker；
- incremental / entry-wise processing；
- cancellation；
- failure isolation；
- worker crash / decoder failure → 明确 `Partial / Unsupported / Failed`，不得自动无限重试。

若实现仍依赖同步全量解压且无法安全隔离，必须在 full-course acceptance 前作为 Engineering safety blocker 报告；不得用另一个任意字节 cap 掩盖风险。

### 9. 用户可见失败语义

本方向不要求新增复杂 Retry Center。

继续沿用现有 workflow / status / retry surface：

- 成功结果保留；
- 少量失败不清空 trusted state；
- failed / interrupted item 可由用户显式 Retry；
- Retry 只处理失败项；
- 不因一次 item failure 自动重跑整门课程。

若现有 Interaction 无法表达“部分成功 + 需要用户 Retry”，Engineering 应停回 Product Side，而不是自行设计新的用户流。

### 10. 当前有效性

DA-004 与 DA-003 同时有效：

- DA-003 决定信息 routing 架构；
- DA-004 决定跨 Routing / Task A / Task B / Provider / workflow 的失败恢复与付费重派发规则。

所有旧 `MAX_ATTEMPTS`、固定 retry delay、额外 automatic Source recovery、automatic paid model repair 等规则如与 DA-004 冲突，以 DA-004 为准。

---

## DA-005｜Teaching Material Deferral：完整本地保留，Source-level AI 判断后暂缓教学课件深读

**日期：** 2026-10-05  
**状态：** APPROVED / CURRENT PRODUCT DIRECTION FOR ROUTING SCOPE  
**触发背景：** DA-003 的唯一真实 Exhaustive Routing 已通过 978 / 978 coverage 与全部已知 recall Gate，但结果为 167 `EXPAND`、811 `UNCERTAIN`、0 `SKIP`，即 117 / 117 Sources、880 / 880 native units 最终仍全部进入 deep read。该结果证明逐 unit lightweight routing 能保证完整性，却没有产生任何实际 scope reduction，反而新增约 204.626 秒和一次额外模型调用。Product Owner 明确决定停止继续优化逐页 / 逐 unit 过滤，不再为了“Lecture 内可能隐藏课程管理信息”的极端情况维持复杂 routing 架构。

### 1. 产品范围取舍

v0.3.0 的主要责任是可靠整理 **NTU Learn 明确呈现的课程管理信息**，例如：

- Course Outline / Syllabus；
- Assignment / Assessment 页面与附件；
- Announcement；
- submission / deadline / grading / weight / requirement；
- Course Information / course rules；
- 老师明确上传的 assessment brief / instructions / rubric 等。

普通大型教学材料，例如常规 `Lecture 1 / Lecture 2 / Week 3 / Topic 4 Slides / Lecture Notes`，即使已经被完整抓取、解析和索引，v0.3.0 也允许**暂缓其内部课程管理信息挖掘**。

明确接受的产品 tradeoff：

> 如果某项真实 Assignment / deadline / grading 信息只隐藏在普通 Lecture slides 内部，而 NTU Learn 的其他课程管理来源完全没有出现，v0.3.0 可能暂时漏掉该信息。

本版本不再为了消除该极端风险而把所有教学课件全文送入 AI。

### 2. 所有 Source 仍完整获取与本地保留

`TEACHING_MATERIAL_DEFERRED` 不等于不下载、不解析或删除。

所有 Source 仍按正常链路完成：

```text
Discovery
→ Fetch
→ Local native parse
→ Source identity / fingerprint
→ natural-unit inventory / stable locator
→ local Index / coverage / provenance
```

对于附件，仍保留完整本地 native representation、natural-unit inventory、visual-gap / Partial coverage 状态、fingerprint 与 provenance。后续版本若重新启用 Teaching Material extraction，可以直接基于这些本地基础能力继续处理。

### 3. Source-level AI Teaching Material Classification

逐 unit Exhaustive Routing 退出 production。改为**轻量 Source-level AI classification**，重点用于 file / attachment Sources。

AI 基于 Source-level lightweight profile 判断：

- `PROCESS`：进入当前 v0.3 的正常语义处理；
- `TEACHING_MATERIAL_DEFERRED`：明显属于常规大型教学课件 / lecture notes，本版本暂不深读其内部内容；
- `UNCERTAIN`：无法可靠判断，保守进入 `PROCESS`。

Source profile 可以包含确定性信息：

- Source title；
- Blackboard hierarchy / parent relationship / native item type；
- attachment filename / file type；
- page / slide / unit counts；
- native structure headings / compact anchors；
- surrounding Blackboard item text；
- Source / locator / provenance。

不得为了 classification 先发送完整文件正文或做 Vision。

### 4. Local / AI 边界

Local 仍不得通过 `Lecture`、`Week`、文件名关键词、目录名、regex、字符串相似度等规则自动把 Source 标为 Deferred。

“这是不是普通教学课件、是否应在 v0.3 暂缓深读”仍然是 AI 的语义判断。

Local 可以直接利用 Blackboard 已明确给出的结构类型，例如原生 Assignment / Announcement 类型，作为确定性 metadata；但不得把 attachment title / hierarchy 当作本地 semantic filter。

`UNCERTAIN` 必须保守进入正常深读。

### 5. Mixed-use / 管理类文件必须处理

以下内容不得因为位于 Lecture 文件夹或名称类似课件而被 Deferred：

- Course Outline / Syllabus；
- Assessment / Assignment brief；
- rubric / marking scheme；
- submission instructions；
- assessment schedule / course calendar；
- grading / weight / policy；
- mixed-use 文件，只要 AI 从 lightweight Source profile 已看到明确课程管理信号。

若 Source-level profile 无法确认，输出 `UNCERTAIN`，进入正常处理。

### 6. Deferred Source 的状态

`TEACHING_MATERIAL_DEFERRED` Source 仍：

- 保留 Source identity / fingerprint；
- 保留 Fetch / parse / Index / coverage / locator / provenance；
- 保留 classification、policy version 与 evidenceUsed；
- 继续参与后续 fingerprint change detection；
- 不进入 Task A / B / C 的课程管理语义链路；
- 不触发 Vision；
- 不被解释为 Source 不存在、被删除或 Complete semantic understanding。

当 fingerprint、位置、Source-level profile 或 classification policy 变化时可重新分类。Deferred 不是永久 blacklist。

### 7. 主链路

```text
Discovery / Fetch
→ Local native parse / complete local inventory
→ native Blackboard management Sources: normal processing
→ file / attachment Source-level AI classification
    ├─ PROCESS   → Task A（native-first；必要时 exact visual completion）
    ├─ UNCERTAIN → Task A（保守处理）
    └─ TEACHING_MATERIAL_DEFERRED
         → keep local inventory / fingerprint / coverage / provenance
         → stop semantic deep-read for v0.3
→ Shared Working Context
→ Task B
→ Review / Task C（按入口语义）
```

不再保留逐 unit `EXPAND / SKIP / UNCERTAIN` Exhaustive Routing 作为 production 必经阶段。

### 8. Vision 与 Task A

只有进入 `PROCESS / UNCERTAIN` 的 Source 才进入 Task A。Task A 继续保持：

> **one file / Source = one primary logical Task A package**

Task A 先读取 native evidence；若产品相关 / 可能相关 exact unit 仍有 unresolved visual coverage 且确实需要视觉信息，才返回 `visualRequestRefs` 触发 Vision。

Deferred teaching material 不为了“以防万一”运行 Vision。

### 9. 验证要求

下一 full known-course clean Rebuild 前，只需做一次 targeted Source-level classification validation：

1. 使用当前真实 117 Sources 的 lightweight Source profiles；
2. 报告 `PROCESS / TEACHING_MATERIAL_DEFERRED / UNCERTAIN` 数量；
3. 人工 / evidence audit 所有 Deferred Sources，确认它们确为普通教学材料，且 Source-level profile 中没有明确已知 course-management / Assessment signal；
4. 已知 Course Outline / Assignment / Announcement / grading / submission / deadline Sources 不得错误 Deferred；
5. 不展开 Deferred 文件全文、不运行 Vision / Task A；
6. 记录调用次数、latency、tokens、repair / failure；
7. 验证所有 Deferred Sources 的 Fetch / parse / fingerprint / local Index / coverage仍完整保留；
8. full CI PASS。

该 targeted Gate PASS 后返回 Product Scope Review，由 Product 决定是否启动 known large-course clean Rebuild。

### 10. 与历史方向关系

DA-003 的 complete local Index / stable Ref / Local-AI boundary / Task A native-first / exact visual request 等基础能力继续有效。

DA-003 的逐 unit Exhaustive Routing 已被本方向取代，不再作为 production scope-reduction mechanism。DA-004 Failure Recovery & Paid Retry Policy 继续作为跨阶段有效规则。

---

## DA-006｜Bounded Course-level Processing + Partial Continuation

**日期：** 2026-10-06  
**状态：** APPROVED / CURRENT CROSS-CUTTING PRODUCT RULE  
**触发背景：** known-course recovery 在 109 个 Task A logical Sources 中已形成 107 个成功结果，剩余 2 个 schema failure。Product Owner 明确指出：Syllab 不应为了极少数顽固失败 Source 无限 Retry，也不应要求 Task A / B / C 每次都达到 100% semantic completion 才允许整门课程继续。v0.3 原始方向本就要求 Main 2–3 waves、Recovery 1–2 waves；本调整把它从效率目标明确为课程级 bounded processing / partial continuation 产品规则。

### 1. 核心产品判断

> **Syllab 追求高覆盖率，不追求通过无止尽付费 Retry 换取理论 100% completion。**

一次用户启动的 Initial Scan / Rebuild，应在有限 processing waves 内覆盖绝大多数 eligible Sources；少量在预算内仍失败的 Source 明确保留为 `Unresolved / Partial`，但不再阻塞其他成功结果进入 Task B / Review / Rebuilt Preview。

### 2. Course-level processing budget

当前 v0.3 规则：

```text
Main processing: 2–3 waves
→ Recovery: 1–2 waves
→ Remaining failures: Unresolved / Partial
→ Continue downstream with explicit incomplete coverage
```

- Main wave 是 physical Task A batches 的主要 admission / dispatch wave；
- 每个 eligible Source 在 Main 阶段正常只需要获得一个 logical processing result；
- Recovery wave 只重新处理当时仍 unresolved 的 logical Sources；
- successful Source 不重跑；
- 课程 workflow 不因少量 unresolved Source 永久停留在 Task A。

### 3. Paid recovery authorization

用户启动一次 Scan / Rebuild，即授权该 workflow 在 Main 阶段后，对**final failure state 已知且可安全重新派发**的 failed / interrupted Sources 执行最多 1–2 个 paid recovery waves。

这覆盖 DA-004 中“所有 paid failed item 都必须立即等待单独用户 Retry”的部分，但不撤销其 duplicate-paid safety：

- `paid-unverified` / Provider 是否已执行或计费无法确定 → 不自动重派；
- transport ambiguity → 不猜 success、不自动 duplicate paid call；
- 已 verified success → 永不因 recovery 重跑；
- zero-cost local recovery / deterministic repair → 可自动执行，且不计 recovery wave。

达到 recovery budget 后，系统不得自动开始第三个 recovery wave，也不得为了追求 100% completion 新建 full workflow。

### 4. Remaining unresolved Source semantics

Recovery budget 结束后仍失败的 Source：

- 状态为 `Unresolved / Partial`（具体持久化枚举由 Technical Design 与现有 state model 对齐）；
- 保留 Source identity / fingerprint；
- 保留 Fetch / parse / local Index / coverage；
- 保留 Locator / provenance；
- 保留 failure / attempt evidence；
- 本轮停止继续深读其内部语义；
- 不得标为 Complete；
- 不得解释为“没有产品相关信息”；
- 不得解释为 Source / Assessment 删除。

后续 Manual Check / Rebuild / Source change 或用户显式 Retry 可以重新尝试。

### 5. Downstream continuation

少量 `Unresolved / Partial` 不阻塞 Task B / Review / Rebuilt Preview。

Task B 输入必须区分：

1. successful Task A Shared Working Context；
2. unresolved Source coverage manifest。

Task B 只基于已成功取得的 evidence 做 Same / Different / Uncertain、Canonical Assessment Identity 与课程级组织；对 unresolved Source 不得推断其中不存在 Assessment / date / requirement。

Task C / Change Detection 继续受 coverage guard 保护：如果某个 trusted fact / Assessment 的 supporting Source 本轮 unresolved，不能仅因 latest semantic result 缺失就产生 `Possibly Removed`。

Rebuild Preview / Review 必须保留“本轮 coverage 不完整”的事实；不要求用户为少量 unresolved Source 停止查看其他成功结果。

### 6. Zero-cost deterministic compatibility repair

本地仍可自动执行 deterministic repair，但边界必须是：

> **唯一机械映射 + 不改变课程语义 payload。**

例如固定 schema identifier 的明确 canonical alias、JSON syntax、whitespace / delimiter / encoding 等机械问题可以修；Assessment / Fact / Requirement / Date / Evidence 等语义内容不得由 Local 猜测或补写。

如果 deterministic repair 无法证明唯一且语义不变，则保持 `Unresolved / Partial`，不为了“修好它”擅自新增模型调用。

### 7. 与 DA-004 的关系

DA-004 以下规则继续有效：

- success checkpoint reuse；
- ambiguous-paid 不自动重派；
- Provider safe retry 只根据明确外部事实；
- worker ownership / stale-writer protection；
- zero-cost recovery 优先；
- no arbitrary timeout / memory / byte / concurrency cap。

DA-006 覆盖 DA-004 以下旧语义：

- “任何付费 AI failure 都必须立即停止并等待用户逐次 Retry”；
- “workflow 只有全部 Task A items 成功后才能进入下游”。

当前规则改为：**一次用户启动授权 bounded recovery；budget 用完后 partial continuation。**

### 8. 当前 known-course 的直接应用

当前 `wf_3ee80256bee2d6d2fb0e805c` 已完成一次 Recovery wave：107 success / 2 schema failure。

下一步：

1. 先尝试 zero-cost deterministic schema compatibility repair；
2. 若能证明只把固定 schema identifier `syllab.ai/task-a/1` canonicalize 为 contract 要求的 `syllab.ai.task-a/1`，且其他 payload byte-for-byte / semantically unchanged，则本地修复、重新 validation / checkpoint，不调用 Provider；
3. 若无法满足 deterministic repair 条件，则这 2 个 Source 直接保留为 `Unresolved / Partial`；
4. **不为了追求 109/109 再启动第二次 paid Retry；**
5. 用 107（或 zero-cost repair 后更多）successful Sources + unresolved manifest 继续 Shared Working Context → Task B → Rebuilt Preview；
6. trusted Current Course State 不变，Rebuild 仍不运行 Task C、不 Use / Keep。

### 9. 验收要求

后续真实 course run 必须同时报告：

- Main waves 数；
- Recovery waves 数；
- 每 wave unresolved set；
- successful / unresolved / paid-unverified logical Source 数；
- zero-cost repair 数；
- recovery 新增 paid invocation 数；
- final semantic coverage ratio；
- Task B / Preview 是否正确携带 unresolved coverage；
- 是否出现因 unresolved coverage 产生的 false removal / false Complete。

不得把“有少量 Unresolved”自动判定为 Real-course Validation FAIL；应根据 coverage ratio、未解决 Source 类型、Preview 语义质量与 provenance 进行 Product Review。

### 10. 2026-10-06 Task B Hardening Clarification

当前 known-course 在 107 个 Task A success + 2 Unresolved 的基础上执行 1 次 Task B。Provider 正常返回完整 JSON，非 timeout / truncation，但输出引用了 213 个输入任何 section 都未供应的 Evidence IDs；72 个带 Evidence 的结果均未通过 supplied-evidence validation，另有 `evidence.excerpt` shape contract error，因此 verified Task B logical result = 0。

Product 判断：这不是 Task A Partial 导致的正常缺失，也不是 Syllab A→B→C 产品职责错误；当前 blocker 是 **Task B grounding / contract maturity 不足**。本轮不允许通过替换 Evidence ID、补 excerpt、删除 claim 或把 Task A provisional draft 冒充 canonical result 来机械“修好”输出。

从本 clarification 起：

1. Task B Evidence Ref 改为 supplied / expanded Registry 约束引用；
2. Task B 只能引用已供应 Evidence，或显式请求新的可解析 Evidence Ref；
3. 自由生成的未知 Evidence ID 一律 contract failure；
4. Task B output 必须支持独立 item / dependency-group validation 与 checkpoint；
5. independently verified sibling item 不得因无关 sibling failure 被整批丢弃；
6. 若无任何 verified Task B item，允许生成明确降级的 Partial Rebuilt Preview，仅展示 verified Task A provisional information + unresolved coverage，并标记 `cross-source organization incomplete`；不得声称已完成 canonical Task B；
7. 在 zero-model hardening Gate 全部通过后，当前 known-course 只允许 **1 个 Task B recovery wave**；
8. recovery 后 remaining invalid / unresolved Task B item 转 `Unresolved / Partial`，不再无限 paid Retry。

### 11. Task B Anti-Repeat Preflight｜不得重复 Task A 已踩过的工程坑

在任何新的真实 Task B paid invocation 前，Engineering 必须做零模型 preflight / audit，至少覆盖：

#### 11.1 No Arbitrary / Unverified Limits

逐项列出 Task B active path 中所有：

- request / stream timeout；
- max output / context / payload guard；
- Evidence count / item count / field count；
- expansion round / recovery round；
- concurrency / admission / memory / DOM / Activity buffer；
- worker / lease / ownership deadline；
- parser / view / storage boundary。

每个 limit 必须归类为：

1. verified Provider / Browser / platform hard boundary；
2. measured benchmark / stress / real-course evidence-backed resource control；
3. arbitrary / unverified implementation constant。

第 3 类不得继续作为正常 capacity / completion hard gate。尤其不得因为本轮 Provider 约 294.6s 就重新引入 300s 绝对模型截止；有持续 progress 的请求不得被拍脑袋秒数截断。

#### 11.2 Contract / Grounding Before Paid Run

真实调用前必须通过 deterministic / recorded-fixture tests：

- supplied Evidence Registry membership；
- unknown Evidence Ref rejection；
- valid `requestedEvidenceRefs` resolution；
- no semantic Local repair；
- shape / schema validation；
- item / dependency-group validation；
- valid sibling preservation；
- Partial / unresolved manifest generation；
- Task A unresolved coverage passthrough；
- trusted-state protection。

#### 11.3 Failure Isolation / Durable State

Task B 必须像已经修正后的 Task A 一样：

- success / failure / unresolved 可机械闭合；
- single item unexpected failure 不得静默阻断后续已验证 sibling；
- durable error stage / identity / timing 可观测；
- owner / session / stale-writer protection 完整；
- Provider in-flight / retry set / paid-unverified 可区分；
- 不因 post-processing / IndexedDB / view 失败丢失 verified success。

#### 11.4 Long-context / Activity Pressure

本轮真实 Task B 输入约 183,795 tokens、输出约 84,482 tokens（其中 reasoning 42,348），Provider 约 294.6s。下一 paid run 前必须零模型审计：

- Shared Working Context 是否重复发送不必要 raw / framing；
- Evidence Registry 是否可使用短 stable refs / compact representation，同时保持 exact provenance；
- output contract 是否要求模型重复大量 Evidence / excerpt；
- Activity UI 是否使用 bounded / coalesced DOM projection，避免把完整 reasoning / output 持续堆入 layout hot path；
- storage / private QA trace 可以完整保留，但用户可见 DOM 不得因 stream 长度无限增长。

该审计用于去除重复开销和 UI / runtime 风险，不得通过减少必要 Assessment / Evidence coverage 获益。

#### 11.5 Recovery Authorization

当前 failed Task B output 不自动重派。只有 §11 全部 PASS、完整 CI PASS、现场 provider0 / no stale owner / trusted unchanged 后，才允许消费当前 known-course 的 1 个 Task B recovery wave。

如果 recovery 仍不能形成合法 verified Task B result / Partial item set，则停止付费尝试，按 §10 生成 Task B `Unresolved / Partial` / degraded Partial Preview，返回 Product Review。
