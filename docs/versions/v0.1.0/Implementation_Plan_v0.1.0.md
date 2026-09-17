# Syllab — Implementation Plan — v0.1.0

> 产品版本：v0.1.0  
> 依据：`07_Technical_Design_v0.1.0.md`  
> 执行原则：先跑通最小完整闭环，再扩大来源与格式覆盖；每阶段独立验收，不用后续阶段掩盖前序缺陷。
> 状态：`EXECUTION COMPLETE · GATE A–D PASS · NOT A CURRENT EXECUTION ENTRY POINT`

## 1. 执行策略与阶段 Gate

正式开发分为 15 个阶段。阶段 1–9 先用受控 fixture 和一条真实最小来源跑通：

```text
识别课程 → 发现一个来源 → 获取 → 解析 → AI 候选
→ Review → Course Brief → 持久化恢复
```

阶段 10–12 再补齐异常、Calendar 与 Scan again；阶段 13–15 扩展到真实多来源、多格式、多课程的集成和验收。

每阶段必须：

1. 只实现该阶段已定义范围；
2. 跑自动测试并记录结果；
3. 若标记“真实环境：必须”，在真实 NTU Learn 完成证据验证；
4. 阶段自身验收通过后可直接继续下一阶段，不需要每个 Phase 都停下来等待产品侧确认；
5. 产品侧人工 Review 只在有意义的 Milestone Gate 停止：Phase 1–4、Phase 5–9、Phase 10–12、Phase 13–15；
6. 如果出现 Product-impacting Technical Conflict 或关键测试无法在当前范围内解决，则无论是否到 Milestone Gate 都立即停止并回产品侧。

## 2. 阶段 1｜Project foundation

**目标**

建立全新正式 MVP 工程基线，与 Spike 实验代码隔离，同时建立清楚分离、可独立测试的 `extension/` 与 `backend/` foundation。本阶段不实现完整 AI Extraction。

**主要实现内容**

- 建立 `extension/`：Popup、Service Worker、Content Script、Page Bridge、Parser Worker、shared domain、repository、test fixtures 的目录边界；
- TypeScript 严格模式、格式化、lint、单元测试、扩展构建与开发加载流程；
- Manifest V3 最小权限：storage、活动 Tab / scripting 所需项、NTU Learn 主站范围、运行时附件 `optional_host_permissions`；
- 定义 domain schema、错误码、schema version、迁移入口与消息协议；
- 建立 `backend/` 最小项目结构、启动入口、测试环境和 vendor-neutral deployment boundary；
- 定义 `/installation/register`、`/ai/extract` 的 request / response schema，但不接通完整 AI 提取流程；
- 建立 DeepSeek client adapter 边界，锁定 Provider `DeepSeek`、Model `deepseek-flash`，不实现 Model Router；
- 建立 server-side Secret loading，只读取 `DEEPSEEK_API_KEY` 或运行环境等价 binding；
- 建立 anonymous installation domain，以及 rate-limit、usage-cap、global-budget 的可配置边界；
- 添加不含真实值的 `.env.example`，并在 `.gitignore` 排除 `.env`、`.dev.vars` 和本地 Secret 文件；
- 建立 fixtures 脱敏规则，禁止提交 Cookie、Token、Signed URL query、课程个人数据；
- 建立 Extension / Backend CI：typecheck、unit、integration fixture、build、manifest validation、secret scan。

**依赖**

无；以 07 技术设计为输入，不复制 Spike 工程结构。

**验收条件**

- 可构建并在目标 Chrome 加载空壳扩展；
- Backend 可以在测试环境启动，Extension / Backend 工程边界清楚；
- 4 个主要界面仅有路由骨架，不实现业务；
- Service Worker 重启后可从存储读取 schema version；
- CI 全通过，生产包无远程执行代码；
- 权限清单逐项有用途说明，无广泛已授予 Blackboard 域权限；
- Backend 测试环境可以从 server-side Secret boundary 读取假值；生产代码不硬编码 Key；
- Extension bundle 与 Git tracked files 中不存在 DeepSeek API Key、真实 Secret、installation token；
- `.env` / `.dev.vars` 未被 Git track，`.env.example` 只有变量名和说明；
- Phase 1 没有直接实现完整 AI Extraction、全套 UI、Scan again 或多格式复杂支持。

