# Syllab — Technical Design — v0.1.0

> 产品版本：v0.1.0
> 阶段：`IMPLEMENTED · GATE D PASS · HISTORICAL DESIGN BASELINE`
> 上游事实源：`01_Syllab_PRD_v0.1.0.md`、`04_Spike_Report_v0.1.0.md`、`05_Product_Decision_Log_v0.1.0.md`、`06_MVP_Interaction_IA_Spec_v0.1.0.md`
> 结论：本设计已完成实现并通过 Gate D；本文件保留为 v0.1.0 历史设计基线

> **Lifecycle Note**：本文件中的“待 Coding / Testing 验证”表述保留其当时语境。当前实现与验收状态以 `../docs/final-acceptance-v0.1.0.md` 为准；post-v0.1.0 产品问题在正式决策前不构成本技术设计的变更。

## 1. 设计目标与边界

本设计将 Syllab 实现为 Chrome Manifest V3 扩展。在用户已登录 NTU Learn 的浏览器中，按课程执行一次可恢复的扫描任务，把页面、Announcements、Assignments 与支持文件中的文本转成候选信息，经用户 Review 后形成 Course Brief，并仅将已确认日期导出为 `.ics`。

本设计不改变产品事实：只有 4 个主要界面（Saved Courses、Scan、Review、Course Brief），不增加 Chat、Reminder、多课程 Dashboard、自动 Change Detection、自动后台监控、Ignore memory 或 NTU Learn 写回。

技术设计遵守以下原则：

- Course Brief 是用户认可的事实层；AI 输出只是候选。
- Source 与原始提取值是不可被用户编辑覆盖的证据层。
- 单 Source 失败隔离，不能无故使整门课程作废。
- 扫描状态和 checkpoint 持久化，不依赖 Popup 或 Service Worker 内存。
- 只报告“已发现来源”的处理情况，不声称课程绝对完整。
- Spike 代码只作为证据参考，不直接成为正式工程基线。

## 2. 总体架构

```text
Popup UI（4 个主要界面）
        │ commands / state subscription
        ▼
Extension Service Worker（任务编排、路由、权限、网络协调）
        │
        ├── Content Script / Page Bridge
        │     └── 当前课程识别、NTU Learn 页面上下文、同源 API 发现
        │
        ├── Scan Engine
        │     └── Discover → Fetch → Parse → Normalize → AI Extract
        │
        ├── Parser Worker / Offscreen Document
        │     └── PDF、PPTX、DOCX 的 CPU/DOM/ZIP 解析隔离
        │
        ├── Extension-side AI Client
        │     └── 分块、批处理、最小输入、响应校验、Candidate 本地落库
        │
        ├── Syllab Backend / AI Proxy
        │     ├── 匿名 installation authentication、用量保护
        │     └── DeepSeek API（唯一模型：deepseek-flash）
        │
        └── Local Repository（IndexedDB + chrome.storage.local）
              └── Course / Scan / Source / Candidate / Brief / Review Progress
```

### 2.1 Popup / UI

职责：

- 读取当前 Tab 的课程上下文并路由到 4 个主要界面之一；
- 发起 `Scan this course`、`Scan again`、Allow、Continue without them、Retry、Cancel；
- 展示持久化任务状态，而不是拥有扫描任务；
- 执行 Review、Edit、Add、Resolve、Calendar Export；
- 通过 `chrome.storage.onChanged` 或 runtime message 刷新状态。

Popup 关闭不会删除任务，也不会被当成 Cancel。

### 2.2 Content Script 与 Blackboard 页面上下文

Content Script 负责轻量页面观察和消息桥接，不保存产品事实：

- 从 `/ultra/courses/<course-id>/outline` 等稳定路由提取原生 Course ID；
- 读取页面可见的 Course Code / Course Name，作为展示信息；
- 在需要页面执行上下文时，通过受控 Page Bridge 调用只读 Blackboard 接口；
- 返回原始响应及请求诊断给 Scan Engine；
- 不读取密码输入、不拦截 SSO / MFA、不修改页面数据。

Course ID 是课程主身份；名称与代码可更新但不能创建新课程身份。若无法可靠获得原生 ID，则当前页面视为不可识别课程页，入口回到 Saved Courses，不用标题猜测课程身份。

### 2.3 Extension Service Worker

职责：命令入口、Scan 状态机、任务调度、权限检查与请求结果处理、跨域 Fetch、错误归类和恢复。

Service Worker 是短生命周期事件处理器，不作为内存常驻进程。每一个可重入步骤都先读 checkpoint，完成最小工作单元后原子写入结果与下一个 checkpoint。Popup 关闭或 Service Worker 被 Chrome 回收后，下一次事件可以从持久化状态继续。

### 2.4 Scan Engine

Scan Engine 是可重入的阶段编排器，不直接对应 UI 进度条。正式流水线：

```text
Current Course Detection
→ Discover Sources
→ Fetch
→ Parse
→ Normalize
→ AI Extract
→ Candidate State
→ Review
→ Course Brief
→ Calendar Export
```

