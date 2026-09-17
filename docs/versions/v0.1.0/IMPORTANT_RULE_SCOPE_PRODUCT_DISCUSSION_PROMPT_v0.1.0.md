# Syllab v0.1.0 · Important Rule Scope Product Discussion Prompt

> **HISTORICAL PROMPT · DO NOT USE AS CURRENT INSTRUCTION**
> This prompt was written while Formal MVP Coding was still in progress. v0.1.0 is now implemented and Gate D has passed. D-015 remains the accepted baseline; the unresolved post-v0.1.0 category question is now framed in `product-design-review-input-post-v0.1.0.md`.

我们正在完成 Syllab for NTU Learn v0.1.0 Formal MVP。

当前已确认：

- Important Rules 是 MVP Course Brief 的正式类别；
- Assessment-specific Rule 归入对应 Assessment；
- course-level Rule 才进入独立 Important Rules；
- 当前开发先继续跑通 MVP 闭环，不要因为本讨论暂停 Coding。

现在需要做一次窄范围产品判断：什么样的 course-level rule 值得进入 MVP Course Brief？

真实扫描中出现两类例子：

### A

> All written assignments must be submitted via Turnitin/NTULearn.

### B

> All course materials are for students’ own educational purposes only and shall not be uploaded, reproduced, distributed, republished, or transmitted without the University’s written approval; photographing, filming, audio recording, or otherwise capturing content during lectures and/or tutorials is not permitted.

现有 PRD 的 Important Rules 包括：

- Word Limit
- Group Size
- Submission Format
- Submission Channel
- Late Penalty
- Attendance Requirement
- 其他明显影响学生行动的高影响规则

需要判断：

1. A、B 分别是否属于 MVP Important Rules；
2. 如何区分“对完成课程 / Assessment 有直接行动价值的规则”和“通用版权、材料传播、隐私、校园行为或政策性 boilerplate”；
3. 是否应建立明确的 inclusion / exclusion criteria；
4. 边界规则应在 AI Prompt、本地 deterministic filter、Review，还是多层共同执行；
5. 如何避免 Important Rules 变成政策垃圾桶，同时不漏掉真正高影响的课程要求。

请不要重新讨论整个 PRD、Review、Course Brief 或 D-014，也不要扩大 MVP。

请输出：

A. 对两个实例的明确结论；  
B. 推荐的正式产品定义；  
C. Inclusion criteria；  
D. Exclusion criteria；  
E. 边界案例与处理方式；  
F. 对 PRD / Decision Log / IA / Technical Design / Coding Handoff 的最小文档 delta；  
G. 一份可直接交给 Codex 的窄范围 Product Alignment Handoff。

在产品讨论期间，Coding 继续按现有规则完成 MVP 闭环；新结论只在正式回包后进入实现。
