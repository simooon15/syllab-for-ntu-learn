# Syllab for NTU Learn PRD v0.3.0

## P2E-059 Course Brief IA 已批准（2026-10-14）

本轮Human批准Summary-first + Organized Details on Demand + Evidence on Demand。一个Assessment仅有一张主卡及一个主要入口，不再并列渲染总览小卡与下方同名大卡。摘要、结构化行动详情、原文查证共享同一对象/Fact/信任状态，导航不产生认可。详情必须按业务组织、保留独立动作、顺序/依赖、力度、条件/例外/OR；长Rubric和教学/技术依据按需查证。无日期/权重不能排除真实新任务，未明身份不能冒充已确定考核。

这是对既有“页面架构不重做”限制的有限已批准例外，不新增Course Brief模型、Review或语义认证框架。P058语义问题继续有效；零新付费，交新隔离未核验预览后集中停下。旧设计保留为历史，当前IA以独立规格§5.2的P059修订为准。

## P2E-056 已批准的 RC2 局部修订（2026-10-11）

本节依据 Product Owner 对阶段 B 的集中批准，覆盖 §6.4 中“不重新设计 Review 产品逻辑”及“不改变既有 Review 决策语义”的局部限制。沿用既有 Review 框架，不新增批量工作台；允许业务审核单位、无副作用导航、明确批准范围和分层阅读的必要改造。

来源观察完整留存与学生产品晋升分离。当前考核、行动、关键规则必须有来源支持；标题、命令语气和技术设置本身不能证明学生任务。真实无日期或无权重任务仍须保留。教学指导留在参考；重要身份/适用性疑问按业务范围汇成 Issue，不逐句转为未知任务。

同一不可变 Clause 可支持多个 typed propositions，分别保留谓词、取值、单位、作用域、力度、条件/例外及证据版本。Brief 主层优先考核、课程权重、时间、提交物/渠道、责任和关键风险；执行清单组织父子、包含、独立动作和选择关系，细则与原文按需查看。不得生成脱离事实映射的可信摘要。

Review 可无决策前后浏览和跳转目录；Defer 保存后推进，仍可返回。显示、编辑与确认范围一致或明确区分；决定记录对象和版本，独立冲突不随父级接受。RC1 被迫 Confirm 永不作为语义 gold。新模型只产生候选，既有 trusted、用户值、历史和旧备份保留。正式 IA 见独立规格的 RC2 修订。

Outline-first 与低于 ¥2 成本研究未获实施批准。RC2 停在 Human Gate 5；工程检查不代签产品验收。


**产品版本：** v0.3.0  
**文档状态：** Product Architecture Locked / Ready for Technical Design Handoff  
**版本定位：** 对既有端到端产品闭环进行系统级优化与产品化，不引入无关新功能。  
**语言规范：** 说明性内容以中文为主；Assessment、Review、Task A / B / C、Current Course State、Evidence、Source、Same / Different / Uncertain 等已锁定产品术语保留英文。

> 本 PRD 直接记录 v0.3.0 当前已锁定的产品目标、范围、AI Processing、核心 Workflow 与验收要求。
> v0.3.0 不再单独维护 `AI_DESIGN_v0.3.0.md`；AI 产品行为、Prompt / Context 产品级策略、Evaluation 与限制统一归入本 PRD。
> 页面级结构、视觉系统、Interaction 与 Motion 的详细设计由 `Interaction_and_Information_Architecture_Spec_v0.3.0.md` 承担；Technical Design 负责工程实现细节。

---

# 1. 版本概述

Syllab 已在 v0.2.0 建立完整的 Semester → Course → Current Course State → Assessment 产品闭环，并形成 Initial Scan、Initial Review、持续检查、Change Review、Rebuild、Course Brief、Side Panel / Full-page、Local-first + BYOK 等完整产品能力。

v0.3.0 不重新定义产品，也不增加与核心闭环无关的新模块。本版本的核心任务是：

> **把已经成立的产品闭环做得更完整、更高效、更准确、更透明，并把整体视觉与交互完成度提升到成熟产品水平。**

重点集中在五个方向：

1. 提升课程信息获取完整性；
2. 提升 AI Processing 执行效率，并降低重复调用、Token 与 API Cost；
3. 提升 AI 信息整理质量与 Assessment Identity 稳定性，从上游降低 Review 负担；
4. 提升长时间 AI Processing 的可感知性，避免用户看到“冻结”的黑盒过程；
5. 基于现有设计进行系统级视觉、Interaction 与 Motion 完成度提升。

---

# 2. 当前版本现状与待优化问题

## 2.1 AI Processing 运行效率不足

v0.2.0 在真实大课程 Rebuild 中出现明显的调用碎片化：

- 119 / 119 Sources；
- Task A 启动 216 次；
- Task A consolidation 41 次；
- Task B 1 次主调用 + 2 次 expansion；
- 整体处理过程长，重复上下文与重复 reasoning 明显。

主要根因之一是：**同一文件被拆成过多独立处理单元**。文件内部上下文被切碎后，需要多次重新理解，并进一步制造 consolidation、重复 Context、重复 reasoning 与额外 API 调用。

因此 v0.3.0 必须从“更多小调用”转向“以完整文件语义为主的处理包 + 有界并发 + 必要时才分割”。

## 2.2 Assessment Identity 与组织质量不足

v0.2.0 真实 Rebuild 暂存结果包含：

- 73 个 Assessment；
- 879 个 Facts；
- 521 个 Evidence；
- 14 组 normalized-title duplicate groups，涉及 38 个 Assessment objects。

同一真实 Assessment 可能因为不同 Source、不同名称、上下文碎片或别名而形成多个对象，导致 Review 承担了过多本应由 AI 上游完成的身份整理工作。

v0.3.0 需要强化：

- 文件内 Assessment 信息整理；
- 跨 Source Assessment Identity 判断；
- Same / Different / Uncertain；
- Canonical Assessment 归并；
- Evidence 与来源追溯；
- 减少机械重复与碎片化 Review。

## 2.3 文件理解完整性不足

v0.2.0 的文件理解仍偏向文本层处理。对于扫描页、截图、表格、视觉布局和其他无法被纯文本结构完整表达的信息，存在“文件被处理了，但实际课程信息没有被完整理解”的风险。

同时，DOCX / PPTX / XLSX / PDF 具有不同的自然结构；旧版 Office 文件也需要统一进入可理解的处理路径，而不是简单被当成不支持文件。

v0.3.0 因此需要建立统一但 format-aware 的文件理解策略。

## 2.4 长时间 AI Processing 缺乏可感知性

AI 调用在单个文件或跨来源组织阶段可能持续较长时间。仅显示静态 loading、阶段名称或当前文件名，仍可能让用户认为产品已经卡住。

v0.3.0 需要把 AI 本身已经产生的流式内容直接投影为运行中的 Activity，使用户持续看到“AI 还在处理”，但不把这些运行态内容误认为正式课程事实。

## 2.5 UI / Interaction / Motion 完成度不足