扫描的技术执行可以交错，例如一边继续发现页面，一边处理已取得的文件；UI 只显示用户可理解的 4–5 个任务阶段。

### 2.5 Parser Runtime

文件解析不在 Popup 中执行。优先使用可终止的 Web Worker；需要 DOM 能力或扩展页生命周期承载时使用 Offscreen Document。每个文件一个解析任务，设置字节、页数/幻灯片数、解析时长与输出文本上限。Parser 完成或失败后立即释放 ArrayBuffer、ZIP 结构和 worker；不把完整文件长期写入本地数据库。

### 2.6 Extension-side AI Client

Extension 内的 AI Client 负责：

- 将规范化文本按来源和语义边界 chunking / batching；
- 构造只包含必要课程文本、最小 metadata、Source / Evidence references 的 request schema；
- 自动注册或读取匿名 installation token，并调用 Syllab Backend；
- 校验 Backend 返回的 response schema、日期语义和 evidence 引用存在性；
- 把通过校验的 Candidate 写入浏览器本地数据库；
- 将认证、限速、预算、Provider timeout / error 映射为本地可处理的错误状态。

Extension-side AI Client 不保存 DeepSeek API Key，不直接调用 DeepSeek，不让 AI 直接修改 Course Brief。

### 2.7 Backend-side AI Proxy

Syllab Backend 是轻量 AI Proxy，不是长期课程数据库。职责：

- `POST /installation/register`：创建匿名 installation 并签发独立 installation token；
- 验证 `Authorization: Bearer <installation-token>`；
- 检查 installation 是否禁用、per-installation rate limit、per-installation usage cap、global usage / budget guard；
- 从 server-side Secret 读取 DeepSeek API Key；
- 调用唯一 Provider / Model：`DeepSeek` / `deepseek-flash`；
- 处理 timeout、DeepSeek 400 / 401 / 402 / 422 / 429 / 500 / 503 等 Provider error，并仅对明确可安全重试的瞬时错误做有限 retry；
- 返回结构化 AI Response 和最小 request / usage metadata。

任一认证或用量检查失败时，Backend 直接拒绝，不调用 DeepSeek。Backend 不拥有 Course Brief，不长期保存 Course、Source、Evidence、Candidate、Review、完整课程正文或完整文件。

代码层可保留薄 DeepSeek adapter 以隔离 HTTP 格式，但 v0.1.0 不实现 Provider Router、多模型选择、Flash / Pro 自动切换或 fallback。

部署不绑定阿里云、腾讯云、Cloudflare 或其他具体平台；运行环境只需支持 HTTPS endpoint、server-side Secret、轻量 installation / usage state 和可配置限流。

### 2.8 Anonymous Installation Authentication

首次需要 AI 时：

```text
Extension 生成随机 installationId
→ POST /installation/register
→ Backend 创建 installation
→ 返回独立 installation token
→ Extension 本地保存 token
```

后续：

```text
POST /ai/extract
Authorization: Bearer <installation-token>
```

Backend 检查 token、installation enablement、rate limit、usage cap 与 global budget guard 后才可调用 DeepSeek。注册接口至少实施 IP / network rate limit、registration frequency limit 或 installation creation limit 等简单保护。阈值全部从运行配置读取，不在产品文档写死。

这不是账号系统：没有 Syllab Account、Google / NTU Login、Invite Code、用户手输 Token 或 Admin Dashboard。不得在 Extension 内放置一个所有用户共享的 Secret，也不设计多层自研加密协议。

### 2.9 Secret Management

- 本地开发：真实值只放 `.env` / `.dev.vars` 或等价本机 Secret 文件，并由 `.gitignore` 排除；
- GitHub：只提交 `.env.example`，仅列变量名和说明，不含真实值；
- 生产部署：以 Secret / Environment Variable 注入 `DEEPSEEK_API_KEY`；
- 代码：只从 `process.env.DEEPSEEK_API_KEY` 或运行环境等价 Secret binding 读取；
- 禁止把 Key 硬编码、写入 Extension bundle、提交 Git、返回客户端或记录到日志。

### 2.10 Local Repository

- IndexedDB：持久化 Course、Scan、Source、Evidence、Candidate、Brief Item、Review Progress 等结构化数据，支持事务与较大文本。
- `chrome.storage.local`：保存轻量课程索引、当前任务指针、schema version、UI 可快速读取的状态摘要。
- 不使用 `chrome.storage.sync`；MVP 无账号、云同步或多设备同步。
- 原始 PDF / PPTX / DOCX 字节只在处理期间临时存在，默认不长期保存。

Backend 只保存匿名 installation 的认证 / 禁用状态、用量计数与必要脱敏运行信息；浏览器本地 Repository 仍是 Course、Source、Evidence、Candidate、Review 和 Course Brief 的长期事实存储。

## 3. 核心数据模型与事实所有权

### 3.1 Course

