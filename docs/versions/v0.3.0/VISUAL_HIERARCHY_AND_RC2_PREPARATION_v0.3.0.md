# P061 视觉层级、来源决策与 RC2 准备｜v0.3.0

2026-10-17；P2E-061 → E2P-051。同一 Phase B。**视觉/双打印已实施；源语义需集中Human决策；RC2_NOT_READY / HUMAN_GATE5_NOT_SUBMITTED / NO_RELEASE。** 无新增付费、派发、扫描、commit/push/merge/tag/release，未操作原Human/RC1 profile或真实trusted。

## 本轮入口与实际改变

`node scripts/v030-product-061-open-preview.mjs` 打开新隔离 Chromium。仍为Unverified候选投影，五张旧候选卡并非五项已证实考核；Literature Review旧CURRENT身份尚待裁决，不作课程名白名单删除。原P060预览保留，可执行旧060入口恢复查看；源代码P060四个修改文件在本机 `evidence/private/product-061/before-P061/` 有已核SHA恢复副本，禁止自动回滚其它dirty。

| 层级 | 之前 | 本轮行为 |
| --- | --- | --- |
| Primary | 名称、Weight、日期与长字段视觉平级 | 名称之后显著课程权重，并排已确定事件日期；必须有原字段/unit/state，不算新值 |
| Secondary | 内部owner前缀、长逐行字段 | 现有group scope前缀去除，模式/时长紧凑分块，交付责任宽行；不把session窗口当答题时长 |
| 待核实 | 整串派生/竞争时间占据主卡 | 固定具体字段核实入口；原完整值/竞争值/Evidence仍在同一ID的详情，不宣称已修语义 |
| 详情/规则 | 各行动/背景视觉近似 | 节标题与动作清单区别，必需/禁止/已有risk较重，条件/例外保留；风险/未决→提交/必需→背景的稳定组序 |
| 打印 | 所谓Summary混入11页规则/Rubric/Reference | Summary打印高价值卡片、提交与处罚risk及具体未决线索，说明Full回看范围；Full打印所有考核详情、规则、参考及来源路径，同Fact ID引用只打印一次 |

颜色仍用既有page/surface/ink/green/clay；Fraunces用于名称与章节，Plus Jakarta Sans用于规划数值/操作，靠字重/大小/位置/间距排名，不降低对比、不加图标装饰。截图只作界面检查，不伪报几秒查找耗时或Human可用性PASS。

## 实测与证据边界

最终CI、QA/production build SHA、候选SHA、PDF页数和检查结果在 `artifacts/v0.3.0/product-061/PREVIEW_SUMMARY.json`。本轮1280/380真实浏览器：同行外框/上下边缘、固定头尾、内滚/键盘/无横向溢出、展开/返回焦点/刷新、133 Facts可达；点击两个真实打印按钮选择模式正确且临时文档销毁/旧disclosures恢复，storage/trusted不变。双语长名称是受控view-only排版探针，恢复后检查store未变，**不是第二门真实课程证据**。

A4使用真实print media；Full临时文档包含全部133 Fact ID，并对打印文本中的每个完整Fact display作PDF text-flow匹配，另测空白页/词框交叠/页外文字，逐页PNG目视。该工程覆盖不判断源事实正确。Full带必要Source标题/locator，原始Evidence仍在应用按需查，未把整份原始课程PDF公开或加入Release。Summary不是全文，未决仅给清楚线索，不能代替Full中条件、例外和竞争来源。

Private路径：`evidence/private/product-061/brief-full-1280.png`、`brief-full-380.png`、`detail-expanded-1280.png`、`detail-expanded-380.png`、`brief-summary.pdf`、`brief-full-details.pdf`；原Human审阅快照 `brief-summary_20261017.pdf` 仅私有保存，SHA记在INBOUND_SYNC.json。图片/PDF/profile/raw不上传Drive。

## 四组17项来源审阅：建议，不是已批准课程结果

本机 [集中决策表与原文/邻页](../../../evidence/private/product-061/HUMAN_DECISION_TABLE.md) 逐项列旧命题、实际parsed原文、相邻页、Clause ID、source digest与parsedSHA、学生影响、最小改动和Human问题；机器数据在同目录SEMANTIC_SOURCE_PACKET.json。旧model support quote与native text分开，不把旧Clause摘要冒充原文。33个绑定源单元及邻页，17项Human-approved=0 / applied=false，candidate/raw/Clause未重写。

