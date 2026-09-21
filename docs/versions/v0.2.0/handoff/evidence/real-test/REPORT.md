# Syllab v0.2.0 — Gate 3 real acceptance run

Produced by `npm run test:real`: the machine's own Google Chrome, the QA build of the
extension, real NTU Learn and the real DeepSeek provider. Nothing is seeded or replayed, and
every verdict below was read from the product's own QA trace.

| Step | Result | Note |
| --- | --- | --- |
| System Chrome | PASS | 153.0.8010.48 |
| QA Extension | PASS | obfhciljllabdhkbgjajgoailgoemele |
| Course Discovery | PASS | 1 semesters, 5 courses seen |
| Real DeepSeek | PASS | 12 model calls |
| Initial Review | PASS | Review screens were reached |
| Course Brief | PASS | Current Course State was written |
| Semester Date Resolution | NOT TESTED |  |
| Calendar Preview | PASS | 0 events, 0 unresolved dates |
| Actual ICS Download | NOT TESTED |  |
| Persistence | PASS | Course Brief still there after reopening the surface |

QA profile: `/Users/simonluo/Desktop/Syllab for NTU Learn_副本/.tmp/syllab-qa-profile`

This directory is machine-local: it holds real course content in its screenshots and is not
part of the delivery package. No password, cookie, session token, API key or Authorization
header is recorded anywhere in it.

## Run log

