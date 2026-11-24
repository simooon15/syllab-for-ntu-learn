# Engineering → Product 当前交接｜E2P-v0.3.0-2026-10-13-048

日期：2026-10-13（Asia/Singapore）。入站：P2E-058。HEAD：`26426a3793250aea351c443e3327ccdb1b95b697`，既有dirty保留；未commit/push/tag/release。

**状态：PARTIAL_P0_REMEDIATION / UNVERIFIED_PRODUCT_PREVIEW / WAITING_CONCENTRATED_REVIEW / NOT_RC2 / NOT_TRUSTED。** 同一v0.3.0 Phase B。交付后停止，等待Human + 产品侧集中审阅；所有新增付费调用、重扫、审核架构扩张仍暂停。

## 结果与必须正视的缺口

通用显示改动：Scheme Components平级展示；首层考核总览及weight/date优先；长父执行树在字段后默认展开；risk按已保存语义group组织。无课程/名称白名单，无weight新任务不排除；原133个Fact在展开后全部可达。保存candidate内容未改。

**四项P0并未全部解决。** Literature Review仍为旧CURRENT候选；15+约5/20、platform flags、100/25虚假Issue仍存在；Final Exam 2h/3h真实疑问与派生end问题仍重复；父清单原文重复和Course-wide语义去重也未完成。既有Prompt已包含纠正标准，保存输出未遵守；本轮没有可复用的完成语义裁决。没有人工改写raw或关键词删除来造漂亮预览。

请集中读 [`PRODUCT_P0_REMEDIATION_v0.3.0.md`](../versions/v0.3.0/PRODUCT_P0_REMEDIATION_v0.3.0.md)：四项实际状态、首次错误层级、RC1→047→当前对照、五项交付回答、证据等级及三个有限核读提案。费用尚未估价，未准备请求/新钱包，不编造金额，也不授权自动调用。

## Human本机入口

```sh
node scripts/v030-product-058-open-preview.mjs
```

打开新的独立Chromium；先看候选Brief，再点顶部链接进入实际Initial Review。无需Confirm即可浏览，所有网络禁止。QA Confirm仅影响隔离副本明确范围；原正式/RC1/十次forced Confirm资料不参与。入口/profile/截图在 `evidence/private/product-058/`，机器私有，不上传。

最终candidate/build SHA、380/1280点击与刷新、CI和数据保护结果在 `artifacts/v0.3.0/product-058/PREVIEW_SUMMARY.json`。真实语义、Human、最终Print、真实增量仍NOT VERIFIED。旧Split/Same/Different/backup/Check-Rebuild受控证据复用，未受本轮mutation修改；不冒充本轮新模型或真实线上验证。正式extension/NTU会话未reload/refresh，后续正式加载需遵循该步骤。

## Changed Files / 定点同步

精确清单为 `artifacts/v0.3.0/product-058/CHANGED_FILES.json`。仅下列payload加manifest/receipt写回Drive Desktop；各已存在文件用046/047或既有receipt SHA核对，不盲覆盖。逐文件本地挂载SHA回读，**不是Drive服务器确认**。

- `extension/src/v2/contract.ts`
- `extension/src/v2/view.ts`
- `extension/src/v2/copy.ts`
- `extension/src/v2/screens/course.ts`
- `extension/src/v2/screens/render.test.ts`
- `extension/src/app/app.css`
- `scripts/v030-product-056-browser.mjs`
- `scripts/v030-product-056-interactions.mjs`
- `scripts/v030-product-058-open-preview.mjs`
- `scripts/v030-product-058-preview-check.mjs`
- `docs/versions/v0.3.0/PRD_v0.3.0.md`
- `docs/versions/v0.3.0/Interaction_and_Information_Architecture_Spec_v0.3.0.md`
- `docs/versions/v0.3.0/DECISION_LOG_v0.3.0.md`
- `docs/versions/v0.3.0/TECHNICAL_DESIGN_v0.3.0.md`
- `docs/versions/v0.3.0/ENGINEERING_REPORT_v0.3.0.md`
- `docs/versions/v0.3.0/RC2_ACCEPTANCE_STATUS_v0.3.0.md`
- `docs/versions/v0.3.0/PRODUCT_P0_REMEDIATION_v0.3.0.md`
- `docs/versions/v0.3.0/engineering-handoffs/E2P-v0.3.0-2026-10-13-047.md`
- `artifacts/v0.3.0/product-058/PREVIEW_SUMMARY.json`
- `docs/collaboration/CODEX_TO_CHATGPT_HANDOFF.md`
- `artifacts/v0.3.0/product-058/CHANGED_FILES.json`
- `artifacts/v0.3.0/product-058/SYNC_RECEIPT.json`

入站仅同步唯一Inbox，原P057与上轮SHA一致，无独立本地修改，已私有备份再替换；P058 SHA `f37b3a0845e2ad4f825dddd906169f1b21f7fe6079304b7ce813190c90efa62e`。旧047 Outbox按字节归档。PRD/IA的共享SHA与旧receipt有差异：定点diff确认仅缺本地已授权056追加记录，Drive全部行在canonical按序保留；已私有备份Drive原文，采用纯追加合并，无删除/替换。未递归同步，无私有raw/profile/账单/Key上传，旧PDF未重拉/公开。build在本机重新加载隔离副本，未覆盖RC1 ZIP。

## 集中停止点

请判断结构改进是否有用，先承认核心语义仍未解决，再决定有限原文核读/Human裁决或具体付费验证是否必要。此次没有关闭正式trusted门槛，没有删除安全机制。继续同一Phase B → 唯一RC2 → Human Gate5，原Human FAIL未撤销。