**主要风险**

Manifest 权限声明过宽；构建工具生成不兼容 Service Worker 的代码；fixture 或环境文件泄露真实数据；Extension / Backend schema 漂移；过早把 Backend 扩成完整云产品。

**真实 NTU Learn 环境验证**

需要（轻量）：确认扩展能在目标 Chrome 与 NTU Learn 页面加载，且安装时权限提示符合预期。

## 3. 阶段 2｜Current course detection / routing

**目标**

可靠识别当前 Course ID，并按产品规则路由到 Saved Courses、Scan、Scan Ready 或 Course Brief；同一课程存在 active / recoverable Scan 时，其优先级高于旧 Course Brief。

**主要实现内容**

- Content Script 解析 Ultra course route；
- 获取 Course Code / Name 展示元数据；
- 原生 Course ID 与本地 Course 记录匹配；
- Popup Entry Router；
- Active Scan 查询与优先路由：Scanning、Waiting for Permission、Interrupted / Continue；
- Saved Courses 最小列表及点击路由；
- 非课程页、未识别页、Tab 导航变化和缺失 Content Script 的安全降级。

**依赖**

阶段 1。

**验收条件**

- fixture 覆盖课程页、非课程页、错误路由、名称变化和 active scan；
- 未扫描课程进入 Scan Ready；已保存课程进入 Course Brief；非课程页进入 Saved Courses；
- 不用课程标题猜测 Course ID；
- 已扫描课程即使有待 Review，仍先落 Course Brief；
- `已有 Brief → Scan again → Scanning → Popup close/reopen` 回到当前 Scan；
- `已有 Brief → Scan again → Waiting for Permission → close/reopen` 仍显示 Allow / Continue without them；
- `已有 Brief → Scan again → Service Worker 中断 → reopen` 显示 Interrupted / Continue / Retry，旧 Brief 仍保留。

**主要风险**

NTU Learn 路由变化、单页应用导航事件、Course Name/Code 选择器不稳定。

**真实 NTU Learn 环境验证**

必须：至少在当前 Spike 课程及另一门不同课程验证；同时验证课程内导航和返回非课程页。

## 4. 阶段 3｜Scan discovery

**目标**

建立可 checkpoint、可去重的来源发现闭环，先覆盖页面与 Announcement，再加入 Assignments、文件和多层 folder。

**主要实现内容**

- Scan 创建、阶段状态、discovery queue、分页 cursor、visited set；
- Content API 根节点与多层容器遍历；
- Announcement 列表和正文发现；
- Assignment 原生类型与内容模块线索适配器；
- 附件 relationship 收集；
- 明确区分 leaf、unsupported node、probe error、真实 traversal failure；
- Source identity、parent linkage、canonical URL、discovery path；
- 轻量 Scan UI 任务列表，不显示百分比 / ETA。

**依赖**

阶段 1–2。

**验收条件**

- fixture 可遍历 3 层、分页、重复 item、环路和单分支失败；
- 同一 native item 不重复入队；相同附件不重复下载；
- 正常 leaf 不被计为 issue，真实未完成分支进入 issue；
- 关闭 / 重启 Service Worker 后队列可恢复；
- Coverage 只描述已发现来源。

**主要风险**

Assignments 类型差异、speculative child probe 误判、多层内容遗漏。

**真实 NTU Learn 环境验证**

必须：验证页面、Announcements、Assignments/学习模块、至少三级 folder 和分页；与手工来源清单对照。

## 5. 阶段 4｜Fetch / attachment permission

**目标**

在浏览器现有登录态下读取页面与附件；按实际发现的精确 origin 请求权限，并保证 Deny 后继续。

**主要实现内容**

- 同源 API fetch 与附件 redirect chain 诊断；
- `permissions.contains`、pending origin queue、同 Scan 去重；
- Popup 中由用户点击触发 `permissions.request(exactOrigin)`；
- Waiting for Permission、Allow、Continue without them；
- Allow 后恢复对应 Source，Deny 后 Permission Denied + Partial；
- HTTP、MIME、Content-Disposition、文件签名和大小校验；
- 下载取消、临时 buffer 生命周期、脱敏日志。

**依赖**

阶段 3；阶段 1 的 manifest 权限边界。

**验收条件**

