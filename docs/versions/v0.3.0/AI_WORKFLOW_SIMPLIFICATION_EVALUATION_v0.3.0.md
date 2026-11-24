# Syllab AI 工作流简化评估 v0.3.0

## 当前 M2 集中结论（P2E-049 / 2026-10-09）

正式入站P2E-v0.3.0-2026-10-09-049，出站E2P-v0.3.0-2026-10-09-038。状态 **M2_COMPLETED_WITH_LIMITATIONS / INSUFFICIENT_MATCHED_EVIDENCE / STOP_PRODUCT_REVIEW_M2**。完成隔离原生A→B1→4个实际Group的可行facet/synthesis、读取诊断、语义核对、预算/原始流回放和定点同步；生产未改、M3未授权。

**主要已证实的风险在读取不足、跨轮状态与格式/ID准入；尚不能判定重型语义处理是唯一或主要原因。** 同一11Source/236单元/125,574字符：A初投49,020、实际唯一投递55,584；全M2实际唯一投递58,391（46.5%）。S06关键assessment/规则页未投递，S03/S07模型range实际只回33+33/66页内字符。read轮只有两条message、carry:null与可取回carryRef，模型未取回前状态；S04读全数据行但漏先前表头locator而被合同拒绝。这些都不能算同等资料下模型理解失败。

真实20/26 physical：19完整stop/DONE/usage；1连接中断收费UNKNOWN，未重派。A5/11准入，B1 PASS并生成4Group/74records、显式保留Source gaps；最终semantic-facets/2仅1/4通过，另两份父ID错误、一份JSON无效；成功G1 synthesis/materialization通过。B2 scope无法自动救回未准入/未路由的S01/S06。格式无效原答没有被修为PASS；S01前缀模拟只用于零付费归因。helper对invalidJSON显示PAID_UNVERIFIED的分类缺陷单列，物理4/12/19有usage，真正unknown只有1。

冻结54gold：43非争议工程provisional、11正式争议仍未Human裁决；旧M1 G003/G029未知不改。A21项有必要证据暴露，原答17正确/1力度错误/1遗漏/2未知（含非法JSON语义前缀），另22项未暴露；准入后确定正确只剩6项。唯一有效G1保留8/43条，是**部分链路产出而非matched模型准确率**；S02/S11成功子链在七项条件性核对中6/7。没有无条件任务precision/recall、稳定架构胜者或全119Source可靠率。

全文已读的S02在A将自愿联系强化为should Requirement，新版nativeFacet重新审计后纠正permission，synthesis明确optional；同时全部16组逐slot在A漏掉，全文facet仍未补齐。重阶段既有纠错收益也有漏细节，不能只看失败而否定nativeAudit。旧试卷年次和UNCERTAIN适用性保留、未把子题造独立Group，但其G4没有合法最终proposal；同名登记、Quiz/Exam/权重/Rule/日期正式争议保持集中Gate。S11旧default_due/start未提升为当前KNOWN，当前due字段KNOWN又保留权威未决issue，需验收关注状态一致性。

四轴：语义条件性分数与结构运行分开；成功G1 contract/provenance PASS；隔离materialize形成1assessment/11facts/16evidence，正式Review导入与DOM/E2E、Check NOT_RUN。19已知usage估算USD0.447609912，unknown最大预留USD0.483640200，预算占用USD0.931250112/19.80；剩6次与USD18.868749888未消费。高峰input miss/hit/output分别0.30/0.006/1.20每M，reasoning不双计，非发票。已知请求耗时合计1,219.386秒，观测窗口7,688.685秒含本地恢复间隔/unknown，不能与M1一请求当完整成功链速度比。M1四次独立关闭、不混计。

推荐下一步先由Product决定同源完整投递/显式locator读取和跨轮工作状态保留的有限消融；若等暴露仍丢义，再评估减阶段/轻结构混合路线，保留exact Evidence、预算/权限/恢复和Human Review。不执行真实Exposure+、新Plain/Lean、生产修复或M3。剩余额度不必用满，随机重复失败输出不能建立缺失的paired信息条件。