```text
Course {
  courseId, courseCode, courseName,
  createdAt, updatedAt,
  lastEffectiveScanId,
  briefStatusSummary
}
```

`courseId` 来自 Blackboard 原生身份。Course 只拥有课程身份和聚合状态，不拥有候选或事实内容。

### 3.2 Scan

```text
Scan {
  scanId, courseId, mode: initial | rescan | retry,
  status: Ready | Scanning | WaitingForPermission |
          Complete | Partial | Failed | Interrupted,
  phase, startedAt, updatedAt, completedAt,
  checkpoint,
  requestedOrigins[], deniedOrigins[],
  counters, failureSummary
}
```

Scan 拥有一次执行的生命周期、Coverage 汇总和 checkpoint。`lastEffectiveScanId` 只在 Complete / Partial 或正常完成且 No Items Detected 时更新；Failed / Interrupted 不替换旧 Course Brief 的有效上下文。

### 3.3 Source 与 Evidence

```text
Source {
  sourceId, courseId, scanId,
  type, nativeItemId, parentSourceId,
  title, canonicalUrl, observedUrl,
  mimeDetected, fetchedAt, contentHash,
  discoveryPath,
  status: discovered | fetched | processed |
          permission_denied | unsupported | parsing_failed |
          access_failed | interrupted,
  retryability, diagnosticsCode
}

Evidence {
  evidenceId, sourceId,
  locator: page | slide | section | item,
  excerpt, normalizedSpan,
  rawExtractedValue
}
```

Source ID 优先由 `courseId + sourceType + nativeItemId/attachmentId` 构成；无稳定原生 ID 时，使用规范化 canonical URL、父来源身份、标题及内容 hash 的组合。Signed URL 仅作 observed URL，不作稳定身份。URL 去重与 item 去重分开：先按原生 item ID 去重发现节点，再按 canonical URL / attachment identity 去重下载，最后按 content hash 标注重复内容。重复来源仍可保留各自出处关系。

Evidence 是只追加证据。用户修改当前事实时，不修改 Evidence，不删除原始值。

### 3.4 Candidate

```text
Candidate {
  candidateId, courseId, scanId,
  kind: assessment | important_date | important_rule,
  semanticKey,
  scope?: course | assessment,
  appliesToAssessmentKey?,
  status: Detected | NeedsReview | Confirmed |
          EditedConfirmed | Ignored,
  proposedValue,
  fields,
  evidenceRefs[],
  conflictGroupId?, reviewReason?,
  linkedBriefItemId?, createdAt, updatedAt
}
```

Candidate 是一次 Scan 的 AI / normalize 输出及 Review 状态。Ignored 只属于当前 Candidate，不跨 Scan 抑制后续候选。对于 Important Date / Rule，`scope=assessment` 时必须带稳定 `appliesToAssessmentKey`；`scope=course` 时不得伪造 parent。字段名可在实现中等价调整，但 relationship 必须是结构化数据，不能只依赖 free-form 文本。

### 3.5 Brief Item 与最小字段状态

```text
BriefItem {
  briefItemId, courseId,
  kind,
  scope?: course | assessment,
  parentBriefItemId?,
  origin: candidate | user_added,
  status: Confirmed | EditedConfirmed | UserAddedConfirmed,
  currentValue,
  fieldStates: {
    <only-risky-field>: {
      status: Confirmed | Unresolved,
      value?, candidateValues?, evidenceRefs[]
    }
  },
  sourceCandidateRefs[], evidenceRefs[],
  updatedAt
}
```

字段级状态只为真实冲突或缺失字段建立，正常字段不逐一包装状态对象。主体不确定时整条留在 Review；主体已确认但日期等字段未解决时，Brief Item 可存在，相关字段为 Unresolved。Assessment-specific child fact 可以作为独立 BriefItem 持久化并通过 `parentBriefItemId` 归属于 parent Assessment，但顶层 renderer 不把它再次列入 Other Important Dates / Important Rules。

事实所有权：

- Source / Evidence 拥有“原始材料与提取证据”；
- Candidate 拥有“本轮建议及其 Review 状态”；
- Brief Item 拥有“用户当前认可的课程事实”；
- Calendar 不拥有事实，只读取 Brief Item 中 Confirmed Date。

### 3.6 Review Progress

按 `scanId` 记录候选总数、已处理数量、剩余 Detected / Needs Review 数量和短暂 Undo 操作。Skip for now 不改变 Candidate 状态。分类级 Confirm all 只事务性更新该类别中仍为 Detected 的 Candidate，不覆盖 Confirmed、EditedConfirmed 或 Ignored。

## 4. 当前课程识别与入口路由

1. Popup 查询活动 Tab。
2. 仅在受支持 NTU Learn origin 与已知 Ultra course route 上向 Content Script 请求 context。
3. Content Script 返回 Course ID、Course Code、Course Name、route evidence。
4. Repository 先查询该课程是否存在 active / recoverable Scan，再查询 Brief：
   - 不可识别课程页 → Saved Courses；
   - 存在 `Scanning` → Scan 当前进度；
   - 存在 `Waiting for Permission` → Scan 的 Allow access / Continue without them；
   - 存在可恢复 `Interrupted` → Scan 的 Continue / Retry；
   - 不存在 active / recoverable Scan 且从未形成有效扫描 → Scan Ready；
   - 不存在 active / recoverable Scan 且已有有效 Course Brief → Course Brief。