- 未授权 origin 不自动弹权限；扫描可继续其他来源；
- 同一 Scan / 同一 origin 只请求一次；
- Allow 后只恢复关联 Sources；Deny 后可正常 Partial；
- Popup 在 Waiting 时关闭再打开仍可操作；
- 真实 PDF 字节签名和 hash 正确；不读取或记录凭证；
- 没有切换为广泛已授予域权限。

**主要风险**

Chrome 用户手势链失效、重定向跨多个 origin、Cookie 行为、实际权限提示范围。

**真实 NTU Learn 环境验证**

必须：对一个尚未授权的真实 Blackboard / Xythos origin 分别跑 Allow 与 Deny；验证恢复、Partial 和重复请求抑制。若精确授权不可行，停止并提交产品影响冲突。

## 6. 阶段 5｜Parsers

**目标**

先用 PDF 建立格式识别、单文件隔离和按位置输出文本的 vertical slice，再补齐 PPTX、DOCX、legacy 识别与大文件增强。PPTX / DOCX 仍属于 MVP，不因顺序调整而删除。

**主要实现内容**

**阶段 5A｜最小 Parser vertical slice**

- 文件签名 / 容器识别基础；
- PDF.js 按页解析与 page partial；
- Parser Worker / Offscreen Document、超时、取消、内存释放；
- 先接到阶段 6–9：Normalize → DeepSeek → Review → Course Brief，形成一个真实 PDF 完整闭环。

**阶段 5B｜MVP 格式补齐**

- PPTX ZIP/XML 按 slide 顺序、表格和 locator；
- DOCX ZIP/XML 按段落 / 表格顺序和 locator；
- legacy PPT / DOC OLE 识别后 Unsupported；
- 大文件分批、输出上限与单文件错误边界增强。

**依赖**

阶段 4 的可靠字节输入。

**验收条件**

- 5A：固定 PDF fixture 输出顺序与 locator 正确，并跑通 PDF 的真实最小闭环；
- 5B：固定 PPTX / DOCX fixtures 输出顺序与 locator 正确；
- 假扩展名、损坏 ZIP、加密/不可读文件、空文本页、超限文件有明确状态；
- legacy 文件不进入 OOXML parser，并显示 Unsupported、无 Retry；
- 一个 parser 崩溃不影响其他文件；临时数据在结束后释放；
- Spike 的 32 MiB 不被误用为产品要求，正式上限有测试数据和记录；
- 在真实 NTU Learn 样本完成端到端验证前，PPTX / DOCX 明确保持 NOT TESTED，不用 fixture 宣称真实 PASS。

**主要风险**

复杂表格、多栏、扫描 PDF、Office 特殊对象、大文件内存峰值。

**真实 NTU Learn 环境验证**

5A 必须：真实 PDF vertical slice。5B 必须补真实 PPTX / DOCX 端到端样本；legacy PPT / DOC 至少验证真实识别；若没有样本，明确保持未验证。

## 7. 阶段 6｜Source normalization

**目标**

把不同来源转成统一、可追溯、可分批送 AI 的文本单元。

**主要实现内容**

- 页面、Announcement、Assignment、PDF page、PPT slide、DOC section 的统一 NormalizedUnit；
- Source ID、parent / child、content hash、locator、excerpt；
- URL、item、内容 hash 三层去重；
- 保留多个出处，不因相同内容删除 provenance；
- 文本清理、语义块切分与 token / 字节预算；
- 原文证据与规范化文本分离。

**依赖**

阶段 3–5。

**验收条件**

- 相同 item、不同 signed URL 不重复处理；
- 相同内容在不同来源可共享 hash 但保留两个 Source；
- 每个规范化块可回到具体 page / slide / section；
- normalization 不修改日期、权重或课程事实含义。

**主要风险**

动态 URL canonicalization 过度合并；切块破坏表格关联；页面噪声导致 hash 不稳定。

**真实 NTU Learn 环境验证**

需要：对真实重定向附件、重复链接、页面与文件重复内容抽查。

## 8. 阶段 7｜AI extraction

**目标**

只提取 PRD 允许的候选，并以证据、冲突与不确定性路由到 Detected / Needs Review。

**主要实现内容**

