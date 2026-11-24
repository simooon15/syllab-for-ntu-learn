# Syllab for NTU Learn — Implementation Plan v0.3.0

## P2E-042 执行记录

系统性严格输出契约、stage authority、schema/provenance/materializer/Review 守恒、关联 Component/date/Task C 修复、零付费真实回放、731-test CI、候选包与解压加载验证已完成。原 Review 与22表保留；新增paid=0。当前 ENGINEERING_REMEDIATION_READY / REAL_MODEL_REVALIDATION_REQUIRED；不等于 Final Acceptance，不发布。实现与已知限制见 Engineering Report Semantic-042；后续1次真实B2验证建议等待新的明确授权，不能重用041额度。

## Semantic-041 当前状态

5次已授权调用完成，4PASS/1FAIL；B2全链路契约/投影不成立，STOP_PRODUCT_REVIEW_SYSTEMIC_ASSESSMENT_REMEDIATION_REQUIRED。原Review/trusted state保持。下一位先读ENGINEERING_REPORT的Semantic-041和handoff-041/README；复用私有完整响应做统一契约设计及零模型守恒回归，不能从头重发这5次调用或简单过滤失败字段。新paid请求须另行授权；本轮不发布。

## Semantic-040 当前执行状态

实现、716-test CI、保存结果零付费回放、生产候选包加载和原Review全表守恒验证完成。真实模型语义验收仍待最多5次新的定向physical调用授权，状态STOP_NEW_PAID_VALIDATION_AUTHORIZATION_REQUIRED；具体最小方案在semantic-040/EVALUATION-PLAN.json。原039候选未重新分类，不能放行Product语义验收。其余已授权工程工作连续完成，未为普通代码问题中途申请审批。下方是历史阶段记录。

## Engineering-039 当前执行状态

P2E-039连续工程授权已执行：同workflow两个单次B2补偿、真实Initial Review、706-test CI、0.3.0生产候选打包及解压加载验证完成。状态STOP_PRODUCT_REVIEW_V030_ENGINEERING_COMPLETE。语义质量仍带已知缺口，集中等待Human Product Review；不自动Confirm/adopt或发布。详见ENGINEERING_REPORT的Engineering-039及engineering-039脱敏证据。下方为历史阶段状态，不再作为当前阻塞条件。

## Recovery-037 当前执行状态

安全停止、原 profile / 同 workflow 恢复、Worker revision 与 route 接管、零模型 checkpoint 守恒及 CI 已完成。当前 **BLOCKED_AMBIGUOUS_PAID_B2_RESULTS_UNAVAILABLE**，尚未 Initial Review / 工程集中验收。两个未知付费请求冻结自动重发，等待可核对的原 Provider 结果/计费证据，或最小潜在重复付费授权；不重新请求已执行的停机恢复权限。

119 Sources 的两项原失败 Fetch、17 Partial 和 B2 结果缺口仍未闭合，不标记完成。事实与证据见 ENGINEERING_REPORT_v0.3.0.md 的 Recovery-037 及 `artifacts/v0.3.0/recovery-037/`。下一阶段仍只能沿原 run 恢复，不创建新 workflow / full-course，不 adoption / release。


**状态：** 离线 permission/restart/Worker revision 回归 PASS；唯一 live Initial coverage FAIL、运行无响应且付费状态未闭合。  
**授权入口：** `P2E-v0.3.0-2026-10-08-036`；设计依赖当前 Technical Design / PRD。  
**当前停止点：** `STOP_ENGINEERING_LIVE_RUNTIME_UNRESPONSIVE_PAID_STATE_UNVERIFIED`（P2E-036 §5 关键例外；非普通工程审批）；paid 仅限 P2E-034 milestone，仍无 adoption / release authorization。

## N0.3 真实恢复 FAIL 与继续条件

用户已给两项 exact origin 权限；同 workflow 已进入 Task A，最后 96 succeeded aiRun records，physical accounting 未闭合。119 observations 中两项权限失败未重读，17 parse Partial；live coverage FAIL，尚未 Review。Cached Worker 没有新修复标记，已补 QA runtime revision gate；当前 Chrome IPC 无响应，不能在未核对付费结果时强制 reload。保留环境，按 §5 返回唯一安全恢复边界决策；不增加 full-course run / paid budget。

## N0.2 P2E-036 连续执行

权限恢复与精确 scope 修复完成；704-test CI / synthetic reload + checkpoint SHA + existing route 接管 PASS。原 observer 清理事故导致浏览器进程退出，已恢复同 private profile 与原 workflow，十类数据库表 SHA 相同；详见 Report Permission-036。当前前台 Scan 可见 Grant，等待一次真实用户授权 exact alt origin 后续跑，live coverage / Initial Review / accounting 未完成。不启动第二次扫描，不把此次环境暂停记为 Product Review，也不声明 ENGINEERING_COMPLETE。

## N0. 实际 slice 完成状态（2026-10-08）

| Slice | 当前状态与实际交付 |
| --- | --- |
| S0 | 完成：versioned session、durable round/segment/request accounting、captured replay、ambiguous dispatch refusal。 |
| S1 | 完成：typed native comparator + conservative fallback、scoped read layer、native-order bootstrap 与 Unicode ranges。 |
| S2 | 完成：one-Source A、新 policy 独立 checkpoints、fail siblings / restart protection、visual ephemeral dispatch。 |
| S3 | 完成：single progressive Registry、CAS/history/retirement、完整 disposition 校验、multi-segment transport / carry archive。采用完整 A barrier 后 admission，不采用 early overlap。 |
| S4 | 完成：one-Group B2、scope / upstream validation、failure isolation、mechanical assembly / Rule reuse。 |
| S5 | 完成：thin C、三入口 staging 隔离、conservative no-AI skip、Current/Latest Evidence / removal safety。 |
| S6 | 完成 zero-model qualification：完整 CI 698 tests、isolated browser injected-provider、reload/recovery、QA/shipping separation。日常安装扩展 reload 因浏览器安全策略不可执行，使用前仍须完成；没有日常 NTU 标签需要刷新。 |

详细实现、回归修复与证据位于 Engineering Report 当前 G-Zero 记录。这里的完成不包含真实 Provider / semantic quality / Human Product acceptance。

## N0.1 P2E-034 实际执行

- Paid preflight PASS：已存在 BYOK/consent、Provider auth 200、exact `deepseek-flash` 可用；没有新增 credential 收集或公开 secret。
- Targeted semantic PASS：11 cases、15 physical calls，3 confirmed engineering reruns、0 technical retry；成功 checkpoint/captured response 复用，不随机刷 PASS。详情见 Engineering Report 和 `artifacts/v0.3.0/semantic-034/r2/TARGETED.json`。
- 最终 CI PASS：702 tests；既有保护和新 QA Initial guard 通过。普通 prompt/schema/harness regressions 在同一 milestone 内修复。
- 唯一实际 clean live workflow 为 Initial：原 Course 未 established，原 profile 的 10 类 user tables 保持 SHA 相同；隔离 QA fresh Discovery 得到 119 Sources，Fetch 在 host-permission 等待。live paid calls 0；未到 Initial Review / Rebuilt Preview。
- 034 旧环境指引（已由 Live-036 替代）：授予一个附件 origin：`https://alt-5dcb73f79ba4c.blackboard.com/*`。保持同一 workflow；已有监视进程仅记录状态，用户 Grant permission 动作可恢复等待流程，不自动创建第二个 workflow。

