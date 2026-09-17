# Syllab for NTU Learn — Product Handoff — v0.1.0

> **产品版本**：v0.1.0
> **文档日期**：2026-09-17
> **最终状态**：`IMPLEMENTATION COMPLETE · GATE D PASS`
> **文档用途**：面向产品侧长期保留，记录 v0.1.0 最终实际交付、验收、问题与 Carry Over
> **产品基线**：D-001–D-015 均保留；本文档不新增、修改或推翻产品决定

---

## 1. 本版本实际交付

v0.1.0 按已确认的 PRD、Interaction / IA、D-001–D-015、Technical Design 和 Implementation Plan 完成 15 个实现阶段。

| 交付物 | 位置 | 最终状态 |
|---|---|---|
| Chrome Manifest V3 扩展 | `artifacts/Syllab_Extension_v0.1.0.zip` | 25 个文件，包含最终 popup 样式与字体，`unzip -t` PASS |
| AI Proxy Backend | 仓库 `backend/` | 服务端访问 DeepSeek；扩展不持有 provider secret |
| 验收记录 | `records/` | Gate 状态、最终验收、Gate D 明细和设计系统快照 |
| 日历证据 | `artifacts/*-calendar-import-2026-09-17.png` | Apple Calendar 与 Google Calendar 真实导入证据 |

扩展包 SHA-256：

```text
30e9c21b9e2f1c27c9aa0f6c6f73724a799c7e42549fcb38b4396226cefbdb5e
```

实际建成的产品闭环：

```text
当前课程识别
→ Discovery
→ Fetch / 精确附件权限
→ Parse
→ Normalize
→ DeepSeek Extraction
→ Review
→ Course Brief
→ 导出已确认日期到 .ics
```

已交付能力：

- 当前课程优先的入口路由和 Saved Courses 导航。
- 五阶段、有检查点、可中断、可续跑的扫描流水线。
- 只对实际发现的附件域申请精确运行时权限；拒绝后其他来源继续。
- Needs Review / Detected 两个 Review 分区，支持逐条确认、编辑、忽略、补充用户事实和分类级 Confirm all。
- Assessment-specific Date / Rule 的归属；关系不明时不自行猜测。
- Course Brief 的已确认事实、字段级未解决状态、来源证据、编辑和用户新增事实。
- Calendar 只消费已确认日期，未解决日期不导出。
- Scan again 不清空、不覆盖 Confirmed / Edited / User-added 事实。
- Complete / Partial / Failed / Interrupted / Unsupported / No Items Detected 的失败与恢复状态。

---

## 2. 与 PRD 的符合情况与重要偏差

### 2.1 范围符合

- PRD 明确的非目标没有被加入。
- D-001–D-015 没有被开发侧静默推翻或改写。
- 没有增加 Chat、Reminder、自动 Change Detection、后台监控、账号/云端存储、NTU Learn 写回或跨 Scan Ignore memory。
- 只有 Confirmed / EditedConfirmed 事实能进入 Course Brief 和 Calendar。

### 2.2 重要实际差距

以下不是未批准的范围变更，而是真实实现与验收暴露的产品意图差距：

- PRD 期望的“低成本确认”尚未完全达到：MA6084 首屏有 29 条候选，约一半重复已确认事实；MA6081 有 62 条候选待 Review。
- Course Brief 已功能性建成，但实际呈现仍包含原始 JSON、重复归属和日期归组问题，阅读成本高于产品意图。
- Important Rules 的 Grade-Impact Boundary 已实现，但真实结果仍收入部分 Assessment 参数、格式和提交机制。
- Assessment-specific ownership 已按 D-014 实现，但同一 Assessment 的多个名称仍可形成多个候选身份。
- Gate D PASS 是功能性验收结果，不等于对外生产发布就绪：扩展仍指向本地 HTTP Backend，服务端 installation / usage 状态仍为进程内存储。

---

## 3. 实际验收与验证

### 3.1 Gate 结果

| Gate | 阶段 | 结果 |
|---|---|---|
| Gate A | Phase 1–4：Foundation、Routing、Discovery、Fetch / Permission | PASS |
| Gate B | Phase 5–9：Parse、Normalize、AI Extraction、Review、Course Brief | PASS |
| Gate C | Phase 10–12：Error / Recovery、Calendar、Scan again | PASS |
| Gate D | Phase 13–15：Integration、Hardening、Final Acceptance | **PASS（2026-09-17）** |

### 3.2 自动化

`npm run ci` 最终零失败：

- Contracts：2 tests PASS。
- Extension：124 tests / 27 files PASS。
- Backend：20 tests / 5 files PASS。
- Prettier、build、strict typecheck、ESLint、Manifest validation 和 secret scan 均 PASS。

