# Syllab v0.3.0｜Outline / Source Priority 可行性研究草案

**入站：** P2E-055；2026-10-11。**仅研究、未实施、零付费实验。** 不修改扫描/Pipeline/Prompt/Schema/模型配置，不作为本次 v0.3.0 产品整改前置条件。成本基线复用 E2P-044，不把错误的 227 Facts 当 gold。

## 1. 实际来源能说明什么

逐项核读保存的 Course Outline native passages，另对教师 Announcement、提交入口及声明附件定位。下表是**源文本核对的研究样本，不是全课程覆盖率或完整 gold**；没有把 title 搜索或关键词未命中当作语义不存在。

| 对学生有价值的主题 | Outline 明确支持 | 必须继续查其他来源 / 风险 |
| --- | --- | --- |
| 四项考核与课程权重 | 保存 Outline `page:13` summary marking schema；`page:5` timetable/权重相关信息 | 最新教师通知可能更改；rubric 内 30/25/30/15% 不能当课程占比 |
| Part1 内容结构、动作与责任 | `page:11–12` 章节、格式/篇幅、代表提交 PDF、文件夹及日期 | 后续 Announcement 的具体准备/展示要求可能补充，不得由概要吞掉 |
| MCQ / case study / final 模式、时长、时间关联 | `page:12–13` 原文；语义上能分出 weight 与 mode | native 提交/考试入口和后续时间更新；复合条款需要多命题支持 |
| Draft/Final、单 PDF、一次性不可撤回、迟交及例外 | `page:15` 明示 | 实际链接与平台配置冲突需具体解释，不能选一份自动裁决 |
| 演示顺序、成员安排、整场参与 | `Group Presentation Guidelines` 当前教师正文有明确指令 | 当前定位尚未建立 Outline 中同等明确的支持；不能以 Outline 普通 Zoom 教学介绍证明演示的全部安排 |
| 团队展示实际 time slot / Q&A | `Group Presentation schedule and timing` 当前公告给出进一步安排 | slot 与课程/提交 deadline 不同；表格与图像缺口仍 Partial，不能填猜测时间 |
| LockDown Browser 安装/测试准备 | 保存的专项 Announcement 正文 | “today”需要结合有效发布时间/修改/受众，历史发布日期不自动令正文当前或无效；不宣称所有旧公告都已解明 |
| GAI 选项、组号、签名等声明执行细节 | 保存声明附件有具体字段/选项 | 本轮未建立 Outline 中等效完整覆盖；应该保存“需要声明”与完整表单，不能把各选项误作全部强制行为 |
| 课件 Literature Review 指导 | 不足以建立该学期独立考核 | 需内容身份与课程关联判断；缺 Outline 不是删除理由，标题命中也不是晋升理由 |

source→原文定位、Clause/Fact 失败对照在本机 `evidence/private/gate5-remediation-055/intake/`；真实源文本不复制到公开文件。PDF 本轮是受限共享例外，其余原文仍私有。

**结论：** Outline 对基础骨架和部分高价值规则很有帮助；其他来源有不可被骨架替代的执行安排、声明与更新。当前证据不能给出“Outline 覆盖 X% 重要事实”，更不能承诺只读 Outline 即可靠。跨课程真实模型证据仍 0。

## 2. 候选策略比较

| 策略 | 收益机制 | 遗漏/质量风险 | 建议 |
| --- | --- | --- | --- |
| Outline-only / 读完就停止 | 少读材料 | 隐藏任务、更新、例外、表单及实际渠道被漏；无 Outline/过期 Outline 失败 | 拒绝作为产品策略 |
| Outline-first | 先建立 tentative 骨架，后读资料时有完整课程 context | 把骨架当权威会造成锚定；本身不减少总体工作，也不防教学指导误晋升 | 可作为研究中的排序启发，不是自动删读规则 |
| Risk-based selective reading | 所有来源内容初查；任务/变化/冲突/缺口/新证据升级相关完整单位 | screen 误判可能静默漏；需可信风险状态和 holdout 校验 | 已有 selective-draft 基线可沿用；不能只按文件名/页数/词命中 |
| Information-value adaptive | 骨架 + 全来源初查；按当前知识缺口、独立行动与证据增益决定补读/核读 | 模型分类与依赖记录更复杂；“没新值”可能掩盖新条件/例外 | 推荐未来验证，先解决 P055 的晋升/命题表示问题 |

推荐的未来候选为 **tentative outline scaffold + all-source risk screen + evidence-driven targeted understanding**。不固定调用次数/页数，不在所有来源上同等深读，也不把未读当无任务。

