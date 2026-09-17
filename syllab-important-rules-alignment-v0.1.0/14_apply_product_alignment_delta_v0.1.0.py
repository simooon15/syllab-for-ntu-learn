#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()

PRD = ROOT / "01_Syllab_PRD_v0.1.0.md"
DL = ROOT / "05_Product_Decision_Log_v0.1.0.md"
TD = ROOT / "07_Technical_Design_v0.1.0.md"
IP = ROOT / "08_Implementation_Plan_v0.1.0.md"

FILES = [PRD, DL, TD, IP]

for p in FILES:
    if not p.exists():
        raise SystemExit(f"ERROR: required file not found: {p}")


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def write(p: Path, s: str) -> None:
    p.write_text(s, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> tuple[str, bool]:
    if new in text:
        return text, False
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 old anchor, found {count}")
    return text.replace(old, new, 1), True


def replace_once_in_section(text: str, section_start: str, section_end: str, old: str, new: str, label: str) -> tuple[str, bool]:
    s = text.find(section_start)
    if s < 0:
        raise RuntimeError(f"{label}: section start not found")
    e = text.find(section_end, s + len(section_start))
    if e < 0:
        e = len(text)
    section = text[s:e]
    if new in section:
        return text, False
    count = section.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 old anchor inside section, found {count}")
    section = section.replace(old, new, 1)
    return text[:s] + section + text[e:], True


def insert_after_once(text: str, anchor: str, block: str, marker: str, label: str) -> tuple[str, bool]:
    if marker in text:
        return text, False
    count = text.count(anchor)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 anchor, found {count}")
    return text.replace(anchor, anchor + block, 1), True


def insert_before_in_section(text: str, section_start: str, section_end: str, before: str, block: str, marker: str, label: str) -> tuple[str, bool]:
    if marker in text:
        return text, False
    s = text.find(section_start)
    if s < 0:
        raise RuntimeError(f"{label}: section start not found")
    e = text.find(section_end, s + len(section_start))
    if e < 0:
        e = len(text)
    section = text[s:e]
    pos = section.find(before)
    if pos < 0:
        raise RuntimeError(f"{label}: before-anchor not found inside section")
    absolute = s + pos
    return text[:absolute] + block + text[absolute:], True


def line_no(text: str, needle: str) -> int | None:
    i = text.find(needle)
    if i < 0:
        return None
    return text.count("\n", 0, i) + 1


changes: list[str] = []

# -----------------------------------------------------------------------------
# PRD
# -----------------------------------------------------------------------------
prd = read(PRD)
old = "- 其他明显影响学生行动的重要规则。"
new = "- 其他对成绩、计分资格、Assessment 有效性或有成绩要求的课程义务存在直接或较近影响的 course-level rule。"
prd, changed = replace_once(prd, old, new, "PRD-01 line replacement")
if changed:
    changes.append("PRD-01 replaced broad action-impact fallback")

prd_def_marker = "MVP Important Rules 只收录违反后会直接影响成绩"
prd_def_block = "\n\nMVP Important Rules 只收录违反后会直接影响成绩，或通过很短且明确的因果链影响 assessment validity、grading eligibility、marks，或有成绩要求的课程义务的 course-level rule。\n\n如果与成绩的关系很远、需要推测，或必须经过独立纪律 / 政策流程才可能产生学业后果，则不进入 Important Rules。通用版权、材料传播、课堂拍照 / 录像 / 录音、隐私、校园行为和其他政策性 boilerplate 默认排除，除非来源明确把它与成绩、计分资格或 assessment validity 直接关联。"
prd, changed = insert_after_once(prd, new, prd_def_block, prd_def_marker, "PRD-01 definition insertion")
if changed:
    changes.append("PRD-01 inserted Grade Impact definition")

old_275 = "- 其他高影响规则。"
new_275 = "- 其他对成绩、计分资格、Assessment 有效性或有成绩要求的课程义务存在直接或较近影响的 course-level rule。"
prd, changed = replace_once_in_section(
    prd,
    "## 27.5 规则验收",
    "## 27.6 用户修改量",
    old_275,
    new_275,
    "PRD-02 line replacement",
)
if changed:
    changes.append("PRD-02 replaced generic high-impact fallback")

prd_275_marker = "Course-level Important Rule 的验收使用 Grade Impact Gate"
prd_275_block = (
    "Course-level Important Rule 的验收使用 Grade Impact Gate：如果违反规则不会明确影响 marks / grade / grading eligibility / assessment validity，或这种影响只能通过很远、推测性的纪律或政策链路成立，则不应提取为 Important Rule。\n\n"
    "其中：\n\n"
    "- course-wide submission channel / late penalty / 明确 attendance grading consequence 等应识别；\n"
    "- 通用 copyright / redistribution / recording / privacy / conduct boilerplate 默认不应识别；\n"
    "- 不能因为文本出现 must / required / prohibited / mandatory 就自动判定为 Important Rule；\n"
    "- 不能自行推测没有写明的成绩后果。\n\n"
)
prd, changed = insert_before_in_section(
    prd,
    "## 27.5 规则验收",
    "## 27.6 用户修改量",
    "不能：",
    prd_275_block,
    prd_275_marker,
    "PRD-02 acceptance insertion",
)
if changed:
    changes.append("PRD-02 inserted Grade Impact acceptance criteria")

# -----------------------------------------------------------------------------
# Decision Log
# -----------------------------------------------------------------------------
dl = read(DL)
if "> **更新时间**：2026-09-16" in dl:
    dl = dl.replace("> **更新时间**：2026-09-16", "> **更新时间**：2026-09-17", 1)
    changes.append("DL-01 updated decision-log date")

d015_title = "## D-015｜MVP Course-level Important Rules 使用 Grade Impact Gate"
if d015_title not in dl:
    import re
    if re.search(r"^## D-015[｜|]", dl, flags=re.MULTILINE):
        raise RuntimeError("DL-02: D-015 is already used by another decision; stop and return to product side")
    d015 = r'''

---

## D-015｜MVP Course-level Important Rules 使用 Grade Impact Gate

**状态**：已确认

### 观察

真实扫描会把两类都带有强规则语气的文本提成 Important Rule：一类是 course-wide submission / grading requirement，另一类是 copyright、材料传播、录音录像等政策性 boilerplate。若只使用“重要”或“影响学生行动”作为边界，Important Rules 会快速变成政策垃圾桶。

### 为什么重要

Important Rules 的价值是帮助学生完成课程和 Assessment，并避免直接影响成绩的错误。过宽会增加 Review 成本和 Course Brief 噪声；过窄又可能漏掉真正影响 marks、grading eligibility 或 submission validity 的要求。

### 产品决定

MVP Course-level Important Rules 使用 **Grade Impact Gate**。

只有当一条 course-level rule：

- 违反后会直接影响成绩；或
- 通过很短、很明确的因果链影响 assessment validity、grading eligibility、marks，或有成绩要求的课程义务；

才进入独立 Important Rules。

与成绩之间只有远距离、推测性关系，或必须经过独立纪律 / 政策流程才可能产生学业后果的规则，不进入 MVP Important Rules。

实例：

- `All written assignments must be submitted via Turnitin/NTULearn.` → Include；
- 通用 course-material copyright / redistribution / lecture recording prohibition → Exclude by default。

如果后者明确写有扣分、判零分、submission invalid 或 grading eligibility 后果，则按实际 grade impact 判断。

Assessment-specific Rule 继续按 D-014 归入对应 Assessment；D-014 不变。

执行层：

- AI Extraction Prompt 是主要语义过滤层；
- Prompt Evaluation 固定正反例做回归门禁；
- 本地 deterministic validation 只做 schema、evidence、scope / relation 等确定性校验，不新增广泛关键词黑名单或通用 policy classifier；
- Review 继续作为最终纠错层，但不能用“全部先进入 Review”替代前置过滤。

### 对后续阶段的影响

- 收紧 PRD Important Rules 的正式定义；
- Technical Design 明确语义过滤职责；
- Implementation Plan Phase 7 增加 prompt / evaluation 验收；
- 不改变 IA、Review flow、Course Brief section、Candidate kind、Provider / Model 或数据 schema。

**决定日期**：2026-09-17
'''
    dl = dl.rstrip() + d015 + "\n"
    changes.append("DL-02 appended D-015 without touching D-014")

# -----------------------------------------------------------------------------
# Technical Design
# -----------------------------------------------------------------------------
td = read(TD)
old_td = "- Important Rule：PRD 允许的行动相关规则；"
new_td = "- Important Rule：仅限满足 PRD Grade Impact Gate 的 course-level rule；Assessment-specific Rule 继续关联到对应 Assessment；"
td, changed = replace_once(td, old_td, new_td, "TD-01")
if changed:
    changes.append("TD-01 narrowed Important Rule output scope")

td_marker = "Important Rule 的语义边界主要由 AI Extraction Prompt 执行"
td_block = (
    "Important Rule 的语义边界主要由 AI Extraction Prompt 执行，并通过固定 Evaluation cases 回归验证。本地 response validation 继续负责 schema、evidenceRefs、Source 存在性和确定性 scope / relation 校验；MVP 不使用广泛关键词黑名单去推断 grade impact，也不新增通用 policy classifier，以避免误杀真实高影响规则。偶发 false positive 仍可在 Review 中 Ignore / Edit，但 Review 不是主要过滤层。\n\n"
)
td, changed = insert_before_in_section(
    td,
    "### 8.3 输出结构与风险路由",
    "### 8.4 去重与关联责任",
    "路由：",
    td_block,
    td_marker,
    "TD-02",
)
if changed:
    changes.append("TD-02 documented prompt/eval/local/review responsibility")

# -----------------------------------------------------------------------------
# Implementation Plan
# -----------------------------------------------------------------------------
ip = read(IP)
ip_marker = "- Important Rule Grade Impact Gate：Extraction Prompt 只提出满足 PRD / D-015"
ip_anchor = "- Assessment、Important Date、Important Rule JSON Schema；"
ip_block = (
    "\n- Important Rule Grade Impact Gate：Extraction Prompt 只提出满足 PRD / D-015 的 course-level Important Rule；Assessment-specific Rule 继续挂到 Assessment；通用 copyright / redistribution / recording / privacy / conduct boilerplate 默认排除；不推测远距离成绩后果；\n"
    "- Important Rule Prompt Evaluation fixtures：固定 include / exclude 边界样本，作为后续 Prompt 改动的回归测试；"
)
ip, changed = insert_after_once(ip, ip_anchor, ip_block, ip_marker, "IP-01")
if changed:
    changes.append("IP-01 added Grade Impact prompt/evaluation implementation")

ip_eval_marker = "- Important Rule evaluation 至少覆盖：course-wide Turnitin / submission validity"
ip_eval_block = (
    "- Important Rule evaluation 至少覆盖：course-wide Turnitin / submission validity → include；course-wide late penalty → include；attendance 明确关联 marks / eligibility → include；只有 mandatory / expected 且无 grade consequence 的 attendance → exclude；copyright / redistribution / recording boilerplate → exclude；明确 zero-mark / grade penalty → include；\n"
    "- 不因 must / required / prohibited / mandatory 等强词单独生成 Important Rule；\n"
    "- 不用广泛 deterministic keyword blacklist 替代 Prompt 语义判断；本地 hard validation 只做已有结构、证据与关系门禁；\n"
)
ip, changed = insert_before_in_section(
    ip,
    "## 8. 阶段 7｜AI extraction",
    "## 9.",
    "**主要风险**",
    ip_eval_block,
    ip_eval_marker,
    "IP-02",
)
if changed:
    changes.append("IP-02 added boundary acceptance cases")

# All required anchors have now been validated. Only now write the four files,
# so a later anchor failure cannot leave the workspace half-patched.
write(PRD, prd)
write(DL, dl)
write(TD, td)
write(IP, ip)

# -----------------------------------------------------------------------------
# Report
# -----------------------------------------------------------------------------
print("Syllab v0.1.0 Important Rules alignment delta applied successfully.")
if changes:
    for c in changes:
        print(f"- {c}")
else:
    print("- No changes needed; all delta markers already present.")

for p, markers in [
    (PRD, ["MVP Important Rules 只收录违反后会直接影响成绩", "Course-level Important Rule 的验收使用 Grade Impact Gate"]),
    (DL, ["## D-015｜MVP Course-level Important Rules 使用 Grade Impact Gate"]),
    (TD, ["Important Rule 的语义边界主要由 AI Extraction Prompt 执行"]),
    (IP, ["- Important Rule Grade Impact Gate：Extraction Prompt 只提出满足 PRD / D-015", "- Important Rule evaluation 至少覆盖：course-wide Turnitin / submission validity"]),
]:
    text = read(p)
    for marker in markers:
        ln = line_no(text, marker)
        print(f"  {p.name}:{ln if ln else '?'}  {marker[:72]}")