5. 从 Saved Courses 点入课程时不依赖当前 Tab，未扫描到 Scan Ready，已扫描到 Course Brief。

Active Scan 的路由优先级高于旧 Course Brief。因此 `已有 Brief → Scan again → Popup close → reopen` 必须回到当前 Scan；Waiting for Permission 仍显示授权动作；Service Worker 中断后显示 Interrupted / Continue。旧 Brief 始终保留，只是在 active Scan 完成或退出恢复流前不作为入口默认落点。此调整不增加第五个主要界面。

如果名称或代码变化，只更新展示元数据；若原生 ID 缺失或冲突，拒绝合并课程并记录诊断，避免把两门课混在一起。

## 5. Source Discovery 与遍历完整性

### 5.1 发现范围

- Course pages / Content API：作为主发现路径，按分页游标遍历根节点与明确容器。
- Announcements：列表与正文分别发现并关联。
- Assignments：识别原生作业类型、内容区中的作业/学习模块线索及其附件；当前为 Spike PARTIAL，必须真实环境补测。
- Files：从页面、公告、作业和内容节点收集附件关系。
- Folder / Learning Module：维护显式队列与 visited set，允许多层遍历。

### 5.2 遍历算法

- 队列元素包含 native item ID、parent ID、depth、discovery endpoint 和分页状态。
- 只有明确容器类型或 API 明确声明 children 时正常请求子级；未知类型可做受控 probe，但 probe 的 404 / 明确 leaf 与真实网络失败必须区分。
- 分页必须保存 next cursor；每页完成后写 checkpoint。
- `visitedNativeItemIds` 防止环路；相同附件下载请求以 canonical identity 合并。
- 记录每个发现入口、请求结果和未完成分支，Coverage 只汇总已发现来源。

### 5.3 完整性表达

Complete 表示“扫描正常结束，所有已发现且当前支持的来源均完成处理”，不表示整个课程绝对 100% 完整。若遍历分支因真实错误无法确定，记录 source / branch issue，并使 Scan 为 Partial；正常 leaf 不算失败。不得以任一请求成功推导整课成功。

## 6. Fetch、权限与恢复

### 6.1 Fetch 分层

- NTU Learn / Blackboard 同源页面与 API：通过已登录 Tab 的页面上下文或已授予主站权限读取。
- Attachment redirect chain：Service Worker 先解析实际重定向目的地；每一步只读，携带浏览器现有登录态，不读取凭证。
- 最终文件域：检查 `chrome.permissions.contains`；已授权则 Fetch，未授权则登记 pending origin。

Fetch 校验 HTTP 状态、Content-Type、Content-Disposition、文件签名和大小；扩展名仅作提示，不能决定真实格式。

### 6.2 动态精确 host permission

正式方向可行，但存在 Chrome 约束：`chrome.permissions.request()` 必须由用户手势触发。后台发现域名后不能自行弹出授权。

实现流程：

1. Manifest 在 `optional_host_permissions` 声明运行时可请求的 HTTPS 范围；实际 `request()` 只传本次发现的精确 origin（例如 `https://files.example.blackboard.com/*`）。
2. Scan 继续完成所有不依赖该权限的工作，将待授权 origin 与 Source IDs 写入 checkpoint。
3. Scan 进入 `Waiting for Permission`，Popup 显示 `Allow access` / `Continue without them`。
4. 用户点击 Allow，Popup 在该点击处理器内调用 `permissions.request({origins:[exactOrigin]})`。
5. Allow：把 origin 标记 granted，Service Worker 只恢复该 origin 对应的 Source 工作队列。
6. Deny / Continue without them：把 origin 加入本 Scan 的 `deniedOrigins`，来源为 Permission Denied，其余任务继续，最终通常为 Partial。
7. 同一次 Scan 对 `requestedOrigins ∪ deniedOrigins` 去重，不再次请求。

权限按 origin 批处理：同一 origin 的多个文件只请求一次；不同 origin 分别陈列并逐次由用户动作授权。若 Popup 关闭，Waiting 状态持久化，下次打开继续显示，不算 Interrupted。

需要在正式 Coding 的真实环境中验证：运行时发现 host 的 `optional_host_permissions` 声明、Chrome 实际权限提示文案、重定向链 Cookie 行为和 Allow 后恢复。若 Chrome 实际要求向用户展示比“精确发现 origin”更广的授权，属于产品影响冲突，不能自行切换到 `*.blackboard.com`，必须回产品侧确认。

### 6.3 Retry 的真实含义

