> P2E-056 当前：RC1 Human Gate5 FAIL，已批准阶段 B，RC2 实施中，尚未可验收。以下旧状态/检查保留历史。

## P2E-056 RC2 当前实现边界（实现中，不是验收结论）

- 新工作流使用 `selective-draft/3`；旧工作流保持旧 policy 可恢复。Reader、全来源风险初查、Deep 阅读、原文 Clause、Source、Evidence 及已有 reducer/IDB/备份继续复用；没有 Outline-first。
- `course-product/1` 将观察组织为带类型/单位、disposition、业务 owner、父子/OR、力度、条件、例外、逐字支持和来源版本的候选命题。一条原文可支持多个不同命题；编译采用命题自己的 typed value，阻止旧标量被复制为新语义字段。Reference 保存但不作为当前学生任务/已认可要求展示。
- 模型输入按短 ID 引用去重的完整 native Evidence Catalog；原 ID/原文不变。Reader 的 value/context/state、Link 的 basis/state 是上游模型判断，不能成为新的证据；产品判断从原文重新作出。原观察仍留在不可变 CourseDraft 中，可追溯。候选必须通过引用、逐字引文、类型、scope、树关系及完整观察归宿校验，再独立语义审计。模型审计 PASS 仍不等于 Human PASS。
- 最多两轮结构修复及两轮语义修复，并防重复结果；未完成停为候选失败，不自动晋升。真实费用由请求前余额/最坏费用守卫和逐次原始 SSE/usage/ledger 记录，UNKNOWN 不重复派发。当前真实审计曾在平台配置/教学内容/继承不确定状态上反复错误，正继续核验；不得以多数模型同意签收。
- Review 以 Assessment 基础范围和独立风险/Issue 范围组织。目录/前后导航只有会话 cursor；Defer 保留待审项并推进。显示与编辑限制为同一 Fact ID 范围，Decision 记录范围与版本；IDB 提交事务再次校验课程 revision、Fact 更新时间、Source hash。独立待审范围不因父卡 Confirm 进入 trusted。Exclude 可 Undo，Undo 恢复待审而不认可；历史记录保留。
- Brief 用核心字段、结构化执行清单、Rubric/Reference、完整 Evidence 分层，避免 flat Fact/Rule 长段落。Scheme 不带子对象的隐式批准；结构性 Merge/Split 重绑定待审范围，不自动认可它们。RC1 数据与产物不覆盖，正式 trusted 不迁移；隔离 profile 的真实浏览器、增量/恢复与最终 CI 完成前不生成可验收声明。


> 当前 P2E-054 / 2026-10-11：最终 RC1 工程验收及唯一未确认 Human 入口已准备；详细结果、费用、通用性检查和限制见 artifacts/v0.3.0/goal-driven-054/RESULT.md。Human Gate 5 尚未通过；下文其他停止点和 PASS 是历史。

> 历史 P2E-053 / 2026-10-10：选择性阅读 + immutable CourseDraft 已接入生产新工作流，旧 native-global 按原版本恢复。全量 CI 878 tests 与隔离 Review 传递验证通过；真实 DeepSeek 18 次已知调用约 ¥1.08370752，第二初查计划 24 DEEP / 93 INSPECTED、160 整单元，已读 10 来源 / 306 Clause。完整真实 Link、真实增量和 Human Final Acceptance 尚未通过。原 UNKNOWN ¥5.572864 保留，原累计 ¥25 与新增调用 ¥7 双边界阻止下一派发；未重扫或采纳原正式成果。最新事实以 [P2E-053 实施记录](../../../artifacts/v0.3.0/goal-driven-053/RESULT.md) 为准；下文旧方案与旧 PASS 均为历史。


> 历史 P2E-052 / 2026-10-10：工程成果已整合，语义验收未完成，STOP_CNY_BUDGET_RESERVATION_BOUNDARY。当前实现、测试、失败、费用与恢复事实以 [P2E-052 工程收口记录](../../../artifacts/v0.3.0/goal-driven-052/RESULT.md) 为准；下文保留历史记录，历史 PASS 不代表当前最终验收。完整 B 与精简 C 分离；条款多引用必须逐条原文解码，禁止标题别名吞掉完整动作；用户修改来源保护与新字段显式接受路径已加入。v9 尚无真实模型通过。

# Syllab for NTU Learn — Technical Design v0.3.0

## P2E-050｜目标驱动隔离候选（2026-10-10）

当前状态 **ZERO_PAID_CANDIDATE_PREPARED / WAIT_NEW_PAID_AUTHORIZATION / GOAL_NOT_ACHIEVED**。已实现完整原生输入、严格来源/关系校验、持久恢复、纯候选 materialization、预算/CLI 适配器，并通过隔离 CI 817 tests。生产入口和正式 workflow 未接入新候选；新增付费 0 次，真实语义与跨课程能力未验证。不是最终架构选择或 Product Acceptance。详见 [本轮工程记录](GOAL_DRIVEN_SEMANTIC_ENGINEERING_v0.3.0.md)；后面的历史已实现方案保留，不强制成为 P2E-050 的技术路线。


## Semantic-046｜精确 wire / 独立 native facet / 共享语义预算

当前候选为 assessment-relevance/4、session /8、facet inventory /2；旧 /1、/2、/3 workflow/session 保持，facet /1 不升级。完整事实、实际语义FAIL和最终协议未真实复验的边界，以 Engineering Report Semantic-046及 semantic-046/{RESULT,COVERAGE,REPLAY} 为准。

Evidence字典由Source/locator/excerpt原字节形成稳定q引用，input一次递交引用表；回复可用singleton evidenceRef。Local精确展开原引文并继续严格provenance，原捕获响应不改；未知引用、额外key、来源错配仍拒绝。不是AI summary或语义修复。新 /4 Session保存实际System Prompt fingerprint，明确phase和共享预算，漂移拒绝FINAL复用；policy mismatch/snapshot/ownership fences继续生效。

B2一个Group有独立facet分解和synthesis durable sessions。分解最多3有效轮（预留合成），合成最多4−分解已完成轮；传输分片/carry read规则不变，跨两阶段总计仍不超过原Product最多4语义轮。phase未解决事项原样进入TaskB unresolvedIssues和C partialCoverage。Local不会判定指令是否重要、当前、合并或排除。

最终facet/2在分解输入递交准入Group Scope全部native units（原字段/locator/text/partial原字节），不只给索引/父清单假设。AI逐原生范围nativeAudit(EXAMINED/UNRESOLVED、原Evidence、facet IDs、reason)；Local核对每个Source/locator一次、每个facet原生范围关联、Partial/visual与unresolved保守性。新原生发现parentUnitId:null，可无上游父项，但不能改Group identity/成员、创建新Assessment或B2 course Rule；source/provenance、后续逐facet去向仍严格。范围审计不能证明每个语义 clause 都真实完整，仍需实际内容验收。

Synthesis从原引文重新判断规范力度，父requirement/facet modality也是假设；许可、邀请、建议不得无依据增强为义务。B2 KEEP/MERGE多目标在新 /4 按集合核查原facet逐字引文至少到一个真实且有native支持的节点；每目标owner/state/Evidence/provenance仍验证，/3保留旧逐目标检查。该引用连通性不是语义同义、完整性或支持真值判定。Local不补写遗漏句子、不改模型Source/enum/内容。

View恢复显式单个UNCERTAIN候选传递给原有competing-value组件；保持knowledge与主值未决，不选候选、改文案或新建Review交互。Review/C接收固定target的receipt及native/facet gaps，无adoption不影响trusted state。实际模型验证只到facet/1；最终native/2和原生力度再审未经新paid复验，不能称为已真实闭合。


## Semantic-042｜versioned strict output boundary

新增 assessment-output/2 负责对象/field/requirement/state/scalar/type/role、B2 upstream/cardinality/authority、B1 parent role/cycle 与 consolidation owner/refs、一致性约束。Prompt 与实现共用枚举；字段缺失不能 fallback。新 workflow：assessment-relevance/2；session prompt /6。旧 workflow/session /1 不迁移；新 session 从 workflow 明确继承语义策略，checkpoint 按语义版本隔离。

Evidence 先做 scoped literal/alias validation，再按 source/hash 资格绑定 persistent ID；只有经验证的 native/visual Evidence 才能 materialize。Consolidation audit 与 field 节点分型校验，不能用理由充当 KNOWN support。Requirement 仅用 content，description 不自动修复；type 只接受既有 enum，other 必须由 AI 明确选择。B2 无 identity/structure 权限，parent stable IDs 完全来自 B1，missing parent 明确失败而非 orphan。显式日期 wire-key aliases 只改字段标识，不提取/推测日期；Task C current/latest 值不再被 validator 丢弃。

原 B2 仍正确拒绝。诊断 schema fixture 的 projection/DOM PASS 只证明当前序列化、Evidence 与显示守恒，不证明原输出合法或下一次模型语义正确。旧 2025 metadata 适用性仍需 AI 跨来源判断，Local 不按年份判断或自动改为当前日期。工程证据与最小后续真实验证范围唯一见 Engineering Report Semantic-042、semantic-042/REPLAY.json。

## Semantic-041 当前发现

五次定向真实模型验证得到4PASS/1FAIL。A/B1相关性改善；B2输出的结构关系越权、fieldConsolidationResults与provenance字段判别冲突、description/content requirement丢失、type枚举fallback，说明需要统一实际Prompt/typed contract/validator/materializer/Review的全链路设计。没有局部清洗来伪造成功，生产源码保持040状态。完整事实和范围在ENGINEERING_REPORT的Semantic-041；原始响应本机保留，额度5/5已用尽。

## Semantic-040 当前增量

当前问题与授权以P2E-040为准。实际session prompts补齐Assessment/Component及课程相关性语义，B1获得所有Source context；AI显式输出CURRENT/UNCERTAIN、理由与原文证据，排除disposition也保留证据。Local只验shape/provenance，不进行语义分类；跨Source相关性Evidence进入B2，理由机械投影到既有Review fact state。新workflow/session/checkpoint带assessment-relevance/1与prompt /5，旧记录保持原策略不自动重跑。完整根因、测试与待授权的模型验证见ENGINEERING_REPORT的Semantic-040；下方历史039工程完成不是本轮语义验收状态。

## Engineering-039 当前设计增量

当前授权P2E-039；工程完成并统一回传产品验收。QA-only单次B2补偿保留旧未知请求与frozen delivery，事务追加补偿记录并在transport前消费精确两个授权ID；同授权重入幂等，禁止自动第三次派发。生产构建移除QA入口，正常恢复hold关闭。版本元数据0.3.0；兼容接口未变。实现与真实结果以ENGINEERING_REPORT的Engineering-039为事实来源。下面037/036段是历史记录，其阻塞状态已被039明确授权替代。

## Recovery-037：隔离恢复与 at-most-once 保护

当前工程授权 P2E-037 允许安全停止及原 profile / 原 workflow 恢复。新增 QA-only 构建变量 `SYLLAB_QA_RECOVERY_HOLD=1`，在启动初始化、自动发现、恢复驱动及 provider execute 边界暂停执行；默认 QA 与 shipped build 均关闭该开关。恢复模式先读取已有 IDB 与 private stream archives，实际 Worker revision + hold handshake 通过后才允许判断后续恢复动作。隔离并保留 Service Worker cache/registration，数据库、权限与 checkpoint 保持原位置；无用户 UX 变化。

Synthetic 同 profile 重启与全表 SHA 守恒已验证。真实恢复也验证活跃 Worker，但两个 B2 durable dispatched 请求缺完成证据，因此保持 hold，不进入自动重发。完整恢复事件、账本、coverage 和阻塞证据唯一归属 ENGINEERING_REPORT_v0.3.0.md 的 Recovery-037；不能把 cached bundle 或缺失 AiRun 当成未派发证明。


**状态：** 既有 targeted gate PASS；P2E-036 权限恢复修复 / CI / synthetic reload PASS，用户已授权；cached Worker 导致 live coverage FAIL，运行无响应且付费记录未闭合。  
**当前授权：** `P2E-v0.3.0-2026-10-08-036`；Product authority 仍为最新 PRD。  
**工程基线：** canonical `main` / `26426a3793250aea351c443e3327ccdb1b95b697` + 既有 dirty state，2026-10-08；未提交。  
**停止点：** `STOP_USER_ENVIRONMENT_REQUIRED_AFTER_G_SEMANTIC`；本轮 targeted paid calls = 15，唯一 live workflow 尚无模型调用。

## R0. P2E-033 实际实现事实

S0–S6 已接入 production 新建 workflow，采用 `source_registry_group/1`；无此标记的历史 workflow 继续兼容旧路径，不原地迁移历史 ledger。新合同是 `syllab.ai/session/1`。这些是工程事实，不增加 Product requirement。

| 能力 | 实际实现及限制 |
| --- | --- |
| session / transport | `architecture-session.ts`、`architecture-runner.ts`：physical request、transport segment、effective semantic round 分离；raw-before-validate、captured replay、FINAL 幂等；未知 dispatched 禁止重复派发。B1 5/6、B2 3/4、C 2/3；A 无固定语义轮数上限。 |
| native / read | `native-signal.ts`、`course-read.ts`：native identity / inventory / reliability 显式比较，弱信号走旧 hash fallback；现有 production adapter 不声称 modified/version 已可靠。native-order bootstrap 携带实际内容，显式 omitted locators；exact object/evidence/range/search 和 scoped visual reads。 |
| Task A | 每个 Source 独立 session/checkpoint，停用新路径 triage、deferral 和 cross-Source packing；已有 independent scheduler 复用。只按 Source snapshot 和完整 checkpoint 复用；技术失败不能空成功。 |
| B1 | 一个 progressive Registry，显式 AI operations + CAS + immutable versions/retirement/dispositions。当前选择所有 A terminal 后统一 admission，属于允许的 Engineering strategy；没有实现前两轮 overlap。输入与 AI-authored carry/output 可按同一 round 分段，Local 不做语义压缩或多个 Registry 合并。 |
| B2 | 每个 Group 独立 session 与 scope，失败 siblings 保留；禁止改变 B1 identity/membership。Rules 由 B1 产生，B assembly 只机械组合。 |
| Task C / state | Check 的 per-target comparator；Initial / Rebuild 无 C，三个入口隔离 staging；保守 coverage 阻止不完整输入推断 removal。保持 Current / Latest 两条 Evidence 链，复用 trusted Evidence ID、原 hash、origin、定位与 capturedAt。无 adoption 不改 trusted/history。 |
| integration / migration | 新 namespace + existing ownership / generation fences；复用 Activity、backup/restore、Review reducers；无 destructive migration。完整 CI、隔离 Chrome IndexedDB/storage 与 injected-provider 通过；shipping / QA separation 通过。 |

大 carry 在 durable archive 中保留完整 AI-authored 内容，通过 exact descriptor/transport read 继续同一 round，不把新 semantic Evidence read 藏成 transport。视觉载荷仅 dispatch 时注入，不进入 session ledger。测试模拟容量边界，不据此声称真实 Provider 上限或语义质量已验证。

验证明细、修复与未验证边界见 `ENGINEERING_REPORT_v0.3.0.md` 当前 G-Zero 记录。日常 Chrome 的扩展管理页被浏览器安全策略阻止访问；已核对可见浏览器没有 NTU Learn 标签，隔离测试完成页面 reload/recovery。日常安装扩展 reload 未完成，使用新 bundle 前需执行该环境操作。

## R0.3 P2E-036 活跃 Worker 与真实恢复校验

Browser restart 可保留 DB，却复用旧 Service Worker ScriptCache。必须以 QA-only E2E_PERMISSION_RECOVERY_REVISION 回读实际 Worker 的 permission-recovery/036，不能仅用磁盘 build SHA、前端新代码或 DB checkpoint 同一作为激活证明。Synthetic fixture 启动与正常 reload 后均需 handshake；恢复脚本 mismatch 保留环境且不开放 Grant route。当前真实运行还未通过新的 gate，不能在未闭合 paid 请求期间 reload。

当前用户给出的两个 exact grants 已证实；原八项成功观察复用，但两项 permission-denied 仍未恢复（live FAIL），最后 96 succeeded aiRun records 尚非最终计费闭合。运行无响应触发 P2E-036 §5 关键例外；详见 Report Live-036。没有第二次 Scan / workflow / adoption。

## R0.2 P2E-036 权限恢复

Fetch permission-denied 不属 settled，观察先保存并停 Waiting；重启 / 用户 Retry 只重新读取失败 Source，不重读已完成观察。Grant 在 click 前缓存实际缺失的 durable redirect origin，通过 HTTPS / exact origin / Blackboard allowlist / contains 检查；真实点击只申请 exact patterns，拒绝时不 drive。QA 后台 start / 恢复显式 OPEN_SCREEN 绑定 ISC-02，不新增 workflow。704 tests 与 synthetic reload/checkpoint/route PASS；当前 live coverage 尚未完成。

原 observer 清理时 dynamic-import 异常造成原进程和隔离 Chrome 退出；已从同 private profile 恢复，十类表与 pre-activation SHA 相同，唯一原 workflow /119 Sources/9 observations/0 aiRuns。当前浏览器进程不同，不宣称原进程全程守恒；详见 Engineering Report Permission-036 与 RECOVERY.json。这是授权前快照；用户已给出两项 exact grants，当前关键例外状态见 R0.3 / Report Live-036。

## R0.1 P2E-034 Provider qualification 修正

session prompt 已升级至 `/4`，明确 mandatory outer envelope、Evidence 完整对象与唯一 request-local ID、B1 operations/dispositions、B2 完整六数组与 canonical schema。保持职责、semantic budgets、Group scope 和 Local/AI/User authority。

`canonicalEnvelope` 增加真实观察到的唯一 Task B1 / C1 schema spelling aliases；新 session FINAL 在原始 response 不变的前提下套用既有 deterministic compatibility repair，记录 requestId/from/to/hash。只改确切 schema identity，不补 arrays、Evidence、语义字段或结果。Task A alias 已存在，现也覆盖 nested FINAL。捕获响应重放不新增付费调用。

QA clean bridge 支持 initial/rebuild；clean Initial 仅在 QA authorization、新 architecture policy、Course 未 established 时允许，Check 与 established Initial 仍拒绝。Shipping 无 QA bridge。隔离新 profile 只带入原 Course/semester 与已有 NTU 认证/consent；不把旧 provisional/active workflow 当 trusted Current。初次 QA preflight 因旧 Rebuild-only guard 被拒绝，未创建 workflow，已修复；仅一个实际 live Initial 被创建。

真实 targeted 小样本 Provider 合同、A read-on-demand、B1 三种 identity/Rules、4 Groups B2 和 C 双 Evidence 已通过。multi-segment、大 Registry 与 absent enum paths 仍是 deterministic evidence，真实大课尚未完成。Live 已 fresh Discover 119 Sources，在 Fetch 等待 `https://alt-5dcb73f79ba4c.blackboard.com/*` 的附件权限；无 live A/B1/B2 调用、无 Review 结论。此处旧 Grant 指引已由 Engineering Report 的 Permission-035 纠正：fresh profile 缺两项 Blackboard wildcard grants，QA Bridge 未设 Scan route；permission-denied observation 被 settled 纳入导致恢复 coverage 风险。当前 STOP_PRODUCT_REVIEW_PERMISSION_RECOVERY，先审查同 workflow 恢复与 build 激活方案，不请求用户盲找按钮；不得启动第二个 full-course workflow。

## R1. 当前设计与历史的适用范围

本文件 R1–R12 是经 P2E-033 批准的工程方案；实际实现以 R0 与 Engineering Report 当前记录为准。R2 保留实现前审计，不代表现状。后附「历史工程设计与验证记录」保留原正文，含旧 routing、deferral、multi-Source packing、monolithic B、无上限 continuation 和旧 Gate 授权。它们只说明历史实现，不是当前执行指令；其中“当前 / production / 下一步”均指当时，不覆盖 R1–R12 或最新 PRD。

保留 MV3、本地 BYOK、imperative DOM、native IndexedDB v6、existing Review/adoption reducers、restore generation、workflow owner/session fence 与隔离 staging。新设计不更改页面、用户控制或已锁 copy。Interaction/IA 的既有用户交互继续有效；旧 AI 架构文字不能反向覆盖最新 PRD。若实现需改变用户语义或安全边界，必须先 Stop & Ask。

## R2. 实现前 reconciliation 审计（P2E-032 历史快照）

审计直接读取下表 local source、现有 Technical Design / Implementation Plan、Engineering Report 最后两个 Gate 记录与 E2P-021。未打开私有课程正文或重新生成历史付费 evidence。分类按子能力拆分，不能把整个模块标成新架构已完成。