现有页面已经形成较完整的产品设计规模，但局部仍存在：

- 信息层级与视觉规则不够统一；
- Side Panel / Full-page 的同类控件和状态表现存在差异；
- 操作反馈不够连续；
- 页面切换、展开、Evidence Reveal、状态更新等交互缺少成熟产品级反馈；
- 局部视觉协调性仍有明显优化空间。

v0.3.0 不从零重新设计，而是在现有体系上做系统级统一与精修。

---

# 3. 版本目标

## 3.1 总目标

> **在不改变 Syllab 核心产品定位和已成立业务逻辑的前提下，对文件理解、AI Processing、Assessment Identity、运行可观察性和整体 UI / Interaction / Motion 做一次系统级升级。**

## 3.2 具体目标

### G1｜提升课程信息获取完整性

- 不把不同文件格式粗暴压平成纯文本；
- 优先利用可靠的原生结构；
- 对纯结构提取无法覆盖的信息使用视觉补全；
- 保持 Source、Locator、Evidence 与原始来源身份可追溯；
- Complete / Partial / Unsupported 必须反映真实理解覆盖，而不是“解析函数是否执行成功”。

### G2｜提升 AI Processing 效率

- Task A 从默认串行、过度 chunking 转向一个 Source 一个 semantic logical task，并通过 Read-on-demand 减少默认 full dump；
- 支持 adaptive bounded concurrency；
- 减少重复 Context、重复 reasoning、重复 consolidation 与不必要的 expansion；
- 失败时仅恢复失败处理单元，成功结果继续复用；
- runtime、invocation、Token、API Cost 作为架构优化后的结果指标。

### G3｜提升 AI 信息整理质量并降低 Review 负担

- Task A 在单个文件内部把碎片化信息整理成 provisional Assessment Draft；
- Task B 拆为 Stage 1 跨 Source Same / Different / Uncertain + Progressive Global Registry，以及 Stage 2 单 Assessment synthesis；
- Review 不再承担大量机械去重、别名整理和明显身份归并；
- 不通过本地启发式规则替代 AI 语义判断。

### G4｜提升 AI Processing 可观察性

- Task A / B / C 的长时间模型调用都应提供持续动态 Activity；
- Activity 直接来自模型已有的流式 reasoning / output 内容，不额外调用 AI 总结；
- Activity 只承担“系统正在工作”的反馈，不作为正式课程事实。

### G5｜提升整体产品体验与完成度

- 基于现有设计做系统级视觉统一；
- 建立成熟产品级 Interaction / Motion Feedback；
- 保留现有页面骨架、信息架构与产品识别，不做从零重设计；
- 第一眼明显更协调、更成熟，但仍然是同一个 Syllab。

---

# 4. Scope

v0.3.0 的产品范围包括：

1. 文件理解策略升级：PDF / PPTX / DOCX / XLSX 以及 legacy Office 文件的统一 format-aware 处理路径；
2. 结构提取、视觉补全、Source / Locator / Evidence 的统一 provenance；
3. Blackboard 原生 identity / modified / resource identity 优先的 Source identity 与机器变化检测；
4. Local-first + Index-first + Read-on-demand 的 AI 数据访问方式；
5. Task A 以单个 Source 为 semantic logical task，在 Source 内形成 Assessment Draft / Course-level Rule Candidate；
6. Task B 拆分为 Stage 1 课程级跨 Source aggregation 与 Stage 2 单 Assessment synthesis；
7. Stage 1 Progressive Global Registry 与 Same / Different / Uncertain；
8. Course-level Important Rules 在 Stage 1 完成跨 Source 聚合；
9. Task C 延续既有 Change Detection 语义，并保持 object-level thin comparison；
10. Initial Scan、Rebuild、Opportunity Check、Manual Check 共享同一底层 AI Processing 能力；
11. 全链路 Evidence / Source / Locator provenance 与 workflow-scoped provisional state isolation；
12. AI Activity 运行可观察性；
13. Review 在既有产品逻辑上做轻量体验优化；
14. 全产品 UI / Interaction / Motion 系统级统一；
15. AI Evaluation / Regression 补充；
16. v0.2 → v0.3 runtime / invocation / token / cost / Review burden 对比；
17. 大课程 clean rerun 与全新课程 cold-start 的独立真实 E2E Acceptance。

> v0.3.0 不再设置独立 Source Triage / Teaching Material Deferral 阶段，也不把 cross-Source physical packing 作为产品要求。Task A 自己通过轻量首轮理解与 Read-on-demand 决定是否继续读取当前 Source；物理请求优化如有需要，留给 Technical Design 在明确 deterministic algorithm 下提出。

# 5. Out of Scope / 产品边界

v0.3.0 不新增以下产品能力：

- Chatbot；
- Todo / Planner / Reminder Center；
- Cloud Drive；
- Homework Agent；
- Calendar Sync；
- 新的跨课程聚合产品；
- 新的完整 History 产品；
- Restore Merge；
- 新的提醒系统；
- 新的业务入口或与课程信息整理无关的功能。

以下既有边界继续保持：

- Popup 不恢复；
- Local-first + BYOK 不变；
- Semester → Course → Current Course State → Assessment 核心模型不变；
- Same / Different / Uncertain 不变；
- New / Changed / Conflict / Possibly Removed / Identity Uncertain 不变；
- 语义变化仍需经过既有 Review / 用户决策路径；
- trusted Current Course State 不允许被 provisional preview、failure 或未审核语义静默覆盖。

本版本的 Google Drive ↔ ChatGPT ↔ Codex 协作方式验证属于**开发治理实验**，不属于 Syllab 产品功能，也不进入产品 Scope。

---

# 6. Product Requirements

## 6.0 AI Processing Architecture Baseline

v0.3.0 的 AI Processing 主链路为：

```text
Discovery
→ Fetch / deterministic parse / Local Index
→ Task A
→ Task B Stage 1
→ Task B Stage 2
→ provisional Task B Result
```

随后按 workflow 分流：

```text
Initial Scan → Initial Review → trusted Current Course State
Rebuild → Rebuilt Preview → Use rebuilt / Keep current
Check → Task C → Change Review → trusted Current Course State
```

### 6.0.1 Source Identity 与机器变化检测

对于 Blackboard 已经提供稳定原生身份的对象，优先复用 Blackboard native identity，不重复构造平行身份系统：

- Course → Blackboard `courseId`；
- Blackboard Content / Page / Folder → native content identity；
- Announcement → native announcement identity；
- attachment / file resource → native attachment / resource identity；
- Blackboard 可提供的 `created` / `modified` 等 metadata 原样保存。

Syllab-owned IDs 只用于 Syllab 自己的 semantic / product objects，例如 Assessment Draft、Evidence、provisional Group、trusted Assessment 等。具体字段与 ID schema 留给 Technical Design。

Opportunity / Manual Check 的机器层变化检测优先使用 native identity 与 Blackboard 可验证的 change metadata：