### 3.3 两门真实课程

**MA6084**

- 4 个 Assessment、11 条重要日期事实、1 条 Assessment-specific Rule、2 条 course-level Rule。
- Fetch：10 fetched / 0 denied / 0 failed（8 PDF、2 ZIP）。
- Parse：4 parsed / 6 partial / 0 unsupported / 0 failed。
- Normalize：399 units / 19 sources / 63 duplicates。
- Extraction：29 candidates。

**MA6081**

- 3 个真实 Assessment、1 条结构化重要日期。
- 62 条候选待 Review，暴露较高 Review 工作量和 Assessment 身份碎片化。

### 3.4 真实环境关键路径

- 精确附件权限 Allow 与 Deny：PASS。
- popup 关闭/重开、显式 Cancel / Continue 与旧 Brief 保护：PASS。
- 运行阶段强制终止 Service Worker，租约过期后识别 Interrupted 并从同一 scan / checkpoint 续跑：PASS。
- Backend 不可用时保留旧 Brief，恢复后不重跑 Discovery / Fetch / Parse 返回 Review：PASS。
- Apple Calendar 与 Google Calendar 导入：PASS。
- 完整付费 Scan again 与 Confirmed / Edited / User-added 事实保护：PASS。

### 3.5 NOT TESTED

以下类别因没有真实样本，明确为 `NOT TESTED`，不得解释为 PASS：

- 真实 PPTX / DOCX 端到端路径；当前仅有测试 fixture。
- 旧版 PPT / DOC 的真实出现频率与用户影响。
- 超大、无文本、损坏文件的真实行为。
- 真实单来源 Parsing Failed 隔离；当前只有自动化证据。

真实 PDF 与 ZIP 已端到端 PASS。

---

## 4. 开发过程中已修复的问题

以下问题已修复、增加回归测试并复验：

1. `Failed && recoverable` 扫描的恢复入口不可达。
2. 被取代的 `Interrupted && recoverable` 扫描仍抢占入口，导致已完成课程显示死 checkpoint 而非 Course Brief。
3. 强制终止 Service Worker 留下的租约可永久锁死扫描，并向用户显示 `SCAN_INTERRUPTED` 原始错误码。
4. Assessment 风险路由只按 `sourceId` 匹配，造成同来源不同 locator 之间串扰。
5. 未知 parent key 可使候选消失，缺 parent 时无法重新指派；现已进入 Needs Review，提供重新归属，并允许子事实挂到已存在的唯一无歧义 Assessment。

---

## 5. 当前已知问题与风险

### 5.1 有真实用户影响的未修问题

**KR-07 — Calendar 可静默漏掉已确认日期**

Calendar 选择“字段名看起来像日期”的第一个字段，而不是“值实际可解析”的第一个字段。MA6084 的 CA1 Batch 1（2026-10-23）和 Batch 2（2026-10-30）因散文 `when` 挡住 ISO `date` 而未出现在导出日历中。

**KR-08 — `Retry extraction` 可重跑付费提取**

Review 在 `0 reviewed` 时显示 `Retry extraction`，包括刚成功提取完的时刻。点击后会重跑整轮付费提取，替换已保存候选，并可丢失当前会话的 Ignore / Skip 决定。

### 5.2 其他工程发现

- **E3**：Saved Courses 和 Calendar 文件可使用 Blackboard 内部 course id，例如 `_2707113_1-syllab.ics`。
- **E4**：Service Worker 启动时从旧快照整体回写扫描列表，并发写入有被静默覆盖的风险；未观测到真实事故。
- **E5**：存储 schema 不匹配时，unhandled rejection 可静默停用 Interrupted scan recovery；未观测到真实事故。

### 5.3 已知风险与生产前置条件

- **KR-01**：已有两门真实课程证据，更多课程结构上仍可能失效。
- **KR-02 / KR-03 / KR-06**：真实 PPTX、DOCX、legacy Office、超大、无文本、损坏样本和真实解析失败隔离缺少实测。
- **KR-04**：已观测多层遍历与分页，但产品不承诺课程绝对完整。
- **KR-05**：动态精确附件权限在真实 Chrome 上 PASS，仍是后续浏览器兼容与权限体验的关注点。
- 当前扩展指向 `http://127.0.0.1:8787`；对外发布前必须改为 HTTPS Backend。
- Backend 的 installation / usage 状态在进程内存中；生产级计量、封禁和限额需要持久化适配。

---

## 6. 新发现的产品问题

以下是 Gate D 真实使用后形成的产品评审输入，不是 v0.1.0 已批准的变更：

