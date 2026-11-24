# v0.3.0 RC2验收准备（P061，非正式RC2包）

2026-10-17。**SOURCE_DECISIONS_PENDING / RC2_NOT_READY / HUMAN_GATE5_NOT_SUBMITTED / NO_RELEASE。** 本文件是验收准备指南，不是新Gate或通过证书。实际构建/候选/成本见本轮PREVIEW_SUMMARY；RC1 Human Gate5仍FAIL。

## 当前可审阅

运行 `node scripts/v030-product-061-open-preview.mjs`，仅新隔离profile、禁止网络，默认未认可。先扫主卡名称/权重/确定日期/核实提示，再点详情查看准备/提交/安排/评分，点击原值查源，返回保留焦点；Review自由浏览不需要Confirm。点Print summary和Print full details检查不同用途，Facts和信任版本相同。不能把QA Confirm当正式课程或Human验收。

## 正式RC2前的必要顺序

| 条件 | 当前 | 后续动作 |
| --- | --- | --- |
| P061视觉/详情/双打印与零付费工程检查 | 有本轮证据，仍待Human产品接受 | 集中审阅报告及屏幕/打印，不能据CI判语义PASS |
| 四组17项来源裁决 | Human-approved=0，候选原封保留 | 批准有源建议与未定项处理范围；必要时补限定权威来源，不编补 |
| 通用语义/Review最小修正 | 等待上述批准 | 不改raw；记录人工裁决来源，进入候选Review，严禁写真实trusted |
| 独立范围Confirm/Edit/Exclude/Defer/Split/Undo与持久化、Source/Evidence | CI及当前隔离点击为工程回归 | 语义修正后按最终同一构建做生产路径闭环，不能继承旧10次forced Confirm为gold |
| 用户值、backup/restore、rebuild、Check/New/Changed/Conflict/Possibly Removed | 既有CI覆盖，未新做真实增量 | 已批准最终构建及实际来源下验证，不擅自扫描NTU |
| 正式Side Panel与非本课程/异构真实源 | 本轮NOT VERIFIED | 只使用明确允许的真实来源/profile；合成中文探针不替代真实样本 |
| 最终唯一RC2 package / manifest /恢复点/成本账本 | 未生成 | 全部关键条件满足后一次生成，旧RC1不覆盖；记录UNKNOWN未核销边界 |
| Human Gate5 | 未提交，RC1仍FAIL | 用户手动PASS/FAIL，未经PASS不commit/push/tag/release |

## 实用Human Gate5操作（待正式候选具备）

使用manifest绑定的唯一构建与候选，不导入旧已认可gold。确认几秒内可自然识别真实核心考核、权重、关键日期/方式及实际高影响未决；不记录未经实际测量的查找耗时。详情读得出先做什么、交什么、限制/例外和评分如何对应；Evidence能回到保存源。真冲突保留，假冲突不抢焦点；Summary与Full内容层级清楚且打印完整。记录明确PASS/FAIL和具体问题，工程不代签。

## 保护和恢复

候选基线ac4383…及其原raw不变，旧P060入口可恢复查看；源码恢复副本在本机evidence/private/product-061/before-P061，manifest绑定其SHA。所有真实原profile/trusted、原始Source/Clause/Evidence、备份、RC1ZIP、用户值、账本/UNKNOWN不动。不得git reset --hard或覆写旧候选。当前入口可随时关闭独立浏览器，不影响正式资料。后续正式扩展换包后必须reload扩展与refresh全部旧NTU页；本轮禁止原profile操作，未执行。