| 能力 / 本地事实位置                                                                      | 当前实际状态                                                                                                                                     | Reuse / change / retire / not yet implemented                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery/engine.ts`、`v2/blackboard.ts`                                                | content/announcement 使用 native ID；附件优先 id/fileId/attachmentId，fallback canonical URL/ordinal；discovery metadata 持久化                  | **Reuse** discovery、分页、Complete/Partial/Failed 传播；**change** typed native change signals，缺失/弱身份不冒充可靠 native identity                                                                            |
| `v2/schema.ts` SourceMachineRepresentation、`fingerprint.ts`、`workflow.ts` ingest       | 核心比较依赖 metadata/content/structure hashes；没有 typed native modified/version contract                                                      | **Change** native-first comparator；hash 留 fallback/cache integrity；typed信号及兼容读取 **not yet implemented**                                                                                                 |
| parser、offscreen、attachment fetch                                                      | structured units、native/visual coverage、legacy conversion、PDF print-intent、bounded technical deadlines、durable discovery recovery 已存在    | **Reuse** 成功 file understanding、locator、coverage、恢复；native bookmark/Heading 等实际 extraction coverage 要逐格式补齐，不能从字符串 outline 推断均已支持                                                    |
| `content-index.ts`                                                                       | 全 units 可寻址，firstNativeSpan/firstSentence anchor、source/unit refs、exact expandRef；源级 expansion 有时返回全文                            | **Reuse** locator/count/ref lookup；**change** typed native structure、分页、range contract，移除把任意 first sentence 当 native heading 的默认投影；统一 requestedReads **not yet implemented**                  |
| `source-triage.ts`、`retrieval-planner.ts`、`exhaustive-routing.ts`、`coverage-audit.ts` | 多轮旧策略仍有历史代码/字段；schema 标注部分为历史                                                                                               | **Retire from new workflow** 独立 semantic routing/selection/coverage-audit，不删除历史数据；无旧 planner checkpoint 可决定新 eligible scope                                                                      |
| `teaching-deferral.ts`、`workflow.ts` teaching path                                      | file/attachment classification active；Deferred 会退出 A，并影响 evidence/downstream eligibility 和 unchanged check                              | **Retire** 新 workflow 的 classifier、teachingCheckpointsCurrent、semanticallyProcess 及其下游过滤；**change** A 自己 FINAL/CONTINUE；历史 teaching checkpoint 只读留存                                           |
| `physical-work.ts`、`workflow.ts` batchedTaskA                                           | `logical_physical_v1`、按序列化 bytes 均衡 bins、Main/Recovery waves、多 Source 同一次请求                                                       | **Reuse** dispatch/response persistence、fences、ambiguous-paid记录；**retire** cross-Source bins 和旧 waves 作为新 A 主路径；不保留默认 full native body dispatch                                                |
| `ai-contracts.ts` TaskAResult、`runTaskASource`                                          | assessmentDrafts / courseWideConstraintCandidates / Evidence / visualRequestRefs、file context、Source checkpoint 已存在                         | **Change** versioned one-Source logical session、index-first FINAL/CONTINUE/requestedReads；0..N 保留；旧 output 不自动认证为新合同成功                                                                           |
| `task-b-grounding.ts` / `task-b-ledger.ts`、`workflow.ts`                                | monolithic B 同时承担 identity/synthesis/global closure；item validation、ref accounting、length prefix、candidate retirement、native IDB ledger | **Reuse** 完整 item parser、schema alias确定映射、reference validation、错误隔离、dispatch账本基础；**retire** 单体 B 合同及依赖 closure 作为新 B 主路径；Stage 1 Registry、Stage 2 tasks **not yet implemented** |
| `evidence-retrieval.ts`、`materialize.ts`、`store.ts`                                    | exact native/captured ref/range读取、字符 coverage progress；durable Evidence identity 已修复跨课程冲突                                          | **Reuse** 机械 lookup、原始 excerpt、request-local→persistent alias；**change** 所有阶段的统一 scope/snapshot 检查、upstream edges、Current/Latest双链                                                            |
| `storage.ts`、`schema.ts`、`staging.ts`、`workflow.ts`                                   | v6、appMetadata runtime ledger、restore generation、lease/session、Rebuild staging；Initial 有 guard 后 provisional projection                   | **Reuse** fences/revision/adoption；**change** independent A/B1/B2/C session checkpoints 与三入口统一 provisional namespace；不可并发 read-modify-write Chrome staging                                            |
| `ai-contracts.ts` TaskCResult、workflow C                                                | 既有六种 change enums、object-scoped C、coverage safety 和 successful target reuse                                                               | **Reuse** thin comparator 与 Review adapter；**change** 新 B 输出/identity route、per-target reads/round accounting；不专项重写 C 语义                                                                            |
| `package-scheduler.ts`、`worker-lifecycle.ts`                                            | FIFO ordinal dispatch、AIMD、pressure drain、ownership abort；25s active-worker pulse                                                            | **Reuse** 算法，按 R6 定义参数；**change** 同时约束 A/B2 model in-flight，B1单 writer；25s 是存活机制，不能当 semantic deadline                                                                                   |
| `activity.ts`、SSE、QA telemetry/usage、backup/restore、Review screens                   | stream projection、正式状态分离与 trusted protection 已存在                                                                                      | **Reuse** 不重设计用户体验；task labels只适配既有通用task展示，任何新增用户可见行为另走Product授权                                                                                                                |

历史 evidence：Engineering Report 的 Gate B / B-R 明确 FAIL；R1 两次 length，79 refs 全 Unresolved，canonical/identity=0。已保存 replay 对 sibling isolation 的机械改善不证明新 Stage 1/2 semantic PASS。原 ledger、raw、usage、cost、失败状态均不可改写，新架构不能把它们追溯改为成功。

## R3. Source identity 与 Opportunity Check

### R3.1 Typed native signals（planned）

保持既有 sourceId 作为 storage compatibility key；新增 `nativeIdentity` 描述真正 native object：`{courseId, kind, nativeId, parentNativeId?, resourceId?, identityBasis}`。`identityBasis` 为 native / canonical-url-fallback / ordinal-fallback；fallback不是native身份。content/page/folder→native content id，announcement→native announcement id，attachment→native resource/attachment id，Course→native courseId。Source 存储 key不迁移，不用title推断新旧对象相同。

新增 `nativeChangeSignal: {adapterVersion, endpointKind, observedAt, created?, modified?, version?, resourceId?, completeResourceInventory, reliableForContent, rawSignalDigest}`。值原样保存，不把created、HTTP时间、signed query或抓取时间当modified。附件须有独立 version/modified，或有验证过的 parent modified + 完整 resource identity inventory；resourceId相同本身不能证明字节不变。每个 endpoint 的 signal adapter 有合成 fixture 验证字段存在、精度、缺省和变更传播；尚无可靠性证据的 adapter 设置 `reliableForContent=false`，走hash fallback。不能猜测 Blackboard 全部端点都有稳定 modified。

### R3.2 明确 comparator 顺序

1. Discovery 不完整、权限失败、对象信号缺失/类型非法：记录 technical unknown；历史payload不能当本次成功 observation。
2. 有可靠 native tuple：新native identity→new；同native editable identity且modified/version改变→machine change candidate；resource identity集合改变→machine change candidate。保持旧sourceId与新native tuple的exact alias，禁止字符串相似度映射。
3. native unchanged 仅当同kind/course/native ID、同adapter version、两侧可靠的modified/version严格相同、完整resource identity集合严格相同，且该adapter确认信号覆盖对象内容。上次 A checkpoint/input index/parser/semantic policy兼容且无未完成工作，才允许复用语义结果。
4. 没有可靠 native change signal：fetch/parse后使用同representationVersion的 metadata/content/structure hash exact equality。parse partial不证明完整机器相同；不兼容表示版本→incomparable，保留gap，不由其生成removal。
5. 未观测旧native identity→missing candidate。完整Discovery只证明missing observation；没有成功Fetch/parse、权限与相关目标coverage、或存在failed A/B/C时，不可生成Possibly Removed。最后结论仍由C；Local只能检查coverage条件。

Course级 no-AI skip 必须所有scope已观察且机器相同、无missing/unknown/partial、无需要恢复的semantic task、无需换parser/policy才能复用；否则不能标complete unchanged。missing-only Check仍可把CoverageFacts交给C已明确identity的trusted target；不虚构empty A结果，不将Source missing映射为Assessment removal。

### R3.3 Migration

仅设计 additive record revision：保留旧machine hash与旧nativeItemId；typed native字段缺失时fallback，不回填虚构modified。fallback URL只保留credential-free canonical路径作内部身份，signed fetch URL不进入AI或Drive。旧ordinal fallback随资源列表改变→incomparable，禁止自动重连Evidence。没有rename/rekey/delete Source、Evidence、trusted history的迁移。

## R4. Local Course Data Layer 与统一 Read-on-demand

逻辑分为 Source/raw/parse snapshots、AI working objects、trusted state、workflow provisional state；不要求新建一张总表。现有Source.parsed/native units、Evidence、sourceObservations与appMetadata可承载第一轮实现。现有raw byte/converted buffers主要在offscreen内存；不得声称全部raw已durable。重启需再读同一resource并核对snapshot，或返回read-unavailable；旧excerpt可作为captured evidence，不能冒充重新读取到的当前内容。

**Index-first输入算法：** 按冻结Discovery ordinal列Source；按parser原生顺序列unit。发送metadata、完整unit目录的可分页描述（locator、kind、character count、cells/ranges、gap、真正native heading/bookmark/title）。不存在native heading时显式null，不生成outline或first-sentence语义摘要；不默认full dump，也不把`initialContent=empty`设为硬规则。首轮可以携带机械可得的bootstrap正文；其余native字段/页/段落由AI发requestedReads。全部unit可寻址，分页不改变eligible scope。

**Deterministic bootstrap contract（implementation-time qualification）：** bootstrap builder只接收Source kind、真实native unit顺序/结构、parser availability、完整序列化UTF-8大小和已验证transport/context约束；不接收relevance/importance评分，不用title/filename语义选择。native management body在完整正文与必需metadata/index的序列化输入可直接承载时可完整携带，避免强制一次“读基础正文”的CONTINUE；文件型Source可按预先固化的native-order连续范围携带正文并列明included/omitted locators与actual ranges，大Source其余部分按需读。仅transport合规不足以证明对每个文件full dump最优；不得以“所有文件都fit”改回无条件full dump。**具体各Source type bootstrap形态及qualification参数留给S1/S2 implementation-time deterministic contract**：必须先给出固定规则、边界来源、可重现fixture/serialized evidence后接入，不允许Local临时自主选择。空bootstrap只在无可得正文或该type的已定义技术规则要求时出现，不作为Index-first固定含义；未决定规则是待完成工程合同，不是新的Product blocker。

**版本化内部 envelope（planned `course-read/1`）：**

```text
request: {requestId, workflowId, logicalTaskId, snapshotId, reads:[Read]}
Read = source-metadata(sourceId)
     | index-page(sourceId, cursor)
     | locator-range(sourceId, locator, start, end)
     | evidence(evidenceId)
     | upstream-object(objectId)
     | search(scopeRefs, exactLiteral, cursor)
     | visual(sourceId, locator, regionRef)
reply: {requestId, snapshotId, items:[{readId, status, payload?, nextCursor?,
        sourceId?, locator?, start?, end?, representationHash?, capturedAt?}]}
status = available | not-found | unauthorized | stale-snapshot | invalid-range
       | read-unavailable | unsupported-visual
