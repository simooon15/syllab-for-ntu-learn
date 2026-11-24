# Syllab v0.3.0｜RC1 Gate 5 产品整改方案

**入站：** P2E-v0.3.0-2026-10-11-055；2026-10-11（Asia/Singapore）。  
**状态：** 根因审计与待集中审阅方案；`HUMAN_GATE5_RC1_FAIL / NO_RELEASE`。  
**本轮边界：** 重大信息模型、Review/Course Brief IA 尚未实施；未改扫描、Prompt、模型参数；零新增付费调用。已有工程成果继续使用，修复目标属于 v0.3.0。Outline 优先和低于 ¥2 的研究独立，不能阻塞本版本整改。

## 1. 建议产品侧一次确认的结论

建议采用**完整观察保留 + 有证据的产品晋升 + 结构化阅读与审核**，在现有 CourseDraft、IDB、Review reducer、Check/Rebuild 上改造，保留 Local-first、BYOK、DeepSeek Flash、Evidence 和 Human trusted 边界。

本次需要确认四项产品行为变化：

1. **有证据的当前课程行动，才能进入考核/要求产品层。** 标题、命令语气、平台标志和课件中“Assignment”的出现，都不是独立任务成立的充分条件；证据不足的潜在任务进入可见待核实区，教学方法/历史/技术观察留参考层。没有分数或日期不能据此排除任务。
2. **Course Brief 主层回答学生的规划问题。** 考核总览、每项权重/日期/提交物/责任/关键限制、关键待核实；完整执行清单、评分细则、背景和证据逐层可达。完整保存与默认展示分离，不能用折叠掩盖错分或丢失。
3. **审核单位是可独立判断的业务范围。** 一个实际考核及其结构化要求可为一组；独立冲突、待核实身份和高风险规则有针对性决策。课程 Scheme 是总览，不是一张要求认可整课的卡；不改成 227 张 Fact 卡。
4. **浏览与认可分离。** 前后/目录预览不写可信数据；Confirm 明确显示和记录批准范围；不能同时暗中认可并列的未决事项。Edit、Exclude、Defer、Split、Same/Different 必须作用于画面说明的范围，刷新可恢复。

不建议重新全课深读或重写整条执行框架，也不建议在现有 Fact 上加一个自由生成的漂亮摘要。后者不能修正身份误判、字段错配与审核范围问题。

## 2. 审计基线和证据可信度

- 正式 Inbox 与 Drive Desktop 回读一致：SHA `08c5db0ce6b6dd4d70df9bc3681aa1b66deb3785dd0c82f5454158e2e30431c2`；只同步指定 1 个更新 + 2 个 PDF。当前 HEAD `26426a3793250aea351c443e3327ccdb1b95b697`，原 dirty 保留。
- Human PDF：`artifacts/v0.3.0/gate5-055-human-evidence/Syllab.pdf`，23 页；`Syllab1.pdf`，14 页。仅本项目受限评审，不公开发布。完整文本已提取，关键失败内容核读并渲染对照；打印重叠是实见现象，不自动推断正常屏幕也重叠。
- E2P-044、RC1 和保存的实际候选继续作为历史基线。候选 SHA `a92462badd32a1905188ad237c3c171e4fc74b314d7df06cd27e22654322abd5`：592 原始 Clause、227 Fact；不是 gold。
- 真实保存 Source/Clause/Link/Projection/Fact 逐层对照；原文、响应和来源身份仅保存在 private。新审计目录 `evidence/private/gate5-remediation-055/`；未修改旧请求、响应、账单、UNKNOWN 或原正式课程。
- 在**旧未确认快照的独立副本**启动经 SHA 校验的生产 RC1，拦截全部 HTTPS，实际点击 Edit/Cancel/More/Split/Exclude/Review later，检查页面及刷新。未打开原 Human 受阻 profile、未删其十次 Confirm、未用这些 Confirm 评分。
- 在该隔离场景 Edit、More、Split 有响应；Exclude 将 10 待审变 9，刷新仍 9。没有 JS pageerror。**Human 的其他按钮失效仍是有效失败报告，但不是已定位的统一点击绑定故障。** 此场景不证明受阻会话、其他视口或全部动作正常。Review later 留在 `1 of 10`，已复现无推进；首卡 Edit 仅 5 个输入（名称 + 4 个父对象 Fact），不是画面全部子项可编辑。

