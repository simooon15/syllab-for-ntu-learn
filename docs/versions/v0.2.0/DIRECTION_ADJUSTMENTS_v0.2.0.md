# Syllab for NTU Learn — Direction Adjustments v0.2.0

> **HISTORICAL INPUT · CONSOLIDATED.** 本文保留开工后指令的原始顺序与纠正过程。
> 统一决策索引见 `DECISION_LOG_v0.2.0.md`；最终产品定义见 `PRD_v0.2.0.md`。

**产品版本：** v0.2.0
**文档性质：** 开工之后由 Product Owner 追加的补充指令与方向调整记录
**记录范围：** 从 v0.2.0 开发开始，**经 Gate 3 执行阶段，到本次 Engineering Handoff 冻结指令为止**。
Gate 3 自身的指令记录在 §2.22 / §2.23，其**执行结果**记录在 `GATE3_FINDINGS_v0.2.0.md`；
本次交接冻结期的边界见 §2.29。Gate 3 之后的 **Documentation Consolidation & Final Acceptance 仍未开始**
（Product Owner 明确延后），也不在本文件范围内。

---

## 0. 这份文档是什么

v0.2.0 的正式产品设计事实源（PRD / PRODUCT_HANDOFF / Interaction & IA Spec）在开工前已经收口。
本文件记录的是**在此之后**由 Product Owner 追加的补充指令与方向调整，以及它们各自造成的实际改动。

保留它的原因：

1. 这些调整改变了已锁定的交互细节与视觉规则，属于版本历史的一部分；
2. 其中两条是对交付结果的**纠正**，说明了当初哪一版判断是错的、错在哪里；
3. 后续版本若要重开这些决策，需要先看到当初为什么这样定。

本文件不是产品事实源。**但它记录的是 Product Owner 的正式决定，因此不自动让位于开工前的 baseline。**
版本优先级规则见 §0.1。

### 0.1 版本优先级规则（Product Owner 已确认）

1. **PRD / PRODUCT_HANDOFF / Interaction & IA Spec 是开工前的正式 baseline。**
2. **本文件中明确记录、且由 Product Owner 当场或后续确认的正式调整，在时间上晚于 baseline。**
3. **如果后续的正式 Product Owner Direction 明确覆盖 baseline 中的旧规则，则以后续正式调整为准。**
4. **旧正式文档暂时允许存在历史不一致**——被覆盖的旧规则不会被就地改写，以免抹掉历史。
5. 这些不一致会在之后**单独进行**的 `Documentation Consolidation & Final Acceptance` 中统一回填。
6. **Claude / 任何实现助手自己提出、但 Product Owner 没有确认的建议，不获得这种覆盖权。**

**已经明确发生覆盖的两条（不改动决定本身，仅在此登记）：**

| 本文件 | 覆盖 / 影响对象 | 性质 |
| --- | --- | --- |
| §2.20 | Interaction Spec §3.5（未建立课程的状态表达） | 覆盖：由"仅视觉表达"改为"与邻卡同形 + 一行小字" |
| §2.25 | Interaction Spec §2.2（工具栏入口落点） | 覆盖：在 NTU Learn 上一律打开 Side Panel |

除本文件明确登记为"覆盖"的条目外，其余 baseline 规则仍然有效。

---

## 1. 指令一览

| # | 阶段 | 指令 | 性质 |
| --- | --- | --- | --- |
| 1 | 开发中 | 需要添加必要的动效，还要注意维持页面整体的气质 | 新增要求 |
| 2 | 开发中 | 即使是可以点击的文字下面也不要有线 | 视觉规则 |
| 3 | 截图阶段 | 由于后续界面会变化，建议截图的项目重做 | 流程调整 |
| 4 | 收尾阶段 | Gate 1 和 Gate 2 全都自动做 | 验收方式 |
| 5 | 收尾阶段 | 接入最终 Logo 资产包 | 资产替换 |
| 6 | 纠正 | 这不是还有下划线吗 | 纠正第 2 条的执行 |
| 7 | 核实 | 下划线变化之后有没有重新截图 | 证据核实 |
| 8 | 补充 | 主界面里没有用我们的 logo 吗 | 覆盖范围扩大 |
| 9 | 纠正 | 我没说 masthead 只在 Semester 页渲染 | 纠正第 8 条的理解 |
| 10 | 纠正 | 有些 logo 显示异常了啊 | 纠正实现缺陷 |
| 11 | 补充 | 顶部的字样并不统一，有的时候部分字样会跑到下面来 | 布局一致性 |
| 12 | 交付 | 打包一个可直接加载的扩展包，并在 README 写使用方法 | 交付形态 |
| 13 | 交付 | README 里的界面说明没有中文 | 交付文案 |
| 14 | 纠正 | 顶部不统一的问题没解决，而且你给我的说明截图里面就有部分是坏的 | 纠正 §2.9 的执行 |
| 15 | 纠正 | 返回按钮和标题的对齐在很多界面都不一样 | 纠正 §2.12 的遗留 |
| 16 | 交付 | 交付时再加一份方向调整说明 | 本文档 |
| 17 | 交付 | Delivery Audit 收口（A1–A8） | 修复 |
| 18 | 交付 | 页面文字布局的协调性还要再提升，有没有相关的指导规范 | 视觉规则 |
| 19 | 交付 | Calendar Export 从未接到产品上（截图复核时发现） | 缺陷修复 |
| 20 | 交付 | Semester-aware Date Resolution + CAL-01 三态 + design-system 进交付包 | **Product Definition Change** |
| 21 | 交付 | 页面整体偏高，顶部余白不足 | 视觉规则 |
| 22 | 交付 | 课程卡片两色交替、相邻不同色、尺寸对齐 | 视觉规则 |
| 23 | 交付 | 未建立课程用与邻卡相同的卡片形态 + 一行小字 | **覆盖已锁定规则（§3.5）** |
| 24 | 纠正 | 有的界面 Logo 会错位 | 纠正实现缺陷 |
| 25 | Gate 3 | Real Environment Acceptance（真实 Chrome / NTU Learn / DeepSeek / 扩展） | 验收方式（**已修订**，见第 26 条） |
| 26 | Gate 3 | 不建大型 Harness；改为 Production Build / QA Build / One-click Runner 三者共用同一套产品源码 | 验收方式（**已执行**） |
| 27 | Gate 3 | 先核查真实链路；若是既有产品要求的漏实现就直接补，不定义成新产品能力 | 缺陷修复（**已执行**，见 §2.24） |
| 28 | 使用中 | 「在 NTU Learn 里打开插件直接就跳到 full page，不是应该是 side panel 吗」 | **覆盖已锁定规则（Interaction Spec §2.2）**，见 §2.25 |
| 29 | 开发中 | 课程名去掉「学期 / 学院 / 代码」前缀，并改为 Title Case | 表现层规则，见 §2.26 |
| 30 | Gate 3 | 「不是手动跑然后脚本记录吗」——改为用户操作、脚本观察记录；脚本不代做产品判断 | 验收方式（**已执行**），见 §2.27 |
| 31 | Gate 3 | 产品文档没定义过的用户可见状态 / 文案一律去掉或对齐（起点是 `Progress saved.`） | **产品语义清理原则**，见 §2.28 |
| 32 | 交接 | 冻结现状；只允许四类修改；禁止继续开发、禁止重跑 Gate 1 / Gate 2 | 工程流程边界，见 §2.29 |

---

## 2. 逐条记录

### 2.1 动效：需要必要的动效，并维持整体气质

**指令：**「需要添加必要的动效，还要注意维持页面整体的气质」

**意图：** 补齐 Interaction Spec 已经要求、但实现中缺失的状态过渡（`.ics` 的 fade 反馈、Scan 阶段的循环
提示、Toast 反馈等），同时不允许因此变成"有动画的网页"。

**实际改动：** 在 `extension/src/app/app.css` 增加一套有节制的动效词表——页面切换 `settle` 160ms、
列表按阅读顺序 0/30/60/90ms 错位、fact ↔ evidence `swap-in` 180ms、展开 `disclose` 150ms、
反馈 `notice-in` 160ms、扫描阶段 `stage-breath` 2.4s 循环。

**约束（写进 `docs/design-system.md`）：**

- 全站只允许**两处**无限循环（working marker、扫描阶段）；
- 循环曲线的两端斜率必须非零，否则接缝处会顿住；
- 装饰性动效不得慢于四分之一秒；
- `prefers-reduced-motion` 下全部关闭，且不因此丢失信息。

**验证：** `extension/src/app/stylesheet.test.ts` 机械断言上述四条规则，不依赖人工检查。

---

### 2.2 可点击文字不得有下划线（含第一次纠正）

**指令：**「即使是可以点击的文字下面也不要有线」
**纠正：**「这不是还有下划线吗」

**第一次执行（不正确）：** 我移除了 `.link-action`、`.menu-item`、`.evidence-locator` 的
`text-decoration: underline`，并写了一个扫描样式表文本的测试。测试全绿——但 Product Owner 屏幕上
仍然有线。

**错在哪里：** 那条线不是 `text-decoration`，而是 `border-bottom`：

```css
.fact-value.is-swappable { border-bottom: 1px solid var(--line-strong); }
```

`.constraint` 的正文同样是证据触发器，也有同类边框。**基于样式表文本的检查看不见边框画出来的线**，
所以测试给了我一个错误的信心。

**最终改动：**

- `.fact-value.is-swappable` 与 `.constraint` 去掉边框线，可点击性改由悬停底色（`--green-tint`）表达；
- 测试改为**白名单式**：任何新增的 `border-bottom` / `border-top` 实线都必须显式登记为列表分隔线
  （目前只允许 `.calendar-event`、`.settings-section`、`.constraint` 的行分隔），否则测试失败；
- 同时补上 `a, u { text-decoration: none }` 的 reset，因为浏览器对链接的下划线默认样式同样不在
  样式表里出现，纯文本扫描永远抓不到。

**教训（已写入 `docs/design-system.md` 第 13 节）：** 视觉规则必须用"能画出一条线"的口径去检查，
而不是用某一种 CSS 属性的字面值。

---

### 2.3 截图项目重做

**指令：**「由于后续界面会变化，我的建议是截图的项目重做」

**意图：** 不要把当前这一版截图当成最终证据；界面还会变。

**实际改动：** 截图不再是手工步骤，而是 `npm run gate:2` 里的一环：

```text
截图采集（真实渲染路径） → 回填 Interaction Spec 与 README
```

每次运行都重新采集全部 39 张并覆盖回填，所以界面再变，证据与文档自动跟上。

**核实（见 §2.4）：** 逐字节比对，采集目录与文档图片目录一致 39 张、不一致 0 张。

---

### 2.4 下划线改动后的截图核实

**指令：**「我们界面下划线的部分变化以后有没有重新截图」

**回答与证据：**

