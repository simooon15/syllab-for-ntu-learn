# 00 — Engineering Handoff README

**Syllab for NTU Learn v0.2.0 · Engineering Handoff Snapshot**

这份 README 是这个交接包的**第一页**。它只回答一个问题：**现在到底是什么状态，接手时不要踩什么坑。**

生成时间：2026-09-19（本机）。冻结对象：**那一刻磁盘上的工作区**。

> **不要用 `Syllab_v0.2.0_delivery.zip` 代替这个包。** 那个 ZIP 比当前源码旧，见下方「已经 stale 的
> 生成物」。

---

```text
OBSOLETE HISTORICAL HANDOFF — DO NOT EXECUTE
```

> **仓库根目录下的 `00_CODEX_START_HERE_v0.2.0.md` 与 `CODEX_START_PROMPT_v0.2.0.txt` 已经失效。**
> 它们是 v0.2.0 **开发开始之前**的临时开发交接文件，指示的路径是「读 PRD → Technical Design →
> Implementation → Gate 1 → Gate 2」——那条路径**已经走完**。
>
> - 这两份文件**只作为开发历史 / provenance 保留**（本轮没有删除原始文件）；
> - **下一位 Codex 不得按其中的指令重新开发 v0.2.0**；
> - **当前唯一的接管入口是本 README**；
> - **新的 Codex 接管 Prompt 由 Product Owner 在独立审阅当前 Engineering Handoff 之后另行提供**，
>   本包不包含、也不预设它。
>
> 这两份文件在 `ENGINEERING_HANDOFF_MANIFEST.txt` 里同样被标注为 obsolete。

---

## 1. 当前工作区状态

| 项目 | 值 |
| --- | --- |
| 分支 | `main` |
| HEAD | `670880fe1dd2076d0a6d571adefe8bd81d164481` — 2026-09-17 21:36:35 +0800 — `chore: remove obsolete handoff packages` |
| 工作区 | **DIRTY** |
| 已修改（未暂存） | 27 个已跟踪文件 |
| 已暂存删除 | 8 个（v0.1.0 的 popup 源码与 `extension/popup.html`） |
| 未跟踪文件 | 225 个（v0.2.0 的全部新代码、文档、脚本都在这一批里）。清单收录 **223 个 / 10.07 MiB**，另 2 个是交接包自身与其 `.sha256`——它们由本次快照生成，收进清单会自相矛盾，见下 |
| 相对 HEAD 的 diff | `27 files changed, 1663 insertions(+), 467 deletions(-)`（未暂存） + 2596 deletions（已暂存） |
| 远端 | `origin` → `https://github.com/simooon15/syllab-for-ntu-learn.git`（fetch 与 push 同一地址） |

> 远端这一项在三处保持一致：本 README、`docs/versions/v0.2.0/handoff/WORKTREE_STATE.txt`、
> `worktree-state.json` 的 `copyProvenance.remotes`。

**这是一份从已有仓库复制出来的工作区。** 远端已配置，所以来源可以追溯；但**当前工作**（v0.2.0 的
全部新代码、文档与脚本）**没有任何一条 commit**，只存在于磁盘上。它与远端是否一致**无法从包内自证**
——本轮按指令不执行任何 git 写操作，也不 fetch。交接包里带了
`docs/versions/v0.2.0/handoff/`（`WORKTREE_STATE.txt`、`worktree-state.json`、`WORKTREE_DIFF.txt`、
`UNTRACKED_FILES.txt`），逐文件记录了上面每一个数字；新代码没有 diff（它们不在 git 里），
全文就是这个 ZIP 里的源码本身。

本轮冻结**没有**执行任何写操作：无 commit、无 reset、无 checkout、无 stash、无删除。

---

## 2. Gate 1 / Gate 2 是否对应当前工作区

**不对应。**

| | 时间 | 结果 | 与当前工作区的关系 |
| --- | --- | --- | --- |
| Gate 1 | 2026-09-19T08:57:37Z → 08:59:10Z | `AUTOMATED_PASS` 8/8 | **STALE** |
| Gate 2 | 2026-09-19T08:59:10Z → 09:00:43Z | `AUTOMATED_PASS` 14/14 | **STALE** |

两次 Gate 跑完之后，**有 10 个产品源码 / 工具文件被修改**（F29 / F32 / F33 / F34 / F35 的修复，
以及一处 Runner 诚实性修改），**两个 ZIP 也是在那之前打包的**。

> **`AUTOMATED_PASS` 只证明当时那个构建。它不是当前工作区代码已经通过的证明。**
> 本轮按 Product Owner 指示**没有**重跑 Gate 1 / Gate 2。

**唯一对应当前工作区的验证是 `npm run ci`（2026-09-19 18:15 本机，全绿，438 个测试）**，
且它是在最后一次源码改动之后跑的。它**不包含**真实环境验证。

---

## 3. Gate 3 状态

真实验收**跑完了一轮完整流程**，报告在 `artifacts/`（交接副本见
`docs/versions/v0.2.0/handoff/evidence/real-test/`）：