1. **Scan 路径和动作语义过于复杂。** 首次扫描在出现可 Review 价值前需要 6 次操作，并暴露 10 余种 Continue / Retry / Restart / Scan again 变体；部分动作会影响 checkpoint、计费或候选集。
2. **Course Brief 的可读性与信息架构不足。** 包含原始 JSON、重复归属、不同 Assessment 日期混排和一个 deadline 形成多条 Calendar event；问题不只是视觉样式。
3. **Important Rules 的产品边界判别力不足。** 阅读指示、Assessment 参数、格式规格和提交机制可进入该类别；可能影响 D-015。
4. **Assessment 身份碎片化。** MA6081 一条候选暴露 15 个 `Applies to` 选项，实际仅有 3 个 Assessment，且含 2 个课程中不存在的名称；可能影响 D-014。
5. **Review 承担了过多系统整理工作。** 用户同时被要求判断真假、去重、归类、Assessment 别名与 parent relationship。
6. **状态轨道无法承担导航。** Scan 停在 checkpoint 时没有直接返回旧 Course Brief 的路径；Active Scan 入口优先级会让用户反复看到“继续扫描”。
7. **产品没有 mark。** Chrome 工具栏使用通用占位图标，popup 仅使用字母 `S`。后续 mark 需在 16px 可辨识，并遵守扁平、无渐变、无阴影的 accent-green 视觉契约。

完整证据、候选方向和待决问题见 `04_PRODUCT_DESIGN_REVIEW_INPUT_post-v0.1.0.md`。

---

## 7. Carry Over 到下一版本

本节只记录后续版本必须显式接手的事项，不替下一版本做产品决定。

### 7.1 缺陷与工程

- KR-07：Calendar 静默漏日期。
- KR-08：`Retry extraction` 重跑付费提取。
- E3：课程与日历文件使用内部 id。
- E4 / E5：Service Worker 并发回写与 schema mismatch 恢复的健壮性风险。

### 7.2 产品决策

- Canonical Assessment identity，以及对 D-014 的具体影响。
- Important Rules 的用途、归属优先级和收录边界，以及对 D-015 的具体影响。
- Review / Course Brief 信息架构、去重和 Calendar event 聚合。
- Scan 自动推进、操作语义、surface 导航与 Active Scan / old Brief 并存。
- Logo / toolbar mark 的产品方向与图标家族。

### 7.3 证据

- 获取真实 PPTX / DOCX / legacy Office / oversize / no-text / corrupt 样本，或继续保留对应 `NOT TESTED`。
- 在更多结构不同的真实课程上验证遍历、提取质量和 Review 成本。

### 7.4 生产化

- HTTPS Backend 与生产打包。
- installation / usage 持久化、生产限额、超额行为、预算和封禁策略。
- 面向产品侧以外人群的发布范围、运营与支持责任。

---

## 8. 最终版本状态

| 维度 | v0.1.0 最终状态 |
|---|---|
| 实现 | **COMPLETE** |
| Gate A / B / C / D | **PASS** |
| 真实课程功能闭环 | **PASS** |
| 自动化门禁 | **PASS** |
| 真实 PDF / ZIP | **PASS** |
| 真实 PPTX / DOCX / legacy / oversize / no-text / corrupt | **NOT TESTED** |
| 真实用户影响缺陷 | KR-07、KR-08 未修复 |
| 生产对外发布 | **NOT READY** |
| 下一版本产品决策 | **NOT DECIDED** |

最终结论：

> **Syllab for NTU Learn v0.1.0 已完成 Formal MVP 实现并通过 Gate D。该结论表示功能验收通过，不表示已达到对外生产发布状态。本文档列出的开放缺陷、`NOT TESTED` 样本类别、新产品问题和 Carry Over 必须在后续版本中被显式接手，不得因 Gate D PASS 而视为已解决。**

---

## 9. 事实源索引

| 事实 | 事实源 |
|---|---|
| v0.1.0 计划范围 | `Syllab_Technical_Design_Handoff_v0.1.0/01_Syllab_PRD_v0.1.0.md` |
| 正式产品决定 | `Syllab_Technical_Design_Handoff_v0.1.0/05_Product_Decision_Log_v0.1.0.md` |
| 最终验收、已知风险、产品反馈与 E1–E5 | `records/final-acceptance-v0.1.0.md` |
| Gate D 逐项结果 | `records/gate-d-consolidated-acceptance.md` |
| Gate 状态 | `records/implementation-gates.md` |
| Post-v0.1.0 产品评审输入 | `04_PRODUCT_DESIGN_REVIEW_INPUT_post-v0.1.0.md` |