311生产/工程文件、原封闭QA profile721文件、047/048旧公开data51份字节不变；live22表读取NOT_RUN，不能冒充新的live22 PASS。无新Scan/workflow、正式Review/trusted写入、commit/push/tag/release。实验/文档检查、逐条worksheet、cost/read顺序、源暴露、uncertainties与同步见`artifacts/v0.3.0/workflow-simplification-eval-049/RESULTS.md`、`VERIFICATION.json`、`SYNC_MANIFEST.json`、`SYNC_RECEIPT.json`。原始Source/Prompt/SSE/reasoning/private worksheet留原机，Drive仅脱敏结论与hash。

**本轮到STOP_PRODUCT_REVIEW_M2集中验收停止。下文均为历史证据，不是续跑授权。**

---


## 历史 M1 实测结论（P2E-048 / 2026-10-09；以下为当时快照）

正式入站P2E-v0.3.0-2026-10-09-048，出站E2P-v0.3.0-2026-10-09-037。状态 **M1_COMPLETED / LIMITED_DIAGNOSTIC_SIGNAL / STOP_PRODUCT_REVIEW_M1**。只执行M1；M2待独立Product集中验收及授权。

完成冻结047资料的2×2 DeepSeek Plain/Lean真实Pilot，共4/4 physical dispatch，全部finish=stop，无重试/continuation；按实际usage与高峰费率估算USD0.169646040，低于USD3。冷输入归一USD0.169834200；reasoning已在completion，不重复计费。完整请求、SSE原答、visible/reasoning只保存在private，公开有hash/usage/时间与脱敏逐条评分。

单文件S02五条两臂均5/5。多来源43非争议provisional条款：Plain表达/正确覆盖41/43；Lean表达32/43、确定正确29/43，另G003/G029两项输出判读UNKNOWN，正确覆盖上界31/43。11正式gold争议保持独立，未Human-adjudicated、未修改gold、无双人/双盲声明。没有已确认历史子题/参考论文/教学例子误提为独立当前任务；Quiz/Exam均被输出，其当期适用性与权重仍需裁决，不能报告无条件实体precision/recall100%。

Lean多来源遗漏全员slot、自愿联系、逐组时间表、Power-Interest Grid、Gantt/依赖、附录许可；仍保留引用规范、邮件禁令、提交次数/不可撤回/条件性期限疑问及OR程序。两臂均漏旧试卷缺页报告。Plain另外保留Individual/Group与导论日期冲突。差异支持进一步测试条款压缩/格式影响，不证明生产复杂流程更差或架构胜负。

四轴分离：A文本可读，未验证生产映射；B两份JSON通过，single exact引用21/21且bridge PARTIAL，multi85/94且bridge PROVENANCE FAIL。A也有非exact原生引语，弯引号substring筛查不是B Evidence对象的可比precision。没有修复真实回答后评分。C本轮NOT_RUN，046旧证据仍为unmatched；没有新materializer/Review/Check/adoption链或全119Source可靠率。

311生产/工程文件、04727个实验data文件不变。原QA调试连接已关闭；只读凭据恢复后无profile启动，原profile721文件字节守恒；本轮live22表复核NOT_RUN，047守恒证据仅作历史。未改生产源码/Prompt/contract/PRD/Technical Design/Engineering Report，未扫描、采用候选、commit/push/tag/release或清理dirty state。实验SSE重放、次数/费用guard、评分拒绝未填/错hash、文档/README/secret检查及同步见048 VERIFICATION/CHECKS/SYNC_RECEIPT。

建议验收M1后决定是否授权M2：首先查Native实际source exposure/read与stage传递，匹配完整投递和端到端成本；保留恢复、Evidence、Check与Human Review边界。不得自动动用旧30次/USD20提案。

完整可复核结果：artifacts/v0.3.0/workflow-simplification-eval-048/RESULTS.md、四份worksheet、SCORES.json、CALL_INDEX.json与LEDGER.json。只同步本轮048公开增量与本正式诊断文档、长期E2P outbox，保留原Drive ID，private不上传。

---


## 历史准备基线（P2E-047 / 2026-10-09；以下不是当前授权）

