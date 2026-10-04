# GradCompass 仓库地图与 2028 Fall 证据规则

本文记录当前代码、数据、测试和发布清单之间的边界，作为后续继续开发的入口。当前工作基于已发布内容树 `fb8fd05`，并在其上追加七校博士项目参考；此前来源更正层基线为 `3f294a8cc601e77183deb594de0836ec76cc8a9c`。旧批次记录按其原历史范围保留，当前权威计数由 `node scripts/public-counts.mjs` 生成。

## 数据与运行链路

| 层 | 位置 | 作用与边界 |
| --- | --- | --- |
| 主事实数据 | `data/catalog.json` | 导师、学位路线、截止日期、原始材料、招生声明和 watch sources。资格与招生字段以这里为准。 |
| 导师专业简介 | `data/advisor-profiles.json` | 仅按 `advisorId` 补充职业概况、实验室、资源、代表成果和未知项；不能覆盖 `catalog` 的资格、招生或名额字段。 |
| 清华核查记录 | `data/tsinghua-advisor-review-20261004.json` | 保存清华不同年份/渠道的真实来源、五项来源纠错、博士参考与7位导师的核查；不把项目参考升级为 2028 Fall 名额。 |
| 南科大核查记录 | `data/sustech-advisor-review-20261004.json` | 保存南科大机械系自主培养博士项目、自动化学院 2027 博士通知、导师关联和 2028 Fall 边界；博士路线只在详情中作为参考。 |
| 七校博士核查记录 | `data/zju-advisor-review-20261005.json`、`data/fudan-advisor-review-20261005.json`、`data/sjtu-advisor-review-20261005.json`、`data/nju-advisor-review-20261005.json`、`data/ustc-advisor-review-20261005.json`、`data/tongji-advisor-review-20261005.json`、`data/seu-advisor-review-20261005.json` | 保存浙江大学、复旦大学、上海交通大学、南京大学、中国科学技术大学、同济大学、东南大学的官方博士项目或导师目录依据；均为 `reference`，不制造个人 2028 Fall 名额。 |
| 项目简介 | `data/project-summaries.json` | 补充培养、研究、入学条件和批次说明；不能从项目简介推导导师名额。 |
| 材料摘要 | `data/material-summaries.json` | 官方材料要求的有界摘要；与原目录材料合并展示。 |
| 申请经验 | `data/application-experiences.json` 与 `data/application-experience-provenance.json` | 公开自述及其阅读范围；不参与当前招生资格判断。 |
| RA 数据 | `data/ra-positions.json` | 独立的受雇岗位；不转换为学位录取或导师招生名额。 |
| 规范化与筛选 | `assets/core.js` | 计算已核实路线、机会、排名、筛选和详情使用的数据边界。 |
| 页面与加载 | `assets/app.js`、`assets/profiles.js`、`assets/record-summaries.js`、`assets/page-overviews.js` | 负责异步加载、渲染、详情阅读、摘要和导航；简介与主目录分开加载。 |
| 内容版本与发布 | `scripts/freeze.py`、`release-manifest.json` | 先更新数据、模块和入口的内容 hash，再生成严格 allowlist。 |
| 回归验证 | `tests/*.test.mjs` | `npm test` 运行 Node/DOM-contract 测试；浏览器脚本需用 `TEST_URL` 单独运行。 |

早期历史快照的数据量为 43 条导师目录记录、41 位可见导师、41 份简介、57 条学位机会与 2 条独立 RA、26 条申请经验、27 个项目和 14 组材料。

## 后续开发顺序

1. 先在 `catalog.json` 找到导师、路线和已有来源，不直接改页面文案。
2. 如需补充职业与研究内容，再在 `advisor-profiles.json` 加入同一 `advisorId` 的证据和未知项。
3. 需要新字段时先更新规范化、渲染和负向测试，再写数据，避免数据能加载但页面误读。
4. 运行 `npm test` 和 `git diff --check`，最后执行 `python scripts/freeze.py`，检查内容版本、allowlist 和 `release-manifest.json`。

## 2028 Fall 招生证据规则

项目中的 **2028 Fall** 专指 2028 年秋季入学，即通常写作 **2028/29 intake**。后续检索优先寻找 2028 Fall，但 `2027/28`、`Fall 2027` 等上一周期导师招生可以作为参考，必须保留其原始年份、来源和时效，不能升级或改写成 2028 Fall。奖学金入口日期、项目统一截止日期或“迟交转入 2028 Fall”仍不能自动升级为某位导师的 2028 Fall 招生。

后续如官方导师页、实验室 Openings 页或招生处明确写出 2028 Fall，应在 `catalog.advisors[].openingDetails[]` 的对应学位行记录：

