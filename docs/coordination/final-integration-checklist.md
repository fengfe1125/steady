# 负责人最终接入工作单

八窗口已恢复，独占 final-acceptance 目录并行核对。负责人独占下述文件；专题窗口不得修改。

1. `Sources/SteadyCore/AnimatedTrainingCollection.swift`：统一八专题目录入口，复用已验证的八个 loader；保留当前独立预览路由及既有来源字段。
2. `Steady/TrainingCollections.swift`：正式合集列表改接八专题原创动画页，复用 `AnimatedTrainingCollectionView`，手臂基础和补充分别显示，保留加载失败提示。旧视图代码暂保留以保护 WIP。
3. `Steady/SettingsOnboarding.swift`：八个视频/补充参考入口移出 DEBUG-only 范围，整理到单一训练参考分区，与正式入口共用同一目录。
4. `Steady/AnimatedTrainingViews.swift`：确认合集页保留装备、训练说明、来源标记；视频及参考链接只在设置页。原生播放器行为沿用已验证实现。
5. `SteadyUITests/SteadyUITests.swift`：新增真实合集列表进入八专题的导航覆盖及设置参考页检查；不重跑已通过的全部图解专项，只有变更影响范围重新验收。
6. 逐专题接收 final-review：内容/动作硬错误先修复，未观看区间和环境限制如实保留，禁止用构建结果替代动作验收。
7. 正式集成后完成相关 core tests、原生构建及入口 UI 检查。所有产物在开发盘；未经总验收不发清理通知，不安装手机。

接入条件：该专题负责人审查通过；本清单不是验收通过声明。当前八专题均仍候选。没有删除原有 WIP。

## 2026-10-04 正式入口实施进度

正式TrainingCollectionsView已委托八专题原创动画列表，教练文案已更新，设置八个参考入口已移出DEBUG。原有课页实现保留保护WIP。两项导航测试改由教练页实际打开合集，八设置参考测试保留；另检查弓步推举最终整段图注。核心9项通过；formal-training-integration原生4项批次运行中。此前预览3项通过不代替本次正式入口结果。

最终源码/资源仍在原项目；暂不安装手机、未下发缓存删除。视频连续观看和动画连续目视的限制必须保留在最终证据说明，不以代码集成消除。
