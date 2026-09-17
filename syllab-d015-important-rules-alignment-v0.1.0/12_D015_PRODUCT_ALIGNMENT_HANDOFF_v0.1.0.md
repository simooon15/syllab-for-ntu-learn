# Syllab — D-015 Product Alignment Handoff — v0.1.0

> **HISTORICAL PRODUCT ALIGNMENT INPUT · SUPERSEDED**
> D-015 已进入 v0.1.0 正式基线，v0.1.0 已 Gate D PASS。保留本文作为当时对齐证据，不按其启动新一轮实现。

> 产品版本：v0.1.0
> 范围：MVP `course-level Important Rules` 收录边界
> 性质：窄范围产品对齐；不重开 PRD / IA / Review / Course Brief / D-014；不扩大 MVP
> 开发状态：现有 MVP Coding 继续；D-015 只进入当前 AI Extraction 的相关路径

## 1. 实例结论

### A — Include

> All written assignments must be submitted via Turnitin/NTULearn.

这是 course-level mandatory submission channel。它直接约束有效提交方式，与 Assessment 是否被正常接收 / 计分存在很短、明确的因果链，因此属于 MVP Important Rules。

### B — Exclude by default

> All course materials are for students’ own educational purposes only ... photographing, filming, audio recording ... is not permitted.

这是通用 copyright / redistribution / recording policy。若当前课程文本没有明确说明违反后会直接或较近地影响 marks、grading eligibility、assessment validity 或 assessed course requirement，则不进入 MVP Important Rules。

不得因为“理论上可能触发纪律处分，最后可能影响学业”而纳入；这属于远距离、推测性的影响链。

## 2. 正式产品定义

MVP Important Rules 只收录：

> **违反后会直接，或通过很短且明确的因果链，影响 marks、grading、assessment validity、assessment eligibility，或有成绩要求的课程义务是否完成的 course-level rules。**

同时：

- Assessment-specific Rule 继续归入对应 Assessment；
- course-level Rule 才可能成为独立 Important Rule；
- “重要”“正式”“禁止”“学校政策”本身不是 inclusion reason；
- 不允许脑补远距离 disciplinary consequence → grade impact；
- Grade impact 可以是直接，也可以是较近的间接影响，但必须由来源文本及上下文支持。

## 3. Inclusion

包括但不限于：

- Late Penalty；
- 明确影响 marks 的 attendance threshold；
- 明确影响 assessment eligibility 的 attendance / prerequisite；
- mandatory course-wide Turnitin / NTULearn submission channel；
- 明确导致 submission invalid / not graded 的 course-level format / process requirement；
- 其他具有同等短且明确 grade-impact 链路的 course-level rule。

## 4. Exclusion

默认排除：

- 通用 copyright / intellectual property；
- 材料不得转载、传播、上传、再发布；
- 一般禁止拍照、录音、录像；
- 通用 privacy；
- campus conduct / acceptable-use policy；
- 普通 attendance expectation，但没有 grade consequence；
- 仅通过独立纪律流程、长期后果或多步推测才“可能”影响成绩的规则。

如果上述规则在当前课程文本中明确给出近距离成绩后果，则按实际 Grade-Impact 判断；若只针对某一个 Assessment，则归入对应 Assessment。

## 5. 边界案例

- “Students are expected to attend all tutorials.” → Exclude by default。
- “Attendance below 80% results in loss of participation marks.” → Include。
- “Attendance below 80% makes the student ineligible for the final presentation.” → Include。
- generic academic integrity policy / link → Exclude by default。
- “Unauthorized collaboration results in zero marks for Assignment 1.” → Include，但归入 Assignment 1。
- mandatory Turnitin / NTULearn submission channel → Include。
- generic recording / redistribution prohibition → Exclude unless current-course text gives a near grade consequence。

## 6. 多层执行责任

### AI Prompt

主语义判断层：

- 只提出符合 D-015 的 Important Rule；
- 禁止因规则语气严肃、正式或属于学校政策就提取；
- 禁止远距离 disciplinary → grade 推测；
- Assessment-specific Rule 绑定对应 Assessment；
- A 为正例，B 为反例。

### Local deterministic validator

保守 backstop：

- 只拦截没有 source-supported grade / assessment consequence 的明显 policy boilerplate；
- 不创建新 Candidate；
- 不独立推导远距离 grade impact；
- 不使用激进关键词 hard filter 造成漏检；
- 无法安全判定时，语义判断仍由 Prompt / Review 处理。

### Review

Review 是最终用户确认层，但不是政策垃圾回收层。明显不符合 D-015 的 boilerplate 应在进入 Review 前被挡住；真正存在近距离 grade impact 但事实仍有歧义的候选可以进入 Needs Review。

## 7. Evaluation 最小回归集

至少固定：

1. mandatory Turnitin / NTULearn submission channel → Include；
2. Late penalty → Include；
3. attendance 明确关联 participation marks / assessment eligibility → Include；
4. 普通 attendance expectation，无 grade consequence → Exclude；
5. copyright / redistribution / recording prohibition，无 grade consequence → Exclude；
6. general university conduct / privacy / acceptable-use policy，无 grade consequence → Exclude；
7. generic academic integrity policy link，无本课程具体成绩后果 → Exclude；
8. academic integrity rule 明确导致某 Assessment 0 marks → Include；Assessment-specific 时归入 Assessment。

## 8. 文档 delta

只修改：

- `01_Syllab_PRD_v0.1.0.md`
- `05_Product_Decision_Log_v0.1.0.md`
- `07_Technical_Design_v0.1.0.md`
- `08_Implementation_Plan_v0.1.0.md`

明确不修改：

- `04_Spike_Report_v0.1.0.md`
- `06_MVP_Interaction_IA_Spec_v0.1.0.md`
- `09_Product_Review_Summary_v0.1.0.md`
- `10_CODING_HANDOFF_README_v0.1.0.md`
- `11_CODING_START_PROMPT_v0.1.0.md`
- Candidate / Brief schema
- Review 主结构
- Course Brief 主结构
- Provider / Model
- D-014
- 其他 MVP scope

## 9. Coding delta

正式文档成功落地后，只修改当前 AI Extraction 的 D-015 路径：

1. extraction prompt；
2. 现有 product-boundary / local validator（若已有；不要为 D-015 新造复杂架构）；
3. D-015 evaluation / regression cases。

保持：

- DeepSeek；
- `deepseek-flash`；
- JSON mode；
- one-source normalized-unit batching；
- Candidate Merger；
- Review；
- Course Brief；
- 其他 D-014 已确认行为；

全部不变。

如果实现 D-015 需要改 schema、IA、Review 主结构、Course Brief 主结构或扩大 MVP，按 Product-impacting Technical Conflict 停止该冲突路径并回报。