| 时间 | 事件 |
| --- | --- |
| 09:07:26 | 下划线修复写入 `app.css` |
| 09:11:30 | 重新采集 39 张 |
| 09:11:36 | 回填 Spec 与 README |

`artifacts/screenshots/v0.2.0/*.png` 与 `docs/versions/v0.2.0/images/*.png` 逐字节一致：39/39。

---

### 2.5 Gate 1 与 Gate 2 全部自动化

**指令：**「gate1 和 gate2 全都自动做」

**实际改动：** 两个 Gate 都是一条命令，各自产出机器可读 JSON 与 Markdown 报告：

```bash
npm run gate:1
```

```bash
npm run gate:2
```

链路：`构建 → CI → 真实扩展 E2E → 截图采集 → 发布包生成与校验 → Spec/README 回填 → 证据清单 →
AI 回归 → 数据完整性 → 一键交付包 → 报告`。

**结果：** `gate-1: AUTOMATED_PASS`、`gate-2: AUTOMATED_PASS`。执行的步骤数与逐条结果以各自
`artifacts/gates/v0.2.0/<gate>/report.json` 为准；`REPORT.md` 的摘要由 `report.json` 生成，
不再手写计数——手写的计数会随步骤增减而过期。

报告明确分开三层：**Automated PASS / 需要 Product Judgment / NOT TESTED**。Live DeepSeek 与真实
NTU Learn 课程在本环境没有凭据，保持 `NOT TESTED`，不用 fixture 冒充。

---

### 2.6 接入最终 Logo 资产包

**指令：** 接入 `syllab_logo_final_assets.zip`。并明确约束：不重新设计、不修改图形、不优化概念、
不生成新版本；`syllab-logo-master.svg` 是唯一主源；PNG 只是同一 SVG 的不同尺寸导出；不允许用
emoji、临时图标、文字首字母或其他图形替代。

**实际改动：**

- 5 个正式资产就位于 `assets/logo/`，同样的 PNG 就位于 `extension/public/icons/`；
- **删除**我原先自行绘制的占位 SVG 与派生脚本 `scripts/generate-icons.mjs`——该脚本会从主源重算 PNG，
  可能覆盖 Product Owner 手工导出的尺寸；
- 界面上原先用 CSS 方块拼的临时标记（`.brand-fold` / `.brand-sheet`）换成 `brandMark()`，
  只加载正式 PNG，组件无法自造标识；
- `docs/design-system.md` 增加 Product Mark 章节，写明禁止重绘与禁止重算 PNG。

---

### 2.7 主界面没有使用 Logo（含纠正）

**指令：**「主界面里没有用我们的 logo 吗」
**纠正：**「我没说 masthead 只在 Semester 页渲染」

**第一次理解（不正确）：** 我把范围理解成"侧栏的 Semester 列表补上即可"，因为 Full-page 的 masthead
当时只在 Semester 页渲染，我按现状描述并据此实现。

**纠正后的实际改动：** 把品牌标识从单个页面提升到 **shell 层**：Semester 全部 + Course 全部，两个
surface 一致，统一带 Mark + 字标。

**验证：** `extension/src/v2/screens/render.test.ts` 断言 SEM-01 / SEM-02 / CRS-01 / CRS-02 都带正式
Mark，且来自 `icons/syllab-logo-48px.png`。

> **后续修订：** 这一版最初把 Scan / Review / Rebuild 这类流程页排除在外。Product Owner 在 §2.9
> 指出顶部因此仍然不一致，品牌行最终改为**所有页面**一律渲染。以 §2.9 为准。

---

### 2.8 Logo 显示异常

**指令：**「有些 logo 显示异常了啊」

**根因（两处，都是实现缺陷，不是资产问题）：**

1. **容器尺寸**：`.brand-mark` 仍是旧占位图形的 `26px` 盒子，把 `48px` 的图片塞进去后溢出并压到字标上。
   已改为 28px 盒子 + 图片 `width/height: 100%`。
2. **尺寸下限**：48px 导出里，图形本身只占 `32×40`，四周各有约 8px 透明边距。因此 24px 的盒子实际
   只画出约 `16×20` 的图形，折页结构糊在一起。改为 28px（图形约 `19×23`），并写进测试下限，
   防止再被调小。

**顺带确认：** 品牌标识的颜色与构图未作任何改动；只调整了显示尺寸。

---

### 2.9 顶部字样不统一

**指令：**「顶部的字样并不统一呀，有的时候部分字样会跑到下面来」

**根因（两处，均为实现缺陷）：**

1. **头部布局规则缺失。** Review 页的 `.review-header` 是 `display: flex`，所以 `‹ MA6081  1 of 3`
   在同一行；而 Course 页与 Scan 页的 `.course-header` **在样式表里根本没有规则**，是普通 block，
   于是 `‹` 被标题块挤到单独一行。Settings 页是第三种写法。同一产品、三套顶部结构。
2. **品牌行只出现在部分页面。** 品牌标识当时只加在"阅读型目的地"页面，Scan / Review / Settings
   没有，因此从 Course Brief 走进 Scan 时，顶部会少一行、整体上移。

**实际改动：**

- 用一个共用规则统一三种头部：`.review-header`、`.course-header`、`.settings-header` 都是
  `display: flex; align-items: flex-start; gap: 12px`，返回箭头永远与标题首行对齐；
- Settings 的标题改用 `.screen-title`，不再借用品牌字标的 `.product-name` 类；
- 品牌行提升为 **shell 的一部分**，所有页面（含 Scan / Review / Rebuild / Settings）一律渲染，
  顶部形状不再随页面变化。

**验证：** `extension/src/v2/screens/render.test.ts` 断言任务页（ISC-02）同样带正式 Mark；
`extension/src/app/stylesheet.test.ts` 断言三个头部类共用 flex 规则、且不存在借用品牌类的
页面标题。真实浏览器实测：CRS-02 / ISC-02 / IRV-01 / SET-01 四屏的返回箭头与标题首行 top 值一致。

**顺带发现的命名问题：** 旧代码把品牌字标的 `.product-name` 类复用为 Settings 页标题，容易让后续
改动误以为那是品牌位。已拆分为 `.product-name`（品牌）与 `.screen-title`（页面标题）。

---

### 2.10 交付形态：可直接加载的扩展包

**指令：**「为了方便上传 GitHub 之后公开使用，仓库里再打包一个整个扩展、开箱即用的包，用户下载解压后
直接在 Chrome 里加载；README 里写一个使用方法」

**意图：** 让拿到仓库的人**不需要装 Node、不需要构建、不需要跑任何服务**就能试用。此前 README 的
使用方式要求先 `npm run build`，对普通使用者门槛过高。

**实际改动：**

- 新增 `scripts/package-extension.mjs`（`npm run package`）：产出
  `artifacts/Syllab_Extension_v0.2.0.zip`，解压后是一个 `Syllab-v0.2.0/` 文件夹，内含完整扩展与
  `HOW-TO-INSTALL.txt`（中英双语安装说明）；
- 打包前**拒绝**产出不合格的包：若 bundle 仍含测试桥（`syllab.e2e/1`）或出现密钥形态字符串则直接失败；
- zip 使用固定时间戳生成，同一份代码每次打包结果一致，便于比对与校验（同时输出 `sha256`）；
- 新增 `scripts/verify-package.mjs`（`npm run package:verify`）：把 zip 解压到干净目录、用**全新浏览器
  profile** 加载该目录，确认 Service Worker 启动、Full-page 与 Side Panel 都能渲染、包内无测试桥；
- 两步都接入 `npm run gate:2`，所以每次发布验收都会重新打包并证明它可用；
- README 增加「下载即用」安装章节（中英双语），并把原有的"先构建"路径保留给开发者。

**为什么用脚本而不是手工压缩：** 手工产出的包无法复现，也无法在后续版本里自动验证；脚本化之后
"这个包能不能用"由机器回答，而不是由下一次手工点击回答。

**说明：** 该包是**未打包发布到 Chrome Web Store 的开发者版本**，需要用户手动以「加载已解压的扩展程序」
方式安装。这是 v0.2.0 范围内的取法（PRD 明确本版不含商店发布）。

---

### 2.11 README 界面说明缺中文

**指令：**「readme 里面的界面说明没有中文」

**根因：** README 的中英两个区块共用同一个占位标记 `<!-- PRODUCT_WALKTHROUGH -->`，回填脚本用
`replaceAll` 把**同一份英文文案**灌进两处。所以中文区有中文标题、却是英文说明。

**实际改动：**

- 标记拆为 `<!-- PRODUCT_WALKTHROUGH_ZH -->` 与 `<!-- PRODUCT_WALKTHROUGH_EN -->`；
- 回填脚本改为按语言各写一份文案：中文区用中文小标题（学期总览 / 侧栏课程列表 / Course Brief /
  首次扫描 / Initial Review / Change Review / Settings / 备份 / 恢复）与中文说明，英文区保持英文；
- 产品对象名（Assessment、Course Brief、Initial Review 等）按项目语言规范保留英文，不翻译。

---

### 2.12 顶部仍然不统一，且我方证据截图本身有问题

**指令：**「顶部不统一的问题没解决，甚至你给我的说明截图里面就有部分是坏的」

这一条同时指出两个问题：**产品没修好**，以及**我提供的证据不可信**。两条都成立。

#### 我错在哪里（先记这一条）

上一轮我用 `backTop` / `titleTop` 两个数值判定"已对齐"，拿其中 4 屏的数据就下了结论，并且**只看了
其中 2 张图就把 4 张一起发了出去**。更糟的是那 4 张图是我用 `clip = 380×150` 硬裁的，把
"Fundamentals of Project Management" 直接切断在中间——**证据本身是坏的**，等于用坏证据支撑了一个
不完整的结论。

正确做法（已改为约定）：**截图按内容高度裁切，且发出前逐张看过**。数值只用来定位，不用来替代查看。

#### 产品侧的真实根因（三条，之前都没修到）

1. **`.prompt-screen .course-header { display: grid }`。** 这是 SEM-07 头部还是"两行文字块"时代的
   规则，特异性高于统一后的 flex 规则，于是把返回箭头甩到了整行的中间、课程名压到下面——
   这正是"看上去是坏的"那一屏。
2. **SEM-07 / ISC-01 的返回箭头没包在 header 里。** 它作为兄弟节点直接挂在页面上，与其它页面
   "header 内包含箭头 + 标题"的结构不同。
3. **品牌行高度不固定。** `.masthead` 靠内容撑高，标题的默认外边距让它在不同页面高度不同，
   于是品牌行下面的所有内容在页面之间上下位移。
4. **Review 头部缺课程名。** Course / Scan 头部是 `‹ MA6081 / 课程名`，Review 只有 `‹ MA6081 1 of 3`，
   顶部块因此高一截矮一截。

#### 实际改动

