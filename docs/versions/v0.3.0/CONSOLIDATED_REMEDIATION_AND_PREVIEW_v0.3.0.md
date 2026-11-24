# P060 集中整改与隔离预览｜v0.3.0

2026-10-14；P2E-060 → E2P-050。同一 Phase B；**零新付费 / 展示与打印已整改 / 语义部分未核验 / 等待集中产品审阅 / NOT RC2 / NOT TRUSTED**。HEAD 保持 `26426a3793250aea351c443e3327ccdb1b95b697`，无 commit/push/merge/tag/release。

## 新预览与审阅操作

在 canonical 仓库执行 `node scripts/v030-product-060-open-preview.mjs`。全新隔离 Chromium，首页全局 Unverified；原 Human/RC1/058/059 profile 不动。卡片名称或底部入口进入同一 Assessment 详情，Evidence 在该详情打开相同 Fact；返回恢复焦点与卡片滚动。顶部 Initial Review 是实际审核界面，自由浏览无需 Confirm，QA 操作只写隔离资料。

截图、原始候选、原文摘录与 PDF 仅在本机 `evidence/private/product-060/`，不随 Drive 回传。主卡截图为 `brief-full-1280.png` / `brief-full-380.png`；PDF 是 `brief-summary.pdf` 与 `presentation-full.pdf`，前者当前 Brief 的卡片/课程规则/参考，后者当前 Group Presentation 详情展开所有既有 disclosures。不是全课所有考核的逐项详情 PDF，也不是 Human 的 preview1.pdf；本轮未取得后者，按保存候选重现打印问题。

## 定点根因与实际修复

| 分类 | 根因 / 修改 | 真实边界 |
| --- | --- | --- |
| 纯显示可修 | 自然内容撑高卡体；改固定 header、内滚 region、footer，同排等高、窄屏单列 | 核心权重/日期 deadline/未决固定；溢出才显示提示，禁止摘要塞全文 |
| 纯显示可修 | 全局 QA 状态重复；只保留持续全局状态，单项未决保持 | 未把候选变成 trusted；旧五卡仍含一项身份未定 |
| 已有结构可组织 | title/typed group/parent 已在候选；力度嵌入动作、目录保留 parent/OR/条件/例外，全文/全表按需查证 | 异文 preparation/project approval/父子重复仍未语义合并 |
| 已有结构可组织 | 旧去重 key 忽略 Rubric 标题，同为5分的不同评分项被合并 | 补 label/title/unit，恢复 Content5、Speaking5、Q&A5、Peer10、total25；评分说明保留，未创造源匹配 |
| 纯显示可修 | Evidence 返回把长文放入固定头；同卡入口进入 CRS-03 打开同 Fact | Review scope/Confirm 不变，全部原 Fact 仍可达 |
| 纯显示可修 | grid/flex 固定高度、overflow、整长动作 avoid 与标签定位干扰打印 | A4 block flow，完整披露/分页，短 rubric 项分成对；不靠隐藏义务减页 |
| 需源语义裁决 | 身份、假冲突、错字段、异文等价、推导结束时间来自旧模型 | 本地未手工改 raw/candidate；不能称已修复 |

摘要优先权重/明确日期单位 Deadline、既有模式/关键交付；普通日期/会话窗口沿用候选提供标题，不把 Tutorial 窗口转成答题时长。Schedule 的 submission_method 用已提供安排分组显示 Presentation platform；Group count 用命题原 title，底层 group_size 谓词仍错误。保存 mode 标题改善可读性不代表整个模式分类已准确。

## 验证与局限

最终机器结果在 `artifacts/v0.3.0/product-060/PREVIEW_SUMMARY.json`。CI、1280/380 真实浏览器、滚轮/键盘、同行边缘、展开/返回/刷新、133 Facts 可达、592 Clauses 保全、零新增 trusted、Review 独立风险/结构/身份按钮，以及 A4 词框与逐页图片检查分别记录。1280×900 可无溢出，缩到真实650高度检查内滚；380×900 已实际溢出，不插入假 Fact。

