> 当前 P2E-052 / 2026-10-10：工程成果已整合，语义验收未完成，STOP_CNY_BUDGET_RESERVATION_BOUNDARY。当前实现、测试、失败、费用与恢复事实以 [P2E-052 工程收口记录](../../../artifacts/v0.3.0/goal-driven-052/RESULT.md) 为准；下文保留历史记录，历史 PASS 不代表当前最终验收。完整 B 与精简 C 分离；条款多引用必须逐条原文解码，禁止标题别名吞掉完整动作；用户修改来源保护与新字段显式接受路径已加入。v9 尚无真实模型通过。

# v0.3.0 目标驱动语义工程记录｜P2E-051

当前状态：**STOP_BUDGET_BOUNDARY / GOAL_NOT_ACHIEVED / NOT_RELEASE_CANDIDATE**。响应 P2E-v0.3.0-2026-10-10-051，从 E2P-039 接续，没有重开课程扫描。正式交付 E2P-v0.3.0-2026-10-10-040。此前050的待预算状态仅为下方历史记录。

## 051 本轮结果与边界

Human 授权 `P2E-v0.3.0-2026-10-10-051/DEEPSEEK-24-USD10`，新增 **24/24 physical dispatch** 已完成，24份有效usage，未知收费0。使用正式 `deepseek-flash`；所有失败也计入。峰时费率按缓存 hit/miss 与 completion 结算的保守估算 **USD 2.25374622**，不是提供商发票；reasoning 未双计。未沿用任何旧授权余额。次数边界已到，剩余金额不授予第25次调用。

最新隔离 `npm run ci` 全部通过：contracts2 / extension808 / backend20，共 **830 tests**，格式、构建、严格类型、lint、manifest、secret scanning、文档检查及 shipped/QA 分离通过。canonical与隔离worktree的9份本轮源码/工具 SHA 一致。CI不等于语义验收。

原 QA profile 721份既有文件 SHA 全部一致；关闭的profile只读、Key仅内存传到子进程环境，没有打印、落盘或放入argv。原workflow、trusted/Review及22表不变，未新建正式扫描，没有Chrome权限扩张、Git提交或发布。本轮9份候选代码仍未接入生产入口。无关canonical基线与既有050定点收据逐文件核验没有新差异。

## 实际探索与工程修复

直接全局与开发/冻结样本先出现父级、ID、引用、schema、缺失必需数组、Partial声明及覆盖问题；原16份拒绝与8份机械接受均保留。增加 `native-ref/1`：AI选择原生passage，Local只做精确Source/locator/text解析，不模糊改引文、补缺失语义或用关键词筛Source。Snapshot绑定原始输入、实际投递与Prompt。文本/表格原生结构保留，去掉重复坐标及本机图像路径；屏蔽访问字段及内部访问路由，标明Partial，屏蔽段不能作为Evidence。模式最小化不是通用DLP。

保存整课117 Sources / 978原生单元：最新投递881单元原文保持、97单元含最小化，0逻辑单元丢弃。空白、未读图像/向量与被屏蔽内容仍未读；实际模型usage证明请求被接受，不证明语义理解完整。没有原文件视觉复验，不能宣称完整PDF理解。

全局输出压缩时遗漏细项，因此试验五组按原生文本大小均衡的独立Source核读，117 Sources各一次，未按相关性过滤。源捕获严禁materialize为最终课程候选。四份原答被合同拒绝；精确保留显式未读页的解码后3份可机械回放，另两份仍有Issue形状/Schema错误。它们作为明确未确认的草稿连同所有原生Sources交给全局合并，未本地语义裁决或自动采纳。647个引用经精确Source/locator/excerpt映射到全局passage，防止子集refId重新绑定错误。

来源核读保留了全局遗漏的细节；课程合并也找到新增当期活动，修正rubric分数与课程百分比混淆、保留全部分组时段、区分旧试题与当前工作、保留考试时长冲突。`repair10`完整B合同通过：4个Assessment、10条Rules、30条Requirements。真实现有View/DOM显示30/30返回要求及1个冲突字段，精确投影且无trusted写入。冻结12 Source复验显示5/5要求，原25条provisional内容审计25通过；这不是Human验收或未见过样本。

## 尚未达标：系统性范围

1. **语义与完整性仍不稳定。** 合并仍丢失附加材料上传动作和一个章节时长，复合条款不能仅因主标题存在算完整。`repair10`曾把联系教师许可增强为直接要求；最后`final11`修复该措辞，但不能覆盖其他问题。最后全117 B内容对旧54参考的工程审计：40 PASS /1 FAIL /2 UNKNOWN /11 DISPUTED，G003/G029及原争议保留。全117没有穷尽gold，不把这一计数称为整体质量百分比。
2. **真实C验证未成立，实验准备需承担责任。** 两次增量调用以隔离的前轮未通过草稿为基线，基线含无效 KNOWN+competingValues；模型复制该当前值，完整输出被守卫拒绝。它们照常计费，不能作为公平的真实trusted增量失败结论。已补派发前FactValue、当前ID与冲突检查；错误基线在网络前阻止，但预算耗尽，修复后未付费复验。原始答、基线和失败不改成通过。
3. **Review集成未完成。** model的global/object/constraint issues和identity保存在候选中，现有Assessment DOM未可靠呈现它们；Rules亦没有在候选Initial Review里形成已验证的安全采纳闭环。不能让问题只留在私有JSON、或把Rules写入live trusted表来假称完成。fake IndexedDB中候选暂存/丢弃守恒及显式Assessment Confirm已通过，仍不是完整产品接入。
4. **外部证据边界。** 63保存快照仍只有一门课程，`CROSS_COURSE_NOT_VERIFIED`。没有Human判据裁决；native Partial和原附件视觉缺口保持，不以同课重复代替泛化。

