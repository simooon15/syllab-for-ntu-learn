# 整体工程交接｜E2P-v0.3.0-2026-10-11-044

**接收方：** Product Owner / 产品侧评审。  
**入站：** P2E-v0.3.0-2026-10-10-054；延续052→053→054同一项目成果，包含Human后续通用性原则、三份官方账单及两项只分析的产品研究。  
**当前状态：** `LOCAL_RC1_DELIVERED / ENGINEERING_CHECKS_COMPLETE_WITH_LIMITS / HUMAN_GATE5_PENDING / KNOWN_PRODUCT_ISSUES_RECORDED`。  
**最高优先级：** 对现有RC1做Gate5产品判断。本轮不新增Gate、不实施后续研究、不发布。

## 1. 接手时先读什么、当前能宣称什么

先读本交接，再读 [Gate5完整报告](../../artifacts/v0.3.0/goal-driven-054/RESULT.md) 和 [人工操作指南](../../artifacts/v0.3.0/goal-driven-054/HUMAN_ACCEPTANCE_GUIDE.md)。最终报告已包含成本低于¥2、Course Brief信息降噪的完整研究、方案风险与未来指标。不要从较早的E2P-040/041或旧215/243候选重新启动。

Gate1–4的自动工程检查、真实模型处理及原生闭环证据已交付；**不代表整课语义质量、跨课程泛化或Human产品验收通过**。后续实际Brief检查发现严重阅读噪声和一个具体模式字段疑点，均在RC中原样保留并交给Gate5判断。不能因为937项测试、JSON闭合或DOM数量通过就自签产品PASS，也不能把尚未实施的后续研究包装成当前修复。

Canonical repo：`/Users/simonluo/罗鑫宇/Vibe Coding/Syllab for NTU Learn`。HEAD仍为 `26426a3793250aea351c443e3327ccdb1b95b697`；大量此前未提交成果保留，无commit/push/merge/tag/release。工程代码权威仍是canonical，Drive是共享镜像，Product inbox P054原字节不改。

## 2. 唯一RC1与人工入口

- [RC manifest](../../artifacts/v0.3.0/goal-driven-054/RELEASE_CANDIDATE.json) 对应唯一纯生产构建 `.tmp/syllab-v0.3.0-rc1`，30个完整资产，包含字体、图标、Office runtime/data/license；14是检查的可读程序文件数，不是整个包的资产数。
- [Syllab-v0.3.0-RC1.zip](../../artifacts/v0.3.0/goal-driven-054/Syllab-v0.3.0-RC1.zip)：78,917,184字节；SHA-256 `09d29e9de151abad7d85173f14bac0341cd3ab157ffb5dc4d3c1fbcce49b36dd`。不含QA辅助文件、课程材料、profile、Key或原始模型推理。
- 现成隔离profile `.tmp/syllab-v0.3.0-rc1-profile` 已保存真实候选，交付时10张未确认卡、trusted为0；不是原正式profile。入口已成功打开过，窗口是否仍开着以本机为准。

在canonical根目录打开：

```sh
node scripts/v030-final-054-open-review.mjs
```

脚本先校验RC文件SHA，再打开实际生产UI。provider网络被拦截，profile无真实Key；这个保存证据的入口不会花钱包或重新Scan。**不要为“测试正常使用”在此接入真实Key或自动Confirm。** Human可在隔离profile逐项操作Confirm/Edit/Exclude/Split、Same/Different/Uncertain并检查采纳后的Brief，工程不得将这些手动结果预先判为PASS。

原正式 `syllab-acceptance-MFP6nM` / `wf_ffd850a9f186233026338f6f` 未打开、未重扫、未采纳或迁移；原用户决定和trusted保持不变。

## 3. 最终实现与验收证据