## N1. 当前计划与历史边界

N1–N7是新架构的当前工程计划；末尾旧正文保留作历史执行证据。旧P2E-028/Gate B-R等paid attempt、Main waves、classification、full-course等许可均不沿用。P2E-033 已批准一个连续 S0–S6 milestone；本轮更新已授权代码、测试及工程文档，无 commit/push/tag/release。

不推倒既有file understanding / provenance / worker recovery / trusted-state protection。先建立边界与持久化contract，再逐阶段接入；新policy不迁移或删除旧trusted数据/ledger。旧已实现能力和历史PASS不计作新slice PASS。

## N2. Vertical slices与自动验收

| Slice                             | 纵向交付与依赖                                                                                                                                                                               | 必须通过的script-first automated checks（全zero-model）                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 完成出口                                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| S0 Contracts + session accounting | 新A/read/B1/B2/session schema、persistent aliases、physicalRequest / transportSegment / effectiveSemanticRound 三层ledger及roundId/segmentId contract；不切production路由                    | synthetic fixtures覆盖0-output FINAL、malformed/length不加effective count、最后轮仍可多segment delivery、重复completion只计一次、AI新Evidence→新round、同wave分页不加round、segment超scope拒绝、别名冲突、跨task ID隔离、prepared/dispatched/captured/applied恢复；types/lint                                                                                                                                                                                                                                                       | 可解析合同和错误状态；没有凭Local生成semantic结果                                                     |
| S1 Native identity + read layer   | additive Source signals、native-first/hash fallback comparator、native structure/page/range/search/visual resolver；依赖S0                                                                   | adapter可靠性缺省、modified缺失/变化、同resource但无version、resource identity替换、signed URL变化、ordinal fallback、Partial→incomparable；exact range/surrogate、cursor无遗漏、unauthorized/stale scope、空unit、缓存/no-progress；parser与Evidence回归                                                                                                                                                                                                                                                                           | 可对Source snapshot机械读写，机器相同skip有完整前提；未改trusted对象                                  |
| S2 One-Source Task A              | 新policy停用classifier/deferral/downstream filters与multi-Source packing；接A session/index-first/read/FINAL与independentcheckpoint；依赖S0/S1                                               | bootstrap机械正文足够→首轮FINAL无需固定read调用；large Source按已固化type/native-order/serialized-size规则bootstrap→CONTINUE→read→FINAL，empty只为合法技术分支，不按title/relevance选择；0Draft/0Rule合法、不相关判断只由AI；技术失败不能输出空成功；同Source continuation与跨Source请求拒绝；FIFO/AIMD、失败siblings、successful reuse、restart zero additional dispatch；native/visual/legacy conservation                                                                                                                        | A outputs在独立runtime namespace保存；不将旧Deferred当成功；无真实调用                                |
| S3 Progressive Registry Stage 1   | 单Registry CAS、inputwatermark、Engineering前2effective轮overlap策略、deterministic multi-segment transport、finalization barrier、Same/Different/Uncertain、重要规则与trusted links；依赖S2 | 注入A/B/C跨Source反例，late Draft引起AI显式merge/split/reassign/retirement；所有Draft/Rule disposition set accounting；并发完成不同顺序稳定admission；A失败显式gap；barrier前FINAL拒绝；不Local merge/compress；oversized synthetic Registry/input wave经多个segments完成同一global update且只计1 effective round；segment restart/duplicate delivery/out-of-order/captured-response reuse、AI-authored操作与carry state、一个Registry不Local semantic merge、最终Draft/Rule disposition完整；只有真实不可恢复continuation才Partial | 正常oversized完成全局update；不可恢复失败明确Partial并保留checkpoint；引用/coverage完整，B2不提前派发 |
| S4 One-Group Stage 2 + B assembly | 冻结Registry、oneGroup oneTask、group-scoped reads与3/4round、parallel失败隔离、mechanical Task B Result；依赖S3                                                                             | 每请求只含一个Group，同Group多segments不多扣semantic budget；新增AI Evidence之后重新判断新round；crossGroup refs拒绝；sameSource含多Group仍不重做identity；Uncertain/Conflict/Not Mentioned合法FINAL；一个失败不重派成功；Group版本变化仅失效相关任务；success+failed set conservation、Rules无第二次AI                                                                                                                                                                                                                             | provisional结果可供既有Review adapter投影，未adopt                                                    |
| S5 Thin C + workflow protection   | Check的trusted identity route、perAssessment/Rule comparator、2/3round/reads与strict equality skip；Initial/Rebuild无C；三入口独立staging；依赖S4                                            | C同round多segments与AI新read新round分别计账；initial/check/rebuild同课程隔离、无Confirm/Use不改变trusted；same-name不能skip；exact payload相同但coverage不完整不能skip；missing-only route不造empty A；identityUncertain不在C regroup；failed Source/Group阻止removal；Current/Latest双Evidence链；revision/generation/lease竞态                                                                                                                                                                                                    | Review语义保持，trusted/history/otherworkflow逐表守恒                                                 |
| S6 Integration qualification      | 全链路新policy、旧policy只读/恢复边界、Activity/backup/restore/生产QA隔离；依赖S5                                                                                                            | 全`npm run ci`、isolated browser E2E injected provider、new/old workflow restart、ambiguous-paid拒dispatch、实际modelinflight=0、shipping不含QA archive、所有locator/ref守恒；bundle reload并refresh所有已开NTU tabs                                                                                                                                                                                                                                                                                                                | `ZERO_MODEL_ARCHITECTURE_READY_FOR_PRODUCT_REVIEW`；申请限定paid验证，不能自动调用                    |

S0–S6全zero-model；使用synthetic或irreversibly redacted fixtures。测试里Provider只注入响应并显式拒绝真实network generation；不运行`test:real`、旧Gate脚本的real分支或course automation。每slice执行相关tests/types/lint，runtime集成完成必须full CI。测试失败先在当slice排查，不为省事扩大产品范围或重跑课程。复杂功能的tests应验证反例、守恒与恢复，不只镜像实现。

### N2.1 本次targeted revision的qualification补充（仅计划）

S0首先固化R5.1响应种类、round cause、reservation/完成CAS、delivery manifest和operationId，确认Local仅按ledger机械计账。必须比较同一wave单segment与多segments：physical request计数可以不同，effective round均1；duplicate/out-of-order/restart不重复计；read请求引入新semantic Evidence之后的重新判断必须+1，不能藏在transport ACK里。

S1/S2在implementation-time先明确并fixture验证各Source type bootstrap合同，测完整envelope大小，不做Local semantic selection；small native正文可直接携带并FINAL，大file既保留index又通过requestedReads获得剩余内容；不能把“empty first call”写成统一验收前提。此段保留实施前 qualification 计划；实际 builder / prompt 已按 N0 实现。

