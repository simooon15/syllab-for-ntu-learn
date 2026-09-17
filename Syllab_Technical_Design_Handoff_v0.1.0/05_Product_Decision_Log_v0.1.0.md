# Syllab — 产品决策记录 — v0.1.0

> **产品版本**：v0.1.0  
> **更新时间**：2026-09-16  
> 本文档记录会影响产品行为、交互边界或后续技术设计的正式产品决定。  
> 已确认决定不得由后续开发自行改写；如果技术条件与已确认产品方向冲突，应回到产品侧确认。

---

# 1. 使用格式

每条决策包含：

- **状态**
- **观察**
- **为什么重要**
- **产品决定**
- **对后续阶段的影响**
- **决定日期**

---

# 2. 当前决策

## D-001｜Blackboard 附件域权限策略

**状态**：方向已确认；具体实现待技术设计

### 观察

在真实 NTU Learn 课程中，附件访问链为：

`ntulearn.ntu.edu.sg` → `alt-…blackboard.com` → `…xythos.prod.files.blackboard.com`

真实 Spike 已证明，在获得实际需要的精确附件域权限后，扩展可以取得真实 PDF 字节。但当前没有证据证明这些域名在所有课程、学期、地区或 Blackboard 部署中固定。

### 为什么重要

正式扩展需要在不要求用户逐个下载文件的前提下读取课程附件。权限范围会直接影响：

- 用户信任；
- 扫描是否能自动完成；
- 不同课程环境的兼容性；
- Chrome 权限提示。

### 产品决定

> 优先使用动态、精确的附件 host permission。

产品只在真实发现新的 Blackboard / Xythos 文件域时，请求该实际需要的精确权限。

如果用户不允许：

- 其他可处理来源继续扫描；
- 当前 Scan 可以以 Partial 结束；
- 同一次 Scan 不反复请求；
- 最终 Coverage 必须明确显示未访问来源。

具体 Chrome 权限 API、用户手势约束和失败回退方式留给技术设计。

如果动态精确授权在技术上不可行，不得自行改成广泛 `*.blackboard.com` 权限，必须回到产品侧确认。

### 对后续阶段的影响

技术设计需要确认：

- 精确域权限的申请时机；
- 用户手势约束；
- 授权后的恢复方式；
- 拒绝后的 Partial 路径。

**决定日期**：2026-09-16

---

## D-002｜MVP 核心信息架构

**状态**：已确认

### 观察

MVP 已经完成详细交互与信息架构设计。为了避免把每种状态都做成独立页面，需要明确主要界面与状态的边界。

### 产品决定

MVP 只有 4 个主要界面：

1. Saved Courses
2. Scan
3. Review
4. Course Brief

其中：

- 扩展入口只负责路由，不是独立页面；
- Scan Overview 属于 Scan 的结束状态；
- Permission、Source、Edit、Add、Resolve、Calendar Export 都是临时交互；
- Scan 和 Review 是任务流程；
- Course Brief 是已扫描课程的长期主界面。

MVP 不使用 `Brief / Review / Scan / Calendar` 这类多标签导航。

### 对后续阶段的影响

技术设计应围绕这 4 个主要界面建立状态和路由，不要自行扩展成更多独立页面。

**决定日期**：2026-09-16

---

## D-003｜扩展入口与默认落点

**状态**：已确认

### 产品决定

打开 Syllab 时采用：

> 当前课程上下文优先。

规则：

- 当前在可识别的 NTU Learn 课程页：
  - 未扫描 → Scan Ready；
  - 已扫描 → Course Brief。
- 当前不在可识别课程页 → Saved Courses。
- 从 Saved Courses 点击已扫描课程 → Course Brief。
- 即使仍有待 Review 内容，也先进入 Course Brief，再通过 `Continue review` 进入 Review。

### 对后续阶段的影响

技术设计需要支持可靠的当前课程识别和课程级路由，但不需要额外 Home 页面。

**决定日期**：2026-09-16

---

## D-004｜Scan 启动、进度与 Coverage

**状态**：已确认

### 产品决定

首次扫描必须由用户明确点击：

> `Scan this course`

Scan Ready 只做轻量说明：

- 会扫描哪些大类来源；
- 结果需要 Review；
- 某些课程文件可能需要额外权限。

不允许用户手动选择扫描来源。

Scan Progress 使用轻量任务列表，例如：

