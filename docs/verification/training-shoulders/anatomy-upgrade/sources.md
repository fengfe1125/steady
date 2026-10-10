# 肩部器械结构与证据

2026-10-04。本轮保留 Claude 统一解剖人形、颜色、三面板与 11 课身份。原片证据只支持已记录的姿势和顺序，不把历史验收当成本轮浏览器验收。

实际重新打开的原片图片：

- `../evidence/frames/reverse_fly_setup_01.jpg`：上置转轴、摆臂和握把、胸垫、座椅、配重塔；型号无法从图中可靠识别。
- `../evidence/frames/trx_y_raise_prep_bent_elbow_0213s.jpg`、`trx_y_raise_peak_0214s.jpg`：屈肘后倾 → 展开到近直臂 Y；脚位提供支撑。
- `../evidence/frames/trx_w_hold_0312s.jpg`：约直角屈肘 W 字保持。不会据此新增完整外旋往复或移动脚的重复周期。

本轮访问的一手厂商资料：

- [Life Fitness Insignia Pectoral Fly / Rear Deltoid，SS-FLY](https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/insignia-series-pectoral-fly-rear-deltoid)：真实的选择式配重双用途机器，具座垫、胸/背垫、上部转轴和运动臂。用作器械类别结构核对，不声称原片就是该型号，也不复制其整机尺寸或配重处方。
- [TRX 官方悬吊器安装与调整](https://www.trxtraining.com/blogs/news/how-to-get-started-with-your-trx-suspension-trainer)：悬吊锚、连接环、登山扣、可调织带和把手属于真实结构。动画尺寸是教学示意，不能据此量出原片锚点或站位。
- [TRX 官方 W Deltoid Fly](https://www.trxtraining.com/blogs/news/trx-moves-of-the-week-shoulder-shred)：支持约 90° 屈肘、手在肩上方的 W 形态。此官方动作有外旋往复，但本合集原片只有可确认的 W 保持，因此没有把官方往复移植成原片内容。

几何补齐：

- 新增器械类型仅注册到 `SteadyAnatomy.equipment.types`，全部使用 `shoulders_` 前缀。
- 反飞鸟的固定柱、上转轴、水平摆臂、固定长度下垂柱、自由握柄、胸垫、座椅与配重/滑轮链保持连接。侧深度在背面投影中缩短，不能把投影长度变化误称为伸缩机械臂。该图为类别示意，不是厂商工程复刻或原片机型鉴定。
- Y 的侧视投影随双臂向外展开缩短。把手深度和锚点到手的空间距离受到固定带长约束；50 ms 作者采样之间的插值误差另行记录。两只手在严格侧视中重叠；不能由该视图量出真实握距或外展角度。
- W 全周期保持同一身体、脚与把手位置。详情中的虚影只解释进入姿势，不把脚位调整演成反复动作。
- 俯卧动作将泡沫轴置于地垫上，胸腹与轴相邻，膝部/脚部保持地垫附近支撑。

动画没有新增医疗剂量。课程与来源 JSON 保持原文；本轮修改的是图示、与图示直接对应的解释和无效视角字段。
