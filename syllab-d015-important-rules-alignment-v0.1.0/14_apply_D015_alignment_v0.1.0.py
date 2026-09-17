#!/usr/bin/env python3
from pathlib import Path
import argparse
import os
import re
import tempfile

TARGETS = [
    "01_Syllab_PRD_v0.1.0.md",
    "05_Product_Decision_Log_v0.1.0.md",
    "07_Technical_Design_v0.1.0.md",
    "08_Implementation_Plan_v0.1.0.md",
]
D015_TITLE = "## D-015｜MVP Important Rules 的 Grade-Impact Boundary"
REPORT_NAME = "D015_APPLIED_CHANGE_REPORT_v0.1.0.md"

def locate_docset(root: Path) -> Path:
    root = root.resolve()
    by_parent = {}
    for p in root.rglob("*"):
        if p.is_file() and p.name in TARGETS:
            by_parent.setdefault(p.parent, set()).add(p.name)
    candidates = [d for d, names in by_parent.items() if all(t in names for t in TARGETS)]
    if len(candidates) == 1:
        return candidates[0]
    if not candidates:
        detail = "\n".join(
            f"- {d}: {', '.join(sorted(names))}"
            for d, names in sorted(by_parent.items(), key=lambda x: str(x[0]))
        ) or "(none)"
        raise SystemExit(
            "BLOCKED: could not find one directory containing all four formal docs.\n"
            "Files found by directory:\n" + detail
        )
    raise SystemExit(
        "BLOCKED: multiple complete formal-doc directories found. "
        "Re-run with --docs-dir <intended-directory>:\n" +
        "\n".join(f"- {d}" for d in candidates)
    )

def section_bounds(text: str, heading: str, max_level: int):
    start = text.find(heading)
    if start < 0:
        raise ValueError(f"required heading not found: {heading}")
    pat = re.compile(rf"(?m)^#{{1,{max_level}}} .+$")
    m = pat.search(text, start + len(heading))
    return start, (m.start() if m else len(text))

def replace_once_in_section(text, heading, max_level, old, new):
    s, e = section_bounds(text, heading, max_level)
    sec = text[s:e]
    n = sec.count(old)
    if n != 1:
        raise ValueError(f"{heading}: expected exactly 1 anchor `{old}`, found {n}")
    return text[:s] + sec.replace(old, new, 1) + text[e:]

def insert_before_once_in_section(text, heading, max_level, anchor, insertion):
    s, e = section_bounds(text, heading, max_level)
    sec = text[s:e]
    n = sec.count(anchor)
    if n != 1:
        raise ValueError(f"{heading}: expected exactly 1 insertion anchor `{anchor}`, found {n}")
    return text[:s] + sec.replace(anchor, insertion + anchor, 1) + text[e:]

def replace_unique_line_regex(text, pattern, replacement, label):
    matches = list(re.finditer(pattern, text, flags=re.M))
    if len(matches) != 1:
        raise ValueError(f"{label}: expected exactly 1 regex match, found {len(matches)}")
    m = matches[0]
    return text[:m.start()] + replacement + text[m.end():]

def patch_prd(text):
    if "D-015 Grade-Impact Boundary" not in text:
        old = "- 其他明显影响学生行动的重要规则。"
        new = (
            "- 其他对 marks、grading、assessment validity、assessment eligibility "
            "或有成绩要求的课程义务存在直接或较近影响的 course-level rules。\n\n"
            "**D-015 Grade-Impact Boundary**：Important Rules 只收录违反后会直接，或通过很短且明确的因果链，"
            "影响 marks、grading、assessment validity、assessment eligibility，或有成绩要求的课程义务是否完成的 "
            "course-level rules。Assessment-specific Rule 继续归入对应 Assessment。通用 copyright、材料传播、privacy、"
            "campus conduct 或政策性 boilerplate，如果与成绩的联系只是远距离、推测性或依赖独立纪律流程，默认不纳入。"
        )
        text = replace_once_in_section(text, "## 13.2 MVP 提取范围", 2, old, new)

    old2 = "- 其他高影响规则。"
    new2 = "- 其他对 marks、grading、assessment validity、assessment eligibility 或有成绩要求的课程义务存在直接或较近影响的 course-level rules。"
    if old2 in text:
        text = replace_once_in_section(text, "## 27.5 规则验收", 2, old2, new2)

    marker = "- 不因规则看起来“重要”、语气严肃或属于正式政策就自动纳入；"
    if marker not in text:
        text = insert_before_once_in_section(
            text, "## 27.5 规则验收", 2,
            "- 将普通说明误判为正式规则；",
            marker + "\n- 不根据远距离纪律后果、一般风险或常识推导 grade impact；\n"
        )
    return text

