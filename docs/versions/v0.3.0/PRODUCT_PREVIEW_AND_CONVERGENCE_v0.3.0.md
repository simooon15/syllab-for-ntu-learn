# v0.3.0 零付费产品预览与工程收敛审计

日期：2026-10-13（Asia/Singapore）。授权：P2E-057；同一 Phase B Goal。

**状态：UNVERIFIED PRODUCT PREVIEW / NOT RC2 / NOT TRUSTED。** 本次不交付正式 RC2，不声称 Human Gate 5 PASS。暂停所有新增付费模型调用和审核机制扩张；即使余额恢复，也须经本轮集中复核决定是否恢复。保留已有代码、缓存、失败记录、原正式课程和 RC1。

## 1. 可操作入口与证据等级

在 canonical repo 执行：

```sh
node scripts/v030-product-057-open-preview.mjs
```

启动独立 Chromium，打开候选 Brief；关闭该浏览器结束。入口读取机器私有 `evidence/private/gate5-convergence-057/PREVIEW_ENTRY.json`，不读取 Key。HTTP/HTTPS 请求全部阻止，因此 Check、模型调用和原 NTU 会话不可用。这是一次性 QA 入口，不是学生正式功能或永久后端。

最短操作：

1. 先读顶部黄色标识。Brief 是待审快照的内存投影，不需要 Confirm，不写入 trusted。
2. 找四项考核、权重、考试模式、时间、提交与责任。展开执行清单、Rubric、Reference；点击值检查原文 Evidence。注意下文已知错误。
3. 点击顶部“打开实际 Initial Review”，用目录与前后导航浏览全部 25 个待审范围。Review 同样显示未核验标识。Edit、Review later、Exclude/Undo、Confirm 等使用现有生产交互；此隔离会话中的认可仅供试用，不代表正式课程验收。
4. 刷新检查操作是否保留。回顶部“返回候选 Brief 预览”查看该 QA 快照的当前投影。正式课程、原受阻会话与其 10 次历史 Confirm 不参与本入口。

预览来源：保存的真实模型 product `7435eb…` + 保存的局部修复候选 `ac4383…`；592 Clause 和来源 Evidence 保留。该候选**未完成整课新语义核验**。没有将中途 reasoning 当结果；没有根据人工期望改写课程事实。合成 fixture/受控 identity 场景只作交互证明，不能作为真实课程语义判定。

实现方式：复用生产 `ViewBuilder.buildCourse` 的现有投影参数及 `renderCourse`，只在 QA 扩展副本增加候选页面与告示。Brief 不提供保存，实际修改转到既有 Review。未改生产信任逻辑、证书要求或正式备份格式。后续不要把该 QA 投影入口接进正式学生路线。

机器私有证据目录 `evidence/private/gate5-convergence-057/` 保存浏览器证明、原始文本和截图；不上传 raw/profile/账单/Key。关键截图 `brief-top-1280.png`、`brief-top-380.png`、`brief-1280.png`、`brief-details-1280.png` 可由本机审阅，未当作可公开资产。源 profile、候选/build SHA、生成时间及浏览器入口由私有 entry/proof 记录；共享 manifest 只保存安全摘要。

## 2. 预览的实际发现：核心产品问题仍未收口

380/1280 都能打开，展开详情和点击 Evidence 无 page error；刷新后快照、决策和 trusted 与之前逐对象相等，零付费、零认可。这个结果仅证明候选可看，不证明内容准确。

