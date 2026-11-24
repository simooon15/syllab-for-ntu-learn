# v0.3.0 RC2 candidate｜Human Gate5验收入口

本包是候选，不是已通过或已发布版本。P2E-063授权来源解释进入候选，不代表真实课程已Confirm。唯一构建、候选与来源delta SHA以 `artifacts/v0.3.0/rc2/RC2_MANIFEST.json` 为准。原始决策表83,084 bytes与原raw/Clause保持，17项逐条旧值/实际修正/状态/来源在本机 `evidence/private/product-063/AUTHORIZED_SOURCE_CHANGES.json` 与 `DECISION_MATRIX.json`。不会将其写成Human-approved=17。

## 打开与恢复

运行 `node scripts/v030-product-064-open-preview.mjs` 打开独立Chromium的候选Brief，进入顶部实际Initial Review。此profile与原Human/RC1分离、网络禁用，不需扫描或Key。若需重建同一来源候选，可运行 `node scripts/v030-product-064-seed.mjs`，然后运行064-preview-check生成入口；不覆盖旧profile。原P061入口保留作恢复对照，关闭新浏览器即可退出。生产扩展ZIP仅含dist文件，不含profile、私有课程或QA桥接。正式加载扩展后必须reload并refresh旧NTU页；工程本轮未操作原正式profile。

## Human逐项操作并记录PASS/FAIL

- 首层应有四项Scheme考核；Literature Review作为身份未证明的待核实材料可查，不冒充确定第五项。确认权重/日期/模式阅读等级和380/1280布局。
- 展示15分钟、约5分钟Q&A与实际slot分别表达，不把部分20分钟扩展为全部；Submission代表责任、平台和格式各自清楚。
- 后台100分/flags/历史2025默认配置不作学生相反要求；group_count=16不是16人。选题与should批准不重复、不升级must。
- Content/Speaking/Q&A各5、Peer10、total25逐项映射；Rubric条件/说明与Evidence完整可达。
- 考试源09–11保留，12推算不出现；真实2h/3h保留单一根问题。相似度区间及24/40缺口、likely/直接复制/非本人作品与解释条件完整。
- GAI尾句当前仅有截断解析、未定位到现有证据集的原始声明PDF；这是覆盖缺口，不能冒充权威原件本身缺字或“已修解析”。请在实际原页核读；Part3源版本差异同样明确待确认。
- 自由浏览Review不写trusted；在隔离profile测试Confirm/Edit、Review later、Exclude/Undo、刷新保存与返回。这里的测试Confirm不代表真实课程已认可。
- Print summary与Print full details用途不同；后者保留全部Fact及来源定位，检查不重叠/截断，原文/条件/OR不丢。

## 工程证据与Human待测边界

完整CI、真实1280/380浏览器、Review/backup/restore/rebuild回归与A4结果见manifest。真实保存来源含PDF解析与原生公告/平台元数据；不把受控Split/Rebuild或合成中文探针当真实在线增量、第二门课程。限定检查到的既有clean-rebuild快照仍为MA6081；未证明存在非MA6081真实候选，因此非样本真实课程、校园线上Check/New/Changed/Conflict/Possibly Removed和正式Side Panel容器列为Human待测/NOT VERIFIED。需校园登录、线上变更或新模型的步骤本轮不执行，不允许付费或重扫。Human应决定这些待测是否阻止PASS，不得工程代签。

原trusted、旧强迫Confirm、备份、RC1 ZIP、账本UNKNOWN均不动。模型新增费用为0，未查询/充值余额或释放UNKNOWN。不commit/push/merge/tag/release。请集中记录PASS/FAIL及实际问题；未实际PASS禁止发布。

## 17项落实清单

| 项 | 实际处理 |
| --- | --- |
| 01–02 | 文献材料实体ISSUE，身份具体未证实；教学主题/指导为BACKGROUND，保留原文及单一身份待核实，不进四项核心卡 |
| 03 | 展示15分钟、Q&A约5分钟独立字段；15/20分钟slot差异为一项可行动的安排疑问，完整表可查 |
| 04–07 | 平台100分、group/late flags、默认2025字段转背景，不与课程25分、组代表责任或2026截止作学生冲突；运行时权限未测 |
| 08 | group_size→group_count，16不变，不猜人数 |
| 09–10 | 批准should独立保留，选题剥离重复批准正文；选题will与批准should各自来源/条件保留 |
| 11–12 | Content/Speaking/Q&A各5、Peer10、total25完整项分重查，数值相同不去重 |
| 13–14 | 保留2h/3h根冲突；源2026-11-20 09–11单列已知安排，无源12不存在于修正Product；原始Clause不改 |
| 15–16 | 源区间/24和40边界缺口保持；likely zero只与直接复制/非本人作品及解释条件关联，补源support绑定，不生成必然零分 |
| 17 | 已保存解析尾句仍截断；在现有证据文件范围未定位原始声明PDF，保留明确覆盖缺口，未用QA打印冒充原附件，也未新增下载 |

跨项：Part1 Group身份明确，原Individual/Group标题与folder标签为可追查背景；Part2/3场次窗口和答题时长分开；Part3早期3h/长短题与后续1h/structured短题保留来源版本疑问，不在主卡确定成3h。详细before/after及Clause support在私有决策矩阵。改变的是有授权的隔离候选解释，不是原始模型或trusted。

## 最终工程结果与范围

实际CI/浏览器/打印/备份SHA见RC2_MANIFEST.json。最终校验覆盖17项产品条件、135 Fact可达/完整打印（原133加展示/Q&A两独立字段）、源592 Clause保全、两种布局/键盘/回焦/刷新/后台字段不泄漏核心摘要、真实生产Review操作、带用户力度/条件编辑的备份全替换恢复、受控Rebuild冲突及关系点击。桌面/窄屏语义预览不是正式Side Panel容器，保存数据受控变更不是校园在线增量；后两项与非MA6081真实来源回归继续Human待测。工程不代Human判PASS。


## P2E-064｜RC2 Typography收尾（2026-11-02）

保留P063的17项候选修正、四卡布局、内部滚动/焦点返回、Review及双打印。按Owner最终明确指示，大字和标题使用原课程标题的Fraunces衬线体，正文/标签/按钮保留既有无衬线；考核标题20px/550（原23px/600），权重桌面36px/500（原42px/600）、窄屏34px/500；日期17px/500（原19px/600），课程名21px/500同字体。字体复用既有资产，无下载；仅CSS，未改DOM/行为/候选数据。打印权重30px，长段维持Regular。

疑似裁切：1280/380新开及字体加载后scrollTop=0，Presentation dates首行完整；650高窗口主动滚到行中可复现半行，返回保留位置，Home恢复起点。未证明默认裁切或内容缺失，未强制重置滚动。对照、测试、恢复点见 `RC2_TYPOGRAPHY_REFINEMENT_v0.3.0.md`。同一RC2原位更新，非RC3；Human Gate5待验收，不发布。

本轮先核对 `evidence/private/product-064/before-after-1280.png` 与 `before-after-380.png`，再操作新隔离预览。PDF为 `brief-summary.pdf` / `brief-full-details.pdf`，均在product-064私有目录。旧RC2 ZIP与manifest在该目录before/，保留恢复。