- Source Retry：只重跑指定 Source 从最后安全阶段开始的 fetch / parse / extract，保留已成功 Source 和 Review 进度。
- Permission recovery：只恢复此前 Permission Denied 的同 origin Sources。
- Full Scan Try again：为失败扫描创建新的 scanId，重新走完整发现；旧 Course Brief 不变。
- Retry 不等于 Scan again；Retry 是恢复本轮已知失败，Scan again 是用户主动重新获取当前课程。

## 7. 文件解析设计

### 7.1 格式识别

按文件签名 / 容器结构为主，结合 MIME 与文件名：

- PDF：`%PDF-`；
- PPTX / DOCX：ZIP 容器，并检查 `[Content_Types].xml` 与 Office 路径；
- legacy PPT / DOC：OLE Compound File 签名及内部类型识别；
- 其他格式：Unsupported。

扩展名与签名冲突时不进入错误 parser，记录 Unsupported 或 Parsing Failed 的明确原因。

### 7.2 PDF

使用本地打包 PDF.js，按页输出文本块、页码和必要位置。无可提取文字的页面标记 page-level partial；OCR 不在 v0.1.0 范围。只要文件仍有可靠可用文本，可以保留成功页面并把 Source 标记 partial，Scan 为 Partial；不把空文本页解释为“无信息”。

### 7.3 PPTX

本地 ZIP/XML 解析，按 slide 顺序读取文本、表格与 speaker notes（若明确支持）；输出 slide locator。正式实现必须用真实 NTU Learn PPTX 做端到端验证，在此之前状态仍是 NOT TESTED。

### 7.4 DOCX

本地 ZIP/XML 解析，按文档顺序合并段落与表格单元格，保留 section / paragraph locator。正式实现必须用真实 NTU Learn DOCX 做端到端验证，在此之前状态仍是 NOT TESTED。

### 7.5 Legacy PPT / DOC

MVP 必须正确识别 OLE 类型。v0.1.0 基线不承诺解析；未实现或不能可靠解析时标记 Unsupported，不提供 Retry，不静默跳过。若真实样本频率影响 MVP 价值，作为产品影响风险回报，不自动扩大 parser 范围。

### 7.6 大文件与隔离

- Fetch 前读取 Content-Length（若有），流式接收并执行硬上限；上限由实现阶段基于真实样本、内存与 AI 成本确定，不沿用 Spike 的 32 MiB 实验预算。
- PDF 分页、Office 按 slide / section 分批规范化和 AI 输入；不一次把全文件复制到多个上下文。
- 单文件独立 worker、超时、取消信号与错误边界；单文件失败只改变该 Source。
- 超限或资源不足属于 Parsing Failed / Could Not Access 的可解释 issue；有真实重试价值才显示 Retry。
- 解析结束立即释放 blob URL、ArrayBuffer、worker 和临时 chunk。

## 8. Normalize 与 AI Extraction

### 8.1 规范化输入

每个文本单元包含：courseId、sourceId、sourceType、标题、父子路径、locator、文本、contentHash。规范化只清除布局噪声、统一空白和日期表面形式，不改变原文证据。

### 8.2 AI 输入边界

Extension 只向 Syllab Backend 发送候选提取所需文本块与最小 Source metadata；Backend 再以同一最小边界调用 DeepSeek。不得发送密码、SSO / MFA、成绩、提交记录、个人反馈、Cookie、Authorization Header、signed URL secret、完整浏览历史或无关个人信息。默认不在 Syllab Backend 长期复制完整文件、完整课程正文、Prompt 原文、DeepSeek 完整输入或完整输出。

长文本以来源内语义块批处理，块间结果在本地聚合。AI 提取输出必须包含 evidence locator；无证据引用的课程事实不能进入 Detected。

Backend 可保存必要脱敏运行信息：request id、model、token usage、latency、error code、installation usage counters。`installationId` / Provider `user_id` 如使用，只能是无个人信息的随机标识。

### 8.3 输出结构与风险路由

输出仅包括：

- Assessment：name、type、weight、与日期/规则的关联；
- Important Date：日期/时间/时区、事件关系，以及 `scope` / 可选 parent Assessment relationship；
- Important Rule：仅限符合 D-015 Grade-Impact Boundary 的 course-level rule；Assessment-specific Rule 归入对应 Assessment；
- evidenceRefs、conflict refs、ambiguity reason。

**D-015 多层门禁**：AI Prompt 是 Grade-Impact 的主语义判断层；本地 deterministic validator 只作为保守 backstop，拦截没有 source-supported grade / assessment consequence 的明显 policy boilerplate，不得创建 Candidate、不得根据远距离 disciplinary chain 推导 grade impact，也不得用激进关键词过滤造成漏检。Review 是最终用户确认层，但不承担接收明显 policy boilerplate 的职责。mandatory course-wide Turnitin / NTULearn submission channel 是 Include 正例；generic copyright / redistribution / lecture recording policy 是 Exclude 反例，除非当前课程来源明确给出近距离 marks / eligibility / assessment-validity 后果。