- 没 Outline：从已存在的明确任务/教师说明逐步建立骨架，不阻断课程。
- Outline 过期/冲突：记录版本和具体受影响命题，向最新有证据的通知扩展；发布日期只提供 context，不决定权威胜负。
- 普通课件：完整 native 初查仍覆盖，发现真实动作/新条件/难辨任务才深读；视觉信号不足要升级或展示风险，不把 native-only 当已看图。
- Announcement/Assignment Brief/平台：按实际内容判断；并非全部公告都当前、全部平台 dueDate 都最终 deadline。
- 充分性以“重要动作、状态、条件、例外和 Evidence 是否表达”为依据；Clause 已被引用、骨架已有权重或文件已 screen 都不是停止深入的充分条件。

## 3. 与真实费用基线对照

实际保存 usage 重建：cold 40 calls，谷时 **¥4.49631612**，无 provider cache同 token ¥4.697271；不是新版 fresh paid cold E2E。历史部分 Reader/repair 输出上限为 32768，当前默认 384000，不能承诺同费用上界。完整 token 明细沿用 `artifacts/v0.3.0/goal-driven-054/PRODUCT_USAGE_COST.json` 与 `POST_ACCEPTANCE_RESEARCH_EVIDENCE.json`。

| 阶段 | 基线谷时 CNY | 调整来源优先级的实际影响 |
| --- | ---: | --- |
| inspect + screen | 0.63373900 | 仍需要全部来源初查；不能仅因为先读 Outline 删除风险 screen |
| Reader + correction | 1.38436732 | 有 context 可少重复，但重要新任务/条件/视觉核读不能省掉 |
| Link | 0.85851872 | 骨架/晋升清楚可减少无价值候选；没有实验不能保证 |
| projection + audit | 1.61969108 | 占比最大；原标量/归属/格式修复消耗不由读 Outline 自动消失 |

**即使 Reader+correction 费用全部归零，其他段仍 ¥3.11194880。** 因此低于 ¥2 不能仅靠减少课件阅读。需要同时减少重复表示、低价值晋升、后续归并与修复成本，且保持语义保护。reasoning 归零的代数情形也仍 ¥2.61786012，不是低质量 thinking-off 的授权。

以下均为乘阶段费用的**估算假设，非 token实测、新版承诺或安全硬帽**：

| 场景 | inspect/screen、Reader、Link、projection/audit 的假定下降 | 谷时估算 CNY | 判断 |
| --- | --- | ---: | --- |
| 保守 | 0%、25%、15%、15% | 3.77849282 | 仍显著高于2元；假定缺口/修复不增加 |
| 乐观 | 25%、50%、40%、40% | 2.65441379 | 仍达不到；全来源屏幕收益是否可行未证实 |
| 激进最好假设 | 40%、60%、60%、60% | 1.92527425 | 数学可达，但同质量这些削减均未证实；不能承诺 |
| 风险敏感 | 基线 + 更多未决/视觉/复杂更新核读 | 可能超过4.49631612 | 无固定最坏价，必须计费透明，不为了帽子静默停读 |

阶段节省不等价于取消某比例资料；有价值晋升可能增加已漏的重要命题。Outline-first 额外 bootstrap 若需要新调用也要入总成本，不能藏在“免费准备”里。cache best effort、暖缓存与严格冷启动区分；峰时同token约双倍，不能拿谷时值承诺工作日峰时。

## 4. 未来验证条件与优先级

1. 先完成本版信息价值/字段/Review 整改；让正确命题与背景区分成立，否则没有公平成本基线。
2. 冻结独立 source-first 样本：Outline 缺失/过期；Announcement 更新；课件隐藏任务；任务无日期/分数；责任/OR/例外/强制政策；平台字段与正文不同；同主题正反例。既有 provisional/disputed gold不修改，研究新增预期单独标注。
3. 零付费对已存原文/模型响应做行为和依赖回放；真实语义策略验证最后才在另行确认的研究范围和预付安全条件下执行，不把“离线人工构造 projection”称模型成功。
4. 同覆盖/语义风险/人工任务成功率比较 baseline 与候选，统计 missed task、错误晋升、关键facet、Evidence完整性、每阶段input/cache/output/reasoning、repair、运行时间和正常cold总费。至少补独立课程证据后才评价泛化。
5. 若便宜方案漏掉一条高风险义务/条件或产生不正确模式/日期，不接受费用成功。来源初查不足明确升级，不能通过缩输出硬截断达标。

优先级：当前 v0.3.0 核心整改最高；未来无损表示/晋升减少噪声次之；Outline-first 投入策略和 thinking 调整做对照研究。**本文不是本版实施批准，产品侧审阅后另行决定是否、何时实施。**