S3 oversized测试使用合成Registry与完整input wave、显式模拟已验证transport/context boundary，不改production容量常量。覆盖超过单次边界的Registry record/string/output、多个deliverySets、一个AI-authored working branch、CAS闭合、跨早/晚segment的AI显式merge/split/reassign、late A/Rule在FINAL barrier前全部admit；计数与所有ID/disposition必须守恒。Local只机械apply AI操作，禁止多个Registry各自FINAL后再Local合并。真实不可恢复scope/read/minimum-envelope/ambiguouspaid和正常超大输入分开验证。

前2轮overlap是Engineering strategy，可在不改Product round boundaries/authority/barrier下据证调整；10→25/AIMD是current engineering tuning baseline / historical target，须zero-model/runtime验证，不是latest PRD固定产品要求。队列slot只影响吞吐，不能减少eligible Sources或改变semantic completion/correctness。

## N3. 现有tests/artifacts复用与调整

| 既有位置                                                                                                              | 复用方式与限制                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| parser/pdf/runtime、offscreen/deadline、Blackboard/discovery tests；`v030-office-check.mjs`                           | 复用格式、locator、timeout、discovery传播基础；Office探针先核对入口为isolated synthetic，不因名称就对真实课程运行                                                                                                                                          |
| `evidence-identity`、`evidence-retrieval`、`task-b-grounding` tests                                                   | 复用exact identity/range/引用与合法sibling隔离反例；新upstream schema另外验证，旧B closure不直接成为Stage1 success                                                                                                                                         |
| `physical-work`、`package-scheduler`、`worker-lifecycle`、`task-a-containment` tests                                  | 复用dispatch-before-send、raw-before-validate、ownership、ambiguouspaid、drain；新增no packing、roundId/segmentId/restart/重复计数/新增Evidence案例；旧physical请求数不得成为effective-round oracle。旧packing测试保留旧policy历史兼容，不作为新主路径验收 |
| `store`、`restore`、`backup`、`workflow`、render/stream/activity tests                                                | 复用revision、generation、trusted保守、rawreasoning隔离；新增三入口runtime/projection隔离与Current/Latest evidence                                                                                                                                         |
| `artifacts/v0.3.0/gate-br-028/ROOT-CAUSE-MATRIX.json`、`R1-RESULT.json`、`R1-DEEPSEEK-USAGE.json`、Engineering Report | 保留不可变失败/计费证据，设计依据；saved replay只机械诊断，不当新AI语义fixture oracle，不让旧raw成为新Stage1 output                                                                                                                                        |
| 旧gate/probe脚本                                                                                                      | 先审计generation入口、profile/table作用域、输出覆盖行为；只复用明确zero-model隔离探针。新validation另建授权identity，禁止覆盖原Gate/ledger/cost文件                                                                                                        |

现有669tests PASS是历史结果；不能预填新architecture tests数量或宣称semanticquality通过。自动与real/human evidence分开记录。

## N4. Product Review Gates与real validation申请

**G-TD（已通过）：** Product review R2 audit、R3 native reliability/fallback、R4 read contract、R5 budgets、R7 Registry/overlap/barrier、R8 Group boundary、R9 trusted/provenance。P2E-033 已批准并进入 implementation。

**G-Zero（S6之后）：** 连续实施S0–S6无需为普通schema/test问题增加人工Gate，已由 P2E-033 授权。提交zero-model检查、actualchangedfiles、stateconservation、remainingrisk，申请新的bounded real validation。没有批准前calls=0。需明确course/snapshot、logicaltasks、次数/恢复授权、成本ledger和停止条件。

**G-Semantic（未来单独授权）：** 优先最小必要的targeted A、B1跨Source、B2 perGroup与C两侧Evidence案例；关注Draft/rule recall、Same/Different/Uncertain、Registry持续修订、field synthesis与uncertainty、provenance，不机械重复失败的旧Gate B/B-R整体run。独立记录semanticround/technicalretry/physicalcalls、usage/cache/reasoning/runtime，未形成合法FINAL不算PASS。只有Product认可targeted结果后才授权必要real-course E2E；不因本计划自动运行两个课程。

**G-Product / Release（后续）：** 保留最新PRD的真实课程、Review质量、视觉/交互、人类最终验收；已有用户confirmed体验不能擅改。最终发布另需explicit commit/push/tag/release授权。Engineering PASS不替代Human Product Review。

## N5. Failure / rollback / stop conditions

- 普通contract/test失败：局限当slice修复；生产trusted状态不动，失败影响范围有typed evidence，成功siblings保存。
- 改变A/B1/B2/C职责、Local/AI/User authority、round boundaries、no cross-Group packing、provenance、Review/Initial/Check/Rebuild语义或Possibly Removed safety才可实现：立即Stop & Ask，不能修改PRD来适配代码。
- 同文件双侧新变更、未知本地Product改动：SYNC CONFLICT。已获授权的031两份旧副本覆盖不是新冲突；后续变更重新核验。
- 存在secret/private raw data：停止相应共享，不输出内容；不导出QA profile/cookies/原始课程到Drive。
- stale token/session/generation、auth revoke、ambiguouspaid：停止dispatch并drain，不跨workflow补写；unknown generation不得auto retry。
- 达semanticmax、no-progress、transport最小envelope不可承载：明确Partial/Unresolved；不增加轮数、不Local判断Complete，不截尾、不换Provider绕过。
- 已dispatch后不resetledger或回退造成重复计费；旧workflow不同policy不原地升级。未dispatch隔离fixtures可回前一代码checkpoint；实际rollback/commit仍遵循当时授权，不清理既有dirty树。
- 需要新增paidattempt/fullcourse/humanadoption：先新授权；旧Gate失败不能用新的文档推定可续跑。

## N6. 文档、同步与完成证据

实现后facts写Engineering Report，长期Product要求仍归PRD；本轮按 P2E-033 更新必要工程文档与 actual Changed Files，不增加 Product authority。每轮outbound列明确ChangedFiles并逐文件冲突保护→安全scan→copy→SHA/readback。不得递归Drive树，不回写入站PRD/inbox。新字段 additive；新 policy 使用独立 durable namespace，不破坏性迁移历史库。

本轮实际验证见 Engineering Report 当前 G-Zero 记录；旧 E2P-023 是设计阶段历史。完整 CI 与隔离 browser reload 已通过；日常安装扩展 reload 存在已记录的环境限制。

## N7. 当前结论

G-Zero 已由 P2E-034 接受，targeted real-model qualification 已 PASS。live E2E 已创建一次 Initial，因附件 host permission 进入环境停止点，尚无 live semantic/Review acceptance。按 P2E-034 §6 等待最小用户环境操作，之后继续同一 workflow；禁止第二次 full-course、第二门课程、adoption 或 Git release。旧 G-Zero/设计阶段的 Gate 文字只保留作原计划，不覆盖当前 Handoff 授权。

---

# 历史实施计划与Gate记录（非当前授权）

以下完整保留031之前的原正文。“当前”、下一轮和付费许可均是历史语境，不覆盖N1–N7或最新Handoff。

# Syllab for NTU Learn — Implementation Plan v0.3.0

**状态：** P2E-009 lookup preflight完成；P2E-008真实Rebuild因known recall失败停止，strict clean coverage carry-over亦未通过，等待Product review。设计依据 `TECHNICAL_DESIGN_v0.3.0.md`。  
**Product baseline：** v0.3 PRD / Interaction & IA；不重新 Product Planning。  
**起始 HEAD：** `26426a3793250aea351c443e3327ccdb1b95b697`。