- Extension-side AI Client：chunking、batching、最小输入、request schema、Source / Evidence references、response validation、Candidate 本地落库和 error mapping；
- Backend-side AI Proxy：`/installation/register`、anonymous installation token、`/ai/extract` Bearer authentication；
- Provider 固定为 DeepSeek，Model 固定为 `deepseek-flash`；保留薄 adapter，不实现 Provider Router、模型选择或 fallback；
- Backend Secret loading：只从 `DEEPSEEK_API_KEY` 或运行环境等价 binding 读取；
- per-installation rate limit、per-installation usage cap、global usage / budget guard；
- registration abuse protection：IP / network、频率或 installation creation limit 的最小可配置保护；
- DeepSeek timeout、官方错误码映射、仅对安全瞬时错误有限 retry；
- Assessment、Important Date、Important Rule JSON Schema；Date / Rule 必须能结构化表达 `scope` 与可选 parent Assessment relationship；
- D-015 Grade-Impact prompt gate：course-level Important Rule 只允许直接或短且明确影响 marks / grading / assessment validity / eligibility 的规则；Assessment-specific Rule 归入 Assessment；
- conservative local boundary validator：只做明显 policy boilerplate 的保守 backstop，不创建 Candidate，不脑补远距离 grade impact；
- D-015 evaluation / regression：固定 Turnitin 正例、copyright / recording 反例、attendance 正反例、academic-integrity 正反例；
- evidenceRefs 必填、Source 存在性校验；
- 日期/时间/时区解析门禁；
- 冲突、模糊日期、是否计分不确定、`assessment-specific vs course-wide` 归属或 parent 关联不确定的 risk routing；
- semanticKey、同 Scan 去重与 assessment-date / assessment-rule 关联；
- 发送数据审计与敏感字段过滤；
- AI 单批失败隔离。

**依赖**

阶段 6；产品 PRD 的 AI / Data Boundary。

**验收条件**

- 无 evidence 的候选被拒绝；AI 不能直接写 Brief；
- 未认证请求不能触发 DeepSeek；无效 token 不能触发 DeepSeek；
- Rate Limit、Usage Cap、Global Budget Guard 任一触发后均不调用 DeepSeek；
- registration endpoint 不能无限生成身份；
- Extension bundle、GitHub 与客户端响应不含 DeepSeek API Key；
- Backend 从 server-side Secret 读取 Key，日志不记录 Key 或 installation token；
- 实际 DeepSeek 请求明确使用 `deepseek-flash`，不存在 Pro、其他模型或 Provider fallback；
- DeepSeek 输出仍须通过本地 response schema 与 evidence 校验后才可落 Candidate；
- “Week 7”无可靠映射时不生成确定日期；
- 冲突日期保留全部 evidence 并进入 Needs Review；Assessment-specific vs course-wide 归属不明确时也必须进入 Needs Review；
- 非计分不确定任务不自动确认为 Assessment；
- mandatory course-wide Turnitin / NTULearn submission channel 必须可进入 Important Rule；
- copyright / redistribution / recording policy 在无明确近距离 grade consequence 时必须被排除；
- 普通 attendance expectation 在无 grade consequence 时不得进入 Important Rule；明确影响 marks / assessment eligibility 时应进入；
- generic policy boilerplate 不得仅因语气严肃或“重要”进入 Review；不得通过远距离 disciplinary chain 推导 grade impact；
- 输出范围不含 Weekly Map、材料总结、Chat 等非 MVP 内容；
- 测试确认不发送凭证、成绩、提交记录和无关个人信息。

**主要风险**

模型输出漂移、跨 chunk 关联错误、成本与延迟、课程表达差异、匿名注册滥用、共享预算耗尽、Provider 错误映射不当、Secret 泄露。

**真实 NTU Learn 环境验证**

必须：用人工基准答案评估真实课程；不预设无证据的百分比门槛，记录漏检、误检、错关联和 Review 成本。

## 9. 阶段 8｜Review state

**目标**

实现一个 Review 界面、两个处理区和可靠自动保存。

**主要实现内容**

- Candidate 状态机：Detected、Needs Review、Confirmed、EditedConfirmed、Ignored；
- Needs Review 单条 Confirm / Choose、Edit、Ignore、Skip、View Source；
- Detected 按三类分组与分类级 Confirm all；Assessment-specific Date / Rule 仍留在原类别并显示 `Applies to <Assessment>`；
- 短暂 Undo（若实现）仅回滚本次批量操作；
- Review Progress 数量、自动保存、中途退出恢复；
- 原始 Candidate / Evidence 不可变保存。

