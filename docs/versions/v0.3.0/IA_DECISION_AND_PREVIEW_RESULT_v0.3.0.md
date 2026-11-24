# v0.3.0 单一卡片 IA 决策与预览结果

2026-10-14（Asia/Singapore）。入站P2E-059；同一Phase B。

**交付状态：单一入口和结构化显示已实现；语义收口部分完成 / UNVERIFIED PRODUCT PREVIEW / NOT RC2 / NOT TRUSTED。** 没有新增付费调用、扫描或审核架构；最终Human Gate5仍未通过。本文不把IA与工程回归称为内容准确性验收。

## 本机入口

```sh
node scripts/v030-product-059-open-preview.mjs
```

新独立Chromium打开候选卡片；点名称或“View organized details”进入同一对象的CRS-03。返回卡片时恢复原卡焦点和滚动位置；Enter可打开。章节、Rubric、Reference按需展开，点值查Evidence，查证后保持展开状态。顶部链接进入实际Initial Review；无需先Confirm查看Brief。关闭浏览器结束。

机器私有入口、profile、截图和证明位于 `evidence/private/product-059/`。原正式、RC1、058预览和十次被迫Confirm会话未操作；QA worker及页面网络均禁用。此预览的认可/编辑只影响隔离资料，不作为正式Human gold。Side Panel语义预览使用同一入口附加 `?surface=side-panel`；正式浏览器Side Panel容器未安装/验收。

## 已批准决定与本轮实现

权威要求已先写入PRD、独立Interaction & IA§5.2及Decision Log。保留旧限制为历史，P059允许的例外仅是原Course Brief内的单卡主从调整：没有新增Review、第二产品模型、第二次AI摘要或Pipeline重建。

| 058 / preview(1).pdf问题 | 最新实现 | 真实范围 |
| --- | --- | --- |
| 上方摘要卡，下方同名大卡 | 产品Brief仅一套主卡；CRS-03为选择该ID后的聚焦详情，下方不再渲染第二目录/完整大卡；Kind只作标签 | 5个保存候选各1入口，0个重复主卡。**四项Scheme考核加Literature Review旧候选，不是五项已确定真实考核** |
| 摘要仅weight/date，提交责任需下翻 | 主卡引用已有weight、deadline/展示/考试时间、mode、duration、submission/deliverable/responsibility；只显示适用的已有字段。争议保持UNCERTAIN并提示在详情比较来源 | 没有生成自由摘要、猜值或固定四项目模板。时间保留原具体label，避免把session window当单项考试的精确时长。旧模型字段/身份误判不因此改正 |
| 展开即长树和重复字段 | 详情不再重复摘要Fact；业务分组为提交/截止、准备/内容、展示/考试安排、重要问题。按已有model业务group和typed字段组织，恢复保存proposition顺序，不按数据库ID排序章节 | 这是通用显示组织，不从原文关键词裁决身份、冲突或义务。Preparation/Content等已提供业务label作阅读顺序；未知group保持原名/原序，不猜分类 |
| 父总括正文与子章节默认全文重复 | 有子要求的父节点作章节入口，完整父正文与Evidence进入“Full requirement and source”；子项再按需展开，力度/条件/例外可见；OR关系保持 | 133个Fact跨卡/详情/课程规则/来源层全部可达。完整原文保留不是默认重复阅读。无完整等价证明的同义父子去重仍未完成 |
| 一动作多来源重复 | 仅正文、field、knowledge、竞争值、力度、条件/例外、group/role/父关系/选择关系及mark全部相等时合并显示；全部Fact ID和Evidence保留，Review决策范围不合并 | 属于确定性完全重复整理，不证明异文语义等价；不做关键词近似合并 |
| Course-wide规则密集 | 按保存语义group提供独立可展开入口；未决状态可见，完整规则与Evidence仍可达 | 没有声称重新提炼出可靠的高价值摘要。相近处罚、表单声明重复和无价值疑问的语义去重仍待判定 |
| 查Evidence导致展开丢失/返回失焦 | 原位Evidence继续使用原ID；新增详情的native disclosure状态跨重绘保留，返回原卡恢复焦点/滚动；无决策写入 | 实际点击与键盘回归在1280 Full-page和380 Side Panel语义上下文通过。刷新恢复数据；刷新后的临时展开状态回到默认，不冒称持久化 |

