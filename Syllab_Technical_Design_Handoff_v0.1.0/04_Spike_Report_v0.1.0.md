# Syllab — Technical Spike 最终报告 — v0.1.0

> **状态**：`PASS WITH KNOWN RISKS`  
> **日期**：2026-09-16  
> **测试环境**：macOS arm64；Chrome 152.0.7977.84（初始记录）；Node.js 26.0.0；npm 11.12.1  
> **真实课程样本**：1 门 Blackboard Ultra 课程，身份已脱敏  
> **最新实验实现**：0.0.9；真实返回证据最新为 v0.9（导出文件名曾误标 v0.8，内部 experiment 为 v0.9）

---

# 1. 最终结论

真实课程 API、三级内容遍历、公告正文、附件发现、跨域读取与 PDF 解析已在一门真实 NTU Learn 课程取得证据。

v0.9 已确认三个观察域均获得授权。19 个附件候选中：

- 18 个 PDF 在最终 Xythos 域返回 HTTP 200；
- 文件签名与 SHA-256 可用；
- 15 个真实 PDF 进入 PDF.js；
- 共得到 667 页按页结果；
- 其中 6 个完全 success；
- 9 个仅因部分页面没有可提取文字而 partial；
- 另 3 个 PDF 已成功访问，但受本次实验 32 MiB 传输上限影响，没有进入解析；
- 第 19 个候选实际为 XLSX，不属于本 Spike 指定文档范围，被格式签名校验正确拒绝。

因此：

> “登录态附件无法获取”已经不再是 blocker。

核心 Capture 技术路线已经通过真实 NTU Learn 环境验证，足以支持项目进入正式 MVP 技术设计与开发准备阶段。

剩余问题属于：

- 格式覆盖；
- 跨课程兼容性；
- 权限交互；
- 遍历完整性；
- 大文件处理；
- 正式工程实现。

这些问题不再阻塞 Technical Spike，但必须继续作为 Known Risks 进入 Technical Design、Implementation 和 Testing。

---

# 2. 验证矩阵

| 能力 | 状态 | 当前证据 |
|---|---|---|
| 当前课程识别 | PASS | 同一真实课程获得课程 ID / name / code |
| Course Content 发现 | PASS | 真实 outline 路由；Content API 返回真实条目 |
| Announcements 发现 | PASS | 公告列表 API HTTP 200；正文已有真实提取证据 |
| Assignments 发现 | PARTIAL | 已有文件夹 / 学习模块候选；尚不等于完整原生作业详情 |
| Whole-course traversal | PARTIAL | 已遍历 83 条内容、三级结构；仍有 child probe error |
| Native page extraction | PARTIAL | 已有真实正文；仍有部分内容缺口 |
| Attachment discovery | PASS | 发现 19 个候选；字节校验识别 18 PDF + 1 XLSX |
| 登录态附件访问 | PASS | 18/18 PDF 最终 HTTP 200，并取得真实字节和 hash |
| PDF parsing | PASS | 15 个真实 PDF 产生 667 页按页结果 |
| PPT parsing | NOT TESTED | 真实课程未验证 |
| PPTX parsing | NOT TESTED | 本地 ZIP/XML 顺序测试通过；无真实课程样本 |
| DOC parsing | NOT TESTED | 真实课程未验证 |
| DOCX parsing | NOT TESTED | 本地段落 / 表格顺序测试通过；无真实课程样本 |
| Source identity | PARTIAL | 有真实课程、原生 item ID 与附件 parent linkage；跨运行稳定性未验证 |
| Content fingerprint | PASS | source 有 hash；18 PDF 基于真实字节 SHA-256 |
| Raw Scan Result | PASS | 已形成 course / scan / sources / metadata / hash / 网络诊断 / PDF 按页内容 |

---

# 3. 关键真实环境发现

## 3.1 课程识别

课程 ID 可从 `/ultra/courses/<course-id>/outline` 获得；课程名和课程代码可从页面可见信息取得。

当前证据支持优先使用原生 ID 作为课程身份候选，但尚未证明跨课程、改名或跨运行完全稳定。

## 3.2 内容遍历

真实页面存在 Content、Announcements；Assignments 在当前课程中主要表现为内容区中的文件夹 / 学习模块，而不是独立顶层入口。

真实 Content API 根请求已经成功。

后续实验通过：

- 详情读取；
- 未知类型 child probe；
- 分页处理；
- 去重；
- 结构诊断；

进入三级内容结构。

但当前仍存在部分 speculative child request error，因此正式 MVP 必须保留 Scan Coverage，不能把“部分请求成功”包装成“整门课完整”。

## 3.3 公告正文

真实公告列表和正文已经取得成功证据。

不能把这一门课程的结果直接泛化为所有课程。

## 3.4 作业

当前只有容器和学习模块线索。

尚未完整证明：

- 原生作业描述；
- 原生 due date；
- 作业附件；
- 所有 Assignment 类型。

Spike 不启动考试、不答题、不提交，也不读取成绩和提交记录。

---

# 4. 附件与权限发现

真实课程中观察到附件链路：

```text
ntulearn.ntu.edu.sg
→ Blackboard 中间域
→ Blackboard / Xythos 最终文件域
```

18 个 PDF 已在扩展环境中取得最终 HTTP 200、真实字节和 hash。

这证明：

