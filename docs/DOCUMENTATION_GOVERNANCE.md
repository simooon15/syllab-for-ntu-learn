# Syllab 文档治理

本文档是 Syllab 文档受众、语言、版本归档与 README 生命周期的长期规则。

## 1. 核心原则

语言规则按文档受众分类，而不是按文件格式统一处理。

- **Human-facing Product Documents** 优先保证 Product Owner 的阅读流畅性。
- **Machine / Engineering-facing Documents** 优先保证精确性、可解析性和与代码 / API 的一致性。
- **README** 按公开项目入口的独立规则管理，不机械套用飞书核心产品文档的语言要求。
- Git repository 保存完整项目事实；飞书保存简洁、面向 Product Owner 的长期产品知识。

## 2. Human-facing Product Documents

Core Product Archives 按版本演进：

- **v0.2.0：** PRD、Version Record、Interaction & Information Architecture / Page Design、AI Design 四份；历史 `AI_DESIGN_v0.2.0.md` 继续作为该版本 AI 行为与策略的权威事实源。
- **从 v0.3.0 开始：** 固定为 PRD、Version Record、Interaction & Information Architecture / Page Design 三份。AI 产品行为、AI Processing、Prompt / Context 产品级策略、评估要求与限制默认并入 PRD，不再要求独立 AI Design。
- **v0.1.0：** 保留既有历史文档结构；原 `PRODUCT_HANDOFF_v0.1.0.md` 仅治理性改名为 `VERSION_RECORD_v0.1.0.md`，不重写当时的产品事实。

这些 Human-facing Product Documents 的正文必须以自然、完整的中文为主。产品逻辑、设计解释、决策说明和行为说明优先使用中文。以下内容可保留原文：

- 已锁定的产品术语，例如 Current Course State、Assessment、Course Brief、Task A / Task B / Task C、Same / Different / Uncertain、Local-first + BYOK；
- 文件名、代码、API、配置字段、模型参数、状态枚举和用户界面原文；
- 必须保真的 Prompt、JSON schema 或其他 machine-readable contract。

不应出现大段英文说明只夹少量中文、一句话频繁切换语言，或机械的中英双语重复。

## 3. Machine / Engineering-facing Documents

Machine-readable specs、structured contracts、implementation notes、technical schemas、automated test documentation、Agent instructions、scripts/config documentation 以及 Technical Design 的底层实现部分，不要为语言统一做低价值翻译。

英文能够提高机器理解稳定性、减少术语歧义、提高 token / parsing 效率或与代码 / API 保持一致时，允许使用英文。

Decision Log、Engineering Report、Technical Design、Final Acceptance 和 Final Closure 中明显面向 Product Owner 的段落优先中文；工程密集部分可保留英文。不为语言清理破坏历史记录。

## 4. README 生命周期

Repository root 的 `README.md` 始终代表最新正式版本的项目入口。每个版本发布时，必须将该版本最终 README 原样冻结为 `docs/versions/vX.Y.Z/README_vX.Y.Z.md`。

- **ROOT README = latest/current project entry**；
- **VERSION README SNAPSHOT = immutable historical snapshot**；
- 新版本更新 root README 并新建对应 snapshot；
- 已发布版本的 README snapshot 永不覆盖、不删除。

README 不属于 Core Product Archives。其语言根据公开读者和实际使用场景决定，但必须清晰、一致，并避免无意义中英夹杂。README 的公开内容和截图规则另见 [`rules/public-readme-and-screenshots.md`](rules/public-readme-and-screenshots.md)。

## 5. 归档与事实归属

继续执行 **ONE FACT → ONE AUTHORITATIVE HOME**。从 v0.3.0 开始：PRD 承担产品要求、边界以及 AI 产品行为 / AI Processing 的产品级事实；Version Record 承担该版本最终实际交付、偏差、验证、风险、Carry Over 与最终状态；Interaction & Information Architecture / Page Design 承担用户可见结构与交互。v0.2.0 的独立 AI Design 仍按历史规则保留。README 是公开入口与独立历史快照。Decision Log、Engineering Report、QA / Release 记录和其他工程资料主要留在 Git repository。

版本目录、飞书节点和历史保留的详细规则见 [`rules/product-version-archives.md`](rules/product-version-archives.md)。

## 6. Plain-text 文件格式

Markdown、纯文本、JSON、配置等非 Google-native 文本文件默认使用 **UTF-8 无 BOM + LF**。除非某个工具链有明确兼容要求，不保留孤立的 BOM / CRLF 历史格式。格式规范化与语义修改同时发生时，Handoff / change summary 必须注明格式变化，避免把 line-ending diff 误判为大规模正文重写。