**依赖**

阶段 7。

**验收条件**

- 无全局 Confirm all；批量操作只更新仍为 Detected 的当前类别，确认 child Date / Rule 不得自动确认 parent Assessment；
- Skip 不改变状态、不计入 reviewed；
- 重开 Popup 后状态与数量一致，无需恢复滚动位置；
- Edit 后直接 Edited + Confirmed；
- Source 默认隐藏，打开后证据定位有效；
- 最后一条处理完成后直接进入 Course Brief。

**主要风险**

并发写入覆盖、批量确认误操作、Review 进度和 Candidate 状态不一致。

**真实 NTU Learn 环境验证**

需要：以真实候选完成一轮包含 Confirm / Edit / Ignore / Skip / batch confirm 的 Review。

## 10. 阶段 9｜Course Brief

**目标**

实现课程事实层、用户编辑/新增以及最小字段级 Unresolved。

**主要实现内容**

- Assessments、Other Important Dates、Important Rules 固定 top-level 结构；Assessment-specific Date / Rule 归入 parent Assessment；
- Candidate 确认后事务性创建 / 关联 Brief Item；
- Confirmed、EditedConfirmed、UserAddedConfirmed；
- 主体确认 + 少量字段 Unresolved；
- Course Brief 内 Resolve；
- 单条 Edit、分类内 Add；
- Continue review 与 Partial / View issues 独立提示；
- View Source / Details 默认折叠。

**依赖**

阶段 8。

**验收条件**

- 整条未确认 Candidate 不进入 Brief；
- Assessment 关联 Date / Rule 分别不在 Other Important Dates / Important Rules 重复显示；
- Edit / Resolve 不覆盖或删除原 evidence / raw value；
- User-added 可无 Source，但明确 origin；
- 无待 Review / Partial 时顶部无占位提示；
- 重开浏览器后 Brief、child → parent relationship 与 unresolved field 完整恢复；
- child 已确认但 parent 未确认时不得自动创建已确认 parent；parent 最终 Ignore / Reject 时 child 不得静默变成 course-level。

**主要风险**

主体与字段状态混淆、同一日期重复、用户事实被候选写入覆盖。

**真实 NTU Learn 环境验证**

需要：从真实 Review 形成 Brief，并验证 unresolved date、Edit、Add、Source 回查。

## 11. 阶段 10｜Error / Partial / Interrupted

**目标**

实现两层异常模型、checkpoint 恢复和不破坏已有 Brief 的失败路径。

**主要实现内容**

- Scan 状态：Ready、Scanning、Waiting for Permission、Complete、Partial、Failed、Interrupted；
- Source 原因：Permission Denied、Unsupported、Parsing Failed、Could Not Access、Interrupted Processing；
- lease / heartbeat、Service Worker 回收检测、显式 Cancel；
- Continue 同 scanId，Source Retry 从安全阶段，Full Try again 新 scanId；
- Scan Overview、View issues、No Items Detected；
- 恢复动作只在真实可行时出现。

**依赖**

阶段 3–9；Repository 事务能力。

**验收条件**

- 单 Source 失败 → Partial 且 Review 可继续；
- 无可信结果 → Failed，不进入正常 Review；
- 未正常走完 → Interrupted，不能变成 Partial；
- Unsupported 无 Retry；0 items 不是 Failed；
- Popup 关闭不是 Cancel；显式 Cancel 产生 Interrupted；
- 强制终止 Service Worker 后可检测中断并 Continue；
- 任一 Failed / Interrupted / Cancel 都不清空旧 Brief。

**主要风险**

Chrome 生命周期竞争、重复 worker、事务提交一半、恢复时页面登录态已失效。

**真实 NTU Learn 环境验证**

必须：真实触发 Permission Denied、单文件解析失败、断网/访问失败、Popup 关闭、Service Worker 终止、Cancel 和 Continue。

## 12. 阶段 11｜Calendar export

**目标**

只从 Course Brief 的 Confirmed Date 生成正确 `.ics`。

**主要实现内容**

- 可导出日期 query；默认全选与取消选择；
- RFC 5545 序列化、稳定 UID、文本转义、CRLF / line folding；
- 全天事件、明确时间和时区处理；
- Blob 下载；
- 标题、课程、类型和必要权重的轻量信息。