路由：证据清晰、无明显冲突且 `assessment-specific vs course-wide` 归属及 parent 关联明确 → Detected；来源冲突、日期模糊、是否计分不确定、归属或关联不确定 → Needs Review。AI 数字 confidence 可内部调试但不进入产品 UI，也不能单独决定事实。

### 8.4 去重与关联责任

- Source 层负责页面/item/URL/内容重复识别；
- Normalize 层负责相同证据块去重；
- AI 层提出语义实体与关联建议；
- Candidate Merger 以类型、规范化标题、日期、稳定 parent Assessment relationship 和 evidence overlap 生成 semanticKey，合并明显重复并保留全部 evidenceRefs；
- 冲突值不互相覆盖，进入同一 conflictGroup 并路由 Needs Review；
- 用户最终决定只发生在 Review / Course Brief。

## 9. 状态机与生命周期

### 9.1 Scan 状态

```text
Ready --user starts--> Scanning
Scanning --new permission needed--> Waiting for Permission
Waiting --allow/skip--> Scanning
Scanning --normal end, no issues--> Complete
Scanning --normal end, source issues--> Partial
Scanning --no trustworthy usable result--> Failed
Scanning --execution stops before normal end--> Interrupted
```

No Items Detected 是 Complete 或 Partial 的结果形态，不是 Failed。

### 9.2 Popup 关闭与 Cancel

- Popup 只是视图，关闭后 Service Worker / worker 可继续当前短任务；所有阶段以 checkpoint 为准。
- Popup 关闭不会写 Cancel 标志。
- 用户显式 Cancel 写入 `cancelRequestedAt`，停止新任务、终止可取消 worker，当前未完成 Sources 标为 Interrupted Processing，Scan 为 Interrupted；已有 Course Brief 保留。
- Service Worker 被回收时，正在内存中且未完成提交的工作单元会失效。下次唤醒若发现 heartbeat / lease 超时且 Scan 仍为 Scanning，则先标 Interrupted，并提供 Continue / Retry；不能伪装成 Partial。

### 9.3 Checkpoint

需要 checkpoint。最小粒度：

- discovery queue + pagination cursor + visited IDs；
- per-source stage/status；
- pending/granted/denied origins；
- parser batch cursor；
- AI batch cursor；
- committed candidate IDs。

每个工作单元使用 lease（scanId、workerToken、expiresAt）避免 Service Worker 重启后的重复并发。写入采用幂等 key 和事务：结果落库与 checkpoint 前移必须同一事务完成。

### 9.4 Continue 与 Retry

- Continue：读取同一 scanId 的 checkpoint，重新执行未提交工作单元；已提交结果不重跑。
- Retry：针对失败 Source 重置到最后可安全重试阶段；或 Full Failed 时创建新 Scan。
- 若 checkpoint schema 不兼容或依赖页面已失效，Continue 不可安全执行，则明确降级为 Try again，新建 Scan；旧 Brief 仍保留。

## 10. Candidate、Review 与 Course Brief

### 10.1 Review relationship 与进入 Course Brief

- Review 继续按 Assessments / Important Dates / Important Rules 分类，不引入 nested Review；Assessment-specific child candidate 显示 `Applies to <Assessment>`。
- Confirm attached Date / Rule 只确认该 child candidate，不自动确认 parent Assessment 或 sibling facts；分类级 Confirm all 同样不确认 parent。
- Confirmed Candidate → 创建/关联 Brief Item，状态 Confirmed；
- `scope=assessment` 的 Date / Rule 必须关联 parent Assessment。parent 已进入 Brief 时，child 通过 `parentBriefItemId` 投影在 parent 下；不得再顶层重复展示。
- child 已确认但 parent 尚未进入 Brief 时，保留 child confirmation，但不得自动创建已确认 parent；待 parent 确认后再投影。若 parent 最终 Ignore / Reject，child 不能静默变成 course-level，必须重新 Review / reclassify 或保持不进入 Brief。
- `scope=course` 的 Rule 才进入独立 Important Rules；不属于 Assessment 的独立 Date 才进入 Other Important Dates。
- 用户 Edit 后保存 → Brief Item 为 EditedConfirmed，Candidate 与原 evidence 仍保留；
- User Add → 新建无 AI Candidate 的 Brief Item，状态 UserAddedConfirmed，可没有 Source；
- 已确认主体 + unresolved field → Brief Item 存在，字段只在必要处标 Unresolved；
- 整条 Needs Review / Detected 不进入 Brief。

### 10.2 Source Evidence 保留

Brief Item 保存 `sourceCandidateRefs` 与 `evidenceRefs`。编辑只更新 `currentValue` 和状态，不重写 Candidate.proposedValue 或 Evidence.rawExtractedValue。Resolve 选值或手工编辑时，保留所有冲突 evidence，并记录最终选择来源为 user decision；主界面仍默认隐藏证据。

### 10.3 Calendar 门禁