- 删除 `.prompt-screen .course-header` 的 grid 覆盖，头部布局只由一条共享规则决定；
- SEM-07 / ISC-01 的箭头与标题改为与其它页面相同的 header 结构；
- `.masthead` 固定 28px 高并清除标题默认外边距，品牌行在每一屏都是同一尺寸；
- Review 头部补上课程名（紧凑字号），与 Course / Scan 头部同形，进度仍靠右；
- 顺带清理了被注释割裂、重复了 `.course-header` 的选择器列表。

#### 实测结果（Full-page，视口 1180）

| 页面 | 品牌行 top / 高 | 头部 top |
| --- | --- | --- |
| CRS-01 | 24 / 28 | 80 |
| SEM-07 | 24 / 28 | 80 |
| IRV-02 | 24 / 28 | 80 |
| SET-01 | 24 / 28 | 80 |
| SEM-01 | 24 / 28 | 80 |
| ISC-05 | 24 / 28 | 80 |
| CRV-01 | 24 / 28 | 80 |
| CAL-01 | 24 / 28 | 80 |

Side Panel 各屏一致为品牌行 16 / 头部 72（窄栏内边距更小是既定差异）。

#### 防回归

- `stylesheet.test.ts` 新增断言：**任何"页面作用域 + 头部类"的选择器都不得再设置 `display`**，
  即头部布局不允许被局部规则掀掉——这正是第 1 条根因的形态；
- `render.test.ts` 断言任务页同样带正式 Mark。

---

### 2.13 返回按钮与标题的对齐在各页面不一致

**指令：**「又发现了一个问题，返回按钮和标题的对齐在很多界面都不一样」

**说明：** 这是 §2.12 没修完的遗留。§2.12 只统一了 header 的**容器**（flex 方向、位置），
没有统一**返回箭头与首行文字的垂直关系**。

**根因（两条）：**

1. **`.review-header { align-items: center }` 覆盖了共享规则。** 共享规则写的是
   `align-items: flex-start`，而 Review 页另有一条 `align-items: center`（特异性相同但更靠后），
   于是 Review 页的箭头是对整块居中，其它页面是对首行顶对齐——实测箭头中心与首行中心相差
   **Review 页 13px、其它页 4px**，肉眼就是"不一样"。
2. **顶对齐本身就是错的对齐方式。** `flex-start` 对齐的是"盒子顶边"：箭头是 26px 字号、课程代号是
   13px/1.4，两者顶边对齐后中心自然差 4px。而 SET-01 的首行是 24px 标题，差值又变成 0——
   即**差值取决于相邻元素是什么**，这就是"很多界面都不一样"。

**实际改动：**

- 删除 `.review-header { align-items: center }` 覆盖；
- 共享 header 规则改为 **`align-items: baseline`**：箭头坐在首行文字的基线上，无论首行是课程代号
  还是页面标题、也无论标题是否折行，关系都相同；
- 防护测试从"禁止页面作用域规则改 `display`"扩展为**同时禁止改 `align-items`**——这次的根因正是
  `align-items`，上一版防护漏掉了它。

**实测结果：**

| 页面 | align | 箭头中心 − 首行中心 | 箭头底 − 首行底 |
| --- | --- | --- | --- |
| SEM-07 / CRS-01 / CRS-06 / ISC-05 / CAL-01 | baseline | −6 | **−2** |
| IRV-02 / CRV-01 / IRV-01 | baseline | −6 | **−2** |
| SET-01 | baseline | −2 | **−2** |
| CRS-02 / ISC-02（Side Panel） | baseline | −6 | **−2** |

**基线差在所有页面都是 −2px**，即箭头与首行文字的关系处处相同。中心差因首行字号不同而不同，
但那是文字本身的高度差，不是对齐差异。

**证据：** 11 张顶部截图逐张人工查看确认（不再只凭数值判定——见 §2.12 的教训）。

---

### 2.14 Delivery Audit 收口

**指令：** 由一次独立 Delivery Audit 提出的 A1–A8，要求修完并重新通过 Gate 1 / Gate 2。

**A1 — 正式包不得携带测试桥。** 审计指出 `background.js.map` 含 `syllab.e2e/1`。这只是症状，实际有三层：

1. esbuild 的 `sourcesContent` 把 `e2e-fixtures.ts` 全文写进了 source map；
2. 关掉 source map 后，release 包里仍留着 `if (false) { …整段测试桥… }`——esbuild 不消除函数体内的死分支；
3. 用 `minifySyntax` 消掉分支后**仍然**残留 fixture 数据：`fixtures.ts` 顶层是 `randomId(...)` 这类调用，
   esbuild 判定有副作用，整棵模块图被保留。

最终做法不是"消除死代码"，而是让 release 构建**根本不读**这个模块：构建期把 `e2e-fixtures` 换成惰性
stub（`e2e-fixtures.disabled.ts`）。现在 `syllab.e2e/1`、`E2E_SEED`、`E2E_BACKUP`、`E2E_OPEN`、
`E2E_FAILED`、`e2eBackup`、`handleE2e`、`isE2eMessage`、fixture 数据与 source map 在 release 产物里
一个都没有。清单集中在 `scripts/lib/release-markers.mjs`，由 `package-extension`、`verify-package`
（扫描 **zip 内每一个文件**）与 `evidence-inventory`（扫描 `dist` 每一个文件）三处共用。
扩展包因此从 30 个文件 1.9 MB 降到 24 个文件 1.0 MB。

**A2 — Task A / B 职责描述。** Technical Design 第 10 节写作"Task B produces Assessment Drafts"，
与 Product Handoff §12.1 / §12.2 相反（Assessment Drafts 由 Task A 产出，Task B 接收它并解析
identity / canonicalization / structure）。核对 `ai-contracts.ts`：`assessmentDrafts` 属于
`TaskAResult`，`TaskBResult` 是 `identityResolutions` / `canonicalAssessmentProposals` 等。
**实现本来就正确，只修文档**，未改动任何 Prompt。

**A3 — Mixed PDF 状态。** §8.3 原先写得像已实现。核对代码：`FetchedSource.pageImages` 与
`ai-context.ts` 的 `visualParts` 分支存在，但**没有任何代码路径产生页面图像**，`parse-runner.ts`
（唯一创建 offscreen 文档的模块）无人 import。已改写为 `Planned / not implemented in the current
v0.2.0 delivery`，并写明后果：图像页当前被读作空文本。

**A4 — Logo Master 进交付包。** `assets/logo/` 五个正式资产加入 `package-delivery.mjs`，并在打包前
断言五个文件都在。README 顶部加入对 SVG Master 的引用，使 PRD 与 README 的品牌引用在交付包内都能解析。

**A5 — README 回填幂等。** 原先的写法是"把 marker 替换成正文"，marker 被吃掉后再次运行就不再更新；
README 因此累积了 6 份重复的英文走查（22.8 KB）。改为 `<!-- SYLLAB_SCREENSHOTS_ZH_START/END -->` 与
`_EN_` 成对标记，只替换标记之间。新增 `scripts/verify-readme-backfill.mjs`（`npm run readme:verify`）
并接入 `ci` 与 `gate:2`，断言：每个语言恰好一份、标记完整、连跑两次逐字节相同、磁盘上的 README 就是
回填结果。README 恢复到 13.1 KB。

**A6 — Gate 步数。** 文档手写的 `10/10` 与实际 13 步不符。`REPORT.md` 的步数摘要改为从 `report.json`
生成，gate-2 验收文档不再写死数字。新增 `scripts/verify-documented-facts.mjs`（`npm run docs:verify`）
校验 `REPORT.md` 与 `report.json` 一致。

**A7 — 方向调整文档措辞。** §3 的"页面结构与信息层级 | 未改动"改为"页面主体信息架构未改动；
Shell / Header 结构有调整"，并合并了两条重复的 header 行。没有把它写成 IA 重构。

**A8 — IndexedDB 版本。** Technical Design 三处写 v5，实际 `V2_DATABASE_VERSION = 6`。改文档并补充
说明 v5 → v6 的**原因**（v0.1.0 的五个 store 被保留供就地迁移；v6 增加 v0.2.0 的 17 个 store 并给
durable 表加上 `restoreGeneration`，Restore 的原子替换依赖它）。同一检查并入 `verify-documented-facts`。

---

### 2.15 文字布局协调性

**指令：**「页面文字布局的协调性还要再提升，有没有相关的指导规范」

**诊断：** 规范是 `docs/design-system.md`，§5 管字体、§6 管间距，但 §6 只写了"组件内用
8/10/12/14/16，块之间用 22/26，优先用已有的步长"，没有说明"卡片内条目间隔"归哪一档、"两个并排的
文字"归哪一档。结果是**同一个视觉关系带着好几个值**：

| 关系 | 改动前的值 |
| --- | --- |
| 卡片内条目间隔 | 8 / 10 / 12 / 14 / 16 |
| 两个并排的文字 | 8 / 10 / 12 / 14 / 16 |
| 卡片内边距 | 12 / 14 / 16 / 18 |
| 极小间隔 | 2 / 4 / 5 / 6 |
| 区块之间 | 14 / 16 / 18 / 20 / 22 |

没有一个值本身是错的；**一个关系有五个值**才是"说不出来但一直觉得不齐"的来源。另外 §6 里
"Page padding is `20px 20px 26px` on `main`, so the content column is `340px`" 是 v0.1.0 popup 的
遗留描述，与 v0.2.0 无关。

**改动：** 定下九级刻度，每一级对应唯一一种关系（见 design-system §6.2）：

`2`（纯光学）· `4`（同一块内的行）· `6`（图标与紧邻文字）· `8`（列表/卡片内的兄弟项）·
`10`（一组条目；并排的文字）· `12`（卡片内的分块）· `16`（卡片内边距；卡片之间；并排控件）·
`22`（区块之间；header 到内容）· `28`（身份行之下）

按此收敛 **45 处** `app.css` 声明。**只改间距数值**：配色、字体、字号、圆角、布局结构一处未动。

**两个轴刻意留在刻度之外**，因为它们不是"两个东西之间的距离"：

- **页面边距**：全页 `24 / 40`，侧栏与 <560px `16 / 32`（下边 = 侧边 + 16）。两种密度保持不同是有意的
  ——侧栏是同一产品更紧的档位，不是同一个数值。
- **标签列**：全页 `116px`、侧栏 `96px`；对齐到该列的值缩进 `126px` / `106px`。三个数字是同一个事实，
  改标签宽度而不改缩进就会错位。

**验证：** `stylesheet.test.ts` 新增三条机械断言——① 任何 `margin/padding/gap` 的数值必须落在这套刻度
或上述两个轴内；② 标签列宽度与缩进值必须满足 `缩进 = 宽度 + 列间距`；③ `.link-action` / `.menu-item`
必须 `text-align: left`。三条都做过反向测试（把 `gap: 6px` 改成 `7px`、把 `min-width` 从 116 改成 120），
都会失败并指出具体规则。

