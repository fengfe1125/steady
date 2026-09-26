# 健身减脂开源项目与 App 方向研究

调研日期：2026-09-21  
口径：30 个 GitHub/源码项目 + 20 个主流 App/健康平台，共 50 个独立样本。项目功能、许可证和产品定位优先取项目自己的 GitHub README/Release、官网、官方文档或官方应用商店页；“空白/机会”中的判断属于基于样本的产品推断，不是用户规模或医学结论。

## 先说结论

这个方向还可以做，但不建议做“又一个记录卡路里、又一个动作库、又一个 AI 健身教练”。更值得做的是一个明确的公益型产品：

> 面向中文用户的、隐私优先、低负担、可解释的减脂行为记录与复盘工具。数据先在本地，默认不需要账号；不制造羞耻、不鼓励极端减重；把饮食、活动、睡眠和体重趋势合成每周可理解的建议，并且允许用户完整导出数据。

判断依据有三点：

1. 商业 App 已经把“内容、食物库、社区、挑战、穿戴设备同步”做得很强。MyFitnessPal 以超大食品库和多设备同步取胜，Cronometer 以微量营养素深度取胜，Keep、薄荷健康、咕咚和悦跑圈在中文内容、陪伴和社区上有明显优势。
2. 开源项目证明了隐私、本地化、自托管和数据可携带有真实吸引力：wger、OpenNutriTracker、openScale、Dreeve、Endurain、SparkyFitness 等仓库已经形成相当可见的关注度；但开源生态仍然分散，很多项目只覆盖一个窄场景，或停留在“能记录”而不是“能长期坚持”。GitHub star 是关注信号，不等于活跃用户、留存或可持续维护能力。
3. 减脂本质不是把数字做得更复杂，而是长期行为：WHO 建议成年人每周至少 150–300 分钟中等强度活动，并在每周至少 2 天进行主要肌群的力量活动；CDC 也强调，渐进、稳定的减重更容易维持。产品应该帮助用户形成可持续行为，而不是把一次称重或一次超标变成失败。

## 50 个样本

### A. GitHub / 源码项目 30 个

