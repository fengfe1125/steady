# 动作库批量 SVG：制作与验收流程

把 Keep 动作库（4,730 个动作）按 Steady 部位分批改成离线 SVG 教学动画。DeepSeek 只写 JSON 数据，程序负责解算与绘制，Claude/Codex 负责验收。

| 文件 | 作用 |
|---|---|
| `classify.py` | 4,730 个动作按部位分类 → `docs/action-library/` |
| `pack.py` | 生成 DeepSeek 输入包：12 张带时间的帧图 + `input.md` |
| `PROMPT.md` | 给 DeepSeek 的系统提示词（含坐标约定、模板、俯卧撑完整示例） |
| `specs/<部位>/<sourceID>.json` | 每个动作一份 JSON（DeepSeek 产出放这里） |
| `pose.mjs` | JSON → 每帧姿态：关键姿态插值 + 锚点 + 手脚接触点求解 |
| `check.mjs` | 自动检查：格式、肌群/器材白名单、照抄原文、101 时刻穿地/滑脱/跳变、批内雷同 |
| `build.mjs` | 生成审阅页 `build/action-library/<id>/lesson.html` |
| `frames.py` / `render.sh` | 原片关键帧与 SVG 四格对照图 `comparison.jpg` |
| `review.sh <部位>` | 以上检查与渲染一键执行 |

## 一批的流程

1. `python3 -I tools/action-library/pack.py --source-root <动作库> --batch <批名> <sourceID>...`
2. DeepSeek：系统提示词 = `PROMPT.md` 全文；每个动作一轮对话，上传该动作的 12 张帧图并粘贴 `input.md`。
3. 把返回的 JSON 存为 `specs/<部位>/<sourceID>.json`。
4. `tools/action-library/review.sh <部位>`：未通过的把 error 原文发回 DeepSeek 修改；通过的看 `comparison.jpg` 验收。

生成物都在 `build/`（已被 git 忽略）；原片只读，不进入 App。