**顺带修掉的两处（都是看截图时发现，不是看数值发现的）：**

1. Course Brief 底部的 `More` 落在页面正中间，而它周围的每一行都是左对齐。根因是 `button` 默认
   `text-align: center`，而 `.more-menu { display: grid }` 把按钮拉伸到整列宽，于是文字居中。
   `.fact-value`、`.evidence-locator`、`.constraint-content`、`.course-card-main` 都显式写了
   `text-align: left`，只有 `.link-action` / `.menu-item` 漏了——这条漏掉的影响的是 More 与展开后的
   每一个菜单项。已在 `app.css:838` 补上。
2. BKP-02 的 Backup 摘要里 "AY2026/27 · Semester 1" 出现了两次，看起来像数据重复。实际是验收 fixture
   的问题：`empty-semester` 场景做真实 rollover 时，写入的新学期**复用了旧学期的 label**，于是库里
   同时存在两个同名学期。rollover 应该落在下一个学期上，已改为 `AY2026/27 · Semester 2`。这是 fixture
   数据修正，不是产品缺陷。

**证据：** 39 张截图由 `npm run gate:2` 重新采集，并逐张查看。

---

### 2.16 Calendar Export 从未接到产品上

**发现方式：** 查看 CAL-01 截图时发现它永远是"没有可导出的日期"。截图没错，是产品的问题。

**三个事实：**

1. **预览永远是空的。** `ctx.view.exportPreview` 只被 `extension/src/v2/screens/fixtures.ts` 填充——那是渲染
   测试用的 fixture 模块。`ViewBuilder` 里没有任何 calendar 投影，只有两个 `exportCalendar: true` 的
   能力标志。所以无论课程状态如何，CAL-01 都显示空状态。
2. **导出动作不被处理。** 契约里有 `EXPORT_CALENDAR`（`contract.ts`），`mount.ts` 也确实发送它，但
   `handler.ts` 的 `switch` 没有这个 case，落到 `default:` 返回
   `{ ok: false, code: "UNSUPPORTED" }`。点 Export calendar 只会得到一句"此操作不可用"，不下载任何文件。
3. **纯逻辑是完整的。** `calendar-export.ts` 的 `exportCalendar()` 直接返回
   `{ fileName, content, events }`，12 个测试全绿。缺的只是两个连接。

**改动：**

- `ViewBuilder` 增加 `buildExportPreview()`，仅在 `CAL-01` 时投影 `exportPreview`，直接复用
  `exportCalendar()`——预览与下载走同一次调用，所以预览不可能承诺文件里没有的事件；
- `handler.ts` 增加 `EXPORT_CALENDAR` case：读取课程与快照 → `exportCalendar()` → 走已有的下载通道；
- 新增 `extension/src/v2/view.test.ts`（3 条，真 store + 真 ViewBuilder）：确认日期产生事件、带
  competingValues 的日期被排除、只在该屏投影。做过反向测试（注释掉投影那行，2 条失败）；
- 新增 `extension/src/v2/contract-coverage.test.ts`：契约声明的每一种消息都必须在 handler 里有 case。
  这是**源码级**断言而不是行为级断言——它证明 case 存在，不证明 case 正确；正确性由各消息自己的测试负责。
  同样做过反向测试（把 case 改名，测试报出 `EXPORT_CALENDAR` 未处理）。

**这个漏洞为什么之前没人发现：** 类型系统看不到它（联合类型和 switch 之间没有连接），渲染测试也看不到它
（渲染测试自己提供 view，不经过 ViewBuilder）。缺的这条断言现在补上了。

**同时发现、但本轮没有改的 Product 级问题（需要 Product Judgment）：**

`normalizeDateValue()` 只接受 ISO（`2026-11-12`）和 `2026-11-12`／`19/11/2026` 两种写法。而
**没有任何东西保证日期以这种形式到达**：Prompt（与 handoff 逐字节一致、已锁定）只规定
`field: {"fieldName", "state", "value", ...}`，对 `value` 的格式没有任何要求；上游也没有任何归一化步骤
（`normalizeDateValue` 全仓库只被导出器自己调用）。

所以真实课程里，模型很可能返回来源的原话（例如 `18 Oct`），导出器无法解析，于是**一个事件都不会产生**
——用户看到"没有可导出的日期"，而 Course Brief 上明明写着 deadline。这与 KR-07 是同一类问题从另一扇门
进来：不是静默选错，而是静默省略。

不擅自放宽解析是有意的：`18 Oct` 没有年份，猜一个年份会产生错误的日历事件。可行的方向是让 CAL-01
**说出来**——例如"有 2 个日期无法落到日历上"——而不是显示空状态。这属于用户可见的产品决定，需要
Product Owner 明确后再做。

**状态：** 真实课程上日历是否非空，取决于真实抽取返回的日期形态，因此列入 Gate 2 的 NOT TESTED，
由 Phase B 的真实 DeepSeek 运行（R4）回答。

---

### 2.17 Semester-aware Date Resolution（Product Definition Change）

**指令：** 来源出现 `18 Oct` 这类缺年份的日期时，系统不得简单地当成不可导出，也不得由 Calendar Export
层根据当前日期自行猜年份。正式规则：**如果 Course 所属 Semester context 足以唯一确定年份，就基于
Semester context 做确定性的年份补全。**

这一条被明确界定为 Product Definition Change，而不是 Calendar bug fix，也不是改 Prompt。

#### 2.17.1 职责边界

| 层 | 负责 | 不负责 |
| --- | --- | --- |
| AI | 识别"这是一个日期"、日期类型（deadline / exam / submission / milestone …）、原始 value 与 evidence | 不自由猜年份；不推断 NTU Academic Calendar |
| Local（`date-resolution.ts`） | 接收 `raw value + Course Semester context`，输出 `canonicalDate` 或"无法确定" | — |
| Calendar Export | 只消费已经 resolved 的日期；把已解析的日期放进 `.ics` | 不猜年份；不理解 Semester；不修 AI 输出 |

**原始 value 必须保留。** canonicalization 不覆盖来源事实：`"Submission deadline: 18 Oct, 23:59"` 仍然
原样保存与展示；系统只是**同时**持有一个规范形式。本轮**未修改任何持久化 schema**——解析结果不落库，
只在读取时按需计算，所以旧 Course State 不受影响，也不需要 migration。

#### 2.17.2 年份规则

以 **Course 自己的 Semester identity** 为基准，**不使用当前系统年份**：即使用户在 2027 年重新查看
`AY2026/27 · Semester 1`，其中 `18 Oct` 仍然是 2026。

| Semester | 月份窗口 |
| --- | --- |
| `AY2026/27 · Semester 1` | 2026 年 8–12 月 |
| `AY2026/27 · Semester 2` | 2027 年 1–5 月 |

规则实现为：月份落在该 term 的窗口内 → 用该 term 对应的年份；否则 unresolved。`18 Jun`
两个窗口都不覆盖，因此不解析——不猜。

> **关于月份边界的依据：** 仓库中没有任何地方定义过学期月份边界（PRD / Handoff / Interaction Spec 都
> 只使用 `AY2026/27 · Semester 1` 这种 label 形式，不含月份）。本轮的两个窗口来自 Product Owner
> 的这条指令本身，是唯一的形式依据。产品模型里**不存在 Special Term**，因此没有为它发明规则。

#### 2.17.3 实现

- 新增 `extension/src/v2/date-resolution.ts`：`semesterContext()`（从 label 解析学年与 term）、
  `parseCompleteDate()`（来源已写全的日期，由 source 自身解析）、`resolveDate()`（确定性解析）、
  `resolveCourseDates()`（按 factId 输出解析结果）。
- 新增 `extension/src/v2/calendar-plan.ts`：`calendarExportInput()` 是**唯一的组装点**。CAL-01 的预览与
  真正导出都通过它构建输入，因此"界面承诺的事件"与"文件里的事件"是同一个答案算两遍，而不是两个
  恰好一致的答案。
- `calendar-export.ts` **不再解析任何日期**：它只消费传入的 `dates`，不做年份推断，也不理解 Semester。
  `normalizeDateValue()` 因此移入 `date-resolution.ts`。
- `ViewBuilder` 仅为 `CAL-01` 投影 `exportPreview`；`handler.ts` 新增的 `EXPORT_CALENDAR` case 走
  `calendar-plan.ts` 的同一入口。

#### 2.17.4 CAL-01 三种状态

`exportPreview` 现在同时给出 `dateCount` / `exportableCount` / `unresolvedCount`：

| 状态 | 条件 | 表现 |
| --- | --- | --- |
| A 全部可解析 | unresolved = 0 | 列出全部事件 + Export |
| B 部分可解析 | unresolved > 0 且 events > 0 | 列出可导出的事件 + Export + 说明还有 N 个日期无法加入 |
| C 全部不可解析 | events = 0 且 dateCount > 0 | **"No dates can be exported yet."** + 说明 N 个日期无法加入；不显示 Export |

State C 不显示普通 `No dates`：系统确实找到了日期，只是无法落地。文案为
`calendarNoneExportable` / `calendarUnresolved`（含单数形）。**未新增任何人工编辑器**，也没有
Date editor / Calendar manager / Planner / Reminder。

#### 2.17.5 测试

`date-resolution.test.ts` 覆盖指令列出的 8 个 Case：S1 补全、S2 补全、完整 ISO 保持、`19/11/2026`
保持、无 Semester 不猜、`Week 8` 不产生虚假日期、学期窗口外的月份不解析、label 无法识别时不解析。
`view.test.ts` 增加**跨层断言**：预览的 events / dateCount / exportableCount / unresolvedCount
必须与 `exportCalendar()` 实际产出完全一致，且 `.ics` 含已解析日期、不含未解析值。
`render.test.ts` 断言 State B 与 State C 的界面文案，并明确断言 State C **不**显示普通空状态文案。
全部做过反向测试（把解析结果置空，3 条测试失败）。

#### 2.17.6 本轮发现、但未擅自修改的产品问题

实现解析器时确认：**v0.2.0 运行时没有任何代码创建 Semester 或 Course 记录。** `saveSemester()` 与
`upsertCourse()` 的调用者只有 v0.1.0 migration 与验收 fixture——真实的 NTU Learn 页面上没有学期/课程
发现流程。后果是：真实用户打开 Syllab 时没有 Course 记录，`StartScan` 会以 `COURSE_NOT_FOUND` 失败，
Semester Dashboard 也没有课程；因此"Semester context"在真实课程上目前为空，解析器会正确地
返回 unresolved（Case 5），日历为空。

这属于产品级缺口，不在本轮授权范围内（本轮禁止扩大产品范围），因此**只记录事实与证据**，交由
Gate 3 的真实环境运行确认，并由 Product Owner 决定后续处理。Gate 3 的指令见 §2.22，实际观察结果将记入 §2.23。