```

Range使用JS UTF-16 offset，与现有slice一致；`0 <= start <= end <= length`，不切断surrogate pair（向外扩一code unit并返回actual范围），省略range为完整unit。空unit合法available空字符串。readId按请求内ordinal分配，仅内部机械身份。search固定exactLiteral、case-sensitive、无stemming/embedding/regex：遍历授权Source ordinal→unit ordinal→offset，返回所有match与locator，cursor分页；不按relevance排名，不自动检索title推断身份。没有match只是技术结果，不等于无课程信息。

分页由完整序列化UTF-8 envelope的**已验证transport boundary**确定最大连续前缀，剩余返回cursor与total；未遇到boundary不截断。不创建任意N页、N refs、字符或token ceiling。超过单次边界→生成同一deliverySet的下一segment，不结束Course/task；字符串在Unicode边界按连续range拆分，大record也可分片，只有最小合法envelope+一个完整Unicode scalar/必要binary原子仍不可承载时才是typed transport failure。binary/image仅使用既有经过核验的serializer，旧文档中的provider数字不当成本轮fresh验证。Registry/input/read payload通过R5/R7的deterministic、resumable multi-segment协议继续，不Local压缩语义。单次request/refusal或Registry大小本身不是Partial条件。

**authorized scopes：** A仅自身Source及其native parent metadata；B1当前workflow全部admitted A objects、这些objects的Evidence/Source与Check的trusted projection；B2仅冻结Group成员/identity支撑Evidence/explicit related refs，不允许读取其他Group以重做identity；C只读本target Current/Latest及对应两侧upstream chains、coverage facts。B2发现需要外组材料则明确unresolved/identity issue，不能自己跨Group merge。每次lookup校验course、workflow/generation、snapshot hash、ref授权，不解析AI提供的任意URL，不越权读取其他课程。

**continuation/persistence：** `CONTINUE + requestedReads`与validated working output一并checkpoint，再resolve；将机械reply附加回同一task context。保存request/response索引、delivery intervals与AI-authored working state；不保存raw reasoning到共享或trusted数据。缓存key含course/snapshot/locator/range/parser/representation，exact identical read可reuse。

重复read可以机械返回cache；重启/duplicate segment不触发no-progress失败，先按segmentId幂等lookup。仅在没有未交付segment、没有待应用captured response的条件下，完全相同的working digest、read reply digest和new-input watermark且没有新增覆盖/对象修订→`READ_NO_PROGRESS` technical stop；metadata/visual/index分页的新数据也算progress，不能只数text chars。一次invalid request返回typed反馈；重复同形invalid且无progress停止。不通过Local解释课程意义补写结果。

## R5. Logical task contract、身份与安全

A / B1 / B2 / C统一内部session：`{policyVersion, courseId, workflowId, generation, logicalTaskId, inputSnapshotDigest, schemaVersion, promptVersion, ownerToken, executionSession, state, effectiveSemanticRound, roundLedger, deliverySets, physicalRequests, readDeliveries, validatedWorkingState, finalResult?, failure?}`。

状态：queued→running→waiting-read→running→semantic-final；或technical-failed / unresolved / paid-unverified / cancelled。技术终态与semantic FINAL分别表示，FINAL并不等于所有字段已知。持久化first prepared request→dispatched→response-captured→validated→applied；response先保存再validate，apply和checkpoint指针在native IDB同一fenced transaction。恢复依据原request，不重排已dispatch工作。

### R5.1 三层账本与确定性计账（planned `round-delivery/1`）

- **physical request**：每次Provider调用有独立physicalRequestId、dispatch/response/usage/paid disposition；不把它直接加到semantic counter。
- **transport / delivery segment**：冻结logical input wave或已批准requestedRead的序列化内容因已验证边界拆分，绑定同一roundId / deliverySetId；segmentId由set digest+ordinal+range生成，可有多个physical requests，不新增effective round。
- **effective semantic round**：一个明确定义的新admission/global aggregation、focused check，或AI请求新增semantic Evidence之后的重新判断；以唯一roundId计1次有效attempt，不能按API次数或segment页数计数。

Round ledger=`{roundId, ordinal, cause, priorRoundId?, baseRegistryRevision?, admissionWatermark, inputManifestDigest, deliverySetIds[], phase, completionId?, nextReads?}`。cause只允许INITIAL / NEW_ADMISSION / FOCUSED_CHECK / AI_REQUESTED_READ；phase为prepared / delivering / evaluating / output-delivery / completed / technical-failed。由明确controller transition生成，不由Local解释内容“是否有意义”。initial开第1轮；新admission wave和明确AI `NEXT_ROUND` focused request开新轮；validated `ROUND_COMPLETE_CONTINUE`带新的requestedReads时，resolve这些reads的传输段归**下一roundId**，其后新的判断计新的有效轮。inputManifest一旦冻结，不把later Evidence或late A偷偷加进旧round以规避budget。

同一round的合法响应种类为`DELIVERY_ACK`、`TRANSPORT_CONTINUE`、`ROUND_OUTPUT_SEGMENT`、`ROUND_COMPLETE_FINAL`、`ROUND_COMPLETE_CONTINUE`。前两类只能推进该set的已定义segment/或existing manifest Registry页；不得请求新semantic Evidence、追加admission或开启focused question。output segment只能交付该round AI编写的working Registry delta或最终结果的连续部分，不能以新round名重新判断；超scope/read需求必须用ROUND_COMPLETE_CONTINUE并开启下一轮。中间AI结果是同一wave上的未提交working state，不是独立batch语义结论。

counter规则：只有完整合法round completion第一次原子CAS成功时，`effectiveSemanticRound += 1`；已完成roundId重放不重复计。budget admission以completed count+至多1个activeRound reservation检查；同一active round的所有segments沿用reservation，不按segments扣额度。技术失败reservation保留同roundId用于获授权恢复，不能换roundId来隐藏实际attempt；未完成语义轮不虚报effective success，physical/paid/failed round history完整保留。Provider error/malformed/truncation/确定性repair不增加effective counter，也不因免费计账自动获得无限paid retry许可。

每段ACK/response先持久化再推进cursor；hash/range/schema/scope相符才accept，duplicate exact segment返回缓存，out-of-order response按ordinal暂存，连续前缀验证后推进。captured但未apply response恢复只做本地apply；dispatched结果未知继续paid-unverified stop，不自动再派。length完整item只能留provisional，不算ROUND_COMPLETE；合法continuation须保留AI-authored carry state和已交付manifest，不由Local补语义或补JSON。

B1 normal5/max6、B2 normal3/max4、C normal2/max3继续指**effective semantic attempts**。最后一轮的finalization-required随roundId固定，所有transport/output segments仍可继续；不得以segment数达到max停止交付。normal预算可用唯一extension effective round，最迟max轮由AI完成FINAL并保留Uncertain/unresolved。最后round completion不得请求下一semantic Evidence/focused round；若AI违反则explicit contract failure，Local不生成FINAL。A无新的语义cap。pure delivery规模无总segments/pages/requests上限；所有真实物理成本和技术失败单独可审计。

安全恢复算法：lease token/session/generation不匹配→拒写并停止dispatch；auth revoked/cancel→abort并drain；成功exact checkpoint只lookup不再付费；dispatched结果未知→paid-unverified，不自动重派。known-response失败同样不能仅凭“非语义错误”无限付费retry；无新增explicit paid-retry授权不再generation。确定性pre-generation refusal仅Provider明确未执行时可无损拆分重试；相同refusal/no-progress→typed stop。保持现有startup reconciliation、25s active-worker pulse；不引入按Provider latency强制夺lease规则。本轮不触及真实stored workflow。

AI对象persistent IDs由Local分配，映射key=`course/workflow/logicalTask/outputLocalId`，既有durable Evidence identity仍含Source/locator/excerpt/representation。相同request-local ID跨physical response只可通过显式alias表复用，跨task绝不直接global使用。对象版本revision单调增长；旧revision/retired对象仍能lookup，不能用新值替换旧Evidence含义。

## R6. Task A 与 deterministic scheduling

每个eligible Source冻结snapshot后建立一个logicalTaskId；先Index-first，AI可FINAL 0 Draft/0 Rule或CONTINUE，输出仅此Source的Draft/Rule/Evidence/uncertainty。技术失败输出technical gap，不补empty success。FINAL output应含sourceId、snapshotId、status、assessmentDrafts[]、courseRuleCandidates[]、evidenceRefs/upstream[]、unresolvedIssues[]；CONTINUE带requestedReads、model-authored workingState以及尚未final的候选，未FINAL候选不admit到B1。

独立checkpoint以source identity+snapshot+parser/schema/prompt/policy版本为key；并发结果经native fenced transaction保存，staging projection串行提交。已成功Source复用，失败不重新派发成功siblings。旧TaskA schema1的full-body结果保存历史；只有明确version adapter和完整validation证明同contract时才复用，旧Deferred不能自动视为0 Draft。

**调度算法：** 对已准备且授权的A与B2建立共享model slot pool；初始limit10，上限25，作为current engineering tuning baseline / historical target，需zero-model/runtime evidence验证；不属于latest PRD固定产品要求，不是Provider hard limit，也不得影响Source coverage、semantic completion或correctness。FIFO序号在workflow内由Source ordinal或Group持久化creationOrdinal决定，队列tie按logicalTaskId codepoint顺序。阶段并行时轮转A→B1→B2→C非空队列，每次取一个ready task；每个logical session最多1 in-flight，B1全课程最多1 writer。无title/size/relevance prioritization。

完成一次成功physical请求successes+=1；successes>=currentLimit时limit=min(25,limit+1)，reset；429或现有typed provider-pressure将limit=max(1,floor(limit/2))，reset，暂停新dispatch直至原Retry-After；没有Retry-After的timeout停止该unit并等explicit recovery，不猜等待窗口。fatal/authorization loss停止新dispatch，drain已执行请求并存成功结果。render/Office互斥沿用，仅覆盖实际资源操作，不占用模型等待期；存活pulse不算处理deadline。

A不做multi-Source physical packing；B2不做cross-Group packing。本文不提出optional packing optimization；未来若要提出须单独deterministic完整算法及Product审查，不能默认为现有需求。

## R7. Task B Stage 1：Progressive Global Registry

### R7.1 Registry schema / lifecycle（planned `registry/1`）

`{workflowId, courseId, registryRevision, inputWatermark, admittedDraftIds[], admittedRuleIds[], sourceTerminals[], groups[], importantRules[], draftDispositions[], ruleDispositions[], identityJudgments[], trustedLinks[], retiredObjects[], unresolvedIssues[], provenanceEdges[], status}`。

Group=`{groupId, revision, creationOrdinal, memberDraftIds[], relationshipRefs[], evidenceRefs[], uncertainty, trustedIdentity?}`；ImportantRule=`{ruleId, revision, candidateRefs[], semanticPayload, evidenceRefs[], uncertainty}`。draft disposition每个ID恰好一条：assigned(groupId) / standalone(groupId) / identity-uncertain / excluded-invalid(reason, evidenceRefs) / unresolved。Rule每个ID同样必须aggregated(ruleId)/excluded-invalid/unresolved，不能静默丢掉。identityJudgment明确Same/Different/Uncertain、涉及Draft/Group/trusted IDs、supporting/contradictory evidence与basis。

单一current Registry pointer→validated revision N；完整Registry在Local durable state可寻址，**不要求同一次request内携带全Registry**，不生成Local summary。AI可create/assign/merge/split/reassign/return-to-uncertain；通过versioned working Registry的AI-authored显式操作表达修改，所有output segments共同形成一份全局transaction。Local只机械apply并检查scope/ID/set conservation、成员互斥、retirement引用、Evidence链存在与revision CAS，不自行决定merge、选值、去重或修补dispositions。非法全局变更不覆盖旧validated revision；独立group field issue留明确信息，不能自动丢整个合法对象。

### R7.1a Oversized Registry 的 deterministic continuation

1. 固定`baseRegistryRevision`与本轮admission/read manifest，Registry canonical serialization为固定schema-key顺序、数组按持久化ordinal、字符串按Unicode scalar边界；manifest记录record IDs、revision、byte/range、total与digest。partition取验证过的envelope/context边界内最大连续前缀；大record按连续字节范围分片。没有固定N records/pages/segments上限。
2. 每段保存roundId/deliverySetId/segmentId/ordinal/ranges/digest与previous cursor。Provider模型上下文只装该段、必要固定header和**AI-authored carry state**，不靠不存在的Provider server-side memory。全Registry保留为同一durable object，通过manifest及exact registry-page/object reads寻址；已交付的同manifest历史页可以重读，不Local摘要。若整段历史对话不能承载，切换下一segment请求，带同roundId、当前working revision、AI-authored continuationState和existing-manifest refs，不重新开启独立semantic Registry。
3. AI在同一round持续更新唯一working Registry branch；output为显式`put(recordId, expectedRevision, fullPayload)`、`retire(recordId, expectedRevision, reason, replacementRefs)`及完整AI-authoreddispositions/edges。Local只能按operationOrdinal顺序、exact IDs/revisions机械apply；merge/split必须由AI的put/retire/member reassignment明确表达，不能从相邻segments或重复名称推断。append到同一transaction不是Local semantic merge，也不产生多个独立Registry。巨大output同样分页；record分片须重组完整JSON/hash后才validate，不补JSON。
4. 每段atomic checkpoint包含cursor、last accepted response、operation prefix、working revision、AI carry state、未完成reads。duplicate exact segment/operationId幂等reuse；同ID不同digest拒绝；乱序先暂存再按ordinal验证，恢复只取下一未完成segment，不重派captured response，不跳过缺段。每次working revision CAS由base+上一working revision保护，validated public pointer在round closure前不动。
5. `ROUND_COMPLETE`明确output manifest、完整AI-selected operation set、Draft/Rule dispositions、retirements与input watermark；Local stream-validate所有segments/refs/set accounting并以CAS将**唯一**Registry pointer提升到完整candidate revision。遗漏draft/rule、缺段、scope不一致时保留working checkpoint并用同round技术continuation交付缺失manifest内容；如果需AI新的Evidence/再次语义判断则开新的effective round，不能作为transport免费续轮。
6. oversized是正常路径：Registry/input/result超过单次容量只增加segments，完成同一global update仍计1 effective round。只有deterministic continuation真实不可恢复（最小envelope不可承载、不可恢复scope/snapshot/read、无progress且无pending segments、失去ownership或ambiguous dispatch）才typedPartial/Unresolved，保存成功revision和失败事实。未验证carry state可承载时也必须先对它无损分片/lookup，不能用任意carry字符上限制造课程上限。

完整Registry不必同时在模型context内，但任何record均机械可读，AI决定需要的历史细节；不能宣称分段天然证明语义完整。跨早/晚input identity反例和真实semantic quality仍需后续Gate验证。该方案仅设计，未实现；不引入semantic compression或sub-agent。

### R7.2 Admission、overlap与轮数

冻结Source eligible inventory与stable ordinal。已checkpoint semantic FINAL A可进入B1；technical terminal A登记coverage gap，其无效候选不admit。开轮时按Source ordinal、A output数组ordinal构造全部未admitted ready inputs；冻结本轮admission watermark，晚到结果进入下一轮。输入序列只由ordinal决定，与title、filename、大小、重要性无关。若transport不可承载，按R4机械分页并标remaining，仍在同一session，不能做独立batch语义结果+Local merge。

当前Engineering admission strategy：最多前2个effective rounds可在A未全terminal时dispatch；之后B1等A全部terminal再消费其余轮。这不是Product invariant；可根据zero-model/runtime证据调整admission scheduling，无需改PRD，但必须保留Product semantic-round boundaries、同一Registry、Local authority与FINAL barrier。一个admission wave的所有transport segments归同roundId，不额外消耗budget。没有ready input则等待，不空转；late A outputs在barrier前全部进入同一Registry的后续wave，固定manifest不能吞入late input。zero-model Gate须覆盖前2轮已结束后仍有large/late A、late Rule及其多segment delivery。关闭barrier后供给全部未admitted inputs，不按页数跳过；每个new ID须有AI disposition。通常main/global约2–3、focused约1–2，不强制用满，最多6 effective rounds，不限制physical requests或segments。

### R7.3 FINAL barrier、Check trusted mapping

允许FINAL仅当eligible A全部technical terminal、sourceTerminals集合等于frozen inventory、所有successful A Draft/Rule IDs均admitted且每个有且仅有合法disposition、Registry无pending input、reference链完整、无active read或未确认dispatch。失败Sources、Uncertain或unresolved Drafts可以并存于FINAL，输出coverage明确Partial，不能叫semantic全部成功。

Check输入含changed/new A outputs、可exact reuse的unchanged A outputs和trusted objects的identity/provenance projection。Stage 1 **由AI**对Group / ImportantRule与trusted objects建立same/new/uncertain关系，支持split/merge的明确uncertainty；Local只校验target存在及关系accounting。trusted projection不算新A Draft，不可将旧trusted语义冒充本轮重新观察到的信息。related unchanged A没有兼容checkpoint时保留trusted context与coverage gap，不自动付费全课程A。

source missing不删除Group/trusted object。对本次未出现的trusted target，Registry仍输出明确identity disposition/unresolved，供thin C读取其Current、latest若有和coverage。无法建立identity时保留uncertain，不交给C重做grouping。

每个revision保存prior pointer、input watermark、validated envelope、read log与task session；恢复复用最后CAS成功revision和未应用已捕获response。所有新input在同一Registry持续累计；技术失败保留旧revision和explicit unprocessed IDs，其他workflow不受影响。B1未FINAL时不得提前dispatch任何B2。

## R8. Task B Stage 2：per-Group synthesis

Stage 1 FINAL revision冻结；为每个合法provisional Group（包括显式standalone Group）建立独立task。identity-uncertain且无Group的Draft只进入unresolved账，不Local造Group；Group带uncertainty可由B2保留，但不能改membership/identity。

输入=`{groupId, groupRevision, registryRevision, memberDrafts, identityJudgments, evidenceCatalog, structureIndex, uncertainty, allowedRefs}`。输出=`{groupId, inputDigest, status, provisionalAssessment, fieldProvenance[], unresolvedIssues[], requestedReads?}`，FINAL恰好一个Assessment；name/type/weight/dates/requirements/components/facts均保留既有Product知识状态。Not Mentioned是语义展示状态，经既有schema adapter表达，不能凭Local缺字段生成；Conflict/Uncertain由AI明确输出，不把C change enum塞进FactValue.state。

并发按R6 FIFO creationOrdinal，no cross-Group packing。reads仅本Group授权refs，Source可能包含其他Assessment原文，AI仍不得重做identity或合并组。AI指出身份矛盾则FINAL uncertainty/issue，不重新跑B1形成无限loop。通常3/max4有效轮，最后仍可合法FINAL未知字段。技术失败输出Group-levelPartial/Unresolved，不冒充Assessment；成功siblings继续。

独立checkpoint含Group/Registry revision + member input/Evidence snapshot digest + schema/prompt/policy。Group revision变化只invalidate相关B2，原成功record保留历史。恢复保持one-group session、read deliveries与exact captured response；不得因一个失败Group整门课程重跑或重派成功Group。

## R9. Task B Result → thin Task C → existing workflows

Stage 2全部technical terminal后机械assembly：`{assessments: successful B2 finals ordered by Group ordinal, importantRules: Stage1 finals ordered by rule creationOrdinal, identityJudgments, unresolved: B1 + failed B2, coverageFacts, provenance}`。检查Group IDs partition = success+failed/cancelled/paid-unverified且无漏项；不按title去重，不Local consolidate Rules，不把Uncertain当失败强迫AI再调用。Task B Result无新semantic步骤，任何partial仍是provisional。

Initial：A→B1→B2→Initial Review；无C。Rebuild：同链路→Rebuilt Preview；无C、无field-by-field Diff，Use/Keep沿用。Check：native comparator→affected A→B1 trusted links→B2→per-object C→Change Review；全course machine-identical满足R3时no AI。

C logical target为一个Assessment或一条ImportantRule；输入Current与Latest（可null，但必须有B1 disposition）、Stage1 identity、相关User State、两侧Evidence、CoverageFacts。C只输出原六种change enums和basis/evidence；通常2/max3有效轮。不重新理解Source或进行identity分组。Identity-uncertain输出既有IDENTITY_UNCERTAIN路径。无需变化的已知target可以仅在以下strict equality时跳过C：两侧canonical product payload字节相同（固定schema+stable serialization）、identity same由已有可信mapping明确、User State和相关coverage未变且完整、Evidence/source snapshots一致、无pending/unresolved/uncertainty、contract版本相同。Local不能凭相同name、相同Evidence数量或hash缺省等式skip。

missing target交给C只表达可能变化；Possibly Removed仍需相关完整coverage证明、无fetch/permission/parse/semantic technical gap，并由AI明确判定。此处复用现有coverage/reducer guard；stale Current和最新Partial不能获得removal授权。

统一workflow staging namespace=`generation/course/workflow/kind/baseRevision/policy`，新增semantic对象不得写trusted stores；现有Initial provisional materialization需验证仅未adopted AI对象、无Edited/Changed/User objects、revision fence。建议先在隔离runtime state构造完整bundle，再通过现有合法projection adapter投影。所有adoption expectedRevision与generation检查继续成立；没有Confirm、Change accept、Use rebuilt就不改变trusted state。failure/preview/recovery都不是adoption。

## R10. Provenance、schemas、storage与渐进迁移

每个Stage2 field/requirement→AI选定Draft/Group revision→Evidence persistent refs→course/source snapshot→Locator/range→原文或captured excerpt。ImportantRule→Stage1 rule revision→candidate refs→Evidence同链；C change分别保存Current object revision+Current chain、Latest object revision+Latest chain。Stage1 merge/split/reassign保存upstream edges与retirement，引用旧revision可继续lookup，不能把alias覆盖成新内容。

Local validator检查每个semantic字段有AI提供的support refs或明确uncertainty/not-mentioned原因、refs存在且授权、exact native excerpt与捕获range一致、visual locator在rendered coverage内；**不判断Evidence是否在语义上足以证明claim**。缺support不自行补引用。Provider局部ID通过R5 alias持久化；digest collision或同alias对应不同identity显式失败，禁止覆盖。

新增 versioned A/B1/B2/read/session policy 与 additive Source signal字段；新policy不复用旧teaching/packing/monolithic closure作为新semantic completion。先用现有appMetadata保存fenced workflow runtime records和AI对象版本，runtime仍随restore generation清理；无需本轮DB upgrade。若未来需要新索引/store再按additive IDB upgrade验证中断，不改旧trusted IDs。backup不得包含raw reasoning或private runtime streams；trust/Evidence必要引用仍走已有durable backup contract。

迁移顺序：

1. 固化contracts/validators、Source signal comparator和read resolver，先fixture验证，不切production路径。
2. 新workflow选择新policy（显式版本），停用classifier/deferral/filter与cross-Source A packing；历史workflow保持原policy、不可在付费in-flight或ambiguous状态切换，不自动恢复旧Gate。
3. 接one-Source A + independentcheckpoint/read/session；保留file parser、visual exact unit、provenance与ownership工具；新policy只读兼容成功基础数据。
4. 接B1单Registry与input accounting、barrier、trusted links；旧monolithic ledger仅历史，不能Local转成新Registry。
5. 接B2 group tasks、mechanical assembly；独立失败隔离；最后thin C adapter和三入口staging接合。
6. zero-model contract/store/workflow/browser/saved-evidence回归通过后，返回Product申请限定real validation。授权前不增加任何paid generation。新失败只改新policy状态，旧Gate raw/ledger/usage永不重写。

回退仅在隔离fixture或未dispatch新workflow前切回前一代码checkpoint；生产已经dispatch则停止新admission并保留ledger，禁止reset+自动重派。不清理existing dirty state，不自动commit。旧成功parser/Evidence仍可复用，旧AI结果只有exact-compatible contract证明才可reuse。

## R11. Verification plan与证据边界

Implementation Plan列出各slice的zero-model gates与Product gate。重点反例：native signal可靠性缺省、resource替换、parse partial、跨课程同local ID、Source零Draft合法FINAL与technical失败分离、超过barrier之前拒绝B1 FINAL、late A admission、merge/split/Uncertain disposition conservation、oversized Registry/input wave多segment完成同一全局update且effective计数不增、segment restart/duplicate/out-of-order/captured recovery、不可恢复continuation才Partial、B2跨Group拒绝、semantic/technical计账、ambiguous-paid拒重派、restore/lease/revision竞态、Current/Latest Evidence与three-workflow isolation。

历史669 CI通过及saved replay仅为旧实现证据，本轮不复述为新架构PASS。设计审查后才申请implementation；实现完成需`npm run ci`及bundle reload+所有NTU tabs refresh。real semantic quality、Provider吞吐、新architecture runtime/token/cost、human Review负担均未验证。无需以设计-only文档改动重跑付费Gate或操作真实浏览器stored state。

## R12. 本轮记录与Product review

本轮只定点同步032 Product inbox，基于上一轮已核验031 SHA判断local无独立修改；PRD/IA没有本轮inbound变更。pre/post SHA与scope保存在E2P-023。本文和Implementation Plan在既有当前方案中完成032 targeted revision并保留历史，不修改PRD/IA/Engineering Report、源码、prompt、schema或实际数据。没有发现必须改变锁定Product要求的冲突；native signal reliability与multi-segment transport qualification是待验证工程风险：信号不足走hash fallback，正常oversized Registry继续；只有真实不可恢复technical failure才typedPartial，不降低coverage或provenance。

Product重点review：bootstrap implementation-time contract、roundId/segmentId计账、oversized Registry continuation、Engineering前2轮overlap及10–25 tuning、5/6与3/4及2/3effective attempts、native signal reliability门槛与hash fallback、B2授权refs和Partial行为、Check trusted mapping与removal safety。批准设计不等于批准implementation/paid validation/release，后续仍以新READY Handoff授权。

---

# 历史工程设计与验证记录（非当前授权）

以下是031之前原正文，完整保留作工程历史。下文编号/“当前”字样均是历史语境；如与当前PRD不一致，以R1–R12为当前方案。

# Syllab for NTU Learn — Technical Design v0.3.0

**状态：** Engineering design；实现与验证状态见 Implementation Plan。  
**Product baseline：** `PRD_v0.3.0.md`、`Interaction_and_Information_Architecture_Spec_v0.3.0.md`。  
**起始代码：** main / `26426a3793250aea351c443e3327ccdb1b95b697`。

## 1. 实现边界与现状

保留现有 MV3、imperative DOM、IndexedDB v6、direct DeepSeek BYOK、Review reducers、
restore generation、workflow lease、Rebuild staging。后端不进入正常课程处理链路。
`extension/src/v2/` 是现有运行模块路径，路径名不代表只能服务 v0.2。

起始版本的工程差距（现已实现对应修正，验证状态见 Engineering Report）：

- `chunking.ts` 默认 10k/14k 字符拆分；`workflow.ts` 按 Source 串行调用。
- `background/index.ts` 把 parser Partial 映射为成功，丢失覆盖差异。
- Task A 的调用 builder 与 production workflow 没有完整传递 visualParts。
- PPTX/DOCX 文本提取缺少表格、对象关系和视觉覆盖；XLSX 缺少 workbook sheet-name / range 关系。
- `deepseek.ts` streaming 仅在 QA 开启，production 不具备 Activity bridge。
- `RebuildStagingStore` 的 read/modify/write 不支持并发写，不能简单把现有 loop 换成 Promise.all。
- Task B expansion 以 canonical object ID 为请求单位；v0.3 需要稳定 Evidence Ref 和连续会话。

实现顺序先解决结构与隔离，再并发，不把旧存储竞争带入新 scheduler。

## 2. File Understanding 与处理环境

在 offscreen document 中管理原始 byte、native worker、visual rendering worker。Service Worker
只接收有界的 normalized document；源文件不进入云端文件存储，不增加原生安装依赖。

| 格式        | Native structure                                                                                        | Selective visual completion                                                            | Locator                                     |
| ----------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------- |
| PDF         | PDF.js text items、位置、page operator list                                                             | image-only / image operators / 无法表示的绘图区域；按 page rasterize，并告知已覆盖文本 | page，textRanges 坐标                       |
| PPTX        | presentation relationship 顺序、shape text、table row/cell、notes、group relationships                  | picture、chart、diagram、无法由 native text 表达的 object；需要时渲染对应 slide        | slide；cells 元数据保存 table/row/cell      |
| DOCX        | body 顺序、section、paragraph、table row/cell、关系与 embedded media                                    | drawing / embedded object / layout-sensitive region；保留段落或表格 anchor             | paragraph / table；section 与 cells 元数据  |
| XLSX        | workbook sheet relationships、真实 sheet name、cell 类型、formula + cached value、merged ranges、tables | drawing / chart / 无 cached result 的公式等明确缺口；不以 sheet 纯文本冒充结构         | sheet / range / cell / table                |
| DOC/PPT/XLS | OLE directory/signature 识别；内部 canonicalization 到对应 OOXML                                        | 复用现代格式路径                                                                       | original Source + canonical locator mapping |

### 2.1 Local conversion 与渲染

首选可离线打包、无动态 JS execution 的 LibreOffice WASM worker；转换只改变内部 representation。
转换 worker 的并发固定为 1，按需 lazy initialize，批次结束释放内存；不与 10–25 个 AI package
一一创建 converter。Office rendered PDF 的 page 与 slide / document anchor 建立显式 mapping，
不能把转换后 page 编号伪装为原始 DOCX 的 paragraph 编号。

固定依赖为 `@matbee/libreoffice-converter@2.7.2`。原始发行包的 Emscripten Embind
动态 function construction 被 MV3 CSP 拒绝；`extension/scripts/office-assets.mjs` 使用静态
closure marshaling 替代两处动态 binding，固定版本与 anchor，漂移时构建失败。
不启用 `unsafe-eval`。实际 MV3 synthetic DOC/PPT/XLS roundtrip 与三种现代格式 rendering
已进入 `scripts/v030-office-check.mjs`，最终结果见 Engineering Report。
运行任务 timeout 90 秒；空闲 120 秒 terminate worker。当前使用 pinned package 的 worker
属性直接释放，依赖内部 API；corrupt/password、复杂真实文件、峰值内存和完全回收仍需验证。
发行包缺少完整 third-party notices；MPL 文本及修改后的 source 已打包，发布前需核验 binary
provenance 与第三方 notices，不能把功能测试当作许可审计通过。

### 2.2 选择视觉补全

选择条件是 parser 提供的机械覆盖缺口，不是课程关键词或 Assessment relevance 规则。
无 visual gap 的 native unit 不发送图像；有 gap 时只发送该 unit/region，附带已覆盖的 native
内容与 gap descriptor，模型补足缺口并引用同一 Source/Locator。
图像生成失败、截断、预算不足或模型 sourceResult 为 Partial 或本地 unresolved 均留下 partial coverage，不能标为 Complete。

资源上限是保护机制：byte 超限、ZIP inflation、parser 异常、解析 timeout、render dimension
超限明确报告，不能丢弃尾部内容后宣称完整。沿用 64 MiB source / 500 native units / 2M text chars
作为初始 guard；上限命中记录 gap，未来调整有测试和 ledger 依据。

## 3. Source / Locator / Evidence / Normalized Unit

现有 message/storage schema 使用兼容的 string locator，原生结构保存为 `ParsedTextUnit`：
`locator/text/partial` 加上可选 `kind/section/sheetName/cells/mergedRanges/textRanges/visualGaps`。
DOCX embeddedImagePaths 用于精确 media 提取；其他复杂 DOCX gap 使用唯一原文 anchor
映射转换后 PDF page，无法唯一映射则保留 unresolved。PPTX slide、XLSX sheet visual unit
按相应 index 渲染；自然 locator 不自动成为模型 semantic unit。

Original Source 的 sourceId、nativeItemId、title 保持不变；原始 SHA-256 用作机器 fingerprint。
canonicalization 保存 original/canonical format、converter version 与 canonicalHash。
EvidenceRecord 增加可选 origin（native / visual / unverified）与 representationHash。
Native excerpt 必须匹配 supplied unit；视觉 excerpt 只有 locator 在实际 rendered coverage 中才
标 visual；其余保留 unverified，不能冒充原生引用或直接认证模型语义。

B 的 native Evidence Ref 由 Source ID + 原始 hash + locator 的 stable digest 生成，保留精确
字符 range。它是 workflow 的机械引用，不是新的用户可见 Source，也不按 title similarity 生成。

## 4. Source Inventory 与 fingerprint

Discovery 的 stable Source ID 继续从 native identity 生成。附件使用原始 bytes SHA-256，native body
使用规范化 payload hash；必要 metadata / structure hash 单独保存。representationVersion 升级
导致 incomparable，不能产生 semantic removal。

Check 在 fingerprint 未变化且上次解析版本适用时复用理解结果，零 AI。New / changed 才进入 A。
Missing candidate 只在完整 discovery、无 permission/fetch/parse gap 时成为 Task C coverage 输入。
单次失败保留 trusted inventory；旧 parsed payload 不能冒充本次成功观察。

## 5. File-level Task A package 与技术分割

一个 Source 一个 logical package，内部携带所有 native units、gap-targeted visual parts、file context。
默认一个物理 Task A 请求；page/slide/paragraph 只是 locator，不作为默认 AI unit。

Production 使用官方 `POST https://api.deepseek.com/chat/completions`。分包与 transport 共用
`provider-request.ts` serializer，按完整 JSON envelope 的 UTF-8 bytes 校验官方 inline boundary：
48 MiB body、32 MiB decoded single image、64 MiB decoded total images、600 images、8192 px
边长（至少 15 images 时 4096 px）。来源：DeepSeek Vision guide，2026-10-04 核验。
不再使用 20 images / 24 MiB、默认字符切割或 guessed input-token preflight 来决定分包。
文本 body 超限通过完整连续 range 继续拆分；visual parts 仅在真实 boundary 触发时分组，记录原因。
不可再分的 envelope/image 显式抛出 `AI_CONTRACT`，不得漏页后成功。
现存 output ceiling 的估算/guard 尚属 audit 中的未验证边界，本轮未将其当成官方硬约束。
每个 split 保留同一 packageId、sourceId、file overview、ordered locator index、partIndex/count。
全部 part 完成后最多一次文件内 AI consolidation；失败恢复只重试失败 part，成功 part 复用。
Local 不能用 title/keyword 规则替代文件内 AI 聚合。

## 6. Adaptive bounded concurrency、持久化与恢复

Scheduler 初始 10、上限 25；健康完成窗口后逐步增大。429/timeout/provider pressure 执行
multiplicative decrease（最低 1）、暂停新 dispatch 并遵守 Retry-After；恢复后再增加。
已删除估算 weight、全局 payload memory budget 和全局 render 槽。Render span 在 payload
交接后结束；AI request / consolidation span 独立，渲染不等待模型完成。Office 的共享 converter
仍在实际 `withOffice` 操作期间互斥，PDF 不受该锁控制。DOCX embedded ZIP 32 MiB 等剩余
保护值仍列为未验证风险，不宣称正常 workload 容量已获得 stress qualification。
`qa.runtime` start/end 记录真实 package/render/physical AI/consolidation 占用，`qa.runtime-wait`
记录 package admission / shared Office wait；`qa.visual-payload` 记录实际编码字节与覆盖数。
动态 10–25 是 Product file-package 目标，不是强制 Provider 请求数量，也不是已验证的内存容量。
网络/浏览器失败停止新增 package，已派发工作 settle 并保存成功 cache。429 按原始 Retry-After
暂停，不缩短为猜测窗口；失败层区分 browser-request/network/timeout/abort/provider/schema。
现存 workflow retry/deadline 未在本轮全部重构，audit 状态与 remaining risk 保留。
每个 package 独立计算结果，不直接并发修改共享 staged bundle。完成结果进入串行 commit queue，
在 lease token / restore generation / workflow identity 检查后提交。Task B 输入按 discovery ordinal
稳定排序，与 network completion 顺序无关。既有 `writeState` 和 revision reducers 保留。

`Promise.all` fail-fast 不能管理 worker lifecycle：停止 dispatch 后必须 drain settled workers，
过期 worker 丢弃结果。auth/revoked authorization 立即停止新调用；取消信号传至 fetch/SSE；每秒检查 lease/generation ownership 并 abort。native parser/render
当前不能中途由 workflow signal 取消，只在前后检查 ownership，Office 操作由独立 timeout 约束。
lease heartbeat 是存活更新，不是 10 分钟产品流程 timeout。
PDF.js hidden offscreen rasterization 使用 print intent，避免依赖 requestAnimationFrame。
附件 fetch 60 秒、PDF load/page/text/render 各 30 秒、destroy 5 秒边界防止永久等待。
SourceRecord 保存 discovery metadata 以跨 worker eviction 恢复；旧附件仅接受其原有
nativeItemId 中的 NTU Learn HTTPS URL 作兼容恢复，不重新猜测 Source 或清空成功调用。

失败策略继承现有 schema repair / empty fresh retry / transient backoff；记录每个物理调用。
package checkpoint identity 包含 source hash、parser/prompt/schema/provider policy version。
不复用不同 Source hash 或旧 prompt 的成功结果。Initial/Rebuild/Check 均支持 failed-only resume。

## 7. Task A output 与 Shared Working Context

复用现有 TaskAResult /1 envelope，以可选兼容字段与 task-a/3 prompt 扩展 fileContext、identityContext、structuralRelationships；Assessment Draft aliases、
fields/requirements、structural relationships、identity context、uncertainty、EvidenceRefs。
Validator 检查 supplied Source/Ref、范围、角色、必填字段和禁止 autoApply 等指令。
不做语义 relevance 过滤，也不通过 Local title normalization 决定 merge。

A→B 传递 versioned structured context，不共享 A 的 conversation/reasoning，不默认传原文件全文。
Shared Working Context 从当前 workflow 的 successful AiRun payload 投影；它仅在 runtime checkpoint 中，不写 trusted state。

## 8. Task B logical session 与 Evidence Ref retrieval

一个课程级逻辑 session：system stable prefix + course/index + ordered shared contexts，返回
Same/Different/Uncertain、canonical proposals、facts/requirements、relationships、provenance。
初始输入包含可用 refs 与必要 excerpts；不重复附加全部原文。

模型可返回 `requestedEvidenceRefs`。Local resolver 精确校验 workflow、Source、representation hash、
locator 和 range；不再默认限制 ref 数、excerpt 长度或 expansion 轮数。省略 length 返回剩余完整
文本；显式 range 保留 start/end/truncated。每轮必须增加实际字符 coverage，重复已交付区间、
stale/malformed/missing refs 无新增证据时返回 `AI_CONTRACT / EVIDENCE_NO_PROGRESS`。
请求和响应追加回同一 logical session，不 silently skip 或把未完成判断标为成功。
参照官方 Chat Completions API 组织 messages；JSON continuation 不是 tool call 时不传完整 reasoning。
若以后使用 thinking + tools，必须遵循官方对 reasoning_content 的会话要求，并仅在内存保留。
本版优先显式 JSON ref request，避免引入第二种 tool orchestration。

Context cache 为 provider 自动 prefix caching，stable system / ordered base context 在追加中保持一致。
记录 cache hit/miss tokens；不把 cache hit 作为正确性或复用 A conversation 的证明。

## 9. Task C 与共用 workflow

