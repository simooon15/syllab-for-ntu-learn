# Syllab — Important Rules Product Alignment Handoff — v0.1.0

> 产品版本：v0.1.0  
> 日期：2026-09-17  
> 类型：窄范围、非阻塞 Product Alignment Delta  
> 主题：Course-level Important Rules 的 Grade Impact 收录边界

## 1. 本轮结论

MVP 的 `Important Rules` 继续作为 Course Brief 的正式类别，但它不是“所有重要政策”的收集区。

正式收录门槛：

> **只有 course-level rule 在违反后会直接影响成绩，或通过很短、很明确的因果链影响 assessment validity、grading eligibility、marks，或有成绩要求的课程义务时，才进入 MVP Important Rules。**

如果一条规则和成绩之间的关系很远、需要推测，或必须经过独立纪律 / 政策流程才可能产生学业后果，则不进入 MVP Important Rules。

### 实例 A

> “All written assignments must be submitted via Turnitin/NTULearn.”

**结论：Include。**

原因：这是 course-level submission channel rule。未按要求提交会较直接影响 submission validity / 是否能正常计分。

### 实例 B

> “All course materials are for students’ own educational purposes only ... photographing, filming, audio recording ... is not permitted.”

**结论：Exclude by default。**

原因：这是版权、材料传播和课堂录制政策。文本本身没有把违反规则与 marks、grading eligibility 或 assessment validity 直接连接。不能因为“理论上可能被处分”而推导成 Important Rule。

如果某个具体来源明确写明违反此类规则会直接扣分、判零分、使提交无效或失去某项 assessment eligibility，则按实际 grade impact 重新判断。

## 2. 与已有规则的关系

已有产品决定保持不变：

- Assessment-specific Rule 继续进入对应 Assessment；
- 只有 course-level Rule 才可能进入独立 Important Rules；
- 本轮不重新讨论、不改写 D-014；
- 不增加新的 Course Brief section；
- 不改 Review flow；
- 不改 Candidate kind；
- 不改 UI / IA。

本轮新增决定应记录为：

> `D-015｜MVP Course-level Important Rules 使用 Grade Impact Gate`

## 3. Inclusion Criteria

一个 course-level rule 至少满足以下一项，才进入 Important Rules：

1. 明确影响 marks / score / grade；
2. 明确影响 assessment 是否被接受、是否有效、是否计分；
3. 明确影响学生是否有资格参加、完成或获得某项计分要求；
4. 明确规定 course-wide submission requirement，违反后会较直接导致提交无效、无法正常评分或产生明确成绩后果；
5. 明确规定 course-wide late penalty、attendance-related grading consequence、academic-integrity grading consequence 或同类成绩规则。

“较近的间接影响”要求因果链短而清楚，不能依赖模型自行补全中间后果。

## 4. Exclusion Criteria

默认不进入 Important Rules：

- 通用版权声明；
- 课程材料不得复制、传播、转载的政策；
- 课堂拍照 / 录像 / 录音限制；
- 通用隐私规则；
- 通用校园行为规则；
- 一般 acceptable-use / conduct policy；
- 只有“应该 / 建议 / 期望”但没有成绩后果的行为要求；
- 与成绩的关系需要很远推理、纪律处分或其他独立流程才能成立的政策性 boilerplate；
- 普通知识内容、教学建议、课程内容陈述。

不能仅因为文本使用 `must`、`required`、`prohibited`、`mandatory` 等强词，就自动把它归为 Important Rule。

## 5. 边界案例

- `Attendance is mandatory.` → **默认 exclude**，除非来源明确说明成绩 / participation marks / assessment eligibility 后果。
- `Attendance contributes 10% to the final grade.` → **include**。
- `Students below 80% attendance cannot sit the final presentation.` → **include**，因 grading eligibility 链路明确且很近。
- `Assignments with similarity index >=25% may be marked zero.` → **include**；若只适用于一个具体 Assessment，则按 D-014 进入该 Assessment。
- `GAI use must be declared for CA1.` → **Assessment-specific**，进入 CA1，不进入独立 Important Rules。
- `Students must install Respondus LockDown Browser for CA2.` → **Assessment-specific**，进入 CA2，不进入独立 Important Rules。
- `Course materials may not be redistributed.` → **exclude**，除非文本明确给出成绩后果。