| RC1 失败项 | 当前观察与链路根因 | 结论 / 后续优先级 |
| --- | --- | --- |
| Literature Review 误晋升 | 主层第一张卡仍为 Literature Review Assignment。保存 product 的 entity 仍为 CURRENT，虽然部分 critique/selection 命题已降为 Reference；视图忠实呈现此 entity。仅修命题未纠正实体适用性 | 未解决，P0。须对实体及其真实任务根据来源作集中判断；不让本地按名字删除它 |
| Group 重复与层级 | 已有父子清单和 Rubric/Reference，但 core 的 CONTAINS 父命题递归展示多个长子动作；权重在长段和冲突之后。形成结构不等于形成重点 | 部分实现、效果不足，P0。后续将已核对核心字段作为首层，独立动作置执行清单；关系/原文完整保留。此次不再重做 IA |
| MCQ Mode=25% | 当前投影显示 mode=Closed book、weighting=25%、time limit=30 minutes、question count=25 | 该局部错配改善；不等于整课正确或考试时间完整 |
| 技术元数据 | 主层仍出现 group-content configuration、late-accept flag、due-date enforcement、100 vs 25 分值冲突 | 未解决，P0。保存模型仍将配置推为 ISSUE/core/risk；不是 UI 折叠即可解决。需要核对是否真的改变学生行动 |
| 虚假冲突 | “15 minutes + around 5 minutes Q&A”与20分钟时段被标为冲突；个体提交配置与小组任务也出现冲突 | 候选仍有错误或缺乏支撑的矛盾判定，P0；直接展示未认证状态，不能用 schema/quote 通过来背书 |
| 总览与规则 | scheme 包含四考核，但长嵌套卡片及大量 Issue 把后续考核和规则推远；固定 kind 分组与名称排序不能保证首屏重要性 | P1。应评估可扫描总览与高价值风险提示，而不是继续增加 Fact/审计数量 |
| Review 自由浏览 | 25 pending 无需 Confirm 可浏览；Edit/Defer/ExcludeUndo 等已有真实点击回归 | 工程可操作，不推翻 RC1 人工 FAIL；本次 Human 仍需判断范围是否清楚、是否好用 |

没有测量学生查找正确答案的耗时或召回率。页面文本约8965字符只是现象，不作为降噪成功指标。对照原 `Syllab.pdf`/`Syllab1.pdf` 的失败类别，本预览足以显示：**修复了部分类型与交互，尚未解决信息价值和实体/冲突语义根因。**

Print：最大31事实 Review 的折叠/展开 A4 实际输出有空白尾页与首面大留白。QA-only block flow 消除尾页；允许有子清单的父动作跨页进一步改善首面。定位指向 grid 分页和对整个嵌套动作施加 break-inside:avoid；尚未修改生产 CSS，不称最终 Brief print PASS。P2E-057 允许屏幕预览先交付，因此此问题不继续阻挡预览，也不隐瞒。

## 3. 工程机制必要性审计

分类是供审阅的方案，不是删除授权。本轮不大规模删代码、不新增审核框架。