```
Syllab — real acceptance run（手动操作模式）
  QA profile: /Users/simonluo/Desktop/Syllab for NTU Learn_副本/.tmp/syllab-qa-profile
  The Product Owner's everyday Chrome profile is never opened, read or copied.

  已在运行的 QA Chrome 上继续（端口 9449）。

  现在请你自己在那个 Syllab 窗口里操作，脚本只观察和记录：
    1. 课程列表页已经打开过了，学期 / 课程发现应该已经跑过一轮；
       在这个 Syllab 页面上确认课程卡片出现
    2. 然后：点课程 → Scan course → 等 Initial Review → Confirm 每一项
       → Course Brief → More → Export calendar → Export
    3. 中途要填 DeepSeek API Key、或页面问 Same / Different 时，按提示操作即可

  脚本会在每次界面变化时自动截图，并实时记录产品自己上报的 QA trace。
  全部做完后，回到这个终端按一次回车，脚本会写好报告。

  · discovery-started {}
  · semester-detected {"firstSeen":false,"label":"AY2026/27 · Semester 1","status":"Current"}
  · course-detected {"courseCode":"MA6081","established":true,"firstSeen":false,"semester":"_321_1"}
  · course-detected {"courseCode":"MA6094","established":false,"firstSeen":false,"semester":"_321_1"}
  · course-detected {"courseCode":"MA6086","established":false,"firstSeen":false,"semester":"_321_1"}
  · course-detected {"courseCode":"MA6084","established":false,"firstSeen":false,"semester":"_321_1"}
  · course-detected {"courseCode":"MA6083","established":false,"firstSeen":false,"semester":"_321_1"}
  · enrollment {"courses":5,"currentSemesterId":"_321_1","terms":1}
  📷 01-course-discovery.png  （SEM-01）
  📷 04-course-brief.png  （CRS-01）
  · review-opened {"pending":true,"screen":"IRV-01"}
  📷 03-review.png  （IRV-01）
  📷 06-after-reload.png  （CRS-01）
  · calendar-preview {"courseCode":"MA6081","dates":0,"preview":0,"unresolved":0}
  📷 05-calendar.png  （CAL-01）
  · scan-started {"courseCode":"MA6081","established":true,"hasTab":false,"kind":"check"}
  · discovery-sources {"courseCode":"MA6081","discovered":0,"kinds":[]}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"announcement","parseStatus":"not-attempted"}
  · calendar-preview {"courseCode":"MA6081","dates":0,"preview":0,"unresolved":0}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"announcement","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"attachment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · calendar-preview {"courseCode":"MA6081","dates":0,"preview":0,"unresolved":0}
  · deepseek-task {"promptVersion":"task-a/1","task":"task-a"}
  · ai-contract-failure {"attempt":1,"detail":"AI_CONTRACT:schema:syllab.ai.task-a/1","head": "[redacted: 40 chars of model output]","length":184,"sawSchema
  · deepseek-task {"promptVersion":"task-a/1","task":"task-a"}
  · ai-contract-failure {"attempt":1,"detail":"AI_CONTRACT:schema:syllab.ai.task-a/1","head": "[redacted: 40 chars of model output]","length":184,"sawSchema
  · deepseek-task {"promptVersion":"task-a/1","task":"task-a"}
  · candidates {"assessments":1,"facts":1,"reviewItems":1}
  · deepseek-task {"promptVersion":"task-a/1","task":"task-a"}
  · candidates {"assessments":1,"facts":2,"reviewItems":1}
  · deepseek-task {"promptVersion":"task-a/1","task":"task-a"}
  · candidates {"assessments":1,"facts":6,"reviewItems":1}
  · deepseek-task {"promptVersion":"task-a/1","task":"task-a"}
  · candidates {"assessments":1,"facts":1,"reviewItems":1}
  · deepseek-task {"promptVersion":"task-a/1","task":"task-a"}
  · candidates {"assessments":1,"facts":1,"reviewItems":1}
  · deepseek-task {"promptVersion":"task-a/1","task":"task-a"}
  · candidates {"assessments":1,"facts":6,"reviewItems":1}
  · deepseek-task {"promptVersion":"task-a/1","task":"task-a"}
  · candidates {"assessments":1,"facts":3,"reviewItems":1}
  · candidates {"assessments":1,"facts":1,"reviewItems":1}
  · candidates {"assessments":1,"facts":2,"reviewItems":1}
  · candidates {"assessments":1,"facts":6,"reviewItems":1}
  · candidates {"assessments":1,"facts":1,"reviewItems":1}
  · candidates {"assessments":1,"facts":6,"reviewItems":1}
  · deepseek-task {"promptVersion":"task-a/1","task":"task-a"}
  · calendar-preview {"courseCode":"MA6081","dates":0,"preview":0,"unresolved":0}
  · deepseek-task {"promptVersion":"task-a/1","task":"task-a"}
  · calendar-preview {"courseCode":"MA6081","dates":0,"preview":0,"unresolved":0}
  · ai-contract-failure {"attempt":1,"detail":"the response was not valid JSON","head": "[redacted: 40 chars of model output]","length":6601,"task":"task-a"
  · ai-contract-failure {"attempt":2,"detail":"the response was not valid JSON","head": "[redacted: 40 chars of model output]","length":15800,"task":"task-a
  · ai-contract-failure {"attempt":1,"detail":"the response contained no message content","head": "[redacted: 40 chars of model output]","length":24000,"task"
  · ai-contract-failure {"attempt":1,"detail":"the response contained no message content","head": "[redacted: 40 chars of model output]","length":24000,"task"
  · ai-contract-failure {"attempt":3,"detail":"the response contained no message content","head": "[redacted: 40 chars of model output]","length":24000,"task"
  · calendar-preview {"courseCode":"MA6081","dates":0,"preview":0,"unresolved":0}
  · ai-contract-failure {"attempt":2,"detail":"the response was not valid JSON","head": "[redacted: 40 chars of model output]","length":18988,"task":"task-b
  · ai-contract-failure {"attempt":2,"detail":"the response was not valid JSON","head": "[redacted: 40 chars of model output]","length":14977,"task":"task-b
  · ai-contract-failure {"attempt":3,"detail":"the response contained no message content","head": "[redacted: 40 chars of model output]","length":24000,"task"
  · calendar-preview {"courseCode":"MA6081","dates":0,"preview":0,"unresolved":0}
  · ai-contract-failure {"attempt":3,"detail":"the response contained no message content","head": "[redacted: 40 chars of model output]","length":24000,"task"
  · calendar-preview {"courseCode":"MA6081","dates":0,"preview":0,"unresolved":0}
  · ai-contract-failure {"attempt":1,"detail":"the response contained no message content","head": "[redacted: 40 chars of model output]","length":24000,"task"
  · ai-contract-failure {"attempt":2,"detail":"the response was not valid JSON","head": "[redacted: 40 chars of model output]","length":24000,"task":"task-a
  · ai-contract-failure {"attempt":3,"detail":"the response contained no message content","head": "[redacted: 40 chars of model output]","length":24000,"task"
  · calendar-preview {"courseCode":"MA6081","dates":0,"preview":0,"unresolved":0}
  · ai-contract-failure {"attempt":1,"detail":"the response contained no message content","head": "[redacted: 40 chars of model output]","length":24000,"task"
  · deepseek-task {"promptVersion":"task-b/1","task":"task-b"}
  · ai-contract-failure {"attempt":1,"detail":"the response contained no message content","head": "[redacted: 40 chars of model output]","length":24000,"task"
  · ai-contract-failure {"attempt":2,"detail":"the response contained no message content","head": "[redacted: 40 chars of model output]","length":24000,"task"
  · ai-contract-failure {"attempt":3,"detail":"the response contained no message content","head": "[redacted: 40 chars of model output]","length":24000,"task"
  · calendar-preview {"courseCode":"MA6081","dates":0,"preview":0,"unresolved":0}
  · scan-started {"courseCode":"MA6081","established":true,"hasTab":false,"kind":"check"}
  · discovery-sources {"courseCode":"MA6081","discovered":0,"kinds":[]}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"announcement","parseStatus":"not-attempted"}
  · calendar-preview {"courseCode":"MA6081","dates":0,"preview":0,"unresolved":0}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"announcement","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"attachment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · course-brief {"assessments":17,"constraints":0,"facts":26,"kind":"check","reviewItems":6,"sources":119}
  · calendar-preview {"courseCode":"MA6081","dates":0,"preview":0,"unresolved":0}
  · scan-started {"courseCode":"MA6081","established":true,"hasTab":false,"kind":"check"}
  · discovery-sources {"courseCode":"MA6081","discovered":0,"kinds":[]}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"announcement","parseStatus":"not-attempted"}
  · calendar-preview {"courseCode":"MA6081","dates":0,"preview":0,"unresolved":0}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"announcement","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"attachment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"course-content-item","parseStatus":"not-attempted"}
  · source-read {"chars":0,"errorCode":"SOURCE_NOT_DISCOVERED","fetchStatus":"failed","kind":"assignment","parseStatus":"not-attempted"}
  · course-brief {"assessments":17,"constraints":0,"facts":26,"kind":"check","reviewItems":6,"sources":119}
  · calendar-preview {"courseCode":"MA6081","dates":0,"preview":0,"unresolved":0}

  记录结束，正在写报告…
  trace: /Users/simonluo/Desktop/Syllab for NTU Learn_副本/artifacts/real-test/trace.json (148 observed events)
```
