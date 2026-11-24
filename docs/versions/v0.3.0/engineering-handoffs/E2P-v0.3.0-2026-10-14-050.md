# Engineering → Product 当前交接｜E2P-v0.3.0-2026-10-14-050

2026-10-14（Asia/Singapore）；入站 P2E-060。HEAD仍 `26426a3793250aea351c443e3327ccdb1b95b697`，既有dirty保留，无commit/push/merge/tag/release。

**DISPLAY_AND_PRINT_REMEDIATED / SEMANTIC_PARTIAL / ZERO_PAID / WAITING_CONCENTRATED_REVIEW / NOT_RC2 / NOT_TRUSTED。** 同一 Phase B，本次集中交付后停下。

## 交付与真实结果

唯一卡片 IA 延续；1280同行外框/顶部/底部对齐，380单列；固定标题/权重/日期deadline/风险与详情入口，额外摘要内滚、实际溢出才提示，键盘/滚轮可达并保留焦点位置。摘要移走次级正文/全表/技术配置，整份QA统一Unverified。详情沿用已提供group/parent关系，将力度/条件附着动作，全文/完整Schedule/Evidence按需查；异文等价不臆断。

Rubric去重key漏标题造成同为5分的不同标准被合并，现补label/title/unit并回归测试，恢复Content/Speaking/Q&A各5、Peer10及total25，源说明均可达。A4解除屏幕滚动限制，当前页disclosures完整展开并在打印后恢复；已补真实PDF、词框与逐页视觉检查。最终CI/build/candidate SHA及页数在 `artifacts/v0.3.0/product-060/PREVIEW_SUMMARY.json`。全部133 Facts可达；显示/打印/CI不是语义或Human验收。

详见 [集中整改与剩余问题报告](../versions/v0.3.0/CONSOLIDATED_REMEDIATION_AND_PREVIEW_v0.3.0.md)。源摘录17项仅在本机 `evidence/private/product-060/SOURCE_EVIDENCE_AND_MINIMAL_SCOPE.md`，连同截图/PDF/profile/raw不上传。

## 操作入口

```sh
node scripts/v030-product-060-open-preview.mjs
```

新隔离浏览器实际Initial Review可自由查看，不强制Confirm。卡片点名称/底部进入同一ID详情，Evidence打开同Fact，返回原卡。正式Side Panel容器与物理触屏未验收；原profile/NTU页未reload/refresh，本轮不允许操作。QA新加载完成，后续正式加载须扩展reload并刷新所有旧NTU页。

## 真实剩余语义 / 最小核验

四项Scheme与一项Literature Review旧CURRENT候选仍不是五项已证实考核。剩余(a) Literature Review当前任务身份；(b) 15+约5/20slot、100/25、group/late flags、folder/2025默认时间、群数/人数谓词、批准与准备父子异文；(c) Final Exam源2h/3h与旧模型11/12结束推算；(d) similarity规则/例外、截断GAI与课程规则异文。混合mode只是保留现有title改善展示，不声称语义重分类。

报告给出确切source/page/Clause定位、受影响命题、四个有限裁决范围、成功/停止条件。优先Human阅读保存源；需新DeepSeek时只提选中范围与相邻上下文，**提案不构成付费授权**。零新付费/扫描/派发；UNKNOWN不释放/重派，余额恢复不自动恢复。无整课153/162、9+1或证书扩张。真实增量、trusted迁移及Human Gate5仍未通过，原Gate5 FAIL不变。

## Changed Files / 定点回传

以下21项payload + manifest/receipt，仅当前Changed Files。旧receipt前置保护、整文件写回、逐文件SHA读回；**挂载回读不是服务器确认**。Inbox仅P060唯一文件入站，SHA `ac1963295c7eec6fba27ce46d643c51ab904d1411766527a1a0d6237e0fcec8b`；P059私有备份，旧049 Outbox按字节归档。

- `extension/src/v2/screens/course.ts`
- `extension/src/app/app.css`
- `extension/src/v2/screens/print.ts`
- `extension/src/app/index.ts`
- `extension/src/v2/screens/patterns.ts`
- `extension/src/v2/copy.ts`
- `extension/src/v2/screens/render.test.ts`
- `scripts/lib/v030-product-preview.mjs`
- `scripts/v030-product-060-open-preview.mjs`
- `scripts/v030-product-060-preview-check.mjs`
- `scripts/v030-product-060-print-audit.py`
- `docs/versions/v0.3.0/PRD_v0.3.0.md`
- `docs/versions/v0.3.0/Interaction_and_Information_Architecture_Spec_v0.3.0.md`
- `docs/versions/v0.3.0/DECISION_LOG_v0.3.0.md`
- `docs/versions/v0.3.0/TECHNICAL_DESIGN_v0.3.0.md`
- `docs/versions/v0.3.0/ENGINEERING_REPORT_v0.3.0.md`
- `docs/versions/v0.3.0/RC2_ACCEPTANCE_STATUS_v0.3.0.md`
- `docs/versions/v0.3.0/CONSOLIDATED_REMEDIATION_AND_PREVIEW_v0.3.0.md`
- `docs/versions/v0.3.0/engineering-handoffs/E2P-v0.3.0-2026-10-14-049.md`
- `artifacts/v0.3.0/product-060/PREVIEW_SUMMARY.json`
- `docs/collaboration/CODEX_TO_CHATGPT_HANDOFF.md`
- `artifacts/v0.3.0/product-060/CHANGED_FILES.json`
- `artifacts/v0.3.0/product-060/SYNC_RECEIPT.json`

## 集中停止点

交付后停止，等待Human + 产品侧集中审阅 UI/IA/打印接受项，以及四个语义范围由Human裁决或另授权有限核读。保持 NOT RC2 / NO RELEASE；不另开版本、Gate或付费流程。
