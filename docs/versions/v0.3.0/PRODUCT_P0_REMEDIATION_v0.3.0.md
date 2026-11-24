# v0.3.0 P2E-058 定向整改与剩余问题

2026-10-13（Asia/Singapore）。同一 Phase B；交付状态 **PARTIAL / UNVERIFIED PRODUCT PREVIEW / NOT RC2 / NOT TRUSTED / WAITING CONCENTRATED REVIEW**。

本轮完成通用结构、阅读次序和隔离预览的整改；**没有完成 P0-A 的 Literature Review 身份纠正和 P0-B 的旧候选冲突纠正，P0-C 也只部分完成**。新预览保留并真实暴露这些错误。没有新增付费请求、扫描、审核架构或人工课程答案表。不能把四项目标“已处理”称为四项产品问题“已解决”。

## 本机操作

在 canonical 仓库执行：

```sh
node scripts/v030-product-058-open-preview.mjs
```

独立 Chromium 打开候选 Brief；顶部链接进入实际 Initial Review。无需 Confirm 即可查看。先看 Assessment overview 中的考核/权重与时间，再点击考核查看详情，展开提交清单、Rubric、Reference，点击值查看 Evidence。Review 可目录跳转、编辑、延期、排除/Undo；Confirm 仅作用于此隔离副本的明确范围。关闭浏览器结束。

入口及新 profile 为 `evidence/private/product-058/PREVIEW_ENTRY.json`，不是原正式/RC1/十次被迫 Confirm profile。启动器和 QA worker 均阻止网络。未读取 Key、未将候选写成正式 trusted。截图及真实行为证明在同一机器私有目录；不上传 raw、截图原文、profile、账单。先前预览和源候选完整保留。

## 四项 P0：实际完成与缺口

| 目标 | 首次错误层级与本轮处理 | 当前结论 |
| --- | --- | --- |
| P0-A 实体与总览 | Reader/Link 已将教学材料组织为 Literature Review 实体；保存 Product 明确给出 CURRENT，并引用标题与主题/方法指导作依据。通用显示整改将产品 Series 的 Components 平级展示，Scheme 保留为来源关系。总览先列已有 weight 的对象，无 weight 的新增任务仍保留，不按名称删除 | 四项 scheme 考核及 25/25/10/40 权重可直接找到；Literature Review 仍为第五个旧候选对象，其任务身份 **NOT VERIFIED，未纠正**。没有证据支持本地直接判不存在，也没有依据把旧 CURRENT 当已证实任务 |
| P0-B 信息价值与冲突 | Reader 的 timing requirement 已为 UNCERTAIN；Product 又把 15+约5 与20分钟 slot 当竞争值。score/configuration 的 Reader 观察来自平台，Product 将其提升为风险；Final Exam datetime 的11:00/12:00分支由 Product 派生 | 虚假 timing/configuration/计分尺度 Issue **仍存在，未纠正**；2h/3h根因保留，但派生结束时间问题也仍重复。没有按字段名静默去掉旧 Issue，不把 UI 分组称为语义降噪 |
| P0-C 学生行动 Brief | 首层新增引用现有 Fact 的总览；weight/date优先；提交/责任按需看，原字段完整保留。含子要求的 core 父节点转入默认展开的执行清单，避免递归长树压住权重。risk按已有语义group组织；Rubric/Reference按需看。Review范围未改 | 层级与可扫描性改善；父节点仍含重复全文，平台噪声与内部命题标题仍污染行动内容，**未形成全部正确的短执行清单**。Course-wide规则按既有group可找到，但未去掉语义重复，不称全部完成 |
| P0-D 有界验证 | 只复用真实保存 Product/修复候选，做本地编译、真实浏览器及必要回归。未启动153/162任务或9+1恢复，未新增证书/repair框架。候选内容SHA保持，源Clause/Evidence不改写 | 本轮零付费边界落实；显示/交互证据与语义缺口分别报告。未获整课核验、真实增量、最终Print或Human验收 |

四项真实考核是在保存 scheme 关系下平级显示，**不是本地凭课程名、四项目白名单或权重阈值识别**。普通无 Outline、无日期/权重任务不会因本轮排序被排除。历史非 Product series/instance 行为保留。

## RC1 → E2P-047 → 本轮

| 项目 | RC1 / 047 | 最新预览 |
| --- | --- | --- |
| 首层考核 | RC1/047 的身份质量不通过；047把四项考核包在 Other/Scheme，Literature Review先出现 | 总览先出现四项带weight的scheme子对象，分别可进入详情；旧Literature Review仍存在，无语义通过声明 |
| 权重与主要字段 | Group长树和风险先于权重 | 总览及详细卡weight/date优先；不改25/25/10/40或原日期值 |
| Group行动 | 结构存在但长父清单压住字段 | 执行树移到字段后且默认展开；条件/例外/OR原值保留。父全文重复仍待语义重组 |
| MCQ | 047局部修复为Closed book/25%/30 minutes/25 questions | 保存候选不变；仅重新展示，不宣称新增模型证据 |
| 虚假Issue/真正冲突 | 平台flags、100/25、15+5/20、重复结束时间仍错误 | 仍明确未闭合；分组不是纠正。2h/3h及其他重要风险仍可见 |
| Review | RC1为翻页被迫Confirm；047已有自由浏览 | 新隔离profile复验浏览、Edit、Review later、Exclude/Undo、范围认可、刷新。原十次Confirm不作gold |

