# Syllab for NTU Learn — MVP 闭环第一次交付 — v0.1.0

> **交付日期**：2026-09-17
> **交付内容**：v0.1.0 实现完成并通过 Gate D 的开发交接、post-v0.1.0 产品设计评审输入、Codex 交接，加上可安装的扩展包与证据图。
> **仓库状态**：`git log` HEAD = `58dcf09`，共 11 个提交。

---

## 1. 这个包里有三份主要材料，对应产品与后续工程两类读者

| 文件                                             | 给谁                                            | 怎么用                                                                                                                             |
| ------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **`PRODUCT_HANDOFF_v0.1.0.md`**                  | **产品侧**                                  | v0.1.0 长期产品档案：记录最终实际交付、PRD 偏差、验收、已修与未修问题、新产品问题、Carry Over 和最终版本状态。 |
| **`04_PRODUCT_DESIGN_REVIEW_INPUT_post-v0.1.0.md`** | **产品侧**                                  | **下一版评审输入**。把 Gate D 暴露的产品问题、证据、受影响决定、`NOT DECIDED` 候选方向和待决问题单独承载，不改写 v0.1.0 基线。 |
| **`02_CODEX_HANDOFF_v0.1.0.md`**                 | **历史工程记录**                              | 保留 `58dcf09` 之后那次交付打包接手的完整记录；其文档问题已在本次收口中处理，不再是当前 Codex handoff。 |
| **`03_CODEX_START_PROMPT_v0.1.0.txt`**          | 同上                                            | 历史启动提示词，已标记 `DO NOT RUN`。产品决策后需重新生成窄范围 Coding Handoff。 |
| **`artifacts/Syllab_Extension_v0.1.0.zip`**      | 要真实装起来的人                                | 在 `chrome://extensions` 打开开发者模式 → 加载已解压的扩展程序 → 解压后的目录。**注意它指向 `http://127.0.0.1:8787`，需要本地起后端。** |
| **`artifacts/*-calendar-import-2026-09-17.png`** | 要核对日历证据的人                              | Apple Calendar 与 Google Calendar 的导入截图。                                                                                     |
| **`records/`**                                   | **随包转交给产品侧的原始记录**                  | 四份验收记录的仓库快照：Gate 状态、最终验收、Gate D 结果表、设计系统。产品侧不用进仓库就能核对交接里的每条结论。详见 `records/README_v0.1.0.md`。 |

两份文档的分工是这一版交付的重点，而且是反向的：产品那份面对的是**已经掌握产品背景与决策的人**，所以它不讲产品是什么，只讲开发交付了什么；Codex 那份面对的是**本来就在这个仓库工作、还能直接读 git 的会话**，所以它只讲这一轮接手留下的、git 里根本没有的东西。两份都刻意不复述对方已经掌握的内容。

---

## 2. v0.1.0 一句话状态

**实现完成，Gate D PASS（2026-09-17）。** 四个界面（Saved Courses / Scan / Review / Course Brief）的完整闭环在两门真实 NTU Learn 课程上跑通：扫描 → 候选 → 用户确认 → Course Brief → 已确认日期导出 `.ics`，并且 Apple 与 Google 两个日历客户端都导入成功。

- 自动化：契约 2 + 扩展 **124**（27 个文件）+ 后端 20 个测试全部通过；格式、严格类型检查、ESLint、清单校验、密钥扫描全部通过。
- 真实的失败与恢复路径已实测：精确权限拒绝、popup 关开、显式取消与续跑、后端不可用、强制杀掉 Service Worker。
- **两个有真实用户影响的缺陷仍然是开放的**（日历导出会静默漏掉已确认日期；`Retry extraction` 会重跑付费提取），要产品决定的是出不出补丁，见产品交接第 4 节与第 6 节。
- 真实 PPTX / DOCX / 旧版 Office / 超大 / 无文本 / 损坏样本不存在，这些路径明确记为 `NOT TESTED`，不是通过。

---

## 3. 打包时做的两处处置（都记录在这里，不静默修改）

### 3.1 扩展包被重新打包过

`artifacts/Syllab_Extension_v0.1.0.zip` 在仓库里停在提交 `5db5cf1`（14:22），而 popup 的视觉重建发生在提交 `229b483`（17:20）。也就是说旧包**不含**视觉重建：里面的 `popup.css` 只有 4 198 字节（现版本 26 505），而且**完全没有 `fonts/` 目录**。谁加载旧包，看到的会是重建之前的界面，而且字体加载不到。