def d015_block():
    return """
---

## D-015｜MVP Important Rules 的 Grade-Impact Boundary

**状态**：已确认

### 观察

真实扫描中出现两类 course-level rule：

A：

> All written assignments must be submitted via Turnitin/NTULearn.

B：

> All course materials are for students’ own educational purposes only and shall not be uploaded, reproduced, distributed, republished, or transmitted without the University’s written approval; photographing, filming, audio recording, or otherwise capturing content during lectures and/or tutorials is not permitted.

如果只使用“影响学生行动”作为兜底条件，B 这类通用政策也容易进入 Important Rules，导致该类别变成政策垃圾桶。

### 为什么重要

MVP Course Brief 需要保留真正会影响学生成绩和 Assessment 完成的规则，同时避免把版权、材料传播、隐私、校园行为和大学政策 boilerplate 大量送入 Review。

### 产品决定

MVP Important Rules 的核心收录标准为：

> **违反后会直接，或通过很短且明确的因果链，影响 marks、grading、assessment validity、assessment eligibility，或有成绩要求的课程义务是否完成的 course-level rules。**

- Assessment-specific Rule 继续归入对应 Assessment；
- course-level Rule 才可能进入独立 Important Rules；
- direct grade impact 可以收录；
- 较近且明确的 indirect grade impact 可以收录；
- 远距离、推测性、依赖独立纪律流程的可能后果不收录；
- 不允许因为规则“重要”“正式”“禁止”或属于大学政策就自动纳入；
- 不允许根据常识脑补 disciplinary consequence → grade impact。

实例：

- A：**Include**。mandatory course-wide submission channel 直接约束有效提交方式。
- B：**Exclude by default**。无明确近距离成绩后果时，copyright / redistribution / recording policy 不进入 Important Rules。

典型 Inclusion：

- Late Penalty；
- 明确影响 marks 的 attendance threshold；
- 明确影响 assessment eligibility 的 attendance / prerequisite；
- mandatory course-wide submission channel；
- 明确导致 submission invalid / not graded 的 course-level format / process requirement。

典型 Exclusion：

- 通用 copyright / intellectual property；
- 材料不得转载、传播、上传；
- 一般禁止拍照、录音、录像；
- 通用 privacy / campus conduct / acceptable-use policy；
- 仅通过较远 disciplinary process 才可能影响学业的规则；
- 没有 grade / assessment consequence 的普通 attendance expectation。

如果通常属于 Exclusion 的规则在当前课程文本中明确给出近距离成绩后果，则按实际 Grade-Impact 判断。若后果只针对某个 Assessment，则归入该 Assessment。

### 执行责任

1. **AI Prompt**：主语义判断层；只提取符合 Grade-Impact Boundary 的 Important Rule；禁止远距离推测。
2. **Local deterministic validator**：保守 backstop；拦截没有 grade / assessment consequence 的明显 policy boilerplate；不创建 Candidate，不独立推导远距离 grade impact，不做激进 hard filter。
3. **Review**：最终用户确认；不作为明显 policy boilerplate 的垃圾回收层。近距离 grade impact 真实存在但事实仍有歧义时，可以进入 Needs Review。

### Evaluation 最小回归集

1. mandatory Turnitin / NTULearn submission channel → Include；
2. Late penalty → Include；
3. attendance 明确关联 participation marks / assessment eligibility → Include；
4. 普通 attendance expectation，无 grade consequence → Exclude；
5. copyright / redistribution / recording prohibition，无 grade consequence → Exclude；
6. general university conduct / privacy / acceptable-use policy，无 grade consequence → Exclude；
7. generic academic integrity policy link，无本课程具体成绩后果 → Exclude；
8. academic integrity rule 明确导致某 Assessment 0 marks → Include；Assessment-specific 时归入 Assessment。

### 对后续阶段的影响

- 不修改 Course Brief 主结构；
- 不修改 Review 主结构；
- 不修改 Candidate / Brief schema；
- 不修改 IA；
- 不修改 Provider / Model；
- 不修改 D-014；
- Phase 7 AI Extraction 的 Prompt、产品边界过滤和 Evaluation 按本决定收窄。

**决定日期**：2026-09-17
""".lstrip()

def patch_decision(text):
    if D015_TITLE in text:
        return text
    if "## D-014" not in text:
        raise ValueError("D-014 not found. Refusing to apply D-015 to a stale pre-D-014 Decision Log.")
    return text.rstrip() + "\n\n" + d015_block().rstrip() + "\n"