桌面总览不再从 Literature Review 开始；窄屏仍需正常纵向滚动，不能保证全部信息一屏显示。学生找答案耗时、正确率未测，不能据截图或字数缩减声称体验已验收。

## 证据等级与为什么不能免费把旧结果当已纠正

1. 主预览是保存真实模型 Product request `7435eb…` 加保存修复候选 `ac4383…`，133个Fact重新编译展示，592个源Clause保留。候选product内容未改，没有新模型输出。
2. 本地规则重编译只变显示组织，不判断任意课程中教案是否真正布置任务、不把不同时间/计分/工具范围强行等同。所有133个Fact在展开后仍可达；preview刷新前后snapshot/decisions/trusted逐对象相同。
3. 合成回归验证Scheme关系的平级呈现与无weight新任务的保留，不能证明真实课程身份正确。既有受控Split/Same/Different证据仍为交互证据，本轮未重跑这些未受影响的mutation路径。
4. **生产 PRODUCT_SYSTEM / PRODUCT_AUDIT 已含这些语义要求**：不得由教学标题晋升任务、platform flags不等于政策冲突、slot可含Q&A、不得由争议duration派生结束时间。保存candidate仍违反这些要求。追加同义Prompt或放行schema不会改变这个事实；旧cache也不能因为现在看过源码就获得新认证。
5. 要在生产链路纠正旧语义，需要一份来源绑定且限定范围的语义裁决；当前没有可复用的已完成裁决。手工改写旧candidate再假称AI输出、以关键词/平台字段白名单代替语义，均违反P058。本轮因此交付真实缺口，不伪装完成。

源→Reader→Product的定向trace在机器私有 `semantic-trace.json`；不上传完整课程原文。CI证明工程回归，不能证明这份candidate的内容正确。

## 最小必要核读提案（仅提案，未调用）

按学生风险组织三个有限范围，**不审核整课或整个Group owner**：

| 范围 | 原文及要裁决的事实 | 预期成果 / 停止条件 |
| --- | --- | --- |
| 实体适用性 | Literature Review的教学标题、theme choice及原上下页；当前assessment scheme只作比较，不能作为排除其他新任务的绝对依据 | 明确CURRENT/一个有影响的ISSUE/REFERENCE，以及准确引用的assignment依据。若来源无法证明分配状态，就停止于一个具体待核实对象，不能重复repair |
| Group业务范围 | presentation与Q&A原要求及整个schedule表；平台配置与authored提交说明；rubric25 marks与platform100尺度；父内容树原要求 | 区分兼容的时间类型、不同计分尺度、工具配置与真正行动矛盾；重组短父目录且保留独立义务/条件/例外/OR。若有15分钟slot与20分钟活动的真实安排疑问，须明确而不能把所有slot笼统判兼容。返回受影响proposition/entity替换及引用，不能重生成整课 |
| Final Exam根因 | explicit exam start/end表格与2h/3h原文、适用版本，不靠较新/Outline自动取舍 | 一项有源依据的duration根因及实际影响；只有来源明确给出才能保留结束时间，不能自己推导11/12点。来源不能闭合则保留真实不确定并停止 |

费用目前**未估价**：没有准备完整有界请求、精确native载荷和最新钱包状态，不能凭印象给出成本。若集中审阅后选择某范围，先免费构建唯一请求、计算实际输入/供应商输出预算和UNKNOWN预留，再提交具体成本与一次性调用授权；任何结果缺最终usage/answer即停止，不自动重派。此提案不授权三个调用，不建立新审计层。Human也可直接依据限定原文给出裁决，届时仍须明确其来源为Human判断。

## 验证、保护与停止点

最终自动结果、build/candidate SHA及浏览器证明以 `artifacts/v0.3.0/product-058/PREVIEW_SUMMARY.json` 为准。380/1280实际预览、Evidence/详情、刷新和Review点击均在新隔离资料中；原正式/RC1资料未操作，Key/账单未读取，UNKNOWN不释放。未在正式profile加载新版，因此没有重扫或刷新原NTU会话；正式加载/刷新留待授权的后续真实验收。

Print未修复、未验证；真实增量/全课新语义/最终RC2/Human Gate5未完成。旧机制冻结，未删代码；未commit/push/tag/release。本次交付后停下，等待Human + 产品侧集中决定：是否接受当前局部结构改进，如何处理剩余语义缺口，以及是否授权具体核读范围。