## 3. F-01～F-07：首次错误与后续放大

| 失败 | 首次可定位的问题 | 后续放大 / 代码位置 | 证据与判断边界 |
| --- | --- | --- | --- |
| F-01 教学指导晋升 | Reader 将标题观察标为 CURRENT identity，context 推断它是 assessed assignment；Link 建立独立 assessment 并标 KNOWN | `selective-course.ts` Reader/Link 验证关注字段/引用/状态闭合，没有独立当前任务的证据门槛；Projection 沿用 owner，不能重判身份；`view.ts`、`screens/course.ts` 按 kind 排序，指导对象先于 Scheme | 私有 `SOURCE_TO_FACT_TRACE.json`：`clause_df976a715ea45269` 到 identity assertion/25 Facts；标题后是读论文指南。**证据不足以确定独立当前考核，不等于已证实它不存在** |
| F-02 平级膨胀 | Reader 将总句、章节、子项和重复片段各作观察；Projection 的“每条一次、只选完整代表”解决等价归并，却没有义务的包含/父子/可选结构 | `course-projection.ts` accounting 与 representative 合同；`selective-course.ts` materialize 为平级 Fact；`assessments.ts` 把 other 并入 requirements；`screens/course.ts:assessmentBody` 全量遍历 | Presentation 81 Facts。要保留真正独立动作，不以 81→某固定数为目标；目录父节点和重复子句须不同处理 |
| F-03 平台配置污染 | Source native parse 把正文及平台元数据送入理解；Reader/Link 将技术观察赋予产品 owner/current 意义，Projection 未有效退回 context | `selective-course.ts` 的 Source delivery/事实编译；`course-projection.ts` 已允许 metadata→context，实测却仍输出；前端全部 Fact 同级显示 | 当前 submission 子对象 12 Facts，含 maximum points、visibility、grades released 等。**Prompt 已写避免 raw metadata，但没有达成语义验收**；不能把 flags 翻译成学生政策 |
| F-04 Mode=25% | Reader 原 `Part2.weight` 单标量为 25%，Clause 正文同时含闭卷；最终 assertion 改为 mode，却仍选同一代表标量 | `course-projection.ts` 允许语义字段更名但标量不可重写，且同 Clause 一次 accounting；`selective-course.ts` 编译取 `assertion.field` + 原 `c.value.value`；核读没有检出 | 私有 `clause_a9f35e4815e2eb09` 全链。**合成了错误字段—值组合**，不是原文缺失或 CSS。一个复合原文需要多个有证据的命题，不能通过更名解决 |
| F-05 规则/疑问堆积 | 重要操作、泛述、programme 范围和声明表单归同一个 Rule，缺少产品相关性、行动组和结构化 issue | `course-state.ts:clauseRules/constraintForReview` 串联正文；`view.ts` context 拼入 display、按每个 UNCERTAIN 生成泛问，再在 object footer 重复；`direct-review.ts` 携带覆盖/身份/来源问题；`renderConstraint` 整段显示 | 两个 Rule 分别 67/7 Facts；旧实测正文 14,021/1,078 字符；未决问题与覆盖限制不能被静默移除，但也不能每句重复 |
| F-06 审核范围/交互 | 以 entity 为 Review target；Scheme 和 children 各有卡。`ViewBuilder.buildReview` 固定 pending[0]、index=1，没有无决策浏览 cursor | `assessmentBody` 递归展示 children；Edit 只遍历 parent facts；handler Confirm 只取 target owner facts；Defer 只记录 decision，View 不据此换位置 | 首卡展示整套考核但只有父级 4 Facts 进入本次 Edit/Confirm 范围。**不能声称此 Confirm 已无条件批准全部子项；真正问题是显示范围≠决策范围**。原十次被迫 Confirm 不作 Human PASS |
| F-07 启动/打印 | 旧 launcher 固定 `launchPersistentContext(entry.profile)`，无冲突隔离；同 profile 不能可靠支持多实例 | `scripts/v030-final-054-open-review.mjs`；CSS 无专门 print 规则，flex 长文本跨页打印需另测 | 新入口每次复制旧未确认快照到唯一目录，不关/杀原 Chrome，不改旧 RC1；两个 verify-only 并发实例均成功，独立 profile 不同。PDF p4 已实见重叠；正常屏幕对应区域仍须回归，不能先断言纯 print |

