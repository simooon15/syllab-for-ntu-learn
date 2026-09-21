# ChatGPT → Codex 当前交接


Handoff ID: P2E-2026-09-22-001
Updated At: 2026-09-22
From: ChatGPT Web / Product Side
To: Codex / Engineering Side
Current Stage: Collaboration Workflow Consolidation
Status: READY
Source Git HEAD: 请在开始工作时读取并记录当前 main HEAD


## 本轮发生了什么


产品侧已经完成新的跨智能体协作模式设计。


本轮最重要的变化不是产品功能，而是协作方式：


1. Google Drive 作为 Shared Working State / Shared Project Mirror；
2. Google Drive for desktop 提供本地挂载目录；
3. Drive 与 canonical local repo 通过本地文件系统完成同步；
4. 优先使用 rsync 或等价系统工具，不开发新的专用 sync tool；
5. 文件同步与模型阅读彻底分离；
6. 逻辑上可以每次对齐整个项目树，物理上只需要复制差异文件；
7. 项目尽可能完整同步，但排除 secret、credential、session、private raw data、.git/、node_modules/ 和纯缓存/临时状态；
8. Handoff 改为两个长期文件，不再每轮创建新 Handoff；
9. 以后交接时不再复制长 Prompt，只需要让接收方读取最新 Handoff；
10. Handoff 是当前收件箱，不是历史档案。


## 你必须先读取


先读取最新版：


- docs/PROJECT_COLLABORATION_MODEL.md
- docs/collaboration/CHATGPT_TO_CODEX_HANDOFF.md


然后按照 Collaboration Model 执行。


不要继续沿用旧的 Google Drive API 逐文件上传方式。


## 当前项目路径


Canonical local repo：


/Users/simonluo/罗鑫宇/Vibe Coding/Syllab for NTU Learn


Google Drive Desktop 项目镜像：


/Users/simonluo/Library/CloudStorage/GoogleDrive-simooonluo@gmail.com/我的云端硬盘/Syllab for NTU Learn


Google Drive cloud folder ID：


12EO1ZSi-xNs9bHrtGW1dZuxz3kHjGaOo


## 本轮任务


### 1. 先同步 Drive → Local


使用 Google Drive Desktop 暴露出来的本地文件系统目录。


不要使用 Drive API 做 bulk transfer。
不要开发新的同步 CLI、daemon、server、数据库或专用 sync abstraction。


优先直接使用：


- rsync
- cp
- diff
- find
- shasum
- Git 自带命令


目标是把最新 Google Drive Shared Mirror 与 canonical local repo 安全对齐。


### 2. 同步最新协作规范


将 Drive 中最新的：


docs/PROJECT_COLLABORATION_MODEL.md


同步到本地同路径。


这份文档现在是跨项目可复用的通用协作规范，不应再改回 Syllab 专属版本。


### 3. 建立并同步两个长期 Handoff 文件


本地正式位置：


docs/collaboration/CHATGPT_TO_CODEX_HANDOFF.md
docs/collaboration/CODEX_TO_CHATGPT_HANDOFF.md


CHATGPT_TO_CODEX_HANDOFF.md 由 Product Side / ChatGPT 更新。


CODEX_TO_CHATGPT_HANDOFF.md 由 Engineering Side / Codex 更新。


不要每轮再创建新的 handoff 文件。


### 4. 更新项目 Agent 规则入口


检查当前 AGENTS.md 与 docs/project-governance.md。


如果还没有准确反映最新协作规则，则做最小必要更新：


- 指向 docs/PROJECT_COLLABORATION_MODEL.md；
- 明确跨智能体同步优先使用 Google Drive Desktop + filesystem-native sync；
- 明确不需要模型逐文件搬运；
- 明确两个长期 Handoff 文件是交接入口；
- 明确工程侧每次进入项目时，应先读取协作规范和发给自己的 Handoff；
- 不要复制整份 Collaboration Model 到 AGENTS.md。


AGENTS.md 应保持短而稳定。


### 5. 做一次完整的项目镜像对齐


目标不是只同步几个文档。


按照最新版 Collaboration Model，对整个 collaboration-complete project tree 做一次安全对齐。


原则：


- 逻辑上检查整个项目；
- 物理上只复制差异；
- 不需要模型逐份阅读文件内容；
- 不默认执行 destructive --delete；
- 先检查本地 dirty state；
- 发现双方同一文件都发生变化时，报告 SYNC CONFLICT，不要盲覆盖。


默认不要同步：


- .git/
- node_modules/
- 真实 .env
- secret / API key / token / credential
- browser / QA profile
- cookies / session / MFA state
- private raw data
- raw private screenshots
- raw reasoning traces
- pure cache / temporary files


安全且有项目价值的文件尽量保留。


## 不要做什么


本轮不要：


- 开始 v0.3.0 产品功能开发；
- 修改产品范围；
- 修改 AI runtime；
- 修改 UI；
- 修改 v0.2.0 tag / Release；
- 新建同步基础设施；
- 使用 Google Drive API 逐文件批量上传；
- 创建新的临时 Handoff 包；
- 把用户专属绝对路径写入通用协作规范；
- 为了同步而让模型逐份阅读整个 repository。


## 校验


同步完成后至少确认：


- docs/PROJECT_COLLABORATION_MODEL.md 是最新版；
- 两个长期 Handoff 文件存在；
- Drive 与 Local 的 intended project files 已对齐；
- 没有 secret 被带入 Drive；
- .git/ 与 node_modules/ 没有进入 Shared Mirror；
- Local repo 没有被意外覆盖；
- 没有未处理 SYNC CONFLICT。


不需要为这次纯协作流程变更跑真实 NTU Learn QA。


如果改动触发 repository 的普通文档/CI 检查，则按现有项目规则运行必要检查。


## Git


Product Owner 已授权本轮在确认上述内容全部正确后：


1. 审计 git status / git diff；
2. 只纳入本轮 intended changes；
3. 创建一个合适的 conventional commit；
4. push 到当前正常远端分支；
5. 不 force push；
6. 不创建 tag；
7. 不修改 release。


本轮预期进入 commit 的内容至少包括：


- docs/PROJECT_COLLABORATION_MODEL.md
- docs/collaboration/CHATGPT_TO_CODEX_HANDOFF.md
- docs/collaboration/CODEX_TO_CHATGPT_HANDOFF.md
- 如确有必要，最小更新后的 AGENTS.md
- 如确有必要，最小更新后的 docs/project-governance.md


## 完成后 Engineering → Product Handoff


完成所有工作后，覆盖更新：


docs/collaboration/CODEX_TO_CHATGPT_HANDOFF.md


至少写入：


- Handoff ID
- Updated At
- Current Stage
- Status: READY
- 最终 Git HEAD
- 本轮实际修改
- 实际同步结果
- commit hash
- push status
- 是否存在冲突
- 是否有 blocker
- ChatGPT 下一步只需要重点阅读哪些文件


然后将 Local 最新项目状态同步回 Google Drive Shared Mirror。


不要再额外创建新的 Handoff 文档。


## 完成标准


只有在：


- Drive → Local 同步完成；
- 新协作规范落地；
- 两个长期 Handoff 落地；
- 项目镜像完成本轮安全对齐；
- Git commit 完成；
- push 完成；
- CODEX_TO_CHATGPT_HANDOFF.md 已更新并回到 Drive；


之后，本轮才算完成。


本轮结束后不要开始 v0.3.0 产品功能开发。