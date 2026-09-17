# Syllab — 产品技术评审摘要 — v0.1.0

> 面向产品负责人
> 用途：保留 v0.1.0 开发中的产品/技术 Alignment 结论，并记录最终实现结果。
> 状态：`v0.1.0 SUMMARY · GATE D PASS · NOT A POST-v0.1.0 DECISION`

## 1. 最终准备怎么搭这个 MVP

Syllab 会做成一个 Chrome 扩展，并通过一个轻量 Backend 使用 DeepSeek。整体 AI 链路已经正式收口为：

```text
Extension
→ Syllab Backend
→ DeepSeek `deepseek-flash`
```

主要部分包括：

- Popup：用户看到的 4 个主要界面，分别是 Saved Courses、Scan、Review、Course Brief；
- 页面读取层：只读当前已登录的 NTU Learn 课程页面和 Blackboard 接口；
- 后台扫描层：负责发现、下载、解析、调用 AI 和记录进度；
- 本地数据层：在浏览器本地保存课程、扫描、候选、Review 进度和 Course Brief。
- Syllab Backend：只负责 AI 访问、匿名安装认证和用量保护，不是完整的云端产品后台。

Course Brief 是用户确认后的事实层。AI 只能提出候选，不能直接改变课程事实。原始来源和原始提取值会保留，但默认隐藏。

DeepSeek API Key 只放在 Backend 的服务器 Secret 中，不进入 Extension，也不进入 GitHub。用户不需要注册或登录：首次需要 AI 时，Extension 会在后台自动生成匿名 installation identity，并取得独立 installation token；之后无感使用。

Backend 会在调用 DeepSeek 前检查每个 installation 的认证、请求频率、用量上限和全局预算。任何检查失败都会直接拒绝，不消耗 DeepSeek 额度。具体阈值在后台配置，不作为固定产品规则。

Course、Source、Evidence、Candidate、Review、Course Brief 和完整课程文件仍然主要保存在浏览器本地；Backend 默认不长期保存完整课程正文、Prompt 或 DeepSeek 完整输入输出。

## 2. Scan 大致怎么工作

用户必须点击 `Scan this course` 才会开始。系统依次完成：

```text
识别当前课程
→ 发现页面、公告、作业和文件
→ 读取内容
→ 解析 PDF / PPTX / DOCX
→ 统一整理文本与来源
→ 通过 Syllab Backend 调用 DeepSeek `deepseek-flash` 提取候选
→ 用户 Review
→ 形成 Course Brief
```

系统会记录每个已发现来源的处理结果。完成状态只表示“已发现且支持的来源处理完成”，不会宣传“整门课程 100% 找全”。

## 3. 为什么这样设计

这套结构把三类数据分开：

- 原始证据：系统从哪里读到了什么；
- AI 候选：系统建议用户确认什么；
- Course Brief：用户最终认可什么。

这样既能降低整理成本，又不会让 AI 悄悄改写事实。单个文件失败时，其他结果仍可进入 Review；用户 Edit 或 Resolve 后，原始证据仍然可以回查。

## 4. Popup 关闭后 Scan 怎么处理

关闭 Popup 不等于 Cancel。即使课程已经有旧 Course Brief，只要当前存在 Scanning、Waiting for Permission 或可恢复的 Interrupted Scan，重新打开扩展时都会优先回到当前 Scan，不会把它藏在旧 Brief 后面。

扫描进度会保存为 checkpoint（可恢复进度点）。Chrome 后台允许时，扫描继续；即使后台被浏览器回收，也不会依赖内存猜测进度。重新打开扩展后：

- 已保存的工作继续显示；
- 等待权限仍停在等待权限；
- 如果某个正在执行的步骤被意外中止，则明确显示 Interrupted；
- 用户可 Continue，从已保存进度继续；无法安全续跑时才 Try again；
- 只有用户明确点 Cancel 才主动中断。

任何中断都不会清空已有 Course Brief。

## 5. 文件权限怎么处理

扫描先发现实际文件域，再请求该精确域的权限，不预先申请广泛 Blackboard 权限。

Chrome 要求权限弹窗必须由用户点击触发。因此系统会先完成其他可继续的工作，然后显示：

- `Allow access`：用户点击后申请本次真实发现的精确域；允许后只恢复相关文件；
- `Continue without them`：不读取这些文件，其他来源继续，最终可形成 Partial。