完整 Rubric 的5组数值身份映射以保存 candidate 作工程核对，不作为源语义 PASS。PDF 词框无明显重叠/越界与空白页仅说明当前输出；未建立所有浏览器/打印机兼容性。物理触屏、正式 Side Panel 容器、原正式扩展 reload/NTU refresh、真实增量/可信迁移和 Human Gate5 未验证。隔离扩展新加载已完成；若后续正式加载须 reload 扩展并刷新所有旧 NTU Learn 页。本轮禁止原 profile 操作，未做该正式步骤。

## 四个最小源核验提案（仅提案，不派发）

精确17项命题的 Clause ID、Source digest、page/native-text 与逐字保存 quote 在本机 [私有源证据与范围](../../../evidence/private/product-060/SOURCE_EVIDENCE_AND_MINIMAL_SCOPE.md)。该相对路径以仓库根 evidence 为准，Drive 无私有副本。以下是可交给 Human 或另获一次性授权后核读的最小范围；无需整课153/162或9+1审查。

| 范围 / 命题 | 保存证据与待裁决 | 最小输出与停止条件 |
| --- | --- | --- |
| A 身份：p_litrev_identity / theme_choice | Attachment1 page59 “Literature Review Assignment”；page72–73教学“students construct a brief literature review”。标题/教学示例不能证明当前独立任务 | 只核任务所属当前学期/课程与 assignment 发布证据；输出 CURRENT任务/教学材料/不足，绑定原文。无当前发布证据即不足，不硬删/硬升第五项 |
| B 演示：p_part1_duration、score_scale/group_content_config/late_accept/due_date issues、group_count、project_approval/selection、Rubric | 原文15min、around15mins+Q&A与4.30–4.50 slot；platform100 vs outline25marks；“16 groups”；page81项目选择/批准；元数据2025时间与2026 authored deadline | 只判断对象/单位/版本/适用群体和真实动作影响；分别给 duration vs slot、platform vs student grading、群数 vs 人数、配置是否学生风险、异文等价及额外责任。17项总范围内本组10项；缺版本/权限上下文则保留NOT VERIFIED，不推导“你的组”时间 |
| C 考试：p_part4_duration_issue / exam_datetime | Attachment1 page4/14 “stated as 2 hours”与“exam duration is 3 hours”；page4日期20-Nov-2026；11/12结束时间是旧推算 | 只核真实2h/3h根因、原文起始与日期，推算结束单独标非源事实；不得用模型推算增第二冲突。无权威更正保留一个时长根疑问，其它源字段照存 |
| D 高价值课程规则：similarity_bands / zero_25 / gai_paper_trail_issue | outline page4–5可能零分与不同提交阈值/解释条件；IntegrityPDF page1截断“digital paper trail r” | 只核是否同对象同条件、可合并/独立例外与缺失尾文；保留力度/数值/条件。缺完整声明则不足，不编补。Attendance/通用提交若后续影响动作再指定源范围，不自动全课扩张 |

建议 Human 先看这些有限保存源摘录决定可直接裁决哪些条目；需要完整页/新版源时只读取对应原附件。Human 裁决必须明确标为人工来源结论，不能冒称模型自动修复。若需 DeepSeek，新请求仅包含选中 scope 的原 Clause 与必要相邻上下文，输出命题身份/适用性/动作/单位/源支持/无法确定项；新增权限需集中授权。partial/无支持/合同错误/无进展立即停，不自动 repair、提高预算或重派 UNKNOWN。无现行授权、零新增请求；不查询或估算新费用。

## 真实剩余问题与集中停止点

Literature Review CURRENT身份、15+约5/20假冲突、100/25与group/late flags、folder/2025默认时间、考试推导结束时刻、group_size谓词、异文准备/批准/父子/课程规则重复、混合mode分类及截断GAI仍未闭合。只有已保存标题/映射的显示改善，不能把它们移入Reference就报完成。四项Scheme + 一项旧CURRENT候选 ≠ 五项已证实考核。

Drive 只回传 Changed Files，SHA读回是挂载文件一致性，不是服务器确认。私有截图/PDF/profile/raw/账单/Key不上传，RC1 ZIP不覆盖。交付后停止，请集中接受/拒绝 UI/IA 与打印，决定哪些语义 Human 裁决、哪些另授权一次限定核读。RC1 Gate5 FAIL 仍有效，NOT RC2 / NO RELEASE。
