# Engineering → Product 当前交接｜E2P-v0.3.0-2026-10-17-051

2026-10-17（Asia/Singapore）；入站P2E-061。HEAD仍 `26426a3793250aea351c443e3327ccdb1b95b697`，既有dirty保留，无commit/push/merge/tag/release。

**VISUAL_AND_PRINT_IMPLEMENTED / SOURCE_DECISIONS_PENDING / ZERO_NEW_PAID / RC2_NOT_READY / HUMAN_GATE5_NOT_SUBMITTED / NO_RELEASE。** 本轮完成确定性工作，停在唯一集中实质来源决策点；不是Human Gate5 PASS，不把未完成关键语义的预览改名正式RC2。

## 已完成与审阅入口

单卡结构保持，Primary为名称、显著课程权重及已确定事件日期，Secondary为模式/时长/责任，未决字段固定核实入口，完整原值在同详情。详情/规则区分章节、必需动作、条件与背景，用已有modality/role排序。没有课程名/数值白名单或新AI summary pipeline。

新增两个轻量打印按钮：Summary打印高价值卡片、提交/已有处罚风险和未决线索；Full details复用同课程全部详情/规则/参考与Source定位，短Rubric项分保持对应，长正文完整展开，打印后UI状态恢复。完整Fact ID、完整display文本、A4几何与逐页截图验证结果、CI与绑定SHA统一见 `artifacts/v0.3.0/product-061/PREVIEW_SUMMARY.json`。

```sh
node scripts/v030-product-061-open-preview.mjs
```

新隔离Chromium，网络关闭，实际Initial Review可自由浏览，QA确认不代表真实课程认可。桌面/380语义、键盘/内滚、返回焦点/刷新、打印模式按钮/临时文档销毁、原有Review交互回归已实测；合成长中英文名称仅排版探针，不作非本课程真实验收。原profile/RC1/trusted未操作；正式Side Panel及原NTU页reload/refresh未做，后续正式加载仍须执行。

请集中读 [视觉层级与RC2准备](../versions/v0.3.0/VISUAL_HIERARCHY_AND_RC2_PREPARATION_v0.3.0.md) 和 [验收准备指南](../versions/v0.3.0/RC2_PREPARATION_v0.3.0.md)。不是逐个Label/截图停工，也不另开认证Gate。

## 源语义：真实新发现与需要Human决定

保存17项命题逐条绑定parsed原文和邻页，本机 `evidence/private/product-061/HUMAN_DECISION_TABLE.md` / `SEMANTIC_SOURCE_PACKET.json` 保留Clause/source digest/parsedSHA、旧模型quote与实际原文的区别、建议对象及停止条件；不上传这些原文。

**更正旧诊断：** 保存考试安排明确9–11，11:00有源，不能与无源12:00一起判推算；演示全表多数15分钟、部分20分钟slot，不能靠部分20分钟宣布15+约5完全兼容。Rubric原表支持现有5/5/5/10/25映射。

有据待批准建议：平台分数尺度/flags/default时间用途分离为背景；16 groups修谓词而非改人数；should批准与选题分动作关联；移除无源12派生冲突而保留时长根疑问；相似度提交/处罚保留独立条件及likely力度。Lit CURRENT身份、2h/3h、24/40边界与截断GAI仍需权威源/发布范围决定。**17项Human-approved=0、applied=false，原raw/candidate/Clause未改；没有把折叠入Reference当闭合。** 五张旧候选不是五项已证实考核。

Human集中决定两件事：是否接受视觉/双打印并批准上述明确来源支持的候选修正；未定身份/时长/边界/缺文应补权威源，还是允许清楚pending作为RC2已知限制？这会影响事实准确性与发布范围，工程不能代定；正式RC2及后续全链验收等待该决定。原Gate5 FAIL不变。

优先Human读取已有源可零付费处理多数建议，当前没有“必须新模型”的结论，未构建/派发付费请求、未查Key/充值/换模型/自动核销UNKNOWN。若另决定需要付费，再免费准备必要scope真实token、现行单价/最坏预留与一次性停止条件后审批，不自动派发或repair。无153/162、9+1扩张，无新扫描或真实迁移。

## Changed Files / 定点回传

以下18项payload，加manifest/receipt。仅Changed Files，旧receipt前置保护、整文件写回、逐文件SHA读回；**挂载SHA不是服务器确认**。

- `extension/src/v2/screens/course.ts`
- `extension/src/v2/screens/print.ts`
- `extension/src/v2/copy.ts`
- `extension/src/app/app.css`
- `scripts/v030-product-061-open-preview.mjs`
- `scripts/v030-product-061-preview-check.mjs`
- `scripts/v030-product-061-print-audit.py`
- `docs/versions/v0.3.0/PRD_v0.3.0.md`
- `docs/versions/v0.3.0/Interaction_and_Information_Architecture_Spec_v0.3.0.md`
- `docs/versions/v0.3.0/DECISION_LOG_v0.3.0.md`
- `docs/versions/v0.3.0/TECHNICAL_DESIGN_v0.3.0.md`
- `docs/versions/v0.3.0/ENGINEERING_REPORT_v0.3.0.md`
- `docs/versions/v0.3.0/RC2_ACCEPTANCE_STATUS_v0.3.0.md`
- `docs/versions/v0.3.0/VISUAL_HIERARCHY_AND_RC2_PREPARATION_v0.3.0.md`
- `docs/versions/v0.3.0/RC2_PREPARATION_v0.3.0.md`
- `docs/versions/v0.3.0/engineering-handoffs/E2P-v0.3.0-2026-10-14-050.md`
- `artifacts/v0.3.0/product-061/PREVIEW_SUMMARY.json`
- `docs/collaboration/CODEX_TO_CHATGPT_HANDOFF.md`
- `artifacts/v0.3.0/product-061/CHANGED_FILES.json`
- `artifacts/v0.3.0/product-061/SYNC_RECEIPT.json`

Inbox入站SHA `6f470345d5445b3153f3dad99d46944fa36dca8569bf110765c407e335c3a063`。Human指定11页PDF仅定点私有读取，SHA `0ff5dd3505981d2578b96ff349bdade3c8ffe7927c246536b9036a530fc92e40`；不写公开仓库或Release。P060 Inbox私有备份，E2P-050按字节归档；P060四个被改源文件按已核Drive基线保存私有恢复副本，原预览可继续打开。无递归同步/删除，私有截图/PDF/profile/raw/reasoning/账单/Key不回传，旧RC1ZIP不覆盖。

## 停止点

现等待Human + 产品侧一次集中实质来源决策。获批后才做通用表示/Review最小修正、真实端到端与非本课程/异构源回归、唯一正式RC2 candidate/manifest/成本账本，最后停Human Gate5。未获Human PASS不发布或改Git历史。