- Reading course pages
- Reading announcements
- Reading assignments
- Processing documents
- Extracting course information

不显示：

- 百分比；
- ETA；
- 技术日志；
- 虚假的完成比例。

Coverage 统一在 Scan 完成后的结果概览展示。

Coverage 可以显示：

- 已处理来源数；
- 有问题来源数；
- 提取结果数；
- Needs Review 数。

不显示无法证明的 Coverage 百分比或 “100% complete”。

### 对后续阶段的影响

技术设计可以自由决定真实执行顺序，但用户界面不得把任务列表解释成严格技术流水线或精确进度。

**决定日期**：2026-09-16

---

## D-005｜Review 结构与批量确认

**状态**：已确认

### 产品决定

Review 使用一个主要界面，包含两个处理区：

1. Needs Review
2. Detected

Needs Review：

- 优先展示；
- 逐条处理；
- 支持 Confirm / Choose、Edit、Ignore、Skip for now、View Source；
- 直接显示用户做判断需要的最小冲突或缺失信息；
- 不显示 AI confidence 百分比。

Detected：

- 按 Assessments / Important Dates / Important Rules 分组；
- 每类支持分类级 `Confirm all`；
- 单条仍支持 Confirm / Edit / Ignore / View Source；
- MVP 不提供全局 `Confirm all detected`。

分类级批量确认：

- 只作用于当前仍是 Detected 的项目；
- 不覆盖已 Edit / Ignore / Confirm 的项目；
- 不增加二次确认弹窗；
- 可以提供短暂 Undo。

Review 自动保存条目处理状态。

### 对后续阶段的影响

技术设计需要支持候选条目的独立状态保存，但不需要保存用户离开时的精确滚动位置。

**决定日期**：2026-09-16

---

## D-006｜Course Brief 是事实层，并允许未解决字段

**状态**：已确认

### 观察

一条课程信息可能不是整体不可信，而只是某个字段存在冲突。例如某个 Assessment 确定存在，但 Deadline 有两个不同日期。

### 产品决定

Course Brief 是 Syllab 当前课程的事实层。

正式进入 Course Brief 的主体包括：

- Confirmed；
- Edited + Confirmed；
- User-added + Confirmed。

如果：

- 主体已经可以确认；
- 只有某个字段存在冲突或缺失；

则允许：

> 已确认主体 + 未解决字段

进入 Course Brief。

例如：

```text
Final Presentation
Weight: 20%
Due: ⚠ Needs review
```

未解决字段必须明确标记，不能表现成已确认事实。

如果连条目本身是否成立都不确定：

- 整条继续留在 Review；
- 不进入 Course Brief。

未解决字段可以直接在 Course Brief 内 Resolve，不强制返回整个 Review。

未解决日期不能进入 Calendar Export。

### 对后续阶段的影响

技术设计需要支持最小范围的字段级状态，但不要把所有字段都扩展成复杂状态系统。

**决定日期**：2026-09-16

---

## D-007｜Course Brief 信息结构与证据展示

**状态**：已确认

### 产品决定

Course Brief 主结构为：

1. Assessments
2. Other Important Dates
3. Important Rules

Assessment 自身携带相关的：

- Deadline；
- Weight；
- Format；
- 其他确认字段。

已经绑定到 Assessment 的日期，不在 Other Important Dates 重复展示。

Assessment-specific Rule 的归属、Review 与不重复展示规则由 D-014 进一步明确。

Source 是证据，不是主内容。

因此：

- Course Brief 默认只显示当前可用事实；
- 原始 Source、原始提取值、冲突信息和必要修改信息继续保留；
- 这些证据默认隐藏；
- 用户通过 `View Source` / `View Details` 主动查看。

MVP 不做完整版本历史系统。

### 对后续阶段的影响

技术设计必须保留原始证据和当前事实的关系，但不要求主界面常驻展示这些数据。

**决定日期**：2026-09-16

---

## D-008｜Calendar Export

**状态**：已确认

### 产品决定

Calendar Export 从 Course Brief 统一进入。

MVP 不在每个日期旁边提供单独 `Add to calendar`。

只允许以下日期进入导出列表：

> Confirmed Date

未解决、Needs Review 或冲突日期不能进入。

进入导出交互后：