```text
same native object + unchanged native modified/version signal
→ machine unchanged

same native editable object + changed native modified
→ machine change candidate

attachment/resource identity changed
→ machine change candidate

new native identity
→ new Source candidate

previous native identity not observed
→ missing candidate
```

`missing candidate` 不是 `Possibly Removed`。Fetch / permission / parse / discovery coverage 不完整也不得被解释为 removal。`contentHash` / fingerprint 可保留为技术信息或缺少可靠 native signal 时的 fallback，但不再作为当前主要产品 identity / change-detection 机制。

### 6.0.2 Local-first + Index-first + Read-on-demand

Local Course Data Layer 逻辑上保存并隔离：raw / Source data、AI working data、trusted Current Course State 与 workflow-scoped provisional state；它不要求实现成单一表或单一模块。

AI 不默认接收整份 Source 全文。Local 先暴露机器可直接确定的 native / deterministic structure，例如：

- PDF page 与原生 bookmark / outline / TOC（如真实存在）；
- PPT slide 与 native title placeholder；
- DOCX Heading / section / paragraph / table；
- XLSX sheet / range / table；
- parser success / failure、extraction availability 等纯技术状态。

Local 不得自己生成 semantic outline，例如把某一页范围标成“Assessment section”。

AI 在同一 logical task 内使用：

```text
CONTINUE + requestedReads
FINAL
```

`CONTINUE` 必须提出具体、可执行的读取请求。Local 只按明确 ID / Locator / range / authorized mechanical search 执行读取，不判断哪段内容“值得读”或“更重要”。

### 6.0.3 Local 的严格执行边界

Local 的含义不是“所有非 AI 工作”，而是：

> **执行已经明确写好的 deterministic rules。**

如果某个行为仍需要“根据情况判断应该怎么做”，但 Product / Technical Design 尚未给出完整、确定、可验证的执行规则，就不能把该判断责任交给 Local。

Local 可以负责存取、确定性 parse、exact identity / equality、state machine、明确 workflow routing、retry / recovery、checkpoint、schema / reference validation、Evidence lookup、technical status 与 trusted-state protection；不得做课程语义判断，也不得以 Local heuristic 替代 AI semantic judgment。


## 6.1 文件理解与课程信息获取完整性

### 6.1.1 总体原则

文件理解采用统一的：

> **format-aware + native-structure-first + selective visual completion + unified evidence/provenance**

不同格式使用自身可靠的原生结构作为第一理解层；视觉 / 多模态能力只补充结构解析无法可靠覆盖的信息。

不得把所有文件先粗暴压平成纯文本后再统一处理。

### 6.1.2 文件自然结构

文件内部的自然定位单位至少包括：

- PDF → page；
- PPTX → slide；
- DOCX → section / paragraph / table；
- XLSX → sheet / range / cell / table。

这些自然单位用于理解、Evidence 和 Locator，不默认等于独立 AI 语义工作单元。

### 6.1.3 PDF

PDF 应结合：

- 可可靠提取的文本 / 结构；
- page-level 视觉补全；
- 扫描页、image-only page、mixed page；
- 有课程语义价值的截图、表格、图像与布局信息。

最终信息必须保留 page-level 来源定位。

### 6.1.4 PPTX

优先利用 slide 原生文本、标题、表格与结构关系；对截图、图片、视觉层级和无法通过原生结构完整表达的内容使用视觉补全。

Evidence 必须保留 slide-level Locator。

### 6.1.5 DOCX

优先利用 document / section / paragraph / table 原生结构；视觉信息只作为必要补充，不因版式复杂就退化成纯文本全文。

### 6.1.6 XLSX

必须保留 spreadsheet native structure，不把 Workbook 压平成一段文本。

至少保留：

- sheet；
- cell / range；
- table relationship；
- 对课程语义有意义的结构关系。

更细的公式、图表和具体解析策略留给 Technical Design。

### 6.1.7 Legacy Office

Legacy Office 文件应优先进入 canonicalization 路径，再复用对应现代格式的理解能力；例如 `.doc → .docx`、`.ppt → .pptx` 等可靠转换路径。

要求：

- 转换只是内部处理步骤；
- 用户看到的 Source identity 仍然是老师原始上传的文件；
- 原始 Source 与内部 canonical representation 的关系必须可追溯；
- exact per-format conversion 细节由 Technical Design 固化。

### 6.1.8 统一 Evidence 与 Coverage

结构提取和视觉补全不得形成两个互相独立的事实库。

最终统一到：

> **Source + Locator + Evidence + Normalized Unit**

并要求：

- 同一信息若已通过结构层可靠取得，不重复通过视觉层再次理解；
- Complete / Partial / Unsupported 反映真实理解覆盖；
- “解析成功但漏掉有意义视觉内容”不得标记为 Complete。

---

## 6.2 Task A / Read-on-demand / 执行效率

### 6.2.1 Task A logical unit

v0.3.0 锁定：

> **One Source = one Task A semantic logical task.**

PDF page、PPTX slide、DOCX section、XLSX range 等自然结构用于定位、Evidence 和按需读取，但不默认成为独立 semantic Task A。

Task A 的第一轮先基于当前 Source 的 metadata、native structure 与可用初始内容做轻量理解：

```text
已有足够信息
→ FINAL

没有相关课程信息
→ FINAL / 0 Draft / 0 Rule Candidate

需要更多信息
→ CONTINUE + requestedReads
→ Local mechanical read
→ Task A continues
```

合法的 `0 Draft / 0 Rule Candidate` 必须来自 Task A 对该 Source 的语义理解结果，而不是 Local relevance filtering。

### 6.2.2 Task A 职责

Task A 只理解当前 Source，负责：

- 将同一 Source 内属于同一 Assessment 的分散内容组织为 0..N 个 provisional Assessment Drafts；
- 组织 fields、dates、requirements、constraints、components / relationships、aliases；
- 形成 0..N 个 Course-level Rule Candidates；
- 建立 Evidence / Locator / provenance；
- 保留 field / relationship / object 级 uncertainty。

Task A 不负责：

- 跨 Source Same / Different / Uncertain；
- 跨 Source final Assessment identity；
- 与 trusted Current Course State 比较变化。

### 6.2.3 物理调用与并发边界

产品层只锁 semantic logical unit，不规定 cross-Source physical packing。

- 一个 Source 可以因为 Read-on-demand 在同一 logical task 内发生多次 AI 往返；
- 多个 Source logical tasks 可以并发；
- 是否存在更底层的物理请求优化，不作为当前 Product requirement；
- 如果 Technical Design 提出任何动态 packing / scheduling 优化，必须给出完整 deterministic algorithm，并证明不会引入跨 Source 语义混合或 Local 自主判断。

不得因为“减少调用”重新把多个 Source 变成一个跨 Source semantic Task A。

### 6.2.4 Checkpoint / failure recovery

每个 Source logical task 都应独立 checkpoint / resume / recover：

- successful Source result 可复用；
- technical failure 不等于 `0 Draft`；
- unresolved / failed Source 保留 coverage / provenance / failure state；
- 少量失败不得触发整门 Course 从头重跑；
- coverage gap 不得被解释为“没有相关课程信息”或 removal。