## 1. 执行与停止条件

普通 Phase 使用自动检查推进，不要求逐步确认。Product-impacting Technical Conflict、无法自行
解决的关键测试失败、真实环境需要用户操作、Human Milestone Gate 才停。
任何 Partial、fixture 或候选 dependency 都不能伪装成真实完整 PASS。
每个模块修改后运行 targeted tests；集成点运行 `npm run ci`，零失败才完成 implementation gate。
提交、push、tag、Release 均不在当前授权内。

## 2. Capability phases

| Phase                                  | 实现与输出                                                                                                 | 自动验证                                                                                           | 当前状态                                                                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| P0 — Inputs / dependency qualification | 四文件定点同步；治理一致性；技术设计；MV3-safe Office converter                                            | exact-file hashes、dirty conflict audit、CSP browser spike、legacy roundtrip                       | Inputs complete；MV3 synthetic qualification PASS；license release audit pending                                                    |
| P1 — Format-aware understanding        | native PDF/PPTX/DOCX/XLSX units、legacy canonicalization、visual gaps/rendering、provenance                | synthetic native/visual/legacy/corrupt fixtures；worker bounds；真实 MV3 load                      | Implemented；automated regression PASS；real coverage pending                                                                       |
| P2 — File package / scheduler          | default whole Source、necessary split、adaptive bounded execution、串行 staging commit、failed-only resume | scheduler pressure/cancel/order；stale lease/restore；两入口重试；source hash reuse                | Implemented；scheduler / workflow regression PASS；real waves pending                                                               |
| P3 — Semantic context / evidence       | A prompt+contract、Shared Working Context、B continuous session/ref retrieval、C coverage                  | Same/Different/Uncertain cases；invalid/stale refs；expansion bounds；zero-AI Check；Review safety | Implemented；contract / ref regression PASS；real semantic quality pending                                                          |
| P4 — Activity / UI / Motion            | SSE production bridge、ephemeral Activity A/B/C、tokens/components/motion、focus/scroll continuity         | stream framing/privacy/abort；两 surface DOM/browser；reduced-motion；screenshots                  | Implemented；5 browser checks / 39 screen captures；G-Experience pending                                                            |
| P5 — Real acceptance / closeout        | 大课程 clean + 新课程 cold-start、targeted Check/Rebuild、独立 ledger/comparison、final records/handoff    | full CI；real-course evidence；metadata/cost audit；Product Gates                                  | Paused at Product scope gate；historical clean failed / USER_PAUSED_VALIDATION；second course not started；final acceptance pending |

P0 的 MV3 CSP static binding 已通过，DOC/PPT/XLS canonicalization 和现代格式 render 的生产模块
合成验证 PASS。corrupt/password、复杂真实文件、内存峰值/完整回收与 release notice qualification
仍为未完成项，不把 simple roundtrip 的 PASS 扩大为全部 Office coverage。

## 3. 每个 Phase 的完成要求

### P1

- 原生 locator 不等于 AI chunk；native table/relationship 和 workbook identity 必须保留。
- 有 visual gap 的 unit 不得标为 Complete；converted Source 保留 original identity。
- 少量视觉补全与 native text 共用 Evidence chain。
- converter 启动、转换、render、释放内存均在实际 MV3 页面验证。

### P2

- Initial/Rebuild 的 Source 是独立 checkpoint / retry logical unit；physical AI request 应按可验证技术边界动态装入多个 Source，whole-file fits 不等于一个物理请求。当前 legacy one-Source-one-call 是待修正 implementation gap；P2E-019 recovery STOP 后尚未实施 batching，不宣称该项完成。
- 10–25 是适应目标，压力下降低并发，不能降低 Source coverage。
- 成功 part/source 不重跑；auth/cancel/stale 后不再 dispatch 或提交。
- 并发完成不得造成 staging 丢写；Task B 的输入顺序确定。

### P3

- 文件内、跨来源与变化判断仍分别由 A/B/C 负责。
- B 默认不读取全文，Ref request / local retrieve / append 是同一 logical session。
- Initial 无 C，Rebuild preview→Use/Keep，Check 仅 machine change 才 A/B/C。
- 旧 trusted state、user edits、exclusion 与 generation/revision 保护通过回归。

### P4

- Activity 为真实 SSE snippet，零额外 summary calls，运行结束清空，不持久化。
- 所有 screen families 使用同一系统；两 surface 语义相同、密度不同。
- Evidence、Review、Edit、Settings-return、success/error/undo 都有真实交互证据。
- 修改 bundle 后 reload extension，并刷新所有已开 NTU Learn tabs。

## 4. Human Milestone Gates

### G-Experience

在 P1–P4 集成、自动验证和实际浏览器截图完成后：Product Owner 审阅最终实现的两 surface，
实际操作 Review progression、Evidence、Edit、Activity 与 reduced motion。
没有视觉接受就不称 UI 完成。若发生真实方向调整，按治理记录到同版本 Direction Adjustments，
不为每次修复创建文件。

### G-Real-course

在一门真实大课程完成 full chain 后审阅 coverage、semantic organization、Identity、Review burden、
runtime/invocation/token/cost comparison。不要求重复跑四次昂贵 full course。
其他入口 targeted 验证同底层能力和 state safety；Rebuild adoption 由用户决定。
如果登录或授权需要用户操作，保留当前证据并请求具体动作，不读取/导出凭据。

## 5. 文档与交接

- Engineering Design 只维护 Technical Design；phase 状态只维护本 Plan。
- 实际 implementation/verification 进入 `ENGINEERING_REPORT_v0.3.0.md`，形成事实时再创建。
- 实现/验收收口后再形成 `VERSION_RECORD_v0.3.0.md`；不创建 AI Design 或空方向调整。
- root README 在版本公开收口时更新，旧 README snapshot 不修改。
- 出站只更新现有 `CODEX_TO_CHATGPT_HANDOFF.md`，列出 exact Changed Files 和 evidence。
- Drive 写回只用定点文件清单；不递归扫描、hash、diff 或 hydrate Drive 项目树。

## 6. 当前续接点

DA-001 已实现并完成 targeted real-model evaluation / scope projection；当前停在 Product Scope Review，详见 §8 与 Engineering Report §8。历史真实课程失败 / 暂停状态、成功缓存和证据保留，不自动恢复；第二门 cold-start 未启动。G-Experience、两门课程 G-Real-course 与最终验收均未通过。

以下 runtime repair gate / stop point 为历史工程阶段记录，由当前 DA-001 gate 覆盖其继续运行指令。

## Runtime repair gate after accepted limit audit

P0 complete coverage, independent render/provider lifetimes, actual serialized request boundaries,
network admission/reuse and separate Activity buffers implemented. Controlled synthetic/unit probes
precede original failed workflow recovery. Full CI must pass before loading the repaired QA bundle.
Only resume `wf_2c80f73f2ae805c80fdb0a74`; no new course scan. Real peak/distribution, latency,
waits, repairs/consolidation/cache and source/page conservation must be captured before declaring
performance fixed. Detailed implementation/evidence/remaining risks live in the existing Engineering Report.