正式入站 P2E-v0.3.0-2026-10-09-047，出站 E2P-v0.3.0-2026-10-09-036。状态 **EXPERIMENT_READY / WAIT_PAID_AUTHORIZATION**；准备完成，也可记 EVALUATION_READY / NEW_PAID_AUTHORIZATION_REQUIRED。不是046补丁、Engineering Freeze、Final Acceptance或发布授权。

**已有证据足以支持对复杂度做独立试验，不足以确认“现有流程过度复杂”或“简单阅读更好”。** 本轮新增DeepSeek0次/USD0，Plain/Lean/Existing的matched新模型运行全部NOT_RUN；没有实验胜者或新的模型语义precision/recall。生产代码、正式Prompt/contract、PRD/Technical Design/Engineering Report未改，Git HEAD保持26426a3793250aea351c443e3327ccdb1b95b697。未切换正式deepseek-flash，未启动新Scan/workflow、采用候选或清理dirty state。

## 零付费诊断与风险位置

Source-first复核046保存的全部11Source方便样本：125,574原生字符、236单元、225Partial单元；不能代表119来源。完整公告、日程、多文件演讲/提交、课程导论、旧试卷、参考文献、讲义示例及同名登记均保留，未围绕Gold截句。原始正文/日期/文件身份保留private；Source locator/hash和选取理由共享。

当前纯函数bootstrap实测初投49,020字符/11单元，225后续单元需read。A/B简单臂直接拿同一完整可读正文，既有路径可访问同范围但不等于已投递同信息量。这个差异是待分析的retrieval机制，不是证明DeepSeek能力缺陷；历史parent-only facet/1更不能代表最终native/2。

原生page74/75提供Quiz/Exam，但准入A没有相应Draft，B1以recall gaps保留；诊断要区分A是否读到、学期适用性与Group权限。原文邀请经父清单/facet command增强为canonical Requirement；可读引用规范/正当理由期限疑问路径没有进入旧facet与proposal。TRACE/历史原捕获hash保留证据，但没有单阶段matched结果，不能只凭这些定位“复杂协议是唯一原因”。

真实token/bytes测量显示多层Draft/context/native Evidence/registry/facet输出负担和机械合同失败确实存在；046三份成功B1→facet/1→synthesis合计USD0.150132576，但不含前置A/其他Group/Check。五次全部USD0.270598410及约776.054秒只是历史实际值，不能当C端到端成本。B1约847KB request并非125,574字符全都无用地重复：原单位不同且含结构、cells和多份AI状态。

046单个UNCERTAIN候选丢失是Local View缺陷，已经修复；不能给DeepSeek扣语义分。本轮只诊断、不再修生产。provenance/原子ledger/immutable证据/权限/恢复/fencing/User Review保持产品必要性；待检验的是发现、重复清单、语义分解/传递和输出负担的净收益。

## 实验与公平性设计

A Plain：同deepseek-flash直接读资料，自然语言/轻表格整合。B Lean：与A逐字相同的Source及语义说明，简洁tasks/rules/exclusions/issues JSON，少量Evidence/state/modality，无registry/facet。C Native：现生产新版A→B1→B2 facet/2+synthesis，只在隔离store执行；薄Check另设固定Current/Latest对照，不能混入Initial成本比较。

single是S02完整公告，多文件是11Source全部可读单元。四份A/B请求已在private冻结，正文与COMMON_INSTRUCTIONS SHA相同；native kind/title/identity/旧年份等不隐去，selection role和Gold不输入模型。输出格式差异是显式处理。deepseek-flash、thinking enabled、reasoning high、stream/usage一致；max_tokens/temperature/top_p/seed依正式省略策略。单次方便样本不宣称稳定可靠率。

公平结论分层：A/B matched格式比较；C availability-matched端到端/读取诊断，实际delivered parity尚NOT_PROVEN。C所有read逐条记locator/native SHA及投递时间，未读关键页不能直接解释为同等上下文下模型遗漏。另行C Exposure+仅是隔离全原生投递消融，不改生产，不与Native混样；不包含在当前自动执行建议内。

匿名worksheet先冻结，记录 Source/Prompt/code/response SHA；未来A/B按固定seed47随机顺序，不看答案临时改Prompt/Gold，记录时窗/服务端model别名版本/cache差异。历史041/043/045/046是historical_observation；新matched run未完成前不产生横向胜率。真实重指派旧材料在此scope未观察，旧合成正例独立列示，不计真实语义得分。