- 默认选中全部可导出的已确认日期；
- 用户只取消不需要的项目；
- 每条显示事件名、日期和必要的轻量类型信息；
- 不显示 Source、AI confidence、冲突历史；
- 不在 Calendar Export 内修改事实。

输出：

> `.ics`

### 对后续阶段的影响

Calendar Export 只能消费 Course Brief 的已确认日期，不能自行产生或修正课程事实。

**决定日期**：2026-09-16

---

## D-009｜Saved Courses 的 MVP 边界

**状态**：已确认

### 产品决定

Saved Courses 只承担：

- 课程导航；
- 当前处理状态。

课程卡片最多展示：

- Course Code；
- Course Name；
- 主要状态；
- 必要的次级问题。

可能状态包括：

- Not scanned；
- Completed；
- X items to review；
- Partial scan；
- X sources need attention。

如果 Review 与 Partial 同时存在，两者分别显示，不合并成模糊的 `Needs attention`。

MVP Saved Courses 不展示：

- Next Deadline；
- Assessment 数量；
- Deadline 数量；
- 跨课程任务；
- 跨课程 Calendar；
- Dashboard 分析。

### 对后续阶段的影响

不得在 MVP 技术设计中把 Saved Courses 扩展成 Multi-course Dashboard。

**决定日期**：2026-09-16

---

## D-010｜异常、Partial、Failed 与 Interrupted

**状态**：已确认

### 产品决定

采用两层异常模型：

> Scan-level 状态 + Source-level 原因

Scan-level：

- Complete
- Partial
- Failed
- Interrupted

其中：

### Partial

Scan 正常结束，但部分已发现来源：

- 权限未获得；
- 格式暂不支持；
- 解析失败；
- 无法访问。

Partial 不阻断 Review。

### Failed

无法形成可用、可信的扫描结果。

- 不进入正常 Review；
- 显示简短原因；
- 提供实际存在的恢复动作；
- 不删除已有 Course Brief。

### Interrupted

Scan 本身没有正常走完。

Interrupted 不等于 Partial。

关闭扩展：

> 不等于 Cancel。

只有用户明确执行 `Cancel scan` 才算主动取消。

如果关闭界面后技术上无法继续，下次应显示 Interrupted，并提供 Continue / Retry。

### Source-level 原因

包括：

- Permission denied
- Unsupported format
- Parsing failed
- Could not access source
- Interrupted processing

只有存在真实恢复路径时才显示 Allow / Retry / Continue。

Unsupported 不提供无意义 Retry。

### 对后续阶段的影响

技术设计需要确定后台生命周期、恢复点和 Retry 行为，但不得把 Interrupted 静默包装成 Partial 或 Complete。

**决定日期**：2026-09-16

---

## D-011｜Scan again 与已有事实保护

**状态**：已确认

### 产品决定

MVP 支持用户主动：

> `Scan again`

但它是次级操作，不是 Course Brief 的主操作。

Scan again：

- 不清空已有 Course Brief；
- 不无故覆盖 Confirmed；
- 不无故覆盖 Edited；
- 不无故覆盖 User-added；
- 新的或冲突的信息再进入 Review / Resolve。

MVP 不做：

- 自动 Change Detection；
- 后台持续监控；
- Changed / New / Possibly Removed 状态；
- 自动 Incremental Scan；
- Reminder。

### 对后续阶段的影响

技术设计需要决定重新扫描后的数据匹配、合并和去重方式，但必须满足已有事实保护规则。

**决定日期**：2026-09-16

---

## D-012｜MVP 中 Ignore 不跨 Scan 记忆

**状态**：已确认

### 产品决定

MVP 不做 Ignore memory。

如果某条候选：

```text
Scan
→ 用户 Ignore
→ Scan again
→ 同一内容再次被检测
```

则：

> 可以再次进入 Review。

MVP 暂不实现：

- 跨 Scan Ignore 抑制；
- 同一候选长期匹配；
- 实质变化判断；
- “之前 Ignore 过”的提示。

### 对后续阶段的影响

技术设计不需要为 v0.1.0 建立长期 Ignore 匹配机制。

**决定日期**：2026-09-16

---

## D-013｜External AI Access Architecture

**状态**：已确认

### 观察

MVP 需要调用外部 AI 完成结构化提取。Chrome Extension 如果直接持有 Provider API Key，会使 Secret 随客户端代码公开；公开 GitHub 也不能等于任何人都可以无限消耗 Syllab 的 AI 额度。同时，PRD 已允许外部 AI，并将具体模型和服务商策略留给 Technical Design。