旧测试的缺口不是缺少更多 DOM 数量：原自动化集中 Confirm 顺序与保真数据，未把“显示范围—编辑范围—采纳范围一致”及“不确认也能浏览”当成必测产品行为。相同模型按相同原表示核读，可能继续沿用错误分类；proof digest 表示执行过某套规则，并非独立质量证明。

## 4. 通用信息晋升标准：四个正交维度

**来源观察不等于课程要求。** 在不可变 Clause 与实体身份旁增加产品判定记录，给每个拟晋升命题明确：

| 维度 | 所需判断 | 失败时的产品处理 |
| --- | --- | --- |
| 当前适用性 | 当前课程/该群体/该任务/有效版本是否有依据；历史例子或泛化训练是否被误当当前 | 历史/背景参考；疑似当前任务放待核实，不假定 absence |
| 信息作用 | 考核身份、执行义务、许可/选择、关键规则、评分细则、教学指导、技术观察、背景 | 教学/技术内容默认不晋升可执行 Fact；重要规则不因泛称 policy 被降掉 |
| 业务范围 | course / assessment / submission / session / programme；个人或小组责任；总分权重 vs rubric 权重 | 范围未明是具体 issue；不得将平台 isGroupContent 当作个人责任 |
| 证据与知识 | 原文明示/原生可操作信息/推断/冲突/未知；出处和生效关系 | 有疑问保留 UNCERTAIN 与具体理由，不能以 trust score 自动采纳 |

评估是**AI 的源证据语义判断 + 本地引用/结构/类型校验 + Human 决策**，不是本地关键词分类器。推荐规则：

- 当前任务可由教师直接布置、明确交付/执行动作、受众和课程关联建立，不要求一定有 weight/date。标题 alone 无法建立；一条新增小作业的教师指令可建立。
- should/may/must 说明力度，不说明是否是任务；“案例中的经理必须……”与“你的小组必须……”不同。来源标题为 Outline 也不免检；Announcement 也不是无条件覆盖旧规则。
- 直接关系成绩/提交有效性/资格/责任或特殊风险的规则可晋升，包括迟交、一次性不可撤回、AI 声明、出席、例外；泛述、定义、示例和长表单全文放 Details/Reference，实际需完成的表单义务保留。
- 平台原始字段保留技术 Evidence。学生可用的提交入口可被确认；未验证的 dueDate、maxpoints、attempts 或 LTI custom parameter 不直接等价于最终课程政策。元数据与教师正文不同，形成具体冲突，不静默任选。
- 每条观察均有 disposition 与理由/引用：晋升、被等价命题支持、背景、历史、待核实；不得用背景收容尚未处理的重要条款。

“确定存在这项任务”“这条信息属于该任务”“这条要求的取值/条件已确定”分开保存。不能因 identity KNOWN 自动把所有关联 should 变 KNOWN obligation。

## 5. 最小信息模型改造（建议，待批准）

保留 Clause/Source/Evidence 原字节、已有 content fingerprint、模型缓存、安全 ledger、Compare、原子 mutation/备份框架。**新增少量明确语义，不新造一个通用知识图谱或聊天系统。**

