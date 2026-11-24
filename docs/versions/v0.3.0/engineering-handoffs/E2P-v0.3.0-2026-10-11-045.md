# Codex → Product 整改审计交接｜E2P-v0.3.0-2026-10-11-045

**入站：** P2E-v0.3.0-2026-10-11-055；2026-10-11（Asia/Singapore）。  
**状态：** `HUMAN_GATE5_RC1_FAIL / REMEDIATION_PROPOSAL_READY / PRODUCT_DECISION_PENDING / NO_RELEASE`。  
**范围：** 同一 v0.3.0，阶段 A 已形成审计与集中方案；重大信息模型/IA 尚未实施。当前没有 RC2 或新 Human PASS。

## 1. 集中审阅入口

首先读 [RC1_GATE5_PRODUCT_REMEDIATION_PROPOSAL_v0.3.0.md](../versions/v0.3.0/RC1_GATE5_PRODUCT_REMEDIATION_PROPOSAL_v0.3.0.md)。它包含 F-01～F-07 首次错误层级和放大链、证据边界、语义晋升标准、命题/要求结构、Brief 四层、Review 单位与导航、最小实施顺序、持续维护/恢复和 AC-01～10 回归计划。

建议一次确认四项行为：有证据的当前行动才晋升；主层精炼而完整明细/证据可达；以真实考核/要求/争议为审核单位；浏览与明确范围的认可分离。模型表示允许同一原文支撑多个独立 typed proposition，保留所有观察，不再把原文引用一次误当语义覆盖。批准后更新 PRD/IA，再实施至唯一 RC2；普通实现细节无需中间审批。

[OUTLINE_SOURCE_PRIORITY_FEASIBILITY_v0.3.0.md](../versions/v0.3.0/OUTLINE_SOURCE_PRIORITY_FEASIBILITY_v0.3.0.md) 是独立只研究草案：Outline 原文支持的基础骨架与非 Outline 执行安排、策略比较、具体成本情景与遗漏风险；不授权修改扫描/Pipeline/Prompt/模型、不开付费实验，不作为本版整改前置条件，也不随核心方案确认自动获准实施。

## 2. 本轮实际审计

正式三文件定点入站，SHA 回读一致；HEAD `26426a3793250aea351c443e3327ccdb1b95b697`、原 dirty/正式数据/原请求/费用/UNKNOWN 保留。两份 Human PDF 仅用于受限协作，禁止公开 GitHub/Release；完整文字提取和关键失败内容/渲染核读留私有。

真实保存的候选 SHA `a92462badd32a1905188ad237c3c171e4fc74b314d7df06cd27e22654322abd5`。F01 Reader 标题晋升为 CURRENT identity、Link 作为独立已知考核，Projection 锁定 owner 后不能重判；F02 缺少动作包含/父子/选择关系；F03 技术元数据未正确退回参考；F05 扁平 Rule 与 context/泛问重复放大；不是只做 UI 折叠。

F04 原 Clause 明示权重和闭卷，但单 scalar 原为权重25%；最终 assertion 改挂 mode，编译仍取原 scalar，产生错误字段—值组合。原文存在，现合同的标量不可改/一条一次覆盖及同源核读仍未守住多命题含义。两份保存真实 raw 响应支持 trace，未进行新派发。

F06 首卡展示四个子考核，父项只有4 Facts，本次 Edit只有名称+4输入，Confirm handler也按 target owner而非所有显示子项取事实。不是“整个画面全部一起自动批准”的实现，但用户无法知道实际范围；同一 Card 展示/编辑/决策范围不一致。View固定 pending[0]，Defer只记录而不推进，没有无决策浏览。

## 3. 功能复验与有限修复

在旧未确认种子的独立 clone，以 SHA 校验的生产 RC1、1280×900 headless 实际点击：Edit/Cancel/More/Split 有响应；Exclude待审10→9，刷新仍9，0 pageerror；Review later仍1 of10。**Human的原受阻会话按钮无响应未被统一复现，不能宣布修完所有交互。** 程序调用/DOM数量不替代真实点击，更不替代Human判断。

新增安全复现入口：

```sh
node scripts/v030-final-055-open-review.mjs
```

每次从本机 durable 未确认种子复制唯一 profile，生产 RC1 SHA及十张待审检查、全部 HTTPS拦截；不打开/改写原 Human profile、不杀既有Chrome、不重跑模型。两次 verify-only 并发启动均成功且 profile不同。仅解决复现入口的会话隔离；**入口展示仍是失败的RC1，不是RC2**。旧launcher、RC1目录与ZIP保持历史原件。

本轮 `npm run ci` 完整 PASS，2+915+20=937；没有新bundle语义变化。明确未修：信息晋升/字段/层级、Review导航/范围、受阻原会话具体原因、打印重叠。不得用此PASS推翻RC1 FAIL。

## 4. 当前人工结论与费用

正式 [FINAL_ACCEPTANCE_v0.3.0.md](../versions/v0.3.0/FINAL_ACCEPTANCE_v0.3.0.md) 记录 RC1 `HUMAN_GATE5_FAIL`；[DECISION_LOG_v0.3.0.md](../versions/v0.3.0/DECISION_LOG_v0.3.0.md) 区分已确认边界与待审方案。十次被迫Confirm保留，不能作自愿认可/gold。README更新当前未发布失败状态；工程报告只记实际验证。

本轮 **0新增付费、0原正式课程重扫、0正式trusted变更**。原 P054钱包/账单/UNKNOWN 不重写；余额9.34是历史观察，不是当前可付承诺。成本研究基线仍保存usage重建 cold谷时4.49631612；删除全部Reader费剩余仍3.11194880，Outline优先单独不足以证明2元目标。估算与实测已分开。

## 5. 恢复、Changed Files 与保留历史

安全共享证据：`artifacts/v0.3.0/goal-driven-055/AUDIT_AND_VERIFICATION.json`；本轮 `CHANGED_FILES.json` / `SYNC_RECEIPT.json` 只涵盖精确实际写回路径。本轮Drive Desktop文件SHA回读不等于服务器确认，不上传新private/profile/raw/screenshot/reasoning/Key。

本机恢复：`evidence/private/gate5-remediation-055/RESUME.json`；私有 `intake/` 有入站前P054字节、sync/dirty记录、PDF文本/关键渲染、逐层trace、实际点击和原raw响应引用，`unconfirmed-seed-profile/` 是可用的未确认种子；只给本机工具读取。原正式profile与受阻Human十次Confirm的profile没有被打开/清理，旧054恢复点不动。

E2P-044原字节已保留在 `docs/versions/v0.3.0/engineering-handoffs/E2P-v0.3.0-2026-10-11-044.md` 及私有before快照，原RC/历史054结果不覆盖。此历史快照的相对链接仍以原Outbox位置解释；当前可点击入口以本E2P为准。入站时未覆盖Outbox；阶段A完成后按长期交接规则更新当前Outbox为本文件。

**接收方下一步：** 集中审阅核心整改方案，明确是否批准四项行为与必要模型/IA变化；Outline研究另行决策。批准后工程沿保存证据实现/回归/交付RC2，由Human重做Gate5。未授权 commit/push/tag/release、正式迁移、公开PDF、改变模型或权限。

## 6. Product Owner Direct Intervention

本轮Human要求从Drive最新P055按Changed Files定点同步，纠正前次Inbox仍P054的资源缺口。现已收到三文件，没有改变P055阶段A范围、没有普通技术审批。未提供可比Codex quota快照，不推算用量。
