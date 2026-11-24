# ChatGPT → Codex 当前交接｜P2E-v0.3.0-2026-11-02-064

**Updated At:** 2026-11-02（Asia/Singapore）  
**From → To:** Product Owner + ChatGPT（产品侧）→ Codex（Engineering）  
**Status:** READY / RC2 HUMAN GATE5 TYPOGRAPHY FINDING / LIMITED REWORK AUTHORIZED / GATE5 NOT PASS / NO RELEASE / NO NEW PAID  
**Product/version:** Syllab for NTU Learn **v0.3.0**，仍是同一个 RC2 候选的受限修订，不创建 RC3、v0.4.0 或新 Gate。  
**Canonical repo:** `/Users/simonluo/罗鑫宇/Vibe Coding/Syllab for NTU Learn`；本地实际 HEAD、dirty、恢复点须按真实状态检查。  
**Engineering inbound:** E2P-v0.3.0-2026-11-02-054；`docs/versions/v0.3.0/RC2_HUMAN_GATE5_v0.3.0.md`；`artifacts/v0.3.0/rc2/RC2_MANIFEST.json`；P2E-063。  
**Human feedback:** Human 已看到当前 RC2 隔离预览截图，明确反馈“字体要修改，现在的大字太丑了”。这是 **Human Gate 5 尚未通过**的具体整改项；不应自行记录最终 Gate5 PASS 或整体产品 FAIL 签字。17 项已获授权的语义闭合结果暂保持，不重复审阅。

## 0. 本轮唯一 Product→Engineering 入站与图像证据

- **Modified** `docs/collaboration/CHATGPT_TO_CODEX_HANDOFF.md`（Google Drive 原位更新原唯一正式 Inbox，不另建第二份）。
- **New restricted QA evidence** `artifacts/v0.3.0/gate5-062-review-evidence/RC2_Gate5_typography_user_screenshot_20261102.png`；Google Drive file ID `12GoSKyG-nePY00EkSptZMbbAH9bxcaXY`。这是 Human 2026-11-02 指定的当前 RC2 桌面首屏截图，仅用于视觉/排版验收，不是课程事实 gold。该目录为现有用户受限证据目录，非 GitHub / Release。
- 上述两件是本轮产品侧实际变更；不要求重新上传过去的PDF/17项表，也不创建平行项目目录。

## 1. 产品判断与整改边界

这张截图中的主要不协调点：

1. 两张卡片的考核名称字号偏大、笔画太粗、字形偏圆厚：`Part 1 Group Presentation` 与 `Part 2 Multiple Choice Quiz` 在较小信息卡上像 display headline，不像易扫读的产品标题。标题和数值彼此争夺注意力。
2. 两处 `25%` 字号和粗度也太高，压过关键截止日期；权重仍需突出，但不必作为夸张视觉装饰。
3. 页眉课程名仍为较强烈的衬线字形，和卡片内圆厚的无衬线大标题不统一。标签、数字和正文间也应有稳定的字重梯度，而不是同时加粗。
4. 左卡 `Presentation dates` 一行在用户截图中似乎从半行开始显示、上缘有裁切痕迹。**这是需验证的疑似内滚/初始 scroll position/clip 问题**，不应未经复现就认定为确定 bug；如属真实默认显示或恢复位置缺陷，应一起修复，不靠调小字号遮掩。

**目标气质：干净、安静、克制、实用的课程信息工具**。首眼先认出考核名称、权重、关键日期、待核实；字体不应抢内容。不是重新设计IA、品牌、颜色系统，也不是换一套花哨的字体。

## 2. 已授权的有限 Typography 修正