### Current stop point — runtime logic repair before real retest

Product Owner于本轮真实recovery失败后要求先收口逻辑，再重新真实测试。原workflow保留failed /
Task A / AI_CONTRACT，成功cache保留；不会自动resume或发起新scan。
已完成：P0完整分页/遍历/文本、独立render生命周期与canvas释放、真实request边界、network/stream
停止放大、nested Evidence repair、完整JSON repair与parse位置、成功包checkpoint、empty-render
coverage guard、Evidence进展/alias guard、offscreen wait telemetry、活动worker生命周期。
控制性probe与CI通过后进入real retest准备态；Human与真实性能acceptance仍未完成。

Final offline gate: `npm run ci` PASS / 519 tests；controlled runtime, Office telemetry, worker idle-window and two-surface UI probes PASS. Ready for the next real test; no course run started after Product Owner's latest instruction.

## 8. DA-001 当前执行计划（入站 P2E-v0.3.0-2026-10-04-003）

当前 gate 覆盖历史继续真实课程指令。本轮不恢复历史 workflow、不启动 full course / cold-start。

1. PRD / TD：已回填 Scope、eligibility、效率、入口链路、职责与验收条件。
2. Triage profiles / schema / exact coverage / conservative routing / policy reuse、workflow / ledger / Task B scope：已实现。
3. PDF 可证明 decorative-vector false positive 已修复；未知绘制保持 Partial；5 个 targeted parser tests PASS。
4. deterministic regression PASS；新增 Triage 8 tests、workflow 当前 34 tests，包含 policy invalidation、teaching inventory/no render、B catalog、batch checkpoint recovery。
5. 已保存真实 117 profiles real-model evaluation 完成：59 PRODUCT_RELEVANT / 48 TEACHING_ONLY / 10 UNCERTAIN；0 HIGH TEACHING_ONLY，全部 117 Sources / 19 附件仍进入下游。无效率收益结论。
6. `npm run ci` PASS，537 tests（515 extension / 20 backend / 2 contracts）；QA reload 与当前 NTU tabs refresh 结果记录于现有 E2P；未运行 workflow。
7. 明确 manifest 加已授权 17 scope gaps 定点出站；实际 copy / unchanged / conflict 状态只在现有 E2P 记录。私有真实原文 / profiles / reasoning 不同步。
8. 停止于 Product scope gate；不 full course、不 cold-start、不 commit / push / tag / release。

## 9. P2E-v0.3.0-2026-10-05-005 当前 targeted gate

本节覆盖 §8 旧 HIGH-confidence 结果与后续运行指令；产品语义由最新 PRD / DA-001 明确批准，工程不改 Product 文件或 IA。

1. 指定 3 Product 文件入站已同步；HEAD 未变，无其他 Drive → Local 覆盖。
2. 19 附件 exact manifest 已建立；已登录 QA session 定点 Fetch，19 原内容 hash 全匹配；仅 private cache，无 Discovery / workflow。
3. Parser-only real measurement 完成：19 附件 / 880 native units；876→852 gaps，24 native-complete；locator / native text 全守恒。
4. 两级 Coarse / Deep 与 Safe-to-Skip schema/routing/reuse 已实现。Coarse 不 skip，confidence 不参与 routing。
5. targeted regression：Triage 9 / workflow 35 / PDF 5 tests；含 Deep checkpoint interrupted persistence，不重跑任一 pass。
6. `npm run ci` PASS，539 tests（517 extension / 20 backend / 2 contracts）；QA reload + NTU tab refresh 完成，active workflow 0。
7. 已启动的 Revised Triage-only evaluation 在暂停消息前返回；语义审查、所有 skip profile/反例验证和新 scope projection 尚未完成。原 job/ledger/output 私有保留；不继续调用、分析验收或重跑。
8. 更新现有 Engineering Report / E2P，精确 outbound manifest 同步，冲突停止，不共享原文件/URL/真实 prose/完整 output。
9. 当前最新 Product Owner 指令：只 checkpoint/outbound sync，停于 Product Direction Review，等待新 Handoff；不 full course、不 cold-start、不最终验收或 Git 发布。

## 10. P2E-v0.3.0-2026-10-05-006 — DA-002 targeted gate

1. 最新指定 3 Product 文件定点入站，DA-002 覆盖旧 Source-level routing；其余 dirty / private / workflow保留。
2. 设计 complete lightweight index、稳定 refs、expansion/termination、visual intent gating、checkpoint/invalidation/ledger。
3. 实现共享 Planner core与 deterministic regression；无 Local semantic labels，无 fixed first-N/round/timeout/refs cap。
4. 已保存 117 Sources / 880 units + 19 private cache，仅授权 Planner真调用；不 Task A/B/C、实际 Vision 或 workflow。
5. 逐轮记录 refs/native expansion/usage/latency，852 gaps 分类projection，六份已知Lecture-context及明确产品 Source recall；未展开 evidence审查。命中 Product stop gate即保留证据返回。
6. 本地最小生产路径已收敛到唯一 DA-002 routing 与 per-Source Task A / evidence / checkpoint 复用；旧 Triage 仅 compatibility/QA。合成回归通过不替代真实 Planner gate。
7. 完整CI、QA reload/tab refresh；既有Report/E2P + 实际manifest定点出站，最后停Product Scope Review，不发布。

当前 gate 状态：Index/ref/protocol/生产集成与定向合成回归完成；真实 Planner final scope 尚未通过（初版终态含义缺陷、后续协议校验失败、最后 schema failure 后一次 network failure）。已保存 native acquisition 可复用，不新增模型调用，不启动课程测试。852 gaps 最终分区、Task A/Vision reduction 与完整最终 recall 尚不可提交为 PASS，停于 Product Scope Review。

## 11. P2E-v0.3.0-2026-10-05-007 当前 gate

1. 只同步 incoming Handoff；DA-002 / PRD 不作新的 Product 修改。
2. v4 分开 acquisition、read-confirmed selection 与 read/selected/unresolved visual request；exact dedup，无 per-Source classification envelope，无新容量限制。
3. Offline replay 三类真实旧输出 + 223 native expansion conservation PASS；14 Planner / 34 workflow deterministic regression PASS；完整 CI PASS 后加载 QA bundle并刷新 NTU tab。
4. 仅一条 authorized continuation，从既有 223 refs 继续，不 clean Planner、Discovery、Fetch或parser重跑；允许该逻辑 continuation 内按既有机制 repair/精确展开。
5. accepted COMPLETE 后检验 24 known Lecture-context locators、4 native dueDate assignment Sources及明确产品cases，区分 acquisition/final selection；known miss即停止。
6. 记录 final scope/projection、新增 acquisition/calls/usage/latency、uncertainty/remaining risk，与历史 Triage非同条件对照；不宣称 clean speedup。
7. 定点 outbound、E2P和Report收口，停Product Scope Gate；本轮不 full course / cold-start / 真实 Task A/B/C / Vision / commit / push / tag / release。

