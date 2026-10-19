# Steady 图标视觉调研

## 调研目的

为 Steady 设计一个适合 iOS 主屏幕的原创图标：线条感、简洁、有设计识别度，同时能承载健康日记、趋势观察和 AI 教练的产品气质。

## 参考观察

### Claude / Anthropic

- Claude 当前官网使用大面积暖白留白、深色主文字和低饱和的灰色辅助文字，首屏视觉不依赖复杂插画，而依赖排版、留白和少量品牌符号。
- Claude 的标志是一个橙色的放射状线性花形：多条独立曲线围绕中心形成整体，线条本身就是识别元素；它不是一个具象的 AI、聊天或机器人图形。
- 对 Steady 的启发：可以借鉴“线条构成一个符号”的方法，但不能照搬 Claude 的放射花形；Steady 需要自己的构成逻辑，例如身体状态的波动、日常节奏和趋势轨迹。

来源：[Claude 官网](https://claude.com/)、[Claude Design 官方页面](https://claude.com/product/design)、[Anthropic 官方设计相关说明](https://www.anthropic.com/news/claude-design-anthropic-labs)

### Gentler Streak

- 图标使用一个非常简单的橙色有机豆形，不直接画人、跑步、心率或哑铃。
- 形状单独承担品牌识别，背景和主体关系清晰，缩小后仍然容易辨认。
- 对 Steady 的启发：健康产品可以使用抽象形状；“温和、持续、不过度激励”可以通过曲线和比例表达，而不是通过运动器材符号表达。

来源：[Gentler Streak 官网](https://gentlerstories.com/gentlerstreak)、[App Store 页面](https://apps.apple.com/es/app/gentler-streak-activity-log/id1576857102?l=en-GB)

### Athlytic

- 图标用四个向上排列的白色斜条表达数据增长、训练表现和进步，不使用心脏、手表等具象元素。
- 图形非常少，但方向性很明确，适合“数据驱动的训练教练”定位。
- 对 Steady 的启发：如果使用数据隐喻，应采用一个有节奏的构成，而不是同时放入多个指标符号。

来源：[Athlytic 官网](https://athlyticapp.com/)、[App Store 页面](https://apps.apple.com/us/app/athlytic-ai-fitness-coach/id1543571755)

### Streaks

- Streaks 的核心品牌图形是简化的字母 / 环形符号，配合高对比色块；它把“连续习惯”压缩成一个很容易识别的图形。
- 产品功能非常丰富，但主图标没有把所有功能画进来，保持了单一记忆点。
- 对 Steady 的启发：图标只需要代表“每天持续观察自己”，不需要同时表达睡眠、体重、训练、AI 和 Apple Health。

来源：[Apple App Store 页面](https://apps.apple.com/us/app/streaks/id963034692)、[Apple App Store 的 Streaks 介绍](https://apps.apple.com/us/story/id1272004658)

### Apple Fitness+

- 使用三条高对比活动环表达 Move、Exercise 和 Stand 三类目标，图形语义直接、结构高度统一。
- 这种方案适合明确的活动目标产品，但容易与 Apple Health / Fitness 的环形语言产生联想。
- 对 Steady 的启发：应避免使用三重活动环作为主方向，以免产品在 iOS 生态中缺乏区分度。

来源：[Apple Fitness+](https://fitness.apple.com/us/subscribe?ct=fitness)

### 其他 AI 健康产品

- Olivia Health 使用简单的环形线条表达健康记录和连续时间线。
- Ovum 使用左右对称的有机线条表达 AI 健康伙伴和身体周期。
- 这类图标说明“线条 + 抽象有机形”适合健康 AI，但也意味着 Steady 需要通过独特的构图比例和线条节奏建立自己的识别度。

来源：[Olivia Health App Store 页面](https://apps.apple.com/us/app/olivia-health/id6670762054)、[Ovum App Store 页面](https://apps.apple.com/au/app/ovum-ai-health-partner/id6741887980)

## 设计结论

Steady 不继续使用上一版的“圆环 + S + 数据点 + 叶片”组合。这个组合的主要问题是语义堆叠，像功能插画，不像品牌符号。

下一版采用以下约束：

1. 只保留一个原创抽象线性符号，不画器械、心脏、叶片或 Apple 活动环。
2. 线条数量可以是多条，但必须形成一个统一构成；重点是线条之间的关系，不是“一根线完成全部图形”。
3. 使用暖白 / 炭黑 / 低饱和赭橙作为基础视觉，借鉴 Claude 的气质但不复刻其放射花形。
4. 主图标先以单色版本成立，再补充反色版本；不依赖渐变和阴影来制造识别度。
5. 在 128px 及更小尺寸检查线条间距、闭合关系和负空间，确保不会糊成一团。

## 本轮 Figma 方向

将建立新的 `Reference-led Line Study` 页面，优先尝试三种原创构成：

- 多弧线围绕一个偏心留白，表达身体节奏和持续观察。
- 两组不完全对称的曲线，表达数据与人的关系，而不是医学图形。
- 一组向内收拢再向外展开的线条，表达从数据到下一步行动的转换。

这些方向只借鉴“抽象线性品牌符号”的方法，不复制 Claude、Gentler Streak、Athlytic 或其他产品的具体图形。
