# Steady 竞品能力核对

核对日期：2026-09-27。资料范围：产品官方说明、官方帮助中心、Apple 官方说明及开发者提供的中国区 App Store 文案。以下是**公开宣称的能力**，没有逐个安装实测，也不代表用户规模、留存或功能质量。Steady 的当前范围以本仓库 [README](../README.md) 为准。

## 已有能力覆盖了哪些需求

| 产品 | 官方可核对能力 | 对 Steady 的含义 |
|---|---|---|
| Apple 健康 | 可记即时情绪和全天心情，并在图表中对照运动、睡眠、日照和正念时间；还能汇集设备健康数据、手动记录症状和用药。来源：[心境记录](https://support.apple.com/en-euro/guide/iphone/iph6a6decb13/27/ios/27)、[健康数据概览](https://support.apple.com/en-lk/guide/iphone/iphbb8259c61/ios)。 | 基础数据汇总和“心情与睡眠/活动同屏看”已是系统能力。Steady 需要提供更具体的日常解释或行动闭环。 |
| Daylio | 两次点击记心情和活动，可加文字、照片、语音；有目标、提醒、统计、活动与心情的相关分析、PDF/CSV 导出和 iCloud 备份。官方帮助文档还说明了 Apple 健康数据的同步与授权。来源：[产品页](https://daylio.net/)、[活动与心情统计](https://daylio.net/faq/docs/daylio-faq/about/activity-and-mood-statistics/)、[Apple 健康同步帮助](https://daylio.net/faq/docs/daylio-faq/issues/apple-health-troubleshooting/)。 | “轻量日记＋健康数据＋趋势”不是空白市场。Steady 的中文体验和训练计划需要比单纯记录更有用；隐私也不能只靠“本地优先”四个字区分。 |
| Bearable | 可记心情、症状、精力、睡眠和自定义因素；可导入 Apple 健康的步数、体重、心率等，并比较因素与健康结果的相关性。官方提示至少要有因素发生和未发生的若干天，结果要谨慎解释。来源：[个性化与 Apple 健康导入](https://bearable.app/support/tips/get-started-a-few-tips-to-personalise-bearable/)、[相关性说明](https://bearable.app/support/howto/how-to-find-correlations/)、[因素报告](https://bearable.app/support/howto/the-factor-effect-report/)。 | 多维追踪和“找可能影响因素”已经较成熟。Steady 应先明确要帮助哪类人解决哪一个高频问题，避免和通用症状追踪器比字段数量。 |
| Guava | 集中病历、症状、用药、设备指标，支持趋势/相关性、就诊摘要和 AI 助手；官方列出 Apple 健康等设备来源。来源：[产品页](https://guavahealth.com/)、[方案与功能](https://guavahealth.com/plans)、[支持的数据源](https://guavahealth.com/supported-apps)。 | “把健康数据交给 AI 总结”也已有强竞品。Guava 更偏病历和就医管理；Steady 可聚焦不以诊疗为目的的日常状态、训练和恢复。 |
| 中国区可见产品：MoodFlow、Hearty | MoodFlow 的中国区 App Store 文案列出情绪记录、趋势、可选写入 Apple 健康「心境」、iCloud 同步与导出；Hearty 文案列出多健康指标、图表和云端 AI 分析。来源：[MoodFlow 中国区页面](https://apps.apple.com/cn/app/moodflow-%E6%83%85%E7%BB%AA%E6%97%A5%E8%AE%B0-%E5%BF%83%E6%83%85%E8%AE%B0%E5%BD%95/id6755678705)、[Hearty 中国区页面](https://apps.apple.com/cn/app/%E5%93%88%E7%89%B9%E5%81%A5%E5%BA%B7%E6%A3%80%E6%B5%8B-%E5%BF%83%E7%8E%87-%E8%A1%80%E6%B0%A7-%E8%A1%80%E5%8E%8B-%E7%9D%A1%E7%9C%A0-%E5%BF%83%E8%84%8F/id1490743162)。 | 中文与 Apple 健康、AI 的组合本身也不是独占优势。App Store 文案是开发者自述，功能效果与中国大陆网络体验仍需实测。 |

## 可执行的定位判断

1. **先做窄场景**：以“今天的状态为什么变了、明天训练该怎么调”为主问题，把体重、睡眠、步数、运动分钟和主观笔记串成一条可回看的时间线。此为产品建议，并非竞品已有或 Steady 已验证的结果。
2. **报告给依据和不确定性**：只显示实际读到的值、缺失数据和个人基线；相关变化写成“可能有关，仍需更多记录”，不要当成因果或医疗判断。Bearable 的[相关性说明](https://bearable.app/support/howto/how-to-find-correlations/)也明确提示数据量与噪声问题。
3. **建立记录到行动的闭环**：让用户先写或点选当天感受，再看到有依据的状态回顾，最后选择接受、修改或忽略训练草案；下一次记录能回看该建议是否有用。Steady 当前 README 已列出“AI 训练计划先为草案、经确认才加入计划”，应优先验证这条完整体验。
4. **把独立授权变成可理解的信任体验**：向用户清楚展示本地保存、HealthKit 读取、云同步和 AI 处理各自影响哪些数据，分别开关，并让导出/恢复可实际操作。Daylio 的[隐私政策](https://daylio.net/faq/privacy-policy/)说明其数据留在设备且可选 iCloud 备份，因此本地保存单点不能算独有卖点。

## 证据边界

- 这里比较的是功能覆盖和可能的产品位置，不是竞争力评分；没有验证价格、市场份额、真实体验或国内网络可用性。
- 没有因为官方页面未提到某功能，就断言产品一定没有它。
- Steady 的 HealthKit 真机读取和跨设备恢复仍标为开发中（见 [README](../README.md)），不能把计划中的能力当作已交付优势。