P2E-007 observed result：offline replay PASS；一次continuation COMPLETE（101.153s、1logical/1physical、0repair/failure）；200 selectedRefs / 60 Source primary packages / 153 native units；852 gap=719 unselected +133 native-sufficient +0 visual。24/24 known locators、4/4 nativeDueDate Source、16assignment/7announcement final selection PASS。8个selected Source的explicit uncertainty保留Partial；不是完整课程理解PASS。停READY FOR PRODUCT SCOPE REVIEW，等待clean rerun授权，不自行启动。

## 12. P2E-009 / P2E-008 known large-course clean Rebuild

1. 009单文件定点入站；PRD/DA-002方向不变，无新Product功能或Clean UI。
2. QA-only隔离、Planner/A/B/generic reuse审计回归与完整CI PASS；当前workflow恢复允许成功结果复用，历史workflow/cache不删除。
3. 新workflow wf_5f0d9ef90ce350d03c0db29a 已真实启动；117 Sources/19附件/880 units/852 gaps，Fetch0失败，全Index170249 bytes。
4. 首Planner协议失败现场保留；aggregate diagnostics + prompt/5与objective acquisition recovery完成，定向regression及完整CI562 tests PASS；同workflow恢复159refs，未再次Discovery/Fetch。
5. 继续Planner→as-needed视觉→Task A→SWC→Task B→Rebuilt Preview；known miss/Partial虚假Complete/trusted改变/不可恢复失败即停止，不连续另开workflow。
6. 不Task C、不Use/Keep，不第二课程、不commit/push/tag/release；结果/成本/coverage/preview边界写入Report，明确manifest出站后等待Human/Product大课程验收。

P2E-008最终：known locators12/24 FAIL（10前轮已选终态移除、2此前未选），workflow QA_KNOWN_RECALL_MISS停止。真实peak13并发/37A成功结果保留，未B/Preview。fresh parser18Partial中9被历史visualCoverageHash提升ok，strict clean隔离未通过。Report§13.3为事实源；不恢复或新开测试，等待Product Side后续Handoff。

## 13. P2E-010 targeted repair 与第二次 clean Rebuild

已实现 cumulative add/remove Planner protocol、同 workflow continuity recovery、acceptance coverage-clean 与历史 audit preservation、派发前 QA recall assertion；旧失败 workflow 不恢复。先做真实 saved rounds offline replay、9 affected coverage records replay、synthetic correction / recovery / fresh Partial / same-workflow visual success regression、Task A saved-failure diagnosis及 full CI。之后仅执行一次 independent real Planner validation；不 Discovery/Fetch/parse/Task A/B/C/Vision，objective acquisition 可复用，selection 初始为空。

只有 targeted real COMPLETE 满足 24/24 locators、4/4 dueDates、16/16 assignments、7/7 announcements 且其他 Gates PASS，才直接启动第二个新 semantic + coverage-clean known-course Rebuild。真实 Discovery/Fetch，禁止历史 Task A cache shortcuts；到 Rebuilt Preview STOP，不 Use/Keep/C/cold-start/commit/push/tag/release。任何 Gate FAIL 则停止，不再次开 targeted/full workflow 追求较好结果。最终结果见 Engineering Report 下一节。

本轮执行结果：offline / clean coverage / semantic isolation regressions与568-test CI PASS；唯一targeted real Planner completed但known recall22/24 FAIL。因此第二次full Rebuild启动Gate未满足，未启动。保留现场、完成outbound checkpoint后等待新的Product Handoff，不追加真实probe。

## 14. P2E-011 Coverage Audit 完成 Gate

- [x] 独立 Audit task、完整未读分区、精确范围核算及 uncertainty → request 验证。
- [x] Primary COMPLETE → Audit → exact expansion → Primary update 的 evidence-progress loop；没有新增固定轮数或容量上限。
- [x] workflow checkpoint proof、同 workflow Primary / Auditor acquisition 恢复和旧 proof 失效。
- [x] 原 22/24 payload 的 accounting fault replay：两处 Ref 留在 unread；遗漏声明必须失败，未自动补选。
- [x] 完整 CI 与 release / QA bundle 分离检查。
- [x] 唯一一次定点真实验证已执行：initial Audit request 找到两处，但 41 个已读 Ref 被范围覆盖、repair 被历史 300s 截止中断；最终 recall / cost 未成立，isolation PASS。
- [x] Gate FAIL 已按要求停止并保留 evidence；第二次 semantic-clean Rebuild 未启动，无额外 probe / full run。

## P2E-012：DA-003 / active limit cleanup checkpoint

- [x] complete native Index / exact N/N Routing contract 与 selective Source grouping。
- [x] production workflow 退出 Planner / Auditor；保留历史 test-only / QA compatibility。
- [x] Task A native-first / explicit exact visual evidence-progress loop。
- [x] immutable package cache fingerprint；成功结果 recovery regression。
- [x] 300s absolute provider deadline 和若干 parser / fetch / Office / visual 固定容量窗移除。
- [ ] remaining active unverified retry / lifecycle / adaptive-policy 数值完成治理。需要 Product recovery tradeoff，见 Report §16。
- [ ] 唯一 targeted real Routing validation。尚未派发；Stop gate 优先于模型授权。
- [ ] 真实 N/N、24/24 + 4/4 + 16/16 + 7/7 recall、SKIP evidence audit、成本与 scope projection。不得写作 PASS。
- [x] 无 full course / 第二次 clean Rebuild / cold-start / commit / push / tag / release。

本轮状态为 Product Scope Review checkpoint，不是最终实现或真实验收完成。

## P2E-013：DA-004 / Routing gate收口

- [x] automatic model repair / fresh retry / extra Source recovery / fixed attempts/backoff退出付费路径。
- [x] explicit user Retry复用成功结果，未设人工次数上限。
- [x] session startup reconciliation、atomic claim、stale state/draft write保护。
- [x] active main workflow hard arbitrary capacity / correctness / paid redispatch限制退出；AIMD/watch仅UNVALIDATED TUNING。
- [x] decompression明确不进入本次Routing path；isolated incremental/cancellable worker为full-run前blocker plan。
- [x] deterministic gates与完整CI（587 tests）PASS后消费唯一一次P2E-012授权。
- [x] 978/978、24/24、4/4、16/16、7/7、isolation PASS；零SKIP，sample audit不适用。
- [x] 100% expanded/uncertain scope如实记录，停止Product Scope Review。
- [ ] Product确认全量deep-read scope / cost方向，处理decompression与QA observer风险；本轮不做clean Rebuild。

P2E-012的retry Product blocker已由DA-004解决；整轮真实course acceptance仍未完成。

## P2E-014 / DA-005 execution checkpoint

- Replace production per-unit routing with Source-only teaching classification after complete local parse.
- Preserve Index/coverage/identity/provenance and validate exact classification Source coverage.
- Exercise conservative UNCERTAIN, Deferred isolation, profile/policy invalidation, semantic-clean isolation,
  and successful-classifier reuse after interrupted checkpoint persistence with deterministic tests.
- Run complete CI and reload QA extension plus all existing NTU Learn tabs.
- Consume exactly one targeted classification evaluation on the existing real 117-Source inventory;
  do not Discovery/Fetch/parse or invoke Task A/B/C/Vision/new workflow.
- Record classification, retained inventory, cost/usage and state-isolation evidence, then stop at
  Product Scope Review. Known-course clean Rebuild/cold-start/release remain unauthorized this round.