---

### 2.18 页面整体偏高

**指令：**「页面的整体布局都好像不是特别的协调……整体的页面都好像有点稍微偏上了」

**实测（真实浏览器，1180×900 视口）：**

| 屏幕 | 顶部余白 | 内容列宽 | 最后一项之后的空白 |
| --- | --- | --- | --- |
| SEM-01 | 24px | 1120px | 403px |
| CRS-01 | 24px | 1120px | 40px |
| CAL-01 | 24px | 1120px | 316px |

```
.screen { width: min(1120px, 100%); margin: 0 auto; padding: 24px 24px 40px }
```

内容列居中后距窗口边缘 30px，加上 24px 内边距，**左右各有约 54px，上方只有 24px**；底部却是 40px。
上方余白不到旁边的一半，整页因此读起来"顶在上边"。这不是感觉问题，是数值本身的不对称。

**改动：** 页面内边距改为一条对称规则——**顶 = 底 = 侧 + 16**：

| 密度 | 顶 | 侧 | 底 |
| --- | --- | --- | --- |
| 宽屏（含 <560px 视口） | 40px | 24px | 40px |
| 侧栏 Side Panel | 32px | 16px | 32px |

颜色、字体、字号、圆角、间距刻度、布局结构与其余一切均未改动。

**验证：** `stylesheet.test.ts` 新增断言——两个 `.screen` 规则的顶部必须等于底部，且都等于侧边 + 16；
窄视口媒体查询必须与侧栏一致。做过反向测试（把顶部改回 24px，测试报
`expected '.screen top/bottom: 24/40' to be '.screen top/bottom: 40/40'`）。

**证据：** 39 张截图由 `npm run gate:2` 重新采集；改动前提交了三档顶部余白（24 / 32 / 40）的同屏
对比图供选择。

---

### 2.19 Semester 课程卡片：两色交替 + 尺寸对齐

**指令（两次）：**

1. 「很多个课程卡片……我觉得他们可以不用全部都用一个颜色，因为这样的话页面就不太好看，有点太单调了」
   → 澄清后：「就两种颜色交替，一种就是之前版本的卡片颜色，另一种就是要浅一点接近背景色的颜色，可以加一点
   浅浅的描边，**原则是直接上下或者左右相邻的卡片要用不同颜色**」
2. 「未建立的课程好像本来就不需要特别高的可读性，所以 sunken 的状态我们另外再决定；另外就是这个状态，
   我觉得他的卡片的大小也要对齐其他的卡片大小」

#### 先查清的事实

- 学期页 `full-page` 用 `.course-grid`，侧栏用 `.course-list`——两者是不同容器。
- 网格是 `repeat(auto-fit, minmax(280px, 1fr))`：内容列最多 1072px，所以实际只会出现 **1 / 2 / 3 列**，
  4 列需要 1168px，永远到不了。**3 列是奇数列，此时"奇偶交替"本身就是棋盘格**；只有 2 列时奇偶会变成
  竖条，需要单独写。
- 第二档颜色**只能比 `--surface` 更浅**：`--ink-2` 在 `--surface` 上已经是 8.05:1——面板文字的项目地板；
  `--sunken` 会把它压到 7.32（低于地板），任何更深的底色同理。新色 `#f6f5ee` 给到 **8.2:1**，不需要例外。

#### 改动

- 新增 token `--surface-2: #f6f5ee`（页面与面板之间的一档），写入 design system §4 与 §9；
- `.course-grid` 内卡片奇偶交替 `--surface` / `--surface-2`；浅色卡用 `--line-strong` 描边，
  因为它的底色接近页面，`--line` 会看不见边缘；
- 2 列的区间（624–919px）单独写一条 `4n+1 / 4n+4` 与 `4n+2 / 4n+3` 的规则；
- **删除 `.course-grid` 的 `align-items: start`**：它让每张卡按自身内容高度排，没有 Assessment 预览的
  未建立课程因此只有邻卡一半高。改为默认 stretch 后，同一行内所有卡片等高（实测 88px → 334px）。

#### 过程中我自己引入又修掉的一个缺陷

奇偶规则的特异性是 (0,3,0)，高于 `.course-card.is-untouched` 的 (0,2,0)，于是**未建立的卡片被悄悄填上了
底色**——恰好抹掉"未建立"最关键的那条提示。已用 `:not(.is-untouched)` 排除，并写进测试。这是靠**读计算样式**
发现的（`getComputedStyle` 显示 `rgb(246,245,238)` 而不是 `rgba(0,0,0,0)`），不是靠看截图。

#### 未做（按指令另行决定）

未建立课程的文字可读性没有改动：课程名仍是 `--ink-2`，虚线描边与无填充都保留。Product Owner 明确说
"另外再决定"。

#### 验证

- 真实浏览器实测相邻冲突次数：1180px（3 列）**0**、820px（2 列）**0**、1400px（3 列）**0**；
- `stylesheet.test.ts` 新增断言：交替规则存在、未建立卡片被排除、且 **2 列断点必须与网格自身的
  `minmax()` 宽度和 `gap` 重算出来的区间一致**——改卡片宽度而忘记改断点会失败。反向测试：
  把 `minmax(280px)` 改成 `300px`，测试报 `expected [ 624, 919 ] to deeply equal [ 664, 979 ]`。

---

### 2.20 未建立课程：与邻卡同形 + 一行小字（**覆盖已锁定规则**）

**指令：**「按照这个位置应该有的卡片的形态——如果这个位置是有建立的课程，这个卡片应该是什么样的，
未建立的课程他就要是什么样的，然后我们就是加小字。点击之后他没有 Course brief，他就会提示。」
（前一条同时明确：未建立状态不需要特意做出视觉示意。）

**这一条覆盖了一条已锁定的产品规则，必须留档：**

> **Interaction Spec §3.5（第 309 行）**：Not Established Course 在 Semester View 中**不显示**
> `Not Established` / `Not set up` 等状态文字，**只通过视觉设计表达**"尚未被 Syllab 建立 / 未接触"。

按 §21 的文档策略，PRD / Handoff / Interaction Spec 本轮不改，所以**文档与实现现在有意不一致**，
等 Documentation Consolidation 回填。这条冲突已写进代码注释、E2E 断言与本节，避免后来者以为是失误。

**改动：**

- 删除 `.course-card.is-untouched { border-style: dashed; background: transparent }` 与
  `.course-card.is-untouched .course-name { color: var(--ink-2) }`：未建立的卡片现在**取它所在位置的
  那一档底色**，与邻卡完全同形；
- 交替规则因此不再需要 `:not(.is-untouched)`；
- 卡片底部增加一行小字，用 PRD 已有的 `notEstablishedPrompt`，放在其他卡片放状态胶囊的同一个槽位；
- `.course-card-note` 用与其他卡片的 `.status-cue` **完全相同的盒模型**（13px/1.4、6px 内边距、
  1px 透明边框）——这样两行的顶端严格对齐（实测由 447 改为 439，与邻卡一致）。透明边框不是装饰，
  是让行高相等的手段，注释里写明了原因。

**这项改动同时把一条 E2E 断言反了过来。** 原先的检查是
`NOT_ESTABLISHED_STATE_TEXT_LEAKED_INTO_DASHBOARD`，断言 Semester 页上**不出现** "not been set up"
——它正是 §3.5 的执行体。现在改为断言该文案**恰好出现一次**且落在未建立的卡片上，并在代码注释里
写明"两份文档确实不一致，直到 Consolidation"。

---

### 2.21 有的界面 Logo 会错位

**指令：**「有的界面 Logo 会错位。解决这个问题」

**根因（一条规则，被算术证实）：** `app.css` 里有一条

```css
.settings-screen .product-name { margin-bottom: 22px; }
```

它是为 BKP-03 / BKP-04 两个恢复状态页的**页面标题**写的。但那两个标题当时借用的是**品牌类**
`.product-name`——而 `.settings-screen` 同时匹配 masthead。于是 masthead 里的字标也拿到了 22px 下边距：
在 28px 高的 flex 行里，一个 26px 的字标加上 22px 下边距，**margin box 变成 48px**，居中对齐于是把它画到了
自己那一行的顶端**上方 10px**。

实测：Settings 系各屏字标 top=**30**，其余各屏 top=**41**（masthead top=40 + 居中 1px）。差值 11px。

**改动：**

- `settings.ts` 的 BKP-03 / BKP-04 改用 `.screen-title`——这正是 §2.9 为 SET-01 做过的命名清理，
  当时漏掉了这两个页面；
- 规则改为 `.settings-screen > .screen-title { margin-bottom: 22px }`：子选择器 + 页面标题类，
  两重都不会再碰到品牌；
- `stylesheet.test.ts` 新增断言：**任何提到 `.product-name` 的规则，只允许是 `.product-name` 本身**
  （或 `.masthead .product-name`）。这条规则一旦被重新写宽就会失败。

**验证：** 18 屏实测，全部落在两个值上，不再有第三种——
全页 `mark.top=40 / 字标.top=41 / mark.left=54`（SEM-01/03/04/06/07、CRS-01、CAL-01、SET-01/02/04/05、BKP-01/04）；
侧栏 `32 / 33 / 16`（SEM-02/05、CRS-02、ISC-02、IRV-01）。

---

### 2.22 Gate 3 — Real Environment Acceptance（**指令已由 §2.23 修订**）

**指令来源：** 两轮 Product Owner 指令。第一轮把 Gate 3 定为 v0.2.0 的第三个验收关卡（"Phase B"）；
第二轮把它作为 "Phase D"，并规定必须先完成 Phase C 才能进入。

**本轮只记录指令本身与约束。** 该方案随后被 Product Owner 修订：不建大型 Harness，改为两套 Build
加一个一键 Runner，见 §2.23。本节保留下来是因为其中的安全边界（不使用日常 Profile、不读取/记录/
代填密码、不绕过 MFA、不导出 Cookie）在新方案里逐条继续有效。

#### 2.22.1 目标与定位

```text
真实 Google Chrome + 专用 QA Profile + 真实 NTU Learn + 真实 Course
+ 真实 DeepSeek API + 真实 Extension
```

Gate 3 **不替代** Gate 1 / Gate 2，顺序固定为 `Gate 1 PASS → Gate 2 PASS → Gate 3 → Final Human Check`。
目的是建立一套**可重复使用**的真实环境验收，以后每个版本都能一条命令或双击脚本运行。

#### 2.22.2 QA Profile 的安全边界（硬性）

- 使用**真实 Google Chrome** 与**独立 `user-data-dir`**（`Syllab Real QA Profile`），可长期保存
  NTU Learn 登录状态与扩展状态；
- **不得**读取或复制 Product Owner 日常 Chrome Profile 的 Cookie；**不得**获取、记录或存储密码；
  **不得**自动绕过 MFA；