**8 PASS / 2 NOT TESTED** —— `Semester Date Resolution` 与 `Actual ICS Download` 因为真实课程里
**一条日期都没有**而测不了。

三件必须知道的事：

1. 报告里 `Calendar Preview` 一行被脚本记成了 PASS（备注 `0 events`）。**那是判断过宽**：0 个事件
   只证明空状态渲染正确。脚本已改（0 事件记 NOT TESTED），但**已生成的报告保持原样未改**。
2. 报告里 `Course Brief` 与 `Real DeepSeek` 两行是**后台定时 Check** 跑出来的，不是手工走查那一步。
3. Gate 3 的最大产出不是 PASS，而是**三个仍未解决的发现**（见下一节）。

---

## 4. 当前最重要的未决问题

| 编号 | 问题 | 状态 |
| --- | --- | --- |
| **F37** | 一次 `discovered: 0`、所有 `source-read` 全部失败的后台 Check，**仍然调用了 12 次 AI，并把 Course State 从 11 个 assessment 改成 17 个、造出 6 条新待审**。与 Interaction Spec §11.5「不制造 Review」、§11.2「Source 未变不调用 AI」直接冲突 | **UNRESOLVED，未修**（修法牵涉产品判断） |
| **F36** | 五门真实课程**没有任何一条 deadline / weight** → Calendar Export 与 Semester Date Resolution 两行**没有真实端到端验证**。成因两条都已确认：F29（公告正文被丢掉）+ MA6081 那次扫描跑在 F28 修复之前（19 个附件一个都没解析成功） | **NOT TESTED + UNRESOLVED** |
| **F35** | 真实模型在大附件单元上**答到一半被截断**。已修的是「截断被误报成 `not valid JSON`」（这句话会变成用户可见的失败原因）；**输出预算本身没动**，撞的是我们的 `maxTokens` 还是服务商的硬上限仍未定 | 部分修复，预算问题 **UNRESOLVED** |
| **F29** | 公告正文（含一张 1475 字符的展示时间表）被 `rawTextEvidence()` 整个丢掉，已修 + 加测试。**只对重新扫描生效** | 已修，`IMPLEMENTED BUT NOT REAL-ENV VERIFIED` |

---

## 5. 已经 stale 的生成物（不要引用为「当前代码已通过」）

| 生成物 | 时间 | SHA-256 |
| --- | --- | --- |
| `artifacts/gates/v0.2.0/gate-1/` | 2026-09-19T08:59:10Z | — |
| `artifacts/gates/v0.2.0/gate-2/` | 2026-09-19T09:00:43Z | — |
| `artifacts/Syllab_Extension_v0.2.0.zip` | 2026-09-19 17:00:26 | `06df24f48b8ccedc78a352b4ed2fdff77a5b10c925e62364ee5f8274ec1d1f3d` |
| `artifacts/Syllab_v0.2.0_delivery.zip` | 2026-09-19 17:00:43 | `18938531ccede8ae55ec7869279b541550fb1ed9df4fdc9b87626ba54ceeaa54` |

**仍然有效**：`extension/dist` 与 `extension/dist-qa`（2026-09-19 18:15 构建，**对应当前源码**，
其后没有源码改动）；`npm run ci` 的结论（2026-09-19 18:15）。

---

## 6. 下一位 Agent 不应该直接做什么

1. **不要把 Gate 1 / Gate 2 的 `AUTOMATED_PASS` 或那两个 ZIP 当成当前代码的证据。**
2. **不要直接继续开发产品功能。** 先读第 7 节的文档；当前有三个未决的 Product Judgment。
3. **不要自行修 F37。** 它有至少三条修法，对用户可见行为影响不同，需要 Product Owner 裁决。
4. **不要自行提高 AI 输出预算**（`TASK_A_MAX_TOKENS` 等）。那是花钱的决定，且撞的是哪一侧的上限
   还没定。
5. **不要为了让测试更好看而改代码**，也不要把未验证的部分写成 PASS。`NOT TESTED` 不是 PASS。
6. **不要用 Product Owner 的日常 Chrome Profile 做任何事**，不要复制 / 读取它，不要取密码、不要
   自动填密码、不要绕过 MFA、不要导出 Cookie。
7. **不要开始最终 Documentation Consolidation**（PRD / PRODUCT_HANDOFF / Interaction & IA Spec /
   design-system 的统一回填）——Product Owner 明确延后。
8. **不要 commit / push / 修改远端。** 本轮交接不包含任何 git 写操作。
9. **不要假设 `extension/src/` 里每个目录都在产品路径上。** v0.1.0 的旧层与新层同时存在，
   部分旧模块是死代码（例：F18 的旧 repository 用 v5 打开已升到 v6 的库）。判断前先读调用链。

---

## 7. 推荐阅读顺序

