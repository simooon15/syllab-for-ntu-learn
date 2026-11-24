# RC2 Typography整改与剩余边界｜P2E-064

2026-11-02。Owner最终明确为“大字和标题”使用衬线，正文不需统一；最终实现以此为准。状态：HUMAN_GATE5_PENDING / NOT_TRUSTED / NO_RELEASE。唯一RC2候选原位更新，无RC3、无发布。原卡布局和语义数据不变，唯一产品源修改为extension/src/app/app.css的Course screen作用域。

| 项 | P063 | P064 |
| --- | --- | --- |
| 考核标题 | Plus Jakarta Sans 23px/600 | 现有Fraunces衬线20px/550 |
| 权重（1280） | 42px/600 | 36px/500 |
| 权重（380） | 38px/600 | 34px/500 |
| 日期主值 | 19px/600 | 17px/500 |
| 课程名 | Fraunces 19px/500 | 同卡片Fraunces衬线体21px/500 |

复用现有fraunces-var-normal.woff2，无新资产或下载。新增Course专用字体别名声明100–900真实可变字重（现有字体wght轴100–900、默认900），只在Course作用域引用，保证500/550实际生效，避免影响其他页面。课程名、考核/章节标题与主值大字使用此字体；正文、辅助标签、按钮、详情/Evidence长段保留既有无衬线；body/长段Regular、辅助标签与次操作500。打印权重30px。未改卡片高度、网格、DOM、内部滚动或Review行为。

## 裁切结论与对照

1280×900和380×900，字体加载前后首个label贴合区域起点，scrollTop=0，无首行裁切。650高视口主动滚到文字中部可复现用户截图类似半行；详情返回保留这个用户位置，Home完整恢复。只能证明该机制可复现，不能断言用户截图必由该操作造成。未发现新开/字体加载/导航引入的非预期裁切，未修改滚动策略。长列表底部仍按既有设计滚动查阅。

私有证据：evidence/private/product-064/下before-1280.png、after-1280.png、before-after-1280.png；对应380；before/after-typography.json及scrolled图。比较截图均关闭入场动画、相同900高视口和未滚动状态；旧版绑定旧RC2 CSS SHA，非凭记忆重建。用户截图原字节保全。

## 回归与不变项

最终完整CI结果绑定RC2_MANIFEST.json。实际1280/380 Chromium验证四卡、135 Fact可达、键盘/滚轮、焦点返回、刷新、后台字段不进核心摘要、中英文长文、双打印按钮与打印后恢复；生产Review隔离Confirm/Edit/Defer/Exclude/Undo及保存通过。A4摘要3页37 Fact；完整22页135 Fact；全文值/标量label映射、页外文字、重叠和空白页检查通过，全部25页渲染目视复核。P063结构、identity、backup/rebuild检查继承，非本轮新测；本轮CSS不改这些逻辑。

17项候选SHA保持e68291eb8ddbed6186ead4b66f4a728c943fc749d3c9b04aaf317402166022aa，原83,084 bytes决策表SHA e0f6e07a61b24ca104adf8af86051faa44bcfaafcb5e75e376b41a0d63c1ef24；生产app.js与旧RC2相同。旧ZIP/manifest/CSS在私有product-064/before/恢复点，包SHA以新manifest recovery记录为准。无付费调用、重扫、trusted变更、正式profile操作、commit或push。

## 剩余与集中验收

Typography观感及实际Side Panel容器由Human验收；真实校园线上增量、非MA6081课程、原始GAI PDF仍未验证。来源固有待核实（展示slot、2h/3h、相似度边界、Part3版本等）继续保留，不把P064写成全部KNOWN。完整边界沿用P063 manifest和Human指南。

仅Changed Files定点回传；私有课程截图/PDF/profile不进入普通Drive镜像。Drive Desktop逐文件大小/SHA回读属于挂载校验，不冒充服务器确认。停止Human Gate5，未实际PASS不得发布。
