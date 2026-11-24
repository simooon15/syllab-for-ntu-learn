> 当前 P2E-056 / 2026-10-12：RC1 Human Gate 5 FAIL 后的 RC2 整改仍在进行。同类型整课付费审计已暂停，384k reasoning 风险控制与零付费回归见本文末尾 checkpoint 及 Technical Design；RC2 尚未取得完整语义认证或 Human 验收，不发布。下文 RC1 ready 与旧费用均为历史。

> 当前 P2E-054 / 2026-10-11：最终 RC1 工程验收及唯一未确认 Human 入口已准备；详细结果、费用、通用性检查和限制见 artifacts/v0.3.0/goal-driven-054/RESULT.md。Human Gate 5 尚未通过；下文其他停止点和 PASS 是历史。

> 历史 P2E-053 / 2026-10-10：选择性阅读 + immutable CourseDraft 已接入生产新工作流，旧 native-global 按原版本恢复。全量 CI 878 tests 与隔离 Review 传递验证通过；真实 DeepSeek 18 次已知调用约 ¥1.08370752，第二初查计划 24 DEEP / 93 INSPECTED、160 整单元，已读 10 来源 / 306 Clause。完整真实 Link、真实增量和 Human Final Acceptance 尚未通过。原 UNKNOWN ¥5.572864 保留，原累计 ¥25 与新增调用 ¥7 双边界阻止下一派发；未重扫或采纳原正式成果。最新事实以 [P2E-053 实施记录](../../../artifacts/v0.3.0/goal-driven-053/RESULT.md) 为准；下文旧方案与旧 PASS 均为历史。


> 历史 P2E-052 / 2026-10-10：工程成果已整合，语义验收未完成，STOP_CNY_BUDGET_RESERVATION_BOUNDARY。当前实现、测试、失败、费用与恢复事实以 [P2E-052 工程收口记录](../../../artifacts/v0.3.0/goal-driven-052/RESULT.md) 为准；下文保留历史记录，历史 PASS 不代表当前最终验收。完整 B 与精简 C 分离；条款多引用必须逐条原文解码，禁止标题别名吞掉完整动作；用户修改来源保护与新字段显式接受路径已加入。v9 尚无真实模型通过。

# Syllab for NTU Learn — Engineering Report v0.3.0

## P2E-050｜目标驱动隔离候选（2026-10-10）

当前状态 **ZERO_PAID_CANDIDATE_PREPARED / WAIT_NEW_PAID_AUTHORIZATION / GOAL_NOT_ACHIEVED**。已实现完整原生输入、严格来源/关系校验、持久恢复、纯候选 materialization、预算/CLI 适配器，并通过隔离 CI 817 tests。生产入口和正式 workflow 未接入新候选；新增付费 0 次，真实语义与跨课程能力未验证。不是最终架构选择或 Product Acceptance。详见 [本轮工程记录](GOAL_DRIVEN_SEMANTIC_ENGINEERING_v0.3.0.md)；后面的历史已实现方案保留，不强制成为 P2E-050 的技术路线。


## Semantic-046｜系统性工程交付；真实语义仍 FAIL（2026-10-09）

正式入站 P2E-v0.3.0-2026-10-09-046 / READY，出站 E2P-v0.3.0-2026-10-09-035。状态 **ENGINEERING_DELIVERY_READY / SEMANTIC_QUALITY_FAIL / REAL_MODEL_REVALIDATION_REQUIRED / STOP_PRODUCT_REVIEW_ENGINEERING_DELIVERY**。本节是当前工程事实；后面的 045/历史记录保留，但不代表本轮验收。原 HEAD `26426a3793250aea351c443e3327ccdb1b95b697` 未改，既有无关 dirty state 未清理。

完成系统修复、五次封顶定向真实调用、多轮内部回归、未修改响应回放、Review、最终 CI、候选打包和原 QA bundle 激活。没有逐 Patch 返回审批。**没有全课程 Final Acceptance，没有正式 release，也没有当前全链路真实语义 PASS。**

### 实现与根因

1. B1 的重复 Evidence 输出挤占真实 65,536 completion 上限。新 `assessment-relevance/4` / session `/8` 用精确 Evidence 字典引用，Local 只解引用原 Source/locator/excerpt 字节，再做 provenance 校验；保留原响应，拒绝未知/装饰引用，不修正文案、语义或错误 Source。15 Draft /11 Source 完整工作量不删减。新真实 B1 FINAL 使用 48,499 completion，stop，15 个处置、3 个 Group、51 个含发现单元路由闭合；这是一个定向严格 FINAL，不能外推可靠率或全课程相关性正确。
2. B2 在单个清单 ID 内合并义务、禁止、许可、条件与例外。生产通路拆为独立 AI facet inventory 与固定 Group synthesis，两个 durable session 共用原 Group 最多4有效语义轮，不能变成各4轮。分解阶段未解决事项机械保留到聚合和 C 的 partialCoverage；每个 facet 必须有真实输出去向或明确处置，Local 不判断自然语言真值。
3. 真实响应暴露 Source 源身份与引用不一致、enum 缺失、多目标证据关联和 View 数据丢失。Prompt 共用合法发现 kind；跨来源 facet 允许引用其他已准入 Source，但自身 sourceId 必须匹配至少一个真实引文。旧错误输出仍拒绝，不改 Source/enum。新 /4 的一个 facet 可指向多个相关且各有 native support 的节点，至少一个目标必须保留该 facet 的逐字原引文；旧 /3 保留逐目标检查。并未放宽 source/locator/原文校验。单个 UNCERTAIN 候选值原先被 View 的 >1 过滤，现机械传给既有候选组件；保留 UNCERTAIN，不替用户选值，不新增控件类型、文案或 Review 行为。
4. 进一步原文审计发现**父清单本身漏了 native 条款**。最终候选改为 `syllab.ai.semantic-facets/2`：向分解阶段递交全部准入 Group 范围的原生单元字节；nativeAudit 逐 Source/locator 记录 EXAMINED/UNRESOLVED、原引文与 facet IDs；缺失/重复范围、未知引用、未渲染 Partial 假装完整均拒绝。没有父清单项的原生发现可用 parentUnitId:null，仍受固定 Group authority、native provenance 和后续逐 facet 处置约束；不创建新 Assessment 或 B2 course Rule。实际6来源范围91 locators、68,842原生字符，最终输入编码280,390 bytes（仅容量测量，不是新模型成功证明）。
5. Facet 与先前 requirement 仍是 AI 假设；原始 Source 的规范力度才是意义依据。最终指令要求再次核查邀请/许可/建议/义务，不能继承旧 requirement 标签增强力度。不做关键词强制归类或 Local 生成内容。/4 同时冻结实际 System Prompt fingerprint，Prompt/phase/共享预算漂移不能复用旧 FINAL。旧 /1、/2、/3 隔离；历史 facet/1 仅允许显式只读回放，不自动升级为 /2。

**第4、5项最终协议在额度耗尽后完成零付费实现和验证，没有新的真实模型复验证据。不能把历史 facet/1 的 PASS 称为最终 nativeAudit/2 的真实 PASS。** 原生范围审计也不能独自证明每一句的语义都已正确理解；反例测试明确保留这一限制。

### 五次实际派发与未修改回放

| 次数 | 阶段 | 实际结果 |
| --- | --- | --- |
| 1 | B1 | 完整 stop，57,921 completion；发现 kind 使用非合同 enum，严格拒绝；原输出仍拒绝。 |
| 2 | B1 | 一个真实严格 FINAL PASS；48,499 completion；15 Draft 全处置，3 Groups，51单元路由；无 Rule candidates。 |
| 3 | B2 facet/1 | 49父项/101 facets；3个 Source/evidence 主来源不一致，严格拒绝；不改来源。 |
| 4 | B2 facet/1 | 49父项/126 facets，原当时合同 PASS；有禁止与可选许可，但意义质量不能仅由 ID 数证明。 |
| 5 | B2 synthesis | 完整 stop，43,570 completion；原校验 TARGET_SUPPORT FAIL。修复 /4 多目标关联后，未修改文案/成员/原响应的零付费严格回放 PASS；22/22 Requirements 实际 Review DOM，38输出字段/要求。**内容审计仍 FAIL。** |

全部5/5 physical dispatch，失败及复验均计入，remaining dispatch=0；估算 **USD0.270598410**，未达USD1，但剩余费用不授权第6次。usage全部捕获，reasoning已包含completion，不双计；使用此前核验价格快照，估算不是发票。旧041/043/045账本不计入本轮、未复用余额。原请求、SSE、reasoning、session、原NTU资料在本机私有区，Drive 仅同步元数据/哈希和脱敏结果。

实际改进：禁止邮件提交与软副本保留均进入可见 Requirement；组长切换幻灯片保持可选 Fact，附录选择保持许可；完整16组时段、当前活动事实与 date ambiguity 保留。旧论文候选明确排除，历史试题留在整体 UNCERTAIN paper Group，不再直接声称当前独立问题作业。

**剩余确定语义失败：**原来源的自愿联系教师邀请，经父清单→facet/1 command→canonical Requirement 被强化为义务；引用/标准引用规范及有正当理由的期限疑问/assignment-book 程序路径，在 facet/1 与最终 proposal 中缺失。即使126/126处置、22/22渲染也不能认定内容完整。完整边界在 `artifacts/v0.3.0/semantic-046/{COVERAGE,MATRIX,RESULT,REPLAY}.json`。未局部补写原输出，未把失败隐藏为绿色。

B1 另有3条明确 recall/coverage issues：当前 quiz/current exam 未进入准入 A Draft 清单，旧试卷后续页仍不完整；需要定向 Source A 再理解，而不是 B1 伪造空成员 Group。Literature-review 的 CURRENT 适用性仍是另一个未闭合风险。17 Partial、2 Fetch failures、旧 failed Group、旧 Initial Review 保留。没有新的实际 course Rule 合并证明；真实 C **未运行**，两次 B1及两次 facet消耗了建议预留，预算内优先 B1/B2。旧 A 成功响应、Rule/重指派受控案例只是有限复用，不能冒称新版全课程 A→B1→B2→Review/C 成功。

### 工程验证、候选与守恒

最终 `npm run ci`：**794 tests PASS**（contracts2 / extension772 / backend20），format/build/strict types/lint/manifest/secret/build separation零失败。新增 Native discovery、完整原生输入、逐范围审计、Partial、许可/否定、legacy、Prompt漂移、共享B2预算、分段/捕获回放和 Check gap/receipt/原 trusted state 守恒测试。旧真实响应零付费回放不产生模型调用。

最终候选 `artifacts/v0.3.0/semantic-046/syllab-v0.3.0-semantic-046-candidate.zip`：31 entries，解包 App / Side Panel smoke PASS；SHA `4bdb2f8687113c859a1d48021a035796f728f3f91c399b0eea3795e1f2c9a215`。原 QA profile 重载对应最终 background，磁盘与加载字节 SHA 一致；已有NTU tabs=0，已检查。唯一 workflow `wf_ffd850a9f186233026338f6f`、22表、checkpoints、trusted/Review/账本精确守恒，JSON SHA `8c4221839f1a58d5bad6cc860bb276bb3e269eb20c29a2f577f6cc9882ffbed2`。原 Review 路由恢复到前台。没有新正式 workflow、全课 Scan、adoption/Confirm/Use/Keep、浏览器权限增加或 Git/release 操作。

当前原 live workflow **仍显示历史 Review**，不会把本轮私有定向模型候选写入正式数据冒充已修复。最终 nativeAudit/2、规范力度与遗漏修复需在新有效授权下定向真实验证，再补当前遗漏任务、真实 Rule/C及课程覆盖，才能判断是否可做最终产品验收。若模型在这套原生审计协议下仍反复加强邀请或遗漏条款，需要集中评估模型能力/分阶段策略；正式模型与成本边界由 Product/Human 决定，工程未擅自切换。

### 同步和协作成本

入站仅替换正式 inbox 一份，记录pre/Drive SHA并核验服务端P2E046；协议字节未变。出站只同步本轮 Manifest 中代码、测试、工程文档、脱敏证据与候选，逐文件 pre-state/conflict protection、既有正式 Markdown ID保持、服务端SHA回读；以 `SYNC_MANIFEST.json` / `SYNC_RECEIPT.json` 为完整清单与最终结果。未递归覆盖、--delete、上传 private 或清理无关dirty。模型窗口快照16→45%（5小时）、66→71%（周），绝对token用量工具未提供；不伪造session token或成本。完成整个工程域后，仅此一次集中出站 Gate。


## Semantic-045｜综合工程修复与封顶真实验证（P2E-045）

**结论：ENGINEERING_REMEDIATION_READY / REAL_MODEL_REVALIDATION_REQUIRED；定向 B2 语义完整性仍 FAIL。** 本轮连续完成工程诊断、A/B1/B2/C 数据通路、严格校验与恢复兼容修复、10 次真实物理调用、零付费回放、实际 Review DOM 和候选包。没有中途 Product Gate，也没有将失败结果变成验收通过。完整覆盖矩阵见 `artifacts/v0.3.0/semantic-045/MATRIX.json`。

### 根因、修复与同源风险

旧流程只验证最终节点合同，未要求 Source 中的潜在要求经过 B1 归属、B2 合成后逐项交代去向，因此看似合法的输出会丢失指令。新增 `assessment-relevance/3`、session Prompt `/7`：AI 先编写独立语义单元和逐 locator 阅读状态，再做身份/适用性、Group/Rule 路由和最终 KEEP/MERGE/EXCLUDE/UNCERTAIN 清单。零 Draft Source 的指令仍能路由；规则、部分阅读、不确定性和跨来源 Evidence 保留。B2 的清单引用真实字段/要求，不确定处置必须指向可见 UNCERTAIN 字段；C 收到当前对象对应清单，原 Partial/失败/未解决问题继续阻止不充分的移除推断。

Local 不做 NLP、年份过滤或新内容补写。校验只检查数据形状、引用、原文 provenance、目标存在与阅读/处置完整性；/1、/2 已存 session 保持旧政策，不静默升级。Policy/snapshot 不匹配拒绝复用。严格 enum、父子、identity、evidence alias 和 materializer 没有放宽。

实际发现并处理的工程问题包括 A Context 的错误对象类型、UNCERTAIN 字段缺清单引用、B1 空成员 Group/排除记录缺 supportingEvidence、真实响应格式/容量失败，以及 Evidence 长短引文的机械误拒绝。后者改为**同 Source、同 locator、原文字符直接包含**的范围兼容；不转义、不清洗、不改 payload、不接受 disjoint 原文。补有正反回归。原 10 次派发结果保留原始状态，未删除失败证据。

同时发现更深层问题：**清单齐全不代表复合语义齐全。** 第10次 B2 对 49 单元及旧11项均提供处置，但 PDF/Turnitin 要求只留下提交格式/渠道/截止，原“禁止邮件提交”没有写入目标内容，也未合理排除。新增通用的独立条件、禁令、例外、modality 分解与逐 facet 合并审计指令，未将该课程语句硬编码为规则。该最终 Prompt 改动发生在预算耗尽后，尚无新付费证明。Group leader 的“can”也提示 permission/Fact/Requirement 边界需继续核验，不能凭目标 ID 宣称完美语义覆盖。

### 真实调用与语义证据

Human 在当前会话补充 P2E-045 专属 **10 次 / USD1**；旧041/043不计入。实际10/10，全部 HTTP200、usage有据，失败及修复复验均计数，估算 **USD0.356525904**（冻结034已核验费率，不是账单；reasoning 已包含在 completion）。每次 fetch 前持久化 claim/ledger，并按 request UTF8 byte 上界＋advertised output 最大值预留费用；超过次数或保守费用界限拒绝派发，无自动免费重试。见 AUTHORIZATION/LEDGER/ACCOUNTING。

- A：真实展示指令、安排两份严格 PASS；音视频检查、提前报告冲突保留。受控重新指派旧试题＋课程规则＋不确定候选亦 PASS，但不是 NTU 当期真实任务证明。初次 Context 类型 FAIL；历史试卷未拆独立 Question，但 UNCERTAIN 日期引用缺失而严格 FAIL，修订后未复验。
- B1：真实15 Draft 前两次分别因空成员 Group、排除支持证据缺失拒绝；第三次定向11来源、保持原文的复验触及 provider 默认输出边界，finish_reason=length / 65536，拒绝截断 JSON。没有接受或修补这些 B1 输出。后续 Prompt 指示使用已有 progressive Registry 协议提交合法增量/carry，不截断 FINAL；新增真实完整 B1 未证明。
- B2：第8次正常 stop 但 JSON 缺分隔符而拒绝。第10次 JSON、严格基础合同有效，原始派发因长短引文匹配而拒绝。修复范围匹配后，对**未修改第10次响应**零付费回放通过 provenance/materializer/49处置引用，并将15条返回要求逐字及 Evidence 投影到实际 Review DOM。原始 completion SHA256 `c645d7466203c1f5f345b57720a8a542c99399a907112fd506840b42e54734b0`。这次复验复用041已验证 CURRENT Group 的6成员，**不是045新 B1 成功、全课程或正式 workflow 的闭环**。
- 旧11项要求均有目标处置；其中10项定向意义保留，PDF/Turnitin项遗漏禁令，故不能宣称11项语义闭合。逐项哈希/去向与边界在 COVERAGE.json，原文只留本地私有区。旧2025 startDate有模型 EXCLUDE理由，不再当 KNOWN；due 两冲突值保持 UNCERTAIN；项目标题登记的未访问链接保留可见 UNCERTAIN。
- C：新/旧政策回归及 /3 完整工程路径通过，按对象过滤清单；本次没有新的真实 C 调用。预算已耗尽，不补发。

### 验证、候选与守恒

最终 `npm run ci` **757 tests / 零失败**（contracts2＋extension735＋backend20）；其中24个清单合同回归和2个完整 /3 A→B1→B2→C/Initial 路径案例新增。重用有效旧证据，旧041/043响应不可篡改回放，不把旧8/11结果当新通过。构建、strict typecheck、lint、格式、manifest、secret scan、文档/README及 shipped/QA 分离均 PASS。

候选包 `artifacts/v0.3.0/semantic-045/syllab-v0.3.0-semantic-045-candidate.zip`，31项；解包后 App/Side Panel 实际渲染 PASS。最终 SHA 见 verification.json。原 QA profile 重载最终 bundle并验证 bytes/hash，原 Review 路由恢复；已开 NTU Learn tab 为0。原22表逐字 SHA `8c4221839f1a58d5bad6cc860bb276bb3e269eb20c29a2f577f6cc9882ffbed2`，与039一致。未扫描、未建第二正式 workflow、未 adoption/Confirm、未 commit/push/tag/release；17 Partial、2 Fetch失败、旧 failed Group仍存在，旧 Review未被重算。源码命名碰撞已恢复旧 `semantic-coverage.ts` 精确原 SHA，新增模块为 `assessment-coverage.ts`。

### 交付与后续整体范围

本轮交付是工程候选和完整证据，**不是 v0.3.0 Final Acceptance/Release**。仍需一次合并的全链路真实验证：逐 facet 语义守恒、B1 完整 closure/容量、缺任务的 A 回补、真实课程 Rule 汇总、permission/Fact 边界、复杂日期与真实 C；不能用局部禁止邮件补写代替系统闭合。若 Product 后续授权，可按一个封顶计划复用现有私有输入/响应，优先2次 B1 progressive closure＋2次 B2/facet验证＋1次 C，最多5次、预估上限USD1，失败/continuation均计数；这是**未来计划，未授权、未派发**。不额外请求本轮审批或突破本轮额度。

正式文档与源码按出站 Manifest 定点整文件回写，原 Markdown ID 保持；先检查 Drive pre-state，再回读校验，结果见 SYNC_RECEIPT。私有原文、SSE/reasoning、profile/key/cookie不上云。Product boundary保持锁定；当前唯一 Gate 为集中 Product Review。

---


## Semantic-043：一次真实 B2 复验，契约通过但要求语义仍不完整

入站 P2E-v0.3.0-2026-10-08-043 / READY；出站 E2P-v0.3.0-2026-10-09-033 / STOP_PRODUCT_REVIEW_TARGETED_B2_SEMANTIC_FAIL。新增 DeepSeek physical dispatch **1/1**，余量0，无 retry/schema repair dispatch/continuation，无 A/B1 重跑、NTU rescan 或新正式 workflow。复用041已通过B1的原 Group revision/6成员及完整原生 Source；输入 SHA 与041保存输入一致。实际 request 使用 b2-session/6、assessment-output/2 和现有模型参数，独立 attempt 为 validation-043:b2-real-20261009。

### 实际响应与验收结论

HTTP200、finish stop，单轮有效JSON。输出仍为当前真实展示任务，合法 enum assignment / role assessment，未 fallback 为 other；identityResolutions、structuralRelationships、Components均0。严格 schema、B2 upstream/成员、provenance与materializer全部通过，返回8条content requirements且每条有ID/Evidence。实际 View → Review assessmentBody DOM离线渲染证明8/8逐字可见、非空引用守恒及due两种冲突同时显示；不是写入原Review，也不是人工改写fixture。原模型仅存在已有canonicalEnvelope注册的 schema separator兼容，syllab.ai/task-b/1 → syllab.ai.task-b/1；除schema字符串外完成包output与result逐项完全相同，未改type/content/关系/语义。详见RESULT.json、REVIEW.json与PRIVATE_MANIFEST.json。

**不能判定定向B2语义PASS。** 原11条要求逐项记录COVERAGE.json：时长在timeLimit与req-timeLimit共同保留；到场、整堂参与、组号顺序、成员顺序、避免逐字朗读、项目批准、上传材料共8项有实际去向。音视频检查、提前报告冲突未在任何返回requirement/field/issue中保留或解释；旧PDF/Turnitin/禁止邮件提交要求同样没有输出，且没有对该页指令是否适用于此任务给出AI排除/不确定性理由。不能由本地擅自排除这3项，也不能把缺失补进真实响应。该结果是模型侧遗漏/适用性说明不足，而非content投影再次静默丢失；8条已返回内容完整保留。

25%权重有原依据；due_date保留2026 gradebook与2025 default的双值UNCERTAIN，未自动选值。旧2025 default_startdate本次不再输出为KNOWN，当前start_date缺省为既定Not Mentioned（无占位字段）；但模型没有显式说明它的当前适用性，**这一维度NOT_VERIFIED**，不能声称历史日期已语义解决。部分其他未知内容以unresolvedIssues保留。fieldConsolidationResults=[]为严格合同允许的形态，不能据此声称已有新的audit覆盖。literal provenance PASS只证明来源/定位/状态合规，不证明要求语义完整。

### 工程收口、费用与边界

本轮没有生产代码、Prompt、Product文档或UX修改，仅新增一次派发验证脚本及零付费真实投影脚本。DOM harness最初只找dueDate，与模型合法due_date不匹配；改用已有canonicalOutputFieldName读取后通过，未改模型/生产字段。独立ledger与wx claim/dispatch防重派；额外read/continuation直接拒绝，完整Prompt/SSE/completion/session/result/projection留本机ignored private，共享仅脱敏统计及哈希。

实际usage：prompt108070（cache hit0 / miss108070）、completion26246、total134316；reasoning17144已包含在completion，不重复计费。实际UTC为2026-10-08 16:27:18.742至16:29:13.010（SGT为10月9日）；按034冻结OFF_PEAK费率估算USD **0.0319581**，不是invoice或最新价格声明。041 5/5账本/成本文件SHA未变，039两笔ambiguous-paid未重新归类。详见LEDGER.json/ACCOUNTING.json。

npm run ci重新通过：731 tests及格式、build、strict typecheck、lint、manifest、secret扫描、文档/README/build隔离全部0失败；两个新脚本最终lint和真实DOM检查通过。原22表与039最终快照逐字一致（SHA 8c4221839f1a58d5bad6cc860bb276bb3e269eb20c29a2f577f6cc9882ffbed2），原workflow、profile、checkpoint、trusted state及旧Review未adopt/Confirm。生产源码未变，042候选与App/Side Panel加载证据继续有效，无需新包或无意义重载；CI仅重建相同源码产物。

下一轮若继续修复，应围绕**B2有据要求守恒与适用性处置**建立完整闭合方案：需要AI明确说明保留、合法合并、排除或不确定的Evidence去向，并让validator能机械核对这些AI给出的处置；不能以关键词、本地语义补值或强迫11条复制作为修复。旧日期适用性也需AI说明，而非本地年份过滤。本轮不新增Product字段/界面/contract或付费验证，集中提交本次失败证据供Product决定后续。既有17 Partial、2 Fetch failures、原failed Group与旧Initial Review仍在；这不是全课程Final Acceptance，也不发布。

Local→Drive按出站Manifest定点写回、预SHA冲突保护、完整文件替换及挂载回读。最终云端回读状态见semantic-043/verification.json；不以挂载SHA相同冒充server已完成。

## Semantic-042：全链路严格契约与零付费回放

入站 P2E-v0.3.0-2026-10-08-042；状态 ENGINEERING_REMEDIATION_READY / REAL_MODEL_REVALIDATION_REQUIRED。新增付费调用 0；041 的 5/5 不可重用。原 workflow 和 22 表保持不变，未 adoption、commit、push、tag 或 release。

根因是职责、wire shape、校验与投影缺少共同的闭合接口。新增 assessment-output/2，统一 Prompt 中的枚举/字段/requirement 结构、A 的来源与身份 context、B1 的父 Group/role、B2 的精确 upstream 和无 identity/structure 权限。新 workflow 使用 assessment-relevance/2 与 session prompt /6；旧 /1 session 保留原策略，checkpoint 依据语义版本隔离，不静默升级或重派调用。

修复包括：requirement content/ID/Evidence 与字段值严格检查，禁止 description 被静默忽略；free-text type 不再 fallback 为 other；consolidation audit 使用自己的 consolidatedState，与所属 proposal 的字段/值/冲突/Evidence 一致，并约束贡献 Draft 属于本 Group；provenance 不再把 audit 当普通字段，KNOWN/明确未知/requirement 的解释理由不能代替原 Evidence；缺引用、对象 scalar、重复 ID/字段、无效引用明确拒绝。materializer 保留值与证据并拒绝 unverified Evidence，visual 引用由实际 scoped rendering 资格传递，不信任模型自报 origin。

关联修复：declared dueDate/startDate/examDate wire-key 分别映射既有 due_date/start_date/exam_date（不猜日期、年份或适用性），防止日期落不到现有展示/calendar 接口；B1 父 Group 的 stable proposal ID 按真实 role 和 existing ID 绑定，嵌套 Component 不再指向不存在的 assessment_ 前缀；同名不同对象保留独立身份，缺父级/循环拒绝。Task C 校验后保留 currentValue/latestValue/relevantUserState 并校验 state/scalar，避免后续 materialization 丢值。Review UX/copy、Product PRD、identity 分工未改。

### 真实响应回放与证明边界

完整原 B2 字节保留；仅使用已有 canonicalEnvelope 注册的 schema 分隔符 compatibility（有原/新 hash），不删除违规字段、不改模型判断。整包仍以 B2_AUTHORITY 明确拒绝；6 条结构关系无权被收纳。11 个 description requirement 明确报 REQUIREMENT_CONTENT；group presentation 明确报 TYPE_ENUM，保护边界不再产生 0 requirements/other 的假成功。7 个 consolidation 节点的 literal provenance 可以校验，但新 audit contract 仍要求 owner、字段一致和贡献 refs，不能把 literal PASS 当语义 PASS。

独立、明确标注的 schema 诊断 fixture 使用原 11 条要求文本及 Evidence，显式填写 canonical content 和一个 synthetic enum（非模型分类）；原日期 fields 全部保留，旧 2025 startDate 适用性未被证明。此 fixture 在 strict materializer → 实际 View projection → 实际 Review assessmentBody DOM 中验证 11/11 要求逐字可见、Evidence 非空且日期冲突同时显示。不是接受或修好原模型响应，更不是下一次真实模型质量证明；fixture/raw/DOM 数据保留私有，本轮只同步脱敏统计。原响应不能在当前权限边界下整体成功投影，拒绝是正确工程结果。

### 验证、候选与后续

最终 CI 731 tests PASS（原 716 + 15 个新契约回归；既有 workflow integration 同步使用合法 /6 fixture，49 项通过）。覆盖严格拒绝、Evidence、state/conflict、requirements、同名独立对象、嵌套 Component、parent cycles、来源 context、缺字段与 Task C 值守恒。测试依赖 synthetic semantic verdict，不冒充 AI 判别质量。离线真实 replay 与浏览器 DOM 检查 PASS，详细记录见 semantic-042/REPLAY.json。

Extension package 与解压加载 App/Side Panel 通过，31 entries；候选 SHA/大小见 PACKAGE.json。原 QA profile 重载后实际加载 assessment-output/2，活跃 Provider 0；NTU tabs 0，无待刷新 tab。runtime.reload 后 Chrome 拒绝了未处于 Developer Mode 的 unpacked extension；在同一隔离 QA profile 启用开发者模式并通过已安装条目的 reload 恢复，未重建 profile、扩大 extension 权限或开新 workflow。最终 22 表与039保留快照逐字一致，041 ledger/accounting hash 未变。

仍未证明新 Prompt 的真实响应可靠性、全课程 completeness/read-on-demand；17 Partial、2 Fetch failures、旧 failed Group 与旧三项 Initial Review 没有被此次修改自动修正。最小后续验证建议为新授权 1 次 B2 physical dispatch，复用041真实 B1 Group/成员/原 Evidence，禁止自动 retry/continuation；检查合法 type/content、11要求是否语义完整、无结构越权、due/startDate 当前适用性及可见 Review 投影。若模型要求额外 read/transport continuation，此预算下只能停止并记录，不能自动第2次。A 新 context 契约/更广课程质量仍需后续真实验证计划；1次 B2 不能证明全链路 Final Acceptance。


## Semantic-041：5次真实调用完成，B2暴露全链路契约缺陷

**当前入站：** P2E-v0.3.0-2026-10-08-041。**当前状态：** STOP_PRODUCT_REVIEW_SYSTEMIC_ASSESSMENT_REMEDIATION_REQUIRED。按授权完成5/5 physical dispatch，余量0，不重用039额度。定向结果 **4 PASS / 1 FAIL**，不能进入最终产品合格验收。上一段040“等待付费授权”已被041替代；历史记录保留。

### 实际结果

A正例PASS：保留两项真正布置的任务，其中一项明确重新指定往年试题；不把教学例子或试题子题升级成新任务，日期/权重均有原文。A反例PASS：历史试卷、论文和教学例子未生成Assessment。A信息不足样例PASS：保留任务性质及同名身份Uncertain与理由，没有具体日期/权重；null EXPLICITLY_UNKNOWN与Not Mentioned边界仍需更全面检验。

B1真实保存证据PASS（15 drafts、四个原组的窄回放）：6个成员形成CURRENT小组展示；1个文献综述候选保留UNCERTAIN并列支持/反证；3道历史试题、3篇参考论文、2个教学资源draft有理由及Evidence地排除。15项disposition全部守恒，冲突日期保留。引用逐字/Source校验通过。本次为有限预算预先交付成员Source完整原文，其他Source提供目录；不是全课程验证或生产read-on-demand成功证明。

B2真实小组展示 **FAIL**：HTTP200、finish stop、JSON有效，真实任务和25%权重仍被识别，due冲突为UNCERTAIN。但是返回6个structuralRelationships，生产约定明确禁止B2新建身份/结构。继续零付费诊断还发现7个fieldConsolidationResults使用consolidatedState，泛化provenance遍历把任何fieldName对象都当state字段而拒绝；11个requirements全部使用description而materializer读取content，诊断投影为0个requirement；type='group presentation'被枚举fallback投影为other。旧2025 startDate还被声明KNOWN，需要核对对当前任务的适用性。原始输出被拒绝，未删除字段、改写结构或收纳到原Review。

### 系统性范围与接手要求

这不是可通过一次去字段、description替换或关键词过滤解决的单点错误。需要共同审计实际prompt中的A/B1/B2结构、schema/validator各节点类型、requirements与type枚举、Evidence/uncertainty投影，以及B1/B2结构关系职责；以真实响应建立“不静默丢requirement、不降级kind、不把metadata事实当当前任务事实”的守恒验证。A三次输出也均未携带请求的fileContext，后续需检查是否确实约束了语义上下文输出，而不只在Prompt要求。不要盲目把拒绝结果修成成功，也不要把契约/语义/Review可用性混为一种PASS。

全部真实输入、SSE、完成包、session（含被拒绝结果）完整保存在ignored私有目录evidence/private/v030-semantic-041；共享只放脱敏诊断、哈希、usage和结论。原workflow/private profile/checkpoint/trusted state保持；041最终核对22张DB表与039 capture一致，原待审卡片没有被替换。已有17Partial、2Fetch失败和原failed Group继续如实记录：本次证明了展示任务应保留，但没有修好原workflow的failed Group。

### 工程、成本与交付

040生产候选与源码未因本次验证修改；既有716-test CI和ZIP App/Side Panel加载PASS可以复用，不能代表模型或全课程质量PASS。新增验证脚本经过lint，最终收口检查见verification.json。5次usage均已记录，新调用估算USD 0.187162770，沿用034冻结费率按UTC起始时段计算，不是invoice；reasoning不重复加到output。最后一次B2发生在用户额度中断后接续，前4次已保存并复用，没有重新开始。

已按用户暂时整体交接要求生成handoff-041接手快照：Git HEAD bundle、完整可共享工作树（含当前未提交源码）、逐文件manifest及接手README；不递归覆盖Drive树。依赖/生成缓存、私有材料、凭据、浏览器profile及工具本机状态不进共享包，保留本机路径清单供在同一机器接手。未commit/push/tag/release，HEAD仍26426a3793250aea351c443e3327ccdb1b95b697。

脱敏事实：artifacts/v0.3.0/semantic-041/；快照：artifacts/v0.3.0/handoff-041/。下面为040及更早历史记录。

## Semantic-040：阻塞性语义质量修复，待最小新增模型验证

**当前入站：** P2E-v0.3.0-2026-10-08-040 / READY / BLOCKING_SEMANTIC_QUALITY_REMEDIATION / AGENT_OWNS_SOLUTION。**当前交付：** 实现与零付费验证完成；真实模型语义验收尚未完成，状态 `STOP_NEW_PAID_VALIDATION_AUTHORIZATION_REQUIRED`。039工程完成不代表产品合格；040明确将历史试卷误判升级为阻塞，不能按普通Review噪音放行。

### 根因与真实影响

实际执行入口architecture-runner的session/4系统消息集中描述传输/JSON协议，没有接入旧prompts.ts中的Assessment/Component产品定义。真实Task A把试题命令与分值当Assessment，也把3篇参考论文当draft；119个Source结果均没有fileContext。workflow给B1只传draft/rule及简化terminal，丢掉Source角色、结构、不确定问题与可读Source目录；B1四个Group均没有当前课程任务相关性的明确判断与原文依据。B2只被要求一组一proposal，沿用误组；Review呈现的是链路误判，并非只需删掉一张卡片。

真实failed Group对应小组展示。保存的当前课程指令、展示安排与评分表支持它是真实任务，失败意味着可能遗漏应关注事项；原提交入口默认日期与当前安排还可能冲突，不能自动选择一个日期。历史试卷source本身parse Partial，其题目可读不代表当期义务；参考论文source为ok。17Partial/2Fetch失败继续保留，无法由缺失内容证明全课程没有其他任务。

### 实现选择

新增独立assessment-semantics模块，将产品语义与session协议共同送入实际A/B1/B2/C调用：基于课程任务性质、跨Source指令、正反Evidence判断，不按题名/年份/关键词黑名单。A保留文件角色、identity context和组件关系；B1同时获得全部Source目录、零draft Source上下文及失败/Partial状态，允许读取原文来确认正式指定旧材料为任务的情况。

B1 Group必须带AI-authored CURRENT或UNCERTAIN、basis及正反Evidence；CURRENT需非空原文依据。排除项保留disposition/reason及原文Evidence。Local只检查结构、引用与逐字出处，**不判断引用在语义上是否足够**，因此不能用契约PASS替代模型质量PASS。B2读取Group成员之外的相关性Evidence所属Source，保持B1身份/相关性；最终装配把AI理由和Evidence机械映射为已有Review字段，UNCERTAIN保持其状态，不隐藏或伪造候选。已有Same/Different/Uncertain及成员守恒规则不变。

新workflow记录assessment-relevance/1，新session使用prompt /5，checkpoint复用检查语义版本。旧session/旧workflow保留原策略、原输出、原调用身份，不自动升级、不重派付费请求。原Initial Review仍显示旧三项结果，尚未被新模型重新判断；不能声称真实误判已消失。

### 验证与交付边界

完整CI exit0：716 tests PASS（新增10项）；定向75项PASS。测试覆盖CURRENT原文校验、缺依据拒绝、参考/练习/示例的AI排除记录守恒、正式重新指定旧材料、同名独立任务不机械合并、UNCERTAIN理由/Evidence保留、zero-draft上下文、旧FINAL零dispatch复用。合成输出用于验证契约与流程，**没有冒充模型作答**。真实保存结果只读回放119个上下文、4个旧Group缺新契约依据；无需重扫课程。

生产候选ZIP解压加载App/Side Panel通过，SHA见semantic-040/PACKAGE.json。原profile重新加载新构建，保留旧Review，22个DB表与039最终capture完全一致，无活跃Provider调用、无adoption；不存在已打开NTU tab需刷新。详见RUNTIME.json。原profile可执行cache另存040-preserved，原DB/私有材料未删除。

本轮新增paid dispatch=0。为证明真实模型改进，已准备最多5次physical dispatch、无自动重试/无全课程重扫：3个A正例/反例/信息不足样例；1个B1使用既有真实关键组与Source证据；1个B2优先验证真实小组展示的有效JSON与字段。不在原workflow写入新结果，若出现read/continuation也计入5次上限。具体断言见EVALUATION-PLAN.json；040 §3.5规定新增付费需另行授权，所以在完成实现、零成本验证和包交付后统一申请这一最小边界。

### 同步与历史

用户指定的Drive文件ID `1dhQ_z07h-K4WX8pRo8IqG2FuksuAk3jj` 实际标题为.tmp_CHATGPT_TO_CODEX_HANDOFF_20261008_040.md；挂载长期inbox仍039。已按用户明确指令，将该完整040内容定点同步到本地inbox，并记录来源/旧新SHA；未擅自覆盖Drive旧inbox或Product文档。其余只回传Changed Files。没有commit/push/tag/release，旧039 ZIP及paid ledger保留。下面039及更早内容为历史记录。

## Engineering-039：工程交付，等待统一产品验收

**当前入站：** P2E-v0.3.0-2026-10-08-039 / READY。**当前状态：** STOP_PRODUCT_REVIEW_V030_ENGINEERING_COMPLETE。以下039记录优先于下方历史037/036状态；历史证据保留，不表示当前仍阻塞。

已按039完成同一 workflow 的两个 B2 单次补偿，新增 physical dispatch 恰好2/2。原两个未知计费请求完整保留；成功1，另1 HTTP200/stop 但 JSON 在 character62876 无效，严格解析及简单语法插入修复未找到完整有效结果。不再追加付费请求。新增两次已知 usage 估算 USD0.036241752（沿用034冻结费率，不是 invoice）；历史未知计费仍 Unavailable，039已允许保留未知项后继续。补偿元数据在 Provider transport 前原子消费，保留原 frozen request/checkpoint；同授权重入幂等，不自动再次补偿。生产包不含QA补偿入口。

真实原 workflow `wf_ffd850a9f186233026338f6f` 已进入 Initial Review，3个 pending Review items。B2最终3成功、1失败，成功已有阶段未重跑；Initial workflow 无Task C调用。119 Sources维持100 ok、17 Partial、2 Fetch失败。真实流程验证结论为 **INITIAL_REVIEW_WITH_KNOWN_LIMITATIONS**，不等于全量语义质量PASS。用户截图显示2025_S1试卷的Question1被作为Assessment；根据Assessment独立受评活动与Component边界，此候选存在当前课程相关性/拆分粒度疑点，集中交Product验收，不擅自Confirm或重定产品规则。

Initial Review正常生成3 assessments /11 constraints /24 facts /52 evidence的pending数据，不能把这些表与扫描前空表比较而声称全表守恒。没有用户adoption，reviewDecisions/history/courseStates均0，course未established。最终新构建激活前后全部22表完全一致，活跃版本0.3.0；沿用原profile及权限，未创建第二workflow。私有原始内容/stream/profile仅留本机。

最终 `npm run ci` exit0，706 tests PASS；补偿/session focused18 tests PASS。`npm run package`与`npm run package:verify` PASS，31 entries，实际解压加载App及Side Panel。候选ZIP SHA-256：`e6f41a90802b7307de5a3504646651f72b2a32d57361f3f294e7e1b1a1a3afa9`。root/extension/manifest/Product版本为0.3.0；backend/contracts继续兼容0.2接口。公开已验收README/发布快照不改。未commit/push/tag/release，HEAD保持26426a3793250aea351c443e3327ccdb1b95b697。其他既有dirty state保留。

脱敏交付证据唯一目录：`artifacts/v0.3.0/engineering-039/`；候选ZIP可供Human验收。失败Group、17Partial、2Fetch与历史试卷候选是已知验收缺口，不能宣称成品语义全量合格。下方为历史阶段记录。

## Recovery-037：安全恢复成功，B2 未知付费请求阻塞

依据 P2E-v0.3.0-2026-10-08-037，已完成单文件入站同步，连续工程授权包含安全停止与同 workflow 恢复，无需为普通恢复申请 Product Review。当前状态 **BLOCKED_AMBIGUOUS_PAID_B2_RESULTS_UNAVAILABLE**；尚未 Initial Review，不能返回 ENGINEERING_COMPLETE。

先在活跃旧 Worker 拦截后续 DeepSeek fetch，不中断既有请求。页面关闭、IDB 导出和运行状态探测仍未完成后，保存私有 native IndexedDB 文件备份，经零模型同 profile 恢复演练，再向核验过的 Chrome 发送 SIGTERM；退出后保存 quiescent DB 备份，停止旧 observer。只隔离并保留 Service Worker 可执行缓存/注册目录，不删除原 profile、权限、数据库或 checkpoints。使用原 profile 启动 QA recovery-hold 构建：暂停 initialize、自动发现、恢复和派发，provider boundary 也拒绝 dispatch。默认 QA 和 shipped build 不开启此工程隔离开关；未新增用户 UX。

活跃 Worker 实证 revision `permission-recovery/036`、hold=true；既有 ISC-02 route 接管成功，NTU 登录 origin 检查通过。唯一 workflow `wf_ffd850a9f186233026338f6f` 实际已 working/task-b。恢复后可读 119 Sources、119 observations、125 AiRuns、229 metadata records、125 private completed streams。原 96 AiRuns 完全保留；Sources / observations / assessments / constraints / facts / evidence / history / courseStates 与旧完整快照语义 SHA 全相同，trusted/review 表为空。125 是找回的原 run 记录，本轮恢复没有新 paid dispatch；不改写原 036 不完整快照。

129 durable physical request records：117 applied、10 failed、2 dispatched。AiRuns 与 finished stream 的 request-ID 联集证明 127 请求已有生成结果；125 条 stream 有 usage，另外 2 条 known generated request 缺 stream usage。两个 B2 dispatched 请求均没有 AiRun 或 finished archive，Provider completion/charge **UNRECONCILED / AMBIGUOUS**。缺记录不能证明未发送。恢复后没有活跃 Provider 请求，但终止前这两个请求的计费/结果仍未知。原请求保留，不重发、不改造成免费失败。最终 physical calls、invoice cost 均 Unavailable。125 stream 已知 input 678711、output 736715、reasoning 527311（包含于 output）、cache hit 169344 / miss 509367；这不是最终总账。

覆盖仍 FAIL：100 ok/ok、17 ok/partial、2 permission-denied/not-attempted。两个精确 origin grant 保持；仅对原失败项做零模型只读网络探测，一项 Failed to fetch、一项上游 403，未伪造或覆盖 observations。该探测不是完整 machine fetch/parse 成功证据。17 Partial 均逐项记录 native image/vector/shading/no-text gaps，不把它们算作完整解析或自动追加视觉付费。原 B1/B2 checkpoint 对当前缺口的完整语义覆盖也未成立。

必要验证：`npm run ci` exit 0，704 tests PASS；synthetic 同 profile 重启、全表 hash 守恒、runtime revision 与 recovery hold PASS；真实 route / authentication / held Worker PASS。本次安全恢复解除进程状态阻塞，但不能恢复两个未保存的 Provider 结果。按 P2E-037 §5.1 暂停相关 paid steps，最小外部事项是取得这两笔原请求的 Provider 结果/计费证明；若必须重发，则需明确授权潜在重复计费和费用边界。不是再次申请已授权的 stop/restart，也不启动第二次 full-course。

脱敏证据：`artifacts/v0.3.0/recovery-037/`；私有 native backups、full capture、raw streams 留本机。原 paid ledger 不改写；没有 adoption、commit、push、tag 或 release。


**当前日期：** 2026-10-08 (Asia/Singapore)。  
**当前入站：** `P2E-v0.3.0-2026-10-08-036`。  
**当前状态：** `STOP_ENGINEERING_LIVE_RUNTIME_UNRESPONSIVE_PAID_STATE_UNVERIFIED`；离线回归 PASS，真实 coverage FAIL / Review 未完成。  
**代码基线：** canonical main / `26426a3793250aea351c443e3327ccdb1b95b697` + 既有 dirty state；未 commit / push / tag / release。

## Live-036 关键例外：授权后实际 coverage FAIL，运行无响应

用户已明确回复“权限已给”。只读 Secure Preferences 确认实际已获得两个精确范围：`https://alt-5dcb73f79ba4c.blackboard.com/*` 与 `https://prod01-apse1-prod01-xythos.prod.files.blackboard.com/*`，没有 wildcard grant。不能继续把当前情况记为等待用户授权。

最后完整 private snapshot 显示同一 workflow working / task-a、119 Sources /119 observations：100 ok/ok、17 ok/partial、2 permission-denied/not-attempted；原有 8 个成功观察逐项仍相同。原受阻 Source 仍 permission-denied，恢复 coverage **FAIL**。当前 profile 的 Service Worker ScriptCache 未包含磁盘新 bundle 的 `fetchStatus !== "permission-denied"` 过滤标记：浏览器重启复用了旧 Worker 缓存，之前的数据库 SHA 守恒及 frontend Grant 可见不足以证明新后台激活。此次激活判断缺少 runtime version proof，已补 QA-only `E2E_PERMISSION_RECOVERY_REVISION` handshake；合成 fixture 在启动/重载后必须验证 revision，恢复脚本在 mismatch 时保留 browser 且不打开 Grant route。该修复已在本地实现；**当前活跃 Worker 未完成新的 handshake**。

最后可读快照有 **96 个 succeeded aiRun records（task-a）**。这是持久化记录计数，不能直接当作最终 physical calls / semantic rounds / settled accounting；更多派发、正在执行或已付费但尚未保存的结果均尚未闭合。已记录可见 duration/token 累计和 known record 数至 LIVE-INCOMPLETE.json，没有虚构总账、cache usage、finish reason 或最终成本。本轮已有真实付费执行，旧“新增 calls=0”只适用于授权前恢复快照，不能作为当前结论。

随后页面状态读取与 Worker 的数据库读取长期未完成，Browser CDP Target.getTargets probe 10s 无回应；Worker permissions 检查后来回应，确认上述两项 exact grants，但仍无法获取闭合的请求账本。observer snapshot 停止更新；Chrome 与 observer 仍在，原 private profile / native IndexedDB / 最后 private snapshot 保留。只读进程抽样发现 Chrome 高 CPU，没有作强制终止。当前无法安全核对仍在执行的 physical requests 和 Provider completion；此时 reload/restart/cancel 有 ambiguous-paid 或丢失 capture 风险。未作这些操作，未因缺口启动新的扫描/第二个 workflow/新的 targeted paid rerun。

因此按 P2E-036 §5 的关键运行/支付状态风险，停在 `STOP_ENGINEERING_LIVE_RUNTIME_UNRESPONSIVE_PAID_STATE_UNVERIFIED`。不是普通修复需要 Product 放行，也不是工程完成。唯一需要决定的恢复边界：保持当前环境等待自然恢复，或在接受尚未闭合调用记录的前提下明确允许安全停机与同 profile / 同 workflow 恢复；无论哪种都不自动获得第二次全课程扫描或额外付费重试授权。当前采用保留环境的选项，不执行强制停机。用户已给权限，不再要求重复找 Grant。

离线修复 / CI / synthetic reload PASS 与真实 E2E **NOT COMPLETE / coverage FAIL** 分开记录。未到 Initial Review，没有 adoption / release / trusted state 写入。集中工程验收仍未满足，不能返回 ENGINEERING_COMPLETE。

## Permission-036 授权前快照：修复、回归与同 workflow 接管

当前授权 `P2E-v0.3.0-2026-10-08-036 / READY / CONTINUOUS_ENGINEERING`；普通工程修复不再等待中途 Product Review。授权前快照为 `WAITING_USER_HOST_PERMISSION` 环境暂停（已由 Live-036 取代），不是最终工程完成或新的 Product 审批；授权后继续同一 workflow 至 Initial Review，再集中验收。

- Fetch 的 settled 集合排除 permission-denied；失败观察先持久化并立即进入 Waiting。真实授权后只重试原失败 Source；普通技术失败仍保留终态 Coverage Fact，避免无界重试。确定性 restart 测试保留已完成观察、仅重复受阻读取、最终观察不重复、0 AI calls。
- 既有 Grant click 在渲染前计算 durable recorded redirect origins 与 contains()；只请求缺失的精确 HTTPS Blackboard origin，排除 wildcard、外域、凭证、端口及非 origin 元数据。request 直接处于真实 click；拒绝授权不 Retry。用户已在 Chrome 授权时可用原 Retry 路径恢复，不扩大 manifest scopes。
- QA harness 的后台 start 后显式绑定 full-page / side-panel 的既有 ISC-02 route；恢复脚本只有 OPEN_SCREEN，没有 StartScan / Discover / E2E_CLEAN_REBUILD。route 在 Extension reload 后 session storage 会丢失，因此恢复显式重新绑定同课程，而不是点击 Scan。
- 全量 CI PASS：704 tests（contracts 2 / extension 682 / backend 20），包含 permission subset 与 restart 保护；完整 format/build/type/lint/test/manifest/secret/docs/README/QA separation。Product-owned 协作规范新增 formatter exclusion，保持入站字节原样，未修改 Product 内容。
- 独立 synthetic fixture 的 Chrome 扩展管理页 reload、同数据库表 SHA 守恒与显式 Scan 接管后 Grant 可见均 PASS；真实授权与 model calls 0。fixture 发现 Developer mode 关闭时重载会得到 unsupportedDeveloperExtension / ERR_BLOCKED_BY_CLIENT；正常 Developer mode 下验证通过，未修改活跃 profile 的该设置或权限文件。证据 ZERO-RELOAD.json。

### 活跃环境事件与恢复边界

本轮存在明确工程操作事故：临时 Node observer 调试清理表达式使用 dynamic import，但 debugger evaluation 未提供 import callback，触发 ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING 未处理异常。原 observer PID 611 退出，原隔离 Chrome PID 716 随之关闭。**原 browser process 未保留，不能声明全程保持同一进程。** 已向用户明确说明；没有隐藏或改写历史证据。

原 private profile 与 PRE-ACTIVATION.json 保留。恢复脚本以同一 profile 启动修复后的 QA build，读取既有数据库后逐表 SHA 比对 workflows / sources / observations / aiRuns / assessments / constraints / facts / evidence / history / courseStates 全相同，确认唯一 workflow `wf_ffd850a9f186233026338f6f`、Initial / waiting / fetch / host-permission，119 Sources、9 observations、0 aiRuns。NTU 页面仍显示登录后内容；未复制 cookies/权限文件或重建 profile，也未启动新扫描。恢复 observer 对循环错误只写 private error，不用 finally 关闭活跃 browser。本轮直接交互与 profile 恢复未访问原用户 trusted profile 数据；当前隔离 trusted tables 保持空且 hash 相同，原用户状态最后一次实测守恒仍来自 034，未冒称本轮已重新检查原 profile 全部表。

Cua 最初返回 ScreenCaptureKit -3812；恢复后已成功选择并 Raise 正确 Google Chrome for Testing 的 Syllab app.html Tab，AX 明确显示 MA6081 / Permission required / Allow access to continue / Grant permission。恢复脚本亦验证同页面真实 button。当前唯一精确请求 `https://alt-5dcb73f79ba4c.blackboard.com/*`，首次受阻附件仍待用户真实点击；后续若实际发现另一个 redirect origin，再据实申请，不预授 wildcard。

实际新增 paid calls / real scans / real workflows 均 0；无 Confirm / Use / Keep / adoption / commit / push / tag / release。当前 **尚未执行真实附件授权后 retry，尚未 Initial Review**，因此 live Fetch coverage 与最终 semantic accounting 仍待续跑；不能将合成 PASS 冒称 live E2E PASS。原 034 targeted 15 calls / 11 cases 与成本 ledgers 不改写；旧 rolling LIVE 为旧 observer 最后快照，以 permission-036/RECOVERY.json 与本机恢复 observer 为当前环境证据。

用户直接介入摘要：本轮要求按 P2E-036 连续开发测试，已解除普通工程 Product gate。只需当前前台 Scan 的一次真实浏览器授权，不需新 Product Handoff；恢复后继续原 budget 内执行。此前“手动带窗口前台”的请求已被工程侧成功 Raise 解决。

## Permission-035：只读根因调查与恢复 STOP

当前入站 `P2E-v0.3.0-2026-10-08-035 / READY`；工程状态 `STOP_PRODUCT_REVIEW_PERMISSION_RECOVERY`。此前 034 的“点击单 origin Grant 即可继续”指引由本节纠正，不能作为当前操作指令。

### 现有运行与权限事实

同一 workflow `wf_ffd850a9f186233026338f6f` 保持 Initial / waiting / fetch / host-permission；119 Sources、9 observations（8 ok/ok；1 permission-denied/not-attempted）、0 aiRuns。现有 observer Node PID 611、隔离 Chrome PID 716 仍存活；本轮新增 model calls、重扫、workflow 均为 0。没有重启、重载 Extension、替换 build、点击 Scan / Retry / Grant，也没有修改持久化运行状态。当前 session 存活不等于恢复逻辑已通过验收。

只读检查 fresh profile 的 Secure Preferences：active/granted origins 只有 NTU Learn 与 DeepSeek，runtime_granted_permissions 为空。原 QA profile 的 Secure Preferences 与现有 Chrome permissions.getAll()/contains() 则确认已获两个 Blackboard 通配权限。browser-harness.mjs 每次 mkdtemp 建立新 profile；v030-live-e2e-034.mjs 仅传入认证/settings 和 Initial 课程数据，不带 browser permission grants。这证明本次新 profile 缺授权；不能证明旧授权是谁、何时或通过什么操作取得，亦不能把复制旧授权作为恢复方案。

对照 Git tag v0.2.0：manifest host/optional-host scopes 未改变；Grant handler、redirect-observer 和 permission pattern 的相关路径已在 v0.2.0 存在。GATE3_FINDINGS_v0.2.0.md 的 F28 历史记录已有真实 Permission required / Grant permission；更早 missingOrigins=[] 路径会附件 CORS 失败。因此用户历史上通常自动运行与既有授权一致，但不能据此断言所有历史扫描均有完整附件 coverage。没有证据表明 v0.3.0 新增权限校验或旧 profile 授权丢失。

当前第一个失败附件观察别名 `d574cc78259301c0`；实际 redirect probe 记录 `https://alt-5dcb73f79ba4c.blackboard.com`，随后 HOST_PERMISSION_REQUIRED，不是根据文件名猜域名。原始 Source ID、课程内容、URL 仅留本机 private evidence。当前已证实必要的是这个 origin 的 Fetch 权限；后续附件是否还需文件 CDN origin 尚未验证。

### 实际入口与请求范围

不存在独立的权限页面。patterns.ts 的既有 TaskStatus waiting 组件才渲染 Grant permission；view.ts 需要 course route/context 才映射该任务。QA Bridge 后台直接 E2E_CLEAN_REBUILD 启动，并未随后打开对应 Scan route；普通 Scan CTA 则先设 route。AI live monitor 只观察 provider stream，0 calls 时显示 Waiting for the first provider call，不能借展开 monitor 找授权入口。可见窗口检查仍未见等待任务；原生 AX 单凭窗口名不能独立证明 profile 身份。

mount.ts 实际按钮申请 manifest 的两个完整范围：`https://*.blackboard.com/*` 与 `https://*.prod.files.blackboard.com/*`，并非此前写的单 origin。历史 manifest 已声明这些 scopes。Chrome request 必须由用户手势触发，可申请 optional scope 的子集；参见 [Chrome permissions 官方文档](https://developer.chrome.com/docs/extensions/reference/api/permissions)。改为精确 origin 请求需要评估并修改实现；本轮未改变 scope 或产品交互。

### 恢复风险与最小方案

workflow.ts:1217–1225 将该 workflow 的所有 observations 的 sourceId 放入 settled，未排除 permission-denied/not-attempted；handler.ts:367–397 的 RetryTask 清除等待并保存原 workflow，却没有使权限失败的 observation 重新成为 pending。当前已有这种持久化 observation。因此直接 Grant → Retry 存在跳过首个失败附件的静态路径风险。此逻辑亦见 v0.2.0；这是代码与当前状态交叉证据，未执行有副作用的恢复实验，不能称为已实测跳过。

仅切换现有 Scan route 可以补入口，却无法解决 coverage 恢复风险。修复/激活可能需要代码与 build/reload 或状态恢复，触发 P2E-035 §4.4：先 STOP，不要求用户继续找按钮。建议下一份授权明确允许：先离线验证 permission-denied observation 的同 workflow 恢复设计，保留 8 个已完成观察及所有历史证据；只重开该失败 Source，不重扫、不创建 workflow、不伪造权限；再审查 active build 激活与原 checkpoint 保留方案。安全激活并确认真实 Scan 入口后，才依据实际申请范围请求一次用户手势，并恢复同一运行至 Initial Review。当前不承诺可无损直接恢复，不采用另一 profile 绕过当前 session。

本次用户截图/反馈已作为直接用户介入摘要记录：界面没有可见 Grant，历史体验通常无需手动授权；反馈没有扩大产品或 paid 授权。034 targeted PASS / 702 tests 为既有证据，当前 E2E 未完成，trusted Current / adoption / release 均未触碰。

## G-Semantic-034. Targeted PASS；一次真实课程 E2E 等待用户环境操作

当前入站 `P2E-v0.3.0-2026-10-08-034`；状态 `STOP_USER_ENVIRONMENT_REQUIRED_AFTER_G_SEMANTIC`。本轮真实 targeted qualification 已 PASS，尚未完成真实课程 Review gate。所有结果仅限已覆盖样本，不构成 adoption / release acceptance。

| Targeted matrix | 实测结果与边界 |
| --- | --- |
| A | 两个普通 Source 分别 3 Draft/2 Rule、2 Draft/1 Rule；合法 0/0 FINAL；project guide 经 CONTINUE + requestedReads 后 FINAL（2 semantic rounds / 2 physical calls）；一个私有真实 native Source。Evidence→Source→Locator 可解析。 |
| B1 | 18 Registry records、4 Groups、2 Rules；Same/Different/Uncertain 与 explicit Draft/Rule dispositions；Registry revision 18。assignment aliases 同组、两个 Quiz 分组、不确定 project identity 保留。无 canonical/identity collapse。 |
| B2 | 4 Groups 各产生一个 provisional Assessment，weight/date/requirements/components/facts grounded，无跨组重新 grouping。 |
| C | 20→22 October 的真实 CHANGED，Current/Latest 双 Evidence chain 保留；仅对已有 B1 identity 比较。 |
| 无自然样本路径 | merge/split/reassign/retirement、大 Registry multi-segment、Conflict/Not Mentioned、technical-failure empty/removal safety 使用既有 deterministic/injected regression；不声明已作对应真实模型验证。 |

### 修复、rerun 与成本

真实 generation 共 **15 calls / 11 cases**；technical retries 0，确认工程缺陷后的 semantic reruns 3。原始 response/SSE/session/claim/failure 均保留在本机 private evidence，不上传 Drive。第一次外层 session envelope 缺失：补全 prompt；第二次发现 nested payload 未经过既有 schema compatibility 且 evidenceId 示例不完整：保留原 response，仅规范化 FINAL 内层并记录 repair hashes，补全完整 Evidence shape；B2 提示遗漏 mandatory arrays 和观察到的 schema alias：补全 prompt 并只重跑失败 B2。C 的已捕获正确 CHANGED 只作唯一 slash→dot schema alias 离线 replay，新增 generation 0。选择私有 Source 的 harness 错误修复后复用既有 A FINAL；无随机刷答案。

注册兼容仅限已观察到的 A1/B1/B2/C1 schema 拼写，不补造 fields、Evidence 或语义。session prompt 为 /4。所有旧 attempt/failure ledger 保留，最终 targeted 见 `semantic-034/r2/TARGETED.json`、`SEMANTIC-AUDIT.json`。

Provider usage：input 41,727；output 80,299（其中 reasoning 64,334，不能再次相加）；cache hit 12,160 / miss 29,567；15 calls usage 均已知，finish stop，无 ambiguous-paid。Provider latency 合计 297,397 ms；首次开始至最后结束 759,197 ms（含工程介入）。按 [DeepSeek 官方价格](https://api-docs.deepseek.com/quick_start/pricing/) 与实测 off-peak 时间估算 **USD 0.05265093**；账单实际扣费未独立取得。详见 ACCOUNTING / PRICING；历史 Gate B/B-R raw 与成本记录未改写。

### CI、真实课程与守恒

最终 `npm run ci` exit 0：**702 tests**（contracts 2 / extension 680 / backend 20），format/build/type/lint/manifest/secret/docs/README/shipping-QA separation 全通过。新增 session nested alias/replay 与 QA initial guard tests 已包含其中。零模型浏览器回归结果存放本轮 ZERO-BROWSER，旧 G-Zero-033 artifacts 保持原字节。

原课程尚未 established，按 034 选择 Initial Scan。隔离 QA profile 只取得现有课程/semester 和内存中的合法 authentication/settings，不带入旧 Source、staging 或 AI checkpoints。首次 QA bridge 拒绝 Initial（0 workflow / 0 calls），修复 QA-only guard 后启动 **唯一一次** fresh real-course Initial workflow。Discovery 发现 **119 Sources**，Fetch 停在 `host-permission`，live model calls **0**；尚未 Initial Review，不能声称 E2E PASS。独立 private profile、cookie/session/key/raw reasoning 不上传。

历史 034 指引（已被 Permission-035 纠正，当前不得执行）：在本轮隔离 QA Scan 页面点击 **Grant permission**，允许 `https://alt-5dcb73f79ba4c.blackboard.com/*`，继续同一个 workflow；不要重新 Scan。当前本机 observer 保持同一浏览器和 workflow 存活，只观察并保存 private evidence。用户授权后既有 workflow 可以继续；不能另起第二次课程运行。静态环境 gate 快照为 LIVE-ENVIRONMENT-GATE.json；滚动 LIVE.json/LIVE-LEDGER.json 不纳入共享同步。

原用户 courses/semesters/courseStates/assessments/constraints/facts/evidence/history/reviewDecisions/exclusionMemory SHA 均未变化，CONSERVATION 全通过；无 Confirm/Use/Keep/adoption、commit/push/tag/release。保持 HEAD 与其他既有 dirty state。剩余风险：大型真实课程尚未进入 A/B1/B2/Review，规模下合同稳定性和 unresolved/Conflict/Uncertain 分布仍未知；targeted 小样本 PASS 不替代该 gate。

## G-Zero-033. 实际实现与集中验证

S0–S6 已实现 `source_registry_group/1` 新 workflow policy，生产 background 创建新 workflow 时启用；无 policy 的历史 workflow 保留兼容路径。session schema `syllab.ai/session/1` 为 additive contract，不改变历史 Task A/B/C 输出身份或历史计费记录。具体模块与 slice 状态见 Technical Design R0、Implementation Plan N0。

### 验证 evidence

| 检查 | 实际结果 / 边界 |
| --- | --- |
| `npm run ci` | PASS / exit 0：contracts 2、extension 676（78 files）、backend 20，共 698 tests；format/build/type/lint/manifest/secret/docs/README/build separation 通过。 |
| 新架构 deterministic tests | `architecture-session.test.ts` 15 tests；`architecture-provenance.test.ts` 10 tests；workflow 新 policy 4 integration scenarios 与旧路径 43 tests。均在最终 CI 中通过，不额外累加到 698。 |
| `node scripts/v030-architecture-zero-browser.mjs` | PASS / exit 0；隔离 Chromium profile、production WorkflowEngine/LocalStore/IndexedDB、injected provider；任何 `/chat/completions` network 被拒绝。 |
| 浏览器 workflow | Initial 2A + 1B1 + 1B2；相同 Check 零 dispatch；Rebuild 独立 staging，同样 4 injected calls；trusted user-edited object 保留，history 0、adoption 0。 |
| 页面恢复 | durable FINAL 存入 Chrome storage，重新 reload 页面并重新载入模块后恢复，新增 dispatch 0；effective round 保持 1。另有 captured/raw replay、unknown dispatched refusal 单元测试。 |
| state/provenance | 测试中的 trusted/history 未变；跨 Source evidence aliases 分域、Current Evidence 保留原快照元数据；失败 Source/Group 保守传播，不能推出 removal；Registry immutable history、retired refs、Draft/Rule dispositions 守恒。 |
| production / QA | shipped bundle 14 files 无 QA layer；QA bundle 有 observation/acceptance bridge；6 shared modules 一致。无 private profile/raw course 上传。 |

安全共享证据：`artifacts/v0.3.0/g-zero-033/browser.json` 与 `verification.json`。后者保存最终 CI log SHA-256；原始终端日志在本机 `/tmp/syllab-g-zero-033-final-ci.log`，不是长期共享事实源，也不要求 Product 拉取该日志。

### 本 milestone 修复与历史兼容处理

- 旧 Task A classifier/teaching deferral、cross-Source physical packing、旧 monolithic B 保留兼容历史 workflow；新 policy 不调用这些旧主路径，也不把旧 checkpoint 当新 semantic success。
- 分段传输不消耗额外 semantic round；FINAL 必须在完整 input delivery 后，duplicate completion 幂等。安全的 pre-generation capacity refusal 可在同 round 分片，unknown dispatch 不重发。
- 大 AI-authored carry 使用 immutable archive + exact descriptor / same-round transport read；不反复塞入完整巨大 envelope，不 Local summary，不对多个独立 Registry FINAL 做 Local merge。
- provenance 校验在 materialization 前完成；Source-local evidence aliases 绑定实际 source/snapshot；机械 Registry Group alias 到 proposal ID 映射、trusted Assessment/Rule ID 类型与 conservation 验证。
- 修复 Current Evidence 被最新 Source snapshot 重新标记的风险：已注册 Evidence 保留 ID/hash/origin/page/region/capturedAt，包含历史 hash 缺失状态；Current / Latest 两条链不混合。既有 Constraint evidenceRefs 也进入 Current context。
- synthetic integration 的 clock、浏览器 context route 与恢复测试已修正；最终恢复测试实际跨页面 reload，不以同页面重复调用替代恢复证明。
- 旧 paid Gate B/B-R failure ledger、usage、raw evidence 保留，不复跑、不改写为 PASS。与新 namespace 不同的旧 workflow 不原地迁移。

### 选择、限制与未验证事项

当前 B1 采用完整 A terminal barrier 后 admission，未实现可选 early overlap。scheduler 10–25 仍为既有 engineering tuning，不是 Product invariant。production native adapter 信号默认不合格，依靠既有 hash fallback；可靠 modified/version 仅在 synthetic qualification 测试验证，不能宣称真实 NTU native fast-path 已验证。

未执行真实 Provider / paid / real semantic validation / real-course workflow。真实 transport 容量、输出遵循 session/Registry 操作合同的能力、跨 Source recall/identity、field synthesis、Rule recall、C semantic judgment 均需下一份 bounded G-Semantic 授权。测试中的 capacity boundary 是注入模拟，不构成真实 Provider benchmark。保守的失败 coverage 可能增加后续重试，但不降低 trusted/removal safety。

隔离浏览器已经 reload 并验证恢复；日常 Chrome 的 `chrome://extensions/` 被 Browser 安全策略阻止访问，因此日常已安装扩展 reload 未完成，不绕过。已读取该 Chrome 全窗口 open-tabs inventory，没有 NTU Learn 标签需刷新。使用新 bundle 前仍需 reload unpacked extension，并刷新届时已开 NTU Learn 标签；这项环境操作不计作已完成。

**Product-impacting Technical Conflict：None。** G-Zero 仅为 automated / zero-model qualification，不替代 Product Review、真实 semantic quality 或 Human acceptance。停止等待下一份 Product Handoff。

建议最小下一步：一个经授权的脱敏/选定 snapshot，bounded A（含 0-output 与 read/visual 例）、跨 Source B1（Same/Different/Uncertain + Rule dispositions）、单 Group B2，以及一个 Current/Latest C 双 Evidence 例；提前明确 physical/semantic accounting、成本上限、恢复权限与停止条件。本轮不执行。

---

# 历史工程报告（保留原记录；不是当前授权）

# Syllab for NTU Learn — Engineering Report v0.3.0

**日期：** 2026-10-05。  
**状态：** P2E-009 isolation lookup preflight完成；P2E-008真实Rebuild因known recall失败停止，另发现历史coverage状态继承漏洞，Real-course Validation FAIL。  
**入站：** `P2E-v0.3.0-2026-10-05-009 / READY`；DA-002 方向不变，旧章节保留历史证据。  
**代码基线：** main / `26426a3793250aea351c443e3327ccdb1b95b697`；当前工作区未提交。

## 1. 实际实现

- Format-aware native PDF/PPTX/DOCX/XLSX，保留 page/slide/paragraph/table/sheet/cell 与原始 hash。
  Legacy DOC/PPT/XLS 使用本地 pinned LibreOffice WASM canonicalization；original Source identity 不变。
  Visual gaps 才触发 selective rasterization，Evidence 保存 native/visual/unverified provenance。
  未解决 gap 或 visual payload 超限明确保留 Partial，不由模型成功响应覆盖本地 coverage。
- Task A 默认以 Source 为逻辑包，必要技术 split、一次 consolidation、成功物理调用 checkpoint
  复用；adaptive scheduler 初始 10、上限 25、压力退避、独立 render lifetime 与网络/Provider backpressure、稳定 commit 顺序。
  Workflow ownership watch 使 fetch/SSE 中止并阻止 stale write；parser/render 仍由前后检查和 timeout 约束。
- A→B 显式传递 Draft、aliases、fields、Source/provenance、file/identity context、relationships 与
  uncertainty；这些保持 provisional。B 使用 stable Evidence Ref 精确取回少量原文，并在同一
  messages session 追加，按新增字符 coverage 继续；不继承 A reasoning，不使用 Local 标题相似度作身份判断。
  B/C 拒绝未提供或伪造 Evidence；Task C 继续受真实 coverage 与 trusted-state reducer 保护。
- Production SSE Activity 使用已有模型流，runtime memory 最近片段、脱敏、节流、extension Port，
  不新增 summary call，不进入持久存储；finish/cancel/disconnect 清空，surface 可重新订阅。
- UI 沿用 flat forest 系统，统一空间/控件/反馈，新增 focus、selection、未提交 Edit 与 scroll continuity，
  reduced motion 处理。浏览器检查发现的 pending Review 对错 Assessment 编辑问题已按实际 ID 修正。
- Physical-call QA metadata 保存真实 usage/cache/latency，未知数据为 unavailable；新增 metadata-only
  ledger 汇总工具。真实测试输出支持 `--version 0.3.0`，保留 v0.2 私有证据目录。

工程方案的最终细节只在 Technical Design；Phase/Gate 状态只在 Implementation Plan。
没有新增 AI Design、Direction Adjustments 或 VERSION_RECORD 空壳。

## 2. 可重复验证与证据界限

| 验证 | 命令 / Evidence | 结果与范围 |
| --- | --- | --- |
| 完整 CI | `npm run ci` | PASS，499 tests（477 extension / 20 backend / 2 contracts）；涵盖 format/build/type/lint/tests/manifest/secret/docs/build separation |
| Office MV3 | `node scripts/v030-office-check.mjs` | PASS；3 synthetic formats，实际 hidden offscreen document、production runtime 与 exact asset builder |
| Browser interaction | `node scripts/v030-browser-check.mjs` | PASS；5 checks：Edit continuity、pending Review identity、两 surface Activity/清空/不持久化、reduced motion、press feedback |
| 全 screen capture | `node scripts/capture-screenshots.mjs --out artifacts/screenshots/v0.3.0` | 39 synthetic screens；含当前 Review 修正，不能代替 Human visual acceptance |
| Usage accounting | `node scripts/v030-ledger.mjs --self-test` | PASS；失败调用仍计数、unknown usage 不变成零费用 |
| Real-course | `node scripts/real-test.mjs --version 0.3.0 --auto` | NOT COMPLETED；已加载 QA 扩展并开始真实扫描；Task A 进行中，尚未完成 Task B / Review |

Office 报告：`artifacts/v0.3.0/office/REPORT.json`。DOC 9216→5021 bytes、XLS 5632→5448、
PPT 459264→8573；三种 canonical formats 均完成 PNG visual completion，render 尺寸分别
1224×1584、2400×1174、1588×893，无 pageerror。只证明这些合成样本。
Browser 报告和截图：`artifacts/v0.3.0/browser/REPORT.json`、`activity-full-page.png`、
`activity-side-panel.png`；Review Edit 见 `artifacts/screenshots/v0.3.0/IRV-02.png`。
早期 EXTENSION_NOT_LOADED stop 记录保存在本机 `evidence/private/v0.3.0/real-test/REPORT.md`，不进入 Drive。

自动回归包括 parser relationships/cells/uncached formula/header gaps，scheduler pressure/cancel/order，
workflow failed-only/stale/restore、zero-AI Check、Partial coverage、不丢 A→B context，SSE 与 Evidence guards。
历史 v0.2 fixture harness 保留作 regression；其旧 object-ID expansion 不能冒称 v0.3 production B 的 Evidence Ref 验证。

### 2026-10-04 真实 QA 阻塞修复

用户观察到 Task A 后长时间无进展。诊断时仅 7 个 announcement Task A 成功，Task B 未开始；
实际阻塞发生在附件视觉补全，不是 Task B。PDF.js 默认 display render 使用 requestAnimationFrame，
hidden offscreen document 无可见帧，导致 render promise 不完成。改用 PDF.js print intent 的异步调度，
并增加 fetch 60 秒、PDF 各操作 30 秒、destroy 5 秒保护。失败仍保留未完成 coverage。

同一真实 3 页 PDF 在未注入诊断替换的生产 QA offscreen 中约 1.97 秒完成，3 parts / 0 unresolved。
Office 资格化脚本已改在实际 hidden offscreen 执行，3 种合成格式通过，避免可见测试页掩盖此问题。
新增 deadline 和 worker eviction recovery 回归；完整 CI 499 tests 通过。

同时把 discovery metadata 持久化到 SourceRecord，避免 worker 重启后下载信息丢失。
旧附件可从原有 nativeItemId 的 NTU Learn HTTPS URL 恢复；不猜测跨站下载地址。
QA profile 中 19 个旧附件均具有该 URL。成功物理调用不清空；恢复 trace 确认原有 7 条 Task A cache hit，成功记录已增至 12，
最终 bundle 已 reload 并刷新现有 NTU Learn 标签页。仅释放已退出 worker 的旧 lease 以立即恢复。
这些证据不代表完整课程扫描、语义质量或 Human Acceptance 通过。

## 3. 真实验收、性能与费用

本轮没有完成真实课程扫描，因此没有可报告的 v0.3 semantic quality、actual runtime、tokens、cost、
Review burden 或 processing-wave 结果。10–25 并发是目标区间，不是已经测得的吞吐结论。
大课程 2–3 waves 是否达到必须由真实 trace 证明。

v0.2 历史来源为 `docs/versions/v0.2.0/ENGINEERING_REPORT_v0.2.0.md` 的 Real Rebuild：119 Sources、216 A starts、41 consolidation、B 1+2 expansions、
73 Assessments、879 Facts、521 Evidence、72 Review items；原记录没有可比 runtime/token/cost。
不得补造旧数据、把减少调用推断为语义质量提升，或把不同课程内容直接归因于版本。

真实运行后执行：

```sh
node scripts/v030-ledger.mjs evidence/private/v0.3.0/real-test/qa-events.json evidence/private/v0.3.0/real-test/ledger.json
```

可另提供带日期/currency、每百万 input-cache-hit/input-cache-miss/output 价格的 metadata JSON；
缺 usage、cache split 或 pricing 时 total cost 为 null。Observation span 包含等待/Review，不能作为 model runtime。
完成一门大课程主链后，对 Check unchanged/changed、Rebuild preview/Use/Keep 作 targeted 验证，
无需重复执行四次昂贵 full-course scan。真实 Review 语义决策与最终接受由用户作出。

## 4. 已知风险与未完成验证

1. 复杂 Office layouts、encrypted/password/corrupt legacy files、真实 image/table/chart 语义尚未资格化。
   DOCX 唯一文本 anchor 无法定位的对象保留 Partial；不会猜测相邻 page 来宣布完整。
2. WASM 资产体积大、约 1GB 初始 memory；concurrency 为 1，idle/timeout 直接 terminate worker。
   当前依赖 pinned package 的内部 worker 属性，尚无峰值 RSS/完整 worker-tree 回收量化证据。
3. Renderer 保留 encoded PNG 48MiB/Source、DOCX selected media 32MiB；scheduler weight 是估算值。
   真实大课程 memory pressure 和 throughput 尚未测量；命中预算留下 unresolved。
4. Dependency 的 MPL 文本及修改 source 已打包，但 upstream distribution 没有完整 third-party
   notice inventory；发布前必须核验 binary provenance/notices。没有声称 license audit PASS。
5. B 两轮后仍请求 expansion 会进入可恢复的 contract failure；模型可返回 Uncertain。真实语义
   case eval 与 Review burden 改善尚未完成，不能仅凭 deterministic validators 宣称准确性提高。
6. G-Experience、G-Real-course 均 Pending；package/manifest 仍为已发布 0.2.0，未制作 v0.3 release。

## 5. 协作事实

四个允许的 inbound 文件已定点同步；没有恢复递归 Drive audit/sync，没有删除已下载文件。
部分 canonical Markdown 经格式检查需要 Prettier normalization；Product 语义未改，这些文件不盲写回 Drive。
Archive 规则在原 `docs/rules/product-version-archives.md` 更新，保留 v0.2 历史事实。
后续只以现有 CODEX_TO_CHATGPT_HANDOFF 的 Changed Files 清单定点写回，并逐文件进行冲突保护。
无 commit/push/tag/release。下一步阻塞是 QA unpacked extension loading、用户登录/MFA与 Human Gates。


## 6. Global Limit Audit + Task A Runtime Audit — 2026-10-04

状态：**Audit completed / Proposed fix only / Runtime fix not accepted**。本节以当前 canonical source
和已有 QA 元数据为依据；覆盖 extension 全部一方源码、offscreen/parser/discovery、后台、历史 proxy
及共享 contracts，排除测试数据的刻意小数值、标识符版本号和纯视觉尺寸。dependency 内部上限未穷尽；
真实外部边界单列。没有修改 runtime，没有换数字，没有 reload/重试/启动课程。
先前已恢复的 workflow 在审计期间仍运行；读取的是它的现有状态，不是新验收运行。

旧 §2–4 中的“保护机制”“保守 backpressure”等表述不构成容量验证。本节状态优先解释这些值，
不得据此宣称修复、真实课程验收或性能目标已经通过。旧版300s在v0.2报告也明确是 provisional。

### 6.1 来源与验证口径

- Product 来源：当前 PRD §6.2 和 Interaction & IA §3；10–25 是动态目标，不是无条件硬 KPI。
- Provider：本日核验 [Models](https://api-docs.deepseek.com/quick_start/pricing/)、
  [Vision](https://api-docs.deepseek.com/guides/vision/)、
  [Rate Limit & Isolation](https://api-docs.deepseek.com/quick_start/rate_limit/)。
  与本实现有关的真实硬边界：1M context、384k max output、48MiB request body、600 images/request、
  inline decoded image32MiB；官方图像token上界1024。文档另有总image-size与dimension规则，当前
  preflight并未完整实现。Provider排队10min关闭条件不是整workflow deadline，也不能支持300s推理上限。
- Browser：[Chrome lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
  定义30s idle、单event/request5min、fetch响应超过30s等生命周期条件；它们不是文件/课程容量上限。
  debugger/持续API调用会影响lifetime，因此CDP下结果不能替代无debugger eviction验证。
- `ARBITRARY / UNVERIFIED LIMIT` 指没有符合本次授权的数值/容量依据；safety目的并不自动验证数值。
  单元测试证明“限制按实现触发”，不能证明限制合理；小文件probe成功不证明容量边界。
- 表中“未找到Product授权”不等于证明历史从未讨论过；当前权威文件未给出该exact值，不能自动继承为已验证容量。

### 6.2 Limit Inventory

每行列出位置、值/计算、作用、来源、Product、外部约束、验证与叠加影响；同一策略的重复常量/多处实现合并列明。

| ID / 代码位置 | 当前值或计算 | 实际作用 | 来源 | Product 明确定义 | 真实外部约束 | 验证证据/缺口 | 状态 | 叠加影响 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [L01 · extension/src/v2/package-scheduler.ts](../../../extension/src/v2/package-scheduler.ts:23) | initial 10 / maximum 25 | 文件包 admission 数量 | PRD §6.2.3 | 目标范围是；硬 clamp 不是 | 否 | 有相关单元回归；无边界 benchmark/stress/真实边界证明 | PRODUCT TARGET / 硬上限需改 | 实际 in-flight 不等于 limit；当前没有 active package telemetry |
| [L02 · extension/src/v2/package-scheduler.ts](../../../extension/src/v2/package-scheduler.ts:25) | 8,000,000 weight | 所有活跃 package 总估算权重 | 工程选择 | 否 | 否 | 有相关单元回归；无边界 benchmark/stress/真实边界证明 | ARBITRARY / UNVERIFIED LIMIT | 超预算包单独进入；与旧 4M/page 组合近似串行 |
| [L03 · extension/src/v2/workflow.ts](../../../extension/src/v2/workflow.ts:822) | 当前 text.length × 2；旧 text + partial unit × 4,000,000 | 文件 admission 权重 | 工程选择 | 否 | 否 | 旧串行已诊断；当前容量边界未验证 | ARBITRARY / UNVERIFIED LIMIT | 当前仍会因长文本降低文件并发；不是 RSS |
| [L04 · extension/src/v2/workflow.ts](../../../extension/src/v2/workflow.ts:276) | 1 | 所有文件的 visual rendering 槽 | 工程选择 | 否 | 未证明所有格式需要串行 | 仅合成回归断言 1；不是合理性的证明 | ARBITRARY / UNVERIFIED LIMIT | 不只 Office；PDF 也串行；预算等待期间不释放 render slot |
| [L05 · extension/src/v2/workflow.ts](../../../extension/src/v2/workflow.ts:277) | 192 MiB；weight = sum(dataUrl.length) × 3 | render 完成后直到 AI/consolidation 完成的 payload admission | 工程选择 | 否 | 否 | 只有 semaphore 行为单测；无 RSS 压测 | ARBITRARY / UNVERIFIED LIMIT | render slot 被预算等待占住；AI 网络时延阻止下一文件渲染；FIFO head-of-line |
| [L06 · extension/src/v2/resource-budget.ts](../../../extension/src/v2/resource-budget.ts:4) | FIFO；oversized alone；队列无容量上限 | 资源等待顺序/超大包 admission | 工程选择 | 否 | 否 | 取消/释放单测；无峰值内存数据 | ARBITRARY / UNVERIFIED LIMIT | 超大包不受预算约束；计数不是实际内存；无等待时长 telemetry |
| [L07 · extension/src/v2/package-scheduler.ts](../../../extension/src/v2/package-scheduler.ts:78) | pressure × 0.5 / min 1；successes >= limit 后 +1 | 并发降速/恢复 | 工程选择 | adaptive/backpressure 是；算法数值否 | 429 有；普通网络失败不是容量证明 | 有相关单元回归；无边界 benchmark/stress/真实边界证明 | ARBITRARY / UNVERIFIED LIMIT | 宽泛 NETWORK_TRANSIENT 会因离线降到 1；没有增减原因与资源等待指标 |
| [L08 · extension/src/v2/package-scheduler.ts](../../../extension/src/v2/package-scheduler.ts:42) | cooldown 最多 60s | 新包 dispatch 暂停 | 工程选择 | 否 | 否 | 有相关单元回归；无边界 benchmark/stress/真实边界证明 | ARBITRARY / UNVERIFIED LIMIT | 与 DeepSeek 层 Retry-After clamp 叠加，可能提前恢复发送 |
| [L09 · extension/src/v2/workflow.ts](../../../extension/src/v2/workflow.ts:823) | 没有 Retry-After 时 fallback 1000ms | 失败后的 scheduler delay | 工程选择 | 否 | 否 | 有相关单元回归；无边界 benchmark/stress/真实边界证明 | ARBITRARY / UNVERIFIED LIMIT | 瞬时失败未形成充分网络恢复窗口；新 fatal 已停止后续 admission |
| [L10 · extension/src/v2/workflow.ts](../../../extension/src/v2/workflow.ts:831) | auth / NETWORK_TRANSIENT / AI_PROVIDER 立即停止新 dispatch，drain 已 admission | 网络失败传播 | 近期修复；本次用户明确要求阻止失败风暴 | 方向是；判据需 probe | 不是 provider 容量上限 | 30 包合成 outage 测试；无受控真实 outage probe | SAFETY BEHAVIOR / 待 probe | 最多当前已 admission 工作继续；成功 execute 立即缓存；不能声称根因已修好 |
| [L11 · extension/src/v2/workflow.ts](../../../extension/src/v2/workflow.ts:649) | Fetch + Parse 每 step 1 Source，串行；Discovery 全部完成后才 ingest | 隐式 ingest 并发 | 工程选择 | 否 | 未证明 Blackboard 要求串行 | 真实保存 117 observations；无分阶段计时 | UNVERIFIED SERIALIZATION | Task A 等所有 ingest 完成；没有文件流式流水线 |
| [L12 · extension/src/offscreen/office-runtime.ts](../../../extension/src/offscreen/office-runtime.ts:18) | 一个共享 Office converter 串行队列 | Office WASM 执行并发 | 共享 runtime 状态隔离 | 否 | 实现共享实例是事实；多实例性能边界未验证 | hidden offscreen 3 格式资格化；无并行压力/RSS测量 | SAFETY CANDIDATE / 容量未验证 | 只应约束非重入 converter；不得将此锁扩展至 PDF/网络请求 |
| [L13 · extension/src/v2/workflow.ts](../../../extension/src/v2/workflow.ts:969) | 同一文件的 technical parts 顺序 await；全部 parts 后 consolidate | 包内模型并发/依赖 | 工程选择 | 单文件主 package 是；parts 数量否 | 不是 provider 强制串行 | 已有真实调用；无替代方案吞吐对比 | DEPENDENCY + UNVERIFIED PACKAGING | 人工多分组会增加顺序调用与重复 context；跨文件应并发 |
| [L14 · extension/src/v2/workflow.ts](../../../extension/src/v2/workflow.ts:836) | 所有 schedulePackages 返回后才按 source 顺序 commit | Task A staged 提交 barrier | 防止共享状态竞态 | 顺序稳定与 trusted state 安全是 | 否 | workflow order/stale 单测 | SAFETY / BARRIER | 成功 AiRun 已缓存，但某一包慢会延迟全部 staged 进展与 Task B |
| [L15 · extension/src/v2/workflow.ts](../../../extension/src/v2/workflow.ts:864) | failed source 额外 recovery pass 1 次；逐个 await | 失败 Source recovery | v0.2 继承工程策略 | 有界 failed-only recovery 是；1 否 | 否 | 有相关单元回归；无边界 benchmark/stress/真实边界证明 | ARBITRARY / UNVERIFIED LIMIT | generic workflow retry + per-call repair + recovery pass 叠加；不是统一 invocation ceiling |
| [L16 · extension/src/v2/workflow.ts](../../../extension/src/v2/workflow.ts:60) | lease 10min / heartbeat 5min / ownership poll 1s | 旧 worker 接管与 completion ownership | stale-worker safety | 方向是；时间否 | Chrome worker eviction 真实；10min 非 Chrome 值 | lease/stale 单测；无 evict边界压力测试 | SAFETY CANDIDATE / 时间未验证 | 不是 workflow deadline；worker消失后可能等待10min；reload 丢失 in-flight response |
| [L17 · extension/src/v2/workflow.ts](../../../extension/src/v2/workflow.ts:62) | 3 workflow failures；timeout 第2次 terminal；AI_CONTRACT立即 terminal | 自动 retry 次数 | v0.2 provisional policy | 有界 retry 是；值否 | 否 | 有相关单元回归；无边界 benchmark/stress/真实边界证明 | ARBITRARY / UNVERIFIED LIMIT | 与 physical repair、额外 recovery pass 组合；没有跨层 retry ledger |
| [L18 · extension/src/v2/workflow.ts](../../../extension/src/v2/workflow.ts:63) | 5min / 30min / 2h | saved workflow backoff | v0.2 工程选择 | 未找到这些值的当前 Product 授权 | 否 | 有相关单元回归；无边界 benchmark/stress/真实边界证明 | ARBITRARY / UNVERIFIED LIMIT | MAX_ATTEMPTS=3 时第3次已 terminal，2h 档普通workflow路径不可达；至少两段等待可占35min |
| [L19 · extension/src/v2/deepseek.ts](../../../extension/src/v2/deepseek.ts:44) | 300s，complete 与 validateKey 都使用 | 单个 provider 请求绝对时间窗 | v0.2 明确 provisional | 否 | 不是 provider inference deadline；Chrome lifecycle 不等于此请求值 | 成功样本最大102s；非边界压力验证 | ARBITRARY / UNVERIFIED LIMIT | SSE仍有进展也会 abort；Provider可有10min排队，300s可能提前截断 |
| [L20 · extension/src/offscreen/index.ts](../../../extension/src/offscreen/index.ts:22) | attachment fetch 60s | offscreen下载绝对时间窗 | 近期修复 deadlock | 否 | 不是 NTU 文件下载硬约束 | 3页PDF真实probe成功；无慢速大文件压力 | ARBITRARY / UNVERIFIED LIMIT | 不是 stall检测；低速但持续下载也会失败；fetch size另有64MiB |
| [L21 · extension/src/parser/runtime.ts](../../../extension/src/parser/runtime.ts:30) | parser worker 30s | 单次解析 execution window | isolated-worker cleanup | 否 | 无此浏览器/格式硬上限 | worker timeout单测；无大型文档边界bench | ARBITRARY / UNVERIFIED LIMIT | 只到期限，未看进展；解析500/2M上限在全解析之后检查 |
| [L22 · extension/src/offscreen/visual-completion.ts](../../../extension/src/offscreen/visual-completion.ts:134) | PDF load/getPage/getTextContent/render 每操作30s；destroy5s | PDF operation 与 cleanup deadline | 近期 offscreen修复 | 否 | print intent 解决 rAF；具体秒数非 PDF.js硬约束 | 实际3页1.97s；deadline单测；未压力验证 | ARBITRARY / UNVERIFIED LIMIT | 每页有新 deadline，不是文件总30s；destroy错误吞掉；不能证明正常大页不会命中 |
| [L23 · extension/src/offscreen/office-runtime.ts](../../../extension/src/offscreen/office-runtime.ts:37) | Office operation 90s，含 initialize 与整文件 page loop | Office runtime task lifetime | 工程选择 | 否 | 不是 WASM硬约束 | 3种小文件资格化；无大文件bench | ARBITRARY / UNVERIFIED LIMIT | 很多页持续成功仍可能到90s终止；与外层render槽叠加 |
| [L24 · extension/src/offscreen/office-runtime.ts](../../../extension/src/offscreen/office-runtime.ts:45) | idle 120s | 闲置 converter 生命周期 | 工程选择 | 否 | 不是 Chrome值 | 基本资格化；无复用/worker-tree RSS证明 | UNVERIFIED LIFECYCLE POLICY | 只在 idle回收不截断正常工作，但下次重初始化成本未测 |
| [L25 · extension/src/background/index.ts](../../../extension/src/background/index.ts:517) | 60s cached discovery promise age | 并行 discovery复用/重新启动 | 工程选择 | 否 | 否 | enrollment基本回归；无慢网络probe | ARBITRARY / UNVERIFIED LIMIT | 前一个未完成时可能再发现；不是实际停滞判据 |
| [L26 · extension/src/background/index.ts](../../../extension/src/background/index.ts:740) | 15min maintenance alarm；一次选 due[0] Course | opportunity queue启动频率/课程选择 | 工程选择 | 单课程 check安全方向；确切值未核验 | Chrome min alarm30s，不是15min | schedule单测；无队列公平性bench | ARBITRARY / UNVERIFIED LIMIT | 每次只选一门；积压、跨课程公平性未观测 |
| [L27 · extension/src/discovery/engine.ts](../../../extension/src/discovery/engine.ts:341) | content/detail depth 20 | 容器树扫描深度 | 工程选择 | 否 | 不是 Blackboard硬上限 | 有 traversal tests；未见深20边界真实stress | ARBITRARY / UNVERIFIED LIMIT | depth命中不再排children；此分支未添加 depth limit issue，可能静默漏源 |
| [L28 · extension/src/discovery/engine.ts](../../../extension/src/discovery/engine.ts:211) | attachment JSON walk depth 8 | 单个 API payload内部附件搜索 | 工程选择 | 否 | 否 | 附件解析单测；无深层stress | ARBITRARY / UNVERIFIED LIMIT | 已有 WeakSet 防cycle，额外深度直接return；可静默漏附件 |
| [L29 · extension/src/discovery/engine.ts](../../../extension/src/discovery/engine.ts:349) | 600 API responses，共用于 content/detail/announcements | Discovery总分页数量 | 工程选择 | 否 | 不是 Blackboard pagecount硬约束 | pagination行为单测；无600边界真实课程 | ARBITRARY / UNVERIFIED LIMIT | 前两阶段耗尽则announcement受影响；有LIMIT issue但容量未经证实 |
| [L30 · extension/src/v2/enrollment.ts](../../../extension/src/v2/enrollment.ts:70) | 最多10 membership pages；request limit=200 | 学期课程发现数量 | 工程选择 | 否 | 200是请求页大小，不是已证明全集上限 | 普通 enrollment回归；无>10pages压力 | ARBITRARY / UNVERIFIED LIMIT | 约2000个memberships；第10页仍有next时静默结束，无错误 |
| [L31 · extension/src/content/index.ts](../../../extension/src/content/index.ts:170) | 5,000,000 response chars | Blackboard API JSON响应大小 | 工程选择 | 否 | 否 | API路由相关测试；无容量benchmark | ARBITRARY / UNVERIFIED LIMIT | 读取response.text完整之后才检查，不保护下载峰值；抛error中断发现 |
| [L32 · extension/src/discovery/engine.ts](../../../extension/src/discovery/engine.ts:95) | handler/type拼接只保留160chars | item type判别输入 | 工程选择 | 否 | 否 | 无边界 benchmark/stress/真实边界证明 | ARBITRARY / UNVERIFIED LIMIT | 后部assignment等信号可能被丢弃；非单纯UI截断 |
| [L33 · extension/src/fetch/attachment-fetcher.ts](../../../extension/src/fetch/attachment-fetcher.ts:3) | 64MiB/attachment；header和stream检查 | 文件下载大小 | MVP provisional guard | 否 | 无 Blackboard/Chrome64MiB硬约束 | size触发单测；无64MiB边界真实stress | ARBITRARY / UNVERIFIED LIMIT | 遇大文件failed；offscreen与parse重复保护；不证明可用覆盖上界 |
| [L34 · extension/src/parser/domain.ts](../../../extension/src/parser/domain.ts:41) | 64MiB parser input | 可解析文件大小 | MVP工程选择 | 否 | 否 | SIZE_LIMIT单测；无实际边界bench | ARBITRARY / UNVERIFIED LIMIT | canonical legacy输出可能比输入大；与fetch上限并不相同 |
| [L35 · extension/src/parser/domain.ts](../../../extension/src/parser/domain.ts:42) | 500 native units / file | pages/slides/paragraphs/rows合计 | MVP工程选择 | 否 | 不是格式硬限制 | 无边界 benchmark/stress/真实边界证明 | ARBITRARY / UNVERIFIED LIMIT | DOCX/XLSX正常paragraph/row也算unit；可能比500页更早拒绝整个文件 |
| [L36 · extension/src/parser/domain.ts](../../../extension/src/parser/domain.ts:43) | 2,000,000 chars/file | 解析文本量 | MVP工程选择 | 否 | 否 | 无边界 benchmark/stress/真实边界证明 | ARBITRARY / UNVERIFIED LIMIT | 完整解析后丢units报TEXT_LIMIT；应和可分包的长文策略对齐 |
| [L37 · extension/src/parser/ooxml-parser.ts](../../../extension/src/parser/ooxml-parser.ts:11) | 64MiB/ZIPentry +128MiB aggregate inflation | OOXML解压量 | ZIP bomb safety目的 | 否 | 不是 ZIP/OS硬上限 | format回归；无正常/恶意边界压力 | ARBITRARY / UNVERIFIED LIMIT | 普通大包也可能触发；catch折叠PARSING_FAILED，失去具体限额原因 |
| [L38 · extension/src/offscreen/visual-completion.ts](../../../extension/src/offscreen/visual-completion.ts:22) | 48MiB encoded dataURL/source | 保留visual coverage量 | 工程选择 | 否 | provider48MiB是每request，非每Source | 3页probe；无大文件coverage边界压力 | ARBITRARY / UNVERIFIED LIMIT | 超额unresolved，降低覆盖；分request本可满足external48MiB却先丢页面 |
| [L39 · extension/src/offscreen/visual-completion.ts](../../../extension/src/offscreen/visual-completion.ts:38) | DOCX embedded entry16MiB；累计32MiB | 选择解压的图片 | 工程选择 | 否 | 否 | 小DOCX资格化；无边界压力 | ARBITRARY / UNVERIFIED LIMIT | filter直接拒entry，catch后genericunresolved；具体容量原因未上报 |
| [L40 · extension/src/offscreen/visual-completion.ts](../../../extension/src/offscreen/visual-completion.ts:54) | embedded图片最长边2400；PDF min(scale2,1600/w,2400/h)；Office144dpi/maxDimension2400 | 视觉分辨率 | 工程选择 | 否 | provider8192/4096实际维度上限与这些值不同 | 小格式渲染成功；无细字/表格语义质量bench | ARBITRARY / UNVERIFIED LIMIT | 页面不减少但视觉信息可能损失；覆盖locators完整不等于语义完整 |
| [L41 · extension/src/offscreen/visual-completion.ts](../../../extension/src/offscreen/visual-completion.ts:99) | Office height >8192拒绝；width/height<1拒绝 | raster可接受维度 | 工程选择 | 否 | 8192一般provider上限是有，但该处不是请求完整维度检查 | 无边界压力 | EXTERNAL ALIGNMENT PARTIAL / VALIDITY | ≥15图每边4096检查缺失；只检查height不完整；pixel0属于有效性校验 |
| [L42 · extension/src/v2/chunking.ts](../../../extension/src/v2/chunking.ts:13) | target220k / hard240k chars | 长Source技术拆分 | 工程选择 | 技术必要才拆分是；数值否 | provider有token约束；不是固定char约束 | range覆盖/chunk单测；无语义/吞吐边界bench | ARBITRARY / UNVERIFIED LIMIT | 多part顺序AI +consolidation；估算context大余量仍可能人工拆分 |
| [L43 · extension/src/v2/chunking.ts](../../../extension/src/v2/chunking.ts:15) | 800chars overlap | 技术块重叠 | 工程选择 | 否 | 否 | range回归；无重叠质量bench | ARBITRARY / UNVERIFIED LIMIT | 不丢文本但重复token与推理；不证明语义跨块完整 |
| [L44 · extension/src/v2/ai-pipeline.ts](../../../extension/src/v2/ai-pipeline.ts:378) | 24MiB single visual part拒绝；24MiB group；20images/group | physical Task A request切分 | 工程选择 | 必要分割是；这些值否 | 48MiB body/600images真实；24/20不是 | 分组行为回归；无真实分组阈值bench | ARBITRARY / UNVERIFIED LIMIT | 876visual units理论至少多批；每批重复native context，顺序调用，consolidation增加 |
| [L45 · extension/src/v2/deepseek.ts](../../../extension/src/v2/deepseek.ts:136) | 48MiB UTF8 JSON body/request | inline provider body size | DeepSeek Vision官方文档 | 否 | 是，2026-10-04核验 | 静态实现核验；未打边界付费probe | VERIFIED EXTERNAL LIMIT | 应基于完整serialized请求测量拆分；不等于整Source大小限制 |
| [L46 · extension/src/v2/deepseek.ts](../../../extension/src/v2/deepseek.ts:169) | 600images/request | 视觉输入数量 | DeepSeek Vision官方文档 | 否 | 是，已核验 | 静态核验；无边界付费probe | VERIFIED EXTERNAL LIMIT | 不会解释20images工程分组；仍需总图大小/维度一致校验 |
| [L47 · extension/src/v2/deepseek.ts](../../../extension/src/v2/deepseek.ts:169) | 32MiB dataUrl.length检查 | 单inline图像大小 | DeepSeek每image32MiB | 否 | 外部decoded image32MiB是；encoded string比较不是同单位 | 无边界probe | EXTERNAL LIMIT / IMPLEMENTATION MISMATCH | base64膨胀造成提前拒绝；24MiB builder更早阻止 |
| [L48 · extension/src/v2/invocation-policy.ts](../../../extension/src/v2/invocation-policy.ts:15) | 1,000,000 context /384,000 output | model token硬约束 | DeepSeek Models官方文档 | 否 | 是，已核验 | 静态核验；未近边界真实测量 | VERIFIED EXTERNAL LIMIT | 与估算/guard叠加后实际输出上限更低 |
| [L49 · extension/src/v2/deepseek.ts](../../../extension/src/v2/deepseek.ts:163) | 1024 estimated image tokens/part | visual context预检 | DeepSeek Vision说明每图上界1024 | 否 | 上界有明确依据 | 静态核验 | VERIFIED EXTERNAL UPPER BOUND | 保守上界不是实际token；与文本估计错误不可混为真实usage |
| [L50 · extension/src/v2/invocation-policy.ts](../../../extension/src/v2/invocation-policy.ts:45) | UTF8 bytes/2 +256 | text token预估 | 工程选择 | 否 | 不是官方tokenizer | 公式单测；无多语言估算误差bench | ARBITRARY / UNVERIFIED LIMIT | 可能误拒或低估；margin/taskguard不能证明安全 |
| [L51 · extension/src/v2/invocation-policy.ts](../../../extension/src/v2/invocation-policy.ts:37) | max(32k, context×5%) 当前50k | 预留context空间 | v0.2 provisional策略 | 否 | 否 | 公式单测；无context边界bench | ARBITRARY / UNVERIFIED LIMIT | context preflight与ceiling一起收紧；不是Provider保留token要求 |
| [L52 · extension/src/v2/invocation-policy.ts](../../../extension/src/v2/invocation-policy.ts:30) | A/consolidate96k，B/expand192k，C96k；min(provider,available,guard) | 生成token上限 | v0.2 provisional runaway guards | 否 | provider384k是；较低task值否 | 历史/当前成功样本；无runaway/边界stress | ARBITRARY / UNVERIFIED LIMIT | 总reasoning+content可能截断；fresh retry通常同一 ceiling，无法解决guard不足 |
| [L53 · extension/src/v2/ai-context.ts](../../../extension/src/v2/ai-context.ts:25) | A96k/B192k/C96k compatibility exports | 旧调用/常量接口 | v0.2兼容 | 否 | 否 | 主builders实际使用computeOutputSafetyCeiling | COMPATIBILITY EXPORT / 数值未验证 | 不要把重复常量与动态函数当两层独立保护；引用需统一 |
| [L54 · extension/src/v2/deepseek-complete.ts](../../../extension/src/v2/deepseek-complete.ts:26) | fallback96k；malformed excerpt24k chars | 未知task retry和repair回显 | v0.2 policy | 否 | 否 | repair/fresh-retry单测；无excerpt诊断质量bench | ARBITRARY / UNVERIFIED LIMIT | 当前knownTasks走动态guard；repair只看截短坏输出，可能重复schema失败 |
| [L55 · extension/src/v2/deepseek-complete.ts](../../../extension/src/v2/deepseek-complete.ts:553) | per unit initial+最多1 repair或fresh retry | physical invocation数 | failure-specific engineering policy | 有界是；exact2否 | 否 | 合同失败/transport回归；无成本/恢复率bench | ARBITRARY / UNVERIFIED LIMIT | 与workflow3次/recovery pass叠加；保留可复用成功，不以全局次数猜测替换 |
| [L56 · extension/src/v2/deepseek.ts](../../../extension/src/v2/deepseek.ts:243) | Retry-After clamp1s..60s；无header fallback1s | 429重试等待 | 工程选择 | 否 | Retry-After原值外部是；clamp不是 | HTTP error测试；无真实429恢复probe | ARBITRARY / UNVERIFIED LIMIT | provider要求更久时提前派发；scheduler再次clamp同值 |
| [L57 · extension/src/v2/ai-contracts.ts](../../../extension/src/v2/ai-contracts.ts:74) | 最多8 Evidence refs/round | Task B补证条数 | 工程选择 | 按需补证是；8否 | 否 | contract/retrieval单测；无多证据语义bench | ARBITRARY / UNVERIFIED LIMIT | 与4000chars/2rounds叠加，最多16 refs默认64kchars，可能不足身份判断 |
| [L58 · extension/src/v2/evidence-retrieval.ts](../../../extension/src/v2/evidence-retrieval.ts:44) | slice前8；default/max length4000chars | 检索实际返回条数/文本范围 | 工程选择 | 否 | 否 | range/truncated单测；无容量bench | ARBITRARY / UNVERIFIED LIMIT | production contract先reject>8但helper单独调用可silent丢；截断有truncated但无法增加length |
| [L59 · extension/src/v2/workflow.ts](../../../extension/src/v2/workflow.ts:1304) | Task B2 expansion rounds；helper也MAX_TASK_B_EXPANSION_ROUNDS=2 | Task B调用数与证据总量 | 工程选择 | logical B session是；2否 | 否 | 扩展/合同单测；无真实B多轮evidenceprobe | ARBITRARY / UNVERIFIED LIMIT | 2轮仍请求证据即AI_CONTRACT terminal；不是graceful Uncertain自动保证 |
| [L60 · extension/src/v2/ai-pipeline.ts](../../../extension/src/v2/ai-pipeline.ts:367) | A=所有text chunks ×各visualgroups；parts>1再1 consolidation；B=1+≤2 expansion；C=1 | 隐式 invocation模型 | 任务职责 +工程拆分 | 任务职责是；人为多分组否 | 必要request硬限制是 | builders/workflow单测；真实还未完成B/C | PRODUCT RESPONSIBILITY / SPLIT UNVERIFIED | 各physical最多2次，workflow/recovery更放大；无全局course调用硬cap |
| [L61 · extension/src/v2/activity.ts](../../../extension/src/v2/activity.ts:79) | reasoning/content各1200chars rolling buffer；redacted尾600；最多3 snippets合计600；200ms节流 | 仅Activity显示 | IA§3授权少量/截断/隐藏内部ID | 行为是；具体数值否 | 否 | 独立channel+mixedJSON回归，双surface browser通过 | DISPLAY POLICY / 数值未验证 | 不影响课程事实；旧合并buffer遇sourceId整行删reasoning；新独立buffer已存在 |
| [L62 · extension/src/app/app.css](../../../extension/src/app/app.css:1643) | Activity max-height12em overflow hidden | 可见行数 | IA轻量Activity；工程CSS | 方向是；值否 | 否 | 合成截图；真实持续可见性未量化 | DISPLAY POLICY / 人工验收待办 | 600chars可被12em额外剪掉；不是完整reasoning记录 |
| [L63 · extension/src/v2/qa-telemetry.ts](../../../extension/src/v2/qa-telemetry.ts:54) | session trace尾6000 events；string120chars；重复相同event+fields去重 | 可恢复运行证据容量 | QA工程选择 | 否 | Chrome session配额外部，但6000/120非配额值 | 基本telemetry回归；无大trace配额stress | ARBITRARY / UNVERIFIED LIMIT | logicalUnitId截断可碰撞，不能靠它精确配对包；丢旧event无droppedcount；会削弱审计 |
| [L64 · extension/src/v2/qa-telemetry.ts](../../../extension/src/v2/qa-telemetry.ts:238) | monitor最后10 events；rawstream只传在线UI | QA显示/历史 | 工程选择 | QA非产品 | 否 | QA browser基本回归 | DISPLAY POLICY / UNVERIFIED | 不是持久化完整账本；不能用monitor画面证明历史concurrency |
| [L65 · extension/src/v2/view.ts](../../../extension/src/v2/view.ts:441) | 每组preview前三条；PROSE_LIMIT180折叠（展开完整） | 课程卡片/文本预览 | 既有interaction behavior | 预览/展开是；数值未独立核验 | 否 | view/render单测+screenshots | DISPLAY POLICY | 不改存储事实；必须与真正语义截断区分 |
| [L66 · extension/src/v2/migration.ts](../../../extension/src/v2/migration.ts:255) | 400chars excerpt；workflow legacy constraint name120chars | 迁移证据摘要/legacy标题 | v0.2迁移工程策略 | 否 | 否 | migration回归；无截断质量bench | ARBITRARY / UNVERIFIED LIMIT | migration后source-derived内容不是仅临时UI；需核对是否保有原完整可溯源内容 |
| [L67 · extension/src/v2/blackboard.ts](../../../extension/src/v2/blackboard.ts:105) | structure label40chars | native结构label | 工程label策略 | 否 | 否 | HTML structure单测；无长重复labelbench | ARBITRARY / UNVERIFIED LIMIT | 完整text保留，但label冲突可影响chunk边界定位 |
| [L68 · extension/src/v2/calendar-export.ts](../../../extension/src/v2/calendar-export.ts:46) | constraint title80；filename60chars；ICS writer75octets折行 | 导出摘要/文件名/ICS行 | 前二工程；ICS RFC5545 | UI/导出行为已基线；80/60未独立授权证明 | 75octets RFC折行是格式规则 | calendar regression | DISPLAY POLICY / FORMAT | 80/60不是事实存储截断；ICS折行不丢内容 |
| [L69 · extension/src/v2/restore.ts](../../../extension/src/v2/restore.ts:57) | 64MiB backup /depth32 /250,000 records | Restore可接受全集 | 反异常输入safety目的 | 原子restore安全是；数值否 | 非Chrome/JSON硬上限 | size/depth/count注入单测；无正常大备份bench | ARBITRARY / UNVERIFIED LIMIT | Export无同等限制，可能导出自己的备份却无法restore；trigger显式BACKUP_INVALID但正常容量未证 |
| [L70 · extension/src/v2/opportunity.ts](../../../extension/src/v2/opportunity.ts:35) | 6/12/24h check；failure5min/30min/2h；3fail或72h freshness | 后台维护与freshness | v0.2策略 | 本次未找到exact值当前授权 | 否 | schedule单测；无真实长期运行bench | ARBITRARY / UNVERIFIED LIMIT | 15min alarm/oneCourse再叠加；不应影响前台Initial Scan |
| [L71 · extension/src/v2/screens/mount.ts](../../../extension/src/v2/screens/mount.ts:19) | notice4s/action7s；view retry1.5s；activity reconnect1s；restore stage450ms | UI显示/reconnect | 交互工程选择 | 行为是；exact值未核验 | 否 | browser/render基本回归 | DISPLAY/LIFECYCLE POLICY | 不限制课程处理量；notice可能在人读完前消失；UI reconnect不能重跑模型 |
| [L72 · extension/src/v2/store.ts](../../../extension/src/v2/store.ts:45) | sources/history/aiRuns/evidence无数量cap；snapshot getAll；cache无TTL；fingerprint匹配才复用 | 隐式存储/缓存容量 | durable local-first | 已成功结果复用是 | IndexedDB实际配额/磁盘是；未量化 | cache/stale/restore单测；真实18cache hits | NO FIXED CAP / RESOURCE RISK | 可能随历史增长增加内存/读时；不能未测量新增历史数量cap |
| [L73 · extension/src/v2/deepseek.ts](../../../extension/src/v2/deepseek.ts:158) | SSE拼接完整content/reasoning；无buffer硬上限 | stream响应内存 | transport工程实现 | streaming行为是 | 受output/model与浏览器实际内存约束 | SSE回归；无384k×多并发RSSbench | NO FIXED CAP / RESOURCE RISK | outputguard不等于memory证明；Activity1200buffer不控制transport完整buffer |
| [L74 · backend/src/config.ts](../../../backend/src/config.ts:35) | 默认10requests/min；100k installation usage；1M global usage；5registrations/h | 历史proxy usage/registration | MVP保护要求；exact默认工程值 | 保护方向历史有；exact值未证 | 不是DeepSeek限制 | backend guard单测；无容量/成本bench | ARBITRARY / UNVERIFIED LIMIT | 当前v3直连BYOK未走该proxy；不得用它解释本轮Task A失败 |
| [L75 · backend/src/providers/deepseek-client.ts](../../../backend/src/providers/deepseek-client.ts:60) | 30s/request；429/500/503最多2 physical calls，立即retry无backoff | 历史proxy时间/重试 | MVP工程策略 | 否 | 不是Provider硬约束 | backend mock回归；无真实边界压力 | ARBITRARY / UNVERIFIED LIMIT | 与MVP normalize24k batches/usageguard叠加；不是当前v3执行路径 |
| [L76 · extension/src/normalize/normalizer.ts](../../../extension/src/normalize/normalizer.ts:59) | 24kchars batch；单unit超出直接error；旧pipeline串行batch | MVP normalize/extract | MVP provisional工程策略 | 否 | 否 | normalizer/client回归；无容量bench | ARBITRARY / UNVERIFIED LIMIT | 保留历史代码，当前v3main不使用；解释跨版本为何会fragment/fail |
| [L77 · extension/src/recovery/lease.ts](../../../extension/src/recovery/lease.ts:6) | 旧scan lease45s/heartbeat15s | MVP旧worker ownership | stale safety | 方向是；数值否 | 非Chrome值 | lease单测 | SAFETY CANDIDATE / LEGACY | 当前v3使用workflow lease10min，不能混淆两套执行路径 |

| L78 · `node_modules/@matbee/libreoffice-converter/wasm/soffice.js` | dependency 默认 INITIAL_MEMORY=1,073,741,824 bytes；shared memory maximum=65,536×65,536 bytes | WASM linear memory 默认/最大值 | pinned dependency runtime 实现 | 否 | 是该依赖实际默认配置；不是浏览器所有任务通用容量 | 只读源码提取确认；没有 RSS/worker-tree 压测 | VERIFIED DEPENDENCY CONFIG / RSS UNKNOWN | 不能把1GiB初始linear memory说成当前RSS；多实例的实际资源成本待测；不支持把所有PDF与AI串行 |
| L79 · `extension/src/app/app.css:219,256` | QA trace max-height min(46vh,440px)、stream160px；overflow auto | QA console可见区域 | QA布局工程值 | 非产品 | 否 | 合成UI回归；无容量证明 | DISPLAY POLICY | 可滚动，不截断课程事实；与QA trace尾6000不同 |

### 6.3 Task A 的实际运行模型与证据

```text
Discovery（API sequential traversal / persisted metadata）
→ Fetch + Parse（每 step 一个 Source；所有 ingest 后进入 A）
→ File-package admission（active cap + text weight）
→ Visual Completion（全格式 render slot 1；Office 内部另有串行 queue）
→ Payload admission（192MiB 估算；等待时仍占 render slot）
→ Technical parts（text chunks / visual groups，包内 sequential AI）
→ Validation（per-call initial + ≤1 repair/fresh retry）
→ AiRun immediate cache（成功 physical/logical unit 结果）
→ File consolidation（parts>1）
→ Drain all packages → ordered staged commit / failed-source recovery pass
→ Task B（当前快照尚未进入）
```

本次只读快照：**2026-10-04 19:03:45 Singapore**。`.tmp/v030-global-limit-runtime-metadata.json`
只保留投影后的状态、数字、时间与脱敏trace，不输出credential、课程正文、prompt、model原始reasoning。
该本机临时文件含内部identifiers，不同步Drive。汇总由
`.tmp/v030-summarize-limit-runtime.py` 从 metadata 与既有 private QA events 重算。

| 指标 | 当前已有证据 | 边界 |
| --- | --- | --- |
| Sources / logical packages | 117 Sources：7 announcements、75 content items、16 assignments、19 attachments；最多117个主逻辑包 | package admission/completion缺事件；不能把117全当已完成包 |
| Native / visual workload | attachments共880 native units，其中876 partial/visual-gap units | 876不是已完成render的独立pages证据；actual rendered pages/encoded bytes缺事件 |
| Workflow state | working / task-a，attempt=0（手动恢复后计数重置）；尚无B/C run | 不是complete/Human acceptance |
| 成功缓存 | 同workflow139 AiRuns：134 A、5 consolidation；111 distinct source IDs有至少1成功AiRun | 不是111个文件完整成功；recorded source understanding目前7 complete/3 partial，ordered barrier尚未提交全部 |
| 近期physical requests | 18:53:38起至19:03:12结束的139 completed A-family physical calls：135 A、4 consolidation | 完成区间峰值是已完成请求的下界；尚在进行的调用未纳入 |
| 成功/失败 | 117 physical validated success；22 schema failures；120 initial、19 repair | 139是近期physical量，不等于139 persisted AiRuns全来自该时间窗 |
| 网络失败 | 此近期trace中0 transient physical failures；未见429 | 不能据此解释或排除早先Failed to fetch根因；旧中间trace未保存在当前文件快照 |
| **实际模型并发** | 根据每条physical记录 `end=event.at, start=end-latencyMs` sweep-line；end先于同刻start；**peak 12** | 是模型调用，不能冒称actual file packages=12；latency包括transport/stream/validation时间 |
| 前后时间段 | 按completed event分窗：18:53:38–18:59:31有28completed/peak3；之后111completed/peak12 | 跨窗调用用完整interval计算；用于诊断变化，不能因相关性认定唯一瓶颈 |
| 附件与其他Sources分开计算 | 当前29个 attachment A completed calls **peak4**、耗时合计1000.479s、median24.349s；其他106个A **peak10**、合计1092.014s、median4.023s；4 consolidation合计150.096s | 按logicalUnitId的attachment前缀分类，不靠被截断ID匹配part；这是physical请求，不是文件package start/end；全体peak12不能冒称附件达12 |
| scheduler limit | trace允许值10→11→12→…→18 | limit18不是18 active文件，也不是18模型请求 |
| 请求耗时 | min1.536s / median10.299s / p95 54.937s / max102.170s | 对近期139已完成物理调用；与旧12成功调用46s median不同，不能混用 |
| 模型时间组成 | 调用耗时加总2242.589s≈37.38min；区间并集568.991s≈9.48min；观测窗口573.820s≈9.56min | 加总不能作为wall-clock；均值在途占用约3.91，峰值12不意味着持续10–25 |
| 已成功结果复用 | 同trace18 `qa.ai-cache` hits | 成功结果复用已证；渲染/指纹计算可能仍重做；未做本轮新网络恢复probe |
| 初次announcement运行 | 既有private snapshot8physical：7成功/1schema；interval peak7 | 只能证明announcement并发；未证明附件并发 |
| Discovery时间 | 第二scan `scan-started`07:11:52.987 → `discovery-sources`07:12:10.951，约17.964s | 包括启动/调度间隔；没有API子阶段计时 |
| Fetch/Parse时间 | 该scan保存114 source-read events，07:12:11.063–07:12:44.687，约33.624s；A首请求07:12:44.813 | 不是117全量独立fetch/parse耗时；这两个阶段合并，无bytes/parse起止；不能分摊 |
| Visual/queue/backoff/idle | 没有render start/end、resource wait/release、active packages、网络backoff区间与scheduler idle reason | **MISSING REAL DATA**；不能用两次模型请求间隙当render耗时或scheduler idle |
| Retry history | 当前19 repair physical events；近期snapshot0fresh-retry；此前workflow到过attempt3并失败 | 手动RetryTask reset0；完整历史retry/backoff不能由最新attempt还原；2h档不可达问题另列 |

旧一次只读诊断曾观察附件physical peak1及大量 `Failed to fetch`（会话中的297 attempts/276 fetch failures）；
这批中间session trace没有作为独立metadata归档，不能与本次454-event snapshot拼接成完整账本，
也不能将其旧wall span当本轮model runtime。初始private snapshot273 events只覆盖早期阶段。

重要修正：**dynamic 10–25的真实文件包目标仍未获得严格证据**；已证全体模型峰值12、附件A模型峰值4，
但近期窗口均值占用约3.91、早段峰值3，以及缺文件包telemetry，都不支持宣称吞吐目标已达成。

### 6.4 主要耗时与组合风险

已测近期调用工作量中，附件A约16.67min、其他A约18.20min、consolidation约2.50min是累计service time；
它们重叠，不能直接相加作为课程wall-clock。render与queue缺数据，仍无法完整分摊总耗时。

1. 旧4M/page ×8M admission是未经测量的weight，3个visual units即超budget；大文件独占。
   当前代码虽已改为text×2，仍保留8M估算总量，容量依据没有恢复。
2. 新render=1 +payload192MiB×3估算+payload释放到consolidation后：render等待payload时占槽，
   网络慢可阻塞所有后续render；这就是CPU/renderer保护与AI concurrency耦合。
3. 每文件48MiB保留上限会在provider48MiB/request之前丢coverage；24MiB/20图分组再放大physical calls。
   图片必须按实际请求体/外部dimension/token限制规划，不能减少页数“提速”。
4. package parts串行+人工分组+同文件consolidation+全A barrier，使慢文件、重复native context、
   schema repair共同贡献长尾。近期22schema failures/19repair已实际增加调用；不能只归罪网络。
5. 历史普通Failed to fetch被当pressure且不是fatal，使整queue继续失败；现代码fatal方向已修，
   仍需小规模outage probe，禁止用新重试次数或猜测总时间cap替代。
6. 一个会话没有progress/stall/queue事件，就无法把wall span分为工作、用户等待、离线、worker恢复、
   backoff和scheduler idle；先补观测，不能把缺证据的间隙填成“内存不足”。
7. depth8、depth20、membership10pages存在静默跳过；OOXML/PDF partial常丢具体guard原因；
   Provider Retry-After被截到60s可能提前dispatch；Export/Restore容量不对称。这些应作为跨链问题整改。

### 6.5 Proposed fix / 删除、修改、保留依据

**本次尚未实施以下方案，也未选择新固定数字。**

- 删除：4M/page方案、8M估算weight admission、192MiB新预算；删除对所有格式一刀切render槽。
  不用另一个固定预算替换。资源等待与模型请求独立；PDF逐页产物流转和实际encoded bytes可观测。
- 修改：只对经证实非重入的converter实例维持局部互斥；render结果不要无限堆积，按消费进展
  和实测memory/queue压力背压。浏览器不提供可靠RSS时明确unknown，先probe；不得伪装精确内存估计。
- 修改：以实际完整serialized request字节、decoded image大小、dimension、providertoken边界进行必要分割，
  保留所有locator、text range与file identity；消除20页/24MiB人为分组，保留必要consolidation。
- 修改：网络failure暂停新admission，drain在途calls、立即缓存成功；恢复只补失败单元。
  有明确Retry-After按原值等待；没有时按网络状态/恢复probe而非把所有错误当quota pressure。
- 修改：绝对请求/operation截止改为可解释stall与lifecycle保护；任何watchdog必须有触发原因、
  progress/heartbeat、cleanup/cancel、未完成coverage证据。300s、90s、30s等未验证值不能换成猜测新值。
- 保留：真实provider request/context/image硬约束、ownership/generation/idempotency、trusted-state
  safety、成功缓存、独立reasoning/content buffers、Activity非持久化和必要脱敏。具体显示长度不等于产品容量。
- 拆开验证后再改：parser500units/2Mchars、fetch64MiB、ZIP保护、evidence8×4000×2、Restore容量。
  防无限循环/ZIP bomb机制需要保留，但必须证明正常workload不命中、无静默丢弃；不能一口气全部删掉。

### 6.6 验证顺序与尚缺数据

先使用既有本地小文件/合成payload，不跑876visual-gap整课、不新增昂贵全课程请求。

| Probe | 输入与注入 | 通过证据 |
| --- | --- | --- |
| 多文件/visual→AI overlap | 复用本地3页PDF，加几份不同大小合成PDF/Office；真实hidden offscreen；可控延迟stream provider | package active、render active、AI active分别有start/end；不同文件request intervals真实重叠；慢AI不占render锁 |
| 压力与分包 | 相同内容不同bytes/页数、慢renderer、峰值资源采样；只在真实provider硬边界切分 | locator/text范围100%守恒；request actual bytes正确；不以页数限制提前切或skip；不能只断言某个数值等于常量 |
| network outage→recovery | 部分成功后可控fetch断网，恢复；不对真实课程触发 | 新dispatch停止，已admitted有界settle；无queue失败风暴；成功idempotency+fingerprint结果不再发physical请求 |
| reasoning+JSON sanitizer | reasoning后minified JSON含sourceId，两个surface | reasoning持续保留；JSON内部字段不泄漏；buffer独立、不额外AI调用、不落盘 |
| worker eviction / stall | 不挂debugger条件下evict、持续慢但有progress、真正stall | progress不因猜测绝对窗失败；abandoned work可恢复；有原因telemetry与cleanup；不重复已成功paid结果 |
| coverage与false success | 超大/deep/paginated/evidence请求边界合成样本 | 无silenttruncate/skip；触发要有明确限额/未完成范围；限制未成为正常容量上限 |

已有505-test CI与双surface mixed-stream browser回归证明最近实现的逻辑行为，不证明No Arbitrary Limits整改完成。
本轮不重跑无关CI/整课；下一轮针对上述probe测量通过后修改，再跑requiredCI、reload并刷新NTUtabs，
最后只恢复原失败workflow，不新建scan、不删cache、不给覆盖范围缩水。

仍缺：文件包in-flight、actual visual pages/bytes、render/Office时间、各阶段queue等待、memory peak、
无debugger生命周期、网络失败底层Chrome原因、旧中间trace完整history、真实B/C与语义质量。
近期0网络失败不构成修复网络根因；111个有成功cache的Source不构成完整理解通过。

### 6.7 长期治理落点（修复完成后执行）

现有 `docs/project-governance.md` 增加 **No Arbitrary Limits / No Unverified Capacity Limits**
长期工程规则，`AGENTS.md`保留薄入口并指向该节，不建临时规则文档，不重写历史版本事实。
规则来源是Product Owner本次明确指令：仅允许Product、可验证外部硬约束、实测边界、必需safetyguard；
每个guard记录来源/单位/触发telemetry/正常workload证据/叠加影响，禁止silenttruncate/skip/fail。
修复后同步现有TechnicalDesign与EngineeringReport状态、证据及remainingrisk，不把proposed当已交付。
本审计文档尚未同步Drive；后续按明确ChangedFiles定点同步，不扩展同步范围。


## 7. Accepted audit → runtime repair (2026-10-04)

本轮授权为按风险修复，不是删除全部限制。Section 6 的 inventory 保留为修复前基线；本节记录
实际变化，未列出的条目继续保持原审计状态。

- P0：parser 默认 500 units / 2M chars 撤销；Discovery 无默认 600 responses / 20 container
  depth / 8 JSON depth；迭代完整遍历、visited/cursor guards 保留。Enrollment 无 10-page 截断，
  repeated cursor 返回 typed failure。Evidence 无 8×4000×2 默认容量，按完整文本/范围处理，
  no-progress guard 按字符 coverage 检测。Restore 默认无 64MiB/32-depth/250k-record 非对称容量。
- Pipeline：撤掉 estimated package weight、192 MiB global payload budget、global render slot。
  Render / AI / consolidation 生命周期独立；共享 Office converter 仅实际操作互斥。
- Request：planner 与 transport 使用同一完整 UTF-8 JSON serializer；仅官方 inline boundary 分组，
  记录 split reason，全部 locator/text 保留；text body 超限进行连续 range split。
  Transport 不再用未经验证的 tokens estimate 拒绝请求；未猜测新内存数字。
- Recovery：网络失败停止新 admission，保留已成功 physical results；Retry-After 不再截到 60s。
  Telemetry 明确第一失败层。Reasoning / content 独立 buffer 回归保留。
- Real blocker：原 workflow `wf_2c80f73f2ae805c80fdb0a74` 在旧代码下停于 Task A / saved /
  INTERNAL，detail 为 EVIDENCE_UNKNOWN_SOURCE。Nested Evidence 先前没在 schema boundary
  验证，导致缓存坏结果；新增 nested validation 进入 repair，缓存复用前重新校验。

### Controlled probes

`node scripts/v030-runtime-probe.mjs` / `artifacts/v0.3.0/runtime-repair/REPORT.json`：
真实隐藏 MV3 offscreen PDF renderer + production scheduler/request builder/transport + mock provider。
6 files × 3 pages，18/18 visual locators 保留，native text conserved；实际峰值 package=3、render=3、
AI=3，render 每次在请求前结束，后续 render 与已有 AI 重叠，总耗时 3018.8ms。Activity reasoning
在内部 JSON 输出后保留。Synthetic concurrency=3 是 probe 条件，不是新的 production limit。

Unit probes：601 paragraphs / >2M characters conserved；>600 Discovery responses / 25 container
levels / 30 JSON levels complete；12 enrollment pages complete + repeated cursor explicit error；
12 Evidence refs × 6000 chars full；>2 Evidence rounds continue；overlapping no-progress detected；
Export→Restore 250002 Evidence records complete；35 small images one request；two 25MiB encoded
images split at actual 48MiB envelope boundary；first success survives network recovery without
repeated physical call；fatal network admission stays within already-admitted window.

Full CI and real resumed-course evidence are recorded below when observed. Controlled probes do not
establish large-course speed or final acceptance.

### Remaining risk

No measured RSS-based scheduling yet; removing guessed weight is not proof of memory safety for
25 simultaneous very large files. Shared Office WASM still serializes converter use. Office timeout,
parser byte/ZIP guards, output-token guards, absolute Provider deadline and workflow retry schedule
remain audited/provisional, not verified Product capacity or external constraints. Provider context
rejection beyond the inline body boundary remains explicit failure; general context-aware adaptive
continuation for every AI task is not qualified here. Do not claim all 79 audit entries resolved.


### Integration gate / first real recovery observation

`npm run ci` PASS：493 extension + 20 backend + 2 contracts = 515 tests；format/build/type/lint/
manifest/secret/docs/readme/QA separation 零失败。`v030-browser-check.mjs` PASS 5 checks，包含
reasoning + internal JSON 后两个 Activity surface 仍显示 reasoning。

第一轮原 workflow recovery 于 11:50:26Z 开始，observed package peak 11、render-request peak 11、
physical AI peak 1，cache hit 13 / invalid-contract 1。render-request span 包含共享 Office 排队，
不是 11 个实际 converter。11:50:43Z 后 trace 停止增长；worker 后续 timeOrigin=11:53:51Z，
说明原 owner 已消失但 persisted workflow 仍 working。不可把这轮记录标成性能 PASS。
补充了活动期间官方 MV3 heartbeat（见 Technical Design），需要独立 idle-window probe 后恢复。
Private metadata-only observer 位于 `.tmp/v030-runtime-repair-*`，不进入 Drive；公开 aggregate
仅进入本 Engineering Report / synthetic artifacts。继续保留该失败作为跨层 runtime evidence。


### Real recovery evidence and subsequent logic closure

Aggregate: `artifacts/v0.3.0/runtime-repair/REAL_COURSE_RUNTIME.json`。12:00:26.842Z →
12:02:40.098Z，Task A 133.256s；结果为 **FAILED_AI_CONTRACT / NOT PERFORMANCE PASS**。
117 source packages 开始/结束，峰值17、平均7.60；其中19 attachment file packages 实际峰值11，
不是17个文件。Physical AI峰值7、平均2.88；10次 physical calls，latency median36.9585s /
P9561.158s；5次成功、3次invalid-json、2次schema，3次repair；consolidation0；cache hit110、
invalid-contract1。Network / Provider rejection均0。Package admission wait median72.6198s /
P9573.5871s。18个render-request spans峰值11、sum402.691s，包含Office排队，不能当实际converter
utilization。117 Sources / 880 native units不变，876 visual gap locators全部交付，unresolved0，
实际PNG编码293740528bytes；没有减少课程、文件或页面来提高速度。

此前失败运行的观察窗口9.56min，A-family完成区间peak12/平均3.91，latency median10.299s /
P9554.937s。两个窗口的cache/input/state不同，不计算完整课程speedup。新观测证明附件并发、
全部视觉覆盖和worker继续存活；它没有证明完整Task A成功。Office wait当时因offscreen API限制
未记录，此缺口已在后续修复，需下一次真实测试重新采集。

Product Owner随后要求：先修复逻辑问题，再重新进行真实测试。本 workflow 停在 failed，保留
所有已成功结果；不再自动或手动启动真实课程测试。

后续逻辑修复：

- JSON repair 取消24000-character excerpt截断，提供完整失败响应和安全的语法类别/字符位置；
  不增加repair次数，不猜测新容量，修复请求继续受完整serialized Provider body约束。真实最后
  一个无效输出3380chars、对象头尾完整、语法位置1754，不能靠提高输出token数诊断为截断。
- 成功文件包checkpoint附着到已有physical AiRun，不制造新API调用/usage记录。复用需同workflow、
  Source/native representation、prompt/schema/output configuration、renderer policy fingerprint一致，
  重验schema和全部gap定位符；可跳过成功包的渲染、请求和consolidation。renderer/mapping语义变更
  必须更新package policy revision；旧无checkpoint结果仍走原physical fingerprint复用。
- Empty renderer不再因为unresolved=[]而恢复Partial：必须逐项交付全部目标定位符。Canvas PNG
  copy后释放backing store；PDF失败cancel render，finally清理canvas/page/document。
- Stream disconnect与premature EOF明确归为NETWORK_TRANSIENT，触发停止admission；HTTP成功不等于
  body/stream完整。Provider malformed frame与网络失败区分。Physical requests用安全packageUnitId
  连接到包，避免长logicalUnitId显示截断影响精确关联。
- Offscreen只暴露runtime，Office wait metadata通过scrubbed runtime message送后台唯一writer。
  真实隐藏Office probe已证明wait到达session trace；release build仍删除完整QA layer。
- Evidence no-progress按原始字符覆盖检测，初始化已供应Evidence，returned-excerpt alias不能通过
  换ID制造新进展；不是恢复一个固定轮数限制。

`WORKER.json`：独立55s idle probe未附着worker debugger，无轮询/消息；有保护任务55006ms同worker
完成，无保护对照未完成。Office三个synthetic legacy formats全部PASS，Office wait已到后台。
PDF pipeline和两个UI surface回归PASS。最终CI结果以当前Implementation Plan gate记录为准。
真实课程仍待下一轮验收；当前不宣称整个v0.3或全部audit条目已通过。


### Final offline gate after Product Owner's stop-before-retest direction

`npm run ci` PASS，497 extension / 20 backend / 2 contracts = **519 tests**，零失败。
完整pipeline probe PASS（6 files/18 pages、实际package/render/AI peaks3、handoff后释放render、
render/AI overlap）；Office三个真实隐藏synthetic格式与runtime telemetry转发PASS；两个Activity
surface regression PASS；55s worker positive/negative probe PASS；cache retry同时断言成功文件不
重复render和不重复Provider调用。Empty-render覆盖、full-response repair、stream EOF/disconnect、
已供应Evidence/alias no-progress的回归均PASS。

最新代码只在canonical local repo；当前没有提交/push/release，没有递归Drive操作。按本轮最新
指示，下一轮真实测试尚未启动，原failed workflow与全部成功数据保留。Offline逻辑验证通过
不等于真实课程完成或大文件/RSS压力边界已验收。

## 8. DA-001 Source Triage — 2026-10-05

### 8.1 实际实现与 regression

原生 capture / parse 后、File Understanding / render / Task A 前新增独立 AI Source Triage。Local 只生成 profile、校验 schema / exact coverage / evidence field reference 与 conservative routing，不按标题或目录语义判断。只有 HIGH TEACHING_ONLY 停止；UNCERTAIN / MODERATE / LOW 保守进入。Source identity、完整 native 数据、fingerprint 和 provenance 留在 inventory；B 的 context/catalog/retrieval 使用同一有效 routing。

Checkpoint 使用 profile、hierarchy parent fingerprint、policy / prompt / schema identity；Check policy 变化会重新 Triage。AiRun 保存已验证完整 batch，能补回中断的 Source checkpoint；成功 matching record 优先，失败记录不遮蔽成功结果。未改变用户可见 phase / Review；Triage 不接入 A/B/C Activity snippet，也不发 Vision。

Profile v2 为 Blackboard 确定性 native 字段、首尾自然句、原生 unit outline、结构计数和父正文样本；明示采样/省略而非把 sample 当全文。没有固定 Source / page / chars batch cap；只按 production serializer 实际请求边界拆分。输出上限直接来自已核验 Provider 边界，未增加猜测式内存/超时/重试上限；继承 transport / failure-specific repair 的历史风险，不把它们重新包装为已经证明的产品容量。

PDF 针对无绘制/clipping 与可证明整页背景/边框移除 false-positive；未知 vector/shading、image/scanned、pattern/transform、文字覆盖保留 Partial。全部 native text ranges / unit identity 保留。没有宣称所有装饰都可机械识别，也没有重解析 876 页。

`npm run ci` 全部 PASS：537 tests = extension 515 / backend 20 / contracts 2，build、typecheck、lint、format、manifest、secret、docs、README 和 shipped/QA separation 零失败。日志 `.tmp/v030-triage-final-ci-2.log`。Triage 8 tests、PDF 5 tests、workflow 34 tests 覆盖 conservative routing、无 render、policy invalidation、B catalog 与中断 batch reuse。`node scripts/v030-triage-check.mjs --self-test` PASS。QA final reload / refresh 结果见出站 Handoff。

### 8.2 Targeted real-model evidence（独立于 full course）

仅读取当前课程已保存 metadata / native samples，未 Discovery、Fetch、Task A 或 Vision，未创建/恢复真实 workflow。最终 evaluation `triage_eval_597712d26cf21b0b990b296a`，UTC 2026-10-04T16:21:10.190Z–16:23:17.968Z（Singapore 2026-10-05），wall-clock **127.778 s**。

| 结果 | HIGH | MODERATE | LOW | 总计 |
| --- | ---: | ---: | ---: | ---: |
| PRODUCT_RELEVANT | 27 | 32 | 0 | 59 |
| TEACHING_ONLY | 0 | 13 | 35 | 48 |
| UNCERTAIN | 0 | 0 | 10 | 10 |

117 输入 / 117 输出，精确 coverage。1 logical batch / 2 physical calls；初始 87.896 s，schema failure 后 repair 38.688 s 成功；repair 1，network / provider failure 0。两条样本不能代表常态 P95。输入 148,995 tokens，输出 41,878，reasoning 18,347；cache hit 68,480 / miss 80,515。未核验 pricing，因此 cost unavailable，不能写零费用。初始请求前 profile/init 约 1.196 s，主要 wall-clock 来自模型初始响应与修复。

早期 profile v1 evaluation 保留：55 PRODUCT / 62 UNCERTAIN / 0 TEACH，79.625 s。发现 native JSON wrapper 和完整结构 label 列表稀释语义样本；修正确定性 profile assembly 后执行上述 v2，并未降低 HIGH routing gate。两轮是 Triage-only probes，不是课程性能 rerun。

逐 Source classification / confidence / reasonCode / evidenceUsed 以隐私 alias 存入 `artifacts/v0.3.0/source-triage/REPORT.json`。真实 identity/profile/raw output 私有证据 `evidence/private/triage_eval_597712d26cf21b0b990b296a.json`；不写入 Drive / Git。可用 `node scripts/v030-triage-check.mjs --evaluation triage_eval_597712d26cf21b0b990b296a --report artifacts/v0.3.0/source-triage/REPORT.json` 只读重建 aggregate；`--start` 才会另发模型调用，不在本轮再次使用。

### 8.3 Scope projection 与 Product 判断

当前 **0 HIGH TEACHING_ONLY，因此 0 排除、117 Sources 全部继续；19 附件 / 880 native units / 876 历史 visual-gap units 不变**。876 为旧 parser 观测，不是新 parser 实测；post-repair real-parser gaps 未知，不能估算为零或宣称减量。

19 附件中 12 PRODUCT/HIGH，7 TEACH/MODERATE。六份 Lecture 1–3 PDF 的 native outline 实际包含 assignment、marking、submission 等产品信息，AI 判 PRODUCT/HIGH，共 522 units/gaps。四份 Lecture 4–5 PDF 判 TEACH/MODERATE，共 280 units/gaps；两份 Literature Review PDF 各 15，共 30 gaps；一份 XLSX 4 units / 0 gaps。这七份 TEACH/MODERATE 合计 314 units / 310 gaps，按已批准规则仍不得排除。分类来自 AI native evidence，未按文件名/父目录硬编码。

未观察到重要产品 Source 被 HIGH TEACHING_ONLY 排除，但因 HIGH teaching 为零，真实排除 precision / recall **尚未得到验证**。本轮不能证明 Triage 减少 Task A / visual 工作量；Triage 本身增加约 128 s 的观察开销且需要一次 schema repair。Product 应先评审 conservative scope / confidence 是否符合方向，再授权后续行动，不能自行改 threshold 或通过猜测 limit / 目录过滤制造收益。

### 8.4 Gate / remaining risks / shared state

全课程和新课程 cold-start 均未启动；历史 failed / USER_PAUSED_VALIDATION workflow、成功缓存和 evidence 未删除/重置。当前完整真实课程、实际新 parser gap 比例、Triage HIGH 排除质量、整链路吞吐/费用/Review burden 仍未验证；不能给 Real-course PASS。

No Arbitrary / Unverified Capacity Limits 长期规则已在现有 `docs/project-governance.md`，本轮连同已授权 17 旧 scope gaps 定点同步。实际 Changed Files / Outbound Sync Scope、HEAD/dirty、copy/unchanged/conflict 与镜像一致性仅由现有 `CODEX_TO_CHATGPT_HANDOFF.md` 记录。不创建临时规则/spec/Handoff；不 commit / push / tag / release。

## 9. Parser-only real measurement 与 Product Direction Review checkpoint

### 9.1 正式测量事实

P2E-005 授权范围仅既有 19 attachment Sources。由现存 Source/provenance 建立 exact manifest；19/19 原始附件经已登录 QA session 定点取得，每个 SHA-256 与既有 Source contentHash 全部一致。正常 NTU Learn→Blackboard→文件 CDN 交付，不执行 Discovery、目录遍历、其他 Source Fetch 或课程 workflow。原字节仅保存本地 `evidence/private/v030-parser-measurement/`，不写入 Drive / Git / 产品 Source 状态。

当前最新 `parseDocument` 在这些 bytes 上重新执行，只取 native text / units / PDF operator list；没有页面 rasterization / Vision / 模型。

| 指标 | 历史 parser | 最新 parser-only measurement |
| --- | ---: | ---: |
| 附件 | 19 | 19 |
| Native units | 880 | 880 |
| Visual-gap units | 876 | 852 |
| 原 gap 转 native-complete | — | 24 |
| Locator / native text 守恒 | 基线 | 逐 unit 精确比对全部通过 |

剩余 **852 gaps 保持 Partial**。这是机械 coverage 不确定性，不能解释为 852 次必须 Vision，也不能等同 852 页确定存在语义缺口。24 个 native-complete unit 仅当前可证明的 false-positive 消除，不通过减少 unit / text / locator 取得。

最新 trigger breakdown（同一 unit 可命中多个，不能把它们直接求和当 gap 总数）：`unrepresented-image-region` 805、`unresolved-vector-region` 372、`no-native-text` 45、`unresolved-shading-region` 6。未知绘制/image/无 native text 继续 Partial；未新增本地视觉语义模型、未修改 Source eligibility。

逐附件 alias、unit/gap 计数、trigger、24 个转换 locator 与全部剩余 gap locator 见 `artifacts/v0.3.0/parser-measurement/REPORT.json`。原始 Source ID/title/URL/hash、原字节与完整文本关联仅在 private manifest/results。公开 report 不包含课程正文、原始附件或可下载 URL。

### 9.2 测试边界与限制

这是 parser-only real measurement，不是完整课程语义/性能验收，也不是视觉补全质量验证。没有运行 Task A/B/C 或课程 workflow，不重置历史状态/cache。Operator 存在只能表示机械覆盖风险，不能决定图片/图表是否产品相关；不得用此结果宣称 852 gaps 必须视觉处理。

Node PDF.js 发出部分字体 opcode 警告，以及一份 18-unit 文件的 JPX/OpenJPEG 初始化警告（当前 parser 未提供 wasmUrl/fallback）。该文件全部 18 units 仍为 Partial，没有因 decode 警告被计为 native-complete；原生 text/locator 对照仍全部匹配。没有渲染验证，也不能把 warnings 当视觉 decoder PASS。原始过程/字节保留，等待后续 Product 方向，不在本次 checkpoint 顺手修 parser。

获取过程曾在未打开 NTU Learn session 时 Failed to fetch；登录后正常 200/CDN。QA 控制脚本还遇到 20 秒 RPC timeout/连接问题，改用 Playwright CDP 传输与原生 Blob 编码后完成；这是测试工具故障，不当成 Source 删除、产品 workflow failure 或缺失覆盖。未为产品增加 timeout / memory / retry / concurrency 数字。19 manifest entries 均最终原 hash 一致。

### 9.3 Revised Triage 当前停点（未完成验收）

暂停前已实际修改并保留：Coarse PROCESS / DEEP_TRIAGE_CANDIDATE、Deep 显式 Safe-to-Skip 合同、confidence 仅 telemetry、两个 pass schema/prompt identity、checkpoint/reuse 与独立 ledger。代码 checkpoint 不代表 Product 接受，后续不再实现/验证。

暂停前最近完整 `npm run ci` PASS：539 tests（517 extension / 20 backend / 2 contracts），日志 `.tmp/v030-005-ci-final.log`；targeted Triage 9 / workflow 35 / PDF 5 tests 已通过，QA bundle 已 reload，1 个 NTU Learn tab 已刷新。脚本 self-test 与文档/secret 检查为此前执行证据，本次暂停后不重跑。

已启动的 Triage-only evaluation `triage_eval_e0065de3580f618014be16ae` 在暂停消息到达前已返回：UTC 2026-10-04T17:21:27.437Z–17:24:15.628Z，168.191 秒；Coarse/Deep 各一个 logical batch，各经历一次 schema repair，共 4 physical calls。仅记录既有运行事实；**所有 skip profile 的语义审查、反例检查、新 projection、收益比较与 scope acceptance 尚未完成**。未据结果更改产品状态，也未生成 revised scope acceptance artifact。本地 job/AI ledger/raw output 保留，不上传或重新调用。

历史 4 workflows 保留 failed / USER_PAUSED_VALIDATION 等状态；已知 active workflows 0。没有新建/恢复 full course、cold-start、Task A 或 Vision。Product 最新指令覆盖 P2E-005 继续验证要求；当前只收口 manifest，结束后等待新的 Product → Engineering Handoff。

## 10. DA-002 Index-first selective retrieval — 未通过真实 Scope gate

本地生产 routing 已用共享 Planner loop 代替旧 Triage；legacy Triage 仅 compatibility / QA。完整 Index 覆盖 117 Sources / 880 units / 852 unresolved gaps，无本地 relevance classifier，无 first-N/random sampling。稳定 Ref 与 native fingerprint 分离；逐 AI 请求展开精确原文，Source no-units 保留完整 captured native representation，文件 Source Ref 只返回单位目录。原始 Source / workflow / trusted state 未被 QA probe 修改，19 private cache / 历史记录保留。公开计数证据：`artifacts/v0.3.0/retrieval-planner/REPORT.json`；原文、reasoning、失败输出与 identity mappings 仅 private。

### 10.1 真实 probe 与协议问题

1. 初版 216.322s，2 logical / 3 physical，展开 179 refs（16 Source / 163 Unit）。首轮 Index 169985 UTF-8 bytes、23278 anchor chars，不是全正文；六份已知 Lecture-context 的 24 个产品 native locators 全部被请求。模型终态全 117 NO_FURTHER_EXPANSION/0 PROCESS，但理由承认已经读到 assignment/marking/submission；工程协议混淆“读取完成”和“不相关”，该终态无效，不能作为 reduction 收益。input 229518 / output 59687 tokens。
2. v2 continuation 399.407s，3 logical / 4 physical，复用已展开结果，总 214 refs（51 Source / 163 Unit），4 个有明确 native dueDate 的 assignment Sources 被请求。失败为 PROCESSING_REFS。物理统计 input 1015902 / output 112379 / reasoning 80654；已接受 round 的 usage 与失败调用分开。
3. 诊断 continuation 214.260s，2 physical。真实失败输出所有 Ref 均已知且归属正确，但 9 个 PROCESS Ref 尚未读；旧“PROCESS 必须已读”校验拒绝了合法新 acquisition intent。改为精确获取 + 下一轮原生确认；真实 payload replay 通过并恢复 9 refs。非选中但已读的 sufficiency 声明独立保留；不要求其等同 processing scope。
4. v3 continuation 182.419s，复用 223 refs（51 Source / 172 Unit），首 physical schema duplicate Source failure，repair physical NETWORK_TRANSIENT；不是连续网络失败。停止新增调用，保留已成功 native acquisition。短 unauth Provider GET 返回 401 只能证明当时 endpoint reachable，不能证明长 POST 正常。重复/缺失 Source 现有精确 diagnostics，尚未再次真实模型验证。

这些 continuation 不是 clean performance baseline，耗时不得与前两次 Triage 当作同条件收益。此前 Triage 127.778s / revised 168.191s 未因 DA-002 获得可确认 improvement。没有 accepted v3 final scope，因此 projected Task A packages、852 gaps 三分区、projected Vision reduction 均为 unavailable，而不是 0。失败 repair token/cost 缺失保留 unavailable，不用成功 round 代替整轮成本。

### 10.2 Recall、测试与边界

六个已知 Lecture-context / 24 native locators 已展开，明确 4 assignment native dueDate Sources 已展开；这证明 acquisition recall，未证明最终下游 selection recall。曾有未接受 payload 选择 22/24 locators，两个剩余通用 Assignment headings 是否新增产品事实未完成最终审查，不能认定最终 recall PASS。首次 acquisition 后剩余 717 units；QA-only lexical candidate 检查 2 个未展开 page:36，实际为 teaching Concept Selection weighting example，并非 assessment grade weights。该候选检查不是生产关键词筛选，也不证明所有未知图像/全部未展开内容无产品信息。

48 项定向合成回归 PASS：14 Planner + 34 workflow，包含 acquisition/read confirmation、精确 Ref 校验、视觉 gating、selective view inventory 守恒、Check policy invalidation/Rebuild scope reuse、checkpoint 中断恢复、render/AI 并发、网络失败复用成功 Task A。合成 Task A/B/C 与 fake render 不是真实模型/Vision调用。修复无成功 captured candidates 时误调用 Planner 的集成问题；未减少 coverage。完整 CI 与 bundle reload 证据在当前 E2P 记录。

本轮真实调用仅 Retrieval Planner；没有启动真实 Task A/B/C、Vision、Discovery、course workflow、full large-course clean run 或 cold-start。没有新增 capacity/timeout/memory/concurrency cap。仍需 Product Scope Review 决定后续 Planner 验证；最终 gate 未通过，不能 Final Acceptance 或发布。

## 11. P2E-007 protocol closure / one controlled continuation

### 11.1 实际修复与 offline gate

协议 v4 用 requestRefs / selectedEvidenceRefs / visualRequestRefs 与 CONTINUE / COMPLETE 分离 acquisition、read-confirmed selection 和视觉意图。已读但不选不代表 Local teaching-only；不再输出每 Source 分类数组，因此不再需要 Source classification 枚举和 duplicate Source decision repair。Ref exact duplicates 可确定性 dedup，未知 Ref、未读 selection、无新请求 CONTINUE、仍有 pending request 的 COMPLETE、非法 visual intent 均明确 failure，不能当空 scope。新增 optional uncertainRefs 只保留 AI 未知；不生成 Local relevance。Source checkpoint / selective views / Task B catalog 按已选 Ref 的机械归属分组，ABC/Review/trusted-state 不改。旧 AI scope protocol identity 失效，objective native acquisitions 不失效。

Offline replay 三个真实旧输出 PASS：初版全 117 NO_FURTHER 歧义结果必须 AI reselection，拒绝 legacy envelope，不从 rationale 猜 selection；9 个未读旧 PROCESS intents 分为 acquisition，已读才为 selection；duplicate Source raw output 有 2 个 duplicate rows，新协议仅 exact Ref集合。QA translation 未保存为 accepted Product scope。额外逐项验证 223 expansions 完全一致、117 Source native fingerprints 一致、880 units / 852 gaps 全量索引。没有模型/ABC/Vision/Discovery/workflow replay调用。脚本 `scripts/v030-planner-replay.mjs`，private raw outputs均保留。

### 11.2 唯一真实 continuation 与 final scope

Singapore 2026-10-05 13:13:34.930–13:15:16.083（UTC 05:13:34.930–05:15:16.083），wall-clock **101.153s**。1 条新 logical continuation / 1 logical call / 1 physical request，latency **100.703s**；0 repair / schema / network / Provider failure，finish_reason=stop。input **287529** / output **23907** / reasoning **21289**；cache hit 0 / miss 287529。usage真实记录，价格未核验，cost unavailable。不是 clean Planner performance baseline。

原样复用 **223 refs（51 Source / 172 Unit）**：726224 native chars / 779775 UTF-8 serialized expansion bytes。完整 Index 170249 UTF-8 bytes，全部 native inventory 1368983 chars；continuation 未新增 Ref、Fetch、parse 或 native text，新增 expansion refs/chars/native bytes/tokens均 0（空 array framing是2 bytes，非正文）。172/880 units 已读，剩余708未展开，不近似展开全880。累计 evidence/prompt开销约287k input tokens仍明显，未来clean run需测Planner总成本；不宣称已比历史127.778s/168.191s Triage更快。

accepted final `status=COMPLETE`：**200 selectedEvidenceRefs = 47 non-unit Source refs + 153 Unit refs**，**60 Sources / 60 projected primary Task A packages**，其中13附件；57 Sources未选，仍保留完整inventory/native/provenance。one Source一主逻辑package不变，实际technical split/physical A count尚未执行。

852 unresolved gaps投影：**719未进入selected scope / 133 selected native-sufficient for product meaning / 0 visualRequestRefs**。该native sufficiency由AI final selection且不请求视觉给出，不是Local语义推断；0仅是本次Planner视觉意图，不宣称852本来必须Vision、更不代表结构gap消失。880原生units/852原gap仍保留，parsecoverage不被改Complete。

模型另保留**8个已选附件Source的uncertainRefs**；全部仍在60 Source processing scope内。补充确定性投影回归：未selected Unit或file Source层AI uncertainty不能在派生Task A input中丢失，派生下游输入保留Partial；本轮没有改写真实Source理解状态，不会通过Local添加evidence或Vision来补猜。该状态修复不改变Planner selection，不再调用模型。

### 11.3 Final processing recall 与未选审查

六份已知Lecture-context内的**24/24 assignment / marking / submission native locators最终selected**，没有用“结构标题”exception排除任何已知case；其中曾被旧输出遗漏的page:83实际包含三种assessment组成，不能只称无新增事实标题。4/4明确native dueDate assignment Sourcesselected；全部16/16 assignment、7/7 announcement Sourcesselected。Known acquired课程管理/Assessment native cases保留；没有按filename猜独立Course Information Source role。上述为known native processing recall PASS，不等于所有未知图片/课程整体语义质量PASS。

19个已读但未选unit全native审查：3个section headers、7个native blank、1个Questions heading、8个教学流程/示例；另外4个未选已读Source Ref为file目录。未发现这些已提供native中新的已知课程管理事实；header/blank的视觉信息没有核验，不标irrelevant或Complete。对剩余708未展开units保留既有fullnative，在两份Lecture4的page:36作QA-only固定case人工对照，确认是Concept Selection weighting matrix教学例子而非assessment grading weight；未选样本保持。不是生产keyword filter，也不证明708全部无产品信息。全部8显式uncertain Source仍在selected Source scope且Partial，未知不能静默跳过。

### 11.4 测试、现场与边界

最终定向16 Planner / 34 workflow =50 tests PASS，包含read selected evidence仍可保留uncertainty而不被Local强迫Vision。先前完整CI552 tests PASS；后续一轮parallel CI中现有50MiB request boundary test命中Vitest默认5s watchdog，未改任何production或test limit。隔离同test通过（2.726s），随后完整CI已再次PASS；最终uncertainty投影修复后的 `npm run ci` PASS：554 tests（532 extension / 20 backend / 2 contracts），日志 `.tmp/v030-007-ci-closure-final.log`；QA reload并刷新1个NTU Learn tab，最终现场Source/workflow精确不变。

真实QA前后Source records/historical workflows精确不变，4个历史workflow保留、active0。19附件private cache / 原始数据 / raw outputs / reasoning / signedURL mapping / credentials / QA profile / tmp均不上传；public report仅去身份Source aliases、计数、locator和metadata。全流程无真实Task A/B/C、Vision、Discovery、新course workflow/fullclean/cold-start；未commit/push/tag/release。没有新增固定round/Ref/token/timeout/memory/concurrency/confidence容量限制。

状态：**READY FOR PRODUCT SCOPE REVIEW**，等待Product决定known large-course clean rerun Gate；这不是fullcourse Final Acceptance或release授权。remaining risks：8个Source explicit uncertainty、所有未核验视觉内容、708未读unit未全量semantic audit、Planner cumulative context/前置成本、既有transport/retry/output guards的历史未验证风险，以及整课程实际Task A/Vision吞吐和语义质量。

## 12. P2E-008 clean Rebuild 启动前阻塞

008 / READY 已按单文件 scope 从实际 Drive Desktop 挂载路径同步并 hash 校验。启动前代码核验发现 `workflow.ts` 的 `unitTaskA` 仅对 initial 传当前 workflowId 给 reusablePlanner；Rebuild 传 undefined，允许旧 workflow 的 Planner selection checkpoint 命中。这与008 §4禁止历史 Planner final scope复用的 clean 定义不符。当前没有显式 semantic-clean Rebuild 启动选项，不能仅凭新 workflow ID宣称clean。依008 §4.9停止并报告，没有删除历史checkpoint来制造clean，也没有启动新workflow或模型调用。

Task A package checkpoint查询本身受workflowId约束（store.ts findTaskAPackage），这不是已确认的跨workflow复用问题；generic AiRun idempotency和真实Fetch路径仍需后续完整核验，未宣称它们已通过。下一步需要提供可持久化、只绕过历史semantic checkpoint且允许同workflow recovery的clean运行路径，定向回归通过后再开始真实验收。此次未修改生产代码、限制、trusted state、QA状态或历史证据；未执行Task C、第二课程、commit/push/tag/release。008真实性能、覆盖、Preview与账本结果尚未产生，不能PASS。

## 13. P2E-009 semantic-clean preflight 与 P2E-008 known-course run

### 13.1 Isolation gate

009 / READY 单文件定点入站。QA-only workflow持久化标记隔离历史Planner/A/B/generic semantic reuse；普通production复用不变，release无E2E_CLEAN_REBUILD入口。合成用例证明新workflow真实调用Planner/A/B、same-workflow network recovery不重跑成功A包、四stage同fingerprint/idempotency碰撞时仍只命中当前workflow结果。真实read-only preflight保留117 Sources、4历史workflows、所有trusted对象、AiRuns和staging；reload刷新1NTUtab只改变Course.updatedAt，其余字段/revision不变。初始完整CI560tests PASS。

### 13.2 已发生的真实运行与恢复

新semantic-clean Rebuild wf_5f0d9ef90ce350d03c0db29a，UTC2026-10-05T09:48:17.162Z开始。真实production Discovery/Fetch/nativeparse：117Sources、19附件、880units、852gaps；117observations全部Fetch成功，Index170249bytes，未使用19private attachmentcache替代Fetch。历史semantic结果未替代本轮工作。

首Planneraccepted CONTINUE：159refs /634636nativechars /680072serializedexpansionbytes；48.212s physical，input64059/output13346/reasoning11319。第二logical请求66.107s，SELECTION_NOT_READ（2unreadUnitRefs）；一次repair14.876s仍DIRECTORY_NOT_EVIDENCE（9fileSourceRefs）。两次拒绝均计入账本，未接受scope，也未dispatch Task A。workflow09:51:00.174Z failed/AI_CONTRACT，成功acquisition、failedrecord和private快照保留。Provider真实cachehit分别1664/64000/257664，非历史semantic cache。

修复为全部invariant diagnostics +机械readEvidenceRefs与prompt/5；不添加ref、不Local分类、不增加repair或容量限制。objective acquisition recovery exact身份验证恢复159refs/634636chars，不复用失败finalscope、不重新Fetch。新增回归及完整CI562tests PASS（540extension/20backend/2contracts）。09:57:12同workflow正常RetryTask恢复，标记保留；没有新workflow替代失败baseline。完整wall-clock应包括此repair/CI/reload停顿，不能包装为无失败的连续性能baseline。

以下 §13.3 记录最终停止结果；不构成完整课程PASS。私有证据evidence/private/v030-clean-rebuild/（BEFORE、START、逐次snapshot、EVENTS、RECOVERY与ledger），不上传真实prose、native原文、rawmodeloutput/reasoning、credentials或QAprofile。

### 13.3 最终结果：known recall FAIL / Product stop

UTC 09:48:17.162–10:05:44.077（Singapore17:48:17–18:05:44），wall-clock **1046.915s /17分26.915秒**，包括同workflow协议修复/CI/reload停顿。Discovery7.886s、Fetch/nativeparse25.621s、Planner含修复停顿930.156s、实际Task A至停止83.252s。不是无失败的连续clean性能baseline。native文本与全部locator逐unit守恒，native覆盖未缩减。

Planner累计6logical请求、8physical，5accepted rounds、3schema-invalid physical、2repair、0network/Provider transport failure。physical latency合计554.940s；input1,951,672/output146,481/reasoning128,184（reasoning已包含在output），Providercachehit1,385,984/miss565,688。238readRefs=62Source+176Unit；final179selectedRefs=49Source+130Unit，61selectedSources（7announcement/16assignment/26course-content/12attachment）；56Sources未selected仍保留完整inventory。852gaps=742unselected/110selected无Visionintent/0Vision请求，不能据此判Complete或视觉无关。

最终known native recall **12/24 FAIL**，4/4nativeDueDate assignments、16/16assignment、7/7announcement Sources保留。12遗漏位于3个known Lecture-context Sources，分别5/6/1locators；全部24oracle原文仍与实际当前native unit精确一致，不是Fetch/parse差异。上一accepted CONTINUE有200refs、22/24known locators，最终COMPLETE179refs移除43、增加22，**其中10个先前已selected的known locator被移除，另2个此前未选**。最终payload没有逐item排除理由，不能据重复信息或目录位置猜测这些locator可省略。输入只传累计Index/expanded，没有传上轮selected scope；终态替换此前selected集合。此为可观察的selection continuity风险，不能仅凭它断言全部语义根因。未用Local union/keyword补入refs，按008/009立即停止，不再调用模型或恢复。

Task A已admit52/61primary Source packages：37成功AiRuns/37成功结果保留，2logical包遭合同终态失败，13in-flight在Product stop后中止，9未admit；0consolidation。55physical calls：37valid、4schema-invalid、1invalidJSON、13ownership-stop cancellations；3repairs，停止前0真实network/transport failure。实际package peak13/average11.128、AI request peak13/average11.004；A latency median12.113s/P9568.063s包含停止中断，不能当完整成功包分布。admission wait median34.898s/P9579.512s；未结束，waves、完整throughput/recovery、Task B/SWC/Preview/Review burden unavailable。其余package与整个Task A阶段未完成，不声称完整A通过。

另发现 **coverage carry-over隔离漏洞**：fresh parser trace为99ok/18partial；workflow observations为108ok/9partial。9附件由历史visualCoverageHash提升partial→ok，代码继承旧hash。初始preflight验证Planner/A/B/generic semantic result lookups，漏掉这一derived coverage路径；所以不能称严格semantic-clean/coverage isolation总体PASS。880units/852unit gaps仍保存，并未实际丢native；但本轮fresh Partial状态不能按历史结果冒充本轮Complete。该问题随known recall stop一并保留，尚未修复/回归，不在停止后再改产品实现或重跑。

真实Activity7个非空采样，Task A流式Activity有显示；逐channel reasoning/output连续性未独立完整核验；停止后清空，Task B Activity未测试。worker跨长调用维持，正常lease更新有记录；修复时主动reload一次，不把这称自然eviction test。QA轮询/Activity连接属于观测条件，未声称memory峰值或offscreen压力边界已测。停止撤销当前workflow lease，由既有1s ownership watch abort in-flight；后续provider新派发 **0**。4历史workflows、历史AiRuns、trusted对象/revision精确不变；Course.updatedAt独立记录刷新。未Task B/C、未Rebuilt Preview、未Use/Keep、未cold-start、未commit/push/tag/release。

完整63physical ledger已形成：Planner8 +Task A55，50条有实际usage；已知input subtotal2,205,001/output294,176/reasoning211,714，13中止调用billing未知，total tokens与cost保持unavailable/null，不能填0或当完整总量。公开去身份汇总与逐请求ledger见artifacts/v0.3.0/clean-rebuild/REPORT.json；private原始native/outputs/identity/快照不上传。

**Gate：Real-course Validation FAIL / STOPPED FOR PRODUCT REVIEW**。后续需先修clean coverage状态继承，并让AI在终态显式检查前轮selection/known产品evidence的保留或有证据的排除；不能Local自动补选，也不通过改固定数字或新开漂亮baseline绕过此失败。Task A observed invalidJSON/schema failures还需独立针对性诊断。未在本轮stop后继续修上述缺陷。


## 14. P2E-010：targeted blocker repair / Planner Gate FAIL，第二次 Rebuild 未启动

### 14.1 已实现与离线验证

执行 P2E-v0.3.0-2026-10-05-010 / READY；入站只定点同步长期 Product Handoff，PRD / DA-002 未改。当前 Planner policy v5 / schema /5 / prompt /6 使用累计 add/remove reducer；每轮输入含 accepted selection，撤销须 exact ref、reason、已读 support。未选的 acquired evidence 不自动进入 scope。同 workflow current-protocol progress 可恢复 selection / native acquisition，accepted COMPLETE 可恢复 checkpoint；跨 workflow 历史 semantic state 阻断，旧 prompt 只恢复 objective acquisition。

真实旧 5 accepted rounds 离线 replay：原 selected 0→138→151→200→179，新 reducer 0→138→151→211→224；known recall 0→12→12→22→22，最终无 explicit removal 时没有 22→12 的静默丢失。合法 earlier false-positive correction、非法/unread removal、未选 acquisition 不变 selected、同 workflow interrupted recovery 均有 deterministic regression。

clean acceptance 不继承 historical visualCoverageHash，也不提升 fresh Partial；历史 parsed/coverage 保存为 QA-only audit metadata，不删除历史记录。9 observed affected records 对真实 hash / inventory replay PASS，880 units、Index rows/native text/locators 保持。integration regression 覆盖 fresh Partial + matched hash、fresh ok、普通 production reuse 不变、同新 workflow 实际 visual success 合法升级，Partial 不冒充 Complete。派发前 QA-only recall guard 可直接停止，不补选、不将 oracle refs 输入 prompt。

完整 `npm run ci` **568 tests PASS**（546 extension / 20 backend / 2 contracts），QA / release build separation PASS。已 reload QA extension 并刷新 1 个 NTU Learn tab。既有 request-size CPU stress probe在并行 host load 下因测试框架默认 5 秒截止误失败；单独实际约 5 秒、同套负载约 23 秒，字节与 locator 断言通过。只关闭该有限同步 CPU probe 的计时截止，保留 25 MiB/image 输入、全部断言与正式 Provider 约束；未设置更大的 deadline、减少输入或改变生产 limits。

Task A saved-failure offline diagnosis：上轮仅保存37成功 AiRuns，完整5个 failed physical raw responses / repair inputs未持久化；Activity captures早于Task A，无法重建完整 invalid JSON 或逐项 validator payload。metadata证明1 invalidJSON、4 schema spelling errors（错误 ai/task-a，而当前 prompt / repair明确要求 ai.task-a），3 repairs、2 logical terminal failures。证据不足以支持额外 deterministic实现修复；保留 Provider/model contract risk，未放宽 provenance/schema、未新增 retry/timeout/memory/concurrency 数字。

### 14.2 唯一一次独立真实 Planner probe

QA job `planner_eval_e36899a5eaf62cdec6ada272`，UTC 11:33:18.406–11:38:07.936（SG19:33–19:38），wall **289.530s**。只复用原失败 run 的完整 objective Index 与238 native acquisitions；初始 selection为空，没有恢复旧 workflow或其final scope。117 Sources / 19 attachments / 880 native units / 852 gaps 的 Index完整保留；本轮无 Discovery/Fetch/parse/Task A/B/C/Vision。

2 accepted rounds：CONTINUE cumulative221 selected / 5新增native refs（342 chars / 801 UTF8 bytes）；COMPLETE cumulative226 selected。explicit removals=0，未观察selection静默丢失；最终243 acquired refs，0 visual requests / 0 uncertain refs。

**Recall Gate FAIL：known product locators 22/24；dueDate Sources 4/4、assignments 16/16、announcements 7/7 PASS。** 剩余2项都来自同一 Source（SHA-256 alias `e58a091fd994e173ba9632df3618fd839b4933f11322de4dba53b0f73e7cf270`），locator page:73 / page:74；两项均在完整Index中，但正文始终未请求/未读取，也未 selected 或标记 uncertain。本轮continuity修复保留已选22项，却不能解决尚未 acquisition 的2项；不是 native数据减少、Index丢行、local scope过滤或新 capacity limit。不能用QA补选或把 oracle注入prompt让Gate通过。

3 physical Planner requests：2 valid、1 SELECTION_NOT_READ合同失败，经现有1次repair通过；0 network/provider transport failure。median latency115.476s / P95152.054s。实际 input897,618 / output78,656 / reasoning71,804（reasoning包含在output，不重复相加）；cache hit591,360 / miss306,258。未加载可核验pricing，cost null。逐physical metadata ledger与两轮独立证据见 `artifacts/v0.3.0/clean-rebuild/SECOND_ATTEMPT_REPORT.json`，不得与第一次full run性能合并。

QA页面private快照采样间隔不稳定，7份样本的最大间隔131.518s，并观察到Chrome renderer高负载；采样monitor最终正常完成并返回相同FAIL，独立read-only worker query再次确认completed job。未定位读取延迟根因，不声称UI冻结或模型stall。对worker只做DB / staging hash读，没有reload、恢复job或追加模型请求以掩盖结果。

### 14.3 Stop / preservation / 下一步

010要求targeted recall24/24后才能启动第二次full run，本轮Gate未通过，因此 **第二次 known-course semantic-clean Rebuild 未启动**，无新workflow、无任何Task A/B/C、Vision、full-course / cold-start、Use/Keep、commit/push/tag/release。没有第二个probe或第三个full run。

直接read-only hash复核：Sources、5个历史workflow（含前次失败run）、历史AiRuns、trusted course state/objects/revision/history/review records及staging均未变；19附件private cache、原始private evidence保留。新QA evaluation metadata与AiRuns作为独立evidence追加。第一轮public报告及全部baseline/START保留；第二轮只记录启动前Gate失败，不声称real-course validation PASS。剩余工作是AI acquisition recall/COMPLETE uncertainty，不是再调固定数字；等待下一Product Handoff确定针对性处理和新的真实验证授权。

## 15. P2E-011：Coverage Audit 定点 Gate 失败收口

### 15.1 已完成实现与离线边界

独立 `coverage-audit` task、exact unread partition / inclusive range expansion、无 hole / overlap / duplicate / silent skip 的 validator、Primary COMPLETE 候选 → Audit → exact native expansion → Primary update loop、完整 checkpoint proof 与同 workflow 恢复已实现。Primary schema / prompt 未加重，policy 为 v6；没有选择新的固定轮数、容量、内存、并发或时间数字。旧 checkpoint 无 Audit proof 不能作为 accepted COMPLETE 复用。

原 22/24 payload 离线 accounting replay PASS：117 Sources、880 units、243 objective acquisitions、226 proposed selected refs；748 unread native refs（同时包含无 units 的 native Sources）。两处遗漏仍在 unread，故意遗漏其 coverage declaration 时 validator 拒绝 COMPLETE；合成 partition 只用于断言，从未用于真实 acquisition 或 prompt。Audit request user JSON 195,729 bytes，provider request 217,373 bytes，既有 provider boundary 检查通过。范围越过已读 / requested Ref、未知范围、重复、uncertainty 不 request、无证据进展及同 workflow recovery 回归通过。

完整 `npm run ci` **575 tests PASS**（553 extension / 20 backend / 2 contracts），release / QA separation PASS。QA extension reload 与 1 个已有 NTU Learn tab refresh 完成。没有 Discovery、Fetch、parse、Task A/B/C、Vision、full workflow、cold-start 或 Use/Keep。

### 15.2 唯一一次真实定点验证

独立 QA job `planner_eval_1cb44af93fbb15fef9981eb7`，UTC **12:55:22.749–13:03:03.335**，wall **460.586s**。复用已保存的 243 个 exact native acquisitions，将 226 个旧 Primary 选择仅作为未获审计的 COMPLETE 候选，不恢复历史失败 workflow，不将其视为 accepted final scope 或新 clean-run 性能基线。完整 117 Sources / 19 attachments / 880 units / 852 visual gaps Index 保留。QA oracle 没进入 request、模型或 runtime selection。

1 个 Auditor logical invocation，2 个 physical requests（initial + 既有单次 protocol repair）。**0 accepted Audit rounds、0 new native expansion、0 Primary updates、0 accepted COMPLETE**。24/24、4/4 dueDate、16/16 assignment、7/7 announcement 的最终 recall 均未成立，不能写成 PASS，也不能把“尚未产生 accepted final scope”误报为真实 recall 0/24。

首个响应耗时 **160.273s**，返回 `MORE_EVIDENCE`，自然 request 恰为两个历史遗漏的 page:73/page:74。它没有把这两处声明为无需展开；这只是未获接受的 semantic diagnostic，不是已完成的 native acquisition / Primary selection 链路。

该响应 15 个 coverage declarations（10 个 ranges）机械展开为 787 个 unique refs，其中 **41 个已经读过、不属于 unread**；746 个合法 covered + 2 个 requested 覆盖了 748 个 unread，没有 hole、重复或 request/covered overlap。validator 在第一处 `COVERED_NOT_UNREAD` 拒绝整份响应，没有本地裁掉 41 refs、自动补读或接受部分结果。完整 rejected payload 已保留 private evidence；第一次 22/24 的两个遗漏尚未通过有效 Audit → native → Primary selection。

随后协议 repair 在 **300.004s** 被已有 `DEEPSEEK_REQUEST_TIMEOUT_MS = 300_000` 请求总时限中断，`qa.network-first-failure` 明确为 `stream-or-response / timeout`，最终 `NETWORK_TRANSIENT`。这是此前 Limit Inventory **L19 / ARBITRARY / UNVERIFIED LIMIT** 已标出的 v0.2 provisional 绝对截止，并非本轮新增或 Provider 硬约束。不能据此断言 Provider 拒绝请求、网络失联或模型 stall；没有保存修复阶段逐 delta progress，无法证明截止时 stream 是否仍有进展。没有将 300s 替换为另一未经验证数字，也没有发起第二个 probe。

### 15.3 Ledger、成本与隔离

只有首个 physical response 返回 usage：input **83,253**、output **45,946**、reasoning **44,286**（已包含在 output，不能重复计费）；cache hit 0 / miss 83,253。两次 physical latency median 230.1385s / P95 300.004s（样本2，包含失败repair）。repair 中断未返回最终 usage，其 input/output/reasoning/cost 均 **unknown**，不能记为 0。这些数字只是本次已知下界，pricing 未核验、cost null。没有通过额外模型调用探测成本。将010历史Primary与本次新增Audit合并追溯时，pre-Task-A已知下界为980,871 input / 124,602 output / 116,090 reasoning、5 physical；这是跨两次probe的组合历史，不是同一次clean-run账单。

相较 010 Primary-only 289.530s / 897,618 input / 78,656 output / 243 acquired / 226 selected，本轮新增 Audit 的已知 input 约 9.3%、output 约 58.4%，并额外花费 460.586s；seed-assisted targeted timings 不等于 clean performance。初次语义 request 只涉及 2/748 unread，而非近似全量展开，但因为协议与修复失败、repair usage unknown、未形成 final downstream scope，**成本与可行性 Gate NOT_ESTABLISHED**。没有宣称节省了 Task A 或 visual scope。

Sources、sourceObservations、5 历史 workflows、历史 AiRuns、trusted state / objects / history / review / exclusion memory、staging 均保持 hash 一致。唯一 table hash 差异为 enrollment refresh 的 Course.updatedAt；移除该观察时间戳后，Course 与历史基线完全一致。19 private attachment caches、旧 workflow、模型记录与历史 evidence 保留。没有新完整 workflow 或后台继续派发。

### 15.4 结论与 remaining risk

**TARGETED_AUDIT_CONTRACT_AND_TIMEOUT_FAIL；第二次 semantic-clean Rebuild 未启动。** Offline / CI / isolation PASS，accepted COMPLETE / final recall / cost Gate 未通过，按 011 Stop rule 返回 Product Review。

下一步建议基于上述事实授权：为 AI 提供机械生成的连续 unread segments 或 exact range aliases，避免它自行跨越已读 holes；repair 一次报告全部越界 Ref，而不是只暴露第一处错误。这仅改变结构表达 / accounting，不按语义裁剪、选择、忽略或补读任何 Ref。历史 L19 的绝对请求截止需回到 No Arbitrary Limits 治理，使用可观测 stream progress、stall / lifecycle / 用户取消与明确 telemetry，不能继续改一个固定秒数。本轮不自行决定新的 stall boundary，也不因 first response 找到两处就绕过完整协议。

下一次 targeted / full-run 验证需要新的明确授权；本次没有重复 probe、恢复旧 failed workflow、复用其 37 个 Task A semantic successes、commit/push/tag/release。公开结果：`artifacts/v0.3.0/coverage-audit/REPORT.json`；private raw / native / reasoning 均不上传。


## 16. P2E-012：DA-003 checkpoint / Product Scope Review

### 16.1 实际实现与测试边界

DA-003 complete Index、AI exhaustive EXPAND / SKIP / UNCERTAIN、Local exact N/N validator、selected native Source grouping 已接入 workflow。无 Local relevance heuristic；missing / unknown / duplicate（包括同值重复）拒绝，UNCERTAIN 进入 deep read。SKIP 的完整正文不进入处理 view。当前版本 routing checkpoint 绑定 policy / representation / schema / prompt / inventory；clean workflow 不复用其他 workflow semantic checkpoint。旧 Planner / Auditor 不在 production routing。Task A native-first，只有明确 selected unresolved exact visualRequestRefs 才渲染；每次要求新增 evidence，无固定 rounds。成功结果复用 fingerprint 已排除 mutable understanding 状态。

Deterministic Routing 9 tests、workflow 39 tests PASS。完整 CI 的最终结果记录在下方 validation checkpoint。尚未执行 P2E-012 唯一真实 Routing；没有 Discovery、Fetch、parse、Task A/B/C、Vision、新 workflow、clean Rebuild 或 cold-start。117 Sources / 19附件 / 880 native units / 852 unresolved gaps 是此前 parser-only事实，本轮不是新测量。没有更改 historical workflows / trusted data / private cache。

### 16.2 Active Limit Inventory delta（覆盖现有 inventory，不重写历史事实）

| Existing IDs / path | 当前处置 / 分类 | 依据与缺口 |
| --- | --- | --- |
| L01 package-scheduler | 移除默认 25 hard clamp；默认最多 pending items，起始 10 为 Product target | 实际动态并发必须未来 runtime evidence，不能用理论值声称 10–25 已达到 |
| L02–06 weight / total budget / render slots | 当前 production 不使用旧 4 MB/page、8 MB、192 MiB estimated budget 或全局 render semaphore | 不设置替代总内存数字；历史 resource-budget 模块只作兼容测试 |
| L07 scheduler AIMD | **剩余 UNVERIFIED 算法常量**：压力减半、累计当前 limit 次成功后增加 1 | 不等于容量硬上限，但吞吐策略未 benchmark，尚不能归类 measured B |
| L08–09 guessed cooldown | 此前 active repair 已退出 60s clamp / 1s fallback；以真实 Retry-After 或 fatal dispatch-stop 处理 | 保留网络 failure 停止新 admission / drain 已 admission，用户明确要求 |
| L11–13 Task A chunks / physical split | Source primary package；仅真实 Provider request/image 边界分物理调用 | 未验证固定 tokens guard 已改 Provider output boundary；估算用于 telemetry，不截正文 |
| L14 commit barrier | 保留 deterministic staged mutation / ownership protection | 安全控制不是正常 coverage 容量；慢包仍会延迟 phase advance |
| L15 workflow.ts recovery loop | **剩余 ARBITRARY / UNVERIFIED：失败 Source 额外一次自动 recovery** | 与每次协议 repair / workflow retry 叠加；选择自动付费次数需统一恢复策略，不能无界删除或猜新次数 |
| L16 workflow.ts lease | **剩余 UNVERIFIED lifecycle：10min lease、5min heartbeat、1s ownership watch** | token ownership 为必要 safety；这些时间不是 Chrome硬限，也不是请求 deadline；无法据现有证据声称已经 validated |
| L17–18 workflow.ts | **剩余 ARBITRARY：MAX_ATTEMPTS=3、timeout 第2次 terminal、5min/30min/2h saved backoff** | 删除 terminal guard 会无限自动付费；改 manual-only 会改变 saved / failed / retry 用户交互；不能默默选择 |
| L19 deepseek.ts | 300s absolute cutoff 已移除，没有替代固定秒数 | caller cancellation / ownership abort、explicit failure；bytes / last progress / elapsed telemetry，无证据 stall threshold 不猜数字 |
| L20–24 parser/offscreen/Office | 默认 parser30s、Office90s、fetch60s和Office idle120s 已退出；Office operation finally 释放 converter | Office共享可变 worker 仍串行，不限制跨 Source AI；每次初始化成本与 WASM峰值内存未测 |
| L27–36 discovery/parser | 此前 active discovery depth/page caps 已退出；parser默认 limits为空，64MiB / unit / text caps 不再默认生效 | 显式 fixture/options boundary tests 不代表 production cap；真实 visited/cycle / contract failure 保留 |
| L37 OOXML | 去掉 64MiB per-entry / 128MiB aggregate inflation cap | **风险未解决：同步解压没有 measured memory / mid-operation cancellation / ZIP bomb isolation**。不能把去掉数字等同安全完成 |
| L38–39 visual completion | source aggregate encoded-image cap / DOCX16MiB-entry32MiB-sum静默 filter 不在 active path | exact refs渲染；实际 Provider request boundary失败明确，不截页面；非requested正文不做全量Vision |
| Visual bitmap dimensions | 旧2400px/1600px默认cap改为 provider image dimension boundary | 8192单图/4096多图等以现有provider capability enforcement为准；不是本轮测得渲染内存边界 |
| Output token gate | TaskA/B/C默认改为现有providerMaxOutput384000，无猜测96k/128k ceiling或context margin截断 | Compatibility contextMargin/chunk constants未在 active output gate 使用；不宣称 token估算精确 |
| Other inventory：maintenance / UI / history / retry repair | **本轮尚未完成逐项资格化**，不冒充全部清理完毕 | 已遇 Stop condition，不继续为完成清单自行决定行为；历史 inventory继续有效 |

### 16.3 Stop gate / Product decision

按 P2E-012 §6、§10 的“active arbitrary limit无法安全处理且需要 Product tradeoff”停止进入真实验证。具体冲突位于 workflow.ts：MAX_ATTEMPTS / RETRY_DELAYS_MS / fail() / failedSourcesForRecovery，以及 provider single repair 与上述重试叠加。需要统一选择 explicit user retry、provider-backed Retry-After 自动恢复、网络恢复事件触发，以及自动付费 invocation 的规则；不再靠新固定失败次数或等待数字。当前未知：可验证 abandoned-worker接管证据、共享 Office worker吞吐/RSS、同步解压安全边界、AIMD真实压力响应。

这些项**仍未完成 cleanup，仍未验证，不能标记安全默认或生产容量依据**。DA-003代码处于未 commit 工程 checkpoint，不是 production acceptance PASS。唯一真实 probe 授权未消费：logical / physical calls=0；input/output/reasoning usage不适用、cost不适用；N/N real、known recall、SKIP audit、scope efficiency全部 NOT_RUN。未用 oracle补选、没有恢复旧模型结果替代真实 probe。

### 16.4 Validation checkpoint

完整 `npm run ci` PASS：584 tests（562 extension / 20 backend / 2 contracts），format / build / strict typecheck / lint / manifest / secrets / document facts / README / QA-release separation均通过。代码的确定性证据不替代真实 Routing recall / efficiency 或 remaining limit cleanup。停止状态为 BLOCKED / ACTIVE_LIMIT_RECOVERY_PRODUCT_TRADEOFF。


## 17. P2E-013：DA-004 cleanup + 唯一真实 Exhaustive Routing

### 17.1 Recovery policy与Limit Inventory最终分类

DA-004将旧“用固定失败次数限制付费”改为 explicit user decision。Workflow `MAX_ATTEMPTS=3`、timeout第2次terminal、5min/30min/2h backoff、失败Source额外一次AI recovery均退出 active path。Provider completion没有automatic paid schema repair / fresh retry；可零成本移除JSON fence，不能补语义值或routing decisions。失败state保留checkpoint/package/成功AiRuns，现有Retry入口授权新的尝试；成功项复用，不设人工retry次数。网络dispatch是否执行未知时等待Retry，不因网络恢复自动付费。当前Provider没有已证明no-generation safe-retry分类，因此不凭HTTP429/Retry-After独自自动重派。

执行session/owner token替代TTL correctness：atomic claim/CAS、startup识别旧session、legacy saved付费状态reconciliation、atomic state/draft owner check、迟到AI response拒绝。新session纯本地阶段可重建；旧task phase标记AI_INTERRUPTED/user Retry。没有10min lease /5min heartbeat付费重新claim。成功复用及no-extra-paid回归通过。

| Inventory | 当前分类/处置 | 限制与证据 |
| --- | --- | --- |
| L01–09 | 旧weight/budget/clamp/fallback已退出；initial/AIMD为 **UNVALIDATED TUNING** | 不truncate、skip、terminate或新增paid retries；真实TaskA吞吐仍未验证 |
| L10、L14 | failure停止new admission、drain与受owner保护的staged mutation | 产品要求失败风暴保护；不充当capacity cap |
| L11–13、L42–44 | fullSource logical package；实际Provider boundary才technical split | 原固定char/image/group限制不在正常默认path；compatibility/fixture参数不能冒充active cap |
| L15、L17–18、L53–59 | automatic paid recovery/repair/backoff次数退出 | unusable/ambiguous结果failed/userRetry；single-dispatch ledger；人工Retry无限制 |
| L16 | TTL correctness退出；session/CAS/startup reconciliation | 1s ownership watch仅UNVALIDATED LIVENESS TUNING，不能授权paid redispatch |
| L19–24 | default fixed provider/parser/fetch/Office/render窗退出；Office operation生命周期释放 | 没有替代猜测timeout/totalmem；共享可变Office converter仍dependency串行 |
| L25–26 | enrollment discovery仅复用实际in-flight Promise，不使用60s stale-window重复启动；maintenance机会alarm为 **UNVALIDATED SCHEDULING TUNING** | read/scheduling cadence不丢coverage、不重试已失败AI；本轮没有maintenance/full workflow验证 |
| L27–39 | 默认discovery/parser数量/size/文字cap与OOXML/visual容量filter退出 | 明确异常/error，不silent truncate；**unlimited sync inflation仍为full-run blocker**，本次未进入 |
| L40–41、L45–49 | 现有Provider request/image/context/output边界与有效性检查 | 真实请求boundary，非整Source/page总量cap；本轮未做近边界付费压力测 |
| L50–52 | estimate/margin不决定active output capacity；384k是现有Provider boundary | token估算只telemetry；没有新增猜测上限 |
| L60 | progress-driven exact native/visual evidence loop；无fixed evidence rounds | 非同状态无进展typed failure，非任意次数终止 |
| L61–65、L68 | Product轻量预览/QA observation/display policy，存储/模型coverage保留 | 不能用显示片段证明完整runtime；QA DOM/layout问题另见下文 |
| L66–67 | legacy migration/projection与active结构区别；full正文/provenance保留，native label cap已移除 | 旧migration/Restore不在本次Routing或TaskA正常source pipeline；未宣称全app安全审计完结 |
| L69–71等非主线 | backup restore/MVP historical/testing/dependency边界独立保留原inventory风险分类 | 不属于当前Routing/extraction correctness，不改用户restore行为；后续专项治理，不伪称已验证 |

Sync OOXML safety plan：在full-run前将inflation/decoder移入可取消isolated worker，优先entry-wise/incremental处理；worker crash/decoder failure显式Failed/Partial，不自动重复解压。**尚未实现，不用新byte cap掩盖**。P2E-013§8允许本次Index-only validation先进行，full-run不可据此启动。

### 17.2 唯一真实验证结果

job `routing_eval_6306f8b634810efcfc5a1a4e`；1 logical /1 physical initial，0repair/0retry/0schema/0network/provider failure。使用保存fresh native Index，117Sources /880units /852gaps未变，978entries（880units +98 unitlessSources）。user JSON **190,791 UTF-8 bytes**；native正文约1,377,631chars，未把全文写入routing prompt。

accepted978/978：**167EXPAND /811UNCERTAIN /0SKIP**。24/24 known product locators、4/4 dueDate Sources、16/16 assignments、7/7 announcements全部进入deep-read。oracle只用于外部结果验收，不进入prompt/decision；没有Local补选、没有再prompt。SKIP samples audit为 **NOT_APPLICABLE_ZERO_SKIP**，不能把零样本说成有selectivity质量证明。

wall204.626s，physical provider latency203.671s。input75,741 / output68,948 / reasoning52,242（已含output，不重复计费）；cachehit0 /cachemiss75,741。费用不写猜测货币数字：exact applicable tariff/account bill未核验，cost null。当前[官方入口](https://api-docs.deepseek.com/quick_start/pricing)说明legacy Flash IDs被新Flash服务，不能把旧快照价格当本次invoice；未改请求model或再调用验证。

scope：978/978entries、880/880units、117/117Sources全部selected，预计117 TaskA packages /1,369,844 nativechars /852 unresolvedPartial units可供未来exactvisualrequest。Partial不代表必须Vision。**没有实现deep-read范围缩减，回Product Scope Review；不通过本地阈值制造SKIP。** 与010 Primary-only289.530s/897,618input/78,656output及011audit460.586s/已知83,253input/45,946output为非同条件历史对照；011repairusage未知，不能直接推成本改善或clean-run速度。

### 17.3 隔离、QA观察与结论

BEFORE/AFTER全部course/trusted/source/observation/history/workflow tables hashes一致；5历史workflows、全部历史AiRuns与staging hashes一致，仅新增本次evaluation metadata和1AiRun。19private附件cache及历史evidence保留。没有Discovery/Fetch/parse/TaskA/B/C/Vision/new workflow/clean Rebuild/cold-start/commit/push/tag/release。

QA observer出现高CPU与CDP/只读查询延迟：live panel逐delta对累计textContent追加并同步读scrollHeight，可能引起累积DOM/layout负担。progress采样1inflight/9,751,248SSEbytes；provider最终wall204.626s，但观察结果有延迟。关闭QA观察app page后顺利读到完成状态，随后重开；没有reload/abort/reinvoke模型。该观察层风险未修复、未用固定buffer cap处理，独立于routing contract PASS；不能据此声称用户Activity完整验收。

完整CI **587tests PASS**（565 extension /20backend /2contracts），QA-release分离PASS。结果为 **TARGETED_ROUTING_COVERAGE_PASS_SCOPE_REVIEW_REQUIRED**；DA-004 main-path cleanup gate通过，scope节约不成立、full-run safety仍有blocker。公开摘要在 `artifacts/v0.3.0/exhaustive-routing/REPORT.json`；完整native/Index/response/progress/hash证明留在ignored private evidence，不上传Drive。唯一授权已消费，不自动再次执行。

### 17.4 收口补充：维护调度不能绕过用户 Retry

最终inventory核对补上opportunity防护：最新workflow是failed paid task时，maintenance alarm不再创建新的Check以隐式重新付费。历史旧失败之后若已有较新的explicit successful workflow，正常维护可恢复；不同课程结果不能解除本课程失败。三项确定性回归覆盖此路径。本次真实Routing的Index、prompt、结果及授权没有变化，不重复real probe。L70的旧afterTransientFailure数字函数目前无production caller，仅兼容历史tests；常规机会cadence/freshness显示属于未验证tuning/display，不是paid retry授权。

收口最终完整CI **590tests PASS**（568 extension /20backend /2contracts），format/build/typecheck/lint/manifest/secrets/docs/README/QA-release全部通过；真实派发前CI是587tests，新增三项maintenance regression不改变已经完成的routing input/output或唯一授权。

## 18. P2E-014 / DA-005 Teaching Material Deferral

**当前阶段：Product Scope Review。** 本轮实现 Source-level classification，逐 unit Exhaustive
Routing退出 production 必经路径；旧代码保留为历史 regression。DA-004 recovery / explicit paid
Retry / owner CAS / success reuse继续有效。没有启动 known-course clean Rebuild、cold-start 或
Task A/B/C/Vision，没有 commit / push / tag / release。

### 实现与 deterministic gates

所有 Source先完整 Discovery / Fetch / native parse / inventory / fingerprint / provenance。
分类只针对 attachment/file及精确的 Blackboard `resource/x-bb-file`类型；其余原生节点直接处理。
Source profile使用 hierarchy、native type、已知格式、unit/gap counts、结构首尾 anchors与明示遗漏的
首尾 samples / surrounding parent text。没有 Local filename/folder关键词决定、数值大小门槛或逐页
semantic routing。若 sample会覆盖整个文件 native正文，则明确省略正文，不把完整文件当轻量输入。

新 checkpoint保存 classification、evidenceUsed、rationale、policy/schema/prompt和profile fingerprint。
内容、标题、父容器/父级文本或 policy变化即失效；semantic-clean拒绝历史 checkpoint。
PROCESS与UNCERTAIN进入完整 Source native read；Deferred不派发 A/Vision，B/C evidence views也不
引入其原文，已有trusted/history不删除。Deferred不会改写机械unit/gap/locatorcoverage为Complete。

分类 batch在 checkpoint写入中断后保持 invocation identity，用户显式Retry可以复用已经成功的
分类结果。预检发现重复为每个Source重建全课程Index，已改为阶段内复用同一完整Index，不降低覆盖。
优化后离线117-Source profile准备实测272.988ms；该数值只代表本机此probe，不是容量/超时限制。

完整CI：**605 tests PASS（583 extension /20 backend /2 contracts）**；format/build/typecheck/lint/
manifest/secret/docs/README/build separation全部PASS。QA bundle重新加载，已打开的1个NTU Learn tab
全部刷新。受控module / workflow tests涵盖Deferred inventory/gaps保留、A/render/B证据隔离、UNCERTAIN
完整处理、profile/policy变更、clean isolation、classification contract failure和成功classification复用。

QA observer移除了每个delta重写累积text与强制scroll layout；reasoning/output仍独立、无截断。
浏览器synthetic probe：500,000 reasoning chars +500,000 output chars，各自逐字保留，
10,000 delta messages处理23.513s，0次stream `scrollHeight`读取。此probe没有模型调用。
没有恢复输出内部字段清理导致reasoning丢失的行为。长时DOM增长尚不是完整Activity验收。

### 唯一一次真实 Source classification

授权仅消费一次：`teaching_eval_748c43b077a6eb317333f93b`。
使用现有117 Sources /19附件 /880 units /852 Partial gaps，不重新Discovery/Fetch/parse。
其中24个file/attachment目标 =19附件 +5原生file节点；其余93原生节点直接处理，包含16 Assignment、
7 Announcement和70其他原生内容/容器节点。93不等于93个已确定管理文件。

| 指标 | 本次结果 |
| --- | --- |
| Source contract | 24/24 PASS，无遗漏/重复/unknown Source |
| PROCESS / DEFERRED / UNCERTAIN | 16 /8 /0 |
| 有效进入正常处理的Source | 109（93 direct +16 classified PROCESS） |
| Deferred 本地 units / gaps | 499 /477，完整保留 |
| 全部本地 Source / units / gaps | 117 /880 /852，与调用前相同 |
| 预计 Task A packages | 109（上一Routing投影117） |
| 正常处理 units / unresolved gaps投影 | 381 /375；不解释为375次Vision |
| 调用 | 1 logical /1 physical initial |
| wall / Provider latency | 35.056s /34.745s |
| user JSON /实际Provider body | 44,930 /50,721 UTF-8 bytes，0 images |
| tokens input / output / reasoning | 14,719 /9,167 /5,902；reasoning已含output |
| cache hit / miss | 0 /14,719 |
| failure / repair / retry | 0 /0 /0 |
| usage / currency cost | usage明确；currency cost null，适用tariff/invoice未核验 |

### Deferred profile audit（只审轻量profile，不展开正文）

以下8个Source均为attachment。A/B仅区分课程里不同的重复内容分支，不代表额外模型调用。

| Source Ref | 教学profile标识 | native units | gaps |
| --- | --- | ---: | ---: |
| `s:263ebed4d9f23477` | Lecture 1 deck A | 91 | 91 |
| `s:3396be27ea6e8999` | Lecture 4 deck A | 72 | 71 |
| `s:7b33bd3b1977bd7b` | Lecture 5 deck A | 68 | 67 |
| `s:c7a29f1053fe8e47` | Literature-review teaching deck A | 15 | 7 |
| `s:bfe87784144a9ed5` | Lecture 2 deck B | 98 | 96 |
| `s:87b5dc6b19f0a6eb` | Lecture 4 deck B | 72 | 71 |
| `s:447ee79510ba77bb` | Lecture 5 deck B | 68 | 67 |
| `s:2fa8b4f4755fc41f` | Literature-review teaching deck B | 15 | 7 |

逐个人工/evidence审查：hierarchy与native封面/首尾结构anchors支持普通Lecture/topic teaching身份，
所发送profile未见明确assessment/submission/marking/weight/deadline管理信号。8/8 profile audit PASS；
**不据此声称全文没有管理信息**。Lecture 1 cover是Course Introduction，属于Lecture profile，不能把
内部未知信息当作已验证无管理内容。DA-005明确接受此风险，旧24个lecture-context oracle不再作为
本轮deep-read召回Gate；未将它们加入prompt，也未打开Deferred全文或运行Vision来找答案。

Course Outline/Assignment的原生file节点与附件均PROCESS；Exam与Academic Integrity文件亦PROCESS。
16/16原生Assignment、7/7Announcement、4/4历史known due-date Source保留处理。
另外4个Lecture附件profile的末端anchor显式出现Referencing/Originality/Plagiarism管理信号，AI全部
选择PROCESS，不以Lecture文件夹覆盖管理信号。UNCERTAIN保守分支已由deterministic tests验证，本次
真实输出0 UNCERTAIN，不宣称已观察真实不确定分支。

### 隔离、证据与remaining risks

BEFORE/AFTER逐表hash：trusted/source/observation/history等全部相同；5历史workflows、历史AiRuns及
staging也完全相同。只新增evaluation metadata及1个classifier AiRun；真实Source checkpoint不在
targeted probe写入，后续production workflow才持久化。19附件private cache、private evidence全部
保留，不上传。共享摘要：`artifacts/v0.3.0/teaching-deferral/REPORT.json`；原profiles/result/状态快照
只在ignored private evidence，报告只共享脱敏统计与profile audit，不共享raw model output/课程正文。

1. 这是classification targeted PASS，不是full-course PASS；不证明Task A实际并发、全链路或实际提速。
2. 8附件的499 units/477 gaps只退出本版本内部语义深读，不从本地coverage删除。另4个管理信号Lecture
   文件仍需处理，因此不能把剩余375 gaps或109 packages当成固定时间/成本承诺。
3. Profile无法证明Deferred内部完全没有管理信息；这是Product明确接受的scope tradeoff。
4. OOXML同步全量ZIP inflation仍是full-run safety blocker；本次没有走解压路径，没有用byte cap掩盖。
5. Observer累积复制/同步layout问题已移除，长期DOM节点增长仍需full-run前评估；本次不声称完整Activity
   human acceptance。没有新增未经验证的capacity /timeout /memory /retry limit。

完成本轮定点outbound后停在Product Scope Review，等待新的Product → Engineering Handoff。


## 19. P2E-015：full-run blocker closure / real run STOP

Product 已接受 DA-005 scope。本轮仅关闭 OOXML decompression isolation 和 Activity long-run rendering，再按启动 Gates 执行唯一一次 known-course semantic-clean Rebuild。未恢复 DA-003 Planner/Auditor 或旧 24 lecture locator gate。

生产路径的 ZIP 格式识别、OOXML parse 和 DOCX 图片解压均进入独立 parser worker；success / failure / cancel 后 terminate，crash / messageerror / contract mismatch 明确失败。没有新增 production byte cap、decode deadline 或自动 retry。

Activity 两 channel 保留完整独立逻辑文本；QA DOM 使用每 channel 单一 Text node、frame-coalesced append，没有逐 delta 节点增长或同步 layout read。紧凑 Product preview 仅为既有展示摘要，不再充当逻辑内容容量。observer 关闭不取消模型请求；clear / dispose 取消 render frame 并释放 DOM。

Synthetic real Chrome probe：DOCX/PPTX/XLSX 三格式 native text / locator 保留，PPTX visual gap 保持 Partial；corrupt archive、crash、cancel 后其他 Source 可完成，worker 创建与终止数一致。20,000 delta 共 40,000,000 字符（reasoning 15M / output 25M）完整保留，DOM 各 1 Text node，pending render frames 2，per-delta synchronous layout read 0；scroll / hidden append / reopen / clear / dispose / reduced-motion 通过。耗时约 3.533 秒，仅为本机 synthetic telemetry，不建立容量或 timeout 边界。该 probe 不调用 AI，不 Fetch 课程。

证据：`.tmp/v030-015-browser-blockers.json`、`.tmp/v030-015-targeted.log`；正式长期脚本 `scripts/v030-blocker-check.mjs`。完整 CI 与真实 Rebuild 结果待后续本节记录，不预先声明 PASS。

启动审查额外发现 QA bridge 重复注册 clean Rebuild / progress / retrieval / triage handlers；已删除第二份重复注册，保留独立 teaching-classification bridge。启动 probe 断言每种 handler 只注册一次，防止单一验收请求发生重复 dispatch；修复前未启动 P2E-015 workflow。

### 唯一 clean Rebuild：STOP，不能判定 PASS

启动前全部 deterministic gates / browser probe 和完整 CI 通过（611 tests：extension 589、backend 20、contracts 2）。已 reload QA extension 并刷新 1 个已打开 NTU Learn tab。Baseline 保留 5 historical workflows。实际新 workflow 为 `wf_3ee80256bee2d6d2fb0e805c`，`qaSemanticClean=true`；旧 semantic result / private attachment Fetch shortcut 未使用。

Discovery 117 Sources；19/19 附件取得；117 observations，Fetch failure 0；parse 99 ok / 18 Partial。native units 880、visual gaps 852；附件 content hash、native text + locator 与基线逐项相同，Source count 守恒。fresh classification 24 targets：16 PROCESS（11 attachments + 5 native file nodes）/ 8 Deferred attachments / 0 Uncertain；PROCESS 381 units / 375 gaps，Deferred 499 / 477；实际 Task A eligible 109 Sources，未 hard-code 8 Deferred。

classification 1 physical / 1 logical：39.221 s，input 14,654、output 11,432（其中 reasoning 8,392），Provider natural cache hit 384 / miss 14,270。这是 fresh invocation，不是历史 semantic cache。

最后完整 snapshot 时 Task A 22 completed physical requests；package telemetry active peak **至少 11**，completed-span physical AI peak **至少 9**。completed spans 的 average 6.096、latency median 8.374 s / P95 35.521 s 只描述该 snapshot 已完成请求，不是 final workflow peak / average。3 initial schema failure、0 observed repair；其最终 disposition 尚无法读取。已记录 physical ledger 合计 23 calls、input 194,443、output 81,765（reasoning 53,990 included）；这是 lower bound，不是最终账单。currency tariff 未核验，不猜测 cost。

运行期间出现 CDP attachment timeout / 异步 IndexedDB snapshot 读取阻塞。关闭 QA Full-page observer 后主 browser CPU 约 112% → 14%，但相关 renderer 仍约 107% CPU；采样 physical footprint 2.8 GiB（peak 2.9 GiB）。这些事实不足以确定 renderer identity、memory ownership 或根因，不能直接归咎于单一 renderer / parser / Activity。同步 debugger inspection 仍可成功；当前 phase 为 Task A，provider in-flight 为 0，latest stream finished（reasoning 489 / output 758 chars），phase AbortController 已明确 aborted。

已通过当前 phase 的既有 AbortController 停止新增 Task A admission。没有重启 / reload extension、没有清空数据、没有新建第二个 workflow、没有自动 Retry、没有 Task B/C、没有 Use/Keep 变更。保留当前 live worker / durable workflow / private evidence，最后可读 durable state 为 working/Task A；最终 durable failure/retry state 尚未核验，不能伪造为 terminal failed。

**Validation outcome：`STOP_RUNTIME_OBSERVATION_BLOCKED_NOT_PASS`。** synthetic probe 验证内容与 DOM coalescing，但没有证明后续 Chrome paint / accessibility / IPC / long-run resource 行为完全正常。真实长运行仍有 blocker，不得将 synthetic PASS 当 final real-course PASS。

最后完整 snapshot 核验 trusted tables、5 historical workflows、historical AiRuns 均未变；停止后因异步读取阻塞，最终同等核验待恢复只读访问。不能声称最终状态完整验收通过。Task B context、Preview、完整 Task A 时长/并发、schema failure disposition、最终 token/request ledger 均缺数据。后续需定位 stall，并依据 Product 授权决定 targeted regression / explicit Retry；不得直接再跑 full workflow。

公开脱敏 accounting / manifest：`artifacts/v0.3.0/clean-rebuild-015/REPORT.json`。Private snapshots / traces / stop proof / native process sampling 留在 `evidence/private/v030-clean-rebuild-da005-015/`；不出站同步。

### 完整 Source Manifest（classification targets）

以下 classification 来自本次 fresh AI；类别列仅为 AI rationale management-signal 摘要，不是 filename routing 或 Blackboard native role 断言；角色不能确定时为 Uncertain。文件扩展名仅用于格式 metadata，不用于推断角色。完整 reason summary / native type / scope 在公开 JSON。

| Source Ref | Safe label | Kind / format | Decision | Native units | Gaps | Task A | PROCESS signal category |
|---|---|---|---|---:|---:|---|---|
| s:d480eff1f40883a3 | Attachment 01 | attachment / pdf | PROCESS | 3 | 3 | Yes | Assignment / Assessment; Exam; management-signal Lecture |
| s:bedb0dc519ad9d47 | Attachment 02 | attachment / pdf | PROCESS | 1 | 1 | Yes | Assignment / Assessment; Academic Integrity |
| s:263ebed4d9f23477 | Attachment 03 | attachment / format metadata unavailable | TEACHING_MATERIAL_DEFERRED | 91 | 91 | No | — |
| s:2c89357257bd3faf | Attachment 04 | attachment / format metadata unavailable | PROCESS | 95 | 93 | Yes | Academic Integrity; management-signal Lecture |
| s:641705c0258afe99 | Attachment 05 | attachment / format metadata unavailable | PROCESS | 69 | 69 | Yes | Academic Integrity; management-signal Lecture |
| s:3396be27ea6e8999 | Attachment 06 | attachment / format metadata unavailable | TEACHING_MATERIAL_DEFERRED | 72 | 71 | No | — |
| s:7b33bd3b1977bd7b | Attachment 07 | attachment / format metadata unavailable | TEACHING_MATERIAL_DEFERRED | 68 | 67 | No | — |
| s:c7a29f1053fe8e47 | Attachment 08 | attachment / format metadata unavailable | TEACHING_MATERIAL_DEFERRED | 15 | 7 | No | — |
| s:55e17016283318cf | Attachment 09 | attachment / format metadata unavailable | PROCESS | 4 | 0 | Yes | other / Uncertain |
| s:b2b37c4e1190022f | Attachment 10 | attachment / pdf | PROCESS | 18 | 18 | Yes | Course Outline; Assignment / Assessment |
| s:b64b45a18bf0ed6f | Attachment 11 | attachment / pdf | PROCESS | 3 | 3 | Yes | Assignment / Assessment; Exam |
| s:656a31fab1884c2b | Attachment 12 | attachment / pdf | PROCESS | 1 | 1 | Yes | Assignment / Assessment; Academic Integrity |
| s:8b5f9ad3cc43e3f9 | Attachment 13 | attachment / format metadata unavailable | PROCESS | 86 | 86 | Yes | Academic Integrity; management-signal Lecture |
| s:bfe87784144a9ed5 | Attachment 14 | attachment / format metadata unavailable | TEACHING_MATERIAL_DEFERRED | 98 | 96 | No | — |
| s:3a8b088cee8d03e9 | Attachment 15 | attachment / format metadata unavailable | PROCESS | 83 | 83 | Yes | Academic Integrity; management-signal Lecture |
| s:87b5dc6b19f0a6eb | Attachment 16 | attachment / format metadata unavailable | TEACHING_MATERIAL_DEFERRED | 72 | 71 | No | — |
| s:447ee79510ba77bb | Attachment 17 | attachment / format metadata unavailable | TEACHING_MATERIAL_DEFERRED | 68 | 67 | No | — |
| s:2fa8b4f4755fc41f | Attachment 18 | attachment / format metadata unavailable | TEACHING_MATERIAL_DEFERRED | 15 | 7 | No | — |
| s:79ca572e01a1ddf9 | Attachment 19 | attachment / format metadata unavailable | PROCESS | 18 | 18 | Yes | Assignment / Assessment |
| s:ae77db7fb91ce967 | File Source 20 | course-content-item / pdf | PROCESS | 0 | 0 | Yes | Assignment / Assessment; Exam |
| s:9525547faaf54802 | File Source 21 | course-content-item / pdf | PROCESS | 0 | 0 | Yes | Academic Integrity |
| s:6ff42c6deba73d2c | File Source 22 | course-content-item / pdf | PROCESS | 0 | 0 | Yes | Course Outline; Assignment / Assessment |
| s:85af4369021bce79 | File Source 23 | course-content-item / pdf | PROCESS | 0 | 0 | Yes | Assignment / Assessment; Exam |
| s:d43330692ebccd70 | File Source 24 | course-content-item / pdf | PROCESS | 0 | 0 | Yes | Academic Integrity |

机械汇总：19 attachments = 11 PROCESS + 8 Deferred；880 units = 381 + 499；852 gaps = 375 + 477。5 native file nodes 为 PROCESS，native unit 数为 0，不与其关联附件重复计数。

Closure CI：`npm run ci` 全项再次 PASS（611 tests），证据 `.tmp/v030-015-ci-closure.log`。本轮22个出站路径已逐文件冲突预检，0 conflict；同步只包含正式代码/测试/设计/报告与脱敏manifest，不包含Private证据或Product-authority inbox。最终同步结果由现有 E2P 和 `.tmp/v030-015-outbound-result.json` 记录。

## 20. P2E-016：只读 runtime forensics / Recovery Gate STOP

重新读取并定点同步 `P2E-v0.3.0-2026-10-06-016 / READY`。本轮没有新的模型调用、Retry、workflow、extension reload、Discovery/Fetch/parse 或 semantic state 修改。原 workflow `wf_3ee80256bee2d6d2fb0e805c` 的完整 durable read 已恢复：`failed / task-a / INTERNAL`，detail 为空、attempt 1、无 lease、paidRetryAvailable=true；不是之前最后可读的 working。

完整保存的 trace 补全 P2E-015 lower bounds：110 physical calls = 1 classification + 109 Task A；Task A 100 provider-success / 5 schema / 4 invalid-json；99 succeeded AiRuns 和 99 package checkpoints、9 failed AiRuns、1 尚无 verified durable result。100 physical success 不能解释为100 reusable result。staging 成功95 / 失败9；所有成功 checkpoint 保留，尚未重新验证每个 fingerprint/contract，因此不宣称 Recovery Gate 8 PASS。24 classification checkpoints 保留。

实测 package / AI in-flight peak 均为16；无 render span，不能将852 native gaps解释为已请求852 Vision。Task A provider median 10,767 ms / P95 81,989 ms / max 97,708 ms。最后 physical completion 18:08:03.498 UTC，最后 package completion 18:09:11.744，failed durable timestamp 18:20:47.766；请求结束至 terminal 约12分44秒，package结束至 terminal约11分36秒。此间耗时不能归因于 provider latency，暂未完成 production postprocessing / observer / IDB starvation 因果隔离。

ledger 全110次累计 input 1,301,768 / output 391,131 / reasoning 192,365 tokens；reasoning可能属于output子集，不能相加作为总计。provider cost为空，不估算价格。automatic Retry 0。此轮诊断调用0，因此没有新增API成本。

已复现的独立观察问题：Node native WebSocket 对 Chrome CDP 16/20 MiB response 断连1006；Playwright bundled transport相同完整响应成功。两者对 loopback WebSocket 16/20 MiB均成功，故不能推断普通字节容量上限。通过 Playwright root CDP session读取既有 offscreen target完整约19 MiB DB，未截断。这个结果只证明诊断 transport问题，不足以解释原运行renderer 2.8 GiB /高CPU及长时间后处理停顿。当前直接只读IDB可以完成，不代表过去不存在transaction starvation。`readMetadata()`没有production调用，排除其作为hot path根因。ALL_TABLES写作用域、local staging触发GET_VIEW均仅是待验证线索，没有凭猜测修改代码。

trusted tables（courses忽略enrollment updatedAt）、5 historical workflows与全部historical AiRuns，逐记录/规范化SHA比较均 unchanged。staging归属于当前workflow；无lease。原session自然退出；读取storage的临时offscreen normal tab可能唤醒新worker，已关闭临时tab，未 reload。旧STOP proof provider in-flight0得以保留，但新session controller/provider registry/owner reconciliation尚未完整复核，不将其冒充Gate 6/7 PASS。

**Recovery Gate STOP**：Gate1原始runtime根因不完整；Gate2没有充分依据的production隔离/修复；Gate6/7当前session复核和Gate8全部contract/fingerprint复用验证未完成。不得消费唯一Retry，未进入Task B/C/Preview/Use/Keep。没有新capacity/timeout/concurrency/memory限制。本轮只更新正式诊断事实与脱敏accounting；private原文、payload、attachments、snapshot、.tmp及QA profile不出站。

正式脱敏证据 `artifacts/v0.3.0/recovery-016/REPORT.json` 包含各成功/失败AiRun ID、SHA Source refs、unverified集合及private证据hash。保留P2E-015 Source Manifest和历史报告，不覆盖旧事实；本节是后续恢复观察。当前执行模型/推理设置由会话系统管理，无法取得可靠额度/成本数值，不编造；未使用subagents。本轮直接干预只有只读CDP/IDB/storage probes及文档收口，无真实workflow重跑。

本轮完整 `npm run ci` PASS（611 tests），证据 `.tmp/v030-016-ci.log`。没有bundle逻辑修改或reload；诊断现场与cache保留。3文件定点冲突预检通过，最终SHA结果由现有E2P与 `.tmp/v030-016-outbound-result.json` 保存。

## 21. P2E-017：Task A ordered commit reconciliation / Narrow Gate STOP

只定点读取/同步最新P2E-017 / READY；本轮未运行Provider、Retry、新workflow、Discovery/Fetch/parse/classification、Task B/C或Use/Keep。DA-005/DA-004语义和coverage未变。

### 21.1 109-package机械闭合与4项差额

完整109行脱敏表见 `artifacts/v0.3.0/recovery-017/RECONCILIATION.md`；机器明细在同目录 `RECONCILIATION.json`（AiRun ID、admission、physical start/end、finish/usage、package end、schema/invalid-json disposition、checkpoint contract/fingerprint、staging/retry集合、stable order）。原始build没有staging write start/end instrumentation，这些字段明确为Unknown/null，不把replay时间伪装成真实时间。

99个success的Task A contract/package fingerprint全部通过；24分类checkpoint的contract/profile fingerprint/同workflow identity全部通过。9个失败均durable AI_CONTRACT；1个 `s:5ddf451c0b89d6ab` 是order104，physical provider完成但AiRun/checkpoint/staging均无verified成功：保持paid-unverified，不推断成功，也不自行补写结果。重试集合机械为9failed+1unverified；4个unstaged成功结果全部排除。

| Order (0-based) | Source/package ref | AiRun | Disposition |
| --- | --- | --- | --- |
| 105 | `s:8f27cd96a31615dd` | `airun_43c03d9fdd69e591e463f544` | Valid / not reached / excluded from Retry |
| 106 | `s:74b1accd0747e8bd` | `airun_0d18dcf4b1caccd830e879e2` | Valid / not reached / excluded from Retry |
| 107 | `s:b3b63353d81e2488` | `airun_65a80004a5a8ebd2a49ad0fd` | Valid / not reached / excluded from Retry |
| 108 | `s:4e063785eb2f8c60` | `airun_20194ec92e81c02775286733` | Valid / not reached / excluded from Retry |

0–103已经完成95success/9failed；order104不是durable AI_CONTRACT outcome，进入unexpected-failure分支终止ordered loop，105–108根本未进入recordUnderstanding/persistTaskADrafts/recordTaskASuccess。这解释4项差額及这些Source的observation仍停在parse阶段；不是删缓存或观察计数误差。**原始unexpected exception类型/stack未持久化，不能解释它为何发生。**

### 21.2 时间定位与零模型replay

last physical 18:08:03.498 UTC；last package end / first observation创建18:09:11.744；第二个observation创建18:20:45.218；durable failure18:20:47.766。第一项ordered commit区间约693,474ms（11m33.474s），后续0–103的提交主要在约2.55秒内完成。observation时间在recordUnderstanding构造写入记录时生成，因此stall位于第一项的understanding write / downstream staging/coverage path区间，尚不能把它指认到某个transaction或GET_VIEW。

`node scripts/v030-postprocessing-reconcile.mjs` 从private snapshot和保存trace机械重建；`node scripts/v030-postprocessing-replay.mjs evidence/private/v030-recovery-017/BEFORE.json` 在全新无凭据Chrome/localhost origin的scratch native IndexedDB，以真实19MiB量级tables、99真实payload和相同109顺序执行production postprocessing methods。另有fake-indexeddb replay约0.30秒；native replay约363.60ms，95/9、INTERNAL/empty detail与原disposition一致；native transactions无abort。private browser evidence记录transaction open/complete/abort/error、staging bytes/duration和各item阶段。

replay对缺失原始异常使用显式injected empty Error，仅验证disposition/ordered-stop行为；没有声称重建原始异常。staging使用structured-clone KV模拟record shape，并非Chrome.storage.local IPC/quota/lifecycle reproduction。**没有复现11分钟stall，不能关闭causal root-cause Gate。**

### 21.3 诊断边界与验证

新增observation-only边界：packages-settled/count → per-item understanding write → drafts staging → coverage/failure staging → unexpected outcome → terminal decision → durable failure write。error只记录name/code及stack identity hash，raw stack留private harness。IDB transaction open/complete/abort/error、connection blocked/versionchange可观测；transaction observation显式opt-in默认关闭，避免normal ownership polls灌满已有QA trace。没有增加等待、timeout、memory/bytes/concurrency cap、重试或settlement语义，也没有因ALL_TABLES/GET_VIEW看起来昂贵而重构。两个regression检查exact error identity/no retry、complete/abort与open-ID匹配及detail不泄漏。

完整CI613tests PASS；加载诊断QA bundle并刷新当前1个NTU tab。temporary extension page随runtime reload关闭导致harness等待报错，随后只完成refresh/after-read，没有第二次reload或workflow重跑。加载前后全部16个target tables（courses仅忽略enrollment updatedAt）和staging hash一致；当前provider in-flight0，6个workflow均failed/nolease，无自动resume；历史5个workflow与historical AiRuns仍和015 baseline一致。这个idle加载probe不是原始active-workload stall的修复证据。

### 21.4 Narrow Recovery Gate

| Gate | 项目 | 状态 | 证据/限制 |
| --- | --- | --- | --- |
| 1 | Outcome reconciliation | PASS | 109 packages individually aligned; historical staging timings explicitly Unknown |
| 2 | 99/9/1 disposition | PASS | 99 valid checkpoint successes, 9 AI_CONTRACT failures, 1 paid-unverified result |
| 3 | Four checkpoint/staging gap | PASS | Commit order104 stops; successful order105–108 never enters commit; 0–103=95 success+9 failure |
| 4 | Original stall causal root cause | FAIL | 11m33.474s localized to first ordered commit interval; historical IDB/staging/view begin/end and original exception absent |
| 5 | Root cause repair/isolation | FAIL | Observation boundaries added only; no speculative state-access or scheduling repair |
| 6 | Exact-scale replay | PARTIAL | 109-package real payload/native IDB replay reproduces95/9 in<0.4s; original unverified error represented; storage.local backend not reproduced |
| 7 | Browser/IDB/worker regression | PARTIAL | Native IDB replay + idle QA worker load/hash conservation PASS; original active-workload stall not reproduced |
| 8 | Durable workflow readable | PASS | failed/task-a/INTERNAL, no lease |
| 9 | 24 classification checkpoints reusable | PASS | All contracts/profile fingerprints/same-workflow identity verified |
| 10 | 99 Task A checkpoints reusable | PASS | All contracts/package fingerprints verified |
| 11 | Unresolved retry set excludes successes | PASS | 9 durable contract failures + 1 paid-unverified; 4 unstaged valid successes excluded |
| 12 | Provider in-flight0 | PASS | Read-only E2E_PROVIDER_PROGRESS before/after diagnostic QA load |
| 13 | Owner/session reconciled | PASS | Previous worker ended; new diagnostic QA worker, all6 workflows failed, no lease/stale writer, semantic hashes unchanged |
| 14 | Trusted Current State unchanged | PASS | All trusted tables match before/after; enrollment updatedAt normalized |
| 15 | History unchanged | PASS | 5 historical workflows and historical AiRuns match015 baseline |
| 16 | No new arbitrary hard limit | PASS | No capacity/deadline/concurrency/retry budget changes |
| 17 | Full CI | PASS | 613 tests; final closure CI proof .tmp/v030-017-ci-final.log |

**STOP。** Gate4/5未通过，6/7仅部分覆盖；唯一explicit Retry未消费。没有新付费调用、成本或Task B/Preview指标。原始transaction/view/worker阻塞现场已消失且没有历史phase instrumentation，目前不能靠只读当前状态证明原始stall因果；不以secondary CDP问题替代、不选择猜测修复、不重跑付费验证。private attachments/cache/原文/输出/证据/.tmp/QA profile全部保留本机。正式REPORT/109表与工程文件定点出站，Product authority语义不修改。

## 22. P2E-019 guarded containment / 唯一 same-workflow Retry

入站为 `P2E-v0.3.0-2026-10-06-019 / READY`，实际挂载确认后仅同步 inbox / PRD 两文件。P2E-019 的 guarded containment contract 取代本次恢复前必须证明历史 stall 因果的要求；历史 §21 原始事实保留，不宣称历史根因已修复。

### 22.1 Containment 与启动 Gate

post-processing 在写入前及逐项验证当前 owner；独立成功结果继续落盘，failed / unexpected / paid-unverified 不阻断后续成功。首个 unexpected error 在所有可验证本地 commit 后仍明确终止，未吞错或自动付费 Retry。fatal admission stop 会等待已经派发请求 settle，并返回成功及未派发 disposition，供成功 checkpoint 保留；默认 scheduler 调用行为不变。

新增 appMetadata durable diagnostics：stage、Source hash ref、order、start/end/error、timestamps、elapsed、detail hash / empty flag；原始课程文本不进入诊断，stack frames 仅私有持久化，出站不含 stack。diagnostic transaction 绑定 active lease，terminal write 绑定 failed attempt；失去 ownership 不再写。没有改变当前 workflow package / prompt / fingerprint / retry identity，没有新数字限额。

109-item real-payload native-IDB 零模型 replay：99/99 成功 staging、10 unresolved，约586.6ms；order105–108 不再被104异常阻断。原始104 error 仍以明确 injected empty Error 表示，scratch staging 是 structured-clone KV，不证明原始 Chrome.storage IPC 或11分钟 stall 因果。51 targeted regressions PASS；完整 CI616 tests PASS，包含格式、build、typecheck、lint、manifest、secret scan、docs、QA/release separation。QA bundle reload 后刷新1个 NTU tab；16表及 staging hash 守恒，provider0，无 stale owner。24 classification、99 Task A checkpoint contract/fingerprint 全部可复用；最终 unresolved 由记录计算为9 failed +1 paid-unverified，非固定容量。

### 22.2 唯一授权 Retry：STOP_AI_CONTRACT

2026-10-06 02:56:02.865→02:57:20.772 UTC，约77.907s；沿用 `wf_3ee80256bee2d6d2fb0e805c`，未新建 workflow。10次 physical Task A 请求严格对应机械 unresolved set，actual AI/package peak10；classification paid calls0，旧99 successful paid reruns0，automatic repair / second Retry0。8成功、2 schema failure；provider latency median/P95 与 ledger 见正式 REPORT.json，不把缺失价格猜为成本0。

两次失败均返回 `schema:"syllab.ai/task-a/1"`，预期精确值为 `syllab.ai.task-a/1`；输出未截断。现有 prompt 已明确精确 schema，不通过本地 silent normalization 或放松 contract 接受。依 DA-004 保留失败并停止，未再次调用模型。

全部109 outcome 完成本地处置；post-processing 5.54s，staging107 success /2 failed。原始 order104 本次成功；原先 unstaged105–108 均落盘；旧 AiRuns 所有原记录结构不变，24分类仍复用。117 Source /19附件 /880 units /852 visual gaps及 native text/locator覆盖守恒（新增 understanding 元数据与 objective parse 分开核算），无 Fetch/parse/Discovery/Vision。trusted10表和其他5个历史 workflow不变；terminal failed/task-a/AI_CONTRACT、provider0、无lease；325条 durable post-processing diagnostics。

没有 Task B、Task C、Shared Working Context / Rebuilt Preview、Use/Keep 或 final acceptance evidence；没有 commit/push/tag/release。Activity真实UI未作为本轮额外验收，不伪报PASS。19附件 private cache、原文、raw模型输出、private证据及历史workflow保留。

### 22.3 停止点与 physical batching gap

按 P2E-019 §11 recovery failure 分支 STOP，唯一授权 Retry 已消费。multi-Source physical batching仍是已有产品要求的 implementation gap，**未实现、未启用，17项 batching Gate和109 offline packing simulation未执行**。本次没有为了 batching 修改失败现场、迁移 current workflow或失效旧checkpoint。下一步可纯离线设计/实现，但新的付费恢复或课程运行需要新的明确 Handoff；不以当前107成功掩盖未到Preview。

正式证据：`artifacts/v0.3.0/recovery-019/RECOVERY-GATE.json`、`REPORT.json`及109行RECONCILIATION；私有完整快照/trace/diagnostics/replay留 `evidence/private/v030-recovery-019/`，不上传。本轮定点出站 manifest / hash / conflict状态见现有E2P。

最终收口另增加terminal diagnostic ownerRef/start-record校验，防止attempt reset后旧owner覆盖新terminal诊断；新增deterministic regression，最终CI617tests PASS，无新paid retest。physical batching保留未完成状态。

## 23. P2E-020 / DA-006 Partial续行与Task B contract STOP

### 23.1 当前课程零成本修复与downstream readiness

入站P2E-v0.3.0-2026-10-06-020/READY，明确Changed Files为inbox/PRD/DA三文件，实际Drive挂载定点同步，0conflict。HEAD仍26426a3793250aea351c443e3327ccdb1b95b697，既有状态不删除。DA-006允许Unresolved继续，不追求109/109。

已检查两个失败AiRun及已保存contract证据：完整Task A失败payload未保存，只有schema error/head摘要，不能证明sole mismatch。因此zero-cost repair0；没有第二次paid Task A Retry。实现严格机械alias helper：只改syllab.ai/task-a/1→syllab.ai.task-a/1，完整validation重新通过才返回原样其他字段及deterministic_compat_repair hash provenance；当前未虚构修复checkpoint。

实现settled Rebuild的continueTaskAPartial：107成功checkpoint逐项重新校验当前Source/policy/fingerprint/contract；atomic claim，保留原失败records；仅当前workflow的两个未完成observation/Source understanding为Partial；native content/locator不变。workflow/staging持久化独立semantic coverage manifest。Task B仅使用成功Task A Shared Working Context、staging Evidence及成功Source native expansion catalog，另收hashed unresolved manifest；不会带入历史trusted Evidence或为Unresolved自动补Task A。Preview metadata可承载Partial；未新增Retry Center或修改控制文案。未来workflow的multi-Source/bounded recovery仍未启用，不把本次定点续行当作全部DA-006实现完成。

真实快照native-IDB scratch zero-model probe：107contexts、2Unresolved、Full failed payload0、修复0；所有trusted10表和历史observations原样。scratch staging仍是structured-clone KV，非真实storage.local IPC压力证据。5新增targeted regressions+完整CI622tests PASS；QA reload刷新1个NTU tab，16表/staging hash守恒、provider0，无自动paid resume。

### 23.2 唯一Task B调用与真实失败

同一workflow直接从Task A partial/downstream-ready进入Task B。Task B received107成功contexts、239supplied Evidence和2Unresolved manifest。只有1次Task B physical request，正常Evidence expansion0、Task A/classification/Discovery/Fetch/parse/Vision0、Task C0、新workflow0。workflow续行wall300.412s；Provider294561ms，input183795/output84482（其中reasoning42348）、cache hit0/miss183795、finish stop。cost无explicit dated pricing输入，Unavailable，不填0。没有timeout/容量拒绝，没有改固定数字。

返回schema正确，JSON输出154480chars完整未截断；先触发AI_CONTRACT:evidence_not_supplied。完整失败output/context/reasoning从仍打开的QA sidepanel保存在本机private目录，不上传。离线只读audit查到213个unique Evidence IDs，全部在任何输入section均未出现；24identity、17canonical proposals、13field consolidation、5structural relationships、13unresolved rows，共72个带Evidence行全部失败供应证据检查。进一步shape validation还触发AI_CONTRACT:evidence.excerpt。无requestedEvidenceRefs，不能把重发原请求称为正常Evidence expansion。

该audit只检查contract/provenance，不接受这些候选为语义结果。17canonical proposals等都是**被拒绝的候选**，并非最终Assessment。没有合法Task B Same/Different/Uncertain、canonical facts/confidence/completeness或Preview验收数据；最终verified B logical results0。

### 23.3 最小技术冲突与STOP

现有Task B为课程级完整结果contract，未定义独立item success/failure/checkpoint与跨item依赖闭包；本次所有带证据行都失败，不能形成已验证的成功sibling subset。替换Evidence IDs、补excerpt、删不支持的claim或将Task A provisional drafts冒称canonical Task B Preview，都会改变语义或丢失provenance，不属于零成本机械schema repair。按P2E-020§6“若现有Task B state model无法表达partial，先STOP并说明最小技术冲突”，返回Product Review；不进行第二次B调用或paid retry。

现场failed/task-b/AI_CONTRACT，provider0，无lease。Task A仍107成功/2Unresolved、zero-cost repair0、已完成1Recovery wave/10paid recovery calls；legacy Main为continuous admission，无wave ID，actual Main waves Unknown，不把109/16的理论值当实测。staging保留A provisional objects及unresolved coverage，B失败不写入canonical/staging results。trusted10表、历史5workflows、历史observations及既有AiRuns全不变；117Source/19附件/880units/852gaps、全部native text/locator守恒。旧cache/失败payload证据不清除。

实际Activity DOM：reasoning153850chars/output154480chars，各1Text node，两channel独立保留，未因output校验失败删除reasoning；这仅证明本轮已观察的完整流，不推广为所有生命周期压力测试PASS。worker跨294.6s请求保持当前owner，失败后释放，无stale completion、自动重派或新arbitrary limit。

未进入Rebuilt Preview；因此P2E-020的Preview之后batching启动点未达，batching implementation、17gates及109-source packing simulation仍未开始。只读查看官方Provider docs/text tokenizer metadata，没有安装本地视觉模型、修改capacity/defaults/dependencies或启用batching。没有Task C/Use/Keep、cold-start、新Rebuild、commit/push/tag/release。正式脱敏Gate/Audit/Activity/REPORT及本轮工程manifest定点出站；所有原始课程/模型数据仍private。


## P2E-021 / P2E-023 Task B grounding hardening checkpoint（未消费 recovery）

本轮以 P2E-v0.3.0-2026-10-06-023 / READY 为最新授权。仅 Inbox 定点入站；021 Product 语义继续有效。没有执行真实模型调用，也没有改动 current workflow 或 trusted state。

已实现但尚未部署到 QA extension：Task B schema2 显式 Evidence registry / reversible compact aliases、6类 item / input identity / dependency validation、independent sibling durable checkpoint、progress-driven Evidence expansion（无固定 round 上限）、一次 recovery durable dispatch fence 与零付费 checkpoint resume。旧 hallucinated output 只保留 diagnostic，未修引用、补 excerpt 或接受其语义。Activity reasoning/output 完整私有 buffer 独立于按实测 viewport 的 DOM projection。当前 Task B recovery serializer 省略可选 max_tokens；撤销393216数值改动，没有新增容量数字。Recovery fingerprint 不再复用旧schema1/prompt2 fingerprint，compatibility flag 进入新 fingerprint，legacy Task A fingerprint 保持原口径。

零模型证据：真实快照的隔离 native-IDB + cloned KV probe（不是实际 Chrome.storage IPC），107 successful contexts / 2 unresolved / 239 Evidence；synthetic verified sibling 与 invalid sibling 分开 checkpoint，重复 expansion no-progress 停止，storage fault 后保留已写 raw/result 与 checkpoint，重启恢复不再付费。已有 pressure probe 保留153850 reasoning /154480 output chars，DOM每channel只显示410chars、1Text node；约9.3/0.6ms是该probe观测，不能作为容量边界。最终 npm run ci PASS：630 tests（2 contracts /608 extension /20 backend），含构建隔离和secret扫描。

**Anti-cap Gate NOT PASS，不能把上述 grounding PASS 解释成全部 preflight PASS。** 当前48MiB inline request helper仍应用于text-only B，拒绝后没有自动continuation；finish_reason=length仍使本次completion失败，无法checkpoint完整prefix item及继续pending工作。两条路径见 ACTIVE-LIMIT-INVENTORY.json，不通过换数字修复。当前schema2只能证明已返回items的provenance和dependency correctness，不能证明未返回的draft/source工作已经完成。全部Source IDs出现在context也不能证明semantic completeness。

最小跨请求闭合设计仍需解决：显式输入工作身份/processed与pending状态；完整item前缀checkpoint（不补残缺JSON语义）；同一logical attempt自动continuation及exact新增Evidence；跨partition dependency unresolved直到闭包成立；只有所有输入工作被明确处理/Unresolved才关闭logical attempt。反例：Source A/B看似独立，但C决定两者是否同一assessment；按字节先拆A/B并接受canonical identity将改变Product Same/Different语义。不能用Local聚类、固定Nitems、覆盖率猜测或“当前course装得下”绕过。此处停在 prepaid anti-cap continuation contract review，尚未形成跨physical request的全局judgment/completeness闭合证据；不宣称架构冲突已经获得Product裁决，不把实现缺口伪装成新增限制获准。

真实只读 before/after：16表与staging全部hash一致，workflow wf_3ee80256bee2d6d2fb0e805c 仍failed/task-b，provider0；117 Sources /19附件 /880 native units /852 gaps及107/2 Task A状态保留。未消耗唯一recovery wave，未生成新Preview，没有Task A/classification/Discovery/Fetch/parse/Vision/C、新workflow、cold-start、Use/Keep、commit/push/tag/release。Task A physical batching继续pending。没有reload未通过全部Gate的bundle；当前QA仍运行020版。Private原文/附件/raw output/.tmp/profile不出站。

## 24. P2E-024 logical continuation 实现与唯一真实 recovery

### 24.1 启动前 gates 与证据边界

按 P2E-v0.3.0-2026-10-06-024 / READY 定点同步唯一 Inbox，HEAD 26426a3793250aea351c443e3327ccdb1b95b697，开始 dirty143 entries；没有 Product 语义改写。实现 native durable logical work ledger、owner/session atomic fence、pre-generation capability 技术 partition、length 完整 item prefix checkpoint、global disposition/dependency/candidate-retirement closure、progress-driven Evidence expansion与重复/无进度停止。Text-only B 不继承 vision48MiB guard，没有换成另一个猜测上限，可选 max_tokens 不发送。没有固定 request/partition/round/item/token/runtime 总量上限。

15项启动 gates 全部 PASS，首轮完整 CI643 tests。8种隔离 browser probe 使用真实107/2/239快照及 native IndexedDB，Chrome.storage由cloned KV注入；actual QA Chrome另做670521B staging roundtrip / getBytesInUse检查、16表/实际staging conservation和bundle reload，刷新1个NTU tab。Oversized3次synthetic physical calls（1拒绝+2生成）、reconciliation4次（含长度prefix/拒绝/片段续行）、length2次、ambiguous1次不再派发、expansion2次typed no-progress、storage-fault/raw-restart保持verified sibling与same-workflow raw reuse。原 Task A baseline保留，canonical staging不混合A provisional drafts。全部synthetic/injected probe模型0、actual workflow writes0；不能解释为真实Provider throughput/semantic recall PASS。

Activity压力以历史153850 reasoning /154480 output chars执行4次synthetic physical stream，完整写入private native archive4条；DOM每channel1Text node、410chars测量投影，清output不清reasoning。QA archive模块和marker加入strict shipping/QA separation。失败private archive有明确telemetry，legacy metadata session trace quota仍是观察风险。

### 24.2 唯一真实 logical attempt：schema拒绝 → degraded Partial

Gates通过后直接消费已有P2E021唯一recovery授权，无再次许可；same workflow `wf_3ee80256bee2d6d2fb0e805c`，2026-10-06 07:39:27.250→07:42:23.545 UTC，约176.295s，Provider176164ms。1logical attempt /1physical dispatch，finish_reason=stop；未触发body拒绝、length、partition或Evidence expansion，repair/freshRetry0。Provider input286512/output54811，其中reasoning17880；cache hit1536/miss284976。Cost Unavailable，不把null当0；1样本median/P95均176164ms，只是这一请求。

完整JSON100286chars、reasoning58084chars均完整archive。模型输出schema `syllab.ai/task-b/2`，要求为 `syllab.ai.task-b/2`，差异是ai后slash而非dot。实际system仅含正确schema，user不含错误literal；不是发送了旧prompt或内部timeout。56个raw items（含17 canonical候选）全部未被接受，verified B canonical0。未做本地schema语义修复、未将被拒绝JSON的items视为成功。失败是known-response/consumesApi:true，不是paid-unverified、未自动重新派发。

Logical ledger required160 =107成功Source refs +51 A draft refs +2 A Unresolved refs；最终processed0、explicitUnresolved160、pending0。旧A两项已经明确Partial，其余因本次contract failure明确Unresolved；不声称完成跨Source语义。Workflow进入waiting/review，provider0、lease释放。原A provisional drafts51及239Evidence保留为降级Preview输入并明确provisional；全部A staging baseline在private ledger完整保存。Task A107success/2Unresolved、117Sources/19附件/880nativeunits/852visual-gap **units**守恒；一个unit可含多个gap原因，不用原因条目之和代替visual locator数量。Sources/observations/旧AiRuns/trusted10表/history/其他历史workflow逐项hash全一致。

与020失败请求分开比较：020 Provider294561ms/input183795/output84482、reasoning42348、JSON154480chars，verified canonical0；024 Provider176164ms/input286512/output54811、reasoning17880、JSON100286chars，verified canonical仍0。不同schema/output体量，不能将耗时降低约40%宣称为完整产品性能PASS。当前B framing重复完整registry/context使实际input增加，仍是优化观察点；没有通过减少Source/页面/文本/locator来缩短时间。

### 24.3 真实Preview blocker与零模型修复

真实workflow到review后，actual GET_VIEW初次没有rebuildPreview：当前课程原有established=false，通用initial-course分支在Rebuild projection前提前返回；RBL-03空壳显示enabled Use。这一问题在此前isolated fixture的established=true状态中未暴露。只修view branch，让existing Rebuild进入相同projection，**不将课程标记为established，不改trusted state**。新增true/false established回归验证Partial/provisional/canAdopt:false及课程标记不变。没有重跑Provider。

最终CI中旧视觉并发测试依赖2ms/30ms timer重叠出现一次renderPeak=1；定点56tests通过后将该测试改为按实际fixture Source数释放的显式render/call barrier，移除实时时间猜测。仅测试同步方式改变，未调整production concurrency/timeout/resource数字。

真实Preview修复后的最终gate、最后CI、定点出站结果见本节收口补记与现有E2P。正式证据 `artifacts/v0.3.0/task-b-024/`；private snapshot、raw stream、19附件、历史workflow/cache均保留，不出站。Task A physical batching仍未完成；按Preview STOP优先返回Product Review，未启动Task A/classification/Discovery/Fetch/parse/Vision/C、新workflow、cold-start、Use/Keep、commit/push/tag/release。

### 24.4 最终收口

最终完整CI644tests PASS（2contracts/622extension/20backend），包含修复后的zero-model view regression与deterministic render/call barrier测试。最终QA reload刷新1个NTU tab，16表/staging hash全一致、provider0；actual RBL-03具有rebuildPreview、partial:true、provisional:true、crossSourceOrganizationIncomplete:true、canAdopt:false，只有Keep控件、没有Use；未点击Keep。旧UI projection的failedSourceCount20是18个native parse Partial +2个Task A unresolved的union，不能当作20个Task A失败；semanticCoverage独立保持107/109。B unresolvedItems0表示返回并checkpoint的item数为0，不代表logical input已resolved；nativeledger的160explicitUnresolved是完整输入口径，formal REPORT独立记录。完整private archive仍保留1条58084reasoning/100286output。

Task A batching保持pending，未继续实现或新测试。47文件正式manifest定点出站，最终hash/conflict结果以现有E2P为准；不出站private内容或Product authority文件。Preview是合法降级停止点，v0.3真实验收不是PASS，等待Product Review。

## P2E-025｜Gate A Engineering Closure（2026-10-06）

按最新 READY Inbox 执行 Gate A，开始 HEAD `26426a3793250aea351c443e3327ccdb1b95b697`、dirty148 entries；只 inbound 同步 Inbox。普通 contract、continuation、checkpoint、storage、normal initial B 入口和 CI 问题在同一 Gate 内连续修复，没有按 bug 轮次请求 Product 授权。没有重新 Product Planning，没有真实模型新调用、Task A / classification / Vision / C、full-course、cold-start、Use/Keep或 Git release 操作。

### Saved B：实际零成本复验

原完整输出100286chars、reasoning58084chars不改写。仅 top-level `syllab.ai/task-b/2` 转为 canonical `syllab.ai.task-b/2`，保留 `deterministic_compat_repair` 和前后 digest；所有非 schema 字段相同。Offline 和隔离 Chrome production engine gate 通过后，同一 actual workflow `wf_3ee80256bee2d6d2fb0e805c` 更新 private native checkpoint 与 staging，不访问 Provider port/credential。

完整 item、Evidence、dependency、candidate/disposition closure 重新验证后：56 candidates，5 verified final items、29 failed final items、2 canonical Assessment proposals；160 required refs =63 processed +97 explicit Unresolved，pending0。不能把56 raw items、provisional checks或所有Source出现在输入中当成 semantic completion。其他 shape、unsupported/undeclared dependency 和 resolved-disposition 错误保留 Partial，未做 Local semantic repair。

Actual RBL-03 Preview：Partial，verifiedItems5、unresolvedItems29、provisional=false、crossSourceOrganizationIncomplete=true、canAdopt=false；Use rebuilt course禁用，Keep未点击。Workflow保持 waiting/review、无lease、provider in-flight0。Sources117、attachments19、native units880、visual-gap units852、原A baseline、semanticCoverage、完整raw/reasoning、旧AiRuns、历史workflows、trusted/native Review/history数据hash守恒；只更新本workflow B ledger/staging及 workflow timestamp。Course刷新时间另行规范化比较，没有改变 established/revision。证据 `ACTUAL-B-REVALIDATION.json`、`PREVIEW-GATE.json`；真实原文与full snapshots留 `evidence/private/v030-gate-a-025/`。

### Task A batching / generalized closure

新增 central schema registry 与 native physical-work ledger。逻辑单位保持 Source，物理请求装多个 Source，实测完整逻辑序列化字节均衡 packing；无标题/assessment关键词分类或Local semantic grouping。新 workflow持久化 `logical_physical_v1`；历史identity保持，成功结果不在Recovery重新付费。新路径绕开旧固定 native chunker与visual call预分组，可选max_tokens不发送，visual Source后处理并发与renderer保护解耦；没有新增4MiB/page、8MiB、192MiB或其他估计memory预算。

在 Gate 内修掉两处重要机制缺口：stateless分片必须持久化并传递通过同一schema/identity/Evidence validator的模型中间结果，单纯input-delivered不是semantic completeness；restart必须先恢复原物理请求，再重新packing，不能因bin改变重复付款。完整raw先保存，独立item后验证；未知/closed输出ID留诊断；half JSON不补写；pre-generation拒绝只机械分片；无进度或最小外部形态无法处理明确Unresolved。Paid-unverified停止新派发，不自动重试。

Classification、A native/visual、C复用该机制；B保留跨Source全局ledger。新 normal initial/rebuild B入口接schema2。隔离 normal Initial Scan入口回归发现成功Source列表原来只读Rebuild staging，导致Initial已有Evidence被过滤为空；已改为读取同workflow成功Source checkpoint并排除explicit Unresolved，完整Evidence进入B。Initial canonical替换有原子owner/session、revision0/unestablished、exact durable unreviewed AI baseline guards，拒绝 user/Edited/current state冲突；原provisional baseline保留，不修改Review authority。Classification ambiguity不继续A admission，缺失classification不本地猜role；C valid target保留，失败target有明确terminal错误，不能静默进入completed Review。

### 验证与边界

`BROWSER-BATCHING.json`：真实117Source parsed inventory在隔离Chrome native IDB，109eligible /8deferred；20 injected physical requests /2 Main waves，观测同时in-flight10；109独立logical checkpoints，重启additional dispatch0，Vision0，旧fixed chunker0，Source/native/locator输入守恒。两个原无成功A结果的Source使用显式synthetic fixtures，只用于机制验证，不冒充恢复真实语义结果。额外 normal Initial B入口使用synthetic grounded item：1 injected request、1 canonical、原baseline保留、established=false。均无Provider连接、实际QA profile新workflow或课程测试。

Deterministic regression覆盖109混合大小packing、single-Source Unicode oversized continuation、model中间state缺失、部分batch失败/独立sibling保留、ambiguous-paid admission、成功结果复用、post-dispatch storage fault与不同restart packing、length完整prefix/半item拒绝、unknown输出diagnostic、schema-only repair仍执行完整validator、initial trusted/user/session/baseline guards。Final full CI：662tests（2contracts /640extension /20backend），format/build/typecheck/lint/manifest/secret/docs/readme/QA separation均PASS。

当前 active-limit / A/B/C机制审计见 `ACTIVE-LIMIT-INVENTORY.json`。官方vision文档本轮HTTPS定点读取，核验inline48MiB、singleinline32MiB、600images、totalinline64MiB、8192/15图起4096px；外部request boundary只用于技术分片，不是课程总容量。旧token估计/384000字段保留compatibility/telemetry，new physical paths不据此admit/truncate或发送owned max_tokens。Processing waves与10–25范围来自Product，非自行新增容量cap。No Arbitrary Limits长期规则已在现有 `docs/project-governance.md`，未创建临时规则入口。

剩余风险留Gate B验证：真实Provider吞吐/latency、real waves、模型分片context和semantic recall、实际inline/context/length边界、native ledger/raw写放大与browser quota压力。Storage/最小capability/unsupported semantic错误已有明确错误或Partial，不冒充Complete；不得用本轮injected PASS判定real-course验收。已保存B仍97Unresolved，当前课程不允许采用。Gate A完成后统一Product Review；Gate B需新的Product Gate授权，当前未启动。

Clean isolation额外回归：新clean workflow若没有本workflow新classification checkpoint，旧workflow的Deferred结果不能决定当前eligibility；19附件全部明确Unresolved、additional native dispatch0，历史classification/Source记录不删除。这是失败路径保护，不是新增Source过滤或缩小coverage。

Gate A final closure：HEAD不变，dirty153 entries；35-file正式manifest定点Local→Drive hash相等、conflict0、未同步manifest文件0。Final reload守恒16表/staging、content-script bridge可用、1个NTU tab已刷新、provider0。首次browser automation等待全页面load超时，但NTU已经完成导航；改为核验DOM/content-script与原before/after snapshot，没有更改Syllab timeout、重复workflow或再次reload。证据 `FINAL-RELOAD-GATE.json`。

最后的logical/physical边界复查补回归：单Source或visual physical response仍可能带sourceId，但其outer envelope不能被Source understanding当作Task A语义结果。读取端排除`invocationRole:physical`，只取独立logical checkpoint或兼容legacy Source结果；新增native-store regression。Exact本地cache复用明确`consumesApi:false`，Recovery统计不把复用当新增Provider消费。

最新662-test bundle再次reload后，首次即时bridge检查发生document_idle接收端尚未就绪；随后同一已刷新的NTU tab在DOM complete时响应GET_COURSE_CONTEXT。使用LAST-BEFORE-RELOAD原snapshot完成16表/staging守恒检查，没有重复reload、workflow或Provider调用。最终FINAL-RELOAD-GATE已替换为该最新bundle证据。


## P2E-027｜Gate B Real E2E 与 Peak / Off-peak accounting

### 执行身份、边界与真实工程发现

P2E-v0.3.0-2026-10-06-027 / READY；HEAD `26426a3793250aea351c443e3327ccdb1b95b697`，main，开始时 dirty 153 entries（含 untracked）。只定点同步 Product Inbox 一文件；没有重做 Product Planning。B1 `wf_26455133f0631385cbf5b56c` 是新的 semantic-clean Rebuild；B2 `wf_ebdef177ba1a33bbc520b577` 是 MA6083 首次 Initial Scan，开始前 workflow/AI/Source/courseState 均 0。B2 只读选择机械确认 66 Sources / 4 类型，不故意挑极简课程；其他课程没有启动。

真实发现并修复：

1. explicit clean Rebuild 曾复用 parked Review workflow；现在仅 explicit clean bypass waitingSameKind，仍拒绝 active/leased 工作；旧 Review byte-exact 保留。
2. QA 单个 currentStream 丢失并发 archive；每 stream 独立 reasoning/output buffer、metadata、usage 与 archive，不删先前 reasoning。shipping disabled stub 保持 inert。
3. Blackboard discovery port 丢弃 Failed/Partial status，导致 B1 在新 Discovery 返回 0 时使用历史 117 inventory。现传回 status/pages/issues，非 Complete 明确阻止 downstream，不 fallback 旧数据。B2 同样首次 Discovery Failed（API_REQUEST_FAILED），guard 在 0 AI/0 Source mutation 时停止；唯一零付费同 workflow retry 后 Complete 66/45 pages/issues0。最初 API 错误的完整 HTTP 证据未捕获，不能猜测根因。
4. Initial 的部分 A failure 创建空 staging coverage，成功 A 又仅更新 Rebuild coverage；因此首次 B2 B 忽略已成功 55 Sources，EvidenceRegistry=0。现在 Initial 按成功 logical checkpoint 构造完整 B input/evidence，Initial/Rebuild 都记录成功 coverage。实际 private snapshot 隔离 Chrome probe：55 Sources /151 Evidence /79 registry refs，1 injected B request /1 verified canonical；A results 与旧 B ledger 一致，第二次 recovery 被拒绝。

不新增 capacity / timeout / memory / concurrency 数字。Discovery completeness 和一次授权 recovery guard 是明确状态/付费/覆盖保护，不 silently truncate、skip 或 fail。所有原 private raw、19附件 cache、历史 workflow 保留。没有 Use / Keep / Confirm / commit / push / tag / release。

### B1｜known large-course semantic-clean Rebuild

实际 wall-clock 633457ms（10m33.457s）；Fetch+本地 parse 68760ms，parse orchestration 42ms，Task A（含 classification/recovery）358763ms，Task B 205798ms。处理 117 Sources /19附件 /880 native units /852 visual-gap units；各附件 content hash/native text/locators 与历史 baseline 一致，但这仅证明实际处理集合守恒。随后 read-only fresh Discovery 得到 119 Sources /20附件 /99 native Sources /121 pages /issues0，新增 1 attachment +1 announcement；47 native records 仅 modifiedDate 字段不同。**本轮不能把 117 集合声称为 fresh Discovery 完整覆盖；新增附件的 units/gaps 未 fetch，不猜数量。** 重新 full-run 将涉及已付费语义失效风险，未启动第三 workflow。

Classification 24 logical /20 physical；21 verified、3 Unresolved；11 PROCESS/10 TEACHING_MATERIAL_DEFERRED。Task A eligible107，native104logical，103 verified/1 native Unresolved，加 classification3 为4 Unresolved。Native A30physical：Main2waves/20requests +failed-only Recovery1wave/10requests；real observed AI peak10。Vision0、consolidation0、paid-unverified0。未按少读正文/页数缩短速度；教学 deferral 仅按已授权 DA-005，不作为完整深读性能比较。

B normal1logical/1physical，required149 /EvidenceRegistry483 /processed93 /pending0 /explicitUnresolved56；5 verified final items、19 failed、canonical0。known response 中包括 unsupported field state/shape、未知 evidence/dependency 等；不以本地猜测将 AGREED/CONFLICTING 或缺字段变为 Product KNOWN。A provisional42 assessments/422 facts/64 requirements/483 Evidence/41 Review；normalized title duplicate groups5只为机械负担统计。RBL-03 Partial/provisional/cross-source incomplete/canAdopt=false，未采用。历史10表、旧 workflows、trusted/history不变。

Provider51physical：classification20 +native A30 +B1；median28500ms/P95 98161ms（51样本，含各阶段，不是只有 A）。Package wait157 observations，累计108228.3ms/max2028.9ms；这是各 work item 等待之和，不是 wall-clock idle。Parser worker operations38，recorded interval peak2；Vision/render0。Fetch admission 没有 timestamp，因此实际 Fetch peak=Unavailable；网络 backoff/精确 scheduler idle/raw browser cache reuse=Unavailable，不填0。完整数字见 B1-RUNTIME /SCHEDULER。

### B2｜new-course cold-start Initial Scan（首次 Review 冻结）

首次 Review wall691246ms，含约3m34s的零付费 Discovery repair pause；Fetch+parse31773ms，parse orchestration65ms，Task A314896ms，B125454ms。66 Sources（16 announcements/16附件/30pages/4assignments）；612 native units/378 visual gaps；fetch65 success/1 failed，parse52 complete/13 Partial/1 unsupported，失败明确保留。Classification28logical/20physical，25verified/3Unresolved：16 PROCESS/4DEFERRED/5UNCERTAIN。Native A58logical，55verified/3Unresolved；加classification3总6Unresolved。A30physical、Main2/Recovery1、real AI peak10，Vision/consolidation0。

首次 B 因上述 checkpoint input bug，normal1physical、Source refs0、EvidenceRegistry0、required24 /explicitUnresolved24 /pending0、canonical0。Native A provisional18assessments/160facts/151Evidence/15Review保留；不能把 B staging 的 evidence0当成课程没有 evidence。初次 Review frozen usage 不覆盖。已在隔离回归与完整 CI 后，仅为同 workflow 消费 Product 允许的一次 known-response normal B safe recovery；没有重跑55成功A或再做整课程 Discovery/Fetch。最终 recovery 与成本收口见后续小节和 final JSON。

### 定价与统计口径

2026-10-06 官方 snapshot：deepseek-flash，USD/1M；Peak hit0.006/miss0.30/output1.20；Off-peak hit0.003/miss0.15/output0.60。来源 https://api-docs.deepseek.com/quick_start/pricing/ ，snapshot verified timestamp 在 PRICING-SNAPSHOT。官方 Peak UTC 周一至五 01–04/06–10、中国法定假日除外；2026国庆10月1–7（https://big5.www.gov.cn/gate/big5/www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm），本轮请求均 Off-peak。每 invocation 独立 start/finish UTC+Singapore、model、band、hit/miss/output/reasoning、known-response identity 与成本；reasoning 是 output 的子集，不重复计费。estimated API cost 不是 invoice。

首次 frozen：B1 Peak0 /Off-peak51；hit4736/miss2258747/output484301/reasoning288693；USD0.629406858（classification0.0285768/A0.51503103/B0.085799028）。B2 首次 Peak0 /Off-peak51；hit11904/miss1248681/output343221/reasoning214929；USD0.393270462（classification0.027330240/A0.340004694/B0.025935528）。B2 recovery 另行冻结 final，保留首次摘要；combined 不替代分课程记录。

### 可比性与仍缺真实数据

v0.2 报告历史 post-correct lineage：119 Sources、A216 starts（含恢复 lineage）、consolidation41、B1base+2expansions；staging73assessments/879facts/521Evidence/72Review，另一 final Preview snapshot38assessments/14 normalized-title duplicate groups，二者不混算。v0.3 本轮真实A30physical /2Main+1Recovery /peak10，consolidation0。Source scope、deferral、旧恢复 lineage、B semantic result 都不同，不将调用数差异宣称为同等覆盖质量的性能 PASS；旧 median/P95/cost 无直接数据。

当前课程有真实新增 Source，且既有 course established=false；没有制造 unchanged Manual Check premise、强制建立 trusted 或触发新 paid Check。targeted Check/C/Review/Preview deterministic regression 由现有 CI 与 Gate A evidence提供，真实 unchanged Check NOT_RUN_NOT_UNCHANGED。真实 Activity reasoning/output 在同一监视器独立存在；B2 recovery 时 reasoning145686chars 与 output4121chars 同时可见，projection每channel851chars/1node，完整内容在 private archive，展示窗口不影响正式覆盖。Browser suspension 中断的真实重启恢复、完整 Fetch峰值/idle/backoff、冷课程人工语义质量与 provenance逐条人工判断仍未实测；不能把未观察当0或PASS。

Task A verified Source checkpoint 数量表示合同验证成功，不等于所有 native/visual-gap units 已完成内部语义覆盖。852 /378 gaps 的 native inventory 继续保留；Vision0不将 gaps 改写为 Complete，也不把它们解释为必须逐页 Vision。DA-005 teaching deferral 与 parser Partial/unsupported 分开记录。

### B2 授权 recovery 最终结果、provenance 修复与 Gate 判定

B2 原始 normal B 后，由于首个 Task B 输入使用错误的空 staging，曾只送出 24 个 refs；该普通 blocker 已在 Gate 内修复并通过完整 CI。保留 55 个已成功 A checkpoint 后，按 P2E-027 唯一授权对同一 workflow 执行一次 `normal-recovery` logical attempt：4 个 physical calls，其中 3 个 progress-driven continuation；没有重新跑 Discovery / Fetch / Task A，也没有重复已验证成功项。最终 B 处理 9 / 79 required refs，显式 Unresolved 70、pending 0，26 个失败条目（18 `B_DEPENDENCY_CYCLE`、6 `B_FIELD_SHAPE`、2 `B_DEPENDENCY_UNRESOLVED`），verified items 为 9 个 `unresolvedIssues`。Canonical Assessment proposals = 0，identity resolutions = 0，constraints / relationships = 0。模型没有产出可安全 canonicalize 的 Assessment 或 identity。workflow 留在合法 Initial Review，课程仍 `established=false` / revision 0。没有超过授权 recovery，也没有再调用模型。

Task A 的真实 batching 不是逐 Source 串行：B1 的 20 个 Main physical requests 覆盖 104 logical Sources（每 request 2–6）；B2 的 20 个 Main requests 覆盖 58 logical Sources（每 request 1–4）。两轮都从 runtime ledger 观测到 10 个同时 in-flight 模型请求；失败项各用一个 Recovery wave（B1 10 calls /17 failed scopes，B2 10 calls /12 failed scopes）。B1 51 次请求整体 latency median / P95 为 28.500 / 98.161 秒；B2 最终 55 次为 19.853 / 218.256 秒。该数值包含 classification、Task A 与 Task B，不能当作单一模型阶段或 wall-clock 的替代值。真实 Fetch admission timestamp 不存在，Fetch peak 仍为 `Unavailable`。

Gate B 的 provenance audit 还发现 provider request-local `evidenceId` 被旧实现直接用作全局 IndexedDB primary key，导致 B2 覆盖 MA6081 原状态中的 9 条 Evidence；16 个 B1 staged 与 6 个 B2 native evidence references 的 Source/locator 映射不正确。没有继续运行任何模型。先以 private `BEFORE.json` 和确定性 paid-response match 建立恢复计划：恢复原 9 条历史记录；对缺失记录仅从已付费响应按 course/source/locator/excerpt 的唯一 identity 重建；将 B1 / B2 evidence 使用 provenance-scoped durable IDs，并同步引用。isolated production helper regression 与 live native repair 后的只读核验均通过：MA6081 原有 123 条 Evidence 逐条 byte-equivalent，B1 549 个 staged refs、B2 163 个 native refs 的 source/locator mismatch 均为 0；所有 6 条 repair 前历史 workflows 完整一致，两个目标课程仍未 trusted，provider in-flight 0。没有改变已验证事实值或语义结果。

应用事务后第一版 proof driver 在 browser page scope 内误引用 Node helper，因而在提交后置校验阶段抛错；该次没有触发第二次写入。随后独立只读核验确认修复 marker 为 `COMMITTED`，逐条检查 Evidence、staging、native facts/review items、历史 workflow 和 course trust，生成 `PROVENANCE-RESTORE-RESULT.json`。此操作脚本错误及恢复结果已如实留档，不能把首次异常当作未发生。

### Gate B 冻结 usage 与最终结论

| Workflow | DeepSeek peak calls | off-peak calls | cache-hit / cache-miss input | provider output / reasoning | 估算 API 成本 |
| --- | ---: | ---: | ---: | ---: | ---: |
| B1 MA6081 clean Rebuild | 0 | 51 | 4,736 / 2,258,747 | 484,301 / 288,693 | USD 0.629406858 |
| B2 MA6083 final cold-start | 0 | 55 | 176,128 / 1,564,759 | 601,539 / 384,295 | USD 0.596165634 |
| Combined | 0 | 106 | 180,864 / 3,823,506 | 1,085,840 / 672,988 | USD 1.225572492 |

三个 workflow / cost artifacts 保留独立分类、A、B 阶段与逐 physical request band/timestamp；B2 首次 Review 的 51-call / USD 0.393270462 冻结文件仍保留，final 55-call 汇总另计其唯一 4-call recovery，不能用 final 覆盖第一次快照。官方 DeepSeek pricing snapshot 于 workflow 前记录在 `PRICING-SNAPSHOT.json`，当前官方费率页：[DeepSeek API pricing](https://api-docs.deepseek.com/quick_start/pricing/)。所有 invocation 均为 Off-peak；reasoning 是 output 的子集，不重复计价。金额是估算 API cost，不是 invoice。

Gate B **FAIL，STOP at Product Review**。B1虽到达 Partial Rebuilt Preview，但 clean Discovery 实际处理 117 Sources，而 fresh read-only Discovery 为 119 Sources / 20 attachments；不能声称覆盖完成。B1曾因 Discovery status 丢失而回退旧 117 inventory，这是真实 scope omission；status propagation/guard 已修复，但不能追溯性地让本次 run 变成完整 Discovery PASS。B2 cold-start 已到达 Initial Review，但 recovery 后仍为 0 canonical proposals / 0 identity resolutions，且 70 /79 refs 显式 Unresolved；P2E-027 明确规定重复 canonical=0 应判 Gate B FAIL。真实 Task A Main batching 与 peak concurrency 有 runtime evidence。没有 trusted state mutation 或 false Complete；B2 首次 Task B 忽略已成功 A checkpoint 及其 Evidence、以及跨课程 Evidence 主键覆盖均已定位并修复，历史证据逐条恢复验证。Unchanged Manual Check 因课程状态不满足 unchanged premise，结论为 `NOT_RUN_NOT_UNCHANGED`；Browser suspension recovery 与 Fetch peak 仍未实测。最终完整 `npm run ci`：666 tests 通过（contracts 2、extension 644、backend 20），format/build/typecheck/lint/manifest/secret/docs/readme/QA separation 均通过；QA extension reload、1 个 NTU tab refresh、content-script bridge 与 provider 0 通过。没有启动第三次 full workflow、新课程、Vision、Task A/B/C、Confirm/Keep/Use 或发布操作。

## P2E-028｜Gate B-R Task B Semantic Reliability Remediation（进行中）

当前 HEAD `26426a3793250aea351c443e3327ccdb1b95b697`；进入 Gate 时 dirty entries 152，0 staged。仅 Product inbox 从 Drive 定点同步，hash一致、0 conflict。Gate B 原始失败记录、usage/private evidence保持不可变。本 Gate 已消费唯一 R1 attempt，结论 **FAIL / STOP Product Review**。

### Saved evidence 零模型 root-cause matrix

可重复生成入口：`scripts/v030-gate-br-replay.mjs`；正式结果 `artifacts/v0.3.0/gate-br-028/ROOT-CAUSE-MATRIX.json`。原始输入/输出和 item payload留在 private evidence；正式矩阵保存哈希、item identity、错误类别与受影响 ref hash，不上传课程原文。

- B1：19 failed items = 9 field shape、9 dependency、1 unknown Evidence ref。raw有16 identity、7 canonical候选；原closure只保留4 identity/0 canonical，149 required=93 processed+56 Unresolved。不是所有模型语义都缺失。
- B2：26 failed items = 18 dependency cycle、2 dependency unresolved、6 field shape。raw有9 identity、5 canonical候选；4-call recovery原closure保留0 identity/0 canonical，79 required=9 processed+70 Unresolved。
- B1 fields缺state/competingValues，属于prompt精度与field shape问题，Local不能猜state。B2的7个field条目使用Task C的CONFLICT作为Task B field state，现有合同只接受KNOWN/EXPLICITLY_UNKNOWN/UNCERTAIN；保持拒绝，修正未来prompt。
- dependency模型把canonical与描述非关键不确定性的issue互设依赖，构成cycle。未删除或猜测真实dependency；prompt明确 prerequisite方向、proposalId与itemId域。
- **VALIDATOR_FALSE_REJECTION / closure级联**：同一ref的model-selected itemIds同时包含合法identity及非法canonical/issue时，原validator拒绝整行，合法独立sibling被拖死。修改为逐item隔离，有独立合法support才resolve ref，失败仍记`B_DISPOSITION_PARTIAL_ITEM_SUPPORT`与原item错误，不推断未选item，不将provisional当canonical。
- 未证明存在logical continuation数据丢失：完整B2 recovery 4个physical响应均replay；length prefix继续保留完整JSON item，raw不补括号、不补语义。real Uncertain与unsupported judgments继续保持明确，不由Local解释课程语义。

同样raw replay：B1 identity 4→16、processed 93→113、Unresolved 56→36；B2 identity 0→9、processed 9→40、Unresolved 70→39。canonical仍为0，原非法shape/cycle/Evidence仍拒绝。这只证明工程修复覆盖观察到的级联拒绝，**不是real semantic quality PASS**。

### Generalized remediation / zero-model boundary

- Task B prompt补全枚举、必需arrays、uncertain/missing optional字段结构、dependency方向和独立identity closure；不改锁定Product baseline，不加capacity/time/token/continuation限制。
- cycle failure传播覆盖所有dependent，与响应顺序无关；独立sibling不受影响。
- Product授权targeted validation作为独立logical identity，先归档完整旧ledger/staging/workflow；重复授权拒绝，ambiguous/active paid状态拒绝，Task A不重派。
- isolated real-snapshot browser probe：55 verified A Sources、155 repaired durable Evidence representations（151原语义Evidence，provenance修复增加4个精确representation）、79 required refs；1 injected request→1 canonical；第二次授权拒绝；旧ledger、A runs、其他workflow、courses/sources/history守恒。无真实模型调用。
- R1前全套zero-model gates与CI通过（669 tests）。R1执行后触发mandatory FAIL；R2未授权进入、未运行。


### R1 B2真实结果｜Gate B-R FAIL

- 复用既有55 verified Task A，3 Task A Unresolved及3 classification Unresolved（6个Source refs初始显式Unresolved），没有Discovery/Fetch/parse/classification/Task A新增调用。
- `P2E-028`独立logical validation attempt **1**，physical requests **2**（1 continuation）；两次finish_reason都是`length`。Wall **489724 ms（8分09.724秒）**；Provider latency **231411 / 257846 ms**。请求并发1是Task B同一logical session的progress-driven continuation，不能冒充Task A并发。
- 最终required **79 = processed 0 + pending 0 + explicit Unresolved 79**，canonical **0**、identity **0**，`B_CONTINUATION_NO_PROGRESS`。不将Unresolved算成功，不伪装Complete。
- **立即Gate B-R FAIL**：未执行B1 fresh Discovery、delta processing或paid Task B；未第三门课程/full-course rerun；不再消费额外fresh attempt。
- 新观察：首个length响应使用已登记schema alias `syllab.ai/task-b/2`，prefix parser此前仅识别标准schema，因而8个完整identity items未进入provisional candidate账本。修复prefix header按central registry执行已有唯一alias归一；仅完整JSON items通过，半个item/未知schema仍拒绝。raw Prefix保留、semantic payload不变、回归恢复8 provisional items。**没有把这些未获full-registry closure的候选改称final identity/canonical，没有在active R1中改写ledger或重载worker，没有因此再调用Provider。**
- 第二个length响应全65536 output tokens均为reasoning，visible JSON output=0；首个65535 output tokens中59233 reasoning、visible余量6302。合计reasoning **124769 / 131071 = 95.19%**。此次失败不是仅有cycle/field-shape拒绝：Provider per-request output boundary、reasoning占用及prefix alias不一致组合，使logical attempt无可验证global closure，no-progress guard停止。官方页面max output与provider-default实际65536边界区分记录；本Gate不改数字、不新增output/token/runtime cap。

### R1 usage与状态

官方pricing在R1前新HTTPS核验，保留page SHA256、UTC/Singapore、每physical invocation时段和usage（`R1-PRICING-SNAPSHOT.json` / `R1-DEEPSEEK-USAGE.json`）；2 calls均Off-peak，Peak 0。cache-hit **8704**，cache-miss **325043**，provider output **131071**，reasoning **124769**（已包含output，不重复计费）。新增estimated cost **USD 0.127425162**；Gate B原费用 **USD 1.225572492**不变，累计 **USD 1.352997654**。没有B1 remediation费用，不填一份虚构B1结果。

`R1-RESULT.json`逐表证明sources/sourceObservations/history/facts/evidence/assessments/constraints/reviewItems、所有旧非B aiRun、其他workflow保持；B2仍untrusted/revision0，provider in-flight0。QA reload触发5门课程enrollment refresh，只更新`updatedAt`，其余course字段逐字段保持；明确区分timestamp delta与trusted state变更。旧B2 ledger/staging/workflow已另存one-use archive；原Gate B快照未覆盖。

最终仍停在 **Product Review / Gate B-R FAIL**。generalized sibling隔离与prompt合同已经实现；prefix alias缺陷已零模型修复，但未获新的real验证，本Gate不再尝试付费证明。剩余风险是长reasoning占用provider输出边界，以及受真实输入影响的canonical/closure稳定性；后续方向由Product Review决定。

本轮最终CI发现private reasoning中的普通Task-词尾被credential regex误报；secret scanner按token边界识别sk-prefix，合成credential仍被实际CLI拒绝。原private snapshot不删不改、不上传；不是豁免credential或放宽Evidence校验。

最终工程检查：full `npm run ci` **669 tests / 0 failures**；final QA build reload并刷新1个NTU Learn tab，content-script bridge PASS、provider in-flight0。Saved replay与isolated授权/state回归最终代码下PASS。正式outbound manifest为30个文件，逐文件hash/conflict保护，Private数据与Product文件不在outbound scope；实际同步结果见当前E2P-021。工程检查PASS不改变本Gate的real validation FAIL。

## P2E-054｜Final Acceptance 连续实施阶段记录（后续状态见最新正式交付）

从 P2E-053 保存的 117 Sources / 978 native units 继续；未重新扫描正式课程、未打开原正式 profile、未采纳到原可信状态。已完成计划的 24 个深读来源 / 160 units（其中 150 个 PDF page locators），保留 592 个不可变 Reader Clauses；其余 101 Sources / 818 units 的完整 native text 经过真实模型信号检查。检查不能证明 unread visual regions 已理解，读取范围与缺口仍可见。

先前经过定点核读的 Initial 候选具有 243 个投影事实 / 10 张 Review 卡；它不是新的人工金标。25 个预先冻结 Source-first 判据的原文 → Reader → assertion → Fact 映射已保存于私有证据，可共享摘要为 `artifacts/v0.3.0/goal-driven-054/GOLD_COVERAGE_PROVISIONAL.json`。原 43 / 11 disputed 不重标，未给模型 Prompt 注入金标，不计算伪造的全课语义 recall。

真实增量是明确标注的 controlled single-source update，不宣称 NTU 线上已变化。该阶段隔离 native 回放通过 12 张 Review / 16 个变化、全部 NEW Facts 显示及确认后保存、41% 用户值保护、Rebuild 保留/采用、13 durable tables 备份恢复、22 native stores 守恒和 UNKNOWN 重启防重派；该回放 provider dispatch 为零。发现并修复了已有 Assessment NEW 只取旧 Fact、Important Rule Confirm 漏存独立 Fact、Rebuild 仅 upsert 而留下旧当前对象、以及后续合同修复缺乏源内 resolution 支持等系统路径问题。

正在验证当前实现重新自动生成 Initial 投影后的语义质量；Reader/Source/Link 成功响应复用，模型付费仅用于尚需验证的投影与定点核读。全局 assertion/context 重复 accounting 和完整 JSON 的遗漏仍按失败处理，已付费响应与历史 UNKNOWN 保留，不把缓存恢复当作新模型成功。所有调试费用与成品一次课程使用成本将分开报告。Gate 1–4 尚未整体收口，Human Gate 5 未开始；最终状态以后续正式 E2P、构建和证据为准。

## Final Acceptance P2E-054｜最终稳定化与泛化检查

状态：**Gate 1–4 自动工程验收完成，附明确证明限制；Human Gate 5 待验收**。只有一个最终本地生产构建，不发布、不 commit / push / merge / tag，不迁移原正式 trusted。当前真实模型证据来自同一门既有课程快照；当前工程结果不是跨课程或整课语义 Human PASS。

## 实际闭环

117 Sources / 978 Units 全部有发现与初查；AI 选择 24 Sources / 160 整单位深读，其中 150 个 PDF 页定位。其余 101 Sources / 818 Units 的完整 native text 经过任务/规则信号检查，非关键词过滤；初查或信号检查不等于详细理解。114 Sources / 948 Units 仍带保存的 partial/visual 缺口，Review 采纳前和 Course source 都显示范围。未新扫 NTU，未对全部课件无差别深读。

592 条 Reader Clause 不可变；真实跨来源 Link、局部合同闭合、原文语义核读与 context/SUPPORT 证明生成 227 Facts、8 个 Assessment/Component、2 个 Important Rule。203 KNOWN / 22 UNCERTAIN / 2 EXPLICITLY_UNKNOWN。单条 scalar 的字段含义也必须核读：正确值放在错误字段仍拒绝；实际总组数失真由模型纠正为来源支持字段，Reader/value/Evidence 保留。本地不猜课程答案。

最终 native Initial Engine → IDB/staging → Review：10 卡，85 条具体 Requirement 正文、11 个限定条件逐项 DOM 核对；Important Rule 全正文可见；初始 trusted 0。两个完整 unchanged Check 均 0 模型请求。QA 自动 Confirm 仅在可丢弃隔离 profile，另保留未确认 Human 入口。

受控一个 Source 内容变化，真实模型输出由实际 native Engine/IDB/UI 验证：10 个 Review、16 个 Change；New/Changed/Conflict/Possibly Removed 与不确定状态/可选条件/例外保留。Current 41% 用户编辑值不回显成来源 40%；新增条款追加而不覆盖其他待审核变化。Rebuild Keep/Use、13-table 备份/恢复、22 native stores、损坏 digest 拒绝、已 dispatch UNKNOWN 在新 Session retry 后 0 provider 请求通过。变化是 controlled，不能说 NTU 线上刚发生了这些变化；未做新的付费浏览器 SSE 断流或真实进程挂起实验。

## 系统性修复和通用性

通用架构缺陷：重复摘要/重写丢失独立语义；context/retired 支持未参与内容依赖；Review 采纳和 Rebuild upsert 留下覆盖或残留。实现不可变 Reader、显式 assertion/context/SUPPORT、版本化原文核读证明和依赖增量更新；既有 Human reducers/atomic replacement 维护 trusted。

语义任务缺陷：主题相同被误当等价，标量 scope/key 错配，条件/例外/力度和部分替代指令失真。通用 Source-native 核读覆盖单成员 scalar、多成员和全部 owned context；AI 有证据的定点 patch，Local 只校验/编译。单次响应误判：重复 ID、非法 role/parent、幽灵 Compare 引用。精确失败目标的有界模型修复保持其他对象/用户值不可变，失败数/新依赖范围必须进展；无进展停止，raw/费用均保存。

已检查生产语义策略无当前课程代码、日期、组数、条款 ID 或答案硬编码。既有 MA 代码命中仅在测试/UI fixture 和 enrollment 格式注释，不决定语义。五种标量表达及层级正反例验证 Source 送达、正确映射不改、原文/成员不丢、缓存失效、越界和无进展拒绝；64 个定点机制测试、59 个渲染测试通过。这些模拟 port 回归不证明模型跨课程理解。**独立课程真实模型证据为 0；跨课程泛化 NOT VERIFIED**。详见 GENERALIZATION.json。

## 费用与运行表现

最终正常 cold 路径的已保存 token 重建：40 物理调用，谷时 **¥4.4963** / 峰时 **¥8.9926**；受控单来源更新 9 调用，谷时 **¥1.0068** / 峰时 **¥2.0135**。unchanged Check 和 unchanged cached Rebuild 0 模型费用。峰时是同 token 价格推算，不是新峰时实测；provider prefix cache 非保证。没有同语义质量已验收的旧版成本基线，不报节省比例。

此项不是新的付费浏览器 cold E2E。Reader 和受控 parent 修复的部分历史测量显式使用 32768 输出上限；生产默认 384000，未缓存运行的 reasoning/output/延迟可能不同。正常 cold 的串行 provider 时间相加约 **39.5 分钟**，不含发现、解析、Human Review；不是完整墙钟实测，也不是快速缓存回放时间。长等待仍是产品风险，不承诺快完成。384000 最大输出单请求本身可达谷时 ¥1.536 / 峰时 ¥3.072，加 input；多次修复/复杂变更可以超过样本。无缓存或多源 Rebuild 无已验证固定最坏价。

开发/验收与正常使用分开：P054 97 个已知 usage 调用，客户端估算 ¥16.71121776；连同 052/053 已知累计 ¥34.55864344。两笔历史 UNKNOWN 原样保留；无新增 UNKNOWN，无在途。最新合法钱包读数另存 ledger；余额变化、客户端估算和 provider 实扣不同，用户已提供七天官方汇总账单：¥79.97404878 / 691 次；逐价格桶金额精确核对，10 月 11 日截至导出时的 65 次请求、全部 token 与 ¥12.08078928 和本地日汇总一致；导出无逐请求 ID，历史差额与两笔 UNKNOWN 仍不能逐笔归属（见 OFFICIAL_BILL_RECONCILIATION.json）。没有充值或换账号/模型。

## 证明边界与人工检查

25 个冻结 source-first provisional 样本：8 个正例的目标 Clause 已映射；17 个负例单位无当前 owned Fact。不是已评分的 recall。原 43 provisional / 11 disputed 的 expected/status/原文未改；54 个 native anchors 都保留，worksheet 是单位/Evidence 映射，不能冒充逐判据 Human PASS。模型 Prompt 未注入 gold。未读图表、跨课程、真实线上 changed-source、完整付费 native SSE/process suspension 与逐请求官方扣费归属仍未验证。

请按 HUMAN_ACCEPTANCE_GUIDE.md 核对唯一 RC 和真实未确认 Review。私有原文、Prompt/request/response/reasoning/截图/profile 留 canonical ignored evidence，不上传 Drive。共享交付仅代码、脱敏计数/哈希、报告与纯生产 ZIP。Drive receipt 是 Desktop 同步目录的文件回读，非服务器 SHA 证明。

官方小时账单补充：按 UTC+8 的本地完成时间分桶，19 个计费小时中 15 个请求数/token/金额完全匹配，含今天全部 7 个小时；单价为缓存命中0.02/未命中1/输出4元每百万 token。昨天较早24次不在052–054账本范围；05/09时段残差合计1.36973004元与历史UNKNOWN时间窗口相容，但不构成逐笔归属。见 OFFICIAL_HOURLY_BILL_RECONCILIATION.md。

## Gate 5 后续产品研究补充（2026-10-11；分析/规划，未实施）

按 Human 最新指令，将两项后续研究纳入最终 [Gate 5 报告](../../../artifacts/v0.3.0/goal-driven-054/RESULT.md)：完整冷启动谷时小于¥2的成本分解/非保证情景，与基于真实Course Brief及界面检查的信息价值、根因、分层组织、风险和验收指标。结构化依据见同目录 POST_ACCEPTANCE_RESEARCH_EVIDENCE.json；原文/截图仅本地private。

结论：约¥4.50成功路径需要至少55.5%下降；reasoning归零仍约¥2.62，无损输入和输出重用必须一起优化。实际Brief主文47,111字符，展示153个Assessment事实与74个Rule事实，混合教学指导/平台配置/模型context并重复疑问，缺少独立阅读投影；不是仅去重或CSS问题。另发现模式字段显示评分比例、原Clause含闭卷含义未进入该值的具体语义展示疑点，作为Human Gate5核实事项保留，不修改RC或擅自宣称语义正确。

后续优先P0 Brief内容价值及关键字段语义检查，P1无损消息/结构消耗，P2逐任务thinking。只有分析文档与脱敏研究依据变更；0付费、0生产代码/Schema/Prompt/UI变更、0新Gate、0新Confirm。正式trusted、现有未确认Gate5入口与唯一RC1字节保持不变。

## P2E-055｜RC1 Human Gate5 拒绝后的整改审计（2026-10-11）

Product 状态已变为 `HUMAN_GATE5_RC1_FAIL / NO_RELEASE`；人工结论权威在 `FINAL_ACCEPTANCE_v0.3.0.md`。旧 E2P-044 /937 checks 不覆盖本次产品失败。十次 Confirm 是受阻翻页，不作语义验收或 gold。

按 Changed Files 仅同步 Inbox + 两个受限 PDF，SHA 回读一致，当前 HEAD 与 prior dirty 保留。私有 `gate5-remediation-055/intake/` 保存入站旧字节、文本/渲染、Clause→Link→Projection→Fact trace 和生产 RC1 克隆点击证据。没有模型派发或原正式 profile 操作。

真实隔离点击中 Edit/More/Split/Exclude 响应，Exclude 刷新持久；Review later 不换卡，首卡 Edit 仅父对象五个输入。Human 的原会话按钮失效尚未统一复现，不宣称修完；显示/编辑/采纳范围不一致已确认。Scalar 原权重值被 projection 改挂 mode 后编译产生 Mode=25%，是合同/值语义缺陷。

新 `scripts/v030-final-055-open-review.mjs` 每次从保留的未确认种子生成唯一 clone，生产 RC1 文件 SHA 检查、十张待审检查、全 HTTPS 拦截；原受阻 profile/RC/正式数据不覆盖。不依赖独占原 Human profile、不杀已有 Chrome。验证结果见本轮共享工程证据；仅修复入口隔离，不是 RC2，不改核心产品模型。

产品整改统一见 `RC1_GATE5_PRODUCT_REMEDIATION_PROPOSAL_v0.3.0.md`，独立研究见 `OUTLINE_SOURCE_PRIORITY_FEASIBILITY_v0.3.0.md`。本轮不改 PRD/IA 的锁定正文；集中批准后再落权威规格与实施，不将 draft 当成已批准或已实现。

## P2E-056 阶段 B 实施检查点（非最终交付）

已定点同步长期 Inbox 并保护 P055；正式 PRD、独立 IA、Decision Log 已按批准记录局部修订。生产新工作流采用 selective-draft/3：复用选择性 Reader/Link，新增 source-preserving CourseProduct typed propositions、晋升状态和义务结构；旧 workflow 沿原版本恢复。原文可支持多个字段，Mode/百分比错配、引用/层级/历史来源校验加入。结构化 Brief、业务范围 Review、目录/前后无决策导航、Defer 顺序与 scoped ID/version 记录已首轮接入。新候选尚需实际语义与浏览器验证；没有宣称 RC2 完成。

首次真实整理已捕获并完整计费 ¥0.584517，原响应未通过合同；失败、响应与后续修复账本保留私有。未扫描正式 NTU、未打开正式 profile、未改变 RC1。完整扩展回归首轮 921 tests PASS，非语义验收、非最终 CI。恢复点 evidence/private/gate5-remediation-056/RESUME.json。

## 2026-10-12：P2E-056 单次 384k reasoning 风险整改 checkpoint

状态：**RC2 仍开发中 / Human Gate 5 未交付 / 未发布**。此节更新此前关于 active capture、旧费用与“整课两次修复”恢复指示；不能沿用旧指示派发整课请求。

用户要求暂停同类型整课付费审计后，确认无仍运行的 paid adapter，设置持久暂停标记，并在 adapter 禁止旧整课 audit/repair/contract-repair 阶段。当前工作零新增付费调用。原第 15 次不是 UNKNOWN：usage 完整，费用 ¥1.73089956、正文空、length，必须记作已付费失败。P2E-056 保存的 19 次完整 usage 合计 **¥6.71430012**（以 metrics 逐项求和纠正旧 checkpoint 数值）；新 UNKNOWN 为 0，历史 2 UNKNOWN 不改。起始已观测钱包 ¥9.23 减上述已知费用为 ¥2.51569988，这是账本算术余量，**不是已刷新实际可用余额**。后续任何派发仍须实时钱包与保守最坏费用守卫，不新增费用授权。

根因证据、任务预算、完整覆盖与局部恢复设计已同步 Technical Design 的“384k reasoning 失败”节。17 任务回放没有调模型；合同有效不等于语义有效，真实第 16 次的 9 个缺陷仍需解决。新预算也不能凭离线断言足够或声称成本目标达成。`RISK_REPLAY.json` 保留各保存响应的最新 validator 结果；第 18/19 次仍 VALUE_SUPPORT 失败，旧失败不会因 enum 修复被自动洗成 PASS。

代码接入：bounded Source/Owner/Bridge 审计，局部语义 patch、完整候选保存、未完成/越界/无进展明确停止；删掉自动全产品重写式合同修复。新增 task reasoning 控制真实传递与哈希区别；语义仍用 high。零付费测试及最终完整 CI 记录见私有 `ci-risk-controls-final.log`（仅其最终退出码才证明本次 CI 完成）。RC2 后续仍需局部真实语义恢复、完整数据/Evidence 备份保护、实际 Split/Same/Different/Uncertain 与增量/Rebuild 回归，以及独立 RC2 产物和 Human 入口；没有以风险控制测试冒充这些验收。

## 2026-10-12：P2E-056 原文备份与结构/重建操作 checkpoint

本轮继续零新增付费，无课程重新扫描、无原 profile 修改、无发布。完整 CourseDraft 原文解释进入现有 durable courseStates 的未认可档案；证书不进入可恢复档案。测试覆盖原文/OR/条件保全、Review 决策后档案保留及备份恢复拒绝伪认证。整个 archived draft 与原 Evidence 保留，不因主视图降噪删掉背景原文。

实际生产 UI（独立诊断 profile）在 380/1280 两种视口完成：Split、Same assessment as，全部旧 Fact ID 保留、pending scopes 更新至正确 owner、零隐式认可；Use rebuilt course 保留 scoped Review，旧 user-edited 值未被替换，机器替代提议成为独立 Conflict；Keep current、Uncertain 与 competing values 均刷新恢复；Conflict ↔ Initial 目录切换显示对应操作。证据：private `structural-interactions.json`、`rebuild-interactions.json` 与截图。旧首轮 selector 错误日志保留；成功来自修正后的最终脚本，不抹去失败。

上述用的是未认证真实候选加控制场景，不是完整 production engine/model Rebuild PASS。Same/Different 身份选择的真实操作、完整 Changed Source/unchanged Check、备份浏览器实际恢复、新模型完整语义修复、更多用户编辑 facet 与决策证据绑定仍须继续完成。最终完整 CI 见 private `ci-archive-rebuild.log` 和 `ci-archive-rebuild-exit.json`；只在实际 exitCode=0 后记录本轮 PASS。RC2 仍 NOT_ACCEPTANCE_READY。

## 2026-10-12：实际备份恢复与防止恢复整课再生成

独立诊断 profile 的 Settings 文件选择 → Summary → Replace everything → 刷新通过：592 条 Clause / 123 行 Evidence / 26 个 pending Review，完整档案和 durable digest 前后相同，可信 Fact 仍 0。清理的仅运行解释 checkpoint；首轮诊断脚本误清 appMetadata 导致隔离 profile 的 generation 指针丢失，失败日志/该克隆保留，修正为仅删指定解释缓存后重新验证通过。原正式/RC1 profile 未操作。

未认证候选的 Check 暴露“缺证书即整课 organize”恢复分支，零费用拦截请求配置为 98304/high。已改为复用合同有效保存候选、执行局部审计；不兼容候选保存 local diagnostics 后停止，不自动整课重做。新增回归覆盖无整课派发与无效候选停止。诊断 Check 只证明未认证种子不会成为已验证结果及失败后现有 Human 数据保留；真实已认证候选 unchanged Check / Changed Source 的生产验收仍待完成。

费用仍新增 0；19 次历史本轮已知 ¥6.71430012 不变。最新完整 CI 及恢复证据以 private checkpoint 实际退出记录为准，不将旧 CI 覆盖新代码。RC2 仍 NOT_ACCEPTANCE_READY，Human Gate 5 尚未交付。

## 2026-10-12：首个局部实测仍失败，进一步收窄 Source 交付范围

20th physical call 为受控单次局部 Source probe，实际 ¥0.133012，8192 全 reasoning、正文为空、length；失败已完整记录，0 新 UNKNOWN、无第二次派发。当前 P056 known 合计 ¥6.84731212。真实 trace 表明首个任务仍混合 40 native windows /204 clauses/65 claims，并转入跨来源身份反复裁决。改为 one-passage Source + 全 Owner/Bridge 语义职责；不增加输出，不省略核验，不将 failed 输出当结果。正式根因/职责/成本风险见 Technical Design 同节。新策略只有零付费覆盖和恢复验证，真实质量尚未证明。

## 2026-10-12：Change／Identity 范围持久、真实点击与请求预检

新 Change 创建时保存来源 machine 版本，决定保存完整原提议/Review 与课程、Fact、Source 依赖；原子 CAS 拒绝提议或来源途中变化且不留下决定/历史/队列删除。队列处理并入决定事务，不在提交后单独删除。新回归覆盖 Keep current / Different identity 的 stale source、提议并发替换与提交后删除函数失效；正常有效决定仍完整提交。旧没有创建时依赖的历史提议仍兼容，不追认旧证据完整性。

真实独立 clone 的 380/1280 Same/Different 四组点击 PASS；修正 Identity DTO 提前返回导致两侧显示同名的错误，两侧实际值和 Evidence 可核对；刷新保存判断/版本，原 pending base scopes 和 trusted=0 保留。Rebuild 两种视口再次回归通过。它们是控制场景的生产 UI / handler 证明，不是模型质量或 Human 验收。

一次新策略模型请求遭 HTTP400，无 usage；已知成本仍 ¥6.84731212，新增未结算 reserve ¥0.07524，不宣称 0 费用。旧 adapter 未保存错误正文，不能断言该 400 的准确原因。发现请求缺少官方 JSON-mode 指令，修正并加入 transport/adapter 预检及后续拒绝响应保存；旧未知操作不重派、不删除、不洗成成功。当前真实语义仍未修复到可验收，下一步优先零付费工作与独立未执行局部范围；完整 RC2 不宣称 ready。

### P056 Human 语义编辑闭环（2026-10-12，验证进行中）

发现并修复 Edit 只能改值/知识状态、画面仍附加旧条件与例外的问题。Fact.humanSemantics 独立保存用户力度/条件/例外，原产品命题、Clause、Evidence 不变；Brief/Review 使用人工解释，Rebuild 同值但不同力度/条件也提出独立冲突。Review 决定持久记录实际接受的 Fact 快照。明确 Accept 最新 proposedFact 会替换旧 Human facets；Keep Current 保留。历史 Fact/backup 无新增字段继续兼容。

新增 reducer/Rebuild 回归覆盖原文保留、空例外明确清除、空力度拒绝、同值条件变化触发冲突、Keep/Accept 的不同语义行为。独立真实模型候选仍未通过语义核验；本段不改变 RC2 NOT_ACCEPTANCE_READY 或 Human Gate5 状态。实际双视口点击和 Settings 恢复以私有记录为准，不能以工程单测代替。

### Typed Rule 的 trusted 投影泄漏修复（2026-10-12）

真实隔离 UI 截图显示，规则 Fact 全部独立待审时，原 Constraint 汇总正文仍被 Brief fallback 展示。根因为 trusted 只过滤 scope Fact，没有过滤无已认可命题的 typed Rule 容器；无剩余 Fact 时 UI 回退到原始整段 content。现在 typed Rule 必须有当前已认可 Fact 才进入 trusted；容器正文与 Evidence refs 仅从该已认可范围投影，旧无 Typed Proposition 的历史 Rule 保持兼容。原始 Constraint、Clause、Evidence 与全部候选保留在 readSnapshot/Review/backup。此投影也防止增量上下文将待审汇总误当 trusted。独立待审规则不因批准别的 Assessment 成为已认可正文。

独立审计恢复新增单任务入口：只接受当前完整计划中的 taskRef，沿用原 Prompt/派发指纹/cache；一项成功显式 courseComplete=false，完整审计仍要求全部计划，不绕过 UNKNOWN 或跳过 Source。零付费生成真实 109-task 计划；该恢复入口建立时固定请求预算的自适应替代尚未完成；后续解除及验证见下节。

**本段回归结论（2026-10-12）：** 最新 `ci-human-semantics-unknown-guard.log/exit` 为 exit 0：contracts 2 + extension 949 + backend 20，共 971 tests；format/build/typecheck/lint/manifest/secret/docs/readme/build-separation 全部通过。实际 shipped UI 在 380/1280 完成无决定浏览 26 项、Defer、Exclude/Undo、Review Edit、Brief 再 Edit、知识状态/力度/条件/例外刷新恢复、原 provenance 保留与 pending typed Rule 不泄漏；Settings Full Replace 保留 592 Clause、123 Evidence、25 pending Review 及人工编辑，恢复前后 durable digest 一致。截图检查主 Brief 不再通过原规则汇总泄漏待审正文。这些只验证工程交互/恢复，不是模型语义或 Human Gate5 PASS。

UNKNOWN 单任务防重派又覆盖 Prompt/JSON/Token 配置变化：除旧物理指纹外按未结算 audit taskRef 检查，实际零付费 preflight 拒绝旧 400 scope（`PAID_UNVERIFIED_SCOPE_NO_REDISPATCH`）。本次继续工作 0 新付费请求，known usage 成本 ¥6.84731212 与 UNKNOWN 保守预留 ¥0.07524 不变。原 candidate SHA 已回验未变，未开原正式 profile、未发布/commit/push、尚未最终 Drive 交付。恢复点为私有 `RECOVERY_HUMAN_SEMANTICS_2026-10-12.json` 与更新后的 RESUME。下一步仍是自适应风险控制、真实语义修正与完整增量验收；固定实验预算尚未被替代，RC2 仍 NOT_ACCEPTANCE_READY。

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


### 2026-10-13：官方账单核对消除资金 UNKNOWN 预留

通过用户已登录的 DeepSeek 官方用量页，导出 2026-10-12、2026-10-13 明细并在本地核对；不新增模型调用、不读取或展示 API Key 值。导出中的 masked key 与已配置测试 Key 匹配，账单小时窗口、模型、request_count 和全部 Token 类型逐项核对；私有记录仅保存去掉用户 ID / Key 字段的明细及原 ZIP SHA。

2026-10-13 00:00–01:00（GMT+8）官方仅 1 次请求，与唯一中止局部修复调用匹配：输入 2,726、输出 2,648 Token，实付 ¥0.013318，替换原 ¥2.081796 最坏费用预留。仍无可用模型结果，原 capture 不改，同一失败语义范围继续冻结。2026-10-12 三个账单小时窗口的 Token 与三个已知调用完全匹配；其中 13:00–14:00 原保守费用 ¥0.133012 应为实际谷时 ¥0.066506。14:00–15:00 的 billed request_count / 所有 Tokens 恰好由唯一已知调用解释，HTTP 400 未产生额外账单，因此其 ¥0.07524 预留按官方证据结清为 ¥0；失败调用仍不重派。

本阶段 24 条调用账本费用均已结清，合计 ¥7.01977508；这是费用核对，不是 24 个模型结果均有效。免费 balance API 实测可用 ¥2.21；原授权初始资金 ¥9.23 扣实付后剩 ¥2.21022492，后续必须取实时钱包与授权余额的较小值。没有充值、没有扩大授权。私有证据：`billing-2026-10-12-hourly-reconciliation.json`、`billing-2026-10-13-single-aborted-call.json`、ledger 修改前备份及 `wallet-after-official-billing.json`。零付费入口仍报 `PAID_UNVERIFIED_SCOPE_NO_REDISPATCH`，证明费用结清没有绕过失败范围保护。


### 2026-10-13：Source 局部核验的推理强度

完整 Native window 的局部信号/声明检查使用 `reasoning_effort=low`，继续启用 thinking；Owner / Bridge 保持平台默认 high。官方 [Chat Completions 参数](https://api-docs.deepseek.com/api/create-chat-completion/) 与 [Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode/) 于本日核实支持 low/high/max，默认 high。局部任务不做整课归并或跨来源裁决，局部检查不能取代完整 Owner / Bridge。推理强度进入 Source 请求缓存与严格等价索引，旧 UNKNOWN 的 taskRef 范围冻结不变，不能靠调参数重派失败请求。默认输出仍只有平台上限；实际付费调用还受原授权钱包最坏费用动态保护。

零付费测试覆盖 Source 参数 low、其他阶段默认 high、完整审计范围与未新增固定 Token 截断。低推理强度的真实召回、语义质量和节省尚待已保存原文上的实际独立核验；不得仅凭参数或 unit tests 宣称成本目标达成。检查记录见私有 `source-low-tests.log` 与 `ci-source-low.log/exit`。


### 2026-10-13：首个完整 Native Source 实测及审计噪声修正

已在原授权钱包内执行独立 Source 验证：1 份完整 Native 公告、12 个现有 claims，来源与已冻结 HTTP400 请求不重叠。单次 deepseek-flash / low 成功返回 stop + DONE + usage，输入 3,338、输出 7,162（reasoning 6,873），约 39 秒；官方按唯一小时请求及全部 Token 类型核对，实付 ¥0.031986。输出 complete=true、valid=false，有三条 issues；没有 Course PASS、没有自动 patch 或写入 trusted。low 仍约有 96% 输出用于 reasoning，不能据此宣称效率或 ¥2 冷启动目标达成。

对照原文和实际请求，模型把“参看时间表/作业说明”导航指针视作遗漏的独立任务，实际对应 Clause c9/c17 已保留在 REFERENCE context；又把 ACTION 与 IMPORTANT_RULE 差异称为 force 错配，实际 must 语气及 scheduled-students 条件均已保留。三条信号尚待 Owner 裁决，不能直接增加主 Brief 噪声。通用 Source Prompt 现区分导航/参考与真实执行要求、必须阅读/准备、提交、时间、条件及例外；不要求复制已表达的信息，不根据展示分类推断力度变化。原 Clause/Evidence 保留，不新增课程专用判断，也没有重派本次相同输入追求 PASS。修订 Prompt 尚未取得独立真实模型验证。

同时修复 semantic certificate 未绑定实际阶段 Prompt 的风险：实际 Source / Owner / Bridge system 全文现纳入 certificate。Prompt 变化不能复用旧整课语义证书；既有请求与 UNKNOWN 冻结不变。Native 公告输入确有 body.displayText / body.rawText 两份近似正文，但字节不同，尚未自动去掉任一表示。私有核对见 `NATIVE_SOURCE_GUIDELINES_REAL_AUDIT_ASSESSMENT.json`、原请求/SSE/响应/usage、`billing-native-source-guidelines.json` 与 `source-priority-tests.log`。当前代码完整 CI 记录 `ci-source-priority.log/exit`；exit=0 才成立，仍不构成 RC2/Human Gate 5 接受证据。

### RC2 明确撤回要求的生产工作流回归

新增脚本模型情境：完整读取的当前来源明确撤回 Friday PDF upload，已有用户编辑提醒；实际 Initial/Confirm/Check/Rebuild/Check 生产引擎产生 POSSIBLY_REMOVED 和独立 CHANGED 说明。首次回归发现 mergePendingChanges 只按 targetId + field 更新 pending，两个不同批准范围被合成 CHANGED，撤回决策消失。现将撤回类与非撤回类隔离合并，保留同类后续最新值更新。Human KeepPossiblyRemoved 保留旧用户值、原 Fact/Evidence，新增说明继续待审；此前不完整/视觉读取的 REMOVAL_UNREAD 拒绝回归仍通过。workflow + selective-course 共 94 项通过，日志 typed-withdrawal-workflow.log。这是生产引擎脚本模型证据，不是 DeepSeek 新真实增量或 Human 验收；未增加付费调用，未修改正式课程数据。

### RC2 局部修复的裁决上下文缺口

核读已保存真实三命题 knowledge-repair 请求：旧请求只有 3 段 current 原文，候选中的历史三考核、旧 Part 3 标识和三小时冲突并没有对应冲突原文。不能以模型先前 basis 的“历史”标签替代独立裁决。captureProductRepair 现补充同 owner 的其他命题/Reader ownerHint 对应原文及直接相关命题的只读原文；scope 的命题、owner、可修改 Clause 保持不变，额外材料不成为可写范围。零付费真实预备请求新增 24 个只读 Clause、13 段/12,925 字符，包含 lecture 原文三考核 listing 和 Part 3 3 hours，原 3 段仍保留。这只证明相关原文已送达，不证明已裁决或已修复真实候选。原预备文件另存，原请求/响应/失败不改；新 Prompt 同样命中旧失败 scope 的 PAID_UNVERIFIED_SCOPE_NO_REDISPATCH，未付费。专项 89 项测试通过，新增回归拒绝使用只读 Clause 改写修复范围。实际按业务范围拆分恢复和真实完整审计仍待完成。

### RC2 按连通业务范围局部修复与恢复

生产 organization 的依赖修复和审计修复现按 defect 的 owner/命题/Clause 连通关系分组；同 owner 或跨 owner 的同一缺陷保持联合，无法定位 mutation 的 native-only 问题不得猜测拆分。没有固定 Token/命题数量切片。每组通过完整候选合同验证后立即保存候选，后续组失败不会丢失前组；恢复仍对最终候选执行完整 Source/Owner/Bridge，不提前生成证书。新增脚本验证第二 owner 失败、第一 owner 候选保存、恢复不再调用第一 owner、原 draft 未改；专项初跑 91 项通过。真实预备入口支持明确 repair-owner 的连通组以及 hash/base 绑定的 resume-repair 候选，原 combined 请求仍保留/冻结；当前真实 3 个 knowledge defects 的零付费预备形成 scheme 1 命题与 Part 3 2 命题两个业务范围。真实裁决尚未完成，不把分组或脚本 PASS 当 RC2 语义 PASS。

### RC2 独立业务范围的真实知识状态修复

在原授权余额守卫内调用两个新的连通业务范围，未重派此前失败的三命题联合请求。scheme 1 命题调用 a0c7eec8e99809c469fba6b17db81daa404e3cee17b832b702053e6c1eeb7308：stop/DONE/usage 完整，输入 2,978、输出 3,757（reasoning 3,422），usage 按授权保守价格计 ¥0.03576112；保存 partial 候选 da6f2413…，其余 133 命题未变。由该 SHA/base 绑定候选继续 Part 3 的 identity/duration 两命题范围，输入 7,926、输出 10,379（reasoning 9,187），usage 保守计 ¥0.09838224，完整返回并保存 52e2198f… 候选。两次总保守费用 ¥0.13414336，尚未与新官方小时账单逐项核对，不能冒充 invoice 实付。

模型结合当前说明和旧表格，将三处 KNOWN + competingValues 修复为当前四项 scheme、Part 3 individual closed-book case study、60 minutes；historical/表格错标裁决写入 basis，原 Clause/Evidence 保留。receipt OWNER_REPAIR_REAL_CONSERVATION.json 验证其他 131 命题未改、原 592 Clause 与原模型 capture 未改、本地 knowledge defects=0。此结果不是外部语义裁决的最终证明：完整 Source/Owner/Bridge、来源当前性裁决与实际增量仍需核验，未写入 trusted 或生成证书。full-native-risk-audit-plan-owner-repaired.json 保存修复候选的全部后续范围，原候选计划另行恢复生成。CI-owner-repair exit=0（995 tests）；独立新 shipped profile 加载 26 pending/0 initial trusted、0 paid，原诊断入口恢复；不称浏览器加载证明已验证新候选语义。

### RC2 独立 Owner 审计同样需要反向原文

真实修复候选的审计计划核读发现：Owner nativeContext 仍只从命题/identity 支持构造 quote±512 字符片段，未携带同 owner 的历史链接 Clause；完整 Source 独立检查不能代替 Owner 的跨来源裁决上下文。因此 Owner 改为读取同 owner 命题、identity 及 prior ownerHint 关联的完整已保存 native evidence 单元，包含 current/retired 反向陈述与远处条件；限定在业务对象，不扩为整课深读。无关其他 owner 原文不加入。此举不是字数增大替代任务拆分，而是补足当前性/冲突裁决所需证据。新增回归覆盖超过原窗口的条件和历史反向表格，专项 92 项通过。语义证书同时绑定实际 audit taskRef 列表，使上下文结构变化失效旧证书；Source UNKNOWN 范围 policy 保持，不靠改 ID 绕过冻结。新 Owner 真实效果尚待独立调用验证。

### RC2 Part 3 独立 Owner 真实审计

真实审计 taskRef 7a4e3b3c2f1cbebe 覆盖 13 命题、9 完整 native 单元/11,025 字符，包含旧 3 hours 表格。stop/DONE/usage 完整：输入 8,111、输出 20,137（reasoning 19,768），usage 保守计 ¥0.17556184，尚未匹配新官方小时 invoice。complete=true/valid=false，返回两项问题，未自动 patch 或认证。

核读全部候选：MISSING_OBLIGATION 所指 Tutorial 8 compulsory attendance 已以 p_tutorial8_attendance 保存在 class_participation_component，独立 must/重要规则、有原句及 Evidence；Owner 只提供 parent/child 只读命题，缺少共享 Evidence 单元中的跨 owner 规则上下文，不能因此增设重复动作。另一项 INCONSISTENT_UNCERTAINTY 指出既有 Part 3 delivery ISSUE 与 KNOWN in-class identity/admin 不一致；需要由原文判断“online”与“in-class”是否互斥，不能把先前 ISSUE 视为真实性冲突权威而机械降级已知值。两项核查及原 signals 保存在 PART3_OWNER_AUDIT_NATIVE_ASSESSMENT.json；后续补充共享原文邻接的只读规则，再修复确有必要的 false uncertainty/适用性。完整课程尚未通过，不能拿 scoped complete 当 valid/PASS。

### RC2 共享原文中的只读跨 owner 规则

Owner 与 scoped repair 除父子关系外，现提供与当前完整 native 单元共享 Clause Evidence 的其他 owner 命题作为只读邻接；repair 同时看到同 owner 未修改命题，避免重复已有独立要求。邻接不是本地推断适用性，更不是新增批准范围；模型仍须依据原文判断。新增回归确认规则可见、owned propositions 不扩大、尝试修改另一个 owner 被 LOCAL_REPAIR_SCOPE 拒绝；93 专项测试通过。Owner/repair Prompt 明确已有规则不需重复、candidate ISSUE 不是真实冲突权威，按语义轴区分兼容陈述后处理 false uncertainty。

真实 Part 3 已保存两项 Owner signals 的零付费修复预备通过候选/owned propositions 绑定校验：5 原命题、1 owner、6 Clause mutation refs；只读邻接自动包含 p_tutorial8_attendance 与 p_tutorial_attendance_optional。没有硬编码规则 ID 或复制出席要求，原 paid audit 保留。新私有 --repair-audit 入口仅读取 complete 已保存 receipt，校验原 capture base、candidate（新 receipt 显式绑定 repair hash）、全部 owned 命题和 issue refs 后恢复，不能借 stale signal 任意修改。真实修复结果尚未取得，不能声明已消除 Part 3 false uncertainty。

### RC2 Part 3 false uncertainty 的真实修复与独立复核

新局部调用 781e7df6938581793886957f867285af12599d6a8606ac173ec5c4646ea40a9d 完整 stop/DONE/usage：输入 14,483、输出 20,693（reasoning 18,583），usage 保守计 ¥0.19425912。候选 e59d5c34… 将原 delivery ISSUE 修复为课堂进行/线上 NTULearn 管理两个兼容轴，identity 与 admin 保持源支持；未新增出席命题，其他 129 命题及现有独立 attendance rules 均保持原样。PART3_SHARED_RULE_REPAIR_ASSESSMENT.json 保存守恒与后续结果，原候选未覆盖。

重新规划的完整 Owner taskRef 512c86ae3728f644 包含两个已存在 attendance 只读命题。真实独立复核 complete=true/valid=false：已不再报告前两项问题，仍发现 p_part3_admin 的 modality=must 相比原文 'will be administered via NTULearn during the Tutorial 8 session' 属于描述性安排而非新增学生命令，FORCE_MISMATCH 需继续修正。输入 11,405、输出 28,571（reasoning 28,407），usage 保守计 ¥0.2501236；两笔尚未匹配新官方小时 invoice。不得因有完整 JSON 或局部修复已完成宣称 owner/course PASS。高推理输出仍明显占主导，成本与质量都需如实记录。

FORCE_MISMATCH 随后通过新的单命题范围真实修复：输入 14,148、输出 5,946（reasoning 5,368），usage 保守计 ¥0.07511136，stop/DONE/usage 完整。新候选 88e5d4d0… 将 p_part3_admin modality 修正为 descriptive，value、原 Quote 与 Evidence 保留，其他 133 命题不变；额外 source context 保存在 Reference。该命题仍为 role=action/disposition=ACTION，其信息层级与是否应作为学生执行项仍需纳入后续内容审计，不因力度修正就宣称完整信息价值通过。PART3_FORCE_REPAIR_ASSESSMENT.json 保存守恒和限制；独立 Owner 复核尚未完成，未写 trusted/证书。新三笔 fee 总保守 ¥0.51949408，未冒充官方 invoice 实付。本轮 CI-shared-rule-context exit=0（997 tests），新隔离 shipped profile 加载 26 pending/0 trusted/0 paid并恢复原入口；此加载仍用未认证诊断 seed，不是修复候选正式验收。


### RC2 最新局部候选的实际 UI 接入与截图校验

私有浏览器入口新增显式 candidate-repair SHA/base 双重校验，仅允许 diagnostic-ui；读取真实模型局部候选后仍删除任何旧语义证书，通过原 CourseDraft 合同验证，不跳过候选校验、不认证整课。真实最新候选 88e5d4d0… 在 shipped bundle 的隔离 profile 显示 26 个待审范围；380/1280 两视口实际浏览全部范围后均为 0 decisions、0 trusted，Defer 推进、Exclude/Undo、Review/Brief 编辑条件/例外/力度/知识状态及刷新持久化通过。原诊断入口和既有产物按字节备份恢复，正式课程 profile 未改。latest-candidate-* 保存此次私有证据；这些测试明确 diagnosticSeed=true、semanticAcceptance=false、humanAcceptance=false，不能代替完整生产模型路径。

首次截图落在 CSS settle 动画中间帧，虽然 DOM/点击断言通过，图片不可读；已在 QA 截图调用使用 Playwright animations=disabled，让有限动画完成，再重新实际运行全部交互。latest-candidate-settled-* 的两视口截图已人工查看，显示完整四考核预览及 Part 3 60 分钟、课堂/NTULearn 两个兼容轴，没有以第一组淡色截图声称可读性通过。此修改仅影响 QA 截图，不改变产品运动或页面行为。完整独立 Owner/Source/Bridge 闭环、跨课新真实模型与最终 Human 验收仍未完成。


### RC2 文学评论噪声的真实 Owner 核读与审计器缺陷

使用最新 88e5d4d0… 候选，单独核验 Literature Review owner 的 8 命题/10 native units，没有派发整课。调用 7a853d0f… 完整 stop/DONE/usage：输入 5,600、输出 17,580（reasoning 16,939），保守费用 ¥0.15008384，未匹配官方新 invoice。原审计 JSON complete=true/valid=false，6 signals，其中一项无 proposition/Clause 定位，生产安全入口保存 local-consistency receipt 并停止在 NATIVE_READ_RECOVERY_REQUIRED，未修改候选或签发证书。已定位可信的教学方法 ACTION 晋升和额外 critique ISSUE 无依据；原文也确有选题/构建 review 指示，不能为了降噪整块删除或假定没有当前任务。

独立核读同时发现审计器失准：以 predicate=identity、role=core、disposition=ACTION 为由要求当前身份降为 Reference，将产品分类误解为必须执行的动作；又要求每份一般阅读方法 checklist / 可选写作 sectioning advice 都生成命题，忽略原 Clause/Evidence 和 context 保存。这不是可机械接受的修复清单。现 Owner payload 补充同一完整 native unit 中的 preservedReadOnlyContext；不扩大 owned proposition/Clause 或批准范围，不把分类当源真相。Prompt 明确 ACTION/core 可承载重要当前考核字段，教学方法无独立命题不等于信息丢失，重要真实要求/选择/条件/例外仍必须保存并可达。任务 digest 与证书实际 task/system 绑定自动失效旧缓存认证。新增真实缺陷驱动的合成回归验证同 unit Reference 上下文送达、无关 context 不暴露、owned scope 不变和 context 变化更新 taskRef；20 专项通过。新合同仍待真实独立复核，不用 Prompt 改动冒充语义 PASS。累计已知及新 usage 保守费用 ¥8.03104420，原 ¥9.23 授权保守剩余 ¥1.19895580，无新增授权、充值或原始记录覆盖。

保存上下文的真实零付费预备形成新 taskRef 57661d993accb051：8 owned propositions、38 owned Clause 与原 task 完全一致，10 native units 不变，额外 2 Reference context groups / 38 Clause refs 已送达；PRESERVED_OWNER_CONTEXT_PREFLIGHT.json 记录前后比较。完整 CI-preserved-owner-context exit=0（998 tests）；最新 shipped build 在新的隔离 diagnostic profile 加载最新 88e5 候选通过，原入口恢复，0 paid/0 初始 trusted。以上仍不是新合同真实复核或最终验收。


### 文学评论 Owner 的保留上下文合同真实复核

新 task 57661d993accb051 的真实调用 20e6b674… 完整 stop/DONE/usage：输入 5,946、输出 15,941（reasoning 15,315），保守费用 ¥0.13816560，尚未匹配官方 invoice。生产入口 semanticAuditComplete=true 表示这个 Owner pass 完整，valid=false 表示候选仍有 4 个具体缺陷，并非语义 PASS；旧的 identity/core 一概降 Reference、所有 teaching checklist 逐句物化两项诊断未再出现。剩余为 assignment identity 混入 Part 1/2 教学课次标题、selection 方法 ACTION 晋升、critique value 只写 conclusions 丢失 problem resolution/solution 语义、附加 critique 不必要 UNCERTAIN。保留原始两次审计，不能以新版修正覆盖旧诊断。critique 方法的产品层级仍须结合原文裁决，不能因其 criterion 可复述就自动成为学生义务。

局部修复合同同步澄清 ACTION/core 与 role=action 的区别和一般写作方法的保存位置，32 专项及完整 CI-repair-disposition-context 通过（998 tests）。真实零付费预备绑定最新候选/审计 receipt，4 个命题、1 owner、28 context Clause mutation refs；选题要求及其他 3 个命题为只读。未扩大整课请求，未改原 CourseDraft/正式 trusted。该修复派发及后续独立复核结果另记，不以此预备证明已整改。


### 文学评论局部修复、独立复核与合同失败恢复边界

真实 4 命题局部修复完整 stop/DONE/usage：输入 9,265、输出 4,967（reasoning 3,284），保守 ¥0.05801512；保存独立候选 717006c3…，130 个非 scoped 命题不变，原始 Clause/原 capture 未改。selection 指导变为 REFERENCE/guidance，extended critique 变为 KNOWN Reference 并取消独立虚假争议，身份不再混入 Part 1/2 课次；独立选题要求未动。基础 critique 仍为 ACTION，不能声称教学方法晋升完全修复。LITERATURE_REPAIR_REAL_CONSERVATION.json 保存比较和限制。

新候选独立 Owner task1660127d5dae3eaf 完整复核：输入 6,456、输出 15,451（reasoning15,238），保守 ¥0.13426208；complete=true/valid=false，仅报告基础 critique 方法 ACTION 晋升。随后新单命题修复调用 3a2603fc… 完整传输、usage 已知（输入8,387/输出6,165/reasoning5,269，保守 ¥0.06509048），语义内容已改 Reference/guidance，但遗漏必填 independentReview，生产合同以 COURSE_PRODUCT:REVIEW_SCOPE 拒绝。没有自动从旧命题继承 false，没有覆盖 717006 候选或 trusted，不能以 raw 看起来合理冒充可用结果。

增加 Reference 候选缺失 approval-scope 时仍严格拒绝且不补值的回归；修复 Prompt 明确返回完整 ProductProposition 字段和独立的 independentReview:boolean，不能依赖 Local 默认。私有派发入口新建 unusable-scope journal，对完整付费传输后仍未通过产品合同的逻辑 scope 同样冻结；原 raw/request 不改，费用已知与语义未验证分开。更改 Prompt 后零付费尝试仍命中 PAID_UNVERIFIED_SCOPE_NO_REDISPATCH（literature-contract-scope-freeze.log）。该单命题未重派；后续需基于保存输出设计明确的合同补全或其他可证明安全的恢复，不借改 ID 绕过冻结。LITERATURE_REPAIR_CONTRACT_FAILURE.json 保存失败。四笔本轮 usage 保守合计 ¥0.39553328，累积已知/保守 ¥8.42657748，原 ¥9.23 授权保守剩余 ¥0.80342252；均未冒充官方新 invoice。

### RC2 逐范围截图与可结束的隔离 QA

717006 候选在 shipped UI 的380/1280两视口均可无决策浏览25范围，浏览前0decisions/0trusted；Defer、Edit、Exclude/Undo、Scope ID/版本、独立范围待审和刷新恢复通过，保存50张逐范围截图及映射。文学评论截图实际核读：不再有额外 critique ISSUE/选择建议 ACTION，但基础 checklist 仍可见为执行项，和独立模型复核一致，不能称该页语义 PASS。所有 QA 原入口/产物备份恢复，原正式 profile 未改。

扩展截图时出现已生成PNG但截图 Promise 未结束的实际挂起；仅终止已确认 live 且无进展的隔离 QA Node/其测试 Chrome，失败尝试与部分图片保留。移除依赖后台帧的 unbounded animation.finished 等待，改用现有CSS支持的 reduced-motion 模式，并设置明确 screenshot timeout=30000（QA失控保护，不是产品容量/Token上限）；最终 literature-candidate-reduced-motion exit0，25+25范围及交互全部完成，截图已查看。每个视口结果即时写入，退出阶段失败不丢验证记录。CI 首次 secret scan 遇 Chrome runtime RunningChromeVersion 消失而 ENOENT；扫描器现只读 regular repository files，不跟随外部runtime链接，不跳过 private 普通文件。合成 dangling-link probe 通过且清理，仅排除链接，未屏蔽实际秘密检查。最终完整 CI-literature-contract-and-browser exit0（999 tests），不以先前中断冒充成功。


### RC2 显式合同补全及课程框架上下文核查（2026-10-13）

对保存的 3a2603fc 修复结果执行独立字段补全，没有重派原失败语义 scope。模型明确返回 independentReview=false；其余语义字段及支持引句不变，133 个非 scoped 命题保持，生产合同/Clause 映射验证后保存 ac4383b9 候选。缓存重复恢复为零付费且候选 receipt 字节不变。REVIEW_SCOPE_COMPLETION_BINDING_PROOF.json 保存绑定证据。两视口实际逐范围浏览及 Reference 全项可达验证通过（review-completed-all-references.exit=0）；Reference 不在 Initial approval scope，未变 trusted。该结果仅证明恢复与交互，不证明课程语义通过。

新独立 Owner 审计 task97a79acc91dd225e 完整但 valid=false，认为 programme literature guideline 错放 owner；检查原文后发现诊断把 Reader ownerHint 当业务归属证据，未证明 Reference 的显式 programme 条件被扭曲。原诊断保留，不以人工排除直接改为 PASS。增加只读课程框架与来源背景帮助独立裁决。真实保存数据零付费计划仍有153任务（141 Source/11 Owner/1 Bridge）、117 Source；完整 nativeRiskInventory 与之前逐字一致。文学评论 Owner 获得2条总览命题及5个 native units，仅只读；尚未以该新上下文进行真实模型复核。

39 个专项测试通过，覆盖未计分任务不被排除、只读框架越权修复拒绝、源检查计划守恒、片段不能继承整页完整标记。完整 CI 首次发现 exactOptionalPropertyTypes 不允许显式 undefined；修复为缺失字段不序列化，保留失败日志，再执行完整 CI，结果以 ci-course-frame-and-completion-fixed.log/exit 为准。

本阶段两笔 usage 保守费用分别 ¥0.022876 与 ¥0.18137808；账本38条 P2E-056 调用均已有 usage 结算，合计 ¥8.63083156，原 ¥9.23 授权保守剩余 ¥0.59916844。费用未匹配新官方 invoice；新派发仍须核对实际钱包及未结算预留，不增加授权。本次课程框架代码/测试/真实保存数据预备均零付费。整课 Source/Owner/Bridge、真实增量与跨课验收、RC2最终产物/Drive交付仍未完成，未签发语义证书，未发布或改正式 trusted。

完整 CI-course-frame-and-completion-fixed exit0：contracts2 + extension983 + backend20 = 1005 tests，构建隔离与 secret scan 全部通过。随后用最新 shipped build 加载 ac4383 候选的全新隔离浏览器入口，25 pending、0 paid、0真实请求重派（course-frame-final-build-browser.exit=0），原 diagnostic 入口恢复；不是新版语义 PASS，也未触碰正式课程 profile。


### 审计缓存覆盖核查与指令隔离

零付费走生产 auditProductTask/load 路径逐一核查当前 ac4383 候选153任务：全部 NEEDS_REAL_MODEL，没有符合当前 task/system 的有效缓存；未写缓存、未派发、未凭历史 Reader/Screen PASS 伪造新产品语义认证（CURRENT_AUDIT_CACHE_COVERAGE.json）。历史审计不是可以自动升格的完整认证，需保留实际依赖与失败证据。

发现 Source/Owner/Bridge 原共享长审计指令，Owner 增加规则同时改变 Source system，造成无关缓存失效和重复输入。改为三类独立指令加共享严格结果合同；27专项/完整 CI-audit-prompt-isolation exit0（1006 tests）通过。对相同153 taskRefs测得 Source 输入2,946,636→2,421,129 UTF-8 bytes（减少525,507，17.83%）；Owner减少4,202 bytes，Bridge减少3,759 bytes。这里仅是序列化输入测量，不是实测 Token 或费用节省，也不改变117来源/141Source窗口完整性。AUDIT_PROMPT_ISOLATION_MEASUREMENT.json 保存前后比较。最新 shipped build 隔离加载25 pending/0paid通过，原正式 profile 未改。


### 真实课程框架 Owner PASS 与双输出合同根因

2026-10-13 调用前免费钱包查询 ¥0.98，守卫仍以原授权保守剩余 ¥0.59916844 为更小边界，没有增加授权；实际输出动态分配64,374 tokens，预留 ¥0.599164。独立 Owner task8b06fe03a1facc12 返回完整 stop/DONE/usage、complete=true/valid=true/issues=[]。输入9,470、输出27,842、reasoning27,789，保守费用 ¥0.24067248；P2E-056已知/保守累计 ¥8.87150404，原授权剩余 ¥0.35849596。没有新UNKNOWN、无候选或 trusted mutation、courseComplete=false。原文请求响应及SSE保存，LITERATURE_COURSE_FRAME_REAL_AUDIT_ASSESSMENT.json记录配置绑定，不能把一个Owner PASS升级为课程/Human验收。

真实 reasoning 尾段明确反复讨论旧 valid/issues 输出格式与末尾 taskRef/checkedRefs/complete 格式哪个优先，并在“准备输出”后再次核对已经满意的命题。代码确认 PRODUCT_AUDIT 基础标准带旧格式，bounded包装另加新格式，属于可复现Prompt合同冲突；不能据此断言27,789 reasoning全由冲突引起，但它是有trace证据的浪费来源。移除基础标准中的旧输出合同，保留全部独立义务/OR/actor/force/例外、类型、身份、Evidence与Review范围标准；bounded最终格式唯一且严格校验不变。回归要求各类仅出现一个输出合同且关键语义标准仍在。没有通过更低固定Token上限处理该问题。旧配置真实PASS保存，不自动认证新的单合同配置；Source指令独立，不因移除Owner基础旧格式再改变Source指纹。

单合同修复最终完整 CI-single-audit-contract exit0（contracts2 + extension985 + backend20 = 1007 tests）；最新 shipped build 隔离浏览器加载 exit0、25 pending、0paid、原入口恢复。再经生产路径零付费缓存核查，当前153任务无适用的新system有效缓存，旧Owner PASS未被伪造为新版认证。当前没有live付费调用，原数据/私有raw保持。


### 当前候选绑定的交互、备份与 Rebuild 复验（2026-10-13）

此前隔离测试通过不能默认适用于最新候选。QA脚本现对 entry.candidateRepairHash 与实际 IDB archive.draft.product 的 SHA-256 逐一绑定，支持 --expected-candidate-repair；值不符直接拒绝，不能以文件名或旧结果认定当前通过。最新 ac4383 候选在380/1280两视口实际浏览25范围，0浏览决策/0初始trusted，Defer、Exclude/Undo、Review/Brief编辑及语义facets/刷新/Reference可达验证通过。移除交互脚本仍残留的无界 animation.finished 等待，采用现有 reduced-motion 与明确截图timeout。旧结果与图片先保护到 qa-proof-before-candidate-binding-20261013T053356Z，原profiles保留。

用户语义编辑后的实际Settings Full Replace通过：592 Clause、123 Evidence、24待审范围，archive/facts/reviews/decisions/trusted/durableDigest完整相同，运行时interpretation cache清除后仍恢复；绑定最新候选，未给候选补语义证书。最新候选实际Rebuild UI第一次在1280冲突Edit等待超时，原因是脚本切换目录后直接点仍在旧页的Edit；增加GET_VIEW.reviewItemId到达条件，重跑380/1280通过。380 Keep current保留用户值，1280编辑为Uncertain保留竞争值；独立冲突未混入父级Confirm，初始范围保留、刷新恢复。截图已查看。Rebuild proposal是控制数据注入，证明生产reducer/UI保护，不能冒充真实模型增量判定。

诊断unchanged Check得到failed/ZERO_PAID_CHECK_UNSAVED_CALL，拦截1次请求；facts/reviews/decisions保持原样。该seed只有未认证候选，没有生产nativeSnapshot完整检查点，不能算正式unchanged零模型调用通过，也不能据此删掉验证条件或伪造检查点。正式生产unchanged/真实Changed Source仍待完整候选闭环。全部本轮测试零付费，未改原正式课程profile。

更正恢复入口描述：v030-product-056-browser写入的是当前DIAGNOSTIC_QA_ENTRY指针，最新指针绑定ac4383隔离profile；脚本自身不回退旧指针。旧unique profile和保存证据保留，未触碰正式用户入口。此前“原入口恢复”的概括不能用作该全局QA指针恢复证明；本轮以实际entry/profile/hash绑定记录为准。


### 已保存真实全正文输入的逐单元曝光审计

为了避免把工程自建153审计计划当作Product要求或盲目重复扫描，零付费读取 continuation-053/054 的真实Reader/Screen请求、响应、usage，逐个校验请求canonical SHA与capture绑定，仅使用captured/stop/DONE/usageKnown记录。对当前保存117 Sources的978 native units，以相同sourceId/locator比较经过同一secret suppression后的全文字节；Reader passage按实际可证明的连接方式还原，Screen以实际传入sources.units.text比较，绝不把inventory-only记录算作原文曝光。结果978/978 exactText曝光，0未证明单元；818单元真实进入Screen、161进入Reader，存在1单元重复。SAVED_NATIVE_EXPOSURE_AUDIT.json逐单元保存capture与双侧hash，NATIVE_EXPOSURE_REUSE_ASSESSMENT.json保存结论。没有新扫描或API调用。

这排除了“当前保存正文尚未送达模型”作为本候选的普遍解释，不能排除Reader语义遗漏/错误晋升、投影和Review丢失，也不能证明全部visual已理解。当前native unit949条partial：原始852条带visual gaps，另97条正文经访问秘密抑制而改变；不得清除此标记换取复用或PASS。现141 Source任务中120无产品claims，但“无claims”本身不证明无任务。只按exact既有Screen、无claims/Clause/prop、完整且无visualgap这一保守条件，可识别2个复用候选；尚未实施跳过、未改生产证书/缓存或减少来源检查。更广的合法Screen复用还须核对整个模型上下文、局限性及当前命题依赖，不能用历史INSPECTED直接伪造当前valid=true。

本次是明确的输入证据核验，不是新的降成本实验、Outline-first实施或整课语义认证。保留原当前Source/Owner/Bridge计划和未完成状态，后续派发应依据实际依赖，避免为已证明曝光的原文再支付一次扫描费用。


### 修正验证入口对预付钱包授权的错误解释

读取正式P2E-056 §3及authorization-054-prepaid.json确认：旧累计¥25/¥7限制已被prepaid-wallet/1替代；P2E-056没有授予或要求以初始观察¥9.23作为新累计上限。验证入口却同时计算初始观察减已结算保守估算，形成未经Product确认的硬边界。移除该额外扣减，按实际fresh provider balance分配/派发；current UNKNOWN/在途预留、最坏费用、codec、第二次最新余额检查、single attempt和冻结scope均保留，没有新增充值/账户/模型授权。

先前¥0.35849596只能称“初始观察减保守估算的差额”，不得称原授权剩余。2026-10-13T05:52:43.444Z免费实时查询实际可用¥0.86、0模型派发；两者差异印证保守估算不是实际账单扣款。保守累计¥8.87150404继续保存，未冒充实付。RESUME保留formerDerivedConservativeRemainingCNY并明确isAuthorization=false；最新余额仅是带时刻观察，新调用必须再查，绝不直接沿用本报告数字。

增加回归：同样fresh钱包下已结算历史估算不重复扣减，当前在途/UNKNOWN仍扣预留并可阻止资金不足调用。该修正仅消除未获授权的额外cap，不降低必要语义验收或以低价认证候选。本轮只有免费余额查询、离线证据审计与代码/回归，没有新增付费模型调用。


### Group Owner 循环终态与零付费冻结加固（2026-10-13）

Group Presentation 新合同真实 Owner 请求（43 propositions / 235 Clause refs / 47 native units）触发 PROVIDER_REASONING_CYCLE，终态 failed-paid-unverified；保存 SSE 包含 51,271 reasoning chars、0 answer chars，实际三行检查窗口重复三次。没有最终 usage、没有可用模型 verdict、没有候选修复或 trusted 写入。原 capture/request/SSE 保留，GROUP_OWNER_CYCLE_ASSESSMENT.json 记录统计及尚未验证的范围/适用性上下文假设；不能将 trace 中疑问直接晋升为缺陷或既定历史版本。

该请求 ¥0.739992 最坏费用预留保持 UNKNOWN。2026-10-13T06:32:07.930Z 免费查询实际钱包 ¥0.56，0模型调用；余额低于未结算预留，当前付费派发不能满足安全条件。余额变化不是实际 usage 或账单核销证据，不能擅自释放预留，也没有充值/换账号授权。继续零付费拆分、输入上下文和恢复检查；必要生产全局/增量验收及 RC2/Human Gate5 仍未完成。

冻结加固保留旧 journal，回读其绑定原请求，按实际 owned scope 识别，而非只匹配可变化 taskRef。三个 synthetic Node 测试通过；实际 Group UNKNOWN 与 low-effort 合同失败的两份原请求均证明改 taskRef、effort、只读 frame 后 scope 身份不变（LOGICAL_AUDIT_FREEZE_BINDING_PROOF.json）。这是范围保护证据，不是语义通过或新的付费重派许可。没有改变生产 UI、正式数据或 Evidence。


### Owner 局部恢复的实际函数接入与原候选守恒

新增生产审核模块 planOwnerAuditRecovery 与 auditProductTask 局部 taskRef 路由，复用现有模型调用、scope validator 和失败保护；未复制另一套 Review，未改用户值/trusted。synthetic tests 验证跨组父子合并、未拆分范围不生成重试身份、missing parent 明确失败、局部完成始终不能认证整组/整课。

私有验证入口 --plan-audits --plan-owner-recovery=<原任务ID> 强制零付费，仅保存专用恢复计划，不覆盖完整 source risk plan。对最新 ac4383 候选实际执行函数，生成9局部范围，43原命题恰覆盖一次，parent families不拆断；每范围全 nativeContext、条件/例外/支持/状态及输出平台额度逐字守恒。GROUP_OWNER_PRODUCTION_PARTITION_CONSERVATION.json 与 owner-recovery-plan-95953c4aa8f1c4e2.json 保留证明。0模型派发，original full owner/source/bridge依然未完成。这证明恢复路由与守恒，不证明模型行为、总费用节省或 RC2语义验收。


本次初次全量CI在lint发现新增代码的non-null assertions和unknown数组spread问题，已修正并保留失败日志；ci-owner-recovery-routing-final.exit=0，2 contracts + 992 extension + 20 backend，共1014 tests。fresh shipped build在新隔离诊断profile加载ac4383候选，25 pending、0 paid、0 initial trusted；owner-recovery-final-build-browser.exit=0。该浏览器结果不认证模型分组或整课语义。

只读检查Downloads现有两个10月13日正式账单ZIP，最晚计费窗口结束于2026-10-13T02:00:00+08:00，而本次Group失败开始于2026-10-13T14:14:55.684+08:00；不覆盖该调用，不能据此核销。GROUP_UNKNOWN_AVAILABLE_BILLING_COVERAGE.json只保存archive SHA、时窗及结论，不复制API Key/账户身份。财务预留与原始失败记录保持。


### 跨组组合核验的零付费实现

新增独立owner-composition与auditOwnerRecovery闭环入口，绑定准确局部输入任务和Prompt合同。局部失败/不完整不派发组合，局部缺陷停止后续范围；组合发现跨组问题时ownerComplete=false，不让局部成功掩盖组间问题。全部原文和命题保留，未将确认范围扩展到只读其他Owner。验证入口可以继续单物理调用、cache恢复、钱包和循环保护，未提高Token上限。

新增synthetic回归覆盖全部局部+组合完成、局部成功但组合有缺陷、局部缺陷立即停止、局部partial拒绝；targeted product-audit38 tests通过。Node失败范围4 tests通过，新增组合失败不能因依赖任务编号变化而重新派发。不是付费模型性能或语义通过；原Group未知账本未结算，当前继续零付费。


最新补充回归证明派发前主动停止后可重用已完成局部cache，且变更局部审核合同会使组合task依赖失效；该测试不模拟UNKNOWN付费重试。targeted最终39 tests。对真实Group保存输入，实际生产函数生成9局部+1组合，原命题及全native保留，所有局部合同摘要绑定；只使用明确synthetic verdict验证路由和cache重放，重放0新增captures。GROUP_OWNER_COMPOSITION_ZERO_PAID_BINDING.json明确modelBehaviorVerified=false、semanticAcceptance=false，绝不是实际Group通过。原恢复plan覆盖前按内容SHA另存snapshot，最初native/失败capture未修改。

本轮CI初次遇到闭包unknown类型窄化及验证脚本result shadow lint错误，已修复，失败日志保留；最终ci-owner-composition-entry-final.exit=0，共1019 tests。Node范围保护4 tests另行通过。fresh shipped build再次在隔离诊断profile加载ac4383候选，25 pending、0 paid，owner-composition-final-build-browser.exit=0。默认整课认证尚未接入组合恢复，完整语义/真实增量验收、RC2 bundle和Drive最终交付仍待完成；未改正式profile/可信状态，未commit/push/release。


### 整课生产审核与产品证书接入恢复闭环

整课审核现可选择已经严格完成的Owner局部+组合路径；索引只路由，全部实际raw局部和组合仍逐项核对。所有Source任务与Bridge任务守恒，不重新生成整课Product，旧成功模型cache可继续使用。产品证书绑定恢复合同依赖，并要求semanticAuditComplete；该变更不将UNKNOWN或synthetic证据认证为真实通过。

新增scripted回归验证完整course plan保留Source/Bridge且不派发原冻结Owner、恢复索引缺失raw时仍需要模型、错误scope索引在派发前拒绝；生产organizeCourseProduct fixture验证仅经全部局部+组合+Source/Bridge后生成证书，证书及raw cache重放0新capture、原Clause和候选值保留。全部synthetic，不能证明实际课程质量、实际费用或真实增量验收。


本轮targeted56 tests（42 audit / 14 product）通过。初次CI发现exactOptionalPropertyTypes测试删除字段写法及async测试缺少await，修正后ci-full-course-recovery-certification-verified.exit=0，共1023 tests。fresh shipped build在隔离诊断profile加载ac4383候选，25 pending、0paid，full-course-recovery-final-build-browser.exit=0。没有正式profile/数据写入。

真实候选的全计划零付费守恒模拟（full-course-recovery-conservation.mjs）实际执行当前审核函数：原153任务选为162，其中141 Source及1 Bridge完整相同，9局部+1组合替代原失败Owner，未派发原Owner。全部判定明确为in-memory synthetic，不存入真实cache/ledger，不生成实际课程语义认证；重放0新增capture。FULL_COURSE_RECOVERY_ZERO_PAID_CONSERVATION.json保存边界。实际DeepSeek的Group闭环及Source/其他Owner语义仍未证明。恢复会增加物理任务及输入重复，是否节省实际费用尚未测得，不能将拆分本身宣称低成本成功。

2026-10-13T07:08:32.083Z免费刷新钱包仍¥0.56，当前Group UNKNOWN预留¥0.739992未核销。现有账单未覆盖14:14 UTC+8失败请求。真实语义/真实增量与最终RC2交付仍受资源安全条件限制，不能拿脚本模拟、CI或UI诊断替代。

### P058 定向整改交付（2026-10-13）

交付状态PARTIAL / UNVERIFIED / NOT RC2 / NOT TRUSTED。四项scheme考核平级总览、weight/date先于长树、risk按原group组织已实现；保存旧candidate中的Literature Review误晋升、平台/时间/尺度假冲突、派生exam end和父全文重复仍未纠正。未付费、未扫描、未扩建审核架构。最终CI、真实浏览器、候选/build SHA与保护结果见 `artifacts/v0.3.0/product-058/PREVIEW_SUMMARY.json`；具体五项交付回答、入口、对照和未解决原因见 `PRODUCT_P0_REMEDIATION_v0.3.0.md`。原RC1/正式profile未操作，正式reload/NTU refresh未做，不声称真实在线回归。本轮结束停下集中审阅。

### P059 Course Brief IA中间交付（2026-10-14）

单套卡片与聚焦详情、摘要字段不重复、保存Product顺序、精确重复合并且保全Evidence、章节/Rubric/Reference按需和焦点/展开连续性已实现。真实旧候选仍5个对象（四Scheme考核+身份未闭合Literature Review），并非5个已证实任务；旧假冲突/派生时间/异文重复未纠正。本轮零新增付费/扫描，未改trusted/费用防线。CI及实际浏览/Review/受控结构点击见 `artifacts/v0.3.0/product-059/PREVIEW_SUMMARY.json`；Human结果、Print、新模型/真实增量未通过。具体IA对照及缺口见 `IA_DECISION_AND_PREVIEW_RESULT_v0.3.0.md`。交付后集中停止。


### P060 集中整改交付（2026-10-14）

本轮从 Drive Desktop 唯一 Inbox 定点入站；只改批准展示/结构/打印与验证脚本，保留既有 dirty、旧预览及所有候选证据。卡片同行对齐/内滚动、摘要精简、有序动作目录、Rubric 项分映射、打印布局完成。数值去重故障已修，语义问题不以隐藏声明完成。完整复现、最终 CI/真实浏览器与 PDF 结果、四个最小核读范围见 [集中整改报告](CONSOLIDATED_REMEDIATION_AND_PREVIEW_v0.3.0.md) 及 artifacts/v0.3.0/product-060/PREVIEW_SUMMARY.json。零新付费/重扫/原 profile 操作；集中审阅等待，NOT RC2 / NOT TRUSTED。


### P061 视觉与RC2准备（2026-10-17）

入站唯一Inbox加Human受限PDF定点读取，PDF保持私有。本轮完成视觉等级、明确已知/未决阅读路径、动作/规则层级和同数据双打印模式；17项真实保存parsed source +邻页集中核读，无新付费、扫描、trusted迁移。旧P060关于考试11:00的诊断已被原生安排表纠正，保留原记录并在本轮说明。

验证及实际页数/build SHA见 artifacts/v0.3.0/product-061/PREVIEW_SUMMARY.json 与本轮报告。当前是需要Human批准的集中来源决策点，关键语义未获批准，未创建正式RC2；不得将隔离回放/合成双语测试当真实异构课程验收。最终Human Gate5尚未可提交，原FAIL不变。


### P063 最终收口（2026-11-02）

P063最终语义修正与RC2交付的实际验证、17项矩阵、已保留Pending、生产包/隔离数据及Human待测范围统一见RC2_HUMAN_GATE5_v0.3.0.md及artifacts/v0.3.0/rc2/RC2_MANIFEST.json。旧P061/062等待来源决策状态已由P063授权替代，不再要求第二份摘录。模型新调用/重扫/真实trusted迁移为0。


## P2E-064｜RC2 Typography收尾（2026-11-02）

保留P063的17项候选修正、四卡布局、内部滚动/焦点返回、Review及双打印。按Owner最终明确指示，大字和标题使用原课程标题的Fraunces衬线体，正文/标签/按钮保留既有无衬线；考核标题20px/550（原23px/600），权重桌面36px/500（原42px/600）、窄屏34px/500；日期17px/500（原19px/600），课程名21px/500同字体。字体复用既有资产，无下载；仅CSS，未改DOM/行为/候选数据。打印权重30px，长段维持Regular。

疑似裁切：1280/380新开及字体加载后scrollTop=0，Presentation dates首行完整；650高窗口主动滚到行中可复现半行，返回保留位置，Home恢复起点。未证明默认裁切或内容缺失，未强制重置滚动。对照、测试、恢复点见 `RC2_TYPOGRAPHY_REFINEMENT_v0.3.0.md`。同一RC2原位更新，非RC3；Human Gate5待验收，不发布。
