# Syllab for NTU Learn — 交接：本次接手完成的工作 — v0.1.0

> **HISTORICAL HANDOFF · SUPERSEDED BY THE PRODUCT-CLOSURE PASS**  
> 本文保留文档收口前的接手状态。它第 5 节列出的文档问题已在本交付包随后的收口中处理，不再是待执行任务。下一个 Codex 任务应等待产品侧完成版本处置决策，然后使用新的窄范围 handoff。

> **给谁**：下一个接手这个仓库的 Codex 会话
> **生成日期**：2026-09-17 ｜ 生成时 HEAD = `58dcf09`

---

## 0. 一句话

`58dcf09` 之后有一次接手，负责 **v0.1.0 的交付打包**，没有做任何功能开发。这份文件报告那次接手**做了什么、留下了什么、以及发现但没动的问题**。

你在这个仓库工作过，`git log`、`git show` 和源码你都读得到，所以过程性内容这里不重复。**下面全部是 git 里得不到的东西**——尤其第 2 节，那些改动**都没提交**，`git log` 里根本没有。

---

## 1. 完成了哪些工作

按当时做的顺序：

1. **交付物完整性核对。** 逐项核对仓库自报的状态和磁盘上的实际产物：仓库 HEAD 与提交历史、`extension/dist` 与扩展包是否一致、CI 数字、清单校验、密钥扫描。**查出一个真问题**，见第 3 节。
2. **重打了扩展包 `artifacts/Syllab_Extension_v0.1.0.zip`。** 按仓库自己记录的程序（`15_GATE_D_TESTING_HANDOFF_v0.1.0.md` §9、`docs/gate-d-consolidated-acceptance.md` §7）从 `extension/dist` 重打，`unzip -t` 校验无错。**没有改任何源码。** 旧包与新包的差异见第 3 节。
3. **给 `docs/final-acceptance-v0.1.0.md` 补了一节记录**，标题 `Package rebuilt after the popup visual rebuild`：保留旧 SHA、写明新 SHA、文件数变化与原因。**没有改写任何既有结论或数字**——这个仓库的做法是留下「曾经如此、后来更正」的痕迹，不是抹掉。
4. **给 `.prettierignore` 加了一行**（`Syllab_MVP_Delivery_v0.1.0`）。`npm run ci` 含 `prettier --check .`，而交付包里的中文 Markdown 不在 Prettier 的排版约定内。既有两个先例（`Syllab_Technical_Design_Handoff_v0.1.0`、`syllab-important-rules-alignment-v0.1.0`）同样被忽略。
5. **生成了交付包 `Syllab_MVP_Delivery_v0.1.0/`**（含同名 zip，未跟踪）。内容见第 6 节。其中给产品侧的那份按 `08_Implementation_Plan_v0.1.0.md` 阶段 15 的验收条件组织，落在「发布 / 继续修正 / 调整范围」三个选项上。
6. **做了一次只读的文档评估**，检查全仓库有没有记录与现状不符的地方。**结论在第 5 节，一条都没改。**

全过程**没有为做出证据去改 NTU Learn 的内容，也没有重跑已经通过的真实环境测试**。

---

## 2. 留下了什么（未提交，git log 看不到）

先跑 `git status` 对照这一节。

| 状态 | 路径                                  | 是什么                                                                                               |
| ---- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `M`  | `artifacts/Syllab_Extension_v0.1.0.zip` | 重打的扩展包（第 3 节）。只改打包内容，没有改源码。                                                   |
| `M`  | `.prettierignore`                     | 加了一行，见第 1 节第 4 条。                                                                          |
| `M`  | `docs/final-acceptance-v0.1.0.md`     | 加了一节打包记录，见第 1 节第 3 条。                                                                  |
| `??` | `Syllab_MVP_Delivery_v0.1.0/`         | 交付包，见第 6 节。                                                                                   |
| `??` | `Syllab_MVP_Delivery_v0.1.0.zip`      | 同上，打包后的副本。                                                                                  |
| `??` | `Syllab_UI_Preview.html`              | **不是本次接手留下的**，接手前就在。视觉重建时的评审用临时文件，读 `extension/dist/popup.css`（要先 build）。`docs/design-system.md` §12 说它「用完可删」。 |

**这五处（不含 `Syllab_UI_Preview.html`）都还没提交，是否提交由用户决定。** 看到这一节之外的差异才是真异常——先问人，别动手。

---

## 3. 为什么要重打扩展包（你最可能被绊到的一处）

**仓库里的 `artifacts/Syllab_Extension_v0.1.0.zip` 之前停在 `5db5cf1`**，而 `229b483` 之后 popup 做了视觉重建并加入了本地字体——那个 ZIP 没有跟着重打。也就是说它曾经**不含视觉重建**：里面的 `popup.css` 是 4 198 B（现版本 26 505 B），而且**完全没有 `fonts/` 目录**。谁加载它，看到的是重建之前的界面，字体也加载不到。

重打后的实际差异：

|          | 文件数 | `popup.css`  | `fonts/` | SHA-256                                                            |
| -------- | ------ | ------------ | -------- | ------------------------------------------------------------------ |
| 旧包     | 18     | 4 198 B      | 无       | `ff76a2394d6dbc550ad37d5aaf55502db132db364a36309c3756535f18172fe8` |
| **新包** | **25** | **26 505 B** | **有**   | **`30e9c21b9e2f1c27c9aa0f6c6f73724a799c7e42549fcb38b4396226cefbdb5e`** |