本次交付按仓库自己记录的程序（`15_GATE_D_TESTING_HANDOFF_v0.1.0.md` §9、`docs/gate-d-consolidated-acceptance.md` §7「从 `extension/dist` 重新打包并记录 SHA-256」）重打，并用 `unzip -t` 校验：

|          | 文件数 | `popup.css` | `fonts/` | SHA-256                                                            |
| -------- | ------ | ----------- | -------- | ------------------------------------------------------------------ |
| 旧包     | 18     | 4 198 B     | 无       | `ff76a2394d6dbc550ad37d5aaf55502db132db364a36309c3756535f18172fe8` |
| **新包** | **25** | **26 505 B** | **有**   | **`30e9c21b9e2f1c27c9aa0f6c6f73724a799c7e42549fcb38b4396226cefbdb5e`** |

重打包**没有改动任何源码**。`docs/final-acceptance-v0.1.0.md` 里记录的 `ff76a239…` 描述的是旧包；该文档里新增了一小节 `Package rebuilt after the popup visual rebuild`，保留旧 SHA 并写明新 SHA、文件数变化与原因。同一记录也在 `02_CODEX_HANDOFF_v0.1.0.md` 第 4 节。

### 3.2 交付包目录被加进 `.prettierignore`

仓库的 `npm run ci` 含 `prettier --check .`。交付包里的中文 Markdown 不在 Prettier 的排版约定内（会造成表格中文宽度错位），所以按既有两个先例（`Syllab_Technical_Design_Handoff_v0.1.0`、`syllab-important-rules-alignment-v0.1.0` 同样被忽略）把 `Syllab_MVP_Delivery_v0.1.0` 加进 `.prettierignore`，以保持 `npm run ci` 通过。

### 3.3 这个包按仓库既有的交付约定组织

没有另起一套格式，遵循的是项目里已经记录下来的三条：

- **`08_Implementation_Plan_v0.1.0.md` 阶段 15 的验收条件**——最终材料必须让产品侧能**决定发布、继续修正或调整范围**，并且所有未解决风险都要有证据、影响和产品侧可理解的结论。对应 `01` 的第 4 节与第 6 节。
- **`00_PRODUCT_HANDOFF_README_v0.1.0.md` §11 当前正式交付物**——交接包由一份说明 + 编号文档 + ZIP 组成。对应本文件、三份编号文档和 `artifacts/`。
- **`START_PROMPT_v0.1.0.md` §6 / §7 文件与语言规则**——ZIP 按 `Syllab_xxx_v0.1.0.zip` 命名；文件名与一级标题末尾都带产品版本号；文档使用中文；给下一轮用的提示词单独成文件（先例：`15_CODEX_APPLY_PROMPT_v0.1.0.txt`）。对应 `03_CODEX_START_PROMPT_v0.1.0.txt`。

---

## 4. 建议的下一步

1. `PRODUCT_HANDOFF_v0.1.0.md` 作为 v0.1.0 面向产品侧的长期最终档案保留。
2. 版本处置完成后，再把 `04_PRODUCT_DESIGN_REVIEW_INPUT_post-v0.1.0.md` 交给同一产品对话，按文档指定顺序逐项做下一版产品决策。
3. 产品决定形成后，再为下一个 Codex 会话生成新的窄范围 Coding Handoff；不继续使用历史 Formal MVP Coding prompt。
4. 本包与当前文档收口改动均保持未提交，是否提交仍由你决定。

---

## 5. 文件清单

```text
Syllab_MVP_Delivery_v0.1.0/
├── README_v0.1.0.md                       ← 本文件
├── PRODUCT_HANDOFF_v0.1.0.md              ← v0.1.0 面向产品侧的长期最终档案
├── 02_CODEX_HANDOFF_v0.1.0.md             ← 历史工程交接记录（已 superseded）
├── 03_CODEX_START_PROMPT_v0.1.0.txt       ← 历史 Codex 启动提示词（DO NOT RUN）
├── 04_PRODUCT_DESIGN_REVIEW_INPUT_post-v0.1.0.md ← Gate D 后产品设计评审输入
├── records/                               ← 随包转交给产品侧的原始记录（仓库快照）
│   ├── README_v0.1.0.md
│   ├── implementation-gates.md
│   ├── final-acceptance-v0.1.0.md
│   ├── gate-d-consolidated-acceptance.md
│   └── design-system.md
└── artifacts/
    ├── Syllab_Extension_v0.1.0.zip
    ├── apple-calendar-import-2026-09-17.png
    └── google-calendar-import-2026-09-17.png
```

命名与标题遵循仓库既有约定：文件名与一级标题末尾都带产品版本号 `v0.1.0`。
