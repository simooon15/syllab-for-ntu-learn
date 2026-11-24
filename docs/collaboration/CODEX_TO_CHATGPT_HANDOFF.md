# Current Handoff

<!-- gdc-meta: {"schema": 1, "project_id": "03837f29ef364a71b6aacc6e138732a0", "id": "d0d5723257004f8a96f032db699cb7f1", "direction": "outbound", "status": "READY", "updated_at": "2026-11-24T16:01:02.172659+00:00", "source_git_head": "a52d40c40cea25f24c0683cb47b475fed95b39a3", "changed_files": [".gitignore", ".prettierignore", "eslint.config.js", "extension/src/app/app.css", "extension/src/app/index.ts", "extension/src/background/index.ts", "extension/src/calendar/ics.ts", "extension/src/content/index.ts", "extension/src/fetch/attachment-fetcher.ts", "extension/src/offscreen/index.ts", "extension/src/offscreen/visual-completion.ts", "extension/src/parser-worker/index.ts", "extension/src/parser/format-detector.ts", "extension/src/parser/ooxml-parser.ts", "extension/src/parser/runtime.ts", "extension/src/v2/backup.ts", "extension/src/v2/blackboard.test.ts", "extension/src/v2/blackboard.ts", "extension/src/v2/calendar-export.test.ts", "extension/src/v2/calendar-export.ts", "extension/src/v2/course-product.ts", "extension/src/v2/course-state.ts", "extension/src/v2/date-resolution.test.ts", "extension/src/v2/date-resolution.ts", "extension/src/v2/deepseek-complete.ts", "extension/src/v2/deepseek.test.ts", "extension/src/v2/direct-json.ts", "extension/src/v2/direct-review.ts", "extension/src/v2/enrollment.ts", "extension/src/v2/handler.ts", "extension/src/v2/migration.ts", "extension/src/v2/package-scheduler.ts", "extension/src/v2/physical-work.ts", "extension/src/v2/product-rebuild.ts", "extension/src/v2/restore.test.ts", "extension/src/v2/restore.ts", "extension/src/v2/screens/continuity.ts", "extension/src/v2/screens/mount.ts", "extension/src/v2/screens/print.ts", "extension/src/v2/screens/render.ts", "extension/src/v2/screens/settings.ts", "extension/src/v2/screens/test-dom.ts", "extension/src/v2/selective-course.ts", "extension/src/v2/settings.ts", "extension/src/v2/storage.ts", "extension/src/v2/store.ts", "extension/src/v2/view.ts", "extension/src/v2/workflow.ts", "packages/contracts/package.json", "scripts/evidence-inventory.mjs", "scripts/package-extension.mjs", "scripts/secret-scan.mjs", "scripts/verify-build-separation.mjs", "scripts/verify-documented-facts.mjs", "scripts/verify-package.mjs", "packages/contracts/tsconfig.build.json", "docs/collaboration/CODEX_TO_CHATGPT_HANDOFF.md"]} -->

Status: READY
From: Engineering
To: Product

## Changed Files / Sync Scope
- `.gitignore`
- `.prettierignore`
- `eslint.config.js`
- `extension/src/app/app.css`
- `extension/src/app/index.ts`
- `extension/src/background/index.ts`
- `extension/src/calendar/ics.ts`
- `extension/src/content/index.ts`
- `extension/src/fetch/attachment-fetcher.ts`
- `extension/src/offscreen/index.ts`
- `extension/src/offscreen/visual-completion.ts`
- `extension/src/parser-worker/index.ts`
- `extension/src/parser/format-detector.ts`
- `extension/src/parser/ooxml-parser.ts`
- `extension/src/parser/runtime.ts`
- `extension/src/v2/backup.ts`
- `extension/src/v2/blackboard.test.ts`
- `extension/src/v2/blackboard.ts`
- `extension/src/v2/calendar-export.test.ts`
- `extension/src/v2/calendar-export.ts`
- `extension/src/v2/course-product.ts`
- `extension/src/v2/course-state.ts`
- `extension/src/v2/date-resolution.test.ts`
- `extension/src/v2/date-resolution.ts`
- `extension/src/v2/deepseek-complete.ts`
- `extension/src/v2/deepseek.test.ts`
- `extension/src/v2/direct-json.ts`
- `extension/src/v2/direct-review.ts`
- `extension/src/v2/enrollment.ts`
- `extension/src/v2/handler.ts`
- `extension/src/v2/migration.ts`
- `extension/src/v2/package-scheduler.ts`
- `extension/src/v2/physical-work.ts`
- `extension/src/v2/product-rebuild.ts`
- `extension/src/v2/restore.test.ts`
- `extension/src/v2/restore.ts`
- `extension/src/v2/screens/continuity.ts`
- `extension/src/v2/screens/mount.ts`
- `extension/src/v2/screens/print.ts`
- `extension/src/v2/screens/render.ts`
- `extension/src/v2/screens/settings.ts`
- `extension/src/v2/screens/test-dom.ts`
- `extension/src/v2/selective-course.ts`
- `extension/src/v2/settings.ts`
- `extension/src/v2/storage.ts`
- `extension/src/v2/store.ts`
- `extension/src/v2/view.ts`
- `extension/src/v2/workflow.ts`
- `packages/contracts/package.json`
- `scripts/evidence-inventory.mjs`
- `scripts/package-extension.mjs`
- `scripts/secret-scan.mjs`
- `scripts/verify-build-separation.mjs`
- `scripts/verify-documented-facts.mjs`
- `scripts/verify-package.mjs`
- `packages/contracts/tsconfig.build.json`
- `docs/collaboration/CODEX_TO_CHATGPT_HANDOFF.md`