### 6.2.5 Efficiency principle

v0.3.0 的效率优化主要来自：

- 一个 Source 只建立一次 semantic logical context；
- Index-first，避免默认发送整份原文；
- Read-on-demand 只补充 AI 明确需要的内容；
- Task A logical tasks 并发；
- successful result reuse / failed-unit recovery；
- Task B 拆阶段，避免单个 course-wide monolithic call 同时承担全部职责。

不得通过少读课程内容、丢失 Evidence、降低必要语义判断、Local heuristic、绕过 Review 或破坏 trusted-state safety 来换取漂亮的 runtime / token / cost。


## 6.3 Task B 两阶段架构 / Assessment Identity / Course-level Organization

Task B 不再作为一个 monolithic course-wide AI task 同时承担 identity、canonical synthesis、requirements、conflict、Evidence closure 与 course-wide accounting。

v0.3.0 拆分为：

```text
Task B Stage 1
→ course-level cross-Source aggregation
→ Assessment Groups + provisional Important Rules

Stage 1 FINAL
→ Task B Stage 2
→ one Assessment Group = one independent synthesis task
→ provisional Assessments
```

### 6.3.1 Stage 1｜Course-level cross-Source aggregation

输入：所有已完成 Task A logical tasks 的：

- Assessment Drafts；
- Course-level Rule Candidates。

Stage 1 负责：

- Same / Different / Uncertain；
- 建立和修订 provisional Assessment Groups；
- 处理 identity-relevant structure / relationship；
- 跨 Source 合并 / 去重 / 补充 / 冲突保留 Course-level Rule Candidates；
- 形成 provisional Important Rules；
- 显式保留 unresolved / Uncertain dispositions；
- 保持完整 provenance refs。

Important Rules 在 Stage 1 完成，不进入 Stage 2。

### 6.3.2 Progressive Global Registry

Stage 1 采用一张持续演进的 **Progressive Global Registry**，而不是“多批独立 AI 结果 + Local 最后语义合并”。

```text
new inputs + current Registry
→ AI updates Registry
→ Registry vN
→ next inputs + Registry vN
→ AI continues
→ ...
→ FINAL
```

在 Stage 1 FINAL 前，AI 可以：

- assign；
- create group；
- merge；
- split；
- reassign；
- return to Uncertain。

Registry 本身就是轻量、结构化的 AI working state。Local 不对 Registry 做 semantic summary，只能按固定 schema 保存、读取和传递；需要历史细节时，由 AI 通过 Draft / Evidence / Source / Locator 按需读取。

进入 Registry 的新输入不得由 Local 基于 title、filename、folder、similarity、importance 等语义规则分组。具体技术 admission / ordering 如需动态策略，由 Technical Design 提供明确 deterministic rule。

### 6.3.3 Task A 与 Stage 1 可以 pipeline overlap

已完成并 checkpoint 的 Task A outputs 可以在其他 Source 尚未完成时进入 Stage 1。

但 Stage 1 只有在所有 eligible Task A logical units 都到达明确技术终态后，才能进入最终 completion check / FINAL。

Task A technical failure 不是 `0 Draft`，必须作为 coverage gap 保留。

Stage 1 对每个输入 Draft 必须输出显式 disposition，避免 semantic object silent disappearance。可包括：

- assigned to Group；
- standalone / new Group；
- identity Uncertain；
- explicitly excluded / invalid Draft；
- unresolved。

Disposition 由 AI 决定；Local 只做 ID / set accounting。

### 6.3.4 Stage 1 bounded semantic rounds

Stage 1 使用 bounded semantic attempts：

- 约 2–3 轮 main / global aggregation；
- 必要时再约 1–2 轮 focused identity / rule checks；
- 通常约 3–5 个有效语义轮；
- 必要情况下最多约 5–6 个有效语义轮。

达到最终语义轮后，仍无法可靠解决的问题由 AI `FINAL` 并保留 `Uncertain / unresolved`；Local 不得因为达到轮数上限自行生成语义结论。

Timeout、provider error、malformed response、truncation、schema failure 等 technical retry 与 semantic round 分开记账。

### 6.3.5 Stage 2｜Assessment-level synthesis

Stage 1 FINAL 后，Stage 2 把一个 Assessment Group 整理成一个完整 provisional Assessment。

Stage 2 负责：

- name / type；
- weight；
- deadline / dates；
- requirements；
- constraints / facts；
- relevant component details；
- Evidence；
- Conflict / Uncertain / Not Mentioned。

Stage 2 不重新做 Assessment identity。

锁定：

> **One Assessment Group = one independent Stage 2 logical task.**

多个 Group 可以并发，但不做 cross-Group packing。一个 Group 如果需要更多信息，只在自己的 logical task 内使用 `CONTINUE + requestedReads` 继续。

Stage 2 semantic rounds：

- 约 1–2 轮 main synthesis；
- 必要时再约 1–2 轮 focused checks；
- 通常约 2–3 个有效语义轮；
- 必要情况下最多约 3–4 个有效语义轮。

仍无法确定的字段 /关系可以 `FINAL` 并保留 `Conflict / Uncertain / Not Mentioned`；semantic FINAL 不要求强制解决所有字段。

### 6.3.6 Task B Result

所有 Stage 2 logical tasks 达到终态后，本轮 Task B Result 为：

```text
Task B Result
├─ provisional Assessments
├─ provisional Important Rules
├─ Conflict / Uncertain
└─ provenance
```

Stage 1 Rules 与 Stage 2 Assessments 的最终 assembly 不需要新的 AI semantic step。Local 只机械组合 AI 已明确输出的结构化结果。

Task B 永远只产出 provisional product state，不直接覆盖 trusted Current Course State。

### 6.3.7 Provenance Hard Contract

任何 AI 聚合都不得牺牲 provenance。

至少必须能沿以下链路回查：

```text
Assessment / Important Rule / Change
→ upstream AI object
→ Evidence
→ Source
→ Locator
→ original content / captured excerpt
```

Stage 1 identity judgment、Stage 2 field、Important Rule consolidation 都必须保留足够上游引用。Local 负责保存 / lookup / reference existence validation，不负责判断哪条 Evidence 支持哪个 semantic claim、哪条 Evidence 更可信或是否冲突。


## 6.4 Review 负担优化

v0.3.0 **不重新设计 Review 产品逻辑**。

继续沿用 v0.2 已成立的 Review 能力，包括：

- Assessment-level Initial Review；
- Confirm；
- Edit；
- Exclude；
- Review later；
- Same assessment as…；
- Split；
- Changed / New / Conflict / Possibly Removed / Identity Uncertain 对应既有 Change Review；
- Evidence Reveal；
- Review 完成后返回 Current Course State。

本版本的 Review 负担降低主要来自：

> **Task A / Task B 上游组织质量提升，而不是减少用户控制权。**

允许做的优化：

- 变化字段更清晰的局部状态标记；
- Review 期间更好的视觉层级；
- 状态完成后标记自然恢复默认；
- Evidence 查看和操作反馈优化；
- 降低机械重复内容进入 Review 的概率。