- `cycle: "2028 Fall"`
- `cycle2028FallVerified: true`
- 明确的 `status`、原文摘要、`noticeDate` 和一手 `sources`
- `confirmedVacancy` 与 `remainingHeadcountVerified` 分开记录；没有明确名额时保持 `false`

只有同时出现明确学位类型和 2028 Fall/2028 intake 语句的原始招生证据，才可以把 `cycle2028FallVerified` 设为 `true`。导师常年欢迎申请、实验室成员页、项目统一招生日期和奖学金日程都只能作为背景或项目证据。

`fall2028OpeningVerified` 如需保留，只能是由分学位行派生的兼容字段，不能独立制造结论。`advisor-profiles.json` 的 `recruitment` 继续承担可读叙述；若叙述涉及 2028 Fall，应同时提供结构化周期字段和相同来源，避免把 2027/28 与 2028 Fall 混写。

本次整理审计未发现任何导师的一手 2028 Fall 明确招生记录。现有 Chen Sun 的“2027/28 Fall 1–2 名”属于 2027 Fall 学年，可作为招生方式和时效的参考；HKUST(GZ) Red Bird 的“迟交转入 2028 Fall”属于项目批次规则，不能作为导师招生证据。

## 2026-10-04 西湖大学导师核查

本轮以西湖大学工学院人工智能/电子科学方向为范围，优先补录机器人、具身智能、微型机器人和智能体导师。新增梁泽西、王伟、张驰、金耀初、范迪夏、赵世钰六条目录和简介；每条均关联官方教师页或实验室主页、代表成果和招募原文。赵世钰的 WINDY Lab 明确持续接受 PhD 申请、申请考核且录取博士全程资助；其余导师的官方页面明确持续招收 PhD/RA/博后或研究生。

截至 2026-10-04，西湖官方页面未出现任何上述导师的 Fall 2028／2028-29 明确招生语句。新增记录统一保留 `cycle2028FallVerified: false`、`fall2028OpeningVerified: false`，把常年招募与 2027 校级招生通知作为参考，不能写成 2028 名额。未来若出现明确 2028 Fall 原文，应只更新对应学位行并保留名额、资助和申请轮次的独立未知项。

## 2026-10-04 公开项目维护补记

以上结构与 2028 Fall 导师证据规则保持不变。后续有界维护新增收录一条 HKU RIS 2027/28 授课型 MSc 项目参考、项目简介、材料摘要与两条日期；现为 28 个项目及 15 组材料，其余 41 位可见导师、59 条机会、26 篇经验保持。该记录不创建导师关联，不含 `cycle2028FallVerified`，不把 2027/28 改写为 2028 Fall。

## 当前证据与展示边界

- `browseAdvisors`/`browseRoutes`用于公开全集，旧`filterAdvisors`/`filterRoutes`仅保留早期本科便利筛选的历史回归语义，不决定当前公开可见性
- `hasVerifiedAssociation`只接受精确routeId、verified状态、非pending验证及个人关联来源；`buildOpportunities`不把项目资格或reference转换成导师个人招生
- 当前目录含87位导师与52个项目；本批在既有内容上追加七校博士项目参考。研究资料、前置学历和招生方式分别展示，未知不删除；新记录不改变57条已核实学位关联与2个独立RA岗位的统计。
- `sourceCycle`、`admissionMode`、`currentCycleVerificationStatus`与个人`individualRecruitmentVerified`相互独立；周期标签须读原HTML标题，不能只依赖可能漏标题的正文抽取
- 四份补充资料独立加载；全依赖链content hash经freeze后写入，实际验证结果不硬编码进manifest
- 历史tests采用固定commit及原始字节哈希，新增与纠错逐次精确逆变换；未知变化、排序和新增字段必须触发失败

## JHU / BU 项目候选边界

本批新增2项目、2简介、2材料组与6条分入学季日历；现在30份项目简介、17组材料，导师和26篇经验不变。2027项目条件不转换为个人招生关联或2028 Fall。新历史追加层为`tests/overseas-baseline.mjs`及独立固定hash fixture，仅完整已知快照可以回退；旧历史fixture不改。国内与CMU等未完成核验的研究候选在交付目录独立保存，不进入发布allowlist。


## 2026-10-04 北京大学核查补记

`data/pku-advisor-review-20261004.json`保存北京大学智能学院 2027 智能机器人博士方向的招生指南、教师名录、5 位导师来源和 2028 Fall 边界；`data/catalog.json`中的路线状态为 `reference`，不会进入已核实导师—项目关联或默认机会统计。`assets/core.js`提供 `PKU` 学校筛选，博士筛选通过显式参考卡展示。
