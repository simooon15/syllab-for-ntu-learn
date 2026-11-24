> 当前状态（2026-11-02，P063）：**RC2 CANDIDATE / HUMAN GATE5 PENDING / NOT TRUSTED / NO RELEASE**。候选包、17项矩阵和实际验证绑定RC2_MANIFEST.json；以下保留历史状态，不能将旧等待来源授权段落当作当前阻塞。真实校园增量/正式Side Panel/非MA样本与GAI原页列Human待测，工程不代PASS。

# Syllab v0.3.0 RC2 验收状态与资源恢复点

**日期：** 2026-10-13（Asia/Singapore）。  
**授权：** P2E-056 阶段 B，沿用同一目标。  
**结论：** `RC2_NOT_FINAL_ACCEPTANCE_READY / RESOURCE_RECONCILIATION_REQUIRED / NO_RELEASE`。本文件是工程核验记录，不新增 Gate、不替代 Human Gate 5。

## P2E-057 当前方向（覆盖下方旧恢复顺序）

已暂停所有新增付费调用和审核机制扩张；即使余额或 UNKNOWN 核销恢复也不自动派发。先交付明确未核验的零付费产品预览和收敛审计，集中等待产品侧审阅。原 RC2 / Human Gate 5 尚未完成。最新预览实际暴露 Literature entity 误晋升、技术配置噪声、虚假冲突与主层重点不足；不能以工程回归通过抵消这些问题。见 [预览与收敛审计](PRODUCT_PREVIEW_AND_CONVERGENCE_v0.3.0.md)。

## 对照批准范围

| 要求 | 当前可证明的结果 | 尚未证明 / 验收状态 |
| --- | --- | --- |
| AC01/05 信息价值、隐藏真实任务、非行动内容降层 | Typed Proposition/Disposition、原文和独立要求保留；已保存真实模型支持部分教学建议降为 Reference；978/978保存 native units 的实际历史输入曝光可逐单元回查 | 曝光不等于正确理解；最新候选尚未完成必要 Source/Owner/Bridge 语义闭环。没有重要任务召回率或整课语义 PASS |
| AC02/03 结构化行动、父子/OR/条件例外、Brief重点 | 分层 Brief/执行清单与Evidence可达实现；局部审核和组合路径守恒43 Group命题/9组；结构与引用测试通过 | Group模型审计循环失败；组内及跨组新合同未获真实完整 verdict。尚未完成学生查找考试/权重/截止/提交/禁令的正确性与耗时验收 |
| AC04 正确类型和值、模式与权重、当前与历史 | 多命题源支持与typed value/单位合同；字段错配、力道、规则范围等回归；部分真实局部修复已完成 | 不能以exact quote或schema证明整个课程字段语义正确；身份、时间轴、平台设置适用性仍需核验 |
| AC06/07 无副作用浏览、Review操作与一致范围 | 最新ac4383隔离候选：380/1280浏览25范围无需Confirm；Edit/Defer/ExcludeUndo及刷新恢复有真实鼠标操作证据，未浏览即认可不发生；确认/编辑范围可见，独立风险分开 | 新完整RC2入口与Human实际使用尚未交付；不得用脚本成功推翻RC1 Human FAIL。全部规定操作还需最终候选统一回归 |
| AC08 Check/Rebuild/backup/用户值/UNKNOWN | 实际Settings backup恢复保持用户编辑/592Clause/123Evidence/24pending；受控Rebuild保留用户值及独立冲突；UNKNOWN冻结与钱包安全测试通过 | 当前unchanged诊断种子缺生产nativeSnapshot/证书，产生1个被阻止请求，不是正式unchanged零调用PASS；受控Rebuild不是真实模型New/Changed/Conflict/Possibly Removed验收 |
| AC09/10 覆盖限制、通用性与版本效力 | partial/visual/secret suppression局限未清除；异构合成用例及版本/审核边界检查保留 | 无第二门新真实模型课程证据：`NOT VERIFIED`；不虚构跨课通过 |
| Print | 既有screen样本与样式成果保留 | 尚未找到最新RC2的A4长动作跨页/无重叠完整真实print证明：`NOT VERIFIED` |
| 信任边界 | Local-first、BYOK、DeepSeek生产模型、不可变Clause/Evidence、候选/认可分离保持；原RC1及forced Confirm历史不作gold | 无正式数据迁移、无Human PASS、无发布/commit/push/tag |
| 最终产物 | 当前构建CI/隔离诊断加载通过，工程恢复点持续保存 | 唯一RC2产物/manifest、完整逐页图与验收指南、未确认Review和Brief入口尚未最终交付 |