不新增一套独立批量 Review 产品模式，不改变既有 Review 决策语义。

---

## 6.5 AI Processing 可观察性

### 6.5.1 核心原则

Task A / Task B / Task C 的长时间模型调用都应提供实时 AI Activity。

Activity 的目标不是解释 AI 为什么做出某个结论，而是让用户持续感知：

> **模型仍在处理，页面没有冻结。**

### 6.5.2 直接摘取已有流式内容

不新增额外 AI summary / rewrite / explanation 调用。

直接从模型已有的：

- reasoning stream；
- output stream；

中摘取最近少量内容进行滚动 / 动态展示。

### 6.5.3 Activity 的产品边界

运行中的 Activity：

- 不是 Review；
- 不是 Current Course State；
- 不是 Evidence；
- 不需要用户确认；
- 不作为最终课程事实；
- 任务完成后自动消失或收起。

用户最终接触和决策的正式课程信息，仍然通过既有 Assessment / Review 产品层呈现。

### 6.5.4 统一覆盖 Task A / B / C

三类 Task 统一采用同一原则，只是 Activity 内容自然不同：

- Task A：文件理解与文件内 Assessment Organization；
- Task B：跨 Source Identity / organization；
- Task C：latest result 与 trusted Current Course State 的变化比较。

---

## 6.6 相似处理链路能力对齐

Initial Scan、Rebuild、Opportunity Check、Manual Check 保留各自原有业务语义，但进入相同 processing 阶段后复用同一套能力：

- deterministic parse / Local Index；
- Task A + Read-on-demand；
- Task B Stage 1 Progressive Global Registry；
- Task B Stage 2 per-Assessment synthesis；
- provenance；
- Task C（仅 Check 类 workflow）；
- AI Activity；
- Retry / Recovery；
- checkpoint / resume；
- trusted-state protection。

原则：

> **共享底层能力，不统一业务入口；共享 AI processing architecture，不改变各入口既有产品语义。**


## 6.7 Failure / Recovery 延续与体验优化

v0.3.0 继续采用 bounded recovery，但必须区分：

1. **technical retry / recovery**：timeout、provider / transport error、malformed response、checkpoint recovery 等；
2. **semantic rounds**：AI 真正获得新 context / Evidence 后再次进行语义判断。

technical retry 不应机械消耗一次有效 semantic round。

继续保留：

- bounded retry / recovery；
- Partial / Unresolved；
- Waiting / Failed；
- stale-worker protection；
- successful result reuse；
- failed-unit recovery；
- trusted Current Course State protection。

硬边界：

- Partial / Unresolved / Failed 不得显示为 Complete；
- Task A technical failure 不得伪装成 `0 Draft`；
- unresolved Source 不得解释为“没有 Assessment / deadline / requirement”；
- coverage 不完整不得解释为 Source / Assessment 已删除；
- Stage 1 / Stage 2 的 semantic unresolved 必须显式保留；
- Task C 不得仅因 unresolved coverage 产生 removal 结论；
- failure 不得清空或覆盖 trusted state；
- 少量失败不得触发整门课程从头重跑。

具体 retry constants、timeout、recovery scheduling 与 provider ownership safety 留给 Technical Design，但不得改变上述 Product semantics。


## 6.8 UI / Interaction / Motion 系统级优化

### 6.8.1 设计策略

v0.3.0 不从零设计新的 Syllab。

采用：

> **Preserve → Normalize → Refine**

- Preserve：保留现有页面骨架、核心布局关系、产品识别和已成熟的信息架构；
- Normalize：统一重复出现的视觉组件、状态、间距、字体层级与交互规则；
- Refine：对局部密度、协调性、细节和反馈进行系统级精修。

目标效果是：

> **第一眼明显变得更好看、更协调、更成熟，但不会像换了一个完全不同的产品。**

### 6.8.2 系统级视觉统一

至少统一：

- Assessment presentation；
- section hierarchy；
- primary / secondary actions；
- state / status；
- input / edit state；
- empty / waiting / failed / success state；
- Side Panel / Full-page 同类组件；
- spacing / typography / density；
- Course Brief / Review / Processing / Settings 等页面家族。

### 6.8.3 Interaction / Motion Feedback

Motion 不是装饰性“轻动画”，而是成熟产品的交互反馈系统。

主要交互都应有自然反馈，包括：

- pointer / button press；
- expand / collapse；
- content reveal；
- page / view transition；
- state transition；
- Review progression；
- Evidence toggle；
- processing activity；
- success / error / undo；
- dynamic text appearance；
- Side Panel / Full-page 的一致交互反馈。

具体 duration、easing、实现方式留给 Interaction & IA / Technical Design，但产品层要求：

> **用户的主要操作和状态变化不应出现无反馈的“硬切换”。**

---

# 7. Core Product Logic / Workflow

## 7.1 End-to-end 主链路

### 7.1.1 Initial Scan

```text
Course Discovery
→ Fetch Sources
→ deterministic parse / Local Index
→ Task A per Source
→ Task B Stage 1 Progressive Global Registry
→ Stage 1 FINAL
→ Task B Stage 2 per Assessment Group
→ provisional Task B Result
→ Initial Review
→ trusted Current Course State
```

Initial Scan 没有旧 trusted Current Course State，因此不经过 Task C。

### 7.1.2 Opportunity Check / Manual Check

后续 Check 先由 Local 使用机器可直接确定的 Blackboard native identity / modified / resource identity 等信号进行变化检测。

```text
machine-identical
→ Stop → no AI

changed native object / changed resource identity / new native identity
→ affected Source enters AI path

previous native identity not observed
→ missing candidate
→ only Coverage Fact, not removal conclusion
```

进入 AI path 后：

```text
changed / new Sources
→ deterministic parse / update Local Index
→ Task A
→ Task B Stage 1
→ Task B Stage 2
→ provisional Task B Result
→ Task C object-level semantic comparison
→ Change Review（仅必要时）
→ trusted Current Course State
```

Fetch / permission / parse / coverage failure 不能解释为 Source removal。

### 7.1.3 Rebuild

```text
User chooses Rebuild
→ full Discovery / Fetch
→ deterministic parse / Local Index
→ Task A
→ Task B Stage 1
→ Task B Stage 2
→ Rebuilt Course Preview
→ Use rebuilt course / Keep current course
```

Rebuild 不进入 Task C，不做 field-by-field Diff。只有用户选择 `Use rebuilt course` 后，新的 rebuilt state 才替换 trusted Current Course State。

---

## 7.2 Task A / Task B / Task C 最新职责

### Task A｜单 Source 理解与组织

处理单位：**一个 Source = 一个 semantic logical task。**

负责：

- 理解当前 Source；
- 形成 0..N Assessment Drafts；
- 形成 0..N Course-level Rule Candidates；
- 组织 Source 内 fields / dates / requirements / constraints / relationships；
- 通过 `CONTINUE + requestedReads` 按需读取；
- 建立 Evidence / Locator / provenance；
- 保留 uncertainty。

