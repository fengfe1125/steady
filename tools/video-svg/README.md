# 真人视频 → 本地 SVG：第一批制作流程

这批包含六个动作。视频是动作观察依据，不是自动姿态识别结果。关节角度是人工教学拟合，隐藏部位和器械内部机构没有测量证据，不补画成确定结构。

## 制作与生成

1. 在 `specs.mjs` 中为动作写独立 `makePose`、错误示意、时间点、支撑与器材模型。保留源动作 ID 和现有 lessonID；核对姿势变体后才设 compatible。
2. 在 `docs/verification/video-svg-phase1/sources.json` 中登记源文件相对路径和 SHA-256。选完整示范，不用文件大小代替内容核对。
3. `node tools/video-svg/build.mjs --only bodyweight-squat` 只生成指定动作 HTML、更新该动作清单及来源档案；同目录的共享渲染器会更新。省略 `--only` 生成六个。非法 ID 必须报错。
4. `python3 tools/video-svg/prepare.py --source-root /Volumes/Developer/Projects/keep/action-library/actions` 核对源哈希、取六帧、制作无声审阅副本。需 ffmpeg 和 Pillow；本机使用 Codex bundled Python。源文件不会被覆盖。
5. 运行 `node --test tools/video-svg/geometry.test.mjs`。对照来源帧检查人物、支撑、器材、运动方向和幅度，不能只依赖几何通过。

新增批次沿用源 ID、源哈希、重复片段、六帧、变体说明、错误文字依据、约束与验收状态，不把本批数量断言直接扩大。

## 预览与验收

从仓库根目录启动 `python3 -m http.server 8766 --bind 127.0.0.1`，打开 `/tools/video-svg/preview.html`。可切动作、播放、慢放、定位、三种视图、深色主题，以及源片段同步对照。视频副本无音轨，未加入 App。

`browser-check.mjs` 是 Ego 验收脚本，运行前把 taskSpace 的数值改为当前明确授权的工作区 ID；不要自行新建或复用无关工作区。浏览器 RAF 停滞时保留失败结果，不能用命令已发送声称播放成功。

App 中在原动作教学页选择“视频还原示范”。旧计划、目录、教学和用量不变。六个新例子独立归属本地来源，不沿用原课视频时间段。运行资源由 Swift Package 复制，完全不依赖 source-root 或网络。

构建 Debug 模拟器 App 后运行：

```
python3 tools/video-svg/run-native.py --set <专用模拟器设备集> --device <专用模拟器UUID> --app <Steady.app路径>
```

此命令仅用于专用 QA 模拟器，会安装 App、启动显式调试入口、读取 Documents 下的验收结果和保存屏幕截图。不会安装真机或清除任何模拟器。探针仅编译在 DEBUG + simulator，且必须传 `--video-reference-audit` 才运行；使用的是正式教学页的 WKWebView。

通过要求：每动作 101 时刻无接触丢失/长度变化/跳变/裁切，正常播放前进，暂停不前进，半速约为正常的一半，四格布局完整，三种页面和深色截图可读。另跑 `swift test` 与原动画工具测试。真机安装、离线与长时性能仍需单独验收。

## 恢复与来源

基线、来源档案、截图、测试日志和本批文件哈希在 `docs/verification/video-svg-phase1/`。恢复时按 baseline 清单逐文件比较，仅还原本批改动，不能 `git reset` 或覆盖整个未提交工作区。原目录中的真人媒体只供制作与本机对照；App 包内只包含自绘 SVG/JS 和教学文字。