主卡仍可能较长：提交说明多项、旧候选duration/identity误判尚在。摘要使用已有unit区分明确日期与文字性提交条件，文字条件/格式细则放到详情；未决提交字段以状态提示导向详情比较。没有人为条数/字符截断、自动选择“看上去正确”的竞争值或偷偷删任务来制造短卡。当前摘要并非新的已核验AI整理结果。

## Presentation展开后具体看什么

提交日期、交付与责任在摘要，详情只组织尚未展示的独立内容；准备/选题与内容树、格式、Schedule/Procedure/Delivery、需要确认的问题分别呈现。已有章节按保存Product顺序显示，Introduction/Stakeholder/Scope/Schedule/Cost/Risk子项不再因Fact ID字母顺序乱序。父完整要求、章节长说明、Rubric及教学参考进一步按需查证。

**仍有不足：** 保存模型将项目选择/目的挂在内容父节点，Preparation中的导师批准与子正文可能同义重复；只靠现有typed信息无法可靠证明或重排其业务依赖，未手工改写旧候选。部分业务group标签和子标题仍含内部“Part 1”表达，字段中把提交形式/平台混在submission_method；已尽量保留具体时间类型，但完整语义分类未完成。不能声称学生展开后所有动作已完整、准确、无冗余。

## 未解决语义清单

1. **Literature Review身份未闭合。** 旧Product仍CURRENT，仅教学标题/主题/方法指导不证明实际新任务；本轮未按名字/缺weight删除。全体未审核主卡明确标为Unverified candidate；该对象不是第五项已证实考核。缺一份来源绑定的实体裁决。
2. **15+约5/20、platform flags、100/25尺度的虚假Issue仍在。** 摘要不把竞争原文全文铺开，详情仍能看到完整旧争议；这不是判断其兼容或去掉噪声。旧source-derived错误也未通过折叠变成正确结论。
3. **Final Exam 2h/3h根因保留，派生11/12点结束时间仍未纠正。** 来源支持的时间与模型派生内容尚未可靠分开，不能自动选择Outline/较新来源。
4. **Parent/章节/准备/声明语义去重未完成。** 只合并精确相同的完整 operative claims；语句不同且可能有独立动作/附加条件的仍保留。对Grade/AI-use/出席/提交的重要要求不静默隐藏。
5. **Course Rules可靠精炼摘要、最终Print、真实新模型语义与真实增量仍NOT VERIFIED。** 新显示和测试数不能代替这些结果。主卡长度与真实学生查找耗时/正确率未获Human验收。

本轮不存在新模型结果。`ac4383…`旧候选重编译成新显示，原Product/Clause/Evidence未改。所谓“去重/排序/分组”是通用规则在已保存结构上的显示行为；合成fixture和受控identity场景仅证明交互/防丢失，不作为本课程语义gold。

## 必要的后续核读，仅提案

沿用P058报告的三个限定源范围：实体适用性、Group实际安排/工具配置/计分尺度/父子清单、Final Exam时长与明确时间。每项须返回来源引用、受影响entity/proposition替换或明确未决，不重审整课、不启动153/162或9+1流程、不无限repair。Human可根据保存原文直接裁决；若选择付费核读，须先构建精确请求、测输入、查询授权后的预算并审批一次性成本，缺usage/答案立即停止。本轮未估价、未调用、未释放UNKNOWN；余额恢复也不自动派发。

## 验证与停止点

最终CI、候选/build SHA和浏览器结果以 `artifacts/v0.3.0/product-059/PREVIEW_SUMMARY.json` 为准；截图含主卡、每张聚焦详情和380视口，全部机器私有，不上传完整课程原文。

真实保存候选：零决策浏览25范围、Edit/Uncertain、Defer、Exclude/Undo、批准范围、Human facets与刷新；受控场景：Split/merge及Same/Different，保留pending/来源且不自动信任所含Fact。其语义证据等级分别列明。代码未改这些mutation路径；既有backup/Check/Rebuild安全回归由CI复用，未声称本轮真实线上增量通过。

新QA副本重新加载，原正式extension和NTU页未触碰；后续正式加载仍须reload extension并refresh已有NTU页。未发布、未commit/push/merge/tag/release。交付后停止，等待Human + 产品侧集中审阅单卡IA效果及剩余语义裁决范围；继续同一Phase B → 唯一RC2 → Human Gate5。
