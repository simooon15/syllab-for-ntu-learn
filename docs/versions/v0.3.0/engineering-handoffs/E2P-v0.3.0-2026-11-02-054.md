# Engineering → Product 当前交接｜E2P-v0.3.0-2026-11-02-054

2026-11-02；入站P2E-063。HEAD仍26426a3793250aea351c443e3327ccdb1b95b697，既有dirty保存，无commit/push/merge/tag/release。

**状态：RC2_CANDIDATE / HUMAN_GATE5_PENDING / NOT_TRUSTED / NO_RELEASE。** 最终实际构建/候选/包/测试证据由 `artifacts/v0.3.0/rc2/RC2_MANIFEST.json` 绑定，不把产品来源解释授权当真实Confirm或17项全部KNOWN。原RC1 FAIL不因工程检查解除。

## 唯一RC2与验收入口

- 生产扩展候选ZIP：`artifacts/v0.3.0/rc2/Syllab_v0.3.0_RC2_candidate.zip`，仅最终dist，不含QA桥接/课程/Key/profile。
- `node scripts/v030-product-063-open-preview.mjs`：独立网络禁用Chromium，先看修正候选Brief，再从顶部进入实际生产Initial Review；QA Confirm只作用新隔离资料。
- [Human Gate5逐项指南](../versions/v0.3.0/RC2_HUMAN_GATE5_v0.3.0.md)。恢复：旧P061预览保留，关闭新浏览器不影响正式资料；重建入口063-seed仅复用保存源/授权delta，不扫描/付费。

## 17项与跨项实际结果

01–02：Literature Review身份ISSUE、教学主题/指导BACKGROUND，退出核心卡但保留待核实和原文。03：15分钟展示/约5分钟Q&A分立，实际slot差异单项保留。04–07：100分/技术flags/历史default时间归背景，不再学生相反结论。08：group_count16。09–10：选题与should批准分动作保留，不重复升级must。11–12：5/5/5/10/25完整Rubric映射。13–14：保留2h/3h根冲突、源09–11，移无源12。15–16：原区间/边界缺口、likely及直接复制/非本人作品和解释条件并存，支持Clause绑定保留。17：已保存解析截断，现有证据目录未定位原始声明PDF，明确覆盖缺口，不编补或冒称源原件本身缺字。

Group/Individual原题、folder原标签保留来源背景，不制造完整身份未知。Part2/3 session窗口与答题时长分开；Part3旧3h/长短题与后续1h/structured短题差异待确认，主卡不报确定3h。元数据KNOWN仍不允许进入核心摘要；标题/章节无衬线、长段Regular，原单卡/滚动/焦点/双打印维持。

私有 `evidence/private/product-063/AUTHORIZED_SOURCE_CHANGES.json`、`DECISION_MATRIX.json`、派生product记录与原文定位记录每项旧值/修正/状态/来源；原83,084字节决策表SHA e0f6e07a61b24ca104adf8af86051faa44bcfaafcb5e75e376b41a0d63c1ef24未改。旧模型/raw/592 Clause未改。不是新模型结果或trusted批准。

## 验证与明确未测

完整CI、17项条件检查、1280/380真实浏览器、135 Fact可达和完整A4值/评分映射、后台字段不漏摘要、Review无副作用浏览/Confirm/Edit/Review later/Exclude/Undo/保存刷新、关系点击、带用户力度/条件编辑的备份全替换恢复、受控Rebuild结果见manifest，私有日志/截图/PDF均留本机。

校园真实线上增量、正式Side Panel容器、非MA6081真实课程回归尚未完成；限定检查到的既有clean-rebuild保存源仍属MA6081，不拿合成探针或受控变更冒充真实课程。P063允许需校园登录/线上变更/用户操作时列Human待测，未越权扫描。GAI原页待核读是覆盖缺口，不标源完整。这些请Human在Gate5决定PASS/FAIL，工程不代签。正式换包后需reload扩展并刷新旧NTU页，本轮未碰原profile。

成本：新增模型请求/费用/充值/余额查询/UNKNOWN释放均0。真实trusted、旧forced Confirm、原profiles/备份/RC1ZIP/历史账本保持。无新架构或全课审计。

## Changed Files / 定点回传

以下23项payload及CHANGED_FILES/SYNC_RECEIPT，仅明确路径写回Drive Desktop。旧基线核对、原位整文件复制、逐文件SHA回读；挂载回读不等于服务器确认。

- `extension/src/app/app.css`
- `extension/src/v2/screens/course.ts`
- `extension/src/v2/assessments.ts`
- `scripts/lib/v030-product-preview.mjs`
- `scripts/v030-product-056-browser.mjs`
- `scripts/v030-product-063-seed.mjs`
- `scripts/v030-product-063-open-preview.mjs`
- `scripts/v030-product-063-preview-check.mjs`
- `scripts/v030-product-063-print-audit.py`
- `scripts/v030-product-063-decision-check.mjs`
- `scripts/v030-product-063-backup-clicks.mjs`
- `scripts/v030-product-063-rebuild-clicks.mjs`
- `docs/versions/v0.3.0/PRD_v0.3.0.md`
- `docs/versions/v0.3.0/Interaction_and_Information_Architecture_Spec_v0.3.0.md`
- `docs/versions/v0.3.0/DECISION_LOG_v0.3.0.md`
- `docs/versions/v0.3.0/TECHNICAL_DESIGN_v0.3.0.md`
- `docs/versions/v0.3.0/ENGINEERING_REPORT_v0.3.0.md`
- `docs/versions/v0.3.0/RC2_ACCEPTANCE_STATUS_v0.3.0.md`
- `docs/versions/v0.3.0/RC2_HUMAN_GATE5_v0.3.0.md`
- `docs/versions/v0.3.0/engineering-handoffs/E2P-v0.3.0-2026-11-02-053.md`
- `artifacts/v0.3.0/rc2/Syllab_v0.3.0_RC2_candidate.zip`
- `artifacts/v0.3.0/rc2/RC2_MANIFEST.json`
- `docs/collaboration/CODEX_TO_CHATGPT_HANDOFF.md`
- `artifacts/v0.3.0/rc2/CHANGED_FILES.json`
- `artifacts/v0.3.0/rc2/SYNC_RECEIPT.json`

P063唯一Inbox已定点入站（SHA 9de967e97839c261f2a07c29dc2703530d5426555ed53c1951d11c6d3a78a3d0），旧本机P061保全；旧053 Outbox按字节归档。同一长期Inbox/Outbox，不另造。授权来源原件只在已有受限证据目录，私有delta/课程截图/PDF/raw/profile/reasoning不随普通payload上传。

## Human Gate5停止点

候选与工程验收材料交付后停止。请用户按指南实际操作并集中给出PASS/FAIL；未经实际PASS不得发布或改Git历史，不自动迁移真实trusted。