## Result, evidence, remaining work and next owner

## 本轮完成与状态

- **基线提交**：已将此前积累的 v0.3.0 工作区状态提交为 `a52d40c`（`feat(v0.3.0): checkpoint v0.3.0 implementation, docs, and RC2 verification state`）。
- **全仓审计与安全工程修复（未改动任何用户可见文案/交互/视觉设计）**：
  - 修复生产环境 `aiPort.execute` 漏放行 `AI_SCHEMAS.product` 及 `deepSeekTransport` 丢弃 `reasoningEffort` / `reasoningCycleGuard` 的问题。
  - 修复 `blackboard.ts` HTML 捕获分组把标签名注入正文、`backup.ts`/`restore.ts` `undefined` 摘要与重建后历史引用校验、`store.ts`/`storage.ts` `recomputeEstablished` 范围与 IDB 连接/generation 一致性、`course-state.ts` 规则变更丢失 `evidenceRefs`、`calendar-export.ts` 按 `factId` 拦截冲突日期、`date-resolution.ts` 分钟越界校验。
  - 修复 `selective-course.ts` / `course-product.ts` / `product-rebuild.ts` / `direct-review.ts` / `direct-json.ts` / `workflow.ts` / `package-scheduler.ts` / `physical-work.ts` / `enrollment.ts` 内部正确性问题。
  - 加固 `background/index.ts` 与 `offscreen/index.ts` 发送方来源校验、MV3 alarm 复位、重复 `resumeInterrupted`、`visual-completion` 与解析器/内容脚本边界，以及 UI 内部 `continuity.ts`（保留 `<textarea>` 草稿）、`mount.ts` 生命周期防竞态与打印清理。
  - 修复 CI/构建脚本：`secret-scan.mjs` 排除本地/生成目录（7.1 GB → ~3.4 MB）、`verify-build-separation.mjs` 死 `.map` 校验、`packages/contracts` 排除 `*.test.ts` 构建、`verify-documented-facts.mjs` 覆盖 v0.3.0 Technical Design、打包/校验脚本跳过 236 MB 二进制 UTF-8 解码。
- **本轮在 canonical repo 中删除的 8 个零引用历史遗留文件**（`gdc.py` 不自动传输删除操作，请产品侧/镜像侧知悉）：
  - `.spike-backups/manifest.before-ole2-removal.json`
  - `.spike-backups/popup.before-ole2-removal.js`
  - `Syllab_UI_Preview.html`
  - `extension/src/background/discovery-runner.ts`
  - `extension/src/background/extraction-runner.ts`
  - `extension/src/background/fetch-runner.ts`
  - `extension/src/background/normalize-runner.ts`
  - `extension/src/background/parse-runner.ts`
- **协作配置**：已在 canonical repo 初始化 `gpt-drive-codex`（`.gpt-drive-codex/` 已写入 `.gitignore`，短入口已追加至 `AGENTS.md`）。

## 验证结果与证据边界

- `npm run ci` 全量通过：`format:check`、`build`、`typecheck`、`lint`（0 errors / 0 warnings）、单元测试（`@syllab/extension` 101 files / 1,008 passed、`@syllab/backend` 5 files / 20 passed、`@syllab/contracts` 1 file / 2 passed）、`scripts/qa-logical-audit-scope.test.mjs`（4 passed）、`validate:manifest`、`secret:scan`、`docs:verify`、`readme:verify`、`build:qa`、`verify:builds`。
- 本轮未执行新的真实课程扫描、未调用付费模型、未改变 Human Gate 5 状态（仍为未通过/未发布），本次审计修复尚未做二次 Git commit/push。

## 重点阅读与待 Product Owner / 产品侧裁决事项

1. **高优用户可见 UI/导航缺陷**：`handler.ts` `OPEN_SCREEN` 丢弃 `semesterId` 导致学期切换失效；`CRS-06` 空课程无法打开 Add Assessment；`BKP-04` 恢复失败页 Done 无法退出；`RBL-01` 返回按钮无效；同屏重绘滚动重置为 0；`SYS-07` 错误条闪退；Side Panel 点 Settings 污染侧边栏；表单回车刷新扩展页；`.course-name` 与 `.course-card-status` 样式冲突；无障碍 `aria-label` 遮盖事实值。
2. **高优产品行为与规则决策**：`PAID_UNVERIFIED` 重试死锁与无效审计缓存策略；历史学期课程误入 Opportunity Checking 与退避缺失；`ISC-03`/`ISC-04` 缺配置等待态未触发；权限源白名单不一致；`.xlsx`/`.xls` 发现与 `flattenCapturedFields` 敏感字段过滤；`.ics` `VTIMEZONE`/`DTEND` 与 `REFERENCE`/`BACKGROUND` 日期导出策略。
3. **脚本、文档与退场决策**：`package-delivery.mjs`/`package-final-handoff.mjs`/`run-gate.mjs` v0.3.0 适配；`README.md`/`AGENTS.md`/`docs/permissions.md`/`docs/design-system.md` 与治理文档冲突收口；过时 AI 管线（~15,000+ LOC）、v0.1.0 遗留模块与 `backend/` 工作区、根目录 v0.2.0 重复文档及 ~85+ 一次性 `v030-*` 脚本的退场计划。

## 下一步负责人与停止点

- **下一步负责人**：Product Owner / 产品侧（审阅上述待裁决清单，并决定是否执行本轮审计修复的 commit/push 及入站 `P2E-065` 收口流程）。
- **停止点**：本次仅完成工程侧安全修复的本地镜像定点同步与 Handoff 发布，不代表云端上传完成，不代表 Human Gate 5 PASS，不执行发布。
