# Syllab v0.3.0｜Product Decision Log

## PD-056-01｜阶段 B 集中批准 / RC2 实施

2026-10-11，P2E-056 记录 Human “ok”：批准证据支持的晋升、行动型分层 Brief、业务范围 Review 和浏览/认可分离，以及四项补充约束。允许最小 Typed Proposition、义务结构与 Issue；同一 Clause 可支持多个命题。对旧 PRD Review 不改逻辑作局部例外，仍复用现有系统。实现可以自主进行；Human Gate 5 尚未通过，不授权发布或 commit。Outline/source-priority 与 ¥2 目标仍仅研究。RC1 历史及十次受阻确认保留，绝非 gold。


本记录保存决定的时间和依据，不代替 PRD、Interaction & IA 或实现报告。早期方向历史仍保留在 `DIRECTION_ADJUSTMENTS_v0.3.0.md`。

## PD-055-01｜RC1 Human Gate5 拒绝

**日期：** 2026-10-11；**状态：** Product confirmed；**依据：** P2E-055 与两份人工界面 PDF。

RC1 FAIL，禁止发布；核心信息价值和 Human Review 问题必须在 v0.3.0 整改。937 项旧工程检查不构成 Human PASS。十次被迫 Confirm 保留审计，但不认可其内容正确，不能作为 gold。

正式结果归属 `FINAL_ACCEPTANCE_v0.3.0.md`。

## PD-055-02｜先集中审计/方案，再进行重大产品实施

**状态：** Product confirmed execution boundary。

阶段 A 可审计与修明确工程故障；信息模型、Review/Course Brief IA 重大修改先交集中方案，由 Human/产品侧确认。保全 canonical dirty、原正式数据、原 Human 受阻 profile、旧 evidence 与两笔 UNKNOWN。不得发布或重启项目。

方案：`RC1_GATE5_PRODUCT_REMEDIATION_PROPOSAL_v0.3.0.md`。其中四项产品行为、新命题表示与审核范围**待决策，不标 APPROVED**。新安全复现 launcher 仅克隆旧未确认种子，不改原 RC1/受阻数据；不是 RC2。

## PD-055-03｜Outline 优先 / 谷时 ¥2 仅研究

**状态：** Product confirmed restriction；策略结论待审阅。

研究见 `OUTLINE_SOURCE_PRIORITY_FEASIBILITY_v0.3.0.md`；不授权新付费实验或扫描、Prompt、Schema、模型配置变化，不作为本版功能整改前置条件。不能把 Outline 当绝对权威或排除课件隐藏任务。

## PD-056-02｜已批准审核边界在重建与结构调整中的落实

2026-10-12，工程审计发现 Rebuild 的旧全量 replace 会清空新模型的待审范围并覆盖 user-edited 值。按既有 P2E-056 §2.3–4 的明确约束，RC2 Typed Proposition 采用重建保留 scoped Review，替代用户值必须单独核定；Same/Split 保持所含要求 pending。不是新的产品模块或新增 Gate，不能把这项实现记录称为新 Human 验收通过。

## PD-057-01｜冻结审核扩张与付费，先交未核验产品预览

2026-10-13，P2E-057 记录 Human “ok”：沿用阶段 B 产品与保护要求，暂停所有新增付费调用及审核架构扩张；余额补足或 UNKNOWN 核销不自动恢复。保留既有机制、证据和代码，不授权大规模删除或重新设计 Pipeline。允许零付费明确功能/安全修复。

先交独立 QA profile 中的 `UNVERIFIED PRODUCT PREVIEW / NOT RC2 / NOT TRUSTED` 和机制必要性收敛审计；候选 Brief 可在不 Confirm、不写 trusted 的情况下预览，不要求每个 Clause 获整课证书才可见。此例外仅用于一次性诊断，不改正式可信状态规则。交付后集中等待 Human + 产品侧审阅下一步；同一 v0.3.0 RC2 / Human Gate5 目标未完成。不发布、不 commit/push、不实施 Outline-first 或成本实验。

本次工程预览与方案记录在 `PRODUCT_PREVIEW_AND_CONVERGENCE_v0.3.0.md`；方案分类不等于删除授权，工程测试不等于产品验收。