| 机制 | 保护的具体风险 / 必须保持的不变量 | 代价与证据 | 建议与最小收敛路径 |
| --- | --- | --- | --- |
| Reader / 来源风险检查 | 普通课件隐藏新任务；漏交原文会使后续 AI 无从判断；保留不可变来源/版本/定位 | 117 sources/978 units；历史输入曝光978不等于正确理解；852 visual-gap、97 suppression 的局限仍在。未测每源最终稳定成本 | KEEP。保留智能初检/选择深读，不恢复全量无差别深读。Local 管身份/哈希/覆盖，AI 管是否值得深读；部分或不可读明确暴露 |
| Link / Projection | owner 错连、条件/历史状态丢失、从一原文漏独立要求 | 多阶段中间状态与产品重复；当前 entity CURRENT 与降层命题不一致的产品效果说明单改命题不足 | SIMPLIFY。优先单一 typed product 为候选产品语义归属，旧 Link 作来源线索；减少重复语义裁决。保留兼容、原文映射和历史候选回退，先方案审阅 |
| Typed Proposition / Disposition | Mode/Weight 类型串位、强制/可选混淆、例外/OR丢失、教学晋升 | 结构和 Evidence 可确定性验证；语义正确性仍需 AI/人判断。当前噪声证明 typed 本身不足 | KEEP。保留独立义务、entity适用性和Evidence；把“实体真实任务身份”与“命题学生价值”一起检查。不要建设通用知识图谱 |
| Source / Owner / Bridge 全课审计和证书 | Source 召回遗漏；Owner 内错误身份/类型/合并；Bridge 跨owner错误 | 原计划153任务，其中141 Source+11 Owner+1 Bridge；恢复后162。43props/235refs/47units请求reasoning51271chars、0answer、无usage。全计划模拟不是语义PASS | SIMPLIFY。完整整课证书不得作为未核验预览的前提；将其与可看候选分开。后续集中选择重要或变化范围的语义核读，普通静态完整性用本地校验。未授权撤掉生产证书门槛；必须先审阅可信候选何时可认可的规则 |
| 9局部+1组合恢复 | 一个大范围失败后还能核验独立要求，组合检查跨组关系 | 43props按9组守恒，但每局部重复完整native上下文，再做组合；支付、重复输入、模型质量收益未实测 | DEFER / REMOVE-CANDIDATE。冻结继续扩张；不把10调用当默认路径。若后续验证必要，先选实际疑点做有限核读；保留现有实现可回退，不能通过换任务ID逃UNKNOWN |
| Repair / completion | 修正模型确定错误，补缺字段，不丢来源或自动补语义 | 保存局部修复后Literature entity仍CURRENT；机制成功不代表问题收口。重复repair容易产生更多审计依赖 | SIMPLIFY。一次明确缺陷清单、来源范围、预期交付；失败停止。不得本地创造字段、循环自动重派或用中间trace修补结果 |
| 缓存 / 原始capture / 版本绑定 | 防重复花费、混用旧prompt结果、复现错误 | 维护hash、prompt依赖、闭包索引有成本；能复用确定完整历史结果，但新prompt不自动取得旧认证 | KEEP / SIMPLIFY。保留exact request/版本与原始证据；少量单一账本索引，避免多份语义状态相互覆盖。局部cache可用与整课认证有效必须区分 |
| UNKNOWN / 钱包 / 循环守卫 | 重复收费、超过实际资金、无可用答案持续耗费 | 40条known保守¥8.98681004；当前UNKNOWN reserve¥0.739992；¥0.56是历史余额。循环检测是启发式，不证明平台无限循环 | KEEP。可免费对账但本轮不恢复付费；缺finalusage仍UNKNOWN，不靠余额变化释放。无Syllab固定Token容量上限，平台上限/余额动态预算/异常停止分开 |
| Review范围 / trusted隔离 | 仅为翻页就认可、隐藏冲突被父Confirm带入、编辑范围不一致 | 25 pending/380与1280真实浏览回归；安全边界复杂性有实际产品原因 | KEEP。无需证书即可看未核验预览；真正认可仍要明确范围与版本、独立风险不能偷认可。不要增加第二Review系统 |
| Check / Rebuild / backup | 新来源覆盖用户值、删除未读误判、旧备份不可恢复 | backup、受控Rebuild有证据；当前诊断unchanged缺nativeSnapshot/证书，1blocked请求，不能称真实零调用 | KEEP。源hash不变应走确定性复用；变化只重审受影响依赖。先复用已有测试，不建新证明平台。正式真实增量仍待后续最小必要验证 |

整课证书的真实作用是记录某一组 prompt/来源/候选被模型核过、发现的关键缺陷已处理；它**不能证明模型从未漏信息，也不能替代 Human 可用性判断**。预览之所以此前迟迟无法交付，部分是把正式可信闭环与“可看、可试但未认可”混为一谈。此次只解决后者，未降低前者的授权边界。

## 4. 建议集中审阅顺序与后续回归

1. P0：Human 看预览是否值得继续；先认定现有已知错误，不在其上增加证书层。优先实体适用性、配置噪声、虚假冲突与首层信息价值。
2. P1：确认收敛原则：保存全量证据；候选展示不依赖整课证书；正式可信路径保留风险核验与Human确认；将付费验证从遍历所有条款转为来源召回与关键疑点的必要核读。具体删除/修改门槛未获本轮授权。
3. 若恢复付费，先明确每个调用解决哪个学生风险、给出有限交付范围与失败停止条件，再在最新钱包安全条件下执行；不复发原整课/整Owner请求。
4. 用源→原始响应→typed命题→Review范围→Brief的链路核读验证：真实新任务没有藏掉、独立义务/条件/例外/OR完全可达、Evidence精确、旧用户值/backup/UNKNOWN不退化。合成PASS与真实语义PASS分别记录。
5. 产品指标建议：首次看到四项考核及正确权重；能正确找到deadline/提交物/渠道/责任/关键禁令；无教学例子或技术flag误晋升；每次Confirm准确说出认可范围。耗时目标由Human在预览试用后定，不虚构当前耗时。

交付后等待 Human + 产品侧集中审阅。原 RC2 与 Human Gate 5 目标未完成、不重定义；不发布、不commit/push，不实施Outline-first和¥2成本实验。