def patch_td(text):
    final_line = "- Important Rule：仅限符合 D-015 Grade-Impact Boundary 的 course-level rule；Assessment-specific Rule 归入对应 Assessment；"
    if final_line not in text:
        # Robust against D-014 wording changes: only require one Important Rule output-definition bullet.
        text = replace_unique_line_regex(
            text,
            r"^- Important Rule：.*$",
            final_line,
            "Technical Design Important Rule output line"
        )

    if "**D-015 多层门禁**" not in text:
        routes = list(re.finditer(r"^路由：.*$", text, flags=re.M))
        if len(routes) != 1:
            raise ValueError(f"Technical Design risk-routing line: expected exactly 1 `路由：...` line, found {len(routes)}")
        insertion = (
            "**D-015 多层门禁**：AI Prompt 是 Grade-Impact 的主语义判断层；本地 deterministic validator "
            "只作为保守 backstop，拦截没有 source-supported grade / assessment consequence 的明显 policy boilerplate，"
            "不得创建 Candidate、不得根据远距离 disciplinary chain 推导 grade impact，也不得用激进关键词过滤造成漏检。"
            "Review 是最终用户确认层，但不承担接收明显 policy boilerplate 的职责。mandatory course-wide Turnitin / NTULearn "
            "submission channel 是 Include 正例；generic copyright / redistribution / lecture recording policy 是 Exclude 反例，"
            "除非当前课程来源明确给出近距离 marks / eligibility / assessment-validity 后果。\n\n"
        )
        m = routes[0]
        text = text[:m.start()] + insertion + text[m.start():]
    return text

def find_phase7_bounds(text):
    m = re.search(r"(?m)^## .*阶段 7.*AI extraction.*$", text)
    if not m:
        raise ValueError("Implementation Plan Phase 7 AI extraction heading not found")
    start = m.start()
    nxt = re.search(r"(?m)^## ", text[m.end():])
    end = (m.end() + nxt.start()) if nxt else len(text)
    return start, end

def patch_plan(text):
    s, e = find_phase7_bounds(text)
    sec = text[s:e]

    marker = "- D-015 Grade-Impact prompt gate：course-level Important Rule 只允许直接或短且明确影响 marks / grading / assessment validity / eligibility 的规则；Assessment-specific Rule 归入 Assessment；"
    if marker not in sec:
        candidates = list(re.finditer(r"(?m)^- .*Important Rule.*JSON Schema.*$", sec))
        if len(candidates) != 1:
            raise ValueError(f"Implementation Plan Phase 7 JSON Schema anchor: expected exactly 1 match, found {len(candidates)}")
        m = candidates[0]
        extra = (
            "\n" + marker +
            "\n- conservative local boundary validator：只做明显 policy boilerplate 的保守 backstop，不创建 Candidate，不脑补远距离 grade impact；"
            "\n- D-015 evaluation / regression：固定 Turnitin 正例、copyright / recording 反例、attendance 正反例、academic-integrity 正反例；"
        )
        sec = sec[:m.end()] + extra + sec[m.end():]

    acc = "- mandatory course-wide Turnitin / NTULearn submission channel 必须可进入 Important Rule；"
    if acc not in sec:
        candidates = list(re.finditer(r"(?m)^- .*非计分.*Assessment.*$", sec))
        if len(candidates) != 1:
            raise ValueError(f"Implementation Plan Phase 7 non-graded Assessment anchor: expected exactly 1 match, found {len(candidates)}")
        m = candidates[0]
        extra = (
            "\n" + acc +
            "\n- copyright / redistribution / recording policy 在无明确近距离 grade consequence 时必须被排除；"
            "\n- 普通 attendance expectation 在无 grade consequence 时不得进入 Important Rule；明确影响 marks / assessment eligibility 时应进入；"
            "\n- generic policy boilerplate 不得仅因语气严肃或“重要”进入 Review；不得通过远距离 disciplinary chain 推导 grade impact；"
        )
        sec = sec[:m.end()] + extra + sec[m.end():]

    return text[:s] + sec + text[e:]

def atomic_write(proposed, originals):
    temps = {}
    replaced = []
    try:
        for path, content in proposed.items():
            fd, tmp = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=path.parent)
            os.close(fd)
            tp = Path(tmp)
            tp.write_text(content, encoding="utf-8")
            temps[path] = tp
        for path in proposed:
            temps[path].replace(path)
            replaced.append(path)
    except Exception:
        for path in replaced:
            path.write_text(originals[path], encoding="utf-8")
        raise
    finally:
        for tp in temps.values():
            if tp.exists():
                tp.unlink()