- 首次登录由 Product Owner 手动完成，脚本打开真实登录页并等待，登录后自动继续。

#### 2.22.3 一键启动

至少提供 `npm run test:real`；macOS 上尽量同时提供双击即可运行的
`Run Syllab Real Acceptance.command`。

#### 2.22.4 测试配置与隐私

- 本地配置（`.real-acceptance.local.json` 或 `.env.real.local`）保存 NTU Learn base URL、Course A / B
  标识、QA profile 路径与测试开关，并加入 `.gitignore`；
- **不写入** Git：NTU 密码、MFA secret、session token 明文、DeepSeek API Key；
- 报告与日志中的 API Key、Cookie、Authorization header、session token 与用户隐私内容必须自动 redact；
- 真实课程内容全文不得进入公开测试 artifact。

#### 2.22.5 输出

```text
artifacts/gates/v0.2.0/gate-3/
├── REPORT.md
├── report.json
├── screenshots/
└── logs/
```

#### 2.22.6 场景与结果分类

R1 Extension Load、R2 真实 Course A、R3 结构不同的真实 Course B、R4 真实 DeepSeek Extraction、
R5 Initial Review、R6 Course Brief、R7 Change Detection、R8 Evidence、R9 Backup / Restore、
R10 Reload / Persistence；外加真实附件格式（PDF / Mixed PDF / DOCX / PPTX / oversize / no-text / corrupt）
与 `.ics` 的真实下载。

每个场景只能标：`PASS` / `FAIL` / `NOT TESTED` / `PRODUCT JUDGMENT` / `HUMAN CHECK REQUIRED`。
**禁止**：fixture 冒充 real PASS；没测写 PASS；页面打开就算功能 PASS；没报错就算 PASS。

R4 必须特别记录**真实模型返回的日期格式**，并统计 total / 由来源自身解析 / 由 Semester 解析 / unresolved
——不得为了测试好看而修改模型返回。

`.ics` 的真实下载（点击 Export → `chrome.downloads` → 真实文件）必须验证：文件存在、非空、
event 数量与 preview 一致、unresolved 不进入文件、preview 不承诺文件中不存在的事件。这部分此前从未真实验证。

Apple / Google / Outlook 等真实 Calendar Client 的导入保留为 `Final Human Check`；Chrome 原生 Side Panel
的"点击工具栏图标正确打开"若无法稳定自动化，同样列入 Final Human Check。

#### 2.22.7 测试基础设施不得改变产品

不得改 Candidate 模型、Course Brief、Review 语义、产品 IA、Prompt 或 AI Provider；不得为测试加入
test-only UI、按钮或隐藏数据。正式 ZIP 不得包含测试桥（由 A1 的机制保证）。

#### 2.22.8 文档策略（§21 / §22，**本轮必须遵守**）

- **不做最终 Documentation Consolidation**：PRD / PRODUCT_HANDOFF / Interaction & IA Spec **本轮不重写**，
  因为 Gate 3 还可能暴露新的产品问题；
- 只做运行本次实现与测试所必需的更新，并完整记录进本文件；
- Technical Design 中实现所必需的技术描述可同步更新；
- **Gate 3 完成后停止继续修改产品**，输出本轮最终报告，等待 Product Owner 单独启动
  Documentation Consolidation & Final Acceptance（届时统一回填上述四份文档 + design-system +
  Technical Design + Implementation Plan + Acceptance docs，并保留本文件作为历史决策记录）；
- Gate 3 过程中若暴露新的产品问题，**只记录事实与证据**，不擅自修改产品定义。

#### 2.22.9 阻塞点

Gate 3 需要以下只有 Product Owner 能提供的东西，缺一不可：

1. **真实 NTU Learn 登录 / MFA**（手动一次，之后 QA Profile 复用）；
2. **DeepSeek API Key**（走产品已确认的 BYOK 安全路径，不落盘到 Git）；
3. **真实 Course A / Course B 的 URL 或标识**（写入本地 private config）。
---

### 2.23 Gate 3 方案修订：Production / QA 两套 Build + 一键真实 Runner

**指令：** 「不要建设大型 Gate 3 Harness。改为建立：Production Build、QA Build、One-click Real Test
Runner，三者共用同一套产品源码。」并逐项规定了两套 Build 的允许内容、QA 层的能力边界、隐私规则、
Runner 的形态与 REPORT 格式。

这与 §2.22 的差别是**手段**，不是目标：真实验收仍然要求真实 NTU Learn、真实 Discovery、真实 Scan、
真实 DeepSeek、真实 Initial Review、真实 Course Brief、真实 Calendar。被否决的是通用 Scenario
Engine / Artifact Manager / Test DSL 这类基础设施。

#### 2.23.1 两套 Build

| Build | 命令 | 输出 | 内容 |
| --- | --- | --- | --- |
| Production | `npm run build` | `extension/dist` | 只有产品 |
| QA | `npm run build:qa` | `extension/dist-qa` | 同一套产品 + 验收桥 + 观测层 |

两者是同一份源码。`extension/scripts/build.mjs` 只在 Production 里把两个模块换成惰性 stub
（`e2e-fixtures`、`qa-telemetry`），此外没有任何差别。没有第二套 Course / Review / Calendar / AI
实现。

**机械检查**（`scripts/verify-build-separation.mjs`，已进入 `npm run ci`）：

1. Production 的每个文件里都不含 `qa.` 标记与验收桥标记；
2. QA Build 里两者都在（否则 Runner 观察不到任何东西）；
3. **两个 Build 背后每个 bundle 的源文件集合完全一致**（除去 QA 层自己拥有的 5 个文件）——业务模块
   若被复制或分叉，会在这里表现为「只有一个 Build 读过某个文件」。

做了反向测试：把 `qa.date-resolution` 加进一个确实会进 bundle 的字符串，检查报
`QA_MARKER_IN_SHIPPED:qa.date-resolution:app.js` 与 `background.js` 并以 exit 1 结束。

另一个独立证据来自打包本身：整个 QA 层（telemetry 模块、15 个事件名、全部调用点，以及为它新增的
`looksLikeADate` 判定）加进共享源码之后，Production 的 `Syllab_Extension_v0.2.0.zip` **SHA-256 一字
未变**。观测层在 Production 里不是"被关掉"，而是根本不产生任何字节。

#### 2.23.2 QA 观测层的能力边界

`extension/src/v2/qa-telemetry.ts` 在两端都是普通的被调用代码：Production 里 import 解析到
`qa-telemetry.disabled.ts`（空函数），esbuild 把空函数内联掉，事件名随之离开 bundle。

它**只观察，不决定**：不能 Accept Candidate、不能改 Course Brief、不能跳过用户确认、不能改 Semester、
不能改变日期解析结果、不能往 Calendar 里塞事件、不能静默跳过产品步骤。本轮**未对任何产品分支增加
`if (QA) …`**——调用点就是产品自己的代码路径。

记录内容：Semester / Course 发现、Scan 启动、发现的 Source 数、每个 Source 的 fetch/parse 结果、
每次模型调用的 task 与 token、Candidate 数、Review 打开、Course Brief 落定、Calendar preview 与
export 计数、下载请求。**未记录的**：prompt、模型原文、课程正文、任何凭据。

**日期解析的专项记录**（指令第 6 条）：

```json
{"rawValue":"18 Oct","semester":"AY2026/27 · Semester 1",
 "resolved":true,"canonicalDate":"2026-10-18","resolutionSource":"semester"}
```

无法解析时同样记录，只是 `resolved:false`。实测（QA Build，真实渲染路径）：`18 Oct` → `2026-10-18`、
`12 Nov` → `2026-11-12`、`Week 8` 与 `TBC` 不产生日期。**没有为了让某条通过而改变过解析结果**——解析器
一行未改。

只有确实像日期的值才进 trace。第一版把每条 fact 都记了，于是 `30%`、`Group of 4–5` 这类值也被算成
"未解析的日期"（一次 preview 里 271 条事件，其中绝大多数不是日期）。现在先用与解析器同一套识别函数
判断"这是不是一个日期"，再决定是否记录——报告里的 `unresolved` 因此真的是"找到了但落不下去的日期"。

隐私：字段名像凭据的整条丢弃（不是打码），值形如 `sk-…` 的替换，长文本截断；写入是即发即忘，写失败
绝不反过来让产品动作失败。QA trace 与截图只落在被 `.gitignore` 覆盖的 `artifacts/real-test/`。

**QA 层改变产品行为的一次真实违规（已修）。** 第一版把 trace 写在 `chrome.storage.local`。两个界面在
`chrome.storage.local` 任何变化时都会重读整个 view——这是产品跟随 Course State 的机制——于是**每写一行
telemetry，两个界面就会重绘一次**。后果在真实运行里立刻出现：Restore 的 file input 在 click 与 change
事件之间被替换，BKP-02 不再出现。Gate 2 因此连续失败，且是"大多数时候失败"的竞态。

这不是 flake，是观测层改动了产品，正是本节第 4 条要禁止的事。修法完全在 QA 层内：trace 改存
`chrome.storage.session`（产品只监听 local；session 只属于本次浏览器会话，也刚好是一次运行该有的证据
寿命）。**产品代码一行未改**。

修后同一脚本连跑 4 次 capture 全部 PASS；同一次 smoke 的 trace 从 280 条降到 14 条——重绘消失的
直接证据。新增 `qa-telemetry.test.ts` 固定这条边界：用带两个 storage area 的假 `chrome` 断言写入落在
session 且 `local` 一次都没被碰过。做过反向测试（改回 local，两条断言都失败）。

#### 2.23.3 系统 Chrome 方案

按 Product Owner 选择：**系统 Google Chrome + 独立 QA Profile（`.tmp/syllab-qa-profile/`）**，
首次手动 `Load unpacked` 指向 `extension/dist-qa`，之后该 Profile 持续保留。

这不是省事，是实测结论：本机 Google Chrome 153 已经无法从命令行加载 unpacked extension。为验证这一
点做过 5 组 flag 组合（含 `--disable-features=DisableLoadExtensionCommandLineSwitch`、
`--enable-unsafe-extension-debugging`）以及直接把 extension 写进 profile `Preferences`
（id 推导已用 Playwright 固定 Chromium 交叉验证为同一值），全部失败；而 Chrome for Testing 同样的
flag 立刻成功。因此不再尝试绕过，改为一次性人工安装。

#### 2.23.4 One-click Runner

`npm run test:real` / `Run Syllab Real Test.command`：启动系统 Chrome（独立 QA Profile）→ CDP 接管 →
确认 QA Build 已装入 → 打开 NTU Learn → 探测登录 → 跑真实流程 → 读回 QA trace → 写截图与报告。

探测登录用的是 **discovery 自己读的那个 API**（`/learn/api/public/v1/users/me` 是否 200），所以
"脚本认为已登录"与"产品认为已登录"不可能不一致。

