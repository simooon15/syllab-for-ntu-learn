# 交接包内的 sanitized evidence

本目录是 `artifacts/` 下真实验收证据的**脱敏副本**。原始文件**没有被修改**，仍在原处：
`artifacts/gates/`、`artifacts/real-test/`。交接包里放副本，是为了不改写本地历史。

## 本目录内容

| 文件 | 字节 | 是否脱敏 |
| --- | --- | --- |
| `gate-1/REPORT.md` | 2476 | 原样 |
| `gate-1/report.json` | 2827 | 原样 |
| `gate-2/REPORT.md` | 3305 | 原样 |
| `gate-2/report.json` | 4340 | 原样 |
| `real-test/trace.json` | 594 | 原样 |
| `real-test/REPORT.md` | 20142 | 已脱敏 |
| `real-test/qa-events.json` | 35286 | 已脱敏 |

## 脱敏了什么

只改了一处：真实运行 trace 里的 `head` 字段——那是**无法使用的模型响应的前若干字符**。
它在交接副本里被替换为 `[redacted: N chars of model output]`，N 保留，因为长度本身就是证据
（F35 就是靠长度与 `truncated` 判断出「答到一半被截断」的）。

`artifacts/real-test/REPORT.md` 的运行日志里也内嵌了同样的 `head`，一并按同一规则替换。

trace 里的其余字段全部保留，因为它们不是内容：计数、错误码、屏幕 id、课程代码、
`truncated` 布尔值、`maxTokens`、`outputTokens`。

## 哪些原始 evidence 因隐私**没有**进入交接包

以下文件是真实的、有证据价值的，但包含真实课程内容或可能识别到个人的信息，因此**只在本地保留**，
不进交接 ZIP。需要时由 Product Owner 自行决定是否单独提供：

| 原始路径 | 内容 | 为什么不进包 |
| --- | --- | --- |
| `artifacts/real-test/screenshots/*.png`（7 张） | 真实 NTU Learn 课程的界面截图（学期仪表盘、Review、Course Brief、导出屏） | 截图里是真实课程名、Assessment 名称与部分事实值（含测验口令）。这些属于真实课程内容，无法在不破坏证据价值的前提下脱敏 |
| `artifacts/acceptance-evidence/apple-calendar-import-2026-09-17.png`、`google-calendar-import-2026-09-17.png` | v0.1.0 时期的日历导入截图，被 `docs/versions/v0.1.0/` 的验收记录引用 | 截图里有真实 Assessment 名称与日期 |
| `.tmp/syllab-qa-profile/` | QA Chrome Profile | Product Owner 的登录态所在；硬规则：不复制、不打包、不读取 |
| `.real-test.local.json`（若存在） | 本机私有测试配置 | 硬规则：私有本地配置不进包 |

**注意：** `docs/versions/v0.1.0/*.md` 里那两条对日历导入截图的引用仍然留在文档中——它们是历史记录，
按指令不修改；对应的图片文件在本交接包里缺席，这是已知且有意为之的。

## 敏感串扫描结果

本目录内全部副本中，`sk-…` 形态的字符串出现 **0** 次。
Cookie / Authorization header / session token / 密码 / MFA secret 均未出现。
整包扫描结果见交接 ZIP 根目录的 `00_ENGINEERING_HANDOFF_README.md` 与
`docs/versions/v0.2.0/CURRENT_ENGINEERING_STATE_v0.2.0.md`。