直接全局简化不能凭少量机械通过确定为生产架构；独立来源核读有细节收益，但合并再压缩和不确定性呈现仍是关联缺陷。下一轮从保留输入/输出诊断这些环节，在现有产品合同内完成候选安全接入，先校验合法baseline，再做真实C及不同课程复验。无需重扫当前正式workflow或重跑已闭环试验。任何新的付费派发需独立新增授权；当前边界不等于目标成功。

## 证据、恢复与同步

脱敏摘要/预算逐次明细、评分索引、Review DOM、CI、保护与候选delta见 `artifacts/v0.3.0/goal-driven-051/`。原始Sources、全部request/response/SSE/reasoning、具体worksheet、各版本runtime和中间草稿仅在 `evidence/private/goal-driven-051/`，不上传Drive。`RECOVERY.md`给出确切恢复入口。

出站仅manifest列出的本轮源码、工程文档及脱敏证据；原长期Outbox Drive ID保持 `18IQltR2TnpIyMuuwwSksA1zPrMflR15Y`。六份已有文件的服务端preSHA与最新050定点收据一致，先检查挂载端一致后才替换；最终server逐文件SHA见 `SYNC_RECEIPT.json`。不递归覆盖项目、不上传私有原文、不覆盖新Product Inbox。

---

# 历史恢复基线｜P2E-050 / E2P-039（已被本轮051预算授权取代）

当前状态：**ZERO_PAID_CANDIDATE_PREPARED / WAIT_NEW_PAID_AUTHORIZATION / GOAL_NOT_ACHIEVED**。
本记录对应 P2E-v0.3.0-2026-10-09-050；没有沿用已关闭的 M2 剩余额度，也没有进入产品最终验收。

## 已实现的候选与取舍

在独立 managed worktree 中叠加 canonical 当前 481 份工程/文档文件，保留现有未提交实现，而非从旧 HEAD 重开工程。新增候选经过隔离测试后，10 份新源码/测试/工具保存到 canonical；没有更改原生产入口、现有处理链路或正式数据。参考 HEAD 仍为 `26426a3793250aea351c443e3327ccdb1b95b697`。

候选直接提供原生单元、来源身份和原始上下文，让正式 `deepseek-flash` 生成全局候选。不依赖 A/Registry/Facet 的语义中间清单；现有架构保留作为比较对象。此实现是待验证候选，**不是已选择的最终架构**。尚未接入生产 workflow、真实 C 或 Review DOM，不能把纯 materialization 测试说成真实产品通过。

新增 `direct-course.ts` 保留共享 Task B / Assessment / Component / 日期 / Requirement / Rule 合同，严格检查来源、locator、连续原引文、原始快照、显式父级关系和引用身份。父级与身份 ID 在纯 materialization 桥接中对应真实候选对象 ID；未决问题和身份证据保留。拒绝未知父级、循环、混入其他课程、自动采纳指令以及会被旧 materializer 静默忽略的结构通道。

新增 `direct-course-runner.ts` 使用原子 claim 和持久化端口：先冻结请求，授权后保存派发意图，捕获原答后才解析/校验。连接结果未知、未完成流、length、无效 JSON 不进入候选；恢复不自动重试，不把前缀修成 FINAL。保存中断后的捕获可以零付费重放。这个较小候选暂时不实现多轮续读；若真实结果需要容量/视觉/输出分段，按证据继续调整，不能用缺失页制造通过。