不负责跨 Source identity，也不与 trusted state 做 change comparison。

### Task B Stage 1｜课程级跨 Source aggregation

负责：

- Same / Different / Uncertain；
- Progressive Global Registry；
- provisional Assessment Groups；
- provisional Important Rules；
- identity / rule unresolved disposition；
- provenance。

Stage 1 可以在 Task A 部分完成后开始增量推进，但必须等所有 eligible Task A units 达到明确技术终态后才能 FINAL。

### Task B Stage 2｜单 Assessment synthesis

负责：

> 一个 Assessment Group → 一个 provisional Assessment。

一个 Group 一个 independent logical task；多个 Group 可以并发，不 cross-Group packing；需要更多内容时仅在自身 task 内 Read-on-demand。

### Task C｜Thin Change Detection

Task C 只比较已经建立 identity 的产品对象：

```text
trusted object
vs
latest provisional object
→ semantic change meaning
```

logical comparison target 为一个 Assessment 或一条 Course-level Important Rule。

负责：

- NO_MEANINGFUL_CHANGE；
- NEW；
- CHANGED；
- CONFLICT；
- POSSIBLY_REMOVED；
- IDENTITY_UNCERTAIN。

不重新做 Source understanding、Task A、Stage 1 identity 或 Stage 2 synthesis。

Task C 通常 1–2 个有效语义轮，必要时最多约 2–3 个；需要关键证据时通过 Read-on-demand 请求相关 Evidence。仍无法确定时保留合法 uncertainty / conflict，不无限追。

### 最简职责边界

```text
Task A：一个 Source 内——“这里有哪些课程事实，怎么组织？”
Task B Stage 1：多个 Source 之间——“这些 Draft / Rules 彼此是什么关系？”
Task B Stage 2：一个 Group 内——“这个 Assessment 的完整 provisional state 是什么？”
Task C：latest provisional vs trusted——“这个对象发生了什么有意义变化？”
```

---

## 7.3 Read-on-demand Context Contract

AI 默认先使用 Local 已有的 structured working data 与 deterministic structure，不默认 full dump 原始 Source。

允许请求：

- Source object / metadata；
- specific Locator / range；
- Evidence；
- authorized mechanical search result。

```text
AI → CONTINUE + requestedReads
Local → mechanical resolve / return
AI → continue same logical task
```

Local 不生成 semantic summary，也不根据“重要性”筛选请求。

Task A、Stage 1、Stage 2、Task C 都可以在各自 logical task 内使用这一机制，但不得借此跨越各自 semantic responsibility。

---

## 7.4 Provenance / Traceability

所有有产品意义的语义结果必须保留可回到原始 Evidence 的引用链。

```text
Assessment / Important Rule / Change
→ Stage result / Group / Draft
→ Evidence
→ Source
→ Locator
→ original content / captured excerpt
```

Task C 的 Change 需要同时保留 Current 与 Latest 两侧 Evidence chain，使 Change Review 可以解释旧值与新值各自来源。

Local 只负责引用完整性与 lookup，不负责建立或修补 semantic support relationship。

---

## 7.5 Local / AI / User 边界

### Local｜执行已定义的 deterministic rules

Local 可以负责：

- Blackboard native ID / metadata read；
- deterministic parse / native structure；
- storage / persistence；
- Locator；
- exact machine equality / exact duplicate；
- state machine / explicit workflow routing；
- scheduling / concurrency（仅依据 Technical Design 明确写好的 deterministic rule）；
- retry / recovery / checkpoint；
- schema / reference validation；
- Evidence / Source / Locator lookup；
- technical status / coverage accounting；
- trusted-state protection。

Local 不得：

- Same / Different / Uncertain；
- semantic grouping / relevance；
- title / filename / string similarity identity inference；
- decide conflict truth；
- assign Requirement to Assessment；
- decide semantic completeness；
- judge importance；
- decide Source absence means removal；
- 自主决定动态 semantic batching / prioritization。

### AI｜课程语义判断

AI 负责：

- Task A Source-level semantic organization；
- field / requirement / date / constraint ownership；
- Stage 1 Same / Different / Uncertain；
- Assessment / rule cross-Source aggregation；
- Registry semantic maintenance；
- Stage 2 Assessment synthesis；
- Conflict / uncertainty；
- 是否需要 requestedReads；
- Task C meaningful change / Possibly Removed semantic judgment。

### User｜trusted-state final decision

用户继续负责真正需要最终裁决的 Review / correction：

- Initial Review；
- Edit / Exclude / Split / Same assessment as…；
- Conflict / Identity Uncertain；
- Change acceptance / Keep Current；
- Possibly Removed Remove / Keep；
- Rebuild Use / Keep。

AI 不直接把 provisional semantic result 写入 trusted Current Course State。

---

## 7.6 Workflow-scoped provisional state isolation

同一 Local Course Data Layer 可以复用 raw Source / Evidence 数据，但 provisional semantic state 必须按 workflow 隔离：

```text
Local Course Data Layer
├─ reusable Source / raw / Evidence data
├─ trusted Current Course State
└─ workflow-scoped provisional state
   ├─ Initial Scan staging
   ├─ Check staging
   └─ Rebuild staging
```

只有既有合法 adoption path 可以修改 trusted Current Course State：

- Initial Review Confirm；
- Change Review accepted decisions；
- Rebuild → Use rebuilt course。

Rebuild Preview、failure、Partial / Unresolved、未审核 semantic result 均不得覆盖 trusted state。


# 8. Acceptance & Evaluation

## 8.1 AI Evaluation / Regression

v0.3.0 沿用现有 AI Evaluation / Regression 框架，不新增独立 benchmark 系统。

针对本版本架构变化至少覆盖：

### File Understanding / Local Index

- PDF / PPTX / DOCX / XLSX native structure 与 visual completion；
- Source / Locator / Evidence 可追溯；
- Blackboard native identity / modified / resource identity 的机器变化检测；
- coverage failure 不被误解释为 semantic absence / removal。

### Task A

- one Source = one semantic logical task；
- 同一 Source 不同位置的信息正确形成 Assessment Draft；
- 一个 Source 可以合法输出 0..N Draft / 0..N Rule Candidate；
- 不把不同 Assessment 误聚；
- `CONTINUE + requestedReads` 能在同一 logical task 内继续；
- Evidence / provenance 正确；
- technical failure 不被当成 0 Draft。

### Task B Stage 1

- aliases across Sources → Same；
- similar names but different assessments → Different；
- insufficient evidence → Uncertain；
- Progressive Global Registry 可以 assign / merge / split / reassign；
- 每个 Draft 有显式 disposition，无 silent disappearance；
- Course-level Rule Candidates 正确聚合成 Important Rules；
- Task A partial completion 可以 pipeline overlap，但 Stage 1 不提前 FINAL；
- bounded semantic rounds 与 technical retry 分离；
- provenance preserved。

### Task B Stage 2