| 领域               | 实际结果                                                                                                                                                         | 证明限制                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 发现/选择性阅读    | 保存117 Sources / 978 Units发现初查；AI选择24 Sources / 160整单位深读，150个PDF页定位；101 Sources / 818其余单位完整native任务/规则信号检查                      | 16个Source全读，与部分Source单位深读有交叠；初查/native信号检查不等于深度理解。未无差别全课深读、未新扫NTU |
| 语义与全局归并     | 592不可变Reader Clause；真实Link及Source-backed projection生成227 Facts、8 Assessment/Component、2 Important Rule；203 KNOWN /22 UNCERTAIN /2 EXPLICITLY_UNKNOWN | source/成员/状态守恒与模型核读均有记录，仍需Human逐判据核读；不能宣称无语义错误                            |
| 原生Initial Review | 实际Engine→IndexedDB/staging→UI，10卡；85具体Requirement正文、11限定条件DOM检查；Important Rules正文和采纳前阅读/视觉范围提示可见                                | 自动Confirm只发生在可丢弃QA实验；另留未确认Human入口。DOM存在不代表内容有用或语义正确                      |
| 无变化增量         | 2次完整unchanged Check，0模型调用；抓取刷新与内容依赖分开                                                                                                        | 使用已保存真实课程快照，不是新线上扫描                                                                     |
| 变化增量           | 单Source受控变化，真实模型输出接实际Engine/IDB/UI；10 Review /16 Change；New/Changed/Conflict/Possibly Removed、条件/可选/未知保留；保护41%用户编辑              | controlled，不是观察到的NTU线上更新；当前增量候选235 Facts独立保存，不替换初始227候选                      |
| Rebuild/恢复       | Keep/Use缓存Rebuild、13 durable tables备份恢复、22 native stores、损坏digest拒绝；dispatching UNKNOWN新Session retry后0 provider请求                             | 新付费浏览器SSE断流、真实进程挂起未测；不得扩大成功声明                                                    |
| 检查               | 最后完整 `npm run ci` PASS：2 contracts +915 extension +20 backend =937；格式/build/strict typecheck/lint/manifest/secret/docs/README/QA分离通过                 | 后续只分析/整体交接文档补充未改bundle；文档检查单独运行，不伪称重做付费E2E                                 |

核心实现解决的系统性问题：重复摘要改写、语义独立要求被主题合并、context/SUPPORT依赖遗漏、非原子的采纳/Rebuild残留。采用不可变Reader、显式assertion/原文证据及版本化核读证明、Source依赖增量、既有人审reducer与atomic replacement。本地只做确定性校验/编译，不根据课程名称/数字猜重要性、适用性或正确答案。

单成员scalar、多成员、条件例外和当前context纳入核读；不等价项由AI定点修复。重复ID、非法role/parent、幽灵Compare引用作为响应错误拒绝，再对精确失败目标有界修复；无进展停止、失败原文及费用保存。不能为降低费用删掉这些真实语义保护。

通用性检查：[GENERALIZATION.json](../../artifacts/v0.3.0/goal-driven-054/GENERALIZATION.json)。生产语义策略定点检查无当前课程代码/答案硬编码；五种scalar表达、层级正反例与证据/缓存机制64项定点回归、59项渲染检查通过。模拟port回归不是跨课程模型质量证明：独立课程真实模型证据0，`NOT_VERIFIED`。

## 4. Gate5必须看见的剩余问题

1. **Brief使用价值不足。** 本轮在复制的既有QA profile检查真实227候选生成的主视图及详情，未新Confirm，trusted和decisions前后深相等。主文47,111字符、约16,345px高，153个Assessment事实与74个Rule事实混合展示，43个疑问提示节点。较低规划价值的指导先出现，核心考核总览后出现；平台配置、模型context、长规则正文同等展示，详情重复全量body。不是仅去重或CSS问题，不能称已解决。
2. **具体模式字段疑点。** 一个mode scalar显示评分比例，原始Clause同时明示闭卷；主文及详情未正确表达该模式。精确Fact/Clause、来源和截图留私有研究证据。本轮按“只分析”不修改RC。Human应结合原文判断是否足以拒绝当前产品；隐藏该字段不能当作修复。
3. **覆盖Partial。** 114 Sources /948 Units仍带保存的native/visual缺口，不是说这些单位都完全未读；已读与图像未理解范围分别记录。未补齐全部视觉，不给整课召回率或“完整理解”保证。
4. **gold尚未Human评分。** 25个冻结source-first provisional样本：8正例目标Clause映射，17负例单位无owned Fact，只是覆盖检查。原43 provisional /11 disputed expected/status/原文不改；54个native anchors保留。worksheet映射不等于逐判据PASS，gold未注入Prompt。
5. **成本/延迟与真实运行边界。** 成本是已保存实际usage的成功路径重建；不是当前所有默认参数下新付费cold浏览器E2E。串行provider时间约39.5分钟，不含发现/解析/Human，不是整体墙钟实测。跨课程、实际线上变化、完整paid SSE/process suspension仍未验证。

