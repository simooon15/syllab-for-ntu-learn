# Documentation language rules

Syllab 的正式项目文档以中文为主体语言。本规则适用于当前版本与后续版本的正式 Product、
Design、Decision、Engineering、Acceptance 与 Closure 文档。

- 产品说明、设计逻辑、决策解释、验收说明等正文原则上使用中文。
- 必要的固定英文术语保留 English。
- 文件名、代码、API、配置字段、状态枚举、命令保持原始写法。
- 不大面积中英夹杂，不机械地重复中英双语段落。
- 固定产品术语在同一版本及跨版本文档中保持一致。

可保留的固定术语包括 Current Course State、Assessment、Course Brief、Task A / Task B / Task C、
Same / Different / Uncertain、Local-first + BYOK、DeepSeek、JSON mode、`reasoning_effort`、
`max_tokens`、invocation fingerprint 与 stale-worker guard。

推荐写法：“Task A 负责从单一 Source 中提取结构化候选事实。”
不推荐写法：“Task A is responsible for extracting structured candidate facts，用于后续 processing。”

历史文档保留其原始语言与上下文，不为满足本规则而进行破坏性重写。