- **字体体系统一：**优先用现有已引入、稳定可加载的一套清爽无衬线字体作为课程页标题、考核名称、权重、日期、标签和正文的主体系；减少残余 Fraunces/Space Mono 等字体混搭。具体 font-family/font fallback 由 Codex 判断，避免引入新的运行依赖、网络字体或复杂字体工程。中文和英文并列时不出现明显笔画风格落差。
- **标题缩小并减重：**考核卡标题改为偏紧凑的 medium/semibold（建议从约20–22px、font-weight 550–600、line-height 1.2–1.3 起验证；以当前CSS实测为准），不再用粗黑圆厚的 display 样式；较长标题能自然换行，不裁切/挤压其它元素。若固定 `Part X` 与名称原结构更适合，可保留，勿写课程特定字符串或强行另做一套解析。
- **权重收敛：** `25%` 等大数字建议降至约34–38px、medium/semibold，仍是卡中清楚的第一层，但与相邻日期有呼吸空间；其他权重和不同位数数值也要一致，不硬编码25%。日期继续清楚可见，优先稳定行高与排版，不能成为第二个过粗大标题。
- **课程页标题统一：**取消与卡片强烈冲突的衬线/黑体显示效果，采用同一体系下较小、更轻的页级标题。保留适当课程名称层级，不应因缩字导致识别困难。
- **正文与辅助层级：**正文 regular、必需动作与标签适当 medium；少量 font-size/weight/line-height/letter-spacing token 即可形成清楚层级。按钮样式与两打印入口保持协调。勿粗暴缩小全部文字、堆叠新图标/颜色/分割线或引入新的设计系统。
- **布局保护：**单卡、等高、内部滚动、固定详情入口、Summary / Full print、4项正式考核、Evidence及真实 Pending 不变。若标题缩小释放空间，只做必要对齐，不借机塞更多低价值字段。

上面字号是产品建议区间，**不是必须原样照搬的CSS实现方案**。由 Codex 对照截图实测、在现有组件/样式里给出稳定且整体统一的最终值。此次不为每个像素重复发起产品审议。

## 3. 验收与交付

1. 使用现有 RC2 隔离预览，在**同一初始视图/1280左右桌面视口**与 Human 截图做 before/after 并排可视比较。覆盖完整课程标题、考核卡、权重日期与按钮，而不是只截字形局部。
2. 对 380px Side Panel 语义预览检查中文/英文、长短标题、25/10/40等不同权重、较长日期及内滚/键盘。截图上左卡日期半行现象须复现和解释，若属实际故障则修复并回归；不能默认无问题。
3. 重新检查 Summary A4 与 Full A4，保留当前分别约3页/22页的用途，**页数可随排版合理变化**，但不得遗漏全部独立要求、来源、Rubric、关键冲突，也不得重叠/截断。
4. 按更改实际影响执行最小但充分的类型/CI及浏览器/打印回归；确保真实 Review/备份恢复/known pending 不被CSS或结构变更破坏。保留改动前 RC2 manifest/ZIP 的可追溯恢复点，不静默覆盖旧证据；产生可验的本次 RC2 修订 build + manifest/SHA、更新 Human Gate5 指南与唯一长期 E2P Outbox。
5. 报告「修改前后对比」「问题是否实际修复」「仍未验证的正式 Side Panel / 校园线上增量 / 非MA6081真实课程 / GAI原页」四类边界。不要将已有工程测试误写成 Human PASS。

## 4. 绝对不变的保护与最终停止点

- 本轮**只授权 Typography/必要的滚动裁切修复和关联回归**，不重新跑17项语义审核、不触碰其他产品功能和 trusted，也不重新扫描NTU、不调用模型/付费、不生成新的AI摘要、不做模型修复循环。
- 原始 Source/Clause/Evidence、私有决策原件、原候选历史、真实 trusted、备份、原 Human profile、旧 RC1 ZIP、成本账本和UNKNOWN均保全。杜绝全目录覆盖、自动清理或 hard reset。
- 不自发添加新功能，不创建新候选体系。最终**仍停在同一 v0.3.0 RC2 Human Gate5**，由用户实际浏览更新预览后给 PASS/FAIL。未经真实 Human PASS，不 commit/push/tag/release/部署/自动确认课程事实。
- 如果视觉修正以外发现实质性新产品冲突，提交最小真实 blocker；不要变成又一轮无休止的审计。

**最终目标：消除当前截图里“大字太丑、风格不统一”的明显视觉问题，用一版更轻、更协调、真正易读的 Course Brief 把同一 RC2 交回 Human Gate5。**