> 精确附件域权限可以支持真实附件访问。

但不能证明这些具体域在所有课程、学期、地区或 Blackboard 部署中固定。

产品决定 D-001 已确认：

> 正式产品优先动态申请实际发现的精确 Blackboard / Xythos host permission。

具体 Chrome permission API、用户手势要求和恢复机制留给 Technical Design。

---

# 5. 文件解析发现

## 5.1 PDF

使用本地打包 PDF.js 6.3.289。

15 个真实课程 PDF 产生 667 页按页输出。

部分 PDF 页面没有可提取文字，因此标记 partial；OCR 不在当前 Spike 范围。

表格只保留文本位置，不承诺复杂单元格重建或多栏阅读顺序完全正确。

## 5.2 PPTX

PPTX 已有本地 ZIP/XML 解析方向，并通过本地顺序测试。

但没有真实课程 PPTX，因此：

> NOT TESTED

不能写成 PASS。

## 5.3 DOCX

DOCX 已有本地段落 / 表格顺序测试。

但没有真实课程 DOCX，因此：

> NOT TESTED

不能写成 PASS。

## 5.4 Legacy PPT / DOC

旧 PPT / DOC parser 尚未实现。

MVP 方向为：

- 必须正确识别格式；
- 不能假装解析成功；
- 无法处理时可以明确标记 Unsupported；
- 是否增加 legacy parser 根据真实出现频率和技术成本后续决定。

---

# 6. 来源身份与指纹

当前实验已经获得：

- Course ID；
- 原生 Content Item ID；
- Parent linkage；
- Source metadata；
- Content hash；
- PDF 字节 hash。

但：

- signed URL 不适合作为稳定 identity；
- 页面级动态 DOM hash 含噪音；
- 跨运行 / 跨课程稳定性仍需正式 MVP 验证；
- 当前没有实现正式 Change Detection。

---

# 7. Whole-course Raw Scan 结果

最终真实实验的核心摘要：

- Source count：108；
- 状态：53 success / 54 partial / 1 failed；
- 内容：83 个条目；
- 深度：26 / 41 / 16；
- 公告正文：3 条 success；
- 附件候选：19；
- 真实 PDF：18；
- 18 个 PDF 均成功取得 HTTP 200、有效签名、字节和 hash；
- 15 个 PDF 进入 PDF.js；
- 共 667 页；
- 6 个 PDF success；
- 9 个 PDF 因部分页面没有可提取文字而 partial；
- 3 个 PDF 受 32 MiB 实验传输预算影响，没有进入解析；
- 第 19 个候选为 XLSX，正确拒绝；
- PPT / PPTX / DOC / DOCX 在本真实课程中未出现可用于端到端验证的样本；
- 整体 Scan 状态仍为 partial；
- 附件访问与 PDF 解析能力具有真实 PASS 证据。

---

# 8. Known Risks

## KR-01｜跨课程兼容性

当前真实证据主要来自一门课程。

需要在正式 MVP 测试阶段验证更多不同结构课程。

## KR-02｜PPTX / DOCX 真实端到端链路

本地 parser 方向已经存在，但真实 NTU Learn 课程样本尚未验证。

## KR-03｜Legacy PPT / DOC

正式 MVP 中至少要：

- 正确识别；
- 无法解析时明确标记 Unsupported；
- 不静默跳过；
- 不伪装成功。

是否增加完整解析能力后续根据真实频率决定。

## KR-04｜遍历完整性

当前仍有部分 speculative child request error。

正式 Capture 必须区分：

- 正常 leaf；
- 真实 traversal failure。

并保留 Scan Coverage。

## KR-05｜附件域权限

精确权限已经在当前课程中真实可行。

正式产品仍需设计：

- 动态请求时机；
- Chrome 用户手势约束；
- 用户拒绝后的 Partial；
- 后续恢复路径。

## KR-06｜大文件处理

Spike 的 32 MiB 限制只是实验预算，不是产品要求。

正式 Technical Design 需要考虑：

- batching；
- memory；
- parser 生命周期；
- 大文件失败隔离。

---

# 9. 对正式 MVP 的技术方向建议

以下只是 Spike 结论，不是最终 Technical Design：

- 当前课程识别已有真实证据支持；
- Content API 比纯 DOM 遍历更适合作为主要发现路径；
- 附件需要处理 Blackboard / Xythos 跨域链；
- PDF.js 和 ZIP/XML 是可继续评估的本地解析方向；
- Source 应保留原生 ID、父子关系和 meaningful content hash；
- 不应使用整个动态 DOM hash 作为正式身份；
- 不应沿用“任一请求成功 = 整课成功”的旧逻辑；
- Spike 代码属于一次性技术验证产物，不应直接作为生产工程基线。

---

# 10. 最终 Gate

## `PASS WITH KNOWN RISKS`

当前已真实证明的核心链路足以支持项目进入：

```text
Technical Design
→ Implementation Plan
→ Formal MVP Coding
```

但本轮 Handoff 要求 Codex 只完成：

```text
Technical Design
+
Implementation Plan
```

并停止在正式 Coding 之前。

未验证的 PPTX / DOCX 真实链路、legacy PPT / DOC、跨课程兼容性、遍历完整性、动态精确权限交互与大文件处理，全部继续作为 Known Risks。

这些项目不得被改写成已经 PASS。