### 为什么重要

AI 接入方式直接影响：

- DeepSeek API Key 安全；
- 用户是否需要账号或手动配置 Token；
- 外部 AI 数据边界；
- 滥用与成本控制；
- Course Brief 等长期产品数据是否进入云端。

### 产品决定

#### AI Provider 与模型

v0.1.0 只使用：

> **DeepSeek API**

唯一模型：

> `deepseek-flash`

MVP 不做多模型选择、Model Router、Flash / Pro 自动切换、用户切换模型或向其他 Provider 自动 fallback。代码可以保留薄 adapter 边界，但不因此实现多模型产品能力。

#### AI 调用架构

```text
Chrome Extension
→ Syllab Backend / AI Proxy
→ DeepSeek API (`deepseek-flash`)
→ Structured Candidate JSON
→ Extension 本地 Review
→ Course Brief
```

Chrome Extension 不直接调用 DeepSeek，也不持有 DeepSeek API Key。AI 仍只能生成候选，不能直接修改 Course Brief。

#### Secret Management

DeepSeek API Key：

- 只存在 Backend 的 server-side Secret / Environment Variable；
- 生产环境通过 `DEEPSEEK_API_KEY` 注入；
- 代码只从 `process.env.DEEPSEEK_API_KEY` 或运行环境等价方式读取；
- 不进入 Extension、不进入 GitHub、不硬编码、不通过客户端配置下发；
- 本地 `.env`、`.dev.vars` 和 Secret 文件必须被 `.gitignore` 排除；
- GitHub 只允许提交不含真实值的 `.env.example`。

#### Backend 产品边界

Syllab Backend 是：

> **轻量 AI Proxy + Access Control + Usage Protection**

它不是完整的 Syllab Cloud Backend，不因此长期保存 Course、Source、Evidence、Candidate、Review、Course Brief、完整 PDF / PPTX / DOCX 或 NTU Credentials。长期产品数据仍以浏览器本地存储为主。

v0.1.0 不锁定云厂商，可以部署到阿里云、腾讯云、Cloudflare 或其他合适的 Serverless / Backend Runtime。核心架构不得绑定具体厂商。

#### 无账号与匿名 Installation Authentication

v0.1.0 不做 Syllab Account、Google Login、NTU Login、Invite Code、用户手动输入 Access Token 或 Admin Dashboard。用户安装后应可直接使用。

采用匿名 installation identity + installation token：

```text
首次需要 AI
→ Extension 生成随机 installationId
→ POST /installation/register
→ Backend 创建 installation
→ Backend 返回独立 anonymous installation token
→ Extension 本地保存 token
```

后续调用：

```text
POST /ai/extract
Authorization: Bearer <installation-token>
```

Extension 不包含所有用户共用的 Secret，也不设计多层自研加密协议。

#### Anti-abuse 与用量保护

Backend 在调用 DeepSeek 前必须依次验证：

1. installation token 有效；
2. installation 未被禁用；
3. 未超过 per-installation rate limit；
4. 未超过 per-installation usage cap；
5. 未触发 global usage / budget guard。

任一检查失败，Backend 直接拒绝且不调用 DeepSeek。Registration endpoint 至少具备 IP / network rate limit、注册频率或 installation creation limit 等简单保护，不能成为无限生成免费身份的入口。具体阈值是可配置工程参数，待真实 MVP 使用数据出现后调整，不在本决定中写死。

#### AI 数据边界

Extension 只发送 AI Extraction 所需的最小课程文本与必要 metadata。Backend 默认不长期保存完整课程正文、完整课程文件、Prompt 原文、DeepSeek 完整输入或完整输出。

Backend 可以保存必要的脱敏运行信息，例如 request id、model、usage、latency、error code 和 installation usage counters。不得记录 Cookie、Authorization Header、NTU Credentials、signed URL secret 或无关个人数据。

### 对后续阶段的影响

- Technical Design 必须把 AI Gateway 拆为 Extension-side AI Client 与 Backend-side AI Proxy；
- Implementation Phase 1 同时建立 `extension/` 与 `backend/` foundation，但不提前实现完整 AI Extraction；
- AI Extraction 阶段必须验证认证、限速、用量上限、全局预算门禁、Secret 边界和 DeepSeek 输出校验；
- PRD、Technical Spike 与 Interaction / IA 不因此改变；
- 增加 Backend 不得扩展为账号、云课程数据库、Cloud Sync、Admin Dashboard 或多模型平台。