## 6. 执行层职责

### AI Extraction Prompt — 主执行层

Prompt 是这个语义边界的主要执行位置。

只允许 DeepSeek 输出满足 Grade Impact Gate 的 course-level Important Rule。Prompt 必须明确：

- 不要因为规则看起来“严肃”或“重要”就输出；
- 不要推测远距离纪律后果；
- assessment-specific rule 不作为独立 Important Rule；
- policy boilerplate 默认排除；
- A 类例子 include；B 类例子 exclude。

### Prompt Evaluation — 回归门禁

至少固定以下 6 类 fixture：

1. Course-wide Turnitin / submission channel + submission validity → include；
2. Course-wide late penalty → include；
3. Attendance 明确关联 marks / eligibility → include；
4. Attendance 只有 mandatory / expected，没有 grade consequence → exclude；
5. Copyright / redistribution / recording boilerplate → exclude；
6. 明确 zero-mark / grade penalty rule → include。

### Local deterministic layer — 只做结构门禁

MVP **不新增广泛关键词黑名单或通用语义规则引擎**。

本地 deterministic validation 继续负责：

- schema；
- evidenceRefs；
- source / relation validity；
- assessment-specific vs course-level 的结构关系；
- 其他已有确定性校验。

不要用 `copyright`、`recording`、`mandatory`、`must` 等单词做粗暴 hard filter，因为可能误杀真正有 grade impact 的规则。

如果后续真实 evaluation 证明某一段固定 boilerplate 持续漏出，再单独增加高精度 deterministic safeguard；本轮不提前建设通用 policy classifier。

### Review — 最终纠错层

Review 保持现状。偶发误提取仍可由用户 Ignore / Edit。

Review 不是主要过滤器，不能把“先把所有政策都扔进 Review”作为解决方案。

## 7. 本轮正式文档 Delta

只修改：

1. `01_Syllab_PRD_v0.1.0.md`
2. `05_Product_Decision_Log_v0.1.0.md`
3. `07_Technical_Design_v0.1.0.md`
4. `08_Implementation_Plan_v0.1.0.md`

新增：

5. `12_PRODUCT_ALIGNMENT_HANDOFF_v0.1.0.md`
6. `13_CHANGE_MANIFEST_v0.1.0.md`
7. `14_apply_product_alignment_delta_v0.1.0.py`

不修改：

- `04_Spike_Report_v0.1.0.md`
- `06_MVP_Interaction_IA_Spec_v0.1.0.md`
- `09_Product_Review_Summary_v0.1.0.md`
- `10_CODING_HANDOFF_README_v0.1.0.md`
- `11_CODING_START_PROMPT_v0.1.0.md`
- Candidate schema / Brief schema
- UI / IA
- Review flow
- D-014

## 8. 给 Codex 的执行方式

这不是新的开发 Gate，也不要求暂停当前 Formal MVP Coding。

收到本包后：

1. 不要重新阅读和 diff 全部正式文档；
2. 阅读 `13_CHANGE_MANIFEST_v0.1.0.md`；
3. 在项目根目录运行：

```bash
python 14_apply_product_alignment_delta_v0.1.0.py .
```

4. 脚本成功后，继续当前 Coding phase；不要从 Phase 1 重启；
5. 如果当前还没有进入 AI extraction，只同步文档，等 Phase 7 时按 D-015 实现；
6. 如果 AI extraction 已经实现，则只修改当前 extraction prompt 的 Important Rule 部分和对应 evaluation/tests；不要重写整个 Prompt、schema 或 pipeline；
7. 不为本决定新增 UI、数据库字段、Provider、模型、Router 或独立 policy classifier；
8. 只有脚本报告必需 anchor 找不到，或该决定与当前实现产生真正 Product-impacting Technical Conflict 时，才停下来交回产品侧。

## 9. Coding 行为要求

实现 D-015 时：

- Provider 仍是 DeepSeek；
- Model 仍是 `deepseek-flash`；
- JSON mode 不变；
- 一次请求仍只包含一个 source 内的 normalized units；
- 跨来源去重 / conflict merge 仍由本地 Candidate Merger 负责；
- AI 仍只提出 Candidate，不能直接写 Course Brief；
- Assessment-specific Rule 的已有处理方式不变；
- 本轮只收紧 course-level Important Rule 的语义边界。