Task C 保留 current trusted projection + latest Task B result + Evidence + User State + coverage。
Initial Scan 无 C；Rebuild 无 C，仍为 preview→Use/Keep；Opportunity/Manual Check 在 machine change
后使用同一 A/B，再 C→既有 Change Review。Task C 不重新解析文件，不重新承担 Identity Resolution。
coverage 不足时 validator/reducer 拒绝 Possibly Removed。所有 adoption 继续使用 expectedRevision。

## 10. Provider 与 AI Activity bridge

2026-10-04 官方能力：`deepseek-flash` Chat Completions 接受 user image_url parts（base64），
reasoning_content/content SSE；使用 direct BYOK 和原 endpoint。不使用外部图片 URL 或 Files API
以免扩大课程数据持久化范围。图像预算遵循官方 body/image/count 上限并预留 envelope margin。

Production 开启 SSE；增量 UTF-8 decoder 处理跨 chunk、多 data block、CRLF、[DONE]、usage、
truncation、断流与 abort。成功 JSON contract validation 与 Activity 展示分离。

Activity broker 位于 workflow runtime memory，绑定 workflowId、lease generation、task、source title。
每个运行调用维护最近 3 个短片段，总 UI 文本最多 600 chars；100–250ms 节流，避免每个 token
重建整个 DOM。通过 extension-only runtime Port 订阅；重开 surface 仅恢复当前内存窗口。
多 A 调用按最近有活动的 Source 展示，不能交错为一段伪造 reasoning。

展示前确定性去除 credential-shaped strings、API key exact value、internal IDs、URLs with queries、
machine-only JSON keys；无法安全展示则只保留真实 task/source working 状态。使用 textContent。
raw stream 不写 chrome.storage / IndexedDB / backup / Course State / Evidence / logs。
task finish/wait/fail/cancel/lease loss 清空；生产 Activity 不复用 QA raw trace 持久化机制。

## 11. UI component / motion 实现

沿用 `app.css`、`screens/patterns.ts`、`copy.ts` 与既有 design-system。统一 typography、spacing、
action tiers、status、input、assessment/course hierarchy，延续 Product Mark、flat planes、forest accent。
不添加一级页面、不改变 Review/Calendar/Settings 业务语义。

统一 motion tokens：press 100ms、disclosure 150ms、reveal 180ms、view 200ms；曲线采用现有
continuity vocabulary；非 working 装饰不循环。进入/离开用 WAAPI/DOM keyed regions，保留焦点、
scroll、input selection；异步 response 不重建当前编辑框。reduced-motion 禁用位移与非必要动画，
仍显示状态文本和 focus indicator。Activity 使用独立 text region 更新，不触发 page transition。

Browser verification 覆盖两种 surface、reduced-motion 与正常 motion；静态 CSS test 不能代替截图
或真实 Review/Evidence/Edit 操作。最终截图回填 Interaction/IA；发布前再更新 README。

## 12. Instrumentation、evaluation 与真实验收

现有 AiRun 保存 workflow/checkpoint；QA session metadata trace 逐个记录 physical call 的 task、
logicalUnitId、attemptType、latency、input/output/reasoning/cache tokens、model 与 fingerprint。
`scripts/v030-ledger.mjs` 汇总 metadata；它不输出 prompt、reasoning 或课程内容，缺失任一物理
调用 usage 时总 token/cost 为 unavailable。pricing 由带日期与 currency 的显式输入提供；
缺少 cache split 或 pricing 不估造费用。observation span 包含等待与 Review，不能当作模型 runtime。
保留 metadata，禁止保存 key/prompt/raw reasoning。cost 使用运行日期 provider price 与实际 usage，
缺失 usage/cost 写 unavailable，不能填 0。retry 的成本计入，不只统计成功调用。

现有 Vitest regression cases 扩展 native/visual/legacy、file organization、Same/Different/Uncertain、
Evidence expansion、unchanged zero-AI、failed coverage/removal、stale worker、retry reuse、stream framing。
fixture 只证明机械 contract；AI semantic quality 需真实 model cases，真实课程不能用 fixture 替代。

v0.2 baseline：119 Sources、A starts 216、consolidation 41、B 1+2 expansions、73 Assessments、
879 Facts、521 Evidence、72 Review items。这些为历史样本，缺失 token/runtime/cost 不虚构。
比较前校验课程内容变化、model/price/version/coverage；不同内容的比较明确注明不可直接归因。
full E2E 一门大课程；其他入口 targeted。Human Gate 校验视觉/交互与真实语义和 Review burden。

## 13. Migration、backward compatibility 与安全

采用可选 versioned fields 迁移 Source/Evidence，不重写旧 trusted facts、decision、历史。
旧 workflow cache prompt/schema fingerprint 不匹配时不复用；旧 backup schema 继续可恢复，
新 runtime Activity/byte buffers 永不进入 backup。必要 IndexedDB upgrade 只新增 stores/index，
测试中断恢复、atomic generation switch、旧 Course Brief/Calendar。

Secret 不进入 repo/log/Drive。BYOK 只通过现有用户本地存储和授权边界读取，测试不导出真实 key。
所有新增 parser/converter 资源本地打包，禁远程 executable、unsafe-eval、native/cloud fallback。
无提交、push、tag、Release 授权；测试 PASS 不构成发布授权。

## 14. 官方参考与证据界限