**依赖**

阶段 9 的 Brief / field state。

**验收条件**

- Detected、Needs Review、Ignored、Unresolved date 均不出现；
- Edited / User-added 的最终确认日期被使用；
- 同一关联日期不重复；
- `.ics` 可由至少两个常见日历客户端导入，日期、时间、标题正确；
- Calendar 层不允许编辑或重判课程事实。

**主要风险**

时区、全天事件边界、重复 UID、特殊字符。

**真实 NTU Learn 环境验证**

不依赖 NTU Learn；但必须使用真实 Course Brief 数据导出后人工核对。

## 13. 阶段 12｜Scan again

**目标**

实现主动全量重新扫描，同时保护 Confirmed、Edited、User-added 与 Review 进度。

**主要实现内容**

- 新 scanId、旧 Brief 只读保护；
- 本轮 Candidate 去重；
- semanticKey + source/evidence + value + parent Assessment relationship 的保守匹配；
- 完全相同事实建立关联但不重复要求 Review；
- 新值 / 冲突 / parent relationship 变化或不确定项进入 Review 或 Resolve；
- Source Retry 同 scanId 幂等；
- 不发现旧 Source 时不删除、不标 Possibly Removed；
- Ignored 不跨 Scan 抑制。

**依赖**

阶段 3–10 全链路。

**验收条件**

- Scan again 前后的旧 Brief byte-level / domain-level 保护测试通过，除非用户在 Review 明确确认变更；
- Edited 与 User-added 永不被自动覆盖；
- 相同 Source Retry 不生成重复 Candidate；
- 上轮 Ignored 可在新 Scan 再出现；
- 不出现 New / Changed / Possibly Removed 产品状态；
- 新一次 Failed / Interrupted 后旧 Brief 仍为默认主界面事实。

**主要风险**

过度匹配导致隐藏新冲突；匹配不足导致重复 Review；误把去重做成 Change Detection。

**真实 NTU Learn 环境验证**

必须：对同一课程连续扫描，期间用 fixture 或真实可控来源制造相同、冲突、新候选、旧来源缺失四种情况。

## 14. 阶段 13｜Integration

**目标**

把所有模块连成可恢复、可观测的真实 MVP 闭环。

**主要实现内容**

- 模块消息协议与版本检查；
- 端到端状态订阅和 UI 路由；
- 跨上下文错误传播与用户文案映射；
- 数据迁移、安装/升级、存储容量观察；
- 性能与 AI 成本记录；
- 打包、权限审计、隐私边界审计。

**依赖**

阶段 1–12。

**验收条件**

- 自动化扩展 E2E 跑通 Entry → Scan → Review → Brief → `.ics` → Saved Courses；
- 同时跑通 Allow / Deny、Partial、Failed、Interrupted、No Items、Scan again；
- 重启 Chrome / 重载扩展后的可恢复路径符合设计；
- 生产包权限与外部请求均在批准范围内；
- 无正式 MVP 之外的 UI 或能力。

**主要风险**

跨上下文时序、真实数据规模、模型限流、浏览器版本差异。

**真实 NTU Learn 环境验证**

必须。

## 15. 阶段 14｜MVP testing

**目标**

用人工基准答案和多个真实课程验证用户价值与已知风险，而非只验证技术调用成功。

**主要实现内容**

- 为多门结构不同课程建立人工基准：Assessment、Date、Rule、关联、重要 Source；
- 验证跨课程兼容性、Assignments、三级以上 traversal；
- 真实 PDF / PPTX / DOCX / legacy 识别；
- 大文件、无文本页、损坏文件、重复附件；
- Review 成本、Source 定位有效性、用户修改量；
- 日期最高风险专项、Calendar 导入专项；
- 安全/隐私/最小权限测试。

**依赖**

阶段 13。

**验收条件**

- 每门课程都有人工基准对照报告和错误分类；
- Complete / Partial / Failed / Interrupted、Unsupported、Permission Denied、Parsing Failed、No Items 全部有证据；
- 关键 Deadline 不会在不确定时自动进入 Confirmed；
- 未解决日期不能导出；
- 用户能比手工重读更低成本形成可用 Brief；
- 所有 KR-01 至 KR-06 均标明“已验证 / 仍有风险 / 产品影响”。