1. **Product disposition 与对象角色。** 用显式 productRole 区分 course scheme / actual assessment / operational step / reference / unresolved candidate；现有 Source/entity ID 继续映射，不通过改名换身份。Scheme 承载 course overview；真正考核/组件在主层可见；提交平台是该考核的操作步骤，除非确证独立考核，不再与考核等权。
2. **有类型的 proposition。** 稳定 ID、owner/subject、predicate、typed value/unit、state、modality、conditions/exceptions、Evidence/Clause refs、source-version dependency。weight 另带 course-total/rubric/marks basis；time 带 deadline/session/slot、时区和近似/区间；mode 为源支持的形式；不认识的类型保留描述性字段及问题，不能强塞。
3. **复合原文支持多个命题。** 允许同一 Clause 支持 weight 与 mode；覆盖账本仍逐观察交代保留情况，但不再强制原文只能消费一次。复用引用不算多次“读懂”。每个命题必须指向确切原文片段/证据且值、predicate 同审；一条未表达的 facet 不能因 Clause ID 曾出现就算覆盖。不能本地把 25% 推理为正确考试形式。
4. **要求组织关系。** 给真实执行清单明确 parent/order、包含关系、并列义务、可选分支、适用范围；父目录不再重复成一条义务。等价事实共用一个命题并保留全部 Evidence；含额外条件的近义句不得直接合并。OR 分支仍是 choice group，不能拆成两个 must。章节编号是结构，不是自动决定重要性的信号。
5. **Issue 与决策范围。** 用独立 issue ID/affected refs/问题类别/竞争值/依据/解决依赖，替代靠字符串重复“is unclear”。Knowledge state、用户审核状态、默认展示层级三者独立。用户未解决冲突不能被变成 KNOWN；技术 partial 独立于某字段 uncertainty。
6. **显示投影引用命题。** 层级、短标题、行动表达及证据依赖可有 AI 草案，不能成为自由文本事实来源。高风险指令保留完整条件/例外；每个精炼项映射命题；无法验证的改写回退到结构化原事实，不输出漂亮但未证实的总结。

RC1 的不可变错误观察也保留，新增修正候选或 supersession，不能覆盖旧 Reader。新合同/语义证明版本失效仅影响需要重判的身份、命题及依赖，不重跑成功全文 Reader；新增命题直接引用保存原 native passage。单纯 Reader 缺失语义时才定点补读。

持久化先评估现有 courseDraft metadata + 可选结构字段能否满足版本化与备份；若需新 store，则设计明确的 DB migration/Backup compatibility 后实施。**不得把 transient view-local state 误作持久决策。** 旧 backup 仍可恢复旧语义，展示为旧模型；不能自动为 legacy facts 伪造已通过新版晋升审核。新 Course Brief 从已认可事实计算，不用未审核投影覆盖 Current。

## 6. Course Brief 与 Review 的具体 IA

### 6.1 Course Brief 四层

**主层：** 课程考核总览（真实考核名称、课程总权重、截止/考核时间、状态）；每项考核简洁行动卡（交/做什么、在哪、谁负责、关键限制）；课程关键规则与影响规划的待核实事项。没有日期显示“待核实”或有依据的未知，不造日期。不同来源效力/版本冲突不靠排序隐去。

**执行清单：** 每项考核内按准备→内容→提交→当天行为组织，每条动作可独立追证；目录/分节/选择/例外保持结构。主层显示“内容与提交清单”入口及未决/风险提示，不截断到固定 N 条。

**明细：** 完整评分细则、附录、教学参考、原始表单、技术来源说明；与当前任务关联不确定的参考有说明。强制做的表单是清单项目，其长模板在明细。用户不需要读完整模板才能知道要签/交。

**Evidence/Source：** 复用原位 Reveal，准确 Source/Locator/原文、命题引用及完整覆盖限制可达；仍不新增一级 Evidence 页面。历史/未晋升观察在课程来源中可检索，不永久丢弃。

主层排序按考核/行动结构与明确日期，而不是 assignment/project/other kind 优先吞没总览；无可靠日期的考核仍可见。rubric 权重旁显式注明“本项评分内”，避免混作课程分数。同一关键规则在课程层仅一处正文，受影响考核有引用及局部特别条件。

### 6.2 Review：业务单位与独立浏览