## PD-058-01｜四项P0定向整改，零付费，交付后集中停止

2026-10-13，P2E-058记录Product Owner“ok”：接受E2P-047中间检查点，拒绝其当前信息质量；授权实体身份、Issue业务范围、行动Brief与有界必要验证的最小整改。不得MA6081硬编码、人工改答案伪装AI、重启整课核验、增加审核框架或恢复付费。缺可复用语义裁决时如实保留未核验并提交小范围核读提案。本轮仅完成通用显示/结构和隔离验证，语义问题未全部解决；交付后停止，等待集中审阅。完整实际状态见 `PRODUCT_P0_REMEDIATION_v0.3.0.md`。

## PD-059-01｜一个考核一张主卡，有序详情与按需Evidence

2026-10-14，P2E-059记录Human“ok handoff”：批准单一Assessment卡片、摘要优先、结构化行动详情、Rubric/Reference/Evidence按需查证，取消P058上方总览与下方重复大卡。允许在既有CRS页面、同一语义对象内调整主从层级，不重建Review/Pipeline。权威要求已归入PRD及独立IA§5.2。零付费隔离预览后集中停止；语义错误、原Gate5 FAIL和安全边界不因此撤销。


### PD-060-01｜集中视觉、详情与打印收口（2026-10-14）

**批准依据：** P2E-060 记录 Human “ok”。冻结单卡方向，批准等高/内滚动、摘要降噪、可靠结构整理、评分映射与打印修复；不批准目前候选语义或 RC2。工程可确定性修正展示，异文等价、任务身份、时间类型/技术配置裁决必须源绑定证据。已保留旧结果并提交四个最小核读提案；提案不是付费授权。完成新隔离预览和报告即停集中审阅，零新模型请求/扫描/发布。


### PD-061-01｜视觉等级与打印用途（2026-10-17）

P2E-061记录Human“ok”，授权冻结单卡结构下的视觉Primary/Secondary/Tertiary、课程规则阅读路径、Summary与Full details打印区别及集中收口准备。工程使用现有设计tokens/Fraunces/Plus Jakarta Sans，不以颜色徽章堆叠区别优先级。此次授权不含课程事实PASS、付费或发布。

### PD-061-02｜待Human的源语义建议（非已批准决定）

17项保存源与邻页审阅形成一张集中表。新发现：原生考试安排明确9–11，不能把11也称无源推导；演示表含多个15与部分20分钟slot，不能宣布完全兼容。原candidate/raw未改，Human-approved=0；拟议背景降级、谓词/条件/关系和12:00派生值纠正均待正式批准。Lit身份、2h/3h、Similarity边界、GAI截断仍需权威源或发布范围实质决策。不得借此自动付费或称Human Gate5 PASS。


### P063 最终收口（2026-11-02）

PD-063-01：P2E-063已批准17项来源解释落实于隔离候选；原件applied=false保留，授权及实际delta另行留痕。11明确修正/4组织Pending/2冲突缺口不能变成17 KNOWN或Human确认。源缺文不能编补；未取得原本地声明PDF的情况明确为覆盖缺口。未经实际Human Gate5 PASS禁止发布/改Git历史。


## P2E-064｜RC2 Typography收尾（2026-11-02）

保留P063的17项候选修正、四卡布局、内部滚动/焦点返回、Review及双打印。按Owner最终明确指示，大字和标题使用原课程标题的Fraunces衬线体，正文/标签/按钮保留既有无衬线；考核标题20px/550（原23px/600），权重桌面36px/500（原42px/600）、窄屏34px/500；日期17px/500（原19px/600），课程名21px/500同字体。字体复用既有资产，无下载；仅CSS，未改DOM/行为/候选数据。打印权重30px，长段维持Regular。

疑似裁切：1280/380新开及字体加载后scrollTop=0，Presentation dates首行完整；650高窗口主动滚到行中可复现半行，返回保留位置，Home恢复起点。未证明默认裁切或内容缺失，未强制重置滚动。对照、测试、恢复点见 `RC2_TYPOGRAPHY_REFINEMENT_v0.3.0.md`。同一RC2原位更新，非RC3；Human Gate5待验收，不发布。