## 证据等级与当前工程结果

最新完整 `npm run ci`：1023 tests，exit0；另4个Node失败范围保护测试通过。最新隔离加载25pending、0paid、0initialtrusted。工程通过不能代替真实模型或Human语义验收。

原保存真实课程：117 Sources / 978 native units / 592不可变Clause。当前候选修复摘要 `ac4383b9137dcd65b356b1e6df11c3b639b2f1bfec79b794f2816295f256b274`。历史真实输入曝光已逐单元证明，949 units保留partial（visual/访问秘密抑制等原因）；不再重复扫描，不把未见视觉宣称已理解。

真实Group请求有43 propositions、235Clause refs、47 native units，循环守卫停止时51271 reasoning chars、0answer chars，无最终usage；不能采用其中间思考作为最终修复。局部+组合生产路由已接入，但真实闭环未完成。零付费模拟全计划从153选为162任务，141 Source与1 Bridge不变；9局部+1组合替代原Owner。**全部模拟判定仅在内存中，未写入正式缓存或可信数据**。拆分增加物理任务和重复输入，实际费用/质量收益未经测量，不能称低成本成功。

完整证据与过程见 [Engineering Report](ENGINEERING_REPORT_v0.3.0.md) 和 [Technical Design](TECHNICAL_DESIGN_v0.3.0.md)。本地机器恢复入口 `evidence/private/gate5-remediation-056/RESUME.json`；不向Drive上传其private原文、raw、reasoning或profile。

## 实际资源边界

2026-10-13T07:08:32.083Z免费查询预付钱包实际余额 **¥0.56**。当前Group未知调用保持最坏费用预留 **¥0.739992**。本轮P056账本41物理记录，40条usage已知费用计入保守累计 **¥8.98681004**，1条当前UNKNOWN；这些保守数字不是全部官方实付，也不是新增累计授权上限。旧¥25/¥7累计限制已被P054预付钱包授权替代；禁止自动充值、换账号/模型及同UNKNOWN范围重复派发。

本地现有10月13日两份账单ZIP最晚窗口到02:00（UTC+8），不覆盖失败调用14:14。需要能覆盖 **2026-10-13 14:00–15:00（UTC+8）** 的官方usage/计费记录，核对同模型/同账户与该时间段全部已知调用后，才能决定是否核销预留；不能靠余额减少、时间过去或transport已停止释放。核销后仍需刷新余额及逐次最坏费用检查，不能承诺¥0.56足够完成所有剩余验证。

当前零付费实现、证据守恒、回归和恢复状态已推进；真正无法完成的是所需新真实模型语义与增量闭环。不得为省钱削掉必要检查、伪造认证或带已知风险提交Human验收。费用或usage缺口按P056资源硬阻塞处理，保留同一目标。

## 恢复顺序

1. 保存并核对覆盖未知调用时段的正式账单；保留原失败raw与冻结范围，即便费用结算也不自动允许重派原整组任务。
2. 按实时钱包安全条件验证真正较小的局部范围与不同职责的组合核验，复用准确完成cache；遇partial/合同错/循环明确停止，不抬输出上限或把Scope PASS冒充整课PASS。
3. 必要Source/其他Owner/Bridge语义闭环后，在隔离生产路径完成真实unchanged、Changed/New/Conflict/Possibly Removed、用户值、Rebuild与backup回归；补print与学生查找任务验收。
4. 生成唯一RC2与清楚的审核/Brief入口、截图/指南/manifest，定点Drive同步与SHA回读；停Human Gate5。Human决定PASS/FAIL，工程不发布。