- one Group = one independent synthesis task；
- 不 cross-Group packing；
- Group 间可并发；
- Read-on-demand 只服务当前 Group；
- Conflict / Uncertain / Not Mentioned 可以合法 FINAL；
- per-Group checkpoint / recovery；
- provenance preserved。

### Task C

- object-level comparison；
- New / Changed / Conflict / Possibly Removed / Identity Uncertain / No Meaningful Change；
- 不重新执行 Task A / Stage 1 / Stage 2；
- coverage failure 不误判 removal；
- bounded semantic rounds；
- trusted Current Course State safety。


## 8.2 性能 / 成本 / Review 量化对比

以 v0.2.0 真实运行结果作为 baseline，对比：

- end-to-end runtime；
- AI invocation count；
- input / output token usage；
- API cost；
- retry / recovery；
- consolidation / expansion；
- Assessment object 数量；
- duplicate / fragmentation；
- Review 对象数量与机械 Review 负担。

不在 Product Planning 阶段拍脑袋设定绝对分钟数、绝对成本、固定 batch size 或绝对 token 上限。

未经验证的 production fixed timeout / memory / concurrency / page / token cap 不得被当作 Provider hard limit。与此同时，本 PRD 已明确锁定 Stage 1 / Stage 2 / Task C 的**有效语义轮次边界**，其目的在于避免对同一 semantic question 无限追逐；technical retry 与 semantic rounds 必须分别计数。

验收重点是：

> **新架构必须在不牺牲覆盖率、语义质量和安全边界的前提下，相对 v0.2.0 明显减少重复处理与 Review 噪音。**

---

## 8.3 Real-course E2E Acceptance

最终真实验收至少覆盖：

1. 当前大课程的新 clean workflow，不恢复旧失败流程、不借用旧 Task A cache 缩短性能；
2. 一门此前没有 workflow / cache / checkpoint 的普通多 Source 类型新课程 cold-start。

两者分别记录 runtime、coverage、concurrency、failure、Activity、invocation ledger、token / cost 与 Review burden。

主链路至少覆盖：

```text
Discovery
→ Fetch / deterministic parse / Local Index
→ Task A + Read-on-demand
→ Task B Stage 1 Progressive Global Registry
→ Task B Stage 2 per Assessment Group
→ Review
→ trusted Current Course State
```

增量维护 targeted verification 至少覆盖：

```text
Blackboard native machine change detection
→ affected Source Task A
→ Task B Stage 1 / Stage 2
→ Task C
→ Change Review
```

Rebuild targeted verification 至少覆盖：

```text
Full Rebuild
→ A
→ B Stage 1 / Stage 2
→ Rebuilt Preview
→ Use / Keep
```

真实验收重点：

- file / Source-level Task A；
- Read-on-demand；
- successful-unit reuse / failed-unit recovery；
- Stage 1 identity / Progressive Registry / Important Rules；
- Stage 2 per-Assessment synthesis 与 parallel independent recovery；
- bounded semantic rounds / technical retry separation；
- no silent Draft disappearance；
- full provenance chain；
- Task C thin comparison；
- AI Activity；
- runtime / invocation / token / cost 改善；
- Assessment fragmentation / Review burden 改善；
- trusted-state safety。

不要求 Initial Scan、Rebuild、Opportunity Check、Manual Check 四条入口分别重复跑一整门昂贵 E2E；主链路做完整真实验证，其他入口做 targeted verification，证明复用了同一底层能力。

最终形成 v0.2.0 → v0.3.0 运行对比。


## 8.4 Safety / State Invariants

以下为硬验收边界：

- Partial / Failed 不得伪装成 Complete；
- failure 不得清空 trusted Current Course State；
- provisional preview 不得覆盖 trusted Current Course State；
- coverage 不完整不得解释为 Source / Assessment 已删除；
- 真实语义变化不得绕过既有 Review / 用户决策路径；
- Evidence / Source provenance 不得丢失；
- 本地启发式不得替代 AI 语义判断；
- AI Activity 不得被当成正式课程事实、Evidence 或 Review 结果；
- Rebuild 未被用户采用前不得改变 trusted Current Course State；
- 成功处理结果应复用，少量失败不得触发整门课程重跑。

---


## 8.5 Failure / Recovery 与付费 Retry

恢复策略采用 bounded recovery，不追求通过无止尽 Retry 换取理论 100% completion。

### 8.5.1 Technical recovery

- successful logical task / checkpoint 必须复用；
- failed / interrupted 且可安全重新派发的 logical task 才进入 recovery；
- `paid-unverified` / dispatch 是否已执行或计费不明确的 item 不自动重派，避免 duplicate paid invocation；
- zero-cost deterministic repair / checkpoint recovery 不计作 semantic round；
- technical retry / recovery 与 semantic rounds 独立记账。

### 8.5.2 Recovery 结束后的行为

仍失败的 Source / Group / comparison target：

- 明确保留 `Unresolved / Partial / Failed` technical state；
- 保留 identity / coverage / provenance / failure evidence；
- 不伪装 semantic Complete；
- 不阻塞其他 independently successful results 继续进入合法下游；
- 不得据此推断 removal；
- 后续 Manual Check / Rebuild / explicit Retry 可以重新尝试。

### 8.5.3 Zero-cost deterministic repair

允许自动执行本地 state / checkpoint 恢复、successful result reuse、唯一机械映射下的 schema normalization、非 AI Fetch / parse / render recovery，以及 Provider 明确证明 generation 未执行并给出 safe-retry signal 的情况。

只要修复需要解释课程意义、选择语义值或改变 semantic payload，就不再属于 Local deterministic repair。

### 8.5.4 Ownership / duplicate-paid safety

继续保留 execution-session / owner token / startup reconciliation、stale writer protection、ambiguous paid dispatch 不自动重派、verified success 不重新付费等安全规则。具体常量与实现由 Technical Design 固化。


# 9. 文档与开发治理约束

## 9.1 v0.3.0 Core Product Archives

根据当前 Documentation Governance，v0.3.0 固定维护三份 Core Product Archives：

1. `PRD_v0.3.0.md`；
2. `VERSION_RECORD_v0.3.0.md`；
3. `Interaction_and_Information_Architecture_Spec_v0.3.0.md`。

不创建独立 `AI_DESIGN_v0.3.0.md`。

README 按独立生命周期管理，版本关闭时冻结 `README_v0.3.0.md`。

## 9.2 开发中 Product Owner Direction

正式开发开始后，如果 Product Owner 临时追加、纠正、覆盖或细化产品 / 交互 / 视觉方向：

- 不为每一次调整创建独立文档；
- 如确有需要，统一记录到本版本 `DIRECTION_ADJUSTMENTS_v0.3.0.md`；
- 最终有效规则仍应回填到对应正式事实源；
- Direction Adjustments 是历史 / provenance 记录，不替代 PRD / Interaction & IA / Version Record。

如果开发期间没有新的 Product Owner Direction，不需要创建该文档。

## 9.3 协作验证

v0.3.0 开发可顺带验证 Google Drive 作为 ChatGPT ↔ Codex Shared Working State 的协作模式，但：