本机原文worksheet：`evidence/private/goal-driven-052/continuation-054/gold-coverage-candidate-projected.json` 与 `original43-disputed11-current-worksheet.json`。私有材料不得传共享Drive。若Human拒绝，记录具体Fact/Clause/界面动作及预期，下一步从现有恢复点复现已定位问题；不要重新开始项目或重做所有Reader。

## 5. 费用与官方账单

**正常使用重建**与**开发实扣**必须分开：

| 路径                                       |          谷时CNY |          峰时CNY | 口径                                                   |
| ------------------------------------------ | ---------------: | ---------------: | ------------------------------------------------------ |
| 单门cold到Initial Review，40次             |       4.49631612 |       8.99263224 | 实际保存token重建；无provider cache同token谷时4.697271 |
| 受控单来源更新，9次                        |       1.00677160 |       2.01354320 | 实际保存token重建；不代表任意更新成本                  |
| unchanged Check / unchanged cached Rebuild |                0 |                0 | 模型费用；不含本地时间                                 |
| 多源复杂变更/无缓存Rebuild                 | 未验证固定最坏值 | 未验证固定最坏值 | 可接近或超过cold，含修复与补读                         |

峰时为同token价格推算、cache命中非保证。部分历史Reader/parent修复显式32768输出上限，当前生产默认384000，未来未缓存输出可能改变；不能用历史有限输出测量承诺正常费用上界。最大384000输出本身可达谷时1.536/峰时3.072元，再加input。无同语义质量已验收旧版基线，未报告节省比例。

P054 97次known usage，客户端估算16.71121776元；052/053/054合计158物理请求，156known估算34.55864344元，2历史UNKNOWN预留合计5.572864元原样保留、禁止重派。无P054新增UNKNOWN、无在途付费请求。不能将旧预留机械再扣当前钱包。

用户官方导出：七天实扣79.97404878元 /691次。10月11日截至导出65次 /12.08078928元与本地日汇总完全一致。两份按天导出有小时粒度：按UTC+8 finishedAt分桶，19个计费小时中15个请求数/cache token/output/金额完全一致，包含今天全部7小时；startedAt跨小时请求会错桶，这是此批经验匹配，不是未核实的官方时间规则。

10月10日较早24次不在当前052–054 ledger范围；05/09小时各一笔剩余官方计费，合计1.36973004元，与历史UNKNOWN窗口相容，**无逐请求ID/结束时间，不能强行逐笔归属或把UNKNOWN改成known usage**。每个官方价格桶token×price与cost精确核对。原始三份ZIP/CSV私有保存，共享结果省略账号和遮罩Key。

P054撤销旧累计25元/新7元派发上限只对未来生效，保留原历史账；后续必要付费仍只能用经派发前核验的现有预付余额、保守预留，无充值/其他账号/付费模型。最近已核验只读钱包观察9.34元（2026-10-11 12:23:37 UTC+8），是快照而不是当前保证。本次研究/整体交接0付费调用，不需要再派发模型。

## 6. 两项后续研究：只规划，不实施

完整分析、方案对照、估算、风险与拟定指标在 [最终报告补充](../../artifacts/v0.3.0/goal-driven-054/RESULT.md)，结构化依据见 [POST_ACCEPTANCE_RESEARCH_EVIDENCE.json](../../artifacts/v0.3.0/goal-driven-054/POST_ACCEPTANCE_RESEARCH_EVIDENCE.json)。