---

## 4. 旧哈希还留在哪几处，为什么不要改

**旧哈希 `ff76a239…`（以及更早的 `6d554470…`）仍然留在四份记录里，这是有意的，也是正确的——那是它们在写下时的真实值。**

| 位置                                     | 值            | 状态                     |
| ---------------------------------------- | ------------- | ------------------------ |
| `docs/final-acceptance-v0.1.0.md`        | `6d554470…`、`ff76a239…` | **已加指针**，旁边那节说明新值 |
| `docs/implementation-gates.md` 第 30 行  | `ff76a239…`   | 尚未加指针               |
| `docs/gate-d-consolidated-acceptance.md` 第 102 行 | `ff76a239…` | 尚未加指针         |
| `15_GATE_D_TESTING_HANDOFF_v0.1.0.md` 第 48 行 | `6d554470…` | 尚未加指针           |

**所以你读到两个不同的 SHA 不是冲突，是同一个包的两个时间点。** 需要时给后三处补一句指向即可，**不要改数字**。

---

## 5. 评估发现、但一条都没动的文档问题

只读评估的结论，列在这里省得你重做一遍。

**该改（会误导人）**

1. `15_GATE_D_TESTING_HANDOFF_v0.1.0.md` 的状态头仍写着 `IN PROGRESS — continue current Gate D run`，§3 记的是 109 tests 与 `6d554470…`，§7 停在「后端恢复测试的下一步」——而那一半按 `final-acceptance` 已经 PASS 了。整份文件读起来像测试还没做完。**正文仍然有效**（§4 后端启动命令、§5 已通过证据清单、§8A 强杀 Service Worker 的正确操作步骤），该改的只是状态头和残缺的 §7。
2. 第 4 节列出的后三处旧 SHA 缺指针。

**该澄清（措辞与现状不符）**

3. `docs/final-acceptance-v0.1.0.md` 第 80 行与第 168 行的 "deferred artistic visual reconstruction"。视觉重建其实已经做了（`229b483` + `docs/design-system.md`）；真正推迟的是**最终艺术化绿色衬线方向**，不是「任何视觉工作」。不改的话，读的人会以为 popup 还是中性壳。

**建议改（防止后来者走回头路）**

4. 上游四份 handoff 的状态声明全部停在开工前——`00_PRODUCT_HANDOFF_README`「Formal MVP Coding 进行中」、`10_CODING_HANDOFF_README`「当前 Gate：RULE ASSOCIATION ALIGNMENT」、`11_CODING_START_PROMPT`、`12_RULE_ASSOCIATION_HANDOFF`——都在说「继续当前 Phase 5–9 Milestone」。按 `10_CODING_HANDOFF_README` §2.1 自己的 cleanup preflight 规则，它们属于「已被取代」。建议加一行历史输入横幅，**不要重写正文、更不要删**：正文是产品侧的设计记录。
5. `AGENTS.md` 没提交付包目录、`.prettierignore` 那行、以及 `Syllab_UI_Preview.html` 是什么。它既然是唯一真相源，「工作树里多了什么、为什么」在那儿有一句，能省掉每个新会话问一遍同样的问题。

**核过、不用改的**

- `docs/design-system.md` §11 说 Brief 卡片没有标题、修法还等产品决定——查过源码，`brief-card` 至今确实没有建 heading，说法仍准确。
- `docs/permissions.md`、`docs/fixture-policy.md` 与清单和现状一致。
- `docs/phase-1..4`、`docs/gate-b`、`docs/gate-c` 是阶段历史记录，不该回改。
- `.spike-backups/` 与两个 alignment 目录是归档物。

---

## 6. 交付包里有什么

`Syllab_MVP_Delivery_v0.1.0/`，未跟踪，不属于仓库内容。

| 文件                               | 是什么                                                         |
| ---------------------------------- | -------------------------------------------------------------- |
| `PRODUCT_HANDOFF_v0.1.0.md`        | 给产品侧长期保留的 v0.1.0 最终产品档案 |
| `02_CODEX_HANDOFF_v0.1.0.md`       | 本文件                                                         |
| `03_CODEX_START_PROMPT_v0.1.0.txt` | 给下一轮 Codex 的启动提示词，可直接复制粘贴                      |
| `records/`                         | 四份验收记录的仓库快照，供产品侧不进仓库核对                    |
| `artifacts/`                       | 重打的扩展包 + 两张日历导入证据图                              |

交付包自己的 `README_v0.1.0.md` 记录了它遵循了哪几条既有的交付约定。

---

## 7. 两条附注

- **构建时会烘进去的值**：`extension/scripts/build.mjs` 把 `SYLLAB_BACKEND_URL`（默认 `http://127.0.0.1:8787`）编译进产物。生产打包必须传 HTTPS 地址。
- **进度以 `docs/implementation-gates.md` 为准**；下一版做什么由产品决定，`docs/final-acceptance-v0.1.0.md` 的产品反馈与 Known risks 节是输入。`AGENTS.md` 是唯一真相源，硬规则和那条无法自动化的步骤在那里，不在这里重复。