Calendar 查询 Brief Item：只选择日期字段存在、状态 Confirmed、值可规范化且未 Unresolved 的项目。未解决日期即使主体已确认也不进入列表。Calendar 不重新解析自然语言，也不决定冲突。

## 11. Scan again 与合并策略

Scan again 创建新 scanId 并执行全量当前支持来源扫描；这不是自动 Incremental Scan，也不承诺 New / Changed / Possibly Removed。

保护顺序：

1. 现有 Brief Item 全部保留，扫描写入区域与 Brief 写入区域分离。
2. 新 Candidate 先在本轮内部去重。
3. Candidate Merger 可用 `semanticKey + evidence/source identity + normalized value + parent Assessment relationship` 查找明显相同的现有 Brief Item，仅建立 reference，不修改 Brief。
4. 与 Brief 完全一致且证据一致的候选可标记“已有关联事实”，不要求用户重复 Review；这是去重，不是变化识别。
5. 无法可靠判定相同、值有冲突、parent relationship 变化/不明确或出现新 evidence 的候选进入 Detected / Needs Review；只有用户确认后才影响 Brief。
6. EditedConfirmed 与 UserAddedConfirmed 的 currentValue 永不被扫描自动覆盖。
7. 旧来源在新 Scan 中未发现，不删除 Brief，也不标 Possibly Removed。
8. 上一轮 Ignored 不参与跨 Scan 抑制，同内容允许再次进入 Review。

Retry 使用相同 scanId 与幂等 candidate key，避免同一 Source 重试产生重复候选；Scan again 使用新 scanId，允许重新出现，但最终仍通过本轮去重和 Brief 保护门禁。

## 12. Calendar Export

Calendar Export 由 Popup 临时交互生成：

- 查询当前课程全部 Confirmed Date，默认全选；
- 事件 UID 使用稳定 `briefItemId + confirmed-date-field`，避免同一批重复；
- 使用 RFC 5545 `.ics` 转义、换行和时区规则；未知时间的日期使用全天事件；明确时间按课程/浏览器确认时区生成；
- 标题包含课程与事件名，可附少量类型/权重信息；不包含 Source、置信度或冲突历史；
- 生成 Blob 后由浏览器下载，不调用第三方 Calendar API。

导出层不修改 Brief，也不缓存“已导出”作为课程事实。

## 13. 错误与恢复矩阵

| 情况 | Source 状态 | Scan 状态 | 用户路径 |
|---|---|---|---|
| 单 Source 暂时读取失败 | Could Not Access | Partial | Review 可继续；有真实恢复价值时 Retry |
| 部分 Source 失败 | 各自原因 | Partial | Review results + View issues |
| 无可信可用结果 | 具体原因 | Failed | 留在 Scan；Try again / Allow and retry |
| 执行未正常走完 | Interrupted Processing | Interrupted | Continue 或 Try again |
| 格式不支持 | Unsupported | Partial | View issues；无 Retry |
| 权限拒绝 | Permission Denied | Partial | 其他来源继续；以后可 Allow access |
| Parser 异常 | Parsing Failed | Partial | 单文件隔离；可恢复时 Retry |
| 正常完成但 0 候选 | Processed | Complete 或 Partial | No Items Detected；可打开空 Brief / Add |

已有 Course Brief 在任何 Failed、Interrupted、Cancel、Permission Denied 或 Parsing Failed 情况下都不被清空。

## 14. 安全、隐私与权限

- 不读取或保存 NTU 密码、SSO、MFA；只使用用户浏览器现有登录态。
- 只读 NTU Learn / Blackboard；不提交作业、不答题、不修改内容。
- 主站只申请实现课程识别与读取所需权限；附件域用运行时发现的精确 origin 请求。
- 外部 AI 仅接收必要课程文本和最小 metadata；不发送成绩、提交记录、个人反馈或凭证。
- 本地仅保存结构化结果、必要证据片段和恢复元数据；默认不保存完整文档副本。
- 诊断日志使用错误码和脱敏元数据，不记录 Cookie、Authorization header、signed URL query 或完整课程正文。
- Manifest V3 所有执行代码本地打包，不远程加载 parser 或脚本。
- Extension bundle、客户端配置与 GitHub 不包含 `DEEPSEEK_API_KEY`；真实 Secret 仅由 Backend 运行环境注入。
- 匿名 installation token 只用于 Syllab Backend access control，不是 DeepSeek API Key；不得写入日志或公开仓库。
- Backend 在认证、per-installation rate limit、usage cap、global budget guard 全部通过前不得调用 DeepSeek。
- Backend 默认不成为 Course / Brief 云数据库，不增加账号、Cloud Sync、Multi-device Sync 或 Admin Dashboard。

## 15. Spike Known Risks 的处理与验证义务