需要人做的三件事，脚本都会停下来等，并且做完就自动继续：首次装入扩展、NTU 登录 / MFA、Chrome 的保存
对话框。**Initial Review 里的 `Confirm` 由脚本按，`Same / Different / Uncertain` 与
`Accept / Ignore` 停下来问 Product Owner**——那是产品判断，不由 QA 层代做。

输出：`artifacts/real-test/{REPORT.md, trace.json, qa-events.json, screenshots/, downloaded/}`。
无法验证的行写 `NOT TESTED`。

---

### 2.24 真实链路核查：两个既有产品要求的实现缺口（已补）

**指令：** 「先核查真实链路……如果确认只是既有产品要求的漏实现：直接补实现和测试。不要把它定义成新
产品功能。如果需要改变锁定产品语义，才停下来报告 Product-impacting Technical Conflict。」

核查从代码开始，并在真实渲染路径上复核。**结论：两处都是漏实现，不是新能力，也不是语义变更。** 两处
都已补实现与测试。

#### 2.24.1 Auto-discovery 从未实现

`saveSemester()` 与 `upsertCourse()` 的调用者只有 v0.1.0 migration 与验收 fixture。真实运行时**没有
任何路径创建 Semester 或 Course 记录**，因此：真实用户打开 Syllab 看到空的 Semester Dashboard，
`StartScan` 以 `COURSE_NOT_FOUND` 失败，日期解析永远没有 Semester context。

这不是新增能力：PRD §5.1.5 已经把「Curriculum Courses 自动进入当前 Semester、Non-curriculum 默认
排除、Auto-discovery ≠ Auto-scan」写成本版范围，Implementation Plan 的 Phase 8 也写着 "Deliver
native Semester/Curriculum Course discovery" 并已标记完成。**已按 PRD 原文补实现**：

- 新增 `extension/src/v2/enrollment.ts`：读 Blackboard Learn REST 的 `users/me`、
  `users/{id}/memberships?expand=course`、`terms/{id}`，映射成产品的 Semester / Course 记录；
- 有 term 的才是 Curriculum Course，Organization / sandbox 没有 term 因此被排除；
- 自身日期包含当前时刻的 term 是 Current，其余是 Historical；
- 被 native 不再列出的 Course 标 `missingFromNative` 而**不删除**，回来时清掉标记（Add/Drop 保护）；
- **没有任何一处启动 Scan**，新 Course 一律落在 Not Established；
- 触发点：NTU Learn 页面加载完成、以及工具栏点击——用户确实在看 NTU Learn 的两个时刻；
- Content Script 新增独立只读范围 `validateEnrollmentEndpoint`，与课程内容范围分开，响应体不能把它
  扩到别处。

**未验证的部分：** NTU Learn 真实返回的 payload 形状。无登录态下逐一探测过路径存在性——每个真实
endpoint 返回 `401 API request is not authenticated`，而虚构路径返回
`404 API is not found for the specified URL`，两者可区分——但真实响应体尚未见过。测试按 Blackboard
文档的字段名编写，第一次真实运行会确认或纠正它，这一条已记入 Implementation Plan §20.1。

#### 2.24.2 `Scan course` 之后界面不动

**根因：** `render.ts` 的 `resolveScreen()` 在 `SEM-07 / ISC-01` 上提前 return，看不到该 Course 的
Scan 状态；同时 `semester.ts` 用本地 UI 状态而不是路由承载「未建立课程」的选择，`view.task` 因此
永远拿不到这个 Course 的 workflow。

**实测（真实渲染路径，fixture 课程）：** 点未建立课程的卡片 → SEM-07；点 `Scan course` → **界面完全
不变，按钮还在**；备份里确认 workflow 确实已经创建（后续因未授权失败为 `AUTHORIZATION_REQUIRED`）。
也就是说 Scan 真的启动了，只是用户看不到任何东西——进度、失败、等待、完成，全都看不到。

这违反已锁定的 Interaction Spec §5.1 流程图：

```text
Not Established Course → Lightweight Scan Prompt → Scan course → Finding course content…
```

**改动（两处，均在表现层）：** `resolveScreen()` 让一个真实存在的 Scan 优先于提示；`Scan course` 在
发起 mutation 的同时把路由移到该 Course 的 Scan 状态。**未改动**产品语义、Prompt、AI provider 或 IA。
测试加了三条：工作态离开提示、失败态离开提示、没有 Scan 时仍停在提示。

修改后实测：点 `Scan course` → 立刻进入真实状态（fixture 里是 `ISC-05` + 真实原因 "Permission
required"）。

#### 2.24.3 空数据库时整个界面是空白（Product Owner 在真实浏览器里发现并报告）

**现象：** 全新安装后打开 `app.html`，页面只有顶部 `Syllab` 一行，下面全空。Product Owner 的原话是
「怎么装好后点击是这样的」。真实 NTU Learn 页面上点工具栏也一样落到全局界面（原因见 §2.24.4）。

**根因（`extension/src/v2/view.ts:98` — `currentSemesterScreen()`）：**

```ts
if (semester?.empty !== true) return requested;   // semester 为 undefined 时，这个条件成立
```

一条 Semester 记录都没有时，`buildSemester()` 返回 `undefined`，于是 `semester?.empty` 是 `undefined`，
`!== true` 成立，函数**直接返回请求的 SEM-01**——空状态重定向永远不触发。接着
`semester.ts::renderSemester()` 走到 `if (!semester) return root;`，只画出一个空的 section。而同一函数上方
的注释恰好写着「A dashboard with nothing on it is an empty state, not a blank dashboard」——意图在，判断
漏了「连 Semester 都没有」这一种。

**实测（Playwright + QA Build，完全空的数据库，无 fixture）：**

```text
修复前  #app innerHTML 长度 312  →  只有 masthead，screens: ["SEM-01"]
修复后  #app innerHTML 长度 504  →  "No courses found yet." + Settings，screens: ["SEM-06"]
```

**改动（两处，均为表现层）：** `render.ts` 新出 `semesterIsEmpty(semester)`，把「有 Semester 但没有课程」
和「根本没有 Semester」视为同一个空状态，`semesterScreen()` 与 `currentSemesterScreen()` 共用它；
`renderSemester()` 在无 Semester 时渲染 SEM-06 的空状态行，并保留通往 Settings / 全局界面的入口——首次使用
的用户下一步就是填 API Key，空白页把这条路也一起挡掉了。

**未改动：** 产品语义、Prompt、AI provider、IA。SEM-06 是 Interaction Spec 里为「没有课程」定义的既有
状态，本轮只是让它真的能被到达。测试新增两条（全页与侧栏），反向测试确认修复前报
`expected 'SEM-01' to be 'SEM-06'`。

#### 2.24.4 在 NTU Learn 上点工具栏仍然进入全局界面

**这不是缺陷，是三个条件之一没有满足。** `background/index.ts` 的工具栏处理是：

```text
tab 在 ntulearn.ntu.edu.sg 上
  + 该 tab 有活着的 Content Script
  + 路径匹配 /ultra/courses/<id>/outline
    → Side Panel；否则 → 全局界面（app.html）
```

最可能命中的是**第二条**：Chrome 不会把 Content Script 注入到「扩展装上之前就已经打开」的标签页
（`AGENTS.md` 里已把这条写成硬规则）。刚装好扩展时，NTU Learn 标签页需要**刷新一次**。第三条也常见：
在课程列表页 `/ultra/course`、Stream 或作业页上点，本来就不该进 Side Panel。

**Product-impacting Technical Conflict：No。** 三处都是实现没做到已锁定的要求（SEM-06、Interaction
Spec §5.1 流程图、PRD §5.1.5），不是要求本身需要改。
---

### 2.25 工具栏入口：在 NTU Learn 上一律打开 Side Panel（**覆盖已锁定规则**）

**指令（Product Owner 已重复多次）：**「在 NTU Learn 里打开插件直接就跳到 full page，不是应该是 side
panel 吗」

**被覆盖的锁定规则。** Interaction Spec §2.2 的流程图是：

```text
Toolbar → Current Tab 有可识别的 NTU Learn Course Context?
            Yes → Open Side Panel（Current Course View）
            No  → Open Full-page（Current Semester Dashboard）
```

实现严格照着它做了，所以这不是实现缺陷——**是规则本身要改**。第一次提出时我按「课程列表页不是课程页，所以
走 full page 是设计如此」解释了，那是把文档当成了依据；Product Owner 重复提出后，依据应当是 Product Owner。

**改动（`background/index.ts`，`chrome.action.onClicked`）：**

| 当前标签页 | 旧行为 | 新行为 |
| --- | --- | --- |
| NTU Learn 上的课程页 | Side Panel，CRS-02 | Side Panel，CRS-02（不变） |
| NTU Learn 上的其它页面（课程列表、Stream、作业页…） | Full-page 标签页 | **Side Panel，SEM-02** |
| 非 NTU Learn 页面 | Full-page 标签页 | Full-page 标签页（不变） |

**为什么 SEM-02 是对的落点**：Side Panel 本来就有「当前没有课程」的那一屏——侧栏的学期课程列表。所以
一个不是课程页的页面，是它已经认识的一种状态，而不是把用户丢进一个他没要求的全屏标签页的理由。Full-page
Semester Dashboard 仍然可达（侧栏里的 `Open full dashboard`，以及不在 NTU Learn 上点图标时）。

**未改动：** 品牌标识、Side Panel 与 Full-page 的职责划分、任何 Screen 的形态或文案。改的只是「点图标之后
落在哪一屏」这一个分支。

**影响已锁定文档：** Interaction Spec §2.2 的流程图与本节有意不一致，待最终 Documentation Consolidation
统一处理——与 §2.20 覆盖 §3.5 是同一类情况。

---

### 2.26 课程名称格式化：去前缀 + Title Case

**指令来源：** 见 `GATE3_FINDINGS_v0.2.0.md` 的 F10 一节；该节把两件事都记为 Product Owner 指令。

**改的是什么。** 真实发现结果里课程名是「学期 + 学院 + 代码 + 全大写标题」的长串：

```text
改前  26S1-MAE-MSc-MA6081-FUNDAMENTALS OF PROJECT MANAGEMENT - B
改后  MA6081 Fundamentals of Project Management - B
```

**Product Owner 明确确认的产品方向（只有这三条）：**

1. **去掉课程名前缀**（学期 / 学院 / 代码那一段）；
2. **课程标题不要全部大写**；
3. **使用正常的 English Title Case** —— 实词首字母大写，虚词按正常英语规则小写。

**以下属于当前的 implementation strategy，不是 Product Owner 逐条确认的产品定义**（记录在此以免后来者
把它们当成产品规则；改动它们不需要重新征求产品意见，但不得违反上面三条）：