- Keep OOXML isolation and long-stream observer growth risks visible before any later full-run approval.

## P2E-015 execution checkpoint

1. Close dedicated OOXML-worker and coalesced Activity blockers with synthetic deterministic and real-browser probes, without provider calls.
2. Run classification/recovery/semantic-clean isolation regressions and full CI. Preserve historical workflows and trusted state.
3. Consume exactly one DA-005 semantic-clean known-course Rebuild after gates pass; do not reuse private attachment cache or semantic results from another workflow. The retired 24-locator routing acceptance oracle is not a DA-005 gate.
4. Record every file/attachment classification in the Source Manifest, accounting, timing and Preview provenance. Stop at waiting-review; no Use/Keep mutation, Task C, release action or second full run.

### P2E-020 DA-006 continuation

已实现 settled Rebuild 的零模型 partial/downstream-ready 迁移：独立成功checkpoint验证、current-owner claim、保留失败/identity/native coverage、Task B成功Evidence/catalog范围过滤及独立unresolved manifest、Preview metadata。真实快照native-IDB隔离probe确认107上下文/2unresolved，trusted/history守恒；schema compatibility helper只接受唯一机械alias，当前完整失败payload缺失故repair0。CI622tests通过后消费本轮已授权same-workflow Task B；本轮不得再次Task A paid Retry、Task C、Use/Keep或新workflow。真实Task B/Preview结果另由Engineering Report记录，不把隔离probe当真实验收。

Multi-Source physical batching仍需在当前Preview后实施并通过17项零模型Gate及109-source packing simulation；本段不把未实现能力勾选完成。

P2E-020真实续行消费1次Task B正常调用，因unprovided Evidence IDs与missing excerpt被contract拒绝，未到Preview。当前无法形成合法Task B partial-result envelope，按§6STOP Product Review；没有再次调用Task A/B、没有batching实现/激活或新课程测试。完整private失败输出已保存，供后续零模型contract/input审查，不把候选修成已接受语义。

## P2E-021 / P2E-023 Task B grounding hardening checkpoint（未消费 recovery）

本轮以 P2E-v0.3.0-2026-10-06-023 / READY 为最新授权。仅 Inbox 定点入站；021 Product 语义继续有效。没有执行真实模型调用，也没有改动 current workflow 或 trusted state。

已实现但尚未部署到 QA extension：Task B schema2 显式 Evidence registry / reversible compact aliases、6类 item / input identity / dependency validation、independent sibling durable checkpoint、progress-driven Evidence expansion（无固定 round 上限）、一次 recovery durable dispatch fence 与零付费 checkpoint resume。旧 hallucinated output 只保留 diagnostic，未修引用、补 excerpt 或接受其语义。Activity reasoning/output 完整私有 buffer 独立于按实测 viewport 的 DOM projection。当前 Task B recovery serializer 省略可选 max_tokens；撤销393216数值改动，没有新增容量数字。Recovery fingerprint 不再复用旧schema1/prompt2 fingerprint，compatibility flag 进入新 fingerprint，legacy Task A fingerprint 保持原口径。

零模型证据：真实快照的隔离 native-IDB + cloned KV probe（不是实际 Chrome.storage IPC），107 successful contexts / 2 unresolved / 239 Evidence；synthetic verified sibling 与 invalid sibling 分开 checkpoint，重复 expansion no-progress 停止，storage fault 后保留已写 raw/result 与 checkpoint，重启恢复不再付费。已有 pressure probe 保留153850 reasoning /154480 output chars，DOM每channel只显示410chars、1Text node；约9.3/0.6ms是该probe观测，不能作为容量边界。最终 npm run ci PASS：630 tests（2 contracts /608 extension /20 backend），含构建隔离和secret扫描。

**Anti-cap Gate NOT PASS，不能把上述 grounding PASS 解释成全部 preflight PASS。** 当前48MiB inline request helper仍应用于text-only B，拒绝后没有自动continuation；finish_reason=length仍使本次completion失败，无法checkpoint完整prefix item及继续pending工作。两条路径见 ACTIVE-LIMIT-INVENTORY.json，不通过换数字修复。当前schema2只能证明已返回items的provenance和dependency correctness，不能证明未返回的draft/source工作已经完成。全部Source IDs出现在context也不能证明semantic completeness。

最小跨请求闭合设计仍需解决：显式输入工作身份/processed与pending状态；完整item前缀checkpoint（不补残缺JSON语义）；同一logical attempt自动continuation及exact新增Evidence；跨partition dependency unresolved直到闭包成立；只有所有输入工作被明确处理/Unresolved才关闭logical attempt。反例：Source A/B看似独立，但C决定两者是否同一assessment；按字节先拆A/B并接受canonical identity将改变Product Same/Different语义。不能用Local聚类、固定Nitems、覆盖率猜测或“当前course装得下”绕过。此处停在 prepaid anti-cap continuation contract review，尚未形成跨physical request的全局judgment/completeness闭合证据；不宣称架构冲突已经获得Product裁决，不把实现缺口伪装成新增限制获准。

真实只读 before/after：16表与staging全部hash一致，workflow wf_3ee80256bee2d6d2fb0e805c 仍failed/task-b，provider0；117 Sources /19附件 /880 native units /852 gaps及107/2 Task A状态保留。未消耗唯一recovery wave，未生成新Preview，没有Task A/classification/Discovery/Fetch/parse/Vision/C、新workflow、cold-start、Use/Keep、commit/push/tag/release。Task A physical batching继续pending。没有reload未通过全部Gate的bundle；当前QA仍运行020版。Private原文/附件/raw output/.tmp/profile不出站。

## P2E-024 当前执行 checkpoint

- [x] Native durable logical ledger：全部 input refs accounting、physical owner/session/paid fence、Task A baseline 和 exact raw checkpoint。
- [x] Text-only request exclusion、真实 pre-generation refusal 动态技术 partition；reconciliation 同样可 partition。
- [x] Provider length 的完整候选 prefix checkpoint / 同 attempt pending continuation；不补截断 item，不早 canonicalize。
- [x] 全局 scope/dispositions/dependency/retirement closure；invalid siblings 隔离；unknown Evidence 拒绝；新 Evidence exact resolve / no-progress 停止。
- [x] Native IDB new-session restart/raw reuse、storage-fault 注入、actual staging IPC、trusted/history/Source/Task A conservation。
- [x] 多 physical stream 私有完整 archive 与 measured DOM projection、shipping/QA build separation。
- [x] 全部15项 zero-model gates 与 `npm run ci`：643 tests PASS。证据见 `artifacts/v0.3.0/task-b-024/GATE-SUMMARY.json`；不声称 synthetic 是真实 Provider 性能。
- [x] Gates 后已自动启动原有唯一 corrected Task B logical recovery，same workflow；不新增授权、不重跑 Task A。
- [x] 唯一真实 logical attempt：1physical call，schema拒绝，160refs明确Unresolved/pending0，degraded Partial Preview不可采用；STOP Product Review，无freshRetry。
- [ ] Task A multi-Source physical batching：继续保留 implementation gap，不能以本轮 B gates 宣称完成；Preview STOP 优先。