| 风险 | 当前设计处理 | Coding / Testing 必须验证 | 可能产品影响 |
|---|---|---|---|
| KR-01 跨课程兼容性 | 原生 ID、类型适配器、未知类型保守处理 | 多门不同结构真实课程完整闭环 | 发现率与 Review 成本可能差异大 |
| KR-02 PPTX / DOCX | 独立 parser、locator、单文件隔离 | 真实 NTU Learn 下载→解析→AI→Review | 若真实文件失败率高，MVP 来源覆盖下降 |
| KR-03 legacy PPT / DOC | OLE 识别后 Unsupported | 真实样本识别准确性与出现频率 | 高频出现时需产品决定是否扩范围 |
| KR-04 traversal completeness | 队列、分页、明确 leaf/失败、Coverage | 多层 folder、学习模块、Assignments 类型 | 不得承诺绝对完整；可能产生更多 Partial |
| KR-05 attachment permission | 精确 origin + 用户手势 + checkpoint | Chrome 实际提示、Allow/Deny/恢复、重定向 Cookie | 若精确请求不可行，必须回产品确认 |
| KR-06 large file | 分批、上限、worker、失败隔离 | 真实大 PDF/PPTX/DOCX 的内存、耗时与成本 | 需调整上限或明确部分处理文案 |

## 16. 产品影响技术冲突

当前未发现必须推翻既定产品决定的已确认冲突。

需要保留一个验证门：动态权限必须由用户手势触发，因此后台发现附件域后只能暂停相关来源，由 Popup 的 Allow 点击发起精确 origin 请求。该行为与 D-001 的 Permission Flow 一致。如果正式实现验证发现 Chrome 只能以用户可见的广泛域范围授权，则按以下格式回产品侧：

1. 冲突规则：D-001 动态、精确附件 host permission；
2. 技术限制：Chrome 实际授权粒度 / 提示与精确 origin 不一致；
3. 证据：浏览器版本、manifest、请求参数、实际提示和复现步骤；
4. 方案：保持精确但增加操作、申请较广权限、或放弃自动附件读取；
5. 影响：分别说明扫描完成率、信任、交互成本和权限范围；
6. 建议：基于真实验证提出，但在产品确认前不实施广泛权限。

## 17. 可观测性与验收证据

开发版记录脱敏结构化事件：scan phase、source type/status、parser result、permission outcome、retry/continue、candidate validation result、duration bucket、size bucket。用户界面不展示技术日志。

每阶段测试应保留：固定 fixture 单元测试、状态迁移测试、幂等/事务测试、扩展集成测试、真实 NTU Learn 验证记录。最终必须以人工基准答案对多门真实课程跑完整闭环，而不是只证明 API 或 AI JSON 成功。

## 18. 外部技术依据

- Chrome 官方说明：`chrome.permissions.request()` 需要从用户手势内调用；运行时发现 host 可在 `optional_host_permissions` 声明范围后按 origin 请求。
  https://developer.chrome.com/docs/extensions/reference/api/permissions
- Chrome 官方说明：Extension Service Worker 会被回收，不能依赖全局变量，状态应写入 `chrome.storage` / IndexedDB。
  https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- Chrome 官方说明：IndexedDB 可用于 Service Worker 的结构化持久化；扩展 origin 的存储在各扩展组件间共享。
  https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies
- DeepSeek 官方说明：当前正式模型名为 `deepseek-flash`，OpenAI 兼容 base URL 为 `https://api.deepseek.com`，API 使用 Bearer Authentication。
  https://api-docs.deepseek.com/zh-cn/
- DeepSeek 官方错误码：400 / 401 / 402 / 422 / 429 / 500 / 503 需要在 Backend 映射并区分可重试与不可重试情况。
  https://api-docs.deepseek.com/zh-cn/quick_start/error_codes/

## 19. Technical Design Gate

本设计完整覆盖：入口（含 Active Scan 优先路由）、4 个主要界面、扫描流水线、动态权限、持久化 checkpoint、文件解析、DeepSeek / Backend AI 架构、匿名 installation authentication、用量保护、AI 数据边界、Review、Assessment-specific Date / Rule ownership（D-014）、Course Brief、字段级 Unresolved、Calendar、Scan again、异常恢复与 Spike Known Risks。

结论：

> **TECHNICAL DESIGN IMPLEMENTED — GATE D PASS — v0.1.0 BASELINE PRESERVED**

## 19.1 Implementation outcome

- v0.1.0 实现完成，Gate D 于 2026-09-17 PASS。
- 最终自动化结果：Contracts 2、Extension 124（27 个文件）、Backend 20（5 个文件），构建、严格类型检查、ESLint、Prettier、Manifest 校验与 Secret scan 通过。
- 两门真实课程的 Scan → Review → Course Brief → Calendar 闭环、精确权限拒绝、后端不可用恢复与 Service Worker 强制中断已验证。
- 真实 PPTX、DOCX、legacy Office、超大、无文本与损坏样本仍为 `NOT TESTED`。
- E3（内部 course id 命名）、E4（Service Worker 启动时的 stale-snapshot 整表回写）与 E5（schema mismatch 恢复路径的 unhandled rejection）保留为工程发现；本文件不反向改写原设计。

详细证据和开放缺陷见 `../docs/final-acceptance-v0.1.0.md`。