- 进入 Review 先可看候选目录/课程结构预览，然后聚焦一个真实考核及其决策组；前后跳转不写 facts/decision/history。浏览 cursor 以 reviewItem ID 而非数组序号保存，刷新/排除后回到有效项目；跨 Full-page/Side Panel 语义一致。
- Scheme 展示总览/关系；子考核信息可预览，但不混入父项的批准范围。身份有疑问先处理 Same/Different/Uncertain 或保留待核实，不强迫先认可全部要求。
- 考核组显示核心字段和完整动作目录；普通可靠要求可在明确声明范围后一次认可。具有独立冲突/高风险/适用性疑问的内容有独立业务子决定，不以每个句子建卡。没有“所有 227 Fact 必须逐个点击”目标。
- Confirm 前明确“本次批准哪些字段和动作、哪些仍待核实、哪些子对象只是预览”。批准范围由 ID 集合与版本绑定。未选择的不确定项留 pending；用户可**明确确认保留为未知/待核实**，但不是认定取值正确。关键冲突不默认包含。保存按钮不靠诱导操作来推进。
- Edit 使用 raw typed value，解释/来源理由与条件不塞进单行输入；当前 RC1 用 fact.display（含 context）预填的做法不能继续。需要编辑复杂要求时保留条件/例外及原文，记录 userEdited 与原差异；新来源不覆盖人工值。
- Exclude 排除当前说明的业务对象/要求；相关引用/子项处理需展示影响，不能静默 cascade 删除。Undo 恢复同范围；Split/merge 可见涉及的要求及 Evidence，原引用不丢。
- Review later 保存 deferred 状态并推进到下一个待审对象；可以从目录返回，不消失、不写 trusted。最后全部 deferred 时展示现有 Course/待审入口，不能显示已完成。
- 决策失败/保存中/生效后的反馈可见；视口操作与刷新实际测，不只测函数和 DOM。长清单操作栏可达，但它只是辅助，不代替范围设计。

### 6.3 少量“前 → 后”例子（预期，不是已实现）

| RC1 | 预期体验 |
| --- | --- |
| Literature Review 标题即顶层已确定考核，25 条读论文提示 | “待核实：课件提到 Literature Review，与当前考核的关系未确证”，查看依据与相关教学指南；不先占据考核主卡，也不直接删除潜在任务 |
| Part 1 81 平级 Facts，业务需要和总章节反复显示 | 主卡展示课程权重/提交日期/代表提交 PDF/渠道/关键限制；内容清单分 1.0–6.0，Business Need 下保留 justification、deficiencies 等独立含义，重复原文在 Evidence；rubric 在明细 |
| Mode=25% | 两个源支持命题：课程权重与闭卷形式，分别核读；若无法建立正确映射则该字段待核实，不能仅隐藏错误或用硬编码改答案 |
| 一次性提交与长学术诚信教育同一数页 Rule | 主层可见 Final Folder 一次/不可撤回、迟交与例外、必要声明；定义/表格全文按需展开；Draft/Final 范围和 GAI 选项完整可查 |
| 首卡显示整课，Edit 只改父对象，只有 Confirm 可推进 | 总览独立预览；选 Part 1 审该考核，前后跳转无副作用；本次批准范围可见，MCQ 与具体冲突仍独立待审 |

## 7. 实施分解与可回退路径（批准后执行）

1. **冻结与修复交互基线。** 保存原 Human 受阻 profile 的操作审计，测试一律独立 clone/未确认种子；诊断显示/编辑/决策范围，明确按钮失效具体场景。现有 RC1/ZIP 不覆盖，新安全复现入口不叫 RC2。
2. **先做模型与离线编译纵向小闭环。** 新增 disposition/typed proposition/要求关系/issue；对保存的 F01–F05 原文构造透明的人工设计期预期，注明不是模型成绩/不篡改 gold。单元回放校验多命题引用、低价值留存、复杂动作守恒，再接真实候选生成；禁本地课程答案表。
3. **接阅读投影和 scoped Review。** `schema/contract`→`selective-course/course-projection`→`direct-review/view`→`handler/course-state/store`→`screens/course/initial-review/change-review`，逐范围原子保存；Phase A 不先改这些产品路径。
4. **增量与恢复联动。** 新 Source/实体/命题/issue 的依赖闭包失效；只对真正变化生成 Change。降晋升不是静默删除，已有 trusted 仍经过 Possibly Removed/Conflict 等人审。view 降层不算 source change；人工值/排除/名称保护；缓存/UNKNOWN 规则照旧。
5. **验证并出唯一 RC2。** 零付费回放优先，最后必要且预付可付的生产调用验证新版语义，独立 provenance 表明哪些判断是新模型、哪些只是旧数据回放。不复用旧 proof 宣称新版 semantic PASS。不重新扫描原正式 NTU，不用“每次都全重建”逃避增量。