- 该实验不属于产品 Scope；
- 不为此新增重复产品文档；
- 使用现有长期 Handoff 文件；
- Local Git 继续是代码与工程事实权威；
- Google Drive 用于共享工作状态与产品侧协作。

---

# 10. 版本完成判断

v0.3.0 可视为达到产品目标，当且仅当：

1. 真实课程文件读取完整性明显提升，native structure 与必要 visual information 进入统一 Evidence / provenance 链路；
2. Blackboard native identity / modified / resource identity 能成为主要机器变化检测依据，missing / technical failure 不被误解释为 removal；
3. Task A 以一个 Source 为 semantic logical task，通过 Read-on-demand 避免默认 full dump，并支持独立 checkpoint / recovery；
4. Task B Stage 1 的 Progressive Global Registry 能稳定完成跨 Source Same / Different / Uncertain、Assessment Groups 与 Important Rules；
5. Task B Stage 2 能以一个 Group 一个独立 task 形成完整 provisional Assessment，并支持并行、独立恢复和合法 uncertainty；
6. Stage 1 / Stage 2 / Task C 的 bounded semantic rounds 与 technical retry 分离，不能再次通过无限 semantic retry 追求 closure；
7. Task C 保持 object-level thin comparison，不重新执行 Task A / B；
8. Assessment / Important Rule / Change 的结果都能追溯到 Evidence → Source → Locator → original content / captured excerpt；
9. Local 只执行已定义 deterministic rules，不以 heuristic 或开放式“根据情况判断”替代 AI semantic judgment；
10. Review 的产品逻辑保持稳定，但因上游 AI Organization 改善而显著减少机械负担；
11. Initial Scan / Rebuild / Check 等链路共享同一优化后的底层能力，并保持 workflow-scoped provisional state isolation；
12. Failure / Recovery、trusted-state safety 与 Possibly Removed coverage rules 不发生回归；
13. Task A / B / C 在长时间运行时均有真实、持续的 AI Activity；
14. 整体 UI / Interaction / Motion 在不推倒重做的前提下完成系统级提升；
15. AI Evaluation / Regression、真实课程 E2E 与 v0.2 → v0.3 性能成本对比全部形成可验证证据。

# 版本一句话总结

> **Syllab v0.3.0 的目标不是增加更多功能，而是把已经成立的课程信息闭环做得更完整、更高效、更准确、更透明，并让整个产品在视觉与交互上真正成熟起来。**

### P2E-056 Rebuild 的认可范围与用户值保护（2026-10-12）

新 Typed Proposition 工作流的 Use rebuilt course 采用完整重建候选，但不能代替各业务范围的 Human Review，尤其不能自动认可独立争议、身份疑问和高风险要求。界面须明确说明采用后仍需 scoped Review。原 user-edited 值必须保留；重建提出替代值时进入独立 Conflict，未作该决定不得覆盖用户值。旧工作流按原版本恢复，不追溯改写正式 trusted。此项落实 P2E-056 §2.3–4 的显示/认可范围与 Rebuild 用户值保护约束。

### P2E-058 定向收口要求（2026-10-13）

当前任务身份必须由原文证明实际布置；教学标题/方法建议不能独立晋升，缺日期/权重也不能排除真正的新任务。Issue必须比较同对象、范围、尺度、时间类型、适用版本和行动影响；不由platform配置或duration算术派生学生冲突。Scheme是总览关系，真正考核平级可见，权重/时间/交付优先于长清单。继续冻结付费和审核架构扩张，保留Evidence及Human trusted门槛。P058仅授权最小定向整改和未核验预览，四项目标不因工程检查通过而完成；当前实际偏差见 `PRODUCT_P0_REMEDIATION_v0.3.0.md`。


### P060 已批准的集中 IA 收口（2026-10-14）

沿用一个 Assessment 一套卡片，Summary → Organized Details → Evidence。桌面同行外框等高，窄屏单列；标题、权重、可识别的提交截止和风险提示固定可见，附加摘要独立纵向滚动，详情入口固定。内部滚动只是溢出兜底，不增加 Fact 配额；摘要排除次级正文/完整表/技术配置。QA 未核验状态在全局持续提示，真实单项未决保持可见。详情使用已有 group/parent/relation，不以文本相似度合并独立义务；力度与条件附着动作，完整父句/时间表/Rubric/Evidence 按需可达。打印解除高度/overflow 并打开当前页既有 disclosures，完成后恢复。

以上授权来自 P2E-060；不授权修改模型旧答案、当前考核身份或配置冲突判定。实现与剩余问题见 [集中整改报告](CONSOLIDATED_REMEDIATION_AND_PREVIEW_v0.3.0.md)。


### P061 正式产品决策（2026-10-17）

Human 已批准在单卡 IA 中改善视觉信息层级：Primary 为名称、显著课程 Weight、已确定且区分事件类型的日期；Secondary 为模式/时长/交付责任；Tertiary 为原文、完整表、Rubric/Evidence。等级由位置、字重、字号和留白表达，不降低正文对比、不加装饰。未确定时间只在主卡明确提示核实，原值与竞争值留在同一详情，不能伪装确定。等高/内滚/窄屏单列保留。

批准轻量 Print summary / Print full details 两种用途：同一课程/信任版本，Summary 为高价值摘要与提交/处罚及未决规则提示，明确全文回看路径；Full 为全部事实、独立要求、条件、评分与来源定位。打印解除高度/overflow，完成后恢复，不新建Export pipeline或第二套持久视图。未解决语义和真实验收不因视觉改善通过。四组17项来源审阅建议尚待Human批准，禁止新增付费。详见本轮集中报告。


### P063 最终收口（2026-11-02）

P2E-063正式授权17项来源解释进入隔离候选/生产Review；11项明确修正、4项组织及诚实Pending、2项冲突/缺口保留。不把产品授权当trusted Confirm或Gate5 PASS。原始raw/Clause/来源决策表不可改。Literature Review身份待审从核心卡移出；后台配置为背景，分开时长/slot，保留条件与力度。


## P2E-064｜RC2 Typography收尾（2026-11-02）

保留P063的17项候选修正、四卡布局、内部滚动/焦点返回、Review及双打印。按Owner最终明确指示，大字和标题使用原课程标题的Fraunces衬线体，正文/标签/按钮保留既有无衬线；考核标题20px/550（原23px/600），权重桌面36px/500（原42px/600）、窄屏34px/500；日期17px/500（原19px/600），课程名21px/500同字体。字体复用既有资产，无下载；仅CSS，未改DOM/行为/候选数据。打印权重30px，长段维持Regular。

疑似裁切：1280/380新开及字体加载后scrollTop=0，Presentation dates首行完整；650高窗口主动滚到行中可复现半行，返回保留位置，Home恢复起点。未证明默认裁切或内容缺失，未强制重置滚动。对照、测试、恢复点见 `RC2_TYPOGRAPHY_REFINEMENT_v0.3.0.md`。同一RC2原位更新，非RC3；Human Gate5待验收，不发布。