**决定日期**：2026-09-16

---


## D-014｜Assessment-specific Date / Rule Ownership

**状态**：已确认

### 观察

真实 NTU Learn vertical slice 已经出现大量明确属于 CA1、CA2、CA3、Final Examination 等 Assessment 的规则，同时也存在真正 course-level 的规则。原有产品文档已经明确 Assessment 可以拥有 Date / Rule 关系，并明确 Assessment 绑定日期不在 Other Important Dates 重复展示，但没有把 Assessment-specific Rule 的 ownership、Review 和 Course Brief 投影规则写死。

### 为什么重要

如果所有 `important_rule` 都按独立顶层事实处理，会：

- 把 Assessment-specific requirement 与 course-wide rule 混为一类；
- 增加 Review 成本；
- 让 Course Brief 失去来源中已有的课程结构；
- 造成同一事实同时出现在 Assessment 与 Important Rules 的重复展示；
- 让 Scan again 的匹配与去重缺少稳定 parent relationship。

### 产品决定

#### Ownership

与某个 Assessment 明确关联的 Date / Rule 属于该 Assessment；真正 course-level 的 Rule 才作为独立 Important Rules。

#### Review 结构

v0.1.0 保持现有单一 Review surface 与分类结构：

- Assessments；
- Important Dates；
- Important Rules。

Assessment-specific Date / Rule 仍作为独立、可审阅 Candidate 留在原类别中，并显示轻量 parent context，例如：

> `Applies to CA1`

不引入 nested Review。

#### Stable relationship

归属必须是正式结构化 relationship，不能只存在于 free-form 文本。技术字段命名由 Technical Design 决定，但必须能稳定表达：

- `course-level`；或
- `assessment-specific + parent Assessment reference`。

如果关系不明确，进入 Needs Review，不得猜测。

#### Confirmation semantics

确认 attached Date / Rule：

- 只确认该 child fact；
- 不自动确认 parent Assessment；
- 不自动确认 parent 的其他字段或 child facts。

`Confirm all important rules` 只确认当前 eligible Detected Rule candidates，不确认其 parent Assessment。

如果 child fact 已确认但 parent Assessment 尚未进入 Course Brief，child confirmation 可以保留，但不得因此自动创建已确认 parent。只有 parent Assessment 进入 Course Brief 后，该 child fact 才投影到其下；如果 parent 最终被 Ignore / Reject，child 必须重新 Review、重新归类或保持不进入 Brief，不能悄悄变成 course-level Rule。

#### Course Brief presentation / no duplication

确认后：

- Assessment-specific Date / Rule 显示在 parent Assessment 下；
- attached Date 不在 Other Important Dates 重复展示；
- attached Rule 不在 Important Rules 重复展示；
- 只有 course-level Rules 留在独立 Important Rules 区域。

优先复用少量自然字段（如 Format、Group / Individual）；其他 Assessment-specific Rules 使用 Requirements / Key Requirements 表达，不为每一种规则创建新的专用字段系统。

#### Course-level threshold

独立 Important Rules 仍只收 PRD 已定义的明确、高影响、action-governing requirements。普通 guidance、解释性内容和低价值细节不进入。

### 对后续阶段的影响

- Candidate contract 需要稳定 scope / parent Assessment relationship；
- Review 需要显示 parent context，但保持现有分类和 batch-confirm 语义；
- Brief persistence / projection 必须支持 child → parent，并防止顶层重复；
- Scan again matching 需要把 parent relationship 纳入保守匹配；
- 关系不明确必须进入 Needs Review；
- 不增加第五个 surface，不改变 Course Brief 三个 top-level structure，不扩大 MVP。

**决定日期**：2026-09-16

# 3. 当前未由产品侧决定的技术问题

以下问题已经明确属于技术设计，不应在本文档中自行定方案：

- Popup / Extension 关闭后的实际 Scan 生命周期；
- checkpoint 与恢复方式；
- Scan again 的候选匹配、合并和去重；
- Retry 后的结果合并；
- 字段级未解决状态的最小数据结构；
- 动态精确附件权限的 Chrome API 实现；
- PPTX / DOCX 真实端到端补充验证；
- legacy PPT / DOC 的最终兼容方式；
- traversal completeness；
- large file handling；
- parser 生命周期与失败隔离。

