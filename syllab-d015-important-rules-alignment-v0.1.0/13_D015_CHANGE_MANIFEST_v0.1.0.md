# Syllab — D-015 Change Manifest — v0.1.0

> 目的：Codex 不需要全文 diff。  
> 运行 `14_apply_D015_alignment_v0.1.0.py` 后，脚本会自动找到正式文档目录、先完成全部 preflight，再写入。  
> 成功后自动生成 `D015_APPLIED_CHANGE_REPORT_v0.1.0.md`，其中包含实际修改后的精确行号。

## 1. PRD

### `01_Syllab_PRD_v0.1.0.md` → `## 13.2 MVP 提取范围`

旧：

```text
- 其他明显影响学生行动的重要规则。
```

改为 Grade-Impact 口径，并紧接新增 D-015 正式边界。

### `01_Syllab_PRD_v0.1.0.md` → `## 27.5 规则验收`

旧：

```text
- 其他高影响规则。
```

改为 Grade-Impact 口径。

在 `不能：` 下增加：

- 不因规则“看起来重要”、语气严肃或属于正式政策就自动纳入；
- 不根据远距离纪律后果、一般风险或常识推导 grade impact。

## 2. Decision Log

### `05_Product_Decision_Log_v0.1.0.md`

文件末尾追加：

```text
## D-015｜MVP Important Rules 的 Grade-Impact Boundary
```

要求：

- D-014 必须已存在；
- D-014 原文不动；
- A Include / B Exclude；
- Grade-Impact 定义；
- inclusion / exclusion；
- Prompt / deterministic validator / Review 多层责任；
- evaluation 最小回归集。

## 3. Technical Design

### `07_Technical_Design_v0.1.0.md`

不再依赖旧 handoff 的 `TD-01` 旧句子。

脚本会在当前 Technical Design 中寻找**唯一一条**以：

```text
- Important Rule：
```

开头的输出定义，不要求它仍然是 D-014 前的旧措辞。

统一替换为：

```text
- Important Rule：仅限符合 D-015 Grade-Impact Boundary 的 course-level rule；Assessment-specific Rule 归入对应 Assessment；
```

并在唯一的 `路由：...` 风险路由段前加入 D-015 多层门禁说明。

## 4. Implementation Plan

### `08_Implementation_Plan_v0.1.0.md` → Phase 7 AI extraction

在包含：

```text
Important Rule ... JSON Schema
```

的唯一实现项后加入：

- D-015 Grade-Impact prompt gate；
- conservative local boundary validator；
- D-015 evaluation / regression。

在“非计分不确定任务不自动确认为 Assessment”后加入 D-015 验收条件。

## 5. 不修改

- Spike
- IA
- Product Review Summary
- 旧 Coding Handoff / Start Prompt
- schema
- Review / Course Brief 主结构
- D-014

## 6. 精确行号

成功后不要自己 diff。

直接读取脚本生成的：

```text
D015_APPLIED_CHANGE_REPORT_v0.1.0.md
```

该文件会逐项写：

- 文档名；
- 最终行号；
- 修改项；
- 最终 marker。