新增独立预算策略及 CLI 适配器。默认只准备请求，不读取 Key 或访问网络；真实模式需明确授权文件及 `DEEPSEEK_API_KEY` 环境变量。全局 ledger 加锁，所有 physical dispatch、失败、重试和 continuation 都占调用额度；缺少已验证用量保留全额预算，达到次数或 USD 任一上限即停止。单请求保守预留 USD 0.7608，依据官方 Flash 最大输入/输出与峰时无缓存价格；这是费用上界，不是账单。价格核验于 2026-10-10：[官方价格表](https://api-docs.deepseek.com/quick_start/pricing/)。授权文件只记录已获得的 Human 批准，不能替代批准。

## 输入与独立判据

离线准备结果分别记录 PREPARED、NOT_DISPATCHED、CONSUMED_NOT_ESTABLISHED，绝不将准备的覆盖率称作真实理解。

| 范围 | 原生单元 | 保持原文的单元 | 屏蔽访问字段的单元 | Provider 请求 bytes |
| --- | ---: | ---: | ---: | ---: |
| 开发 11 份 | 236 | 236 | 0 | 537911 |
| 固定排序 holdout 12 份 | 83 | 82 | 1 | 299594 |
| holdout 106 份 | 742 | 738 | 4 | 2769803 |
| 保存的整课 117 份 | 978 | 974 | 4 | 3304350 |

Provider 实际 context 准入与模型质量仍未测；不能以字节估算决定可靠的 token 上限。所有单元均保留 locator 和缺口，没有依据关键词、年份或标题选掉难例。

原始课程元数据的一条访问字段曾误进入本地检查工具输出。随后改用脱敏检查视图，在候选输入边界屏蔽凭据模式，并把对应单元标为 Partial；证据同时须匹配实际投递文本与原文，不接受屏蔽内容的引文。未上传原始资料/响应到 Drive。模式匹配屏蔽不是通用 DLP 保证，新增来源仍需私密检查，不能把脱敏缺口算作已理解。

独立 holdout 从保存的真实 117 Sources 中排除原开发 11 份，冻结余下 106 份；按固定 hash 排序选择首 12 份进行来源先行阅读，建立 **25 项工程 provisional 判据**。没有看新候选模型回答，也没有将判据注入 Prompt。涵盖教学案例误升任务、准备/工具说明误升任务、缺失正文与文件夹、复合要求、条件/许可、平台与格式、元数据日期适用性、分数与权重。不是全 106 份完整 gold，更不是 Human 已裁决的标签。

旧 54 reference、43 非争议 provisional、11 争议及 G003/G029 UNKNOWN 未动。评判将保留原答和精确输出位置，逐项判断语义而非字符串匹配；关键误判/遗漏/强制捏造/无证据日期选择仍阻止验收。

只读检查 63 份保存快照，仍仅一门课程。因此跨课程重复成功**尚无证据**，不会以同课更多 Sources 冒充泛化。新测试也须分开报告语义质量、合同、runtime、Review、成本和时延。

## 零付费验证与保护

隔离 workspace `npm run ci`：contracts 2 / extension 795 / backend 20，**817 tests PASS**；format、build、types、lint、manifest、secret scan、文档检查和 QA/shipped 分离通过。新增 23 项覆盖全文准备、Partial、精确证据、父子与身份 ID、未决事项、课程隔离、并发、恢复、截断、无效 JSON、隐性重试、访问字段屏蔽与双预算。

CLI prepare 成功；无授权 `--dispatch` 在读取 Key/网络前返回 `AUTHORIZATION_REQUIRED`。真实派发 **0 次 / USD 0**。测试失败已内部修正，未调整产品边界。测试成功仅证明隔离工程路径；没有新的正式模型语义 PASS。

原 481 份 baseline 在新增文件保存时全部 SHA 守恒；其后仅更新本报告索引、Technical Design 的候选记录及正式出站 Handoff。正式 workflow、trusted/Review、22 表、历史账本、QA profile 均未启动或更改。未 commit、push、tag、release，未新增 Chrome 权限。

## 下一步与资源边界

当前需要正式模型结果决定候选是否值得接入，以及容量、格式、遗漏和规范力度是否要求改换路线。集中申请 **最多 24 次 physical dispatch / 总费用不超过 USD 10**，额度内自主分配，不要求逐次批准；未知收费保守预留，任何重试/continuation 均计数。调用次数与费用均未批准前保持零派发。

获批后先用完整开发资料核验语义、合同和费用，再用冻结 holdout、不同来源组合/重复试验验证，依据结果调整方案，并继续 C、增量/重建、隔离 Review 与恢复验证。无真实多课程资料或 Human 判据裁决时据实保留限制；即使某个样本高分，也不关闭目标或发布。

全部新增代码可从 `artifacts/v0.3.0/goal-driven-050/CANDIDATE.patch` 恢复；完整定点同步清单、测试记录、费用状态和 SHA 收据同目录。原始冻结 Sources、原生 Prompt、运行 bundle 与私有判据仅保留 `evidence/private/goal-driven-050/`。


## 零付费补充｜候选 Review / trusted 隔离（2026-10-10）

新增 `direct-course-review.test.ts` 使用独立 fake IndexedDB factory、测试数据库与内存 staging，未打开原浏览器数据库。两项集成验证证明：包括 Rule 的重建候选暂存/丢弃不改变已有 trusted 内容；Assessment 候选通过现有明确 Confirm 后才加入可信状态，保留用户原对象。没有为 Rule 新增控件或伪装为 Assessment；Rule 的 Initial Review 接入仍待完整安全方案，不能直接把全部 materialized bundle 写入可信表。

最新隔离 `npm run ci` 为 **819 tests PASS**（contracts2 / extension797 / backend20）。真实模型、Review DOM及跨课程语义仍未验证；新增 physical dispatch 仍0，之前24次/USD10集中预算申请尚未获批。补充证据及7文件精确同步清单见 `artifacts/v0.3.0/goal-driven-050/review-isolation/`；原首次817-test/27文件收据保留为历史快照。