同一次 Scan 对同一域只询问一次。这个实现符合既定 D-001，目前没有要求产品改变方向。正式 Coding 仍必须在真实 Chrome / NTU Learn 验证授权提示和恢复链路；如果实际只能请求广泛权限，会先停下交回产品确认。

## 6. Course Brief 和 Review 的数据怎么保护

Review 每次操作自动保存。分类级 `Confirm all` 只确认该类别中仍为 Detected 的条目，不覆盖已经 Edit、Ignore 或 Confirm 的内容。

Course Brief 单独保存用户认可的事实：

- Confirmed；
- Edited + Confirmed；
- User-added + Confirmed；
- 已确认主体 + 少量 Unresolved 字段。

如果用户改过值，系统只更新“当前事实”，不删除来源、AI 原始建议或冲突证据。主体仍不确定的条目继续留在 Review；未解决日期不能进入 Calendar。

## 7. Scan again 怎么避免破坏已有事实

Scan again 会创建新一轮扫描，不会清空 Course Brief。新结果先形成新候选，再与已有事实做保守匹配：

- 完全相同的事实避免重复 Review；
- 新信息、冲突或无法可靠判断是否相同的内容进入 Review；
- Edited 和 User-added 永不被扫描自动覆盖；
- 新扫描没有发现旧来源，也不会自动删除旧事实；
- 上次 Ignore 的内容允许再次出现，因为 MVP 不做 Ignore memory。

这不是自动 Change Detection，也不会出现 New / Changed / Possibly Removed 状态。

## 7.1 Assessment-specific Date / Rule Ownership（D-014）

真实 vertical slice 已证明一部分 Date / Rule 明确属于 CA1、CA2、CA3、Final Examination 等 Assessment，另一部分才是 course-level Rule。v0.1.0 已确认：

- Review 继续按 Assessments / Important Dates / Important Rules 分类，不改 nested Review；
- Assessment-specific Date / Rule 显示 `Applies to <Assessment>`；
- 归属不明确进入 Needs Review；
- Confirm child fact 不确认 parent Assessment；
- 确认后 child fact 归入 parent Assessment，不在顶层日期 / Rules 重复展示；
- 独立 Important Rules 只保留真正 course-level、high-impact、action-governing rules；
- Scan again matching 必须保守考虑 parent relationship。

这个决定补全了既有 Course Brief ownership，不增加新 surface，也不改变三个 top-level section。

## 8. 当前最大的技术风险

1. **跨课程差异**：Spike 的真实证据主要来自一门课程。不同课程的结构和作业类型可能不同，必须多课程测试。
2. **PPTX / DOCX**：本地解析方向已验证，但真实 NTU Learn 下载到最终候选的完整链路尚未验证。
3. **遍历完整性**：多层 folder 和某些 Assignment 类型可能仍有遗漏，必须保留 Coverage 与 Partial，不能宣称绝对完整。
4. **动态文件权限**：精确权限已有真实附件读取证据，但用户手势、Chrome 提示和 Allow 后恢复仍需正式验证。
5. **大文件与复杂版式**：大 PDF、复杂表格、多栏、无文本页面可能影响内存、速度和关联准确性；将通过分批、单文件隔离和明确失败状态控制。

Legacy PPT / DOC 会被正确识别；MVP 无法可靠解析时显示 Unsupported，不会假装成功。

## 9. 是否需要产品侧重新确认

D-014 Rule Association delta 已完成产品对齐并同步回 PRD、Interaction / IA、Decision Log 与 Technical Design。当前没有新的 Product-impacting Technical Conflict。

D-014 已完成产品侧确认，不需要再次做同一轮 Alignment。后续只有真实实现发现新的 Product-impacting Technical Conflict 时才回产品侧决定。

## 10. 当前 Coding 状态

Formal MVP Coding 已完成，Gate D 于 2026-09-17 PASS。Discovery → Fetch → Parse → Normalize → DeepSeek Extraction → Review → Course Brief → Calendar 已在两门真实 NTU Learn 课程上跑通。

D-014 当时的对齐记录保留为 v0.1.0 基线，不因 Gate D 后出现新问题而静默改写。

## 11. Gate D 后的产品评审输入

真实验收记录了五类下一版输入：Scan 路径和动作语义过于复杂、Course Brief 信息架构不可读、Important Rules 边界不足、Assessment 身份碎片化，以及缺少可用于工具栏的 mark。

这些是评审输入，不是本文档已确认的产品决定。证据、候选方向与待决问题见 `product-design-review-input-post-v0.1.0.md`；最终验收见 `final-acceptance-v0.1.0.md`。