| 命题 | 来源与实际结论 / 最小建议 |
| --- | --- |
| p_litrev_identity | Attachment教学页59及72–73，Assignment标题/主题要求不能单独证明当前独立应交身份；拟具体pending，保全原要求，不硬删 |
| p_litrev_theme_choice | 同一教学页72主题选择，适用性依赖身份；拟关联身份的参考要求 |
| p_part1_duration | Guidelines全文及schedule全文、教学页8/80；15展示+约5Q&A且多数slot只有15/少数20，不能宣称全部兼容；拟分时长/场次对象，保留一个实际安排疑问 |
| p_part1_turnitin_score_scale_issue | 原生default_maxpoints100与Rubric25不同尺度；拟技术背景，不算新换算公式或自动学生成绩冲突 |
| p_part1_group_content_config_issue | 原生两个false配置不证明组代表不能提交；拟背景/影响未证实，不冒称真实权限测试 |
| p_part1_turnitin_late_accept_uncertainty | 原生late flag0不够翻译接受/拒绝迟交；拟背景，保留教师迟交处罚要求 |
| p_part1_turnitin_due_date_conflict | default_duedate2025与gradingColumn.dueDate2026是不同字段用途，拟区分默认参数/当前列/教师截止，不把默认参数当第二个学生deadline；平台实际运行仍未测 |
| p_part1_group_count | Guidelines明确16 groups，拟底层谓词group_size→group_count，16不变，不说每组人数 |
| p_part1_project_approval | 教学页81是should批准，拟只出现一次should动作，不能升级must |
| p_part1_project_selection | 同页选题与批准组合，拟拆独立动作和依赖，不靠异文相似度误并选题义务 |
| p_part1_rubric_content | 教学页87完整原表支持5/5/5/10/25；本轮项分映射已保留，无须改值，待Human显示审阅 |
| p_part1_rubric_peer | 同表支持Peer10，不得与其它同为5的标准合并 |
| p_part4_duration_issue | 保存原生安排/汇总2小时与详细段落3小时真实冲突；未获权威更正，不自行选择 |
| p_part4_exam_datetime | **修正P060旧诊断：原生安排明确9–11，11有源；12未见源。** 拟撤无源12派生值独立冲突，保留源区间并关联时长根疑问，不能因此判3h无效 |
| p_similarity_bands | 原文below24、25–39、above40且各有条件，24/40边界不能补造；拟保持区间/条件，边界不足保留 |
| p_similarity_zero_25 | 原生处罚有直接复制/非自己作品/解释条件与likely力度，不能说>=25必零；拟条件关联纠正，非提交区间的同义重复 |
| p_gai_paper_trail_issue | parsed原文尾句确实截断，邻文为下一b项；原附件图像字节不在本次保存集，不编补尾句；需权威完整来源或明确保留缺口决策 |

上表细节均来自保存来源，不是新模型结果；建议尚不能代替Human参与的正式来源裁决。原文字段版本、教学/当前任务适用性和真实平台运行不可互相替代。本轮未改变任何语义结果，也未将移入参考当闭合。旧Gate5 FAIL不变。

## 唯一集中决策点与RC2下一步

请Human集中决定：

1. 是否接受本轮视觉与双打印，并批准上表**明确有源的候选纠正建议**（背景/谓词/动作力度与依赖/无源12移除/条件关联），只经隔离生产Review链进入候选，不自动写真实trusted。
2. Lit身份、真实考试2h/3h、Similarity精确边界、GAI缺失尾文应补权威来源，还是允许以清楚pending作为RC2验收范围的已知限制？这是事实准确性/发布范围决策，工程不能自行批准。未获决定不创建正式RC2。

优先零付费Human阅读现有原文即可处理多数建议，**当前未判定必须新模型调用**，未构建或派发付费请求。若Human决定需要模型，须另按必要scope准备真实输入token/上限、现行价与最坏预留、一次性停止条件后集中审批；余额/UNKNOWN核销不授权自动派发。未充值/换模型/查询Key，未恢复153/162或9+1。

裁决后才进行最小通用表示/Review修改与完整生产闭环，正式Side Panel/full page、必要真实来源及至少一门非本课程/异构真实来源验收，再生成唯一RC2 candidate/manifest/恢复点/准确账本，停Human Gate5。详见 [RC2验收准备指南](RC2_PREPARATION_v0.3.0.md)。当前未操作原正式扩展reload和NTU refresh；隔离扩展新加载已测。后续正式加载仍须reload并刷新所有旧NTU页，当前边界禁止操作原profile。真实异构课程/真实增量不具备时保留NOT VERIFIED，不用本轮合成探针顶替。

## Changed Files与保护

Inbox仅P061一个Markdown与指定Human证据PDF入站；P060备份，旧E2P-050按字节归档。出站只回传manifest列出的源码/文档/公开安全摘要与controls，先核旧receipt再写，逐文件挂载SHA回读，**不是服务器确认**。旧RC1 ZIP、profiles、wallet UNKNOWN、其它dirty和历史证据不动。现停集中实质来源决策点，尚未到可提交的Human Gate5，不发布。