```text
1. 00_ENGINEERING_HANDOFF_README.md                     ← 你在这里
2. docs/versions/v0.2.0/CURRENT_ENGINEERING_STATE_v0.2.0.md     当前状态（入口）
3. docs/versions/v0.2.0/DIRECTION_ADJUSTMENTS_v0.2.0.md         Product Owner 已确认的方向变化
4. docs/versions/v0.2.0/GATE3_FINDINGS_v0.2.0.md                Gate 3 发现、证据、修复状态、未决事项
5. PRD_v0.2.0.md / PRODUCT_HANDOFF_v0.2.0.md /
   Interaction_and_Information_Architecture_Spec_v0.2.0.md      开工前的正式 baseline
   （注意：baseline 不等于最高优先级，见下方「版本优先级」）
6. docs/versions/v0.2.0/TECHNICAL_DESIGN_v0.2.0.md
   docs/versions/v0.2.0/IMPLEMENTATION_PLAN_v0.2.0.md           技术设计与计划
7. docs/versions/v0.2.0/ENGINEERING_CHANGE_MANIFEST_v0.2.0.md   按模块的工程变更清单
8. docs/versions/v0.2.0/handoff/                                工作区冻结快照 + sanitized evidence
9. extension/src/v2/ · scripts/ · Gate 报告                     源码与基础设施
```

### 版本优先级（读第 5 项时必看）

**PRD / PRODUCT_HANDOFF / Interaction & IA Spec 是开工前的 baseline，但它不是最高优先级。**
完整规则记在 `docs/versions/v0.2.0/DIRECTION_ADJUSTMENTS_v0.2.0.md` §0.1，这里给出结论：

1. 三份正式文档是**开工前的 baseline**；
2. `DIRECTION_ADJUSTMENTS_v0.2.0.md` 里**明确记录、且由 Product Owner 确认过的正式调整**，时间上**晚于**
   baseline；
3. 后续正式指令**明确覆盖**旧规则时，**以后续调整为准**；
4. 旧正式文档**暂时允许存在历史不一致**，留待单独进行的 `Documentation Consolidation & Final
   Acceptance` 统一回填；
5. **Claude / 任何实现助手自己提出、Product Owner 未确认的建议，不获得覆盖权。**

**已经明确发生覆盖的两条：** §2.20 覆盖 Interaction Spec §3.5（未建立课程的状态表达）；
§2.25 覆盖 Interaction Spec §2.2（工具栏入口统一 Side Panel）。**遇到这两处时，以
`DIRECTION_ADJUSTMENTS` 为准，不要"修回去"。**

---

## 8. 这个包里有什么、没有什么

**有：** 全部源码（extension / packages / backend）、tests、scripts、构建配置、manifest、
Product / QA 两套 Build 的源码与产物（`extension/dist`、`extension/dist-qa`，**对应上面写明的源码
状态**）、全部正式产品文档、Technical Design、Implementation Plan、Interaction & IA Spec、
design-system、DIRECTION_ADJUSTMENTS、GATE3_FINDINGS、CURRENT_ENGINEERING_STATE、
ENGINEERING_CHANGE_MANIFEST、Gate 报告、**sanitized** 的真实验收证据、正式 Logo 资产、README、
`.gitignore`、`.github/workflows/ci.yml`、`ENGINEERING_HANDOFF_MANIFEST.txt`（逐文件路径 / 字节 /
SHA-256）。

**没有（有意排除）：** `.git/`、`node_modules/`、`.tmp/`（含 QA Chrome Profile 与私有本地配置）、
真实课程截图的原始 PNG、`.DS_Store`、`.claude/`、`.codex/`、旧的 `artifacts/*.zip`。

**因隐私而未进入本包的证据**（原始文件仍在本地 `artifacts/`，未删除、未修改）：
`artifacts/real-test/screenshots/*.png`（7 张，真实课程界面）与
`artifacts/acceptance-evidence/*.png`（2 张，日历导入，含真实 Assessment 名称）。
逐条说明见 `docs/versions/v0.2.0/handoff/evidence/EVIDENCE_SANITIZATION.md`。

**敏感数据扫描：** 整个包已扫描 —— 无 API Key、无 Cookie、无 Authorization header、无 session
token、无 QA Profile、无 `.env` 密钥、无私有本地配置。结论记录在
`CURRENT_ENGINEERING_STATE_v0.2.0.md` 与 `ENGINEERING_HANDOFF_MANIFEST.txt`。

---

## 9. 核对这个包的方法

```bash
# 1. 逐文件核对路径 / 字节 / SHA-256
shasum -a 256 -c ENGINEERING_HANDOFF_MANIFEST.sha256   # 若用校验模式
#    或对照 ENGINEERING_HANDOFF_MANIFEST.txt 里的清单逐条检查

# 2. 核对工作区冻结是否仍然成立
git status --short -uall
git rev-parse HEAD
#    与 docs/versions/v0.2.0/handoff/worktree-state.json 对比

# 3. 核对当前源码是否仍然得到支持
npm ci && npm run ci
```

`npm run ci` 需要 Node ≥ 22（见 `package.json` 的 `engines`）。