Course Outline优先与谷时冷启动低于¥2仅研究，不在RC2实施、不成为新Gate。已有成本研究基于旧已保存用量，不能冒充最终稳定RC2的冷启动实测；最终报告研究部分仍待稳定版本证据。信息降噪不能永久删除独立要求、例外、争议或Evidence。

### P058 当前增量（2026-10-13）

**PARTIAL PRODUCT REMEDIATION / WAITING CONCENTRATED REVIEW / NOT RC2。** 新隔离未核验预览已交付；仅通用结构/排序/显示及安全交互回归改善，P0-A身份/P0-B旧冲突语义仍未收口，P0-C执行正文重复未解决。详见 `PRODUCT_P0_REMEDIATION_v0.3.0.md`。CI/浏览器不是语义或Human PASS；RC1 Gate5 FAIL仍有效。新增付费、扫描、证书扩张及发布仍暂停。

### P059当前增量（2026-10-14）

**IA_IMPLEMENTED_SEMANTIC_REMEDIATION_PARTIAL / WAITING_CONCENTRATED_REVIEW / NOT RC2。** 唯一卡片、摘要优先和结构化显示已实施并交新零付费隔离预览；旧实体/冲突/语义去重、Print和真实增量仍未闭合。详情见 `IA_DECISION_AND_PREVIEW_RESULT_v0.3.0.md`。原Gate5 FAIL不变，禁止新增付费与发布，等待Human + 产品侧集中审阅。


### P060 当前增量（2026-10-14）

**DISPLAY_AND_PRINT_REMEDIATED / SEMANTIC_PARTIAL / WAITING_CONCENTRATED_REVIEW / NOT_RC2 / NOT_TRUSTED。** A4 真实打印已补，显示/证据守恒检查不能建立语义、真实增量或 Human Gate5 PASS。四个限定源问题继续 NOT VERIFIED，原 Gate5 FAIL 不变；禁止新增付费与发布。详见集中整改报告。


### P061 当前状态（2026-10-17）

**VISUAL_AND_PRINT_IMPLEMENTED / SOURCE_DECISIONS_PENDING / RC2_NOT_READY / HUMAN_GATE5_NOT_SUBMITTED / NO_RELEASE。** 四组17项已集中核读保存原文及邻页，但Human来源批准为0、原候选未更改。考试9–11明确有源，12缺源；演示15/20slot仍有上下文差异。正式RC2打包和真实全链/非本课程验收以关键语义裁决为前提，本轮仅准备验收指南和缺口清单。详见 [视觉与RC2准备报告](VISUAL_HIERARCHY_AND_RC2_PREPARATION_v0.3.0.md)。禁止新增付费/原profile操作/发布，等待一次集中实质性决策。


### P063 最终收口（2026-11-02）

P063：已获17项产品来源解释授权，正在按最终构建校验RC2 candidate；最终状态和包绑定以RC2_MANIFEST.json为准。Human Gate5尚未PASS，旧RC1 FAIL不因工程检查解除。校园在线增量/正式容器/非样本真实课程未实测时必须在Human清单标NOT VERIFIED；不编造覆盖。


## P2E-064｜RC2 Typography收尾（2026-11-02）

保留P063的17项候选修正、四卡布局、内部滚动/焦点返回、Review及双打印。按Owner最终明确指示，大字和标题使用原课程标题的Fraunces衬线体，正文/标签/按钮保留既有无衬线；考核标题20px/550（原23px/600），权重桌面36px/500（原42px/600）、窄屏34px/500；日期17px/500（原19px/600），课程名21px/500同字体。字体复用既有资产，无下载；仅CSS，未改DOM/行为/候选数据。打印权重30px，长段维持Regular。

疑似裁切：1280/380新开及字体加载后scrollTop=0，Presentation dates首行完整；650高窗口主动滚到行中可复现半行，返回保留位置，Home恢复起点。未证明默认裁切或内容缺失，未强制重置滚动。对照、测试、恢复点见 `RC2_TYPOGRAPHY_REFINEMENT_v0.3.0.md`。同一RC2原位更新，非RC3；Human Gate5待验收，不发布。