**主要风险**

真实样本不足、测试课程不代表总体、缺少 legacy / Office 文件、没有可控冲突样本。

**真实 NTU Learn 环境验证**

必须，且不能只使用 Spike 的单一课程。

## 16. 阶段 15｜Final acceptance

**目标**

依据 PRD、Decision Log、Interaction / IA 和本技术设计完成正式 MVP Gate，并明确是否交回产品侧。

**主要实现内容**

- 逐条验收产品规则与 non-goals；
- 汇总自动测试、真实环境、人工基准、权限、格式与风险证据；
- 记录实现偏差、Known Risks、限制和未通过项；
- 验证文案不制造完整性承诺；
- 最终 build、扩展安装包和验收报告。

**依赖**

阶段 1–14 全部完成。

**验收条件**

- PRD 核心闭环完整跑通；
- 4 个主要界面和所有恢复路径符合 06；
- D-001 至 D-014 无静默改写；
- 不包含 Chat、Reminder、Dashboard、自动 Change Detection、Ignore memory；
- 已确认事实保护、Source 证据保留、Calendar 门禁通过；
- 所有未解决风险有证据、影响和产品侧可理解结论；
- 产品侧可基于验收材料决定发布、继续修正或调整范围。

**主要风险**

个别真实环境能力仍未验证；风险被“构建成功”掩盖；实现偏差未升级为产品确认。

**真实 NTU Learn 环境验证**

必须完成并由人工复核。

## 17. 阶段停止与回报规则

开发过程中出现以下任一情况，停止当前阶段并交回产品侧：

- 动态精确 host permission 实际不可行或只能以广泛权限呈现；
- 为跑通流程必须改变 4 个主要界面、Review、Course Brief、Calendar 或 Saved Courses 边界；
- 必须扩大到 PRD 明确 Non-goal 才能继续；
- 真实 legacy 文件频率使 Unsupported 显著破坏 MVP，但加入 parser 会扩大范围；
- 外部 AI 数据边界无法满足；
- 任何方案会自动覆盖 Confirmed / Edited / User-added 事实。

回报必须包含：冲突产品规则、技术限制、复现证据、可选方案、各方案影响和技术建议，不直接实现产品变更。

## 18. 实现顺序总览

| 阶段 | 主要闭环贡献 | 真实 NTU Learn |
|---|---|---|
| 1 Foundation | 可加载、可测试、最小权限 | 轻量需要 |
| 2 Course Detection | Entry / Routing | 必须 |
| 3 Discovery | 找到真实来源 | 必须 |
| 4 Fetch / Permission | 取得真实内容 | 必须 |
| 5 Parsers | 文件转文本 | 必须 |
| 6 Normalization | 统一证据 | 需要 |
| 7 AI Extraction | 形成候选 | 必须 |
| 8 Review | 用户确认 | 需要 |
| 9 Course Brief | 形成事实层 | 需要 |
| 10 Errors / Recovery | 可恢复 | 必须 |
| 11 Calendar | 可行动输出 | 使用真实 Brief |
| 12 Scan again | 保护事实并重扫 | 必须 |
| 13 Integration | 完整闭环 | 必须 |
| 14 MVP Testing | 真实价值与风险 | 必须、多课程 |
| 15 Final Acceptance | 发布前 Gate | 必须 |

## 19. Implementation Plan Gate

> **IMPLEMENTATION PLAN COMPLETE — FORMAL MVP GATE D PASS**

本计划的 15 个 Phase 已全部执行完毕，不再是当前执行入口。

| Gate | Phases | 结果 |
|---|---|---|
| A | 1–4 | PASS |
| B | 5–9 | PASS |
| C | 10–12 | PASS |
| D | 13–15 | PASS（2026-09-17） |

最终自动化结果为 Contracts 2、Extension 124（27 个文件）、Backend 20（5 个文件），其余 CI 门禁零失败。两门真实 NTU Learn 课程的完整闭环、精确权限、失败/恢复与日历导入已通过。真实 PPTX、DOCX、legacy Office、超大、无文本与损坏样本保留 `NOT TESTED`。KR-07、KR-08 是开放缺陷。

v0.1.1 或下一版工作必须在产品侧形成新决定后由新的 Implementation Plan 承接；不得在本文档上继续追加执行阶段。
