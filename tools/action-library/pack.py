"""Build WorkBuddy/DeepSeek work folders. Each lane is one folder = one agent window, so windows run in parallel.

  python3 -I tools/action-library/pack.py --source-root <action-library> --part chest --round round1-pilot --size 2 <sourceID> ...
  python3 -I tools/action-library/pack.py --source-root <action-library> --part chest --round round2 --size 10 --rest
      --rest: every non-mirror action of the part that has no spec yet and is not in an earlier round.
Output: build/action-library/workbuddy/<part>/<round>/lane-NN/{任务说明.md, PROMPT.md, NN_<name>/frames + input.md}
"""
import argparse
import glob
import html
import json
import pathlib
import re
import shutil
import sys
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = ROOT / 'tools/action-library'
sys.path.insert(0, str(HERE))
from frames import action_dir, main_video, probe, grab  # noqa: E402

TASK = """# 任务说明（请先完整阅读）

你在这个文件夹里为若干健身动作各写一份 JSON 动作描述。规则：

1. 先完整阅读本文件夹里的 `PROMPT.md`，它规定了 JSON 的全部格式、坐标约定、模板和示例。
2. 只在**本文件夹**内工作，不要读取或修改其他文件夹。
3. 按编号顺序**一次只处理一个动作文件夹**（如 `01_窄距俯卧撑/`）：
   - 阅读其中的 `input.md`，逐张查看 12 张 `frameNN_X.XXs.jpg` 帧图（文件名里是视频时间）。
   - 把结果写入该动作文件夹，文件名为 `<sourceID>.json`（`input.md` 里写明了），内容只有 JSON 本身，不要 ``` 标记。
   - 写完一个，再处理下一个。不要把上一个动作的时间点或角度直接沿用到下一个。
4. 如果某个动作文件夹里有 `检查结果.md`：
   - 标记 ✗ 的，按其中的错误逐条修改该文件夹里的 JSON（覆盖原文件）；
   - 标记 ✓ 的，不要再改。
5. 不要修改、移动或删除帧图、`input.md`、`检查结果.md`。
6. 全部完成后，回复一张表：动作名、sourceID、是否已写 JSON、你没把握的地方。
"""


def text(description):
    s = re.sub(r'<img[^>]*>', '', description or '')
    s = re.sub(r'</(h4|li|p)>', '\n', s)
    return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()


def make_pack(source_root, row, dest):
    sid = row['id']
    folder = action_dir(source_root, sid)
    detail = json.loads((folder / 'detail.json').read_text())
    video = main_video(folder)
    duration, _ = probe(video)
    dest.mkdir(parents=True, exist_ok=True)
    times = [round(duration * (i + 0.5) / 12, 2) for i in range(12)]
    for i, t in enumerate(times):
        grab(video, t, dest / f'frame{i + 1:02d}_{t:.2f}s.jpg', 512)
    reps = (detail.get('videos') or [{}])[0].get('count')
    md = [f'# 动作：{row["name"]}', '',
          f'- sourceID：`{sid}`（输出文件：本文件夹内 `{sid}.json`）',
          f'- 部位：{row["part"]}；类型：{row["tag"]}',
          f'- 器材：{(detail.get("equipment") or {}).get("name") or "未知"}',
          f'- 主练肌群：{"、".join(row["majors"]) or "未标注"}',
          f'- 视频时长：{duration:.2f} 秒；视频内重复次数：{reps or "未标注"}',
          '', '## 12 张帧图', '']
    md += [f'- frame{i + 1:02d} = {t:.2f} 秒' for i, t in enumerate(times)]
    md += ['', '## 来源文字说明（只用于理解动作，禁止原句照抄进输出）', '', text(detail.get('description'))]
    (dest / 'input.md').write_text('\n'.join(md) + '\n')
    return sid


def equipment_name(source_root, sid):
    d = json.loads((action_dir(source_root, sid) / 'detail.json').read_text())
    return (d.get('equipment') or {}).get('name') or ''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source-root', type=pathlib.Path, required=True)
    ap.add_argument('--part', required=True)
    ap.add_argument('--round', required=True)
    ap.add_argument('--size', type=int, default=10, help='actions per lane (one agent window)')
    ap.add_argument('--rest', action='store_true')
    ap.add_argument('ids', nargs='*')
    args = ap.parse_args()

    rows = {r['id']: r for r in json.loads((ROOT / 'docs/action-library/classification.json').read_text())}
    base = ROOT / 'build/action-library/workbuddy' / args.part
    if args.rest:
        taken = {p.name for p in (HERE / 'specs' / args.part).glob('*.json')}
        taken = {t[:-5] for t in taken} | {m.group(1) for p in base.glob('*/lane-*/*/input.md')
                                           for m in [re.search(r'sourceID：`(\w+)`', p.read_text())] if m}
        ids = [r['id'] for r in rows.values() if r['part'] == args.part and not r['mirrorOf'] and r['id'] not in taken]
        # Similar actions share a lane: the agent stays consistent within one family of variants.
        ids.sort(key=lambda i: (equipment_name(args.source_root, i), rows[i]['tag'], rows[i]['name']))
    else:
        ids = args.ids
    out = base / args.round
    if out.exists():
        raise SystemExit(f'{out} already exists; pick a new round name')
    jobs = []
    for k, sid in enumerate(ids):
        lane = out / f'lane-{k // args.size + 1:02d}'
        if not (lane / 'PROMPT.md').exists():
            lane.mkdir(parents=True)
            shutil.copy(HERE / 'PROMPT.md', lane / 'PROMPT.md')
            (lane / '任务说明.md').write_text(TASK)
        jobs.append((rows[sid], lane / f'{k % args.size + 1:02d}_{rows[sid]["name"].replace("/", "／")}'))
    with ThreadPoolExecutor(6) as pool:
        for sid in pool.map(lambda j: make_pack(args.source_root, *j), jobs):
            pass
    print(f'{len(ids)} actions → {len(set(j[1].parent for j in jobs))} lanes in {out}')


if __name__ == '__main__':
    main()