| # | 项目 | 形态 | 主要功能与可借鉴点 | 状态/许可证 | 一手来源 |
|---:|---|---|---|---|---|
| 1 | wger | 自托管 Web、API、移动端 | 训练计划、重量递增、饮食、体重、测量值、动作库；适合借鉴统一数据模型与 API | AGPL-3.0-or-later；运动/食物数据有单独许可；活跃开源项目 | [GitHub](https://github.com/wger-project/wger) · [文档](https://wger.readthedocs.io/en/stable/) |
| 2 | LibreFit | Android | 离线训练日志、计划、组数/次数/重量、休息计时、进度图、动作库 | GPL-3.0-or-later；隐私优先 | [GitHub](https://github.com/LibreFitOrg/LibreFit) |
| 3 | LiftApp | Android | 动作库、训练例程、周期计划、超级组、1RM、体重、备份恢复 | 许可证未在本轮页面确认；README 标注 active development | [GitHub](https://github.com/patrykandpatrick/liftapp) |
| 4 | Forme / open-workout | 浏览器、本地或自托管 | 本地训练计划、动作浏览、训练执行、JSON/PDF/链接分享；适合借鉴低依赖和可迁移数据 | MIT；动作图片/GIF 有独立授权条件 | [GitHub](https://github.com/apnatvar/open-workout) |
| 5 | LiftTrace | 自托管 Docker、PWA、Android | 举重、RPE、热身、超级组、计划、PR、体重、动作库、可选 AI | AGPL-3.0；强调无遥测和本地部署 | [GitHub](https://github.com/TraceApps/lifttrace) |
| 6 | GymMane | Android / Flutter | 完全离线训练日志、RPE/RIR、计划、PR、体重/围度、CSV/ZIP 备份 | GPL-3.0；动作素材 CC BY-SA 4.0；无网络权限 | [GitHub](https://github.com/InlitX/GymMane) |
| 7 | Iron-Log | Android / Capacitor + SQLite | 周期与训练日、渐进超负荷、趋势图、连续训练、JSON 备份 | MIT；本地优先 | [GitHub](https://github.com/AdityaMohanty374/Iron-Log) |
| 8 | Train Libre | Android/iOS / Flutter | 训练、热量、宏量、体重、恢复、睡眠、HealthKit/Health Connect、可选 BYOK AI | GPL-3.0；动作和食品数据另有来源许可证；标注 Android/iOS active | [GitHub](https://github.com/rfivesix/train-libre) |
| 9 | Granite | 自托管 Web/PWA、Capacitor | 离线训练、计划、PR、周训练量、肌群统计、体重、REST API/MCP | AGPL-3.0；README 标注 active development | [GitHub](https://github.com/MorrisMorrison/granite) |
| 10 | Waistline | Android / Cordova | 饮食日记、热量/营养素、食物/食谱、条码、体重、统计、导入导出 | GPL-3.0；接 Open Food Facts 与 USDA；无广告/内购 | [GitHub](https://github.com/davidhealey/waistline) |
| 11 | Food You | Android | 本地饮食记录、宏量/微量营养素、食谱、目标、自定义首页 | GPL-3.0；隐私优先 | [GitHub](https://github.com/maksimowiczm/FoodYou) |
| 12 | OpenNutriTracker | Android/iOS / Flutter | 食物、条码、热量、宏量/微量、饮水、断食、活动、体重、JSON/CSV/二维码 | GPL-3.0；加密本地数据、来源可追溯、无广告/分析 SDK | [GitHub](https://github.com/simonoppowa/OpenNutriTracker) |
| 13 | kcal | 自托管 Web | 食品、食谱、餐次、热量/宏量目标、饮食日记、按日期管理目标 | MPL-2.0；Docker/Sail 与测试说明 | [GitHub](https://github.com/kcal-app/kcal) |
| 14 | food-diary | Web/PWA；.NET + React | 热量、蛋白质、脂肪、碳水、糖、盐、食品库、体重、照片识别 | AGPL-3.0；可选 AI；多设备 | [GitHub](https://github.com/pkirilin/food-diary) |
| 15 | NutriTrace | 自托管 PWA、Android | 饮食日记、食谱、热量/宏量、体重、健康数据、可选同步 | AGPL-3.0；Release 页显示 2026-09-19 有版本 | [GitHub](https://github.com/TraceApps/nutritrace) |
| 16 | Schautrack | 自托管 Web；Go + React + PostgreSQL | 热量/宏量、食物、体重、目标、好友分享、条码、照片估算、习惯任务 | 许可证未在本轮页面确认；支持 Ollama/第三方 AI | [GitHub](https://github.com/schaurian/schautrack) |
| 17 | Ygeia | 无构建步骤的离线 Web 应用 | 营养、力量训练、身体指标、食品与动作库；数据留在设备 | MIT；食品数据 ODbL；不需要服务器 | [GitHub](https://github.com/falakiwastaken/ygeia) |
| 18 | FitoTrack | Android | 跑步、骑行、徒步 GPS；距离、速度、配速、路线、图表统计 | GPL-3.0；无广告/跟踪 | [GitHub](https://github.com/russok/FitoTrack) |
| 19 | RunnerUp | Android、Wear OS | 跑步 GPS、语音提示、间歇训练、目标配速/心率、BLE/ANT+、外部同步 | GPL-3.0；部分组件另有许可；仓库有长期提交历史 | [GitHub](https://github.com/jonasoreland/runnerup) |
| 20 | OpenTracks | Android | GPS 运动记录、语音、照片/标记、GPX/KML/KMZ、BLE 传感器 | Apache-2.0；原 GitHub 仓库已归档并迁往 Codeberg | [GitHub 镜像](https://github.com/OpenTracksApp/OpenTracks) · [新仓库](https://codeberg.org/OpenTracksApp/OpenTracks) |
| 21 | FitTrackee | 自托管 Web；Python/Vue | GPX 等活动导入、地图、统计、自有服务器；可承接移动端记录器 | AGPL-3.0；GitHub 为 Codeberg 镜像 | [GitHub 镜像](https://github.com/SamR1/FitTrackee) · [文档](https://docs.fittrackee.org/) |
| 22 | GoldenCheetah | macOS/Windows/Linux 桌面 | 骑行/跑步/铁三高级分析、功率、TRIMP、训练计划、设备导入 | GPL-2.0；适合借鉴本地数据与可扩展分析 | [GitHub](https://github.com/GoldenCheetah/GoldenCheetah) |
| 23 | openScale | Android；BLE 体重秤 | 体重、BMI、体脂、水分、肌肉、围度、目标、图表、CSV、秤协议 | GPL-3.0；长期维护；重点是设备和数据自主权 | [GitHub](https://github.com/oliexdev/openScale) |
| 24 | Loop Habit Tracker | Android、F-Droid | 习惯、复杂周期、提醒、小组件、习惯强度、图表、CSV/SQLite 导出 | GPL-3.0-or-later；适合借鉴“不只看连续打卡”的行为模型 | [GitHub](https://github.com/iSoron/uhabits) |
| 25 | openGym | 自托管 Web/PWA、Android | 训练计划、超级组/有氧、体重、进阶、导入 FitNotes/Strong/Hevy、Passkey | AGPL-3.0；免费且无订阅；有明显社区关注度 | [GitHub](https://github.com/DuarteSantos8/openGym) |
| 26 | Dreeve | 自托管运动数据看板 | 导入 FIT/TCX/GPX、Strava、图表、热力图、器材维护、PWA、AI 助手 | AGPL-3.0；偏“汇总和分析”，不是训练执行器 | [GitHub](https://github.com/dreeveapp/dreeve) |
| 27 | Endurain | 自托管 Web 服务 | Strava/Garmin/GPX/TCX/FIT 导入、跑步/骑行等活动、统计与数据控制 | AGPL-3.0；Docker 部署；隐私/自托管定位清晰 | [GitHub](https://github.com/endurain-project/endurain) |
| 28 | SparkyFitness | 自托管 Web + iOS/Android | 食物、运动、饮水、睡眠、断食、情绪、身体指标、家庭、多平台同步、可选 AI | **源码可见但不是开源**；仓库说明许可证为非商业许可；处于 active development | [GitHub](https://github.com/CodeWithCJ/SparkyFitness) |
| 29 | Skulpt | iOS/Android/Apple Watch | 本地 SQLite 训练计划、组数/次数、体重、HealthKit/Health Connect、可选同步 | GPL-3.0；本地优先，商店版本免费 | [GitHub](https://github.com/skulptapp/skulpt) |
| 30 | Stronk | Web/PWA | 训练、组数/次数/重量、RPE/RIR、例程、统计、Supabase 同步 | 源码可见；CC BY-NC-ND 4.0，不能按普通开源项目自由再发行 | [GitHub](https://github.com/acastaneiras/stronk) |

### B. 主流 App / 健康平台 20 个

| # | 产品 | 主要能力 | 强项与可切入空白 | 一手来源 |
|---:|---|---|---|---|
| 31 | MyFitnessPal | 食物、卡路里、宏量、运动、体重、步数、条码、设备同步 | 食品库和覆盖面强；本地优先、可审计、免费完整导出不是主卖点 | [官网](https://www.myfitnesspal.com/) |
| 32 | Cronometer | 卡路里、宏量/微量营养素、运动、体重、食谱、设备同步 | 数据精细、微量营养素深；社区和中文本地化不是核心定位 | [官方功能页](https://cronometer.com/features/) |
| 33 | MacroFactor | 饮食/体重记录、能量消耗估算、动态 Check-In、宏量目标 | 体重趋势与目标动态调整强；中文、本地化、公益属性不是主卖点 | [产品介绍](https://macrofactor.com/press-kit/) · [Check-In](https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules) |
| 34 | YAZIO | 卡路里/宏量、条码、AI 拍照、断食、食谱、活动同步 | 消费级流程完整；官方提示拍照识别只是粗估，需要人工修正 | [官网](https://www.yazio.com/en/) · [功能说明](https://help.yazio.com/hc/en-us/articles/11804776635281-Tutorial-of-the-Yazio-app) |
| 35 | Lifesum | 食物记录、评分、饮水、膳食计划、食谱、体重/围度、设备同步 | 把饮食包装成评分和习惯；较完整的目标/计划偏 Premium | [功能页](https://lifesum.com/features/) · [Premium](https://help.lifesum.com/en/article/what-do-i-get-when-i-buy-premium-1vzq8pz/) |
| 36 | MyNetDiary | 食物/运动日记、条码和营养标签扫描、语音、食谱、营养素、体重图表 | 记录效率和报告强；社区/挑战不是主产品承诺 | [官方功能页](https://www.mynetdiary.com/free-calorie-tracker.html) |
| 37 | Nike Training Club | 教练视频、白板训练、力量、耐力、瑜伽、灵活性、多周计划、恢复建议 | 内容和教练降低开始门槛；不是精细饮食/体重反馈工具 | [Nike 官方](https://www.nike.com/ntc-app) |
| 38 | Fitbod | 按目标、经验、器械、历史和恢复自动生成力量训练 | 个性化力量计划强；恢复百分比是模型估计，不是生理测量 | [工作原理](https://help.fitbod.me/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout) |
| 39 | Strong | 力量训练日志、RPE、PR、1RM、计划、肌肉热图、CSV/Apple Health | 记录快；饮食、综合健康和公益数据层不是主定位 | [官网](https://link.strong.app/) |
| 40 | Nike Run Club | GPS 跑步、音频指导、训练计划、鞋里程、徽章、挑战 | 适合初跑和目标训练；不是饮食/体重管理闭环 | [Nike 官方](https://www.nike.com/nrc-app) |
| 41 | Strava | GPS、路线、分段、排行榜、俱乐部、动态、挑战、Beacon | 社区和竞争机制成熟；高级分析/路线等部分属于订阅，饮食不是核心 | [官方帮助中心](https://support.strava.com/en-us/) |
| 42 | Runna | 5K/10K/半马/马拉松/越野训练计划，结合力量、灵活性、营养、恢复 | 目标赛事驱动强；核心计划体验集中在移动端 | [官网](https://www.runna.com/) |
| 43 | Happy Scale | 平滑每日体重波动、分解里程碑、预测趋势、Apple Health | 专门缓解体重波动和平台期挫败；不含食物库/训练计划 | [官网](https://happyscale.com/) · [App Store](https://apps.apple.com/us/app/happy-scale/id532430574) |
| 44 | Apple Health | 汇总活动、睡眠、用药、心率、健康记录；管理第三方授权 | iOS 健康数据中枢；本身不是减脂教练或训练社区 | [Apple Health](https://www.apple.com/health/) · [HealthKit 文档](https://developer.apple.com/documentation/healthkit) |
| 45 | Health Connect | Android 设备端健康数据层，按权限共享步数、体重、运动、营养、睡眠等 | 解决 Android 数据碎片化；不是面向用户的完整产品 | [Android 官方文档](https://developer.android.com/health-and-fitness/health-connect/data-types) |
| 46 | Keep | 中文健身/跑步/瑜伽课程、训练计划、运动记录、社区、硬件/商品 | 中文内容和陪伴强；专业饮食记录不是主要承诺 | [官网](https://www.calorietech.com/) · [App Store](https://apps.apple.com/cn/app/keep-ai-%E8%BF%90%E5%8A%A8%E6%95%99%E7%BB%83/id952694580) |
| 47 | 薄荷健康 | AI 体重管理、专家指导、中文饮食库、食谱、体重/体脂/围度、打卡/挑战 | 中国饮食和减重陪伴强；有商业会员/商品，方案不能替代医生 | [App Store](https://apps.apple.com/cn/app/%E8%96%84%E8%8D%B7%E5%81%A5%E5%BA%B7-ai%E5%87%8F%E8%82%A5%E5%81%A5%E8%BA%AB%E8%BD%BB%E6%96%B7%E9%A3%9F%E4%BD%93%E9%87%8D%E7%AE%A1%E7%90%86%E5%B9%B3%E5%8F%B0/id457856023) |
| 48 | 咕咚 | 跑步/骑行/健走、语音播报、训练计划、赛事、社交竞赛、HealthKit | 中文赛事与有氧运动强；饮食和体重习惯不是主功能 | [App Store](https://apps.apple.com/cn/app/%E5%92%95%E5%92%9A-%E8%B7%91%E6%AD%A5%E9%AA%91%E8%A1%8C%E5%81%A5%E8%B5%B0%E8%AE%AD%E7%BB%83%E9%A9%AC%E6%8B%89%E6%9D%BE%E8%B5%9B%E4%BA%8B/id453480684) |
| 49 | 悦跑圈 | GPS 跑步、训练计划、跑者社区、排行榜、挑战、赛事服务 | 中文跑者圈和赛事强；综合减脂、饮食和数据主权不是核心 | [官网](https://www.thejoyrun.com/) · [App Store](https://apps.apple.com/cn/app/%E6%82%A6%E8%B7%91%E5%9C%88-%E8%B7%91%E6%AD%A5%E8%BF%90%E5%8A%A8%E8%AE%B0%E5%BD%95%E4%B8%93%E4%B8%9A%E8%BD%AF%E4%BB%B6/id881766160) |
| 50 | Samsung Health | 步数、运动、GPS、食物/卡路里、体重/体成分、睡眠、压力、挑战 | 穿戴设备和综合数据很强；深度依赖设备生态，公益/本地可审计不是主定位 | [官方说明](https://www.samsung.com/us/apps/samsung-health/) |

## 样本呈现出的竞争格局

### 已经很拥挤的部分

- **通用卡路里记录**：MyFitnessPal、Cronometer、YAZIO、Lifesum、MyNetDiary，以及 OpenNutriTracker、Waistline、Food You、wger 等开源项目都覆盖了核心链路。
- **力量训练日志**：Strong、Fitbod、wger、LibreFit、GymMane、Granite、openGym、Skulpt 等都能记录动作、组数、次数、重量和 PR。
- **跑步/骑行记录**：Strava、Nike Run Club、咕咚、悦跑圈，以及 RunnerUp、OpenTracks、FitoTrack、FitTrackee、Endurain 等已经很成熟或很专门。
- **AI 拍照识别食物**：商业产品和开源项目都在做，但照片估算天然有份量、烹饪方式和混合菜误差；YAZIO 官方也明确要求把识别结果当作粗估并人工修正。

### 仍然有空间的部分

1. **“记录之后怎么办”**：许多产品擅长收集数据，却没有把一周的饮食、活动、睡眠和体重变化压缩成 2–3 个可执行、可解释的下一步。
2. **隐私和易用性同时成立**：开源项目往往隐私和可控性强，但部署、同步、设计一致性或新手引导不够；商业 App 往往体验好，但账户、订阅、云端和数据用途更复杂。
3. **中文饮食的可解释记录**：商业产品有中文食物库，但开源、可审计、可修正、带来源的中文食物数据层仍然很稀缺。不要直接复制商业数据库；数据来源、许可证和图片版权需要逐条确认。
4. **温和而不羞辱的长期减脂**：不少产品仍然围绕连续打卡、卡路里赤字和体重排行榜。对有过反复节食、情绪性进食或身体形象压力的人，默认的“超标/失败”语言可能适得其反。
5. **数据互操作**：用户往往同时使用手表、跑步 App、饮食 App 和力量日志。HealthKit 与 Health Connect 已经提供数据层，开源项目可以专注于读懂数据、去重、标注来源和导出，而不是重新测量所有东西。
6. **小团体而非公开社交**：公开排行榜会带来隐私和比较压力；可选择的 2–6 人小组、匿名目标和只分享行为完成情况，可能比做一个完整社交网络更适合公益项目。

## 我建议你做什么

### 推荐产品定义

暂定名可以是“稳减”或“轻量减脂日志”，产品不是“让人变瘦的 AI 教练”，而是：

> 帮用户看清自己的生活模式，并在下一周只做一两个更容易坚持的调整。

默认关注四类事实：

- 体重趋势，而不是单日数字；
- 饮食结构/饥饿感/外食场景，而不是强迫每口食物都称重；
- 活动分钟数、力量训练和日常步行，而不是只看手表估算热量；
- 睡眠、压力、周期或身体状态，用来解释波动，而不是给出诊断。

卡路里和宏量营养可以作为高级/可选模式，但不要把它们作为所有人的默认入口。

### MVP 应该只有 6 个核心能力

1. **30 秒每日记录**：体重（可选）、三餐模式/大致份量、饮水、活动、睡眠、饥饿/压力；支持“一键复制昨天”。
2. **本地健康数据读取**：iOS 先接 HealthKit，Android 后接 Health Connect；第一期只读，不自动向系统写入或上传。
3. **趋势而非噪声**：7/14/30 天移动趋势、活动分钟、力量训练次数、睡眠和主观状态；明确标注“估算”“来源”“缺失数据”。
4. **每周复盘**：只生成 2–3 条建议，例如“晚餐后更容易饿”“过去两周力量训练下降”“睡眠不足日体重波动更大”，每条建议能点开看到依据。
5. **可携带数据**：JSON/CSV 导入导出，包含来源、单位、时间、修改历史；用户可以离开，不被锁定。
6. **安全与边界**：不诊断、不承诺减重速度、不输出极端节食/脱水/药物建议；对孕期、未成年人、低体重、进食障碍史或慢性病场景提示寻求专业人士。

### 不要在第一版做的东西

- 不做自己的百万级食物数据库；先做小而透明的中国常见食物集合，再允许用户自建和修正。
- 不把 AI 拍照识别作为核心；如果做，默认本地或 BYOK，结果必须可编辑，并展示“不确定性”。
- 不做公开体重排行榜、连续打卡羞辱、无限通知和强社交 Feed。
- 不做完整 GPS 跑步平台、视频课程平台和动作媒体库；这些已经有大量成熟产品，直接导入它们的数据即可。
- 不做医疗诊断、疾病治疗、营养处方或“保证减脂”的营销文案。

### 技术路线

如果按一个人/小团队的公益项目来做，我建议：

1. **先做 iOS 原生**：SwiftUI + 本地 SQLite/SwiftData，接 HealthKit，完整支持导出、删除和离线使用。你可以先把体验做到足够稳定。
2. **数据模型从第一天跨平台**：记录统一用 `event + source + timestamp + unit + provenance`，不要把 iOS 的字段直接写死在 UI 里。
3. **第二阶段做 Android**：用 Kotlin/Jetpack Compose 接 Health Connect；如果要快速扩大覆盖，再把复盘/导入导出做成 PWA，但不要让 PWA 取代原生健康权限层。
4. **食品数据分层**：自有少量可审计数据、Open Food Facts/USDA 等外部来源、用户自定义数据分开存储，显示来源和许可证。Open Food Facts 官方明确要求遵守 ODbL、数据库内容许可和图片 CC BY-SA 等不同边界。
5. **发布和治理**：开源代码、数据字典、计算公式、证据来源和威胁模型；CI 做单元测试、迁移测试、导入导出回归和许可证扫描。

### 公益项目如何维持

不盈利不等于没有运营设计。可以采用：

- 代码和基础能力永久免费、无广告、无用户画像；
- GitHub Sponsors/捐赠只用于开发者账号、域名、文档托管和测试设备；
- 公开月度 changelog、费用和贡献者名单，不卖数据；
- 需要云同步时，默认让用户自托管或连接自己的 WebDAV/Nextcloud；不承诺由个人长期免费托管所有人的健康数据；
- 把翻译、食物来源校验、可访问性和隐私审计设计成容易参与的贡献任务。

## 建议的 90 天验证顺序

### 第 1–2 周：先验证问题，不急着堆功能

- 访谈 10–15 个真实用户，至少覆盖：节食反复者、刚开始运动者、力量训练者、只用手表者、讨厌卡路里记录者。
- 让他们连续 7 天用纸笔或现有 App 记录，问清楚“哪一步最烦”“什么数据其实不想交给平台”“看完周报后会做什么”。
- 明确一个首要人群，不要同时服务健美、马拉松、糖尿病管理和普通减脂。

### 第 3–6 周：做可用的本地 MVP

- 每日记录、趋势、周报、JSON/CSV 导出、删除全部数据。
- 先使用模拟 HealthKit 数据和手工导入，不要一开始就处理所有穿戴设备边界。
- 全程无账号、无远程分析、无图片上传。

### 第 7–10 周：小规模真实使用

- 找 20–30 个用户连续使用 4 周；观察的是完成记录和复盘后的行为变化，不是“减了多少斤”。
- 记录：7 日后仍在用的人数、每周记录天数、周报打开率、建议被采纳的比例、导出/删除是否可用、误导或不安反馈。
- 每周只改一个高影响摩擦点，例如“复制昨天”“外食快速记录”或“趋势解释”。

### 第 11–13 周：决定是否扩大

- 如果用户喜欢的是“低负担复盘”，继续做中文本地化和 Health Connect；
- 如果用户真正想要的是力量训练日志，就把项目收窄成训练记录，不要继续扩展饮食；
- 如果用户只想看数据汇总，就做导入器和可解释报告，不要再做一个全能 App。

## 风险与底线

- 健康建议必须有来源、版本和适用范围；任何能影响饮食或运动强度的计算都要标注为估算。
- 体重、饮食、睡眠、心率和位置都是敏感数据；默认本地、最小权限、可删除、可导出，不用它们做广告画像。
- 食物数据库、动作图片、视频和字体的许可证经常与代码许可证不同，不能看到 GPL/MIT 就认为所有素材都能复制。
- “非盈利”项目最大的风险不是没有订阅收入，而是维护者疲劳、健康数据责任和云端成本失控，所以第一版要尽量无后台、无人工教练承诺、无持续内容生产依赖。

## 关键参考

- [WHO physical activity recommendations](https://www.who.int/initiatives/behealthy/physical-activity)：成人每周 150–300 分钟中等强度活动、每周至少 2 天力量活动。
- [CDC Steps for Losing Weight](https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html)：强调渐进、稳定的减重和饮食、活动、睡眠、压力的综合生活方式。
- [WHO Healthy diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet)：健康饮食的核心是充足、平衡、适度和多样，而不是单一数字。
- [Apple HealthKit 官方文档](https://developer.apple.com/documentation/healthkit)：健康数据以用户授权为前提，应用可以只专注于所需的数据子集。
- [Android Health Connect 数据类型](https://developer.android.com/health-and-fitness/health-connect/data-types)：涵盖运动、体重、营养、睡眠等数据，并要求声明和申请权限。
- [Open Food Facts 许可证说明](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/)：数据库、数据库内容和产品图片存在不同许可证边界。

## 最终建议

**可以做，而且适合以非盈利、开源、隐私优先的方式做；但项目的核心不应是“减脂功能更多”，而应是“让人更少记录、更少焦虑，却能看懂长期趋势并做出下一步行动”。**

如果现在就开工，我会把项目范围定成：**iOS 原生、本地优先、中文用户、30 秒记录 + 周复盘 + HealthKit 只读 + JSON/CSV 全量导出**。等真实用户证明“复盘”确实有价值，再扩展 Android、中文食品数据和小团体协作。