def line_no(text, marker, heading=None, max_level=None):
    region_start = 0
    region_end = len(text)
    if heading is not None:
        region_start, region_end = section_bounds(text, heading, max_level)
    rel = text[region_start:region_end].find(marker)
    if rel < 0:
        return -1
    idx = region_start + rel
    return text[:idx].count("\n") + 1

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root", nargs="?", default=".")
    ap.add_argument("--docs-dir")
    args = ap.parse_args()

    docs = Path(args.docs_dir).resolve() if args.docs_dir else locate_docset(Path(args.root))
    print(f"[D-015] formal docs directory: {docs}")

    paths = {name: docs / name for name in TARGETS}
    originals = {}
    for name, p in paths.items():
        if not p.is_file():
            raise SystemExit(f"BLOCKED: missing {p}")
        originals[p] = p.read_text(encoding="utf-8")

    try:
        proposed = {
            paths[TARGETS[0]]: patch_prd(originals[paths[TARGETS[0]]]),
            paths[TARGETS[1]]: patch_decision(originals[paths[TARGETS[1]]]),
            paths[TARGETS[2]]: patch_td(originals[paths[TARGETS[2]]]),
            paths[TARGETS[3]]: patch_plan(originals[paths[TARGETS[3]]]),
        }
    except ValueError as exc:
        raise SystemExit(f"BLOCKED BEFORE WRITE: {exc}")

    changed = [p for p in proposed if proposed[p] != originals[p]]
    if changed:
        atomic_write({p: proposed[p] for p in changed}, originals)
        print(f"[D-015] applied changes to {len(changed)} formal documents.")
    else:
        print("[D-015] no document changes needed; D-015 appears already applied.")

    checks = [
        (TARGETS[0], "D-015 Grade-Impact Boundary", "PRD 13.2 正式 Grade-Impact 定义", "## 13.2 MVP 提取范围", 2),
        (TARGETS[0], "- 其他对 marks、grading、assessment validity、assessment eligibility 或有成绩要求的课程义务存在直接或较近影响的 course-level rules。", "PRD 27.5 Grade-Impact 验收项", "## 27.5 规则验收", 2),
        (TARGETS[0], "- 不因规则看起来“重要”、语气严肃或属于正式政策就自动纳入；", "PRD 27.5 exclusion 验收", "## 27.5 规则验收", 2),
        (TARGETS[1], D015_TITLE, "Decision Log D-015", None, None),
        (TARGETS[2], "- Important Rule：仅限符合 D-015 Grade-Impact Boundary 的 course-level rule；Assessment-specific Rule 归入对应 Assessment；", "Technical Design Important Rule 输出边界", None, None),
        (TARGETS[2], "**D-015 多层门禁**", "Technical Design 多层执行责任", None, None),
        (TARGETS[3], "- D-015 Grade-Impact prompt gate：course-level Important Rule 只允许直接或短且明确影响 marks / grading / assessment validity / eligibility 的规则；Assessment-specific Rule 归入 Assessment；", "Implementation Plan Phase 7 实现要求", None, None),
        (TARGETS[3], "- mandatory course-wide Turnitin / NTULearn submission channel 必须可进入 Important Rule；", "Implementation Plan Phase 7 验收要求", None, None),
    ]

    report = [
        "# Syllab — D-015 Applied Change Report — v0.1.0",
        "",
        f"> Formal docs directory: `{docs}`",
        "> Generated by the D-015 apply script after successful preflight/application.",
        "",
    ]
    for fname, marker, desc, heading, level in checks:
        text = paths[fname].read_text(encoding="utf-8")
        ln = line_no(text, marker, heading, level)
        if ln < 0:
            raise SystemExit(f"BLOCKED AFTER WRITE: final marker missing: {fname} / {marker}")
        report += [
            f"## `{fname}`",
            f"- Line **{ln}** — {desc}",
            f"- Marker: `{marker}`",
            "",
        ]
        print(f"{fname}:{ln} — {desc}")

    report_path = docs / REPORT_NAME
    report_path.write_text("\n".join(report).rstrip() + "\n", encoding="utf-8")

    print("")
    print("D-015 DOCS DELTA: SUCCESS")
    print(f"CHANGE REPORT: {report_path}")
    print("NEXT: implement only D-015 prompt / conservative validator / evaluation; do not reopen unrelated MVP work.")

if __name__ == "__main__":
    main()