成本影响：结构化元数据会增加少量序列化与审核合同；修正晋升可减少后段无价值 assertions，但没有新实测不能承诺一定省钱。精炼 Brief 的本地重排、浏览/编辑/确认、无变化 Check 不应增加模型调用。新版必要判断是一次版本迁移/验证消耗，开发费与正常 cold 费用单列。无通用绝对执行时长承诺。

旧 RC1 只读保留；RC2 新目录/独立 profile/manifest。新模型在原状态旁产生候选，失败回到 Current，不改 Human 数据。若迁移需要 irreversible 操作，另按既有权限边界处理。

## 8. AC-01～10 的验证计划及文档归属

| 验收 | 必要自动/实际检查 | Human 核验 |
| --- | --- | --- |
| AC01/05 | 标题误晋升、教学案例 must、无日期新任务、programme 泛述 vs 特殊强制政策、平台设置 vs教师要求的异构正反例；所有观察 disposition 及引用可回查 | 重要任务召回与背景分类；不是 Fact 数量/噪声字符数单项验收 |
| AC02/03 | 结构/父子/OR/例外/阈值/独立义务，主层精炼→命题→原文映射；所有必要明细可达 | 从主入口找考核/分数/日期/提交物/责任/关键风险，再查内容和声明；记录正确性、时间、点击路径 |
| AC04 | 一个原文多 scalar、总分 vs rubric、deadline vs slot、group vs person、当前 vs 历史；不认识类型不强塞 | 对照真实原文关键字段及条件 |
| AC06/07 | 真实生产浏览器 mouse/keyboard 点击，视口 380 与 1280；导航前后事实/decision/history 深相等；Edit/Exclude/Undo/Defer/Split/Same/Different 保存与刷新、未选事项不被批准 | 未确认入口自由浏览和实际决定；工程不能代签认可 |
| AC08 | 旧协议/backup、unchanged 0 调用、受控单来源 New/Changed/Conflict/Possibly Removed、41%保护、Rebuild Keep/Use 原子恢复、UNKNOWN 0重复派发 | 功能演示；controlled 不叫真实线上更新 |
| AC09/10 | 覆盖限制与相关 issue 可达且非重复全文；换课名/表达的正反例；源效力/版本冲突不自动覆盖 | 没有第二门真实模型课程时跨课程仍 NOT VERIFIED |

打印另做 print 与 screen 对照、A4 长动作块跨页、无文字重叠与来源可辨识；不为解决 print 改正常审核语义。所有自动证据必须注明 build SHA、profile 来源、操作动作、before/after、费用、数据保护和证明限制。

**批准后更新权威产品文档：** PRD 的信息价值晋升/类型与评价、Interaction & IA §§5/7/8/14 的分层阅读/审核单位/浏览规则；Technical Design 的命题/依赖/协议和迁移；Direction/Decision Log 记决策来源；Engineering Report 记实际实现与验证；Final Acceptance 记 Human 结果。当前方案不是偷偷更新上述锁定规格。README 仅当前状态和入口，不成为第二份 IA。

## 9. 本轮实际结果与集中审阅点

- 根因审计、正式 Gate5 FAIL 记录、方案与独立研究已形成；安全启动隔离改进是复现工具，不是完成 F06/F07 或交付 RC2。
- **未修复声明：** F01–F05 产品语义、Review 导航/范围、原 Human 会话按钮失效的确切原因及 print 重叠。没有用测试通过隐藏这些缺陷。
- 请集中审阅 §1 四项行为、§4 晋升标准、§5 多命题/义务结构、§6 四层 Brief 与范围审核。建议一起批准为 v0.3.0 必须整改范围；实现细节、步骤顺序与 routine 修复由工程自主处理。
- Outline/source-priority 研究见独立文档，**不随本方案批准自动授权实施**。成本低于 ¥2 不是 RC2 前置条件。产品审批后才进入重大模型/IA 实施与 RC2，最终 Gate5 仍由 Human 裁决。