- [DeepSeek Vision](https://api-docs.deepseek.com/guides/vision/)：image input contract 与 limits。
- [Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)：SSE / messages / usage。
- [Context caching](https://api-docs.deepseek.com/guides/kv_cache/)：prefix cache；实现前复核。
- [LibreOffice WASM build](https://github.com/LibreOffice/core/blob/master/static/README.wasm.md)：本地 WASM 路径存在，不等于候选发行包已通过 MV3 验证。
- [候选 converter](https://github.com/matbeedotcom/libreoffice-document-converter)：第三方分发需 qualification。

本设计是实现方案，未把 planned 能力标为 PASS。converter qualification、实际并发、语义质量、
完整 coverage 和真实成本对比必须分别产出证据。

## 15. Runtime repair after accepted Global Limit Audit

P0 parser 默认 unit/text 容量上限撤销；Discovery / enrollment 完整分页，附件字段和 native capture
迭代遍历。分页 cursor / graph visited guards 保留，显式调用方限制仍产生可观察 issue。
Restore 默认容量不再小于同系统 Export；调用方显式限制和完整 integrity/reference 校验保留。
Task A nested Evidence source 校验移入 physical repair boundary；旧缓存复用前重验，不再把
未知 Source 的输出先缓存成功、后在 materialization 中报 INTERNAL。无效 cache 可重新处理，
有效 fingerprint 匹配的已完成结果保留。验证和真实课程尚存缺口以 Engineering Report 为准。

### Active MV3 worker lifetime

真实 recovery 的 metadata 在 2026-10-04T11:50:43Z 停止增长，但 workflow 仍 working；随后读取到的
worker timeOrigin 为 11:53:51Z，已不属于原运行。现存 lease heartbeat 每五分钟执行，只更新
IndexedDB，不能覆盖 Chrome 30 秒 idle termination。`withActiveWorker` 仅包裹活动 workflow，
按 Chrome 官方 waitUntil example 每 25 秒调用 getPlatformInfo，finally 清除；这是外部生命周期
约束的 heartbeat，不是 workflow execution window。无活动工作时不持续保活。
来源：<https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#keep_a_service_worker_alive_until_a_long-running_operation_is_finished>。
保留持久化 checkpoint 与 lease recovery 应对真正的 crash/reload。独立 browser negative-control
probe 必须不附着 worker debugger，避免验证工具掩盖 idle termination。

### Recovery and observability closure

成功file-package outcome作为taskAPackage checkpoint附着到已有physical AiRun（不是新的AI调用）；
同workflow/source/native input与prompt/schema/output配置及renderer policy revision一致才能复用。
重验nested evidence和所需visual locators；Partial/未交付定位符不能用empty renderer伪装为完整。
Renderer/mapping语义改动必须更新package policy revision。Cache hit跳过成功包渲染、Provider和
consolidation，失败包继续处理；更旧的physical cache仍按invocationFingerprint匹配。

Repair使用完整rejected response与不含原文的JSON parser位置，唯一容量检查是实际请求边界；
不扩大repair次数。SSE body中断/无finish reason的EOF是明确network failure，不接受JSON前缀当
完整响应。QA physical span携带packageUnitId；offscreen resource wait通过runtime转发到后台，
release stub移除listener。Evidence continuation以原始ref/range进展检测，初始化已有Evidence，
returned excerpt ID alias不提供新coverage。

## 16. DA-001 Source Triage implementation design

Triage 位于 task-a phase 的 file scheduling 之前，独立 task / schema / prompt / ledger，不新增 UI phase。所有成功 native-captured Source 生成 profile；通过 AI 返回分类，Local 仅校验 schema、精确 Source coverage、合法字段引用和 routing。只有 HIGH TEACHING_ONLY 不派发 File Understanding / render / A；低 confidence、冲突和 UNCERTAIN 均进入。

Profile 不含原文件、图像、请求 URL 或完整 parsed text。以首尾 native unit 的首尾句作为 structural bookend samples（采样位置由自然边界决定，完整 count / omittedSampleUnits 明示，不设置课程 page / file / chars 容量上限）；没有 units 的原生文本同样首尾句，并明确 sampled / omitted 信息。保留完整 native text 在本地 downstream。完整 hierarchy 保留 parent identity / title / nativeType，cycle 明确报错。内容 hash、机械 metadata、hierarchy、policy、prompt、schema 共同决定 reuse；不包含 volatile raw API payload 或 signed URL。

课程级 request 使用 production serializer 的实际 bytes 检查，仅在已验证 Provider body boundary 时拆分；单 profile 不满足边界明确失败，不截断。Triage max_tokens 使用 Provider 已验证 max output，不复制旧 A/B/C arbitrary guard。Provider context rejection 保留明确失败证据，不猜 token / Source-per-batch 上限。沿用现有显式 schema repair / workflow retry，独立 telemetry。

Source 上保存 profile fingerprint、policy / prompt、classification、confidence、reasonCode、evidenceUsed、rationale；AiRun 保存 exact response checkpoint。Check 在机器未变但 Triage identity 变时不能零调用提前结束，Rebuild / Initial 使用相同 routing。写入前验证 workflow ownership；重试复用已完成 batch / Source checkpoint。

PDF mechanical detector 只将能证明是一维 line / page background / simple border 的 vector 操作作为装饰；其它未知 path、shading、image region 保留 explicit gap。无 native text 的扫描 / image-only 页面保持 Partial。不得通过 Triage 抑制 parser regression。

实现与 deterministic / targeted real-model 验证已完成，完整课程 / cold-start 仍暂停。证据与未证明边界见 Engineering Report §8。

Profile v2 从已保存 Blackboard native capture 的原始字段提取 body / displayText 等确定性内容，避免把 JSON wrapper 作为正文；保留首尾自然句和显式省略计数。structure 保留首尾 locator labels 与 structureEntryCount；nativeOutline 使用每个原生 unit 已有的首 text-range span，未重新读取原文件。父容器正文样本与 contentFingerprint 进入输入/reuse identity，不按目录语义硬分类。该结构仍可能随文件增长；仅在实际 Provider byte boundary 分割，context rejection 明确失败。

Task B 的 context、Evidence catalog 和 retrieval 同样按有效 Triage routing 取 semanticSources，HIGH TEACHING_ONLY 保留 inventory 而不从 B 入口重新引入。既有 trusted facts / Review 不被自动删除。

PDF 判定实现仅证明无绘制/clipping path、identity transform 下的明确整页背景/边框可忽略；未知线条、pattern、transform、文字覆盖区域和 shading 保留 Partial。并未把所有 logo / drawing 判为装饰，也未重解析历史 876 页。

真实 profiles 结果没有 HIGH TEACHING_ONLY：117 Sources 全部仍进入下游。不能降低 confidence gate 或使用目录过滤来制造收益；下一阶段须由 Product 判断该 conservative scope 是否符合预期。

## 17. DA-001 revised routing（P2E-005，覆盖 §16 HIGH gate）

最新 Product authority 为 P2E-v0.3.0-2026-10-05-005、DA-001 §11 与现行 PRD。confidence 只作 telemetry。只有 Deep 返回 `TEACHING_ONLY + productRelevantEvidence=ABSENT + profileCoverage=SUFFICIENT` 才 SAFE_TO_SKIP_TASK_A，其余继续；Local 不进行课程语义判断。

Coarse 对全部需 Triage Source 使用 identity / hierarchy / native type / counts 与第一个自然边界 text sample，不发送 nativeOutline、structure list、surrounding text。只允许 PROCESS / DEEP_TRIAGE_CANDIDATE，任何 Coarse 输出均不能直接 skip。Deep 只使用 candidate 的原有丰富 sampled native profile，仍不包含二进制/图像/整份文件。Native 数据在本地完整保留。

当前 policy `source_triage_da001_v3`，Coarse schema/prompt `syllab.ai.source-triage-coarse/1` / `source-triage-coarse/1`，Deep schema/prompt `syllab.ai.source-triage/3` / `source-triage/3`。Full profile fingerprint 包含两个 pass 的 policy/prompt/schema；Coarse projection 携带完整 identity fingerprint，以保留未采样正文/位置变更的 invalidation。Source checkpoint result 可为 Coarse 或 Deep：Coarse PROCESS 和有效 Deep 为完成态；Coarse candidate 只完成 Pass 1，不能让 unchanged Check 提前结束。

每个 schema envelope / exact Source coverage / evidenceUsed 实际字段引用独立校验并进入既有 repair boundary。AiRun 每 pass 保留真实 schema/prompt、调用 identity、duration/usage 与完整已验证 batch。中断 Source checkpoint 可从同 workflow 的匹配 batch 恢复；优先当前 Deep 成功记录而不是随机 AiRun ID 顺序，再取 Coarse。持久化 candidate 可直接继续 Deep；已完成结果不重复调用。有效 Safe-to-Skip 只保留 inventory/native/provenance，不派发 render / Task A，也不重新进入 B catalog；trusted state / Review 沿用原规则。

只有实际 production serializer / 已核验 Provider request boundary 才分割，不按 Source 数量、confidence、猜测 token/memory 或墙钟设新限额。使用 Provider 最大输出能力；外部 context rejection 明确失败，不通过省略 Source 修复。独立 ledger 用 logicalUnitId 中的 pass 和 schema/prompt 区分 initial/repair/failure，缺成本/usage 填 unavailable。

Parser-only 测量是独立 QA 路径：从既有 19 attachment Source/provenance 建 manifest，经已登录 QA session 定点取原字节、与既有 contentHash 比对，私有保存。只运行当前 parseDocument；不 Discovery、不模型、不 rasterize、不修改 Source/workflow/cache。逐 locator 对比原生文本和 unit identity，保存机械 trigger 与旧 gap→native complete 的 locator 清单。产物仅去身份 alias 与计数，原文件/URL/课程文本留在 private evidence。

Targeted real-model evaluator 仅读取保存 metadata/native profiles，Coarse→candidate Deep，记录独立 QA AiRun/job；不修改 Source classification 或历史 workflow。活动评估复用现有 Chrome 官方 heartbeat 保活，结束 finally 清除，不设执行截止时间。最新 parser scope projection 通过 SHA-256 Source alias 与 parser-only report 精确关联，不把旧 876 当新 parser 结果。所有 skip 还须进行已提供 profile evidence 审查；有重要产品相关错误即停止返回 Product。

## 18. DA-002 Index-first selective retrieval（当前设计，覆盖 §16–17 routing）

当前本地最小生产路径已切换为唯一 DA-002 routing；旧 Triage 只保留历史 schema/ledger 与 compatibility/QA，不参与正常 workflow 分流。该集成已进行合成回归；真实 Planner gate 未通过，不能进入真实课程 workflow 或宣称 scope accepted。

Index 固定 schema/policy version；Source rows 包含 stable Source Ref、native type、title、parent Ref、原始 representation fingerprint、native unit count、完整 unit目录。Unit rows 为 compact tuple：Unit Ref / Source Ref / 原 locator / 原生 first text-range span（无 ranges 时 first natural sentence）/ native chars / text-block count / cell count / gap triggers。所有 Sources 和每个已有 natural unit 都有行，不按 first-N / 随机 / keyword 选单位；anchor 明示是结构首 span，不代表完整 unit。尚无 unit 的原生 Source 仍可按 Source Ref 展开。Ref 从原 Source identity + locator 机械生成并检测碰撞；fingerprint 与 Ref 分离，使内容变化保持地址但使 checkpoint 失效。Index 不含完整正文或 Local semantic labels。

Planner 首轮只接收完整 Index。REQUEST_REFS 返回 Source / Unit refs；Local 验证已提供 Ref，再原样取回完整 requested unit 的 native text/cells/ranges。对有 natural units 的 Source Ref，只展开该文件 unit目录，而不隐式取回所有 unit 正文；无 units 的 Source Ref 展开已捕获 native body字段（字段选择是 API representation，而不是课程 relevance）。后续请求累计 index + 已明确请求的 native payload，仍为一个 Planner logical session；全部 Source 的终止为显式 PROCESS / NO_FURTHER_EXPANSION / UNCERTAIN。未知/信息不足不得默认 NO_FURTHER_EXPANSION。

Visual intent 必须是 Unit Ref、AI 明示相关/可能相关并需要视觉，且该 exact unit 原生 evidence 已返回、其机械 gap unresolved；任一不满足即 schema/contract error。当前 targeted probe 只记录 intent，不 rasterize / Vision。生产只把已选 native/visual evidence 传给同一 Source 的 Task A package；不 multi-Source grouping，原 Source/native inventory 仍保留，未展开内容不会被覆盖成 Complete。

循环没有固定 rounds/time/page/refs cap。重复请求无新 evidence 触发明确 PLANNER_STALLED（防无限循环 guard）；未知 Ref、重复 Source decision、终止 coverage不完整有 typed contract error。实际生产 serializer Provider body boundary 显式检查；Index 无法装入真实边界时停止并报告，不丢行或猜 token 上限。max output 仅 Provider verified ceiling。成功 round 的 invocation identity 包含 index/policy + 累计 requested native payload，重试复用已验证 AiRun；final checkpoint 包含完整 index fingerprint与decision/expanded refs/visual refs。不同表示/内容/位置/policy重新规划；Check 的机器变化检测与 trusted-state保护沿用原边界。

QA 从既有保存 Sources / 880 units 建 index，依据 parser-only report 的精确 Source alias/locator记录应用 852当前 gap metadata于临时副本，不写历史 Source或workflow。逐轮日志只共享 refs aliases/计数/真实usage/latency/repair；原文、URL mapping、完整输出/推理仅 private。评估须先检查六份 Lecture-context 产品反例及未展开内容；miss、近乎全文输入/展开或外部边界冲突即停止，不堆 local heuristic。

### 18.1 P2E-006 历史协议 v3 与生产 checkpoint（由 §18.2 覆盖）

policy `index_selective_retrieval_da002_v3`，schema / prompt `syllab.ai.retrieval-planner/3` / `retrieval-planner/3`。PROCESS 表示下游选中，NO_FURTHER_EXPANSION 仅表示 AI 明确 ABSENT 后不处理，不能把“已读完”当“无产品内容”。Source Ref 对无 units Source 展开完整已捕获 parsed native representation，保留 API 日期等事实；文件目录 Ref 不作为 Task A 正文。

AI 最终 PROCESS 若包含尚未读取的已知合法 Ref，先作为 acquisition intent 校验 ownership，精确取回并标记 NATIVE_READ_PENDING，再进入下一 logical round 原生确认；不能因该正常请求直接失败，也不能未经原生确认接受 sufficiency/视觉请求。最终完整 Source accounting 有明确 duplicate/missing refs diagnostics。UNKNOWN 保留显式 Partial，不 silently skip / Complete。

每个 Source 保存全局 index fingerprint、policy/prompt/schema、已读取 refs、终态 decision、native sufficiency、visual intent。Initial 新 workflow 不跨 workflow 复用 Planner；Check/Rebuild 只有全局 inventory 与协议均一致才复用。已完成 AiRun 可恢复 checkpoint 写入中断。完整原 Source 不被 selective view 覆盖，Task A 仍一 Source 一主逻辑包；render view 只含显式 AI 视觉请求，原始 gap coverage 只有全部证明确认后才可 Complete。Backup 排除 derived retrieval checkpoint。

无成功 captured candidates 时不调用 Planner；机械获取失败事实保留。真实 validation 尚无 v3 accepted final scope，网络/协议失败见 Engineering Report §10。

### 18.2 P2E-007 当前协议 v4：Acquisition / Selection / Visual Request

DA-002 方向不变。policy `index_selective_retrieval_da002_v4`，schema/prompt `syllab.ai.retrieval-planner/4` / `retrieval-planner/4`。唯一输出为 `status=CONTINUE|COMPLETE`、`requestRefs`、`selectedEvidenceRefs`、`visualRequestRefs`；可选 `uncertainRefs` 保留 AI 显式未知，不生成 Local relevance label。旧 Source classification / PROCESS / NO_FURTHER_EXPANSION / nativeDecisions envelope 不再接受，避免 empty-scope 混淆及 Source enumeration duplicates。

requestRefs 只决定 acquisition；Local 解析已知稳定 Ref，exact dedup 后只返回未取得的 Ref。selectedEvidenceRefs 只能是已读 native evidence；未读 selection 是明确 protocol failure，修复提示要求放入 requestRefs、等待返回后再选，不再自动把 selection 当 acquisition。visualRequestRefs 必须是已读、selected 且 unresolved coverage 的 UnitRef；文件 Source目录 Ref 不作 native Task A 正文。COMPLETE 只能无 pending acquisition；CONTINUE 没有新增 Ref 触发 NO_PROGRESS，不设固定 rounds / refs / timeout。选择已读 unit 且无视觉请求、无该unit显式uncertainty表示 AI 对产品相关 native meaning 已足够，不证明机械 coverage Complete；selected也可保留显式uncertain / Partial，不能由Local强迫增加Vision。

无需每个 Source 一条语义分类；Local 仅按 Ref 的确定性 Source ownership 将已选 evidence 分组为原 one-Source package。每个 Source checkpoint 保存 readRefs / selectedEvidenceRefs / visualRequestRefs / uncertainRefs 与全局 index/native/protocol fingerprint。未选不能由 Local 叫 teaching-only 或 Complete，不生成永久黑名单。现有 Task A/B/C、Review 与 trusted-state 边界不改。协议版本变化使旧 AI scope 失效，但 objective native expansion 在完整 Source identity/unit count/native fingerprint 与 exact expansion 内容匹配后复用。

Offline replay 使用 private 原始 accepted/failure outputs：拒绝歧义旧 envelope；9 个未读 processing intent 在 QA exact-set translation 中分为 requestRefs，已读 refs 才可 selection；duplicate Source rows 改为 exact Ref集合，不通过 rationale/title/keyword 生成 selection。初版全 117 NO_FURTHER 不能恢复真实 selection，必须由 AI 重新给出，不把 offline 转换当 Product accepted scope。

本轮只允许一条真实 logical continuation，从已取得 223 refs（51 Source / 172 Unit）继续，已有证据不再次 Fetch/parse 或请求为未读。Product 明确的一次授权使用单独本地 attempt record 防重复启动，不是产品容量 cap。已有 schema repair 与 exact expansion 可在该 continuation 内发生；Provider/network failure 安全保留现场并停止，不能自行再起一条。真实 final scope、recall、projection 和 usage 记录于 Engineering Report。

### 18.3 P2E-009 acceptance-only semantic-clean isolation / recovery

`qaSemanticClean` 只由 QA 编译桥 E2E_CLEAN_REBUILD 设置在新的 Rebuild workflow，EngineOptions.allowQaAcceptance 在 release 为 false，普通 UI不提供入口。持久化标记随正常phase/retry/worker recovery流转；新验收拒绝任何仍active的既有workflow，不修改历史记录制造clean。普通Check/Rebuild的跨workflow复用策略不变。clean Planner checkpoint必须属于当前workflow；generic AiRun查询附加当前workflow过滤。Task A package和B Shared Working Context本来按workflow查找；A/B调用identity包含workflow。相同workflow成功semantic结果仍可恢复。

真实clean首轮发现Planner响应同时违反未读selection和目录selection，旧validator只报告首个错误，repair会残留另一违规。当前schema/policy仍v4，prompt升级retrieval-planner/5：传机械readEvidenceRefs集合（已展开、排除文件目录），明确unit.ref与unit.sourceRef的不同；validator在一次diagnostic内报告全部invariant violations，不增repair次数或round上限，不补Local selection。

`restorePlannerAcquisition` 只恢复同workflow成功Planner调用的objective native acquisition。每条accepted round需exact idempotency payload digest匹配当前完整Index及累计expanded；支持v4旧输入与v5机械read集合输入，Source/native变更即不匹配。结果只取requestRefs精确expand，绝不复用旧final selection/visual intent或失败输出。恢复跨prompt变化仍保留已取得native，成功scope的generic恢复继续由prompt/schema/request fingerprint守护。无固定Ref/round/timeout/memory新限制。

Fetch路径仍为BlackboardMachinePort→offscreen PARSE_ATTACHMENT→fetchAttachmentPayload→parser worker，没有读取私有19附件cache。真实浏览器/HTTP/Provider cache不清空。QA trace按已有session机制写入，acceptance harness不断定点保存本轮私有快照并合并events，避免把session环形buffer当完整账本；不改变产品容量。课程updatedAt可因enrollment刷新而变化，单独记录该metadata，不混同trusted对象/revision变化。

P2E-008真实运行暴露的未闭合路径：Fetch阶段历史visualCoverageHash可提升本轮fresh Partial为ok，QA-only lookup隔离没有封住该derived coverage状态继承。未把既有正常用户cache策略改掉，也未在Product stop后修复；后续clean context须保留fresh parser状态，单独记录历史机械coverage，而非把它当本轮semantic完成。Planner终态只基于累计native输入重新选择，前轮selection没有作为model-visible continuity context；真实final删除10个先前已选known产品locator。下一步应由AI进行明确selection reconciliation，不能Local猜semantic或自动union。验证失败与停止数据见Engineering Report§13.3。

### 18.4 P2E-010：selection continuity 与 coverage-clean acceptance

当前协议为 policy `index_selective_retrieval_da002_v5`、schema `syllab.ai.retrieval-planner/5`、prompt `retrieval-planner/6`，覆盖前述历史 v4。`selectedEvidenceRefs` 是本轮 additions；Local 只执行 previous union additions minus explicit removals。`removedSelectedRefs` 必须列 exact ref、非空语义 reason、非空已读 supporting evidence/context refs，只能撤销此前 selected ref，不能同轮 add/remove、重复或引用未读证据。遗漏不构成 removal；已读未选 evidence 不自动 selected。每次输入含完整 `previousSelectedEvidenceRefs`，COMPLETE 返回 cumulative scope；原 request/read/directory/visual invariants 保留。

同一 workflow 的 current-schema、current-prompt、完整 Index/native request identity 匹配且已验证 AiRun 可恢复累计 selection 与 acquisition；accepted COMPLETE 可恢复 checkpoint，不新增模型调用。旧 prompt 只可恢复客观 acquisition，跨 workflow 不能恢复 semantic state。独立 QA targeted Planner 接受已保存的 exact native acquisitions，并逐项比对当前原生文本、locator、cells 与完整 Index rows；从空 selection 开始，不采用失败 workflow 的历史 final scope。QA oracle 只用于验收断言，不进入模型 prompt，不补选。

QA semantic-clean 扩展到 derived coverage：fresh parse status authoritative；historical visualCoverageHash 不升级 Partial，也不进入 fresh parsed baseline。被查阅的历史 parsed/coverage record 保存在 QA-only metadata audit snapshot；原 workflow、AiRun、trusted state、private evidence 保留。普通 production Rebuild 的 coverage reuse 保持原规则。同一新 workflow 实际完成对应 visual completion，仍可由真实成功结果升级 coverage。Index/native units 与 text/locator 不改。

QA-only recall assertion 在 Planner accepted rounds / final checkpoint 与 Task A 派发之间执行；known removal 或最终 missing 触发明确 `QA_KNOWN_RECALL_MISS`，不更改 AI decision。required refs 只存 acceptance metadata，release bundle 不包含 QA bridge/callback。第二次 run 使用独立 evidence namespace，不能覆盖第一次 baseline、START、report 或复用其 37 Task A successes。

有限 CPU request-size stress probe 取消测试框架的默认 5 秒计时截止：单独运行约 5 秒、同套并行负载曾约 23 秒，字节/locator 断言通过而 deadline 造成 false failure。输入、Provider 边界、断言、生产保护不变；没有新增较大 timeout 或 capacity number。

### 18.5 P2E-011：独立 AI Coverage Audit 与完成协议

Primary Planner 的 `COMPLETE` 是候选，只有独立 Auditor 对当前全部未读 native scope 精确核算后才接受。Auditor 使用完整 Source 层级、未读 Index descriptors、完整稳定 unit order、已读 Ref 与累计 selected Ref / Source 映射，不接收已获取正文或先前 reasoning。文件 SourceRef 是目录；其全部 native units 均在核算范围，无 units 的 SourceRef 自身作为 native scope。Local 不根据标题、关键词、目录或视觉 gap 决定相关性。

Auditor 输出 `MORE_EVIDENCE` 或 `COVERAGE_COMPLETE`，以精确 Ref 或同一 Source 原生顺序的闭区间声明无需展开的范围，并提供 AI rationale。Local 验证输入与完整 Index 的分区一致、request / covered 均属于 unread、无重复或交集、所有未读 Ref 均显式声明。未知 Ref、空洞、跨已读范围及未 request 的 uncertainty 均为协议失败；不会自动补选、跳过或截断。`MORE_EVIDENCE` 必须取得新的 exact native evidence，随后 Primary 更新 cumulative selection，下一次 COMPLETE 再审计；不引入固定循环次数。

Policy 升为 `index_selective_retrieval_da002_v6`，Primary prompt / schema 保持已有版本。最终 Source checkpoints 保存 Auditor 输入、未读及 covered 的稳定指纹；旧 checkpoint 缺乏完整 proof 不能复用。恢复仅接受同 workflow、同客观 native inventory、正确请求身份和协议的 Primary / Audit acquisition；Auditor 请求补读后必须重新更新 Primary，不能恢复为已经完成。semantic-clean 的其他隔离规则保持。

P2E-011 定点验证允许从已存在且 native 绑定一致的 243 个客观 acquisitions 与未获审计的 226 个 Primary 候选开始；这不代表旧 COMPLETE 已接受、不恢复历史失败 workflow，也不构成新 clean-run 性能基线。QA oracle 仅在外部断言，不进入模型或 production selection。真实 recall、成本及隔离 Gate 全通过才自动启动新的第二次完整 Rebuild。

## P2E-012：DA-003 production routing 与停止边界

DA-003 supersedes 上述 DA-002 Planner / Auditor production routing。`content-index.ts` 抽取 deterministic Index / Ref / exact native expansion；`exhaustive-routing.ts` 以 EXPAND / SKIP / UNCERTAIN 的 exact N/N contract 替代 agentic selection。Local 不根据课程标题、目录或关键词决定 relevance。EXPAND 与 UNCERTAIN 按 Source 归并；SKIP 保留 identity / provenance / routing checkpoint，但不传其完整正文。routing policy、representation、schema、prompt 和 inventory fingerprint 共同决定复用；semantic-clean 限同 workflow。

Task A 先读 selected native evidence，仅接收模型明确提出的 selected unresolved exact visual refs；新增 visual evidence 后继续同 Source，重复请求已完成 Ref 拒绝，无固定 round count。技术 Partial 不因模型回答成功变成 Complete。成功 package 指纹只绑定 immutable native evidence、selection 和 Task A prompt version，理解状态写回不破坏 recovery 复用。

Dependency map：Index / stable Ref / exact expansion 为可复用基础；workflow 不再调用旧 Planner / Coverage Auditor / Source Triage；旧协议和历史 regressions 保留独立模块；background 的旧模型 bridge 仅 QA 编译分支。生产仅 DA-003 routing；本轮不启动真实 workflow。

300s provider absolute deadline 移除，stream bytes / last-progress / elapsed 可观测，显式网络/provider错误与 ownership/user cancellation 结束请求；没有猜测 stall timeout。其余已移除的容量 gate 及未解决重试/lifecycle规则见 Engineering Report §16。旧重试触发付费次数及失败交互的选择尚未成立，因此按 P2E-012 §6 / §10 停在 Product Scope Review，唯一真实 routing probe 不派发，不能宣称整轮验收完成。

## P2E-013：DA-004 recovery 与唯一 Routing 验证

DA-004 取代所有旧 automatic paid repair / workflow backoff / Source recovery。`completeJson` 一次 attempt 只发送一次模型调用；本地可移除 JSON fence 等非语义 representation，unknown/missing/duplicate decisions 不补。完整/截断/无效/ambiguous transport 结果进入失败状态，成功 invocation/package 保留。现有 Retry handler 持久化 explicit authorization，重试只复用成功结果并重新处理失败项，不设置人工次数上限。未经明确 no-generation safe-retry 证明，不把429或 Retry-After 当作允许额外付费的证据。

Worker使用 execution-session 与 owner token：atomic persisted claim；startup reconciliation 将旧 working 或未经用户授权的 legacy saved AI阶段标为 interrupted / user Retry，纯本地状态可以恢复。固定lease TTL不再决定 claim 或 paid redispatch。state/draft transaction验证owner token，迟到AI响应仍被ownership validator拒绝；1s watch仅为未验证liveness tuning，不是请求容量/超时。

本轮唯一真实Routing已完成：978/978 contract、24/24 known locators、4/4 dueDate、16/16 assignments、7/7 announcements PASS，state isolation PASS；167 EXPAND + 811 UNCERTAIN + 0 SKIP。全部117Sources / 880units仍进入deep read，未证明scope节约。停止Product Scope Review，不运行TaskA/B/C/Vision/clean Rebuild。同步全量OOXML inflation尚缺isolated incremental/cancellable worker，属于full-run前blocker；本次仅读取保存Index，不进入该路径。QA cumulative delta DOM/layout saturation作为新的观察层风险记录，不用新增文字cap处理。

## DA-005 Source-level Teaching Material Deferral（P2E-014）

DA-005 supersedes DA-003 per-unit Exhaustive Routing in the production path. Complete Discovery,
Fetch, native parse, Index, fingerprints, unit locators and provenance run before classification.
`teaching-deferral.ts` classifies only attachment/file Sources (including exact Blackboard file native
metadata); native Announcement/Assignment and other native management Sources enter normal processing.
No title/folder keyword or numeric page/byte threshold makes a local semantic decision.

The single Source-profile batch contains identity, parent hierarchy, native type, format when recorded,
unit/gap counts, structural first/last samples and anchors, explicit sampling omissions and surrounding
parent text excerpts. It contains neither complete file bodies nor per-page routing descriptors/images.
The exact Source-set contract accepts PROCESS / TEACHING_MATERIAL_DEFERRED / UNCERTAIN and requires
rationale/evidenceUsed. UNCERTAIN enters normal processing. Oversized requests fail explicitly at the
verified provider boundary; there is no invented batching/capacity limit.

Deferred checkpoints retain policy/schema/prompt/profile fingerprints and evidence. Source/profile,
hierarchy, parent text or policy changes invalidate reuse; semantic-clean runs reject historical
checkpoints. All local representations stay intact. Deferred means semantic processing deferred,
never native coverage Complete. Task A packages include every native unit of each processed Source;
only an exact requested unresolved visual ref may render. Task B/C evidence views exclude currently
validated Deferred Sources without deleting historical trusted data. Old routing/planner/auditor code
remains regression material and is no longer production-mandatory.

DA-004 single paid dispatch, explicit Retry, session ownership and successful invocation reuse remain.
The classifier batch identity remains stable across partial checkpoint writes so explicit Retry can
reuse a successful result. The QA observer appends stream deltas without cumulative text rewrites or
per-delta forced scroll layout; reasoning/output stay separate and untruncated. Long-stream DOM growth
is still a full-run observation risk. Synchronous OOXML ZIP inflation remains a full-run safety blocker
until isolated/cancellable decoding is implemented; this classification-only probe does not enter it.

## P2E-015 full-run blocker closure

ZIP format detection, OOXML parsing and DOCX embedded-image inflation execute only in a dedicated parser worker on the active production path. The parent transfers an independent byte copy, owns AbortSignal cancellation and terminates the worker after success, failure or cancellation. Worker errors, message decoding errors and invalid response contracts are explicit failures; there is no production decode timeout, guessed byte budget or automatic retry. A single synchronous worker decode is permitted; the parent execution context never performs that inflation.

QA long-stream rendering uses one Text node per channel and frame-coalesced appendData. Complete ephemeral reasoning and content are independent of compact Product previews and telemetry sanitization. Hidden observers retain pending logical content, reopening flushes it, and clear/dispose cancels pending frames and releases DOM content. The latest QA stream is held in background memory for observer reopen, never durable storage. Observer lifecycle does not cancel provider ownership.

P2E-015 runtime risk: the single clean Rebuild was stopped after CDP/async IndexedDB observation stalled. Synchronous debugger inspection found Task A, no active provider request and an aborted phase controller; the terminal durable state remains unverified. Synthetic coalescing validates logical content and node count, not the complete browser paint/accessibility/IPC resource lifecycle. Root cause is not established; no second workflow or guessed capacity guard is authorized by this result.

## P2E-017 post-processing observation and recovery boundary

Task A persists successful invocation/package checkpoints before the Source-ordered staging commit. A non-contract failure at order104 stops that commit loop; valid checkpoints at105–108 remain reusable and cannot enter the paid Retry set merely because they are unstaged. Diagnosis reconciles package outcome, checkpoint and staging as separate durable facts.

Observation-only boundaries now identify aggregation, per-item understanding/draft/coverage/failure writes, unexpected outcome and terminal writes, without changing error identity, ordering or DA-004 dispatch. IDB lifecycle listeners are diagnostic opt-in (disabled by default); they never issue requests to keep a transaction alive, await external work, add capacity guards or change completion semantics. Raw private error detail/stack stays outside shared telemetry.

The109-item real-payload scratch replay explains95success/9failure and4unvisited successes, but deliberately represents the unknown order104 error; native IndexedDB and an in-memory structured-clone staging backend do not reproduce the original11-minute wait. Recovery remains blocked until original first-commit causality is proved; instrumentation and idle worker reload are not a stall fix. See Engineering Report §21 and recovery-017 artifacts for17-gate evidence.

## P2E-019 guarded post-processing containment

Current legacy workflow identities remain unchanged. Package scheduling may retain settled successes
on an admission stop, while unadmitted items receive explicit unresolved outcomes. Ordered local
commit validates workflow ownership and commits independent successes despite earlier failed or
unexpected outcomes; the original unexpected exception is rethrown after local reconciliation.
Durable appMetadata diagnostics bind to the current lease/terminal attempt and record stage,
Source hash, order, phase, elapsed time and error identity without raw course/model text.

The zero-cost109 replay stages99 successes; the unique authorized same-workflow Retry subsequently
staged107 successes with2 exact schema failures and stopped before Task B/Preview. This contains the
ordered-loss failure; it does not prove the historical11-minute stall's causal root. No second Retry.

A Source is an independently checkpointable logical unit, not a required physical AI request.
Multi-Source physical packing must preserve per-Source validation, provenance, failure isolation,
policy identities and DA-004/DA-005 boundaries. Physical grouping uses verified technical boundaries,
never semantic similarity or a fixed Source count. This architecture correction remains pending after
this recovery STOP; current workflow/cache identities must not be migrated. New-workflow activation
requires the P2E-019 deterministic/browser gates and known-course offline packing simulation; no paid
batching probe is authorized.

## P2E-020 / DA-006 partial downstream readiness

A settled Rebuild can continue locally from Task A with explicit missing-knowledge coverage.
`continueTaskAPartial` verifies every staged success against the current same-workflow contract and
package fingerprint, atomically claims the failed workflow, retains the original failure records and
marks only this workflow's unresolved observations/Source understanding Partial. It stores a distinct
`TaskASemanticCoverage` in workflow/staging and advances to Task B without Task A/Discovery/Fetch/parse.
The continuation has no paid recovery dispatch. Current known-course accounting is107/109,2 unresolved,
1 already-consumed recovery wave/10 invocations; the legacy main admission stream has no recorded wave
indices, so mainWaves stays null rather than inventing a count.

Task B receives successful Shared Working Context and a separate hashed unresolved coverage manifest
(identity/fingerprint, parse/coverage availability, failure stage/class, parent/native/locator provenance
and recovery summary). Partial Rebuild uses its staging Evidence only; unresolved and Deferred Sources
are absent from semantic context, Evidence and expansion catalog, and validation accepts only successful
Source IDs. Preview retains the coverage manifest; existing Partial presentation is reused. No new Retry
Center or controls. Unresolved observations remain Partial, preserving the existing Task C/removal guard.

Mechanical schema compatibility repair accepts only the exact approved Task A alias and revalidates
all contract fields, preserving every other payload field and recording deterministic_compat_repair
hash provenance. Current two failed results have no saved full payload, so no repair is performed and no
new checkpoint is fabricated. Head snippets/error summaries cannot establish sole-mismatch repair.

P2E-020 real continuation stopped at Task B's supplied-evidence contract. The complete response had
213 unprovided Evidence IDs (absent from every input section), no evidence-expansion requests and
missing excerpt fields. All72 evidence-bearing rows failed the offline supply check; this is not
validated canonical output. Existing course-wide Task B contracts do not define per-item dependency
closure/checkpoint/partial acceptance. Do not manufacture a Preview by rewriting citations or dropping
claims. Preserve Task A readiness107/109 and the two Partial Sources; return Product Review under
P2E-020 section6, with no second paid call. Batching implementation remains pending before any new run.

## P2E-021 / P2E-023 Task B grounding hardening checkpoint（未消费 recovery）

本轮以 P2E-v0.3.0-2026-10-06-023 / READY 为最新授权。仅 Inbox 定点入站；021 Product 语义继续有效。没有执行真实模型调用，也没有改动 current workflow 或 trusted state。

已实现但尚未部署到 QA extension：Task B schema2 显式 Evidence registry / reversible compact aliases、6类 item / input identity / dependency validation、independent sibling durable checkpoint、progress-driven Evidence expansion（无固定 round 上限）、一次 recovery durable dispatch fence 与零付费 checkpoint resume。旧 hallucinated output 只保留 diagnostic，未修引用、补 excerpt 或接受其语义。Activity reasoning/output 完整私有 buffer 独立于按实测 viewport 的 DOM projection。当前 Task B recovery serializer 省略可选 max_tokens；撤销393216数值改动，没有新增容量数字。Recovery fingerprint 不再复用旧schema1/prompt2 fingerprint，compatibility flag 进入新 fingerprint，legacy Task A fingerprint 保持原口径。

零模型证据：真实快照的隔离 native-IDB + cloned KV probe（不是实际 Chrome.storage IPC），107 successful contexts / 2 unresolved / 239 Evidence；synthetic verified sibling 与 invalid sibling 分开 checkpoint，重复 expansion no-progress 停止，storage fault 后保留已写 raw/result 与 checkpoint，重启恢复不再付费。已有 pressure probe 保留153850 reasoning /154480 output chars，DOM每channel只显示410chars、1Text node；约9.3/0.6ms是该probe观测，不能作为容量边界。最终 npm run ci PASS：630 tests（2 contracts /608 extension /20 backend），含构建隔离和secret扫描。

**Anti-cap Gate NOT PASS，不能把上述 grounding PASS 解释成全部 preflight PASS。** 当前48MiB inline request helper仍应用于text-only B，拒绝后没有自动continuation；finish_reason=length仍使本次completion失败，无法checkpoint完整prefix item及继续pending工作。两条路径见 ACTIVE-LIMIT-INVENTORY.json，不通过换数字修复。当前schema2只能证明已返回items的provenance和dependency correctness，不能证明未返回的draft/source工作已经完成。全部Source IDs出现在context也不能证明semantic completeness。

最小跨请求闭合设计仍需解决：显式输入工作身份/processed与pending状态；完整item前缀checkpoint（不补残缺JSON语义）；同一logical attempt自动continuation及exact新增Evidence；跨partition dependency unresolved直到闭包成立；只有所有输入工作被明确处理/Unresolved才关闭logical attempt。反例：Source A/B看似独立，但C决定两者是否同一assessment；按字节先拆A/B并接受canonical identity将改变Product Same/Different语义。不能用Local聚类、固定Nitems、覆盖率猜测或“当前course装得下”绕过。此处停在 prepaid anti-cap continuation contract review，尚未形成跨physical request的全局judgment/completeness闭合证据；不宣称架构冲突已经获得Product裁决，不把实现缺口伪装成新增限制获准。

真实只读 before/after：16表与staging全部hash一致，workflow wf_3ee80256bee2d6d2fb0e805c 仍failed/task-b，provider0；117 Sources /19附件 /880 native units /852 gaps及107/2 Task A状态保留。未消耗唯一recovery wave，未生成新Preview，没有Task A/classification/Discovery/Fetch/parse/Vision/C、新workflow、cold-start、Use/Keep、commit/push/tag/release。Task A physical batching继续pending。没有reload未通过全部Gate的bundle；当前QA仍运行020版。Private原文/附件/raw output/.tmp/profile不出站。

## P2E-024：Task B logical ledger 与 physical continuation

一个 corrected Task B logical attempt 可以包含多个 physical requests。Native IndexedDB 的 `task-b-ledger:<workflowId>` 保存完整 input registry、processed/pending/Unresolved refs、完整候选、verified final checkpoint、Evidence registry、明确候选 retirement、原 Task A staging baseline、physical request/response、owner/session 与 paid disposition。写入使用 workflow lease token + session 的同一事务 fence；Chrome.storage staging 只保存 lightweight projection，不能成为完整 ledger 的唯一载体。

单次请求的确定性 pre-generation body refusal 对精确待发送 Unicode 文本做动态技术拆分；不按 title、assessment relation 或固定 N 个 Source 拆分。Text-only B 不再继承 vision 的48MiB admission guard，可选 max_tokens 不发送。Final reconciliation 自身被拒绝时，也将该精确请求作为技术片段继续；完整 registry 与 candidate identity 保持可引用。没有 partition/request/item/token/runtime 次数或总量上限。相同已拒绝形态、无可机械验证的新 progress 或无法承载最小形态明确进入 Partial，不尝试无限重发。

Provider 的真实 `finish_reason=length` 只允许保存 schema2 header 下完整闭合的 item；半个 item 和原始 streamed prefix 仅保留私有诊断，不由 Local 补 JSON。完整候选保持 provisional，直到全局 model closure 明确提供完整 scope、每个 input 的 resolved/Unresolved disposition、final items 与 dependency closure。跨 partition 的 A/B/C identity 反例由 gate 验证：C 处理前 A/B 不能成为 final；被替换候选必须有模型显式 retirement，不由 Local 静默删除。Source 可有模型明确 no-output disposition；Assessment draft / constraint 不允许这样被跳过。Invalid group 不丢弃独立 valid sibling；剩余 refs/candidates/dependencies 都进入 explicit Unresolved。

每次 dispatch 前完整 request 和 physical identity 先持久化，response 在验证前先持久化。重启只复用 exact same-workflow fingerprint 的成功 raw envelope；已 dispatch 却无法证明结果的请求为 paid-unverified，禁止重新付费派发。AI_CONTRACT 等已知响应失败与 ambiguous transport 分开记录。一个 physical AiRun succeeded 只表示保存了该物理响应，不等同 Task B logical completion。最终 canonical staging 仅投影 verified B objects；原 A drafts/evidence 保存在私有 durable baseline，不能与 canonical Preview 混合。

QA 每个 physical stream 的完整 system/user/reasoning/content 写入独立 private IndexedDB archive，失败有明确 telemetry；UI 只按实际 viewport 投影独立 reasoning/output Text node。Shipping build 不包含该 archive/QA bridge。真实恢复前15项 gate 全部通过：643 CI tests、8种隔离 browser probe、4次历史尺寸 synthetic stream archive、实际 QA reload / staging IPC / trusted conservation。Synthetic PASS 不代表 Provider 吞吐或语义正确率。Task A multi-Source batching 仍待完成；到达 Preview 后依 Handoff 先 STOP Product Review。

## P2E-025｜Gate A Engineering Closure

本节取代 P2E-024 中 Task A batching 的 pending 状态，历史真实失败证据不改写。新 workflow 持久化 `logical_physical_v1`；历史 workflow 的 identity、成功缓存和恢复证据保持原样。`contract-registry.ts` 统一 A / schema2 B / C / classification / routing / triage / physical envelope 标识。仅已观察且一义的 A、B schema 拼写别名可机械转换，所有非 schema 字段保持不变；随后仍执行完整 item / Evidence / locator / dependency 验证，修复留下 `deterministic_compat_repair` 和前后 digest。

Task A 以一个 Source 为逻辑单元和 checkpoint，以多 Source 为物理请求。按完整逻辑输入的实测 UTF-8 序列化大小均衡分配 Product Main waves，不按文件名、assessment relation 或本地语义分组；普通 Source 没有固定 batch 数量。新路径直接保留完整 native text、units 和 locators，不调用旧固定字符 chunker，也不在 call builder 中预先固定分组 visual images。请求由 Provider-default serializer 发送，可选 max_tokens 不发送。正式 Source 投影保留原顺序；独立 visual Source 后处理使用现有 Product 10–25 adaptive scheduler，render 保护不成为 AI memory admission 预算。

共享 physical-work ledger 存于 native IndexedDB，包含原始每 Source 输入、技术片段、独立状态、物理 request/raw、wave 和 disposition；写入有 exact lease/session fence。dispatch 前记录精确请求，response 在 item 验证前保存；重启首先复用尚未应用的原请求，不按新的 bin 排布重新付费。无法证明 dispatched 结果时 paid-unverified 停止后续派发。已完成 sibling 保留；Recovery 只含允许恢复的失败逻辑单元。Main2 / Recovery1 是本轮 Task A 的 Product processing shape，不是总 request / continuation / Source / token / runtime 上限。

单 Source request 被确定性 pre-generation capability 拒绝时，无损拆分 Unicode 或 image 列表。请求无服务端持久上下文，因此非末片必须返回模型编写的 `continuationState`，下一片显式携带；不能用“input delivered”冒充全部 Source 语义已处理。缺少中间结果或无法承载外部最小形态时明确 Unresolved，不补写语义、不减少输入。length response 仅接受完整 item prefix，并对剩余逻辑工作继续，无固定 continuation rounds。未知/已关闭 output ID 留明确诊断，不能覆盖已验证对象。

同一机制用于 classification 与现有 object-scoped C；B 的跨 Source 全局 closure 继续由原 grounded ledger 处理。新 initial / rebuild 正常 B 路径接入 schema2 global closure。Initial 的 canonical projection 只原子替换同一 durable baseline 中的未 Review AI provisional IDs，拒绝用户对象、Edited/Changed marks、trusted revision 或 owner/session 不一致；原 A baseline 完整留存。Classification 未验证结果不能被本地猜测为 deferred；该 Source 明确 Unresolved。Classification/C ambiguous paid 都停止进一步 admission。C 的已成功 target 保留，失败 target 不得静默进入 completed Review。

Gate A 的浏览器证据使用真实 parsed inventory、隔离 native IDB 和注入结果；109 Source /20 physical requests /2 Main waves，观测注入 peak10，109 checkpoints，重启 additional dispatch0。这不证明实际 Provider 吞吐、语义 recall 或真实 waves；Gate B 尚未授权。

Initial成功Source集合来自同workflow Source checkpoint和explicit Unresolved accounting，不能假设Rebuild staging已存在。Clean workflow若没有本workflow新classification checkpoint，旧Deferred结果不改变当前eligible inventory；保留旧记录，将未验证Source明确Unresolved。19附件缺fresh classification regression新增native dispatch0；正常Initial schema2 B projection regression使用1条注入grounded proposal并保持established=false。

Logical Source读取排除physical outer envelope，避免单Source/visual response冒充Task A checkpoint；exact本地复用明确不消耗新Provider调用。Final CI662tests通过；最终bundle reload与native16表/staging守恒，Provider0。

## P2E-027｜真实 Gate B 的 checkpoint 与 discovery 修复

Discovery port 必须传回真实 Complete / Partial / Failed、处理页数与 issue codes。非 Complete 在 downstream admission 前明确停止；不能用历史 inventory 代替失败的新 Discovery。native inventory 与旧 workflow 保留，零付费同 workflow retry 可重新进行未成功 Discovery。此 guard 是覆盖完整性边界，不是数量、时间或容量上限。

Initial 与 Rebuild 都记录成功 Task A Source coverage。Initial B 的成功 Source 集合以本 workflow 已成功的 logical checkpoints 为准；部分 Source 失败所创建的空 staging 不能覆盖这些成功 checkpoint。Initial evidence 从 native record 读取，再按已成功 Source 过滤；失败 Source 明确 Unresolved。

P2E-027 授权的一次 normal B safe recovery 仅用于已 settled、无 lease、全 physical known-response、无 verified B item 的 Initial 状态。原 normal native ledger 完整归档，另用 normal-recovery identity；保留全部成功 A checkpoint，重新构造完整 B input/evidence registry。已有 verified sibling 的状态不进入此实现，避免 regeneration；ambiguous/dispatched/active 状态拒绝付费。持久化 history marker 防止再次消费，QA bridge 不进入 shipping bundle。不允许把 unsupported semantic enum 映射为 Product 字段。

QA 观察每个并发 stream 的独立 reasoning/output 与 provider usage；live projection 不再是 archive 唯一所有者。付费统计以每 physical request 的 UTC start/finish、model、Provider cache hit/miss/output/独立 reasoning tokens 为准；reasoning 属于 output，不重复计费。数值摘要可共享，raw streams 仍 private。

### Durable Evidence identity 与来源隔离

Provider 返回的 `evidenceId` 只在一次请求内标识结果，不能直接作为跨课程 IndexedDB 主键。持久化 ID 绑定 `courseId`、`sourceId`、请求局部 ID、locator、excerpt 与可用的 representation hash / page / region；事实引用必须同时保留其 Source 与 locator。相同的完整 identity 可幂等复用，identity 内容冲突或既有主键属于另一课程时，事务明确失败，不允许覆盖已有 Evidence。来源无法验证时保留 `unverified` origin，不能推断为 native 或 visual。

P2E-027 的 Gate B 检查实际发现旧实现把 request-local ID 当成全局主键：B2 覆写了 MA6081 的 9 条旧 Evidence，且 16 个 B1 staged 引用与 6 个 B2 native 引用映射到错误 Source/locator。修复只重命名 Evidence identity 并同步引用；从 private 原始快照逐条恢复 9 条旧记录，按已付费、逐条唯一匹配的 Source/locator/excerpt 重建引用缺失的 Evidence。不得改写事实值或模型语义。隔离回归与真实 QA state 的逐条检查通过后，B1 549 / B2 163 个引用均精确落到正确 Source/locator，MA6081 原有 123 条记录逐条 byte-equivalent。恢复记录见 `artifacts/v0.3.0/gate-b-027/PROVENANCE-RESTORE-RESULT.json`；私有课程正文、原始流和快照不进入共享镜像。

### P2E-028｜Task B independent closure reliability

Task B closure dispositions are model-selected result references, not an all-or-nothing sibling bundle. Validate each selected item independently. A ref can be processed when at least one selected grounded item references that exact ref and its real dependency closure validates. Unsupported selected siblings remain explicit item/disposition diagnostics and force Partial; Local never substitutes an unselected item or rewrites field states/dependency semantics. Every final item's own inputRefs still require full closure. Cyclic groups and their dependents fail regardless of response ordering; independent results survive.

Prompt contract specifies required field arrays and exact enums, preserves uncertain competing values, and distinguishes owning proposalId from dependency itemId. Identity decisions normally depend only on supplied Evidence, canonical can depend on identity, and issues referencing canonical depend in the outward direction. Noncritical uncertainty must not create reciprocal dependencies. P2E-028 targeted validation archives old settled state under a one-use authorization identity; ambiguous requests and repeated authorization cannot generate a second paid attempt.

Length-prefix extraction must apply the same central registered schema aliases as complete-response validation before accepting complete top-level items. This changes header identity only: unknown schemas, partial item bodies and unsupported semantics remain rejected. Keep exact rawPrefix for diagnosis. The P2E-028 R1 paid run predates this correction; eight recovered prefix candidates are offline provisional evidence, not a fabricated final closure. New grounded execution prompt identity is `task-b/5`; R1 actually ran `task-b/4` with the P2E-028 system prompt hash, as retained in its private request ledger.


## P2E-045｜Assessment 语义清单与全链路机械覆盖（工程候选）

`assessment-relevance/3` / session Prompt `/7` 新增 AI 原创 `semanticInventory` 和 A `sourceCoverage`。每一 native locator 的 EXAMINED/UNRESOLVED 携带完整原 Evidence/理由；Partial 未渲染不能假装完整理解。A 字段、requirement、course Rule candidate 通过 `coverageUnitIds` 引用；source-local IDs 机械限定来源后成为稳定全局 IDs，保留原local ID。零 Draft Source 的清单也进入 B1。

B1 复用 Registry issue record 的 `semanticDisposition`，每个单元明确 GROUP/RULE/EXCLUDED/UNCERTAIN；实际 target 必须存在，不确定归属必须指向 UNCERTAIN Group。可显式发现 `semanticUnit`，Local 不从关键词发现义务。B2 接收对应 Group 的全部单元及相关来源，而非只接 member Draft；每个单元必须输出 KEEP/MERGE/EXCLUDE/UNCERTAIN coverageDecision，指向实际字段/requirement。UNCERTAIN 必须保留可见字段。支持 quote 与原 unit/target 同 Source、同 locator，允许原文字面包含的长短引用；provenance仍逐字校验，禁止 disjoint、alias collision、错误Source和文本修补。

合成后的 `semanticCoverage` 保存 inventory、决策与 durable targetObjectId，C 只收到正在比较的对象之清单。既有失败/Partial/未解决覆盖保护继续阻止不充分的 removal。旧 /1、/2 session 不自动升级或迁移；明确 policy mismatch 拒绝，snapshot/Prompt fingerprint 继续防错误复用。输出 vocabulary、父子/identity、Evidence与Review UX契约保持原 authority，未新增用户控制。

模型 Prompt 分解条件、禁令、例外和 modality，合并需审计全部 facet；Registry过大使用已有 progressive round/carry，不能 FINAL截断。**这是模型执行指令，不是 Local 能证明的语义真值。** 真实第10次响应证实清单齐全仍可能损失复合禁令；最后 Prompt 的 facet/容量指令尚未获新真实复验。工程与剩余风险见 Semantic-045报告；不可将机械 PASS升级成 Final Acceptance。

Provider JSON mode 仍使用现有 serializer；未新增 response repair 或 max_tokens上限。官方默认 thinking/high为64K，实际045 B1返回length/65536：[Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/)。保留 provider-default 政策，不能把 advertised 384K 当成实际默认可输出长度。

## P2E-054｜CourseDraft 语义保真与选择性阅读（当前实施，尚未 Human 验收）

生产路径接入 `selective-draft/2`：117 个既有来源快照沿内容依赖恢复；逐来源初查、相关完整 native unit 深读、其余 native text 信号检查、跨来源 Link、语义投影与原文核读分别持久化。初查与信号检查不等于深读或视觉理解。保存的来源元数据、正文、表格结构、partial/visualGaps 进入对应观察记录；深读范围和不能证明已理解的范围进入 Review 与 Course Brief 的来源上下文。抓取时间变化不改变内容依赖版本；当前可信值和用户决定不能被当成原始课程证据。

Reader Clause 正文、模态、条件、例外、上下文与 native Evidence 不可变。AI 决定对象归属、当前适用性、语义等价和源证据支持的状态；投影保留每个独立当前条款的归属和来源。相同主题不能吞掉不同动作、章节、问题、阈值分支或例外。标量冲突只有真实 resolution Clause 才可成为 KNOWN。部分原始指令被新来源替代时，AI 可给出有实际 resolution Evidence 的规范性 `statement`，同时保存原正文；该能力不能改写 identity 或凭空生成 scalar。

Local 只做机械校验与编译。非标量展示槽由已确定的 owner 类型和代表 Clause 类型生成，避免让模型为 `requirement/content/identity` 标签拼写反复重试；这不改变正文、成员、归属或状态。全局 accounting 必须检查同一当前 Clause 是否同时出现在 assertion/context；单组有效不等于整体有效。定点合同修复通常要求失败成员严格减少，且只处理已送达范围；若模型复用已保留 assertion ID，则扩大该 ID 两侧的原文范围让 AI 判断，每次扩展必须消耗此前未处理的来源成员。重复或未进展明确 `METADATA_REPAIR_STALLED`。完整响应中遗漏的条款仍需显式补齐，不将局部 JSON 或 contract PASS 当作语义完成。

既有对象新增条款的 NEW Review 同时呈现已有 Current 与新 Fact，Confirm 只增加新 Fact，不覆盖其他待审核变化或用户值。Important Rule 同样保存独立 Fact、UNCERTAIN、原始 Evidence 与限定范围；已有规则的新增事实经 Human 决定后追加到可见规则正文。Rebuild 采用操作原子替换当前对象集合，保留其他课程及历史对象；保留操作不改变 Current。保存的 UNKNOWN/dispatching 请求在重启与 retry 后仍禁止再次派发。

数据库仍为 22 个 native object stores；备份导出为既有 13 个 durable tables，排除 parsed/retrieval/runtime 缓存。Local-first、BYOK、生产 deepseek-flash、Evidence、Human Review 边界不变。当前真实模型与隔离 native 验证仍在推进；唯一 RC 与 Human Gate 5 在最终证据齐备后交付，不以本文代替验收。

### 语义核读后的闭合与增量证明

当前 Clause 必须在 assertion 或 evidenced context 中唯一计账。结构修复保留无关 context，只重新检查失败成员及其绑定的 SUPPORT。核读后的完整响应若遗漏当前成员，只能成为未验证中间物；AI 显式补齐、全局计账通过后，再单独核读修复产生或改变的组/context。新的核读若再次需要合同修复，未认证范围必须严格缩小，否则 `POST_VERIFY_REPAIR_STALLED`；禁止循环付费或把 JSON 完整当语义完整。范围外当前成员仍拒绝；只有本次真实送达、且 Link 已明确 HISTORICAL 的只读反证可附带保留为背景，不能成为当前 assertion 成员。

context 的 `SUPPORT` / `BACKGROUND` 和 `representedByAssertionRefs` 由 AI 决定。SUPPORT 的原始 Evidence 连到实际 Fact，要求同一 owner；BACKGROUND 不增加当前义务。全部 owned current context 必须经过独立原文核读，proof 随 CourseDraft/cache 持久化。增量复用同时检查 assertion 原始成员、竞争/解决证据、SUPPORT 的完整内容依赖和核读版本；任一来源变化就重新检查相应语义状态。历史 unowned 已解决观察留在 Evidence/档案，不再广播到所有 Review 卡；当前 UNRESOLVED 仍可见。

Reader 和元数据纠正此前误留 32768 / 8192 默认输出上限，已删除。生产默认统一采用已核验 provider 最大输出 384000，显式 evaluation override 只用于有记录的测量；没有固定截短或把长度结束修补成成功。选择性阅读降低实际输入和输出任务量，最大输出值不是实际收费 token。历史已保存 Reader 样本使用 32768，费用推算必须披露这一条件与输出/延迟不确定性。

### 标量语义与比较引用闭合

全部 scalar assertion（包括单成员）必须用原始字段、完整 Clause/context 和 native Evidence 核读 canonical field 的含义。正确的文字值挂在错误字段仍是缺陷；总组数、每组人数、课程总权重、评分标准权重、篇幅和发言时长不能因为数值相近而互换。本地不映射关键词修正含义。AI 可采用来源支持的描述性字段，保持 Reader/value 不变。semantic proof digest 随这项规则改变，旧证明不能绕过新核读；内容未变且证明版本相同才可复用。

Compare 对不存在的 Current/latest Fact 引用先拒绝；只能把失败行、实际 Current/latest 和只读保留行交给 AI 定点纠正。修复只能替换精确失败行，剩余无效引用必须严格减少；其他行、当前用户值和全部覆盖/状态约束继续验证。失败 raw 与费用保留，不以本地 New/Changed 猜测替代模型判断。

### 通用性和层级合同

role/parent 的形状矛盾不能用本地默认 role 或删 parent 修补。失败对象的原始成员、native Evidence 和只读现有层级交给 AI，仅允许精确目标的 role/parent 修改；名称、alias、成员、Links、identity、原文和未失败对象不变。父级必须存在且图无环；失败目标数必须严格减少，否则停止。已验证修复以 exact prompt / 原始 graph / clauses / native payload 的内容依赖缓存；输出测量上限不作为已经完整、stop/DONE 响应的语义依赖。旧 source 或判断范围变化会使缓存失效。此修复只是补齐既有 Graph 合同的有界纠正，不引入新全局合并层。

所有语义策略服务通用课程理解。Prompt/Schema/本地语义决策不嵌入当前课程名称、数值、日期、条款 ID 或预期答案；来源数据按参数进入，不成为固定规则。模拟正反例验证修复范围、表达变体、原文保留、缓存失效与无进展停止；不能替代不同课程的真实模型语义验收。当前只有一门已保存课程的生产模型证据，跨课程泛化未验证。

## P2E-056 RC2：384k reasoning 失败后的调用边界修订（2026-10-12）

这是用户要求的工程风险控制，不新增产品 Gate，也不授权提高费用、重扫课程、降低召回或自动迁移 trusted。旧整课付费审计、完整产品重写式修复已禁止派发；私有 `STOP_AFTER_CAPTURE` 仍暂停下一次真实派发。原 RC1、全部模型原始证据与 ledger 不改写。

### 证据与根因

已读取真实 request、完整 SSE reasoning trace、usage 和失败终止状态，非仅工程报告推断。私有 `gate5-remediation-056/RUNAWAY_ANALYSIS.json` 是脱敏统计入口，原文件留在本地。

- 第 15 次：592 Clauses、97 个 native evidence 条目、134 命题；输入 195,025 tokens；请求显式 `max_tokens=384000`、`reasoning_effort=high`；384,000 输出全为 reasoning，正文为空，`finish_reason=length`，完整 usage 已结算。trace 有 24,300 次命题引用、23,888 次重复长行；最频繁引用同一命题 739 次。这是反复逐项验算的推理循环，而非缺失 SSE 正文解析、网络 UNKNOWN 或证明必须继续增大输出。
- 对照第 16 次原文优先请求：同一 native evidence catalog、同一候选 product，删除 Reader 派生 content/value/context/applicability 与 Link judgment/state/basis；输入减少 76,946 tokens。保持 high，25,133 输出（24,110 reasoning），返回 9 个具体缺陷并正常 stop。重复长行仅 1 次。Prompt 也改变，故支持“派生判断污染与重复上下文是促成因素”，不构成单变量因果实验。
- 单一任务同时承担完整召回、身份适用性、所有类型/条件/OR、跨源冲突、父子关系和审核范围；开放式整课核验缺少可完成的局部边界。模型又被要求反复质疑上一版判断，重复上下文包含不可信旧判断，容易制造行政伪冲突并反复回看。
- 另一独立工程根因：Prompt/TypeScript 已允许 minutes/hours，但运行时 enum 曾漏掉它们，触发无必要的整课重写。已修复；最新保存响应在新 validator 下仍有 VALUE_SUPPORT 错误，不能因此放行。全产品再生成放大局部合同错误的成本和回归范围。

### 调用设计及停止条件

`product-audit.ts` 与 `organizeCourseProduct` 已接入局部核验：

1. **Source pass**：按完整已保存 native evidence catalog 分批，包含仅映射 Reference/Background 的原文与历史条款，核查隐藏行动、误晋升和漏项。长原文使用连续范围及重叠上下文；所有核心字符范围守恒，不截断保存的原文。窗口不是独立文件、不是阅读降级；跨窗口语义疑问必须返回缺陷，不能判 PASS。
2. **Owner pass**：按业务对象核对全部命题、跨来源证据、作用域、条件/例外/OR、身份与独立 Review；使用原文引文的上下文，完整原文另由 Source pass 覆盖。不能继承旧 Reader/Link 的语义判断。
3. **Bridge pass**：只核对跨对象身份、重复、父子关系与处置一致性；输入是紧凑结构，不携带整课原文。它不能替代前两类原文核验。
4. 每个任务绑定输入/Prompt/政策/输出预算；必须返回匹配 taskRef、完整 checkedRefs、complete 和具体缺陷。未完成、越界、截断或格式错误均停止，不产生语义认证。已完成任务按输入哈希复用；局部修复改变哪些依赖，只重核对应任务及必要关系桥。
5. 语义修复返回 **scoped patch**，不返回整课产品；明确替换的 proposition/owner/context 范围，范围外记录保留。新独立命题须在允许的原文范围和对象内，之后仍走完整合同与必要语义核验。连续无进展、两次局部修复仍失败、修复范围不够或超过风险守卫均显式停止。当前尚不能在不存在原对象时凭局部补丁创建全新考核身份；发现此类遗漏必须进入更宽的身份恢复，不能静默排除或认证。
6. 合同验证失败保存原候选和诊断，停止全产品自动重写。需要基于具体缺陷建立局部恢复范围；不能把 validator 错误当作扩大模型输出的理由。

**平台最大 ≠ 请求配置 ≠ 任务预算。** 原平台能力记录为 384k；失败请求确实使用该值。现审计 Source/Bridge 的请求输出守卫为 8,192，Owner 与局部语义 patch 为 16,384（含 reasoning 与正文）；初始产品生成暂以 98,304 为实验性失控守卫，依据已保存完整产品的输出量而设，仍不代表对所有课程验证充足。现存其他 Reader/Link 路径的历史默认不因本次局部改动全局替换。192KB 单任务正文守卫及原文窗口用于防止回到失败规模；超界明确失败，不少读、略过或伪造 PASS。数字是用户授权下的风险控制实验参数，不是正常产品容量承诺。真实语义质量和费用尚需后续受控生产验证。

DeepSeek 官方当前文档支持 low/high/max；已保存失败请求实际是 high。语义核验暂保留 high，不把降低推理强度当作质量修复。新增任务级 low/high 传递与 fingerprint/telemetry，使将来的纯格式/机械合同局部探针可独立使用 low；未以 low 替代必要语义核验，也未做付费 low 比较。依据：[官方思考模式](https://api-docs.deepseek.com/guides/thinking_mode/)、[Chat Completions 参数](https://api-docs.deepseek.com/api/create-chat-completion/)。

### 零付费结果与限制

真实保存的第 14 次可用合同候选可规划为 17 个核验任务，最大任务正文约 92KB（原失败约 753KB）。这只是分派与覆盖守恒验证，候选仍含已发现语义缺陷，未获得新版 semantic certificate。源级检查覆盖的是 CourseDraft 保存的 native evidence，不能凭该统计声称重读/核验了所有 117 个来源；既有全来源 signal screening 的证据边界不变。零付费回放脚本为 `scripts/v030-product-056-risk-replay.mjs`，没有 fetch 或凭据入口。测试覆盖原文范围守恒、背景中隐藏任务不跳过、局部依赖缓存、部分答案拒绝、越界及无必要重复派发。预算对应质量与实际执行成本仍 NOT VERIFIED；不发布、不提前签 Human Gate 5 PASS。

## P2E-056 RC2：原文档案与重建审核保护（2026-10-12）

沿用现有 IDB `courseStates` 的可选 `sourceInterpretation` 保存 `course-draft-archive/1 / UNTRUSTED_CANDIDATE`，包括不可变当前/历史 Clause、完整 saved Evidence、条件/例外、产品候选与观察处置。不新增数据库/Review 系统，不迁移原正式 profile。普通 Human 决策更新 revision pointer 时保留档案；Initial/Check 在既有 owner lease 下写入，Rebuild 在 staging 中保留，只有 Human 采用后同一事务写入 active archive。原有 Backup v2 已包含 courseStates，因此新档案随备份保存；旧备份没有该字段仍兼容。恢复拒绝混入 product/projection execution certificate 的档案，保留候选原文但不自动重新认证。恢复后 Reference/Evidence 可使用此档案，不依赖已消失的工作流 metadata。

P3 的 Use rebuilt course 采用候选结构，不代替业务范围的 Review；界面明示，已有 pending scopes 保留。原 user-edited Fact 保留其值与证据；机器替代值或条件变化生成独立 CONFLICT，原值不被父级范围批准覆盖。没有匹配重建命题的用户要求保留原 owner 并进入明确的保留/排除范围，不能删除以求模型一致。旧非 P3 Rebuild 恢复行为不回溯更改。本地这一步是用户值保护守卫，不宣称判断了自然语言真值。

Mixed Initial/Conflict/Identity 目录按当前对象类型解析布局，不能继承前一条的 screen 类型。Conflict Edit 可明确选择 Known/Uncertain/Unknown；Uncertain 保留已有 competing values 与当前/最新候选。Same/Split 保留独立待审条款，不能因结构选择认可其值。源内容与已编辑值仍须区分；后续需继续核对所有用户可编辑语义 facet 与 Change/Identity Decision 的证据/版本绑定，不能用当前几个操作的 PASS 覆盖完整要求。

零付费实证入口：`course-draft-archive.test.ts`、store/restore 回归、`product-rebuild.test.ts`；隔离实际 Chrome 的 `scripts/v030-product-056-structural-clicks.mjs` 和 `scripts/v030-product-056-rebuild-clicks.mjs`。两个脚本使用保存的真实未认证候选并加入显式人工控制场景，只证明 UI/reducer/durable 行为，不是新模型跨课语义验收，也不操作原正式数据。截图、profiles 与记录均留在 private；QA control 不进入生产包。

### P056 恢复分支补充：已有 Product 不因证书缺失而整课再生成

2026-10-12 零付费实际 workflow 检查发现：未认证诊断候选进入 Check 时，原恢复分支会请求完整 organize（98304 输出配置），即使已有合同有效 Product。缺少证书不等于缺少候选。现在优先验证并复用已存 Product，重新运行 bounded Source/Owner/Bridge 审计；合同不兼容时保留诊断并停止局部恢复，不退回整课再生成。初次无候选的 organize 与后续局部审计仍是不同任务；平台上限不作为任一任务预算。新增回归验证已有候选无 organize 派发、所有局部审计仍必须完成、无效候选停止而不洗成认证。

实际 Settings Full Replace 在独立克隆 profile 验证 592 条原文 Clause、123 行 Evidence、26 个 pending Review 和完整档案逐字/摘要一致；先仅清理解释 checkpoint，不清理 active generation 指针。档案不会恢复语义执行证书，也不会隐式创建 trusted Fact。此项是保存/恢复工程证据，候选语义仍未通过。私有结果 `backup-interactions.json`；诊断候选的 Check 拦截记录不得冒充真实已认证候选 unchanged Check PASS。

付费 adapter 的旧“钱包允许多少就调整输出上限”分支同时移除；每个任务保持自己的固定输出配置，实时钱包不能覆盖任务预算，不足则在网络请求前停止。零费用保存候选恢复预检已进入 bounded source task（8192），不再请求整课 organize。诊断 workflow 的实际拦截请求也变为局部审计；拦截不等于模型审计通过，已保存缺陷仍未解决，暂停标记未移除。

### 首次 bounded Source 实测失败与职责收窄（2026-10-12）

已有钱包实时读数 ¥2.52 后，以保存候选、单次新派发白名单完成受控实测；整课禁令及 STOP 标记不移除。请求保守 reserve ¥0.275588，实测 input 33738/output 8192/reasoning 8192、正文空、length/DONE、费用 ¥0.133012。usage 完整，是已付费失败，不是 UNKNOWN；没有第二次请求。P056 已知 20 次费用合计 ¥6.84731212。

真实首个 Source 包含 40 native windows、204 Clause 映射、65 claims、7 context；trace 先讨论跨包引用缺失，随后反复判断跨来源 Literature Review 身份及缺陷描述，输出前预算耗尽。它揭示前版虽名为 bounded，仍在 Source 层承担跨来源产品裁决；不能用“8192 足够”作为容量结论，也不直接加上限重派。

bounded-product-audit/2 将一个 native passage/window 作为独立 Source 交付范围，原长窗口连续覆盖/overlap 不变、所有原文仍核验；Clause 映射减少重复 sourceId，只给当前窗口内 claim/context Clause refs，outsideSupport 明示其他来源支持。Source Prompt 独立，仅核对本段遗漏/错误晋升与力道/条件/例外；跨来源 identity、冲突/层级留完整 owner 与 bridge 审计，局部无法判断必须显式 Issue。输出预算不增加。回归覆盖全文 conservation、跨包支持不误作缺失、条件/例外仍进入 Source 和完整 Owner。任务数及潜在成本上升是实际代价；新拆分尚无模型成功证据，不承诺全量完成费用或速度。旧失败 capture/hash/ledger 保留，不按新策略洗成 PASS。

### Change／Identity 审核依赖与原子提交（2026-10-12）

P056 的“显示/决定范围一致、ID/版本持久、保留用户历史”要求继续落到现有 reducer/store。Change materialization 保存支持来源的 durable machine hash/存在性；Rebuild 用户值替代提议同样捕获依赖。审核决定保存完整 reviewed Change/Review item、当前 Fact 版本、课程 revision 与来源版本。提交在同一 IDB 事务校验课程、Fact、提议更新时间及来源版本；来源或提议在审核期间变化则明确拒绝，不产生决定、历史、排除记忆或队列删除。历史无依赖字段的 Change 保持兼容，捕获决定时观测值作为有限审计，不冒充它已经有创建时版本证明。parsed 是 backup 排除的缓存，不用其 hash 作为可恢复的授权依赖。

初始 Review 的决定与队列删除也改为同一 commitMutation，不在提交完成后再删除。Change/Identity 使用独立 reviewDependencyBound，不标为父级 productScope Confirm。实际审计发现 Identity DTO 在 current/latest 赋值前提前返回，使两个选项展示同一标题；已恢复两侧原始值和两侧 Evidence，缺失侧明确保留空值，不凭空补身份。Same/Different 记的是用户身份判断，不冒充完成整个考核范围批准或模型归并。

### Provider JSON-mode 预检与 HTTP 400 证据边界（2026-10-12）

收窄后的单段实测 HTTP 400 在 0.124 秒内被拒绝，无 usage / SSE 内容。此前 adapter 没有保存错误响应正文，无法证明该次 400 的具体 provider 原因；请求本身确实缺少 JSON 指令，违反官方 JSON-mode 要求（https://api-docs.deepseek.com/guides/json_mode/，当日读取）。修正 Source Prompt 的明确 JSON 输出指令，并在实际 transport / live adapter 派发前检查 wire 所用文本包含 JSON；缺失时 0 网络、0 信用消耗明确拒绝。后续非 2xx 保存不含 Key 的私有错误响应，避免丢失诊断。

旧 b1023ef2 capture / invocation / ledger 不改为成功或零费用：¥0.07524 为保守未结算预留，known usage 成本仍 ¥6.84731212，新未验证费用记录 1（此前历史 2 仍保留）。不能声称“0新增 UNKNOWN”，不得重派该未知账本操作或丢弃预留。修正后的配置只完成零付费预检；没有模型成功语义结果。输入修复不能用于绕过 UNKNOWN 的唯一物理派发约束。

### Human operative semantics（2026-10-12）

P056 已批准 Edit 能触及画面要求。Fact 增加可选 humanSemantics（modality、conditions、exceptions），与原 product/semanticClause、Clause、Evidence 分开保存；未编辑时读取产品命题语义，历史 Fact 回退 semanticClause。Review 同范围字段可编辑力度和逐项条件/例外，空数组是用户明确清除当前适用条件，不等于删除原文。知识状态/原值、独立事实 ID 和结构关系继续保留；不从自由文字推断新的关系。Brief/Review 使用 operative semantics，Rebuild 比较人工解释与新提议并保留旧值为独立冲突，不因值文字相同而忽略力度/例外差异。

决定保存 reviewedFacts/acceptedFacts 与已有 scope ID/版本；直接 Fact 编辑历史保存 from/to semantics。Backup 保留新可选字段并验证类型，旧 backup 不要求该字段。原始提取不因人工改变而伪装成来源原文。此修改不代表现有真实模型候选通过语义核验。

### Typed Rule 的 trusted 投影泄漏修复（2026-10-12）

真实隔离 UI 截图显示，规则 Fact 全部独立待审时，原 Constraint 汇总正文仍被 Brief fallback 展示。根因为 trusted 只过滤 scope Fact，没有过滤无已认可命题的 typed Rule 容器；无剩余 Fact 时 UI 回退到原始整段 content。现在 typed Rule 必须有当前已认可 Fact 才进入 trusted；容器正文与 Evidence refs 仅从该已认可范围投影，旧无 Typed Proposition 的历史 Rule 保持兼容。原始 Constraint、Clause、Evidence 与全部候选保留在 readSnapshot/Review/backup。此投影也防止增量上下文将待审汇总误当 trusted。独立待审规则不因批准别的 Assessment 成为已认可正文。

独立审计恢复新增单任务入口：只接受当前完整计划中的 taskRef，沿用原 Prompt/派发指纹/cache；一项成功显式 courseComplete=false，完整审计仍要求全部计划，不绕过 UNKNOWN 或跳过 Source。零付费生成真实 109-task 计划；该恢复入口建立时固定请求预算的自适应替代尚未完成；后续解除及验证见下节。

### Provider boundary、动态资金分配和 reasoning 循环保护（2026-10-12）

回读真实 SSE：384k 全 reasoning 失败含 1,346,824 个 reasoning 字符、0 answer；若干完全相同的检查句各重复约 725 次。8k Source 失败含 35,408 reasoning 字符、0 answer，没有同样的精确循环；其问题仍包括 40 段/204 Clause 与跨范围 claims，不能用同一循环原因概括。保存原文件并生成私有统计。

移除 Product audit 的固定 8k/16k、192k bytes 及初始组织 98,304 的自设限制；默认只使用既有已观测平台输出边界 384,000。Source windows 保持全覆盖分区，不截断原文；Owner/Bridge 仍是不同语义范围。固定两次语义 patch 限制替换为重复未解决 defect scope 的无进展停止，旧成功范围缓存与原数据保留。已成功且完整的旧结果不因预算变化变成失败。

审计 transport 可选 reasoningCycleGuard：在尚无 answer 时，同样三个不同完整行组成的 checkpoint 第三次出现，报告 `PROVIDER_REASONING_CYCLE`、取消 reader、不自动重试。这是可误判的精确循环启发式，不是语义完整性判断或正常 Token 上限；不能检测所有改写循环。真实零付费回放在 81,651 字符检测到旧 384k 循环，未误判另一条 8k 失败；长而持续变化的 reasoning 测试不会触发。已开始 answer 的流不因旧 reasoning 重复而被该规则截断。没有最终 usage 时保留 UNKNOWN 与预留，不宣称取消等于零计费或确定节省。

预付验证 adapter 的 `--wallet-allocation` 只对独立 scoped audit 可用：按实时余额、原资金起点结算延迟保护、既有 UNKNOWN 预留、准确 wire 输入最坏费用动态分配输出；钱够则用平台边界，钱少则标记 wallet-boundary。重新序列化并预留精确物理请求，完整 logical task 不变，length/stall 绝不能形成证书。无普通任务固定能力 ceiling，无自动充值/扩大授权。全平台输出预留原本超出当前余额，不强行忽略资金守卫；动态资金分配是在既有授权内控制财务风险。

完整 CI `ci-wallet-cycle-allocation.log/exit` 为 0：contracts 2 + extension 955 + backend 20 = 977 tests。一次未执行 Owner scope（3 Clause/2 proposition）正在真实验证，不能据此先宣称整课语义核验通过。原 UNKNOWN Source scope 继续冻结，任何 Prompt/预算变化不能重派。

### 候选知识状态一致性与局部恢复（2026-10-13）

真实保存的当前候选中三条命题同时为 KNOWN 且含历史 competingValues（课程方案、Part 3 身份、Part 3 时长）；显示层会将这些值作为当前竞争项呈现。第二次 Owner 模型审计返回 valid=true 不能证明此组合正确。首次 Owner 请求还因看不到结构相关子命题而误要求父方案重复子考核细节；加入只读直接父子上下文后该问题消失，但不能据单范围 PASS 宣称整课正确。

对新 CourseProduct 候选增加确定性一致性缺陷 KNOWN_WITH_COMPETING_VALUES：当前值已确定时不能同时保留未决当前备选项。检查只报告 affected proposition/Clause，不判断哪个来源过时、不清空值、不改成 UNCERTAIN，也不改写旧 Fact/backup/trusted。真正当前分歧须经原文判断后保持 UNCERTAIN；确已过时陈述仍在不可变 Clause/Evidence 与来源依据中保留。完整审计遇到该缺陷先返回 semanticAuditComplete=false，避免对内部矛盾候选浪费全来源审计；独立 Owner 同样不能凭旧 valid=true 绕过。修复后仍必须完成全部来源/Owner/Bridge，而不是把契约检查当语义验收。

零付费真实恢复发现该缺陷，并生成 knowledge-repair-prepared.json：3 proposition、2 owner、5 Clause 引用、3 段 native evidence 共 4,019 字符，未物理派发。局部 patch 也启用同一 reasoning 循环停止；没有新增固定输出 ceiling。修复请求尚未执行，候选未获证书。局部诊断使用独立文件名，原始付费 response/usage 与 UNKNOWN 保持不变。

前两次真实 Owner 调用已完成，已知费用分别 ¥0.08185848 / ¥0.14379248，累计本阶段已知 ¥7.07296308；新 UNKNOWN 1 项及 ¥0.07524 预留继续冻结。余额 ¥2.23 是 2026-10-12 07:17 UTC 的观测，不当作当前可派发金额。2026-10-13 本轮以上核验零付费；无新扫描、正式课程迁移、发布或 Human PASS。

本次完整 CI `ci-knowledge-final.log/exit` 为 0（contracts 2 + extension 957 + backend 20 = 979）。当前 shipped bundle 在全新隔离浏览器加载成功：26 待审、初始 trusted 为空，外网阻断、0 付费，既有 QA 入口恢复。此诊断加载不代替完整语义、跨课或 Human 验收。

### 局部修复实际失败与循环保护误判（2026-10-13）

一次已授权局部修复请求（3 命题/2 owner/3 段原文）在 13.665 秒被 reasoningCycleGuard 中断；保存请求、SSE 与失败记录 `1ef9368269781551c8612c4fad8de7bbaf8d0e6c7dbc0ac488e6fb9ff3a2f76e`。原规则把三份命题 JSON 中正常重复的 relation/modality/conditions 字段误判成循环；不是证据支持的任务过大或真实循环。该工程缺陷已修正：JSON 结构行中断 prose checkpoint 窗口，避免把常规结构输出当反复推理。真实零付费回放：本次 11,434 reasoning 字符不再触发；旧 1,346,824 字符/384k 真实失败仍在 81,651 字符触发。不得称启发式能识别所有推理失控，或将推理中草拟的 JSON 当最终响应。

本次没有 answer、final usage 或可用补丁。¥2.081796 是最坏费用预留而非已确认消费；新 UNKNOWN 增至 2，合计预留 ¥2.157036，累计已知用量按既有费用规则 ¥7.07296308。已知与未核实预留几乎耗尽原授权资金起点 ¥9.23；实时余额不等于可以释放 UNKNOWN 预留。不得重派该局部 scope、擅自改 UNKNOWN 为零费或追加额度。付费恢复暂被资金安全边界阻止；零付费回归、增量与隔离数据核验仍继续。修复请求失败并未生成新产品证书或 RC2；原候选、Clause/Evidence、QA 及正式课程未被覆盖。

### RC2 Typed Proposition 的 Changed Check 依赖恢复（2026-10-13）

新增现行 selective-draft/3 的完整生产引擎模拟闭环后复现：来源 40%→45% 时旧 Product 仍依赖已退休 Clause，组织入口返回 LOCAL_CONTRACT_REPAIR_REQUIRED，未生成 Change Review。先前 selective-draft/1 测试不覆盖这一路径，因此旧增量 PASS 不能证明 RC2 可用。

新增机械版本依赖失效检测：旧命题仅依赖退休来源，或退休来源有尚未组织的同源新 Clause 时，形成 SOURCE_DEPENDENCY_CHANGED 局部问题，交模型补丁判断当前含义；不自动替换数值、判冲突或判删除。当前命题同时保留已组织的历史支持时不无谓触发恢复。补丁提供 current/retired Clause→native evidence 映射和非权威 link hints；只改变范围内候选，其余命题、原文与用户 trusted 保留。补丁后的完整审计仍必须完成，不自动产生语义证书。

零付费模拟生产闭环覆盖旧策略与 RC2：Initial → 人工 Confirm/Edit 41% → unchanged Check 完成且零 AI 调用 → 实际模拟 Machine 来源变为45% → 生成 Change Review（人工41%保留）→ Human Accept → 隔离 Rebuild（trusted 不变、may/条件/例外保留）。`typed-incremental-integration.log` 两文件70测试通过。模型返回是合成 fixture，不宣称真实 DeepSeek 或跨课程验收。同步修正未执行真实认证分支脚本中错误的 workflow state 断言 completed→complete；此修正本身不构成实际浏览器 unchanged PASS。

后续仍需新增 owner/新任务与 Possibly Removed 的新版集成证据、真实模型认证后的浏览器 Check/Rebuild 与全局语义闭合。付费冻结边界不变；本节没有新增 paid/UNKNOWN，原 Profile/课程与候选未迁移。

### 新 owner 增量补丁与原文风险审计覆盖缺口（2026-10-13）

新增 Clause/owner 原先无法进入旧 Product 的局部补丁（owner 仅允许已经存在于 Product），导致新任务缺少可执行的组织入口。现在未组织的当前 Clause/新 owner 触发 CURRENT_CLAUSES_UNORGANIZED；补丁范围允许新增 Reader/Link 已观察 owner，但新增 scope identity 必须来自原始 packet，不接受任意模型 invented owner。观察提示不是任务存在证据；模型仍从 native text 判断 CURRENT/ISSUE/REFERENCE。没有日期/权重的真实指令可进入候选并独立 Review。旧命题、owner 与原始 Evidence 保留；没有直接写入 trusted。

零付费验证：普通课件里的合成 upload reflection 要求（无日期/权重）通过单次 scoped patch 进入候选，不全局重生成；任意未观察 owner 被拒绝，旧命题保持相同。CourseProduct/ProductAudit/Workflow 三文件81 tests通过，均为模拟响应，不作 DeepSeek 或跨课语义 PASS。Possibly Removed 的新版完整闭环仍未验证。

另发现更深的覆盖缺口：当前 courseProductPacket 的 native evidenceCatalog 只从 Clause.evidence 生成。真实恢复源有117个、当前 Clause涉及22个，95个来源无Clause，不能因此视为独立 Product Source审计已核读全部资料。已有 completeScreening 曾读全 native text，但它和后续独立审计不是同一项验证。当前109-task计划/机械覆盖只证明送入目录的原文，没有证明原文目录自身覆盖117来源。旧“ALL native”应限定为 delivered evidenceCatalog，而不是课程全来源；当前不能以此宣称隐藏任务召回或整课验收通过。

下一步需把完整原始 native unit 风险检查与 Product 深层语义组织的上下文分开：对 Source/locator/version 做守恒，把无Clause原文也纳入轻量风险检查；不要将全课资料重新塞进组织 Prompt 做无差别深读，不重新扫描、不丢失未知状态。覆盖缺口修复后仍需模型质量核验；原已保存请求/响应及 UNKNOWN 不改写、不重派。私有 FULL_NATIVE_AUDIT_COVERAGE_GAP.json 保存上述直接统计。

### 完整已保存原文风险审计上下文（2026-10-13）

修复 Clause-only 独立审计目录缺口：withNativeRiskSources 从保存的 Source/native unit 构造独立风险上下文，保留 source/version/locator/unit ordinal、完整 native text、partial/visual/parse 限制及原文空单元索引。仅按精确 source+locator+包含关系关联 Clause 证据，不做语义归类或推断。退休或不能与当前完整单元精确对应的支持仍保留。此上下文仅进入 Source risk audit，不扩展整课 Product organize/deep Prompt。

生产 Workflow、live 验证和非 diagnostic browser replay 已接入同一来源入口。产品证书增加完整 native risk inventory 依赖，旧 Clause-only 证书不能证明新版完整原文审计。Source 中发现无 Clause 的隐藏任务时保留 auditTaskRef；局部命题修补不能凭空补造 Reader Clause/owner，明确 AUDIT_NATIVE_READER_RECOVERY_REQUIRED 停止，等待有范围的 Reader 恢复（尚待接入）。无范围结果不能形成证书或被视为零要求。

真实保存数据零付费守恒脚本 v030-product-056-native-conservation.mjs：117来源/978单元，933非空单元共1,337,547字符全部对应连续完整窗口；45空文本单元单独索引。同源窗口组合后141 Source tasks、总153 tasks，避免每个单元独立调用；窗口目标只影响打包，所有超大文本仍完整分区，未设新能力上限。原Clause/来源不变，未重扫、未调用模型。新计划使用 full-native-risk-audit-plan.json，保留旧 independent-audit-plan.json，不把旧109-task审计追认为全课覆盖。

949单元有partial标记，原文传送守恒不等于全部PDF视觉、表格或隐藏图形已理解。轻量Source风险检查的文字判断不能声称看过未提供的图像，也不能把每个普通diagram制造成学生未知任务；有合理课程价值的缺口需要有范围Reader恢复。模拟正例证明无Clause普通课件的任务进入风险检查，异常不是静默PASS；模型效果和实际Token/费用尚未验证，不能声称已达¥2冷启动或语义验收。资金/UNKNOWN冻结不变。


### 2026-10-13：完整 Native 风险检查后的局部 Reader 恢复

Source 风险检查发现独立指令缺少 Clause 时，现可携带指定 Native evidence ref 和原句进入现有 Reader / Link / Product 链路。Reader 只重读指定 locator，复用同一 Source snapshot 的检查记录及已完成深读，保留旧不可变 Clause 与原实体。恢复结果仍是候选，不能自动写入 trusted 或冒充 Human 认可。

恢复原句必须存在于所声明的证据窗口；未知 locator、空恢复范围和过期 snapshot 均显式失败。同一 Native ref + 原句再次出现未解决缺陷时停止，防止无进展付费循环；这不是固定重试次数或 Token 截断。完整课程语义核验尚未闭合，真实模型恢复未验证，钱包 UNKNOWN 仍冻结，未新增付费请求。

清理旧 direct-course 增量比较路径残留的 16,384 输出 Token 上限；默认采用平台能力，只有显式配置才传递 outputLimit。授权费用保护独立保留。零付费恢复测试与完整 CI 的最新结果见私有 `ci-native-reader-recovery.log/exit`；仅在 exit=0 时成立，不代表 RC2/Human Gate 5 PASS。


### 2026-10-13：增量审计别名稳定性与严格等价复用

原 CourseProduct wire 使用全局顺序 cN/eN。新增或退休条款会移动别名，让无关 Owner/Source 的审计输入发生纯结构变化，既有物理请求缓存因此失效。保留原 Prompt、请求及响应格式；新增本地 `auditInput.clauseIdentities`，不向模型发送，不改变不可变 Clause ID。完整通过且无 issues 的审计另存严格等价索引：仅将结构引用规范化至原 Clause 身份及原文证据身份；逐字段比较完整规范化 payload、checked scope 和同一审计 Prompt，不能依靠摘要相等直接认可。正文、值、owner、条件、例外、原文及相关只读上下文均保留。

等价命中时仅机械映射 taskRef/checkedRefs，附带原审计缓存来源；原请求/响应不覆盖。任何语义或原文变化、Prompt 变化仍须重新核验；有缺陷、不完整、失败和 UNKNOWN 从不进入该索引。索引不存在时沿用既有请求与 UNKNOWN 保护，不假装旧失败已恢复。新增测试证明纯 c/e 别名移动复用完整 Owner 审计，条件和原文变化重新审计，缺陷/UNKNOWN 不复用。该证据仍是零付费工程测试，不构成跨课程模型质量或 RC2 验收证明。

最新完整检查记录为私有 `ci-alias-reuse.log/exit`，只有 exit=0 才成立；本轮不新增付费、不扫描正式课程、不迁移 trusted。


### 2026-10-13：隐藏独立要求的生产工作流零付费闭环

新增真实 WorkflowEngine / 本地存储纵向测试：模拟初步 Inspect 与 Screen 均漏掉普通课件中的无权重、无绝对日期上传指令，完整 Native Source 审计独立指出遗漏；按该原句/locator 局部 Reader 恢复，Link 建立新 owner，局部 Product patch 补入要求，生成 Initial Review。只进行一次初步检查、一次局部深读、一次初始 Product organization，不重新生成整课。

身份和独立要求分别成两个 Review 项。确认身份后要求仍未写入 trusted；再明确确认要求后，条件、例外和原文证据可从 trusted Fact 的 evidenceRefs 追溯。测试使用脚本化 AI 响应，只证明生产引擎接线、批准范围和持久化；真实 DeepSeek 对隐藏任务的召回、跨课程质量以及 RC2/Human Gate 5 仍未证明。检查记录为私有 `hidden-task-workflow-tests.log` 及 `ci-hidden-task-workflow.log/exit`，exit=0 才成立。


### 2026-10-13：Source 局部核验的推理强度

完整 Native window 的局部信号/声明检查使用 `reasoning_effort=low`，继续启用 thinking；Owner / Bridge 保持平台默认 high。官方 [Chat Completions 参数](https://api-docs.deepseek.com/api/create-chat-completion/) 与 [Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode/) 于本日核实支持 low/high/max，默认 high。局部任务不做整课归并或跨来源裁决，局部检查不能取代完整 Owner / Bridge。推理强度进入 Source 请求缓存与严格等价索引，旧 UNKNOWN 的 taskRef 范围冻结不变，不能靠调参数重派失败请求。默认输出仍只有平台上限；实际付费调用还受原授权钱包最坏费用动态保护。

零付费测试覆盖 Source 参数 low、其他阶段默认 high、完整审计范围与未新增固定 Token 截断。低推理强度的真实召回、语义质量和节省尚待已保存原文上的实际独立核验；不得仅凭参数或 unit tests 宣称成本目标达成。检查记录见私有 `source-low-tests.log` 与 `ci-source-low.log/exit`。


### 2026-10-13：首个完整 Native Source 实测及审计噪声修正

已在原授权钱包内执行独立 Source 验证：1 份完整 Native 公告、12 个现有 claims，来源与已冻结 HTTP400 请求不重叠。单次 deepseek-flash / low 成功返回 stop + DONE + usage，输入 3,338、输出 7,162（reasoning 6,873），约 39 秒；官方按唯一小时请求及全部 Token 类型核对，实付 ¥0.031986。输出 complete=true、valid=false，有三条 issues；没有 Course PASS、没有自动 patch 或写入 trusted。low 仍约有 96% 输出用于 reasoning，不能据此宣称效率或 ¥2 冷启动目标达成。

对照原文和实际请求，模型把“参看时间表/作业说明”导航指针视作遗漏的独立任务，实际对应 Clause c9/c17 已保留在 REFERENCE context；又把 ACTION 与 IMPORTANT_RULE 差异称为 force 错配，实际 must 语气及 scheduled-students 条件均已保留。三条信号尚待 Owner 裁决，不能直接增加主 Brief 噪声。通用 Source Prompt 现区分导航/参考与真实执行要求、必须阅读/准备、提交、时间、条件及例外；不要求复制已表达的信息，不根据展示分类推断力度变化。原 Clause/Evidence 保留，不新增课程专用判断，也没有重派本次相同输入追求 PASS。修订 Prompt 尚未取得独立真实模型验证。

同时修复 semantic certificate 未绑定实际阶段 Prompt 的风险：实际 Source / Owner / Bridge system 全文现纳入 certificate。Prompt 变化不能复用旧整课语义证书；既有请求与 UNKNOWN 冻结不变。Native 公告输入确有 body.displayText / body.rawText 两份近似正文，但字节不同，尚未自动去掉任一表示。私有核对见 `NATIVE_SOURCE_GUIDELINES_REAL_AUDIT_ASSESSMENT.json`、原请求/SSE/响应/usage、`billing-native-source-guidelines.json` 与 `source-priority-tests.log`。当前代码完整 CI 记录 `ci-source-priority.log/exit`；exit=0 才成立，仍不构成 RC2/Human Gate 5 接受证据。

#### Pending change 的撤回决策边界

同 owner/field 的 POSSIBLY_REMOVED 与非撤回变化必须分别保存，不能由 upsertLatestChange 将撤回旧要求和新说明压成一个 CHANGED。原先同类 pending 最新值合并继续保留。实际引擎脚本回归覆盖教师明确撤回、用户编辑值保护、独立新说明待审和 KeepPossiblyRemoved；完整读取/原来源 Evidence 安全检查保持，absence/partial 仍不能推导删除。真实模型增量验收独立进行。

#### Scoped repair 的只读裁决证据

修改范围与裁决上下文分离：原 scope 决定可替换命题、owner 和 context Clause；readOnlyOwnerContext 按既有命题与 Reader ownerHint 提供同业务对象其余 current/retired 原文，以及直接相关父子命题的支持原文。旧模型 competingValues/basis 不是历史 supersession 的证明。额外上下文不允许增加可编辑 Clause，applyProductRepair 的范围守卫保持；没有原文支持的冲突不得仅清空 alternatives 来通过本地合同。修复请求不扩大成全课程深读，完整 native 风险覆盖另行完成。

#### 连通业务修复与候选检查点

局部修复按 issue 引用的 owner、命题与 Clause 做连通分量；共享引用或跨对象同一缺陷不得拆开，直接父子只读裁决证据不自动扩大可写范围。每个通过全候选合同的分量立即 durable 保存；恢复读取已完成候选并重新核验剩余 defects，不重新生成整课 Product。依赖变化、最终 Source/Owner/Bridge 和语义证书仍独立核验；局部保存从不等于 certified/trusted。私有真实验证入口的部分修复候选以其完整 Product SHA 和原模型 capture base 双重绑定，不能借修改 taskRef 重派失败 combined scope。

#### Owner 审计原文边界与证书

Owner 的独立当前性、冲突、条件与例外裁决必须接收同 owner 命题/identity/Reader ownerHint 关联的完整已保存证据单元，覆盖 current/retired 陈述；不只取支持原句周边字数窗口，不加入无关对象材料。Source 全来源风险检查与 Owner 跨来源裁决各自负责完整性，前者不能弥补后者的上下文缺失。语义证书绑定实际计划中的全部 audit taskRef 及实际 system；调整上下文/分区会失效旧证书，但不变更 Source policy 或失败范围来绕过派发守卫。

#### 共享 native 单元的只读业务邻接

Owner/修复读取同原文单元中其他 owner 的已组织命题作为只读材料，补充父子关系之外的独立课程规则。Evidence 邻接不等于规则适用性，Local 不做语义合并、不复制规则、不扩大 Confirm/可写 scope；模型依据原文判断要求是否已保存、是否需要可达性/适用性 Issue。repair 还提供同 owner 未修改命题。已有 candidate ISSUE 不能强制把另一已知命题降级，应先判断是否为不同兼容语义轴，再解决真实不一致。语义证书包含实际 task refs/system，上下文/策略调整失效旧认证；历史失败 capture 与 UNKNOWN 守卫保持。


#### Owner 审计的保存层与产品层边界

Owner 审计接收其 native units 的 preservedReadOnlyContext，展示已保存 Reference/Background 分类及局部 Clause refs；仅供审计信息是否已保存/可达，不扩大 owned approval 或允许修改其他上下文。ACTION 是 Product Disposition，role=core 可以是描述性的当前考核身份、权重、时间、渠道，不能等同 imperative/role=action。无 standalone proposition 的一般教学方法仍可保存在不可变 Clause/Evidence/context；完整信息保存不要求把每段文字物化为产品 Fact。模型须继续发现被 context 掩盖的重要独立要求、条件、例外和真实选择，而非以原候选分类作真实性证明。实际 payload/system 纳入任务/证书依赖，旧审计不能认证不同上下文或合同。


#### 付费传输完成但候选合同失败

完整 stop/DONE/usage 不代表可应用候选。local-repair 缺失 independentReview 等必填信息仍应失败，不能自动继承旧批准范围或依展示角色猜测布尔值。修复返回完整 ProductProposition；Scope、原文、非 scoped 候选守恒照常校验。私有恢复账本将 paid transport-complete/product-contract-failed 的 logical scope 单独冻结，费用结算状态与语义状态分别记录，保留原 raw/request/cache，不通过新Prompt/ID重复派发同一失败范围。后续合同补全需要明确的可写字段与只读模型结果/原文边界；未完成时维持前一有效候选和待审状态。


#### 字段补全与只读课程框架（RC2 持续整改）

保存的修复响应仅遗漏 independentReview 时，恢复阶段冻结全部已返回语义、Evidence 引句和原作用域，发起独立 missing-independent-review/1 字段任务，由模型显式给出布尔值与判断依据。先校验原 patch 可写范围，再允许补全调用；拒绝其他字段缺失、额外字段、错误 ID、null 或未完成回复。补全结果必须重新通过完整产品合同及生产 Clause 映射，不默认、不继承旧值、不重派冻结语义修复。缓存重放不得覆盖最初成功候选的恢复来源。

Owner/repair 现接收 readOnlyCourseFrame：从已保存的顶层 series hints 及精确 Clause/Evidence 关系取得现有课程总览命题与原文，结合 sourceContext 判断教学方法、programme guidance 与当前任务。它不是 Outline-first，也不是排他性考核列表；不减少全来源风险检查，不扩大 mutation/approval scope。Reader linkHints、source title、候选分类均非原文真实性依据，无日期/权重的新任务仍须识别。完整解析状态只可附着于完全相同的 native 文本，不能将长原文的完整标记移植给引用片段。改动改变实际 taskRef/system 依赖，旧审计不可认证新配置。


#### 三类审计指令依赖隔离

Source 的完整 native 风险检查、Owner 的跨来源语义裁决、Bridge 的对象关系核对分别使用独立指令，共享严格的 taskRef/checkedRefs/complete/valid/issues 结果合同。Owner 框架/分类规则调整不得污染 Source system 指纹或增加无关推理；Source 仍检查全部传入正文和 Reference/Background、报告 requiresRead 与精确 nativeQuote，未减少来源窗口。每类实际 system 继续纳入缓存与语义证书校验，不通过删除指纹依赖复用旧诊断。该拆分调整当前请求后须真实复核，不能把历史旧Prompt响应当作新版 PASS。


#### 审计基础标准不携带第二套输出格式

PRODUCT_AUDIT 保存语义检查标准；productAuditSystem 独立负责唯一 taskRef/checkedRefs/complete/valid/issues 输出合同。不得将早期 valid/issues 格式混入 bounded system 再依赖“末尾覆盖”解决。真实 reasoning 已出现对两套格式的循环讨论。删除冲突格式不删除标准、不替模型作语义判断、不放宽完成条件；system改变继续失效对应Owner/Bridge缓存/证书，Source独立指令不受影响。有效旧结果保留其实际配置依赖，不能默认新Prompt无需复核。


#### QA恢复证据绑定与导航状态

真实点击结果须绑定运行时存档产品SHA与声明候选Hash；编辑后的Fact不能替换不可变模型archive用于绑定。目录切换须等待GET_VIEW中实际reviewItemId到达目标再操作，按钮存在不能证明新页面已到达。QA按视口即时保存结果，失败保留已完成证据。仅合同有效的diagnostic seed不含生产nativeSnapshot/语义证书；它可验证渲染、用户值保护及备份恢复，不能证明正式unchanged Check零调用或真实模型变更。禁止为获得PASS伪造检查点/证书。


#### P2E-054/056 预付钱包授权：禁止另建累计费用硬上限

P2E-054 prepaid-wallet/1 明确 supersede 旧¥25/¥7 future limits；P2E-056沿用当前实际可用预付钱包及既有最坏费用/UNKNOWN守卫。某次初始 observed balance不是Human批准的新增累计上限。实时余额已包含结算的外部/内部扣款，不应再次扣掉全部历史保守usage估算；否则价格折扣/缓存等造成的估算差异会变成未经授权的产品容量限制。私有真实验证入口已移除 min(providerAvailable, initialObservedBalance - incurredEstimates)，使用fresh providerAvailable，并保持当前未结算/UNKNOWN reserve、单物理派发、第二次派发前余额复核、精确请求最大费用与失败scope守卫。历史估算保留费用依据与不确定性，不能标作实付或授权余额；不充值、不换账户/模型、不允许UNKNOWN重派。


#### 审计结果合同与失败范围身份（2026-10-13）

审计输出仅要求 schema/taskRef/checkedRefs/complete/issues，避免模型同时生成 valid 与 issues 的冗余且矛盾判断。保存的低推理 Owner 实验确实指出教学建议错误晋升，但返回 valid=true 且 issues 非空；严格拒绝该历史响应，不能补写或重新解读成通过。历史 valid 字段存在时继续校验与 issues 一致，完整 checkedRefs 与 native/Clause 依赖要求不变。单范围 low/high 实验纳入精确及别名缓存身份，不能覆盖生产默认 high 或生成整课证书。

验证入口失败冻结身份改为 owned ownerRef、命题 IDs 和 sourceId/locator/原文字节的确定性摘要，不依赖可随 Prompt/effort/metadata 改变的 taskRef。旧 taskRef 冻结日志仍检查；同时回读所有失败捕获及 unusable journal 绑定的原请求，按新身份比较，不修改原记录。此身份只用于阻止重复付费，不判断语义、不产生认证。真正更小的命题范围可以有不同身份，但 UNKNOWN 钱包预留未核销时仍不允许调用；禁止用改 ID 绕过未结算同一范围。

Token 边界仍仅为平台能力及获授权实际钱包的最坏费用分配，没有新设固定任务输出 cap。ReasoningCycleGuard 是明确循环停止信号，失败保持未完成且 usage UNKNOWN，不能以中间 reasoning 当可写修复或最终结论。


#### Owner 局部恢复路由（未替代完整语义闭环）

planOwnerAuditRecovery 基于保存的 ProductProposition.group 构造局部任务；parentRef 跨组时合并父子组，缺失父命题且无可证明上下文时明确失败，不按 Token/字符数量切断义务。无法形成两个独立路由组时返回空集，禁止为相同整组请求换号重试。所有条件、例外、力道、状态、支持引句原样保留；完整 original nativeContext 和其他命题作为只读上下文保留，局部可写/报错 propositionRefs 显式受限。该选择优先防止失去反证，尚不代表输入或总成本下降。

auditProductTask 可以通过稳定的局部 taskRef 使用同一 capture、严格审核输出验证器和缓存。局部 recoveryScope 强制声明 fullOwnerCompositionRequired/sourceAndBridgePassRequired；局部 receipt 恒为 courseComplete=false。局部额外指令仅加入局部请求，不改变未拆分 Owner/Source/Bridge 的系统合同与缓存。auditCourseProduct 的完整计划仍要求原整组任务与全 Source/Bridge，未将局部通过转换为整组通过。跨组 composition 的避免循环合同及最终可认证闭环仍待实施/真实验证；不能重新派发已冻结的原整组请求。


#### 局部恢复的跨组组合核验与合同依赖

auditOwnerRecovery 顺序运行独立局部范围，再运行 owner-composition。compositionScope 列出全部局部 taskRef、准确 systemDigest（沿用现有确定性合同摘要，不冒充SHA-256） 与每组 owned refs；组合检查开始前必须验证本次所有局部合同已完成且没有缺陷。局部 incomplete 抛明确错误；局部 defect 立即返回，停止后续付费范围，不能带着已知缺陷继续收费。组合保留全部 native/Clause 与原命题，但只审核跨组身份适用性、时间轴、渠道/目录、重复或遗漏义务边界、层级/OR/条件例外和独立批准范围，不重新逐条总结满意条款。

组合是新的关系任务，不能靠更换 taskRef/Prompt 将原整组重派伪装成组合：调用stage必须是owner-composition且operation匹配；实际执行入口由已验证局部前置条件构造。组合任务失败身份独立冻结，忽略可变化的依赖任务编号，仍绑定原owner、owned refs和native正文。原whole Owner失败记录与UNKNOWN预留保留。该路径返回ownerComplete仅在局部及组合均无缺陷时为true，courseComplete恒false；仍须全来源重要任务召回、其他Owner与跨Owner Bridge。完整默认产品认证计划尚未用这一恢复结果替换原Owner任务，也未真实模型验证组合有效性。


#### 完整产品认证接入已完成的 Owner 恢复闭环

仅在auditOwnerRecovery严格完成全部局部及组合且issues为空后，保存owner-recovery-closure路由索引。索引绑定原任务、全部局部任务、组合任务及准确组合合同摘要，不保存或相信一个笼统valid=true。auditCourseProduct保持原Source/Bridge计划；遇到与当前完整输入/合同匹配的恢复索引时，以局部+组合替换该原Owner审核任务，随后逐个重验准确raw缓存。不完整/篡改索引明确失败，缺失raw不能直接通过索引认证。没有索引时仍走原完整Owner任务；冻结的原失败范围不能通过该接入重派。

productVerification加入各Owner可能采用的完整恢复依赖与合同绑定，旧证书因此失效并重新验证缓存；Source和普通Owner的模型请求系统、task IDs及cache keys没有改变。原完整Owner通过与“所有局部+组合通过”是两种完整审核路径，单个局部PASS不是替代路径。组织函数在issues为空时也显式要求semanticAuditComplete，阻止未完成结果生成证书。脚本测试只能验证这一完整生产路径，不建立真实模型语义通过。

### P058 有界实现与未闭合语义（2026-10-13）

AssessmentCardView携带既有结构role；仅Product Series且有components/无instances使用Brief平级呈现，不修改storage身份、父关系、Source/Clause或原product。course.ts引用原Fact生成总览、字段优先、risk语义group与执行清单；ViewBuilder仅传role。没有新增token/capacity阈值。新QA入口复用056真实candidate编译及057preview builder；指定独立output-dir，禁止worker/page网络，保存SHA与刷新守恒。原候选ac4383未变化。现有PRODUCT_SYSTEM/AUDIT已含P058语义标准，但旧输出未遵守；不叠加同义Prompt、schema证明或本地关键词重判。当前语义缺口和最小核读提案见 `PRODUCT_P0_REMEDIATION_v0.3.0.md`。

### P059 单卡与详情的有界实现（2026-10-14）

course.ts对Product主视图只生成assessment-cards，复用原CRS-03和Fact/Evidence ID。summary引用typed字段；详情排除summary IDs、按已提供业务group/字段组织，完整重复才合并显示并union Evidence，父完整正文及长子章节按需展开。ViewBuilder从CourseDraft.product.propositions恢复原顺序，避免IndexedDB ID/field排序成为执行次序；storage/product不重写。UiState只保留返回焦点/滚动及disclosure临时状态，不参与认可。Review仍使用原productFacts及mutation路径。QA builder可选择side-panel语义上下文，两个Review页面均标未核验并禁网络。无新AI摘要、audit/certificate或容量阈值。实际偏差和验证见 `IA_DECISION_AND_PREVIEW_RESULT_v0.3.0.md`。


### P060 实际实现边界

Course 卡片新增 UI-only scrollTop 状态与受限 flex region，Evidence 复用 CRS-03。studentFact 使用既有命题 title/group 做展示标签，行动力度内联；parent/child 与 relation 不重推断。distinctDetailFacts 去重 key 补上 label/title/unit：旧 key 把同为5分但不同标题的 Rubric 合并，现保留各项身份及全部 Evidence。新增回归用例覆盖该故障。未知异文语义不合并。

print.ts 在 beforeprint 打开 #app 既有 details、afterprint 恢复，生产 boot 与隔离预览同用；print CSS 回归普通文档流，长动作允许跨页，短数字 rubric 的 label/value 保持成对。没有修改 candidate/raw/Clause、Review mutation 或安全账本。真实源问题及有限核读边界见集中整改报告。


### P061 实际实现

planningFact复用Fact ID/state/Evidence；Primary按已有field/unit和KNOWN排序，Secondary保留原display，UNCERTAIN转同详情核实入口，renderDetail仍显示原完整竞争值。标签只移除模型已提供group scope前缀。规则排序来自modality/role/knowledge，不分析课程关键词，不生成新摘要模型。

print.ts在beforeprint触发当前Course renderer生成临时print document，沿同course引用/信任版本复用Brief/detail渲染；native details和无Evidence长prose均完整展开，afterprint复原/销毁。Full按同Fact ID消除重复引用、附来源定位，不做语义去重。源/模型/candidate未写，Review mutation与钱包边界未改。实际PDF值覆盖/几何检查、print按钮模式与状态恢复在本轮脚本；不能用DOM守恒代替PDF或语义准确性。


### P063 最终收口（2026-11-02）

本轮不新增AI pipeline。产品授权delta在私有数据层留存before/after/Clause support，仍由validateCourseProduct、compileCourseDraft与既有WorkflowEngine/Review处理；生产代码未硬编码课程名、权重或时间。分立presentation_duration/qa_duration/group_count为通用字段，渲染沿已有typed Fact。隔离标识RC2 candidate并非自动信任；模型旧记录、原决策表、Clause及真实DB未写。


## P2E-064｜RC2 Typography收尾（2026-11-02）

保留P063的17项候选修正、四卡布局、内部滚动/焦点返回、Review及双打印。按Owner最终明确指示，大字和标题使用原课程标题的Fraunces衬线体，正文/标签/按钮保留既有无衬线；考核标题20px/550（原23px/600），权重桌面36px/500（原42px/600）、窄屏34px/500；日期17px/500（原19px/600），课程名21px/500同字体。字体复用既有资产，无下载；仅CSS，未改DOM/行为/候选数据。打印权重30px，长段维持Regular。

疑似裁切：1280/380新开及字体加载后scrollTop=0，Presentation dates首行完整；650高窗口主动滚到行中可复现半行，返回保留位置，Home恢复起点。未证明默认裁切或内容缺失，未强制重置滚动。对照、测试、恢复点见 `RC2_TYPOGRAPHY_REFINEMENT_v0.3.0.md`。同一RC2原位更新，非RC3；Human Gate5待验收，不发布。