- **cold谷时小于2元：未证实。** 现重建费用需下降至少55.5%；输出约57%费用，reasoning约73%输出，但reasoning归零仍2.61786012元。先优化无损消息表示、正文/引用重用和结构修复消耗，再评估同一Flash逐任务thinking。900k总输入+250k总输出的无provider cache假设才约1.90元，非实测、非硬帽、非任意课程保证；不得以截断、少读或移除重要要求/证据换便宜。
- **Brief应是精炼信息产品。** 推荐完整语义存储之上的受事实/人审约束阅读投影：课程总览→考核主卡→完整执行清单→Evidence/Source。学生先看到权重、日期、提交物/责任、关键规则/例外和重大未知；教学解释/rubric细节/完整日程/来源rationale按需看。所有独立要求及Evidence保留，精炼块逐Fact映射，编辑/变更后依赖失效，不自由重写或自动采纳。
- **优先级与衡量：** 后续P0 Brief内容价值及关键字段语义，P1无损成本，P2thinking/语义往返；配对测学生查找正确率/时间、主视图低价值文字、重要风险可见性、完整语义/Evidence可达、增量与人工编辑保真。指标是未来设计输入，不是本轮已测成绩/新增Gate；当前单课程不证明泛化。

## 7. 证据索引、恢复与同步

共享最终证据目录：`artifacts/v0.3.0/goal-driven-054/`。

| 文件                                                                                               | 用途                                                               |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `RESULT.md` / `HUMAN_ACCEPTANCE_GUIDE.md`                                                          | 完整交付、风险、后续研究与实际操作                                 |
| `RELEASE_CANDIDATE.json` / `Syllab-v0.3.0-RC1.zip`                                                 | 唯一构建、30资产SHA及ZIP                                           |
| `CI.json` / `SEMANTIC_EVIDENCE.json`                                                               | 工程检查、语义候选计数/不可变及Partial边界                         |
| `REAL_PROJECTED_ENGINE_REVIEW.json` / `INCREMENTAL_RECOVERY.json`                                  | 最终原生Initial及controlled增量/恢复                               |
| `GOLD_COVERAGE_PROVISIONAL.json` / `ORIGINAL_GOLD_COVERAGE_WORKSHEET.json` / `GENERALIZATION.json` | 覆盖映射、disputed和泛化限制                                       |
| `PRODUCT_USAGE_COST.json` / `REQUEST_COST_PROGRESS.json`                                           | 成品路径重建与请求级开发账本                                       |
| `OFFICIAL_BILL_RECONCILIATION.json/.md` / `OFFICIAL_HOURLY_BILL_RECONCILIATION.json/.md`           | 官方日/小时汇总对账与未归属差额                                    |
| `POST_ACCEPTANCE_RESEARCH_EVIDENCE.json`                                                           | 只分析研究的用量和实际UI观察                                       |
| `CHANGED_FILES.json` / `SYNC_RECEIPT.json`                                                         | 累计明确路径、SHA、Drive Desktop回读；本次仅交接文档和同步清单变化 |

`REAL_ENGINE_REVIEW.json` / `REAL_MODEL_PROGRESS.json` 已标注早期结果被替代，不能代替最终projected证据。

本机恢复入口：`evidence/private/goal-driven-052/continuation-054/RESUME.json`；另存 `FINAL_COMPLETION_AUDIT.json`、`GATE5_ENTRY.json`、`selective-real-1/candidate-projected.json`、`selective-real-1/candidate-projected-incremental-current-auto.json`、不可变请求/响应/费用与旧候选失败归档。研究原文/截图及只读前后证明在 `post-acceptance-research/`。保留所有实验失败，不删证据，不重派UNKNOWN。

Google Drive Desktop镜像：`/Users/simonluo/Library/CloudStorage/GoogleDrive-simooonluo@gmail.com/我的云端硬盘/Syllab for NTU Learn`。定点非破坏性同步与SHA回读，**不是服务器确认**；不传private、profile、原文、截图、reasoning、Key，未递归重扫/删除。后续遵循仓库协作模型、Changed Files与冲突保护。

**接收方下一步：** 做既有Gate5判断，明确接受/拒绝及残余条件；若拒绝则提供具体原文/Fact/动作问题供授权修复。不要把后续研究默认变成新开发任务；未经Human授权不得发布、提交、扩大权限或迁移正式trusted。

## 8. Product Owner Direct Intervention

Human在持续工程中补充通用性原则，要求不同表达正反例，不能单课程宣称泛化；后提供三份官方账单，要求按请求时间对账；Gate5后要求两项后续研究仅分析、不实施、不新增Gate、不延迟验收；现要求整体Handoff。以上已落实到证据/报告和当前完整交接。本次整体整理不改变产品行为、模型/预算授权、现有RC或工程范围，不新增付费或自动人审决定。
