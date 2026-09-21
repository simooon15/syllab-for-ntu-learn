# Syllab 文档治理

本文档是 Syllab 文档受众、语言、版本归档与 README 生命周期的长期规则。

## 1. 核心原则

语言规则按文档受众分类，而不是按文件格式统一处理。

- **Human-facing Product Documents** 优先保证 Product Owner 的阅读流畅性。
- **Machine / Engineering-facing Documents** 优先保证精确性、可解析性和与代码 / API 的一致性。
- **README** 按公开项目入口的独立规则管理，不机械套用飞书核心产品文档的语言要求。
- Git repository 保存完整项目事实；飞书保存简洁、面向 Product Owner 的长期产品知识。

## 2. Human-facing Product Documents

每个版本在飞书的 Core Product Archives 固定为四份：

1. PRD；
2. Product Handoff；
3. Interaction & Information Architecture / Page Design；
4. AI Design。

这四份文档的正文必须以自然、完整的中文为主。产品逻辑、设计解释、决策说明和行为说明优先使用中文。以下内容可保留原文：

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

README 不属于飞书四份 Core Product Archives。其语言根据公开读者和实际使用场景决定，但必须清晰、一致，并避免无意义中英夹杂。README 的公开内容和截图规则另见 [`rules/public-readme-and-screenshots.md`](rules/public-readme-and-screenshots.md)。

## 5. 归档与事实归属

继续执行 **ONE FACT → ONE AUTHORITATIVE HOME**。四份 Core Product Archives 分别承担产品要求、交接状态、交互结构和 AI 设计。README 是公开入口与独立历史快照。Decision Log、Engineering Report、QA / Release 记录和其他工程资料主要留在 Git repository。

版本目录、飞书节点和历史保留的详细规则见 [`rules/product-version-archives.md`](rules/product-version-archives.md)。