当前禁止 Task A/classification/Discovery/Fetch/parse/Vision/C、new workflow、cold-start、Use/Keep、commit/push/tag/release。没有新增 capacity/timeout/memory/concurrency 数字；Provider transport 不确定时 paid-unverified STOP。

最终收口：644 CI tests PASS；修复established=false时Rebuild被initial-course分支提前返回的projection blocker，actual RBL-03显示Partial/provisional、canAdopt:false、Use不可用。Native16表及staging在final reload前后保持hash一致，刷新1个NTU tab，provider0；没有再付费测试。

## P2E-025｜Gate A 收口覆盖 P2E-024 pending

- [x] Central canonical schema registry 与观察到的唯一 alias：schema-only deterministic repair，完整 validator 仍执行；无 enum/语义猜测。
- [x] Saved B exact raw 零成本复验：实际 production engine 更新同一 workflow 的 checkpoint/staging；5 verified items、2 canonical proposals、63 processed /97 Unresolved /0 pending；没有第二次 Provider recovery。
- [x] Task A logical Source / multi-Source physical batching；实测输入 packing，无固定 N Sources / total requests / rounds / tokens / timeout / memory 上限。
- [x] Native durable owner/session ledger、原请求 restart、独立 Source checkpoint/failure、model-authored stateless fragment context、length complete-prefix / pending continuation。
- [x] 109-Source Chrome isolated native IDB gate：20 injected physical requests /2 Main waves /peak10，109 logical checkpoints、restart additional dispatch0；原 Source inventory、880 native units /852 visual-gap units 不变。
- [x] 混合大小、单 Source oversized、缺失中间 context、失败 sibling、unknown output、ambiguous-paid、post-dispatch storage fault /不同 restart packing、成功 checkpoint reuse 的 deterministic regressions。
- [x] Generalized A/B/C closure audit；新正常 B schema2路径、initial unreviewed baseline 原子替换与 trusted/user/session guards；classification ambiguity 不继续派发、C失败不冒充 Review完成。
- [x] Actual Partial Rebuilt Preview：verified B5、provisional false、cross-source incomplete、canAdopt false；Use禁用、Keep未点击。Trusted/history/Source/coverage/raw reasoning 与历史 workflows 守恒。
- [ ] Gate B real Provider throughput / known-course clean / cold-start：本轮未授权、未执行，不能用上述 injected PASS 代替。

详细证据在 `artifacts/v0.3.0/gate-a-025/`；真实原文、19附件 private cache、完整 saved raw 与 private snapshots 留本机。Gate A 结束后统一 Product Review，不 commit / push / tag / release。

## P2E-027｜Gate B 执行与边界

B1 为独立 semantic-clean Rebuild；B2 为未有 workflow/AI/Source 的普通多类型课程 Initial Scan。两者的 workflow/runtime/cost 分开冻结，不采用 trusted state。真实失败先保存现场，普通工程 blocker 按定点回归与完整 CI 处理。Discovery 失败不能 fallback 旧 inventory；Initial partial A 的成功 checkpoint 必须进入 B。授权的一次 B2 known-response safe recovery 使用新逻辑 identity，原 ledger 与 A 结果守恒。

Gate A 已接受，不重新进行 Product Planning。B1 新 Discovery 与历史 inventory 存在真实差异，因此本轮不能将 historical inventory 的 117 Source 守恒宣称为 fresh Discovery PASS，也不以第三个全课程 workflow 补救。Repeated canonical-zero 与 coverage 缺口必须计入 Gate B 结果。Unchanged Manual Check 需真实 unchanged premise；当前 read-only Discovery 发现变化，不制造 premise 或强制 trusted establishment。完成后停 Product Review，无 Gate C / commit / push / tag / release。

### Gate B 实际结果：FAIL，返回 Product Review

- B1 到达 Partial Rebuilt Preview，但新 Discovery 记录缺失两个 Source：处理的历史集合为 117 Sources / 19 attachments，而随后 fresh read-only Discovery 为 119 Sources / 20 attachments / 121 pages / 0 issues。不得把旧集合守恒计为 fresh coverage PASS，也不得启动第三次 full workflow。
- B2 从 cold start 到达 Initial Review；新发现的 workflow 正常使用全部 55 个已成功 Task A Sources 与 151 条 Evidence。唯一获准的 Task B safe recovery 后仍是 79 required refs / 9 processed / 70 explicit Unresolved，canonical proposals 0、identity resolutions 0；18 dependency-cycle、6 field-shape、2 dependency-unresolved failures。满足“重复 canonical=0 即 Gate B FAIL”的产品门槛，不继续模型调用或课程重跑。
- 真实 Task A Main batching 已验证：B1 为 20 个 Main physical requests 覆盖 104 个 logical Sources，每 request 2–6 个 Source；B2 为 20 个 Main requests 覆盖 58 个 logical Sources，每 request 1–4 个 Source。两门课观测模型请求 peak 均为 10。Recovery 只重派失败项，不据此宣称未观察的 browser interruption recovery 已通过。
- 发现 durable Evidence 主键跨课程冲突并在 Gate 内完成精确 provenance repair。恢复前保存的 6 个旧 workflow 均保持不变；修复后 MA6081 的 123 条基线 Evidence 完全恢复，B1 staged 549 / B2 native 163 个引用均无 source/locator 错配。无事实值改写、Provider 调用或 trusted establishment。
- B1 独立冻结 DeepSeek usage：Peak 0 / Off-peak 51 calls，估算 USD 0.629406858；B2 最终累计冻结：Peak 0 / Off-peak 55 calls，估算 USD 0.596165634。合计 106 calls / USD 1.225572492。详细 peak/off-peak token、阶段和调用明细分别保存在 B1、B2 final 与 combined JSON；reasoning 不重复计费。

因此 Gate B 不满足 completion criteria 1、5；真实 unchanged Manual Check 因课程状态已变化而 `NOT_RUN_NOT_UNCHANGED`。Activity、Preview/Review 和成本数据已记录；没有 Confirm / Keep / Use、commit / push / tag / release。等待 Product Review 决定后续方向。

最终验证：完整 `npm run ci` PASS，666 tests（contracts 2、extension 644、backend 20）；QA extension reload、1 个 NTU Learn tab refresh、content-script bridge PASS，provider in-flight 0。Bridge 验证使用 contracts 中实际的 `contractVersion=1`。

## P2E-028｜Gate B-R

1. [x] Single-file inbox sync / READY verified; immutable Gate B evidence preserved.
2. [x] Saved B1/B2 root-cause matrix and complete recovery replay, independent closure remediation / typed failure diagnostics / prompt contract.
3. [x] Targeted dependency/uncertain/grounding/identity collision regressions; isolated 55-Source real snapshot validation attempt and state conservation.
4. [x] Full zero-model CI/gates PASS (669 tests); one B2 Task B validation with fresh official pricing / frozen usage. **R1 FAIL: canonical=0/identity=0; no further paid work.**
5. [ ] **NOT RUN / prohibited by R1 FAIL**: B1 Discovery/delta/Task B validation.
6. [x] Final evidence / CI (669 tests PASS) / 30-file conflict-protected scoped outbound sync / STOP Product Review; no Confirm/Use/Keep/commit/push/tag/release. Prefix alias correction remains zero-model only; no extra paid attempt.
