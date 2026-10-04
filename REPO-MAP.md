# GradCompass 仓库地图与 2028 Fall 证据规则

本文记录当前代码、数据、测试和发布清单之间的边界，作为后续继续开发的入口。当前基线为合并提交 `91115ab8`。

## 数据与运行链路

| 层 | 位置 | 作用与边界 |
| --- | --- | --- |
| 主事实数据 | `data/catalog.json` | 导师、学位路线、截止日期、原始材料、招生声明和 watch sources。资格与招生字段以这里为准。 |
| 导师专业简介 | `data/advisor-profiles.json` | 仅按 `advisorId` 补充职业概况、实验室、资源、代表成果和未知项；不能覆盖 `catalog` 的资格、招生或名额字段。 |
| 项目简介 | `data/project-summaries.json` | 补充培养、研究、入学条件和批次说明；不能从项目简介推导导师名额。 |
| 材料摘要 | `data/material-summaries.json` | 官方材料要求的有界摘要；与原目录材料合并展示。 |
| 申请经验 | `data/application-experiences.json` 与 `data/application-experience-provenance.json` | 公开自述及其阅读范围；不参与当前招生资格判断。 |
| RA 数据 | `data/ra-positions.json` | 独立的受雇岗位；不转换为学位录取或导师招生名额。 |
| 规范化与筛选 | `assets/core.js` | 计算已核实路线、机会、排名、筛选和详情使用的数据边界。 |
| 页面与加载 | `assets/app.js`、`assets/profiles.js`、`assets/record-summaries.js`、`assets/page-overviews.js` | 负责异步加载、渲染、详情阅读、摘要和导航；简介与主目录分开加载。 |
| 内容版本与发布 | `scripts/freeze.py`、`release-manifest.json` | 先更新数据、模块和入口的内容 hash，再生成严格 allowlist。 |
| 回归验证 | `tests/*.test.mjs` | `npm test` 运行 Node/DOM-contract 测试；浏览器脚本需用 `TEST_URL` 单独运行。 |

当前数据量为 37 条导师目录记录、35 位可见导师、35 份简介、50 条学位机会与 2 条独立 RA、26 条申请经验、27 个项目和 14 组材料。

## 后续开发顺序

1. 先在 `catalog.json` 找到导师、路线和已有来源，不直接改页面文案。
2. 如需补充职业与研究内容，再在 `advisor-profiles.json` 加入同一 `advisorId` 的证据和未知项。
3. 需要新字段时先更新规范化、渲染和负向测试，再写数据，避免数据能加载但页面误读。
4. 运行 `npm test` 和 `git diff --check`，最后执行 `python scripts/freeze.py`，检查内容版本、allowlist 和 `release-manifest.json`。

## 2028 Fall 招生证据规则

项目中的 **2028 Fall** 专指 2028 年秋季入学，即通常写作 **2028/29 intake**。`2027/28`、`Fall 2027`、奖学金入口日期、项目统一截止日期或“迟交转入 2028 Fall”都不能自动升级为某位导师的 2028 Fall 招生。

后续如官方导师页、实验室 Openings 页或招生处明确写出 2028 Fall，应在 `catalog.advisors[].openingDetails[]` 的对应学位行记录：

- `cycle: "2028 Fall"`
- `cycle2028FallVerified: true`
- 明确的 `status`、原文摘要、`noticeDate` 和一手 `sources`
- `confirmedVacancy` 与 `remainingHeadcountVerified` 分开记录；没有明确名额时保持 `false`

只有同时出现明确学位类型和 2028 Fall/2028 intake 语句的原始招生证据，才可以把 `cycle2028FallVerified` 设为 `true`。导师常年欢迎申请、实验室成员页、项目统一招生日期和奖学金日程都只能作为背景或项目证据。

`fall2028OpeningVerified` 如需保留，只能是由分学位行派生的兼容字段，不能独立制造结论。`advisor-profiles.json` 的 `recruitment` 继续承担可读叙述；若叙述涉及 2028 Fall，应同时提供结构化周期字段和相同来源，避免把 2027/28 与 2028 Fall 混写。

本次整理审计未发现任何导师的一手 2028 Fall 明确招生记录。现有 Chen Sun 的“2027/28 Fall 1–2 名”属于 2027 Fall 学年；HKUST(GZ) Red Bird 的“迟交转入 2028 Fall”属于项目批次规则。两者均暂不纳入 2028 Fall 导师招生清单。