- 含数字的词原样保留（`MA6081`、`26S1`）；
- 虚词（冠词 / 并列连词 / 介词）小写，出现在首或末位时按英语规则大写；
- 其余全大写词里，**长度 ≤ 3 或不含元音**的按缩写保留（`AI`、`PDF`、`NTU`），带元音的四字母词按
  普通词处理；
- **单个字母按分节符保留大写**（`… - A and F` 里的 `A` 是分节编号，不是冠词）。

这些启发式（长度阈值、元音判断、单字母处理）是为了满足上面三条而选定的实现策略：`COST` / `DATA` /
`EXAM` 这类词必须保持普通词形态，`AI` / `PDF` / `NTU` 这类缩写必须保持大写，两者不能同时用一条
简单规则满足。**不要把它们写成产品定义。**

**性质：** 表现层格式化，未改动产品模型。Course Code 仍然是身份的来源，格式化只影响显示。

---

### 2.27 Gate 3 的运行方式：用户操作、脚本观察记录

**指令（Product Owner）：**

> 「不是手动跑然后脚本记录吗」

> 「现在是在全自动测试吗？如果是的话现在你这个用脚本全自动测试的这个思路在我们之后的交付文件里面
> 记得就是记录一下，下次可以复用」

**改的是什么。** 一键 Runner 从「脚本驱动整个流程」改为**默认手动模式**：Product Owner 在真实浏览器里
操作产品，脚本只观察、只记录、只截图，在每次界面变化时记录产品自己上报的 QA trace。`--auto` 仍然保留，
但那是给「没有人在场的机器」用的第二条路，不是默认。

**理由（写进了 Runner 的代码注释）：**

- 流程之所以是真实流程，是因为**由人操作**；脚本贡献的是记录；
- 需要人做的步骤本来就是只有产品所有者能做的：一次登录 / MFA、一次产品判断、一次保存对话框；
  一个必须去模仿它们的脚本，模仿的是错误的东西。

**同时确立的边界：** Initial Review 的 `Confirm` 可以由脚本按（机械动作），**`Same / Different /
Uncertain`、`Accept / Ignore` 必须停下来问 Product Owner**——那是产品判断，不由 QA 层代做。

**可复用性（Product Owner 明确要求记录）：** 这套「QA Build 观测层 + 独立 QA Profile + 一键 Runner +
产物目录」的做法记在 §2.23 与
`docs/versions/v0.2.0/TECHNICAL_DESIGN_v0.2.0.md` §15.4，供后续版本的验收复用。

**性质：** 验收方式变更，不改变产品。

---

### 2.28 产品之外私自新增的界面状态：清理原则

**指令（Product Owner）：**

> 「Progress saved 我们一开始产品设计的时候没有定义吧，是你私自家加上的一个状态吗？可不可以去掉」

> 「再检查一下别的地方有没有私自加东西，要求对齐我们的产品定义。有的话想办法改正。」

**确立的原则。** **用户可见的东西必须能在产品文档里找到出处**；实现自己造的界面状态、文案、
派生值或控件，属于越界，应当去掉或对齐。判定不是「文档里有没有这句话」，而是「文档有没有定义这个
东西」——文档画了控件但没写死英文，那是文档给实现留的余地；文档没有这个东西，那就是加的。

**据此清理的（详见 `GATE3_FINDINGS_v0.2.0.md`）：**

| 编号 | 被清掉的东西 | 依据 |
| --- | --- | --- |
| F23 | `Progress saved.`（连同它代表的界面状态 `saved`） | PRD §5.6.5 只定义 `Saved` 是持久化状态；Interaction Spec §11.3 要求它**不作为常驻视觉状态**。整句在全部产品文档里一次都没出现过 |
| F32 | 注意力详情重复标题句 | Interaction Spec §4.17 / §11.6 画的是「标题 + `Last successful check: …`」两行 |
| F33 | `Nothing to review` 整屏 | Interaction Spec §6.7 明确「不建立完成页」，处理完最后一条直接回 Course Brief |
| F34 | `view.ts` 里三句目录外的用户可见文案（`Course change`、`This task could not be completed.`、`Course source`） | 措辞未改，收回 `copy.ts`；同时把「catalogue 无未使用 key」的检查改成能看见 view 层 |

**同时确立的工程约束：** 用户可见英文只有一个来源 `extension/src/v2/copy.ts`，
`extension/src/v2/screens/render.test.ts` 用两条断言锁住它（渲染出的每个词要么来自 catalogue、
要么来自 view model；每个 catalogue key 都必须被某个模块点名）。

**性质：** 产品语义层面的清理原则。

---

### 2.29 交接冻结期的处理边界

**指令（Product Owner，本轮）：** 停止继续开发；本轮只做「冻结现状 + 生成 Engineering Handoff
Snapshot」；允许的修改只有四类——补齐状态说明类文档、补记本文件里已确认但漏记的方向变化、生成文件
清单 / diff / 状态报告 / checksum / ZIP、为保护隐私而复制或脱敏测试 evidence。

**明确禁止（本轮）：** 修 F37；继续优化 UI；修改 Prompt；重新定义产品；处理新的技术债；为了让测试
结果更好看而改代码；开始最终 Documentation Consolidation；删除历史正式文档或当前工作记录；
commit、reset、checkout、stash、push。

**明确不要求（本轮）：** 不重跑完整 Gate 1 / Gate 2——**只冻结现状**，并且必须把「Gate 报告与 ZIP 相对
当前工作区已 stale」这件事写清楚，而不是靠重跑来消除它。

**与 §2.22.8 的关系：** §2.22.8 管的是 Gate 3 期间的边界（只记录事实与证据、不擅自改产品定义）；
本节管的是 Gate 3 **之后**、交接冻结期的边界。两者不冲突。

**性质：** 工程流程边界，不改变产品。

---

### 2.30 下一版候选：长时间 AI 处理的实时进度可见性

**Product Owner feedback：** Task A / B / C 在真实大课程上可能持续较长时间，持续只显示静态阶段会让用户
怀疑流程已停止。下一版应评估提供 AI 实时监控 / 进度窗口，让用户持续获得“仍在运行”的明确反馈。

**候选分层：** 正式用户界面只显示简洁、稳定的运行反馈。QA Build 可另设 Product Owner 专用监控窗，实时显示
当前 Task、正在处理的 Source / logical unit、physical call 类型、已完成数量、阶段与调用耗时、token、finish
reason、retry、lease 和失败分类。不得持久化 reasoning text，也不得记录课程原文、API key、Authorization、
cookie 或其他敏感内容。是否在仅限 QA / Product Owner 的临时会话中展示 provider reasoning stream，应作为下一版
独立的隐私与产品决定，不能由工程实现默认开启。未经验证的流式 Draft 不进入 trusted Current Course State。

**状态：** 下一版 Product idea，尚未进入批准范围或 Technical Design；v0.2.0 不实现，不因此改变当前流程或
Engineering Freeze 条件。

---

## 3. 这些调整对已锁定文档的影响

| 已锁定内容 | 是否被改动 | 说明 |
| --- | --- | --- |
| Assessment / Current Course State 产品模型 | 未改动 | 本次全部调整都在表现层与验收流程 |
| Task A / B / C 与 Prompt baseline | 未改动 | Prompt 与 handoff 逐字节一致 |
| Review 语义（Confirm / Keep Current / Conflict 等） | 未改动 | |
| Side Panel / Full-page 职责划分 | 未改动 | 只是两者都获得一致的品牌标识 |
| Popup 移除 | 未改动 | 本次反而清掉了遗留的 popup 源码 |
| 页面主体信息架构 | 未改动 | 页面的内容结构、区块与顺序都没有变；调整只发生在 shell 与 header 层 |
| **Shell / Header 结构** | **已调整** | 品牌行提升到 shell 层并固定高度；三个 header 类收敛为一条规则，局部覆盖已移除，返回箭头不再独占一行，见 §2.12 |
| **Header 对齐** | **已统一** | 由顶对齐改为基线对齐，见 §2.13。这是 shell / header 层的调整，不是 IA 重构 |
| **视觉规则（下划线）** | **已改动** | 可点击元素不再有任何下划线，改由颜色与底色表达 |
| **间距刻度** | **已收敛** | 同一视觉关系不再有多个值；九级刻度写进 design system 并由测试强制，见 §2.15 |
| Calendar Export 语义 | 未改动 | 本轮只是把已有且有测试的逻辑接到界面上，未改任何导出规则，见 §2.16 |
| **日期解析（年份补全）** | **新增** | 新增确定性的 Semester-aware Date Resolver；导出规则本身未变，但"哪些日期可导出"从此由 Semester context 决定，见 §2.17 |
| **design-system 的交付地位** | **已改动** | `docs/design-system.md` 进入正式交付包，见 §2.17 |
| **未建立课程的状态表达** | **已改动（覆盖 Interaction Spec §3.5）** | 由"仅视觉表达"改为"同形卡片 + 一行小字"，两份文档有意不一致至 Consolidation，见 §2.20 |
| **动效** | **新增** | 见 §2.1，规则已写入 design system |
| **品牌标识的页面覆盖** | **已改动** | 由"仅部分页面"改为所有页面统一，见 §2.7 / §2.9 |
| **交付形态** | **新增** | 增加可直接加载的扩展包与一键交付包，见 §2.10 |
| **构建产物** | **新增** | 由一套产物变为 Production / QA 两套，共用同一份源码；机械检查保证业务模块不分叉，见 §2.23.1 |
| **Auto-discovery（PRD §5.1.5）** | **未改动，补实现** | 需求原本就在锁定范围内（Implementation Plan Phase 8 已标 Done），此前没有运行时实现；本轮按 PRD 原文补上，见 §2.24.1 |
| **未建立课程 → Scan 的状态推进（Interaction Spec §5.1）** | **未改动，补实现** | 锁定的流程图要求 `Scan course` → `Finding course content…`，实现停在了提示页；本轮按流程图补上，见 §2.24.2 |
| **工具栏入口落点（Interaction Spec §2.2）** | **已改动（覆盖）** | 在 NTU Learn 上一律打开 Side Panel；无课程上下文时落在侧栏课程列表而不是 Full-page 标签页，见 §2.25 |
| **README 走查文案** | **已改动** | 中英各自一份文案，见 §2.11 |

---

## 4. 未因此改变的边界

以下事项在本轮调整中**没有**被放宽，仍按原规范执行：

- 不用 fixture 冒充真实课程证据；
- 不用人工点击替代可脚本化的验证；
- Live DeepSeek 与真实 NTU Learn 课程在没有凭据的环境下保持 `NOT TESTED`；
- 不修改 Product Owner 提供的正式 Logo 资产。

---

## 5. 本文档的由来

本文档由 Product Owner 在交付阶段追加要求而生成：

> 「交付的时候可以再加一个文件，就是里面描述一下，在开工之后我给你的补充指令和方向的调整」

它是交付文件集的一部分，见 `docs/versions/v0.2.0/` 与仓库根目录的正式文档清单。