如果其中任何问题迫使产品行为发生变化：

> 停止自行扩大实现，回到产品侧确认。

---

## D-015｜MVP Important Rules 的 Grade-Impact Boundary

**状态**：已确认

### 观察

真实扫描中出现两类 course-level rule：

A：

> All written assignments must be submitted via Turnitin/NTULearn.

B：

> All course materials are for students’ own educational purposes only and shall not be uploaded, reproduced, distributed, republished, or transmitted without the University’s written approval; photographing, filming, audio recording, or otherwise capturing content during lectures and/or tutorials is not permitted.

如果只使用“影响学生行动”作为兜底条件，B 这类通用政策也容易进入 Important Rules，导致该类别变成政策垃圾桶。

### 为什么重要

MVP Course Brief 需要保留真正会影响学生成绩和 Assessment 完成的规则，同时避免把版权、材料传播、隐私、校园行为和大学政策 boilerplate 大量送入 Review。

### 产品决定

MVP Important Rules 的核心收录标准为：

> **违反后会直接，或通过很短且明确的因果链，影响 marks、grading、assessment validity、assessment eligibility，或有成绩要求的课程义务是否完成的 course-level rules。**

- Assessment-specific Rule 继续归入对应 Assessment；
- course-level Rule 才可能进入独立 Important Rules；
- direct grade impact 可以收录；
- 较近且明确的 indirect grade impact 可以收录；
- 远距离、推测性、依赖独立纪律流程的可能后果不收录；
- 不允许因为规则“重要”“正式”“禁止”或属于大学政策就自动纳入；
- 不允许根据常识脑补 disciplinary consequence → grade impact。

实例：

- A：**Include**。mandatory course-wide submission channel 直接约束有效提交方式。
- B：**Exclude by default**。无明确近距离成绩后果时，copyright / redistribution / recording policy 不进入 Important Rules。

典型 Inclusion：

- Late Penalty；
- 明确影响 marks 的 attendance threshold；
- 明确影响 assessment eligibility 的 attendance / prerequisite；
- mandatory course-wide submission channel；
- 明确导致 submission invalid / not graded 的 course-level format / process requirement。

典型 Exclusion：

- 通用 copyright / intellectual property；
- 材料不得转载、传播、上传；
- 一般禁止拍照、录音、录像；
- 通用 privacy / campus conduct / acceptable-use policy；
- 仅通过较远 disciplinary process 才可能影响学业的规则；
- 没有 grade / assessment consequence 的普通 attendance expectation。

如果通常属于 Exclusion 的规则在当前课程文本中明确给出近距离成绩后果，则按实际 Grade-Impact 判断。若后果只针对某个 Assessment，则归入该 Assessment。

### 执行责任

1. **AI Prompt**：主语义判断层；只提取符合 Grade-Impact Boundary 的 Important Rule；禁止远距离推测。
2. **Local deterministic validator**：保守 backstop；拦截没有 grade / assessment consequence 的明显 policy boilerplate；不创建 Candidate，不独立推导远距离 grade impact，不做激进 hard filter。
3. **Review**：最终用户确认；不作为明显 policy boilerplate 的垃圾回收层。近距离 grade impact 真实存在但事实仍有歧义时，可以进入 Needs Review。

### Evaluation 最小回归集

1. mandatory Turnitin / NTULearn submission channel → Include；
2. Late penalty → Include；
3. attendance 明确关联 participation marks / assessment eligibility → Include；
4. 普通 attendance expectation，无 grade consequence → Exclude；
5. copyright / redistribution / recording prohibition，无 grade consequence → Exclude；
6. general university conduct / privacy / acceptable-use policy，无 grade consequence → Exclude；
7. generic academic integrity policy link，无本课程具体成绩后果 → Exclude；
8. academic integrity rule 明确导致某 Assessment 0 marks → Include；Assessment-specific 时归入 Assessment。

### 对后续阶段的影响

- 不修改 Course Brief 主结构；
- 不修改 Review 主结构；
- 不修改 Candidate / Brief schema；
- 不修改 IA；
- 不修改 Provider / Model；
- 不修改 D-014；
- Phase 7 AI Extraction 的 Prompt、产品边界过滤和 Evaluation 按本决定收窄。

**决定日期**：2026-09-17