## 可复核评价与工程验证

已拟订54项Source-first provisional gold，43项无已识别争议、11项需集中裁决；“无已识别争议”也不是Human gold。private原文worksheet有locator/原文/context/hash，公开只有脱敏判定及hash。Quiz/Exam/权重的学期、Group/Individual标签、同名登记身份、Rule作用域和日期优先级未强定。被明确保留且说明争议的UNCERTAIN候选不当作静默遗漏。不可读视觉、缺页/未读链接不进入模型遗漏分母。

四轴独立：semantic-correctness、semantic-coverage、structural-parseability/contract、runtime-operational-feasibility。实体TP/FP/FN按语义身份计算，component不双计；逐clause保留禁止/许可/条件/例外，关键false positives/omissions/力度增强单列。quote字面有效不是语义正确，JSON通过也不是内容完整。字数不加分。single适用S02五项，multi全部54，11争议未裁决时排除并公开分母。

零付费PASS：Source冻结/哈希、A/B字节parity、现代码5个system Prompt/11个bootstrap只读测量、8个隔离适配反例+3个score分母/未评分拒绝共11tests、311受保护生产/工程文件SHA守恒、47旧046私有捕获/账本相关文件不变。桥接只保留原state/候选/Evidence，permission/context不Local转mandatory，未映射项明确保留；没有正式materializer/Review导入/E2E证明。本轮未改bundle，因此不重复046 CI或重载扩展；只做实验/文档相应检查。

完整可运行离线命令、metadata和源码在 artifacts/v0.3.0/workflow-simplification-eval-047/README.md。新的paid runner尚未编写，当前harness无dispatch命令且无API key/网络接口。

## 一次性后续封顶提案

请求建议**最多30physical dispatch/USD20**，当前尚未授权；先4次A/B pilot子上限USD3，其余C新A11/B1约1/B2预计6/Check约3及5个read/retry/continuation动态预留。Group数量由AI，3Group只是预算估计不是产能限制。budget不足就停止并报INSUFFICIENT_MATCHED_EVIDENCE，不删Source或补JSON。更多复样、C Exposure+和视觉补全需另外授权，不自动展开。

四份A/B完整请求合计1,003,306 bytes，保守最大输出/消息overhead后预留约USD2.20；正常完成工作估计约USD1–3全任务，未实测。USD20是硬安全上限，不是预计支出。按官方2026-10-09 [定价](https://api-docs.deepseek.com/quick_start/pricing/)高峰冷输入USD0.30/M、输出1.20/M，以请求UTF8字节token上界加消息overhead、393216最大输出做逐请求预留；[API文档](https://api-docs.deepseek.com/api/create-chat-completion/)说明正式thinking/high省略max_tokens默认64K。模型别名服务端版本和费用要在实际执行时重新核验，不擅自换模型。

30次最大输出保守项USD14.155776，余USD5.844224用于实际冷输入/overhead。锁定slot、无在途、原子ledger预留在fetch之前；unknown按reserve，所有失败/read/retry/continuation计数，reasoning不双计。真实参数和guard以新Human有效授权为前提。当前0/USD0不能因提案成文变成允许执行。

## 初步架构建议与交付

先保持生产不动，做配对pilot。若Lean与Plain相当且能机械保留Evidence/uncertainty，优先评估“单次语义整合/少阶段+既有Local权限、恢复、引用和Review fence”的混合方向。若优势主要来自原生投递，先研究Source delivery；若C已齐读仍有父标签锚定，再消融语义层。若三路径都错，承认资料/适用性/同模型共同风险，不能先定模型或架构罪因。上述均是可证伪建议，不是新版锁定设计。

Changed Files与Drive回读以实验SYNC_MANIFEST/SYNC_RECEIPT和E2P-036正式outbox为准。原NTU资料、真实Prompt/请求/原文gold/账号session不上传。现在仅一次集中交付EXPERIMENT_READY / WAIT_PAID_AUTHORIZATION；等待Product裁决基准争议及Human新的付费指令。
