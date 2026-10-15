"""Group the Keep action library by Steady's body-part categories.

Usage: python3 -I tools/action-library/classify.py --source-root <action-library> --out docs/action-library
Reads only metadata.json; writes classification.json and summary.md.
"""
import argparse
import json
import os
import re
from collections import Counter, defaultdict

# Steady topics: arms/arms-extra -> arms, legs/functional -> legs.
MUSCLE_TO_PART = {
    'chest': ['胸肌上束', '外侧胸', '胸肌中下束'],
    'back': ['背阔肌', '上背部', '中背部', '下背', '斜方肌中下束', '竖脊肌', '胸椎', '腰椎'],
    'shoulders': ['肩前束', '肩中束', '肩后束', '肩关节', '肩袖肌群', '斜方肌上束', '颈部肌肉'],
    'arms': ['肱二头肌', '肱三头肌', '小臂', '小臂前侧', '小臂后侧', '肘关节', '腕关节'],
    'abs': ['上腹部', '下腹部', '侧腹'],
    'legs': ['臀大肌', '股四头肌', '臀外侧', '腘绳肌', '臀中肌', '髂腰肌', '内收肌群', '大腿外侧',
             '腓肠肌', '胫骨前肌', '小腿', '踝关节', '髋关节'],
}
TIE_ORDER = ['legs', 'back', 'chest', 'abs', 'shoulders', 'arms']
PART_OF = {m: p for p, ms in MUSCLE_TO_PART.items() for m in ms}
TITLES = {'chest': '胸部', 'back': '背部', 'shoulders': '肩部', 'arms': '手臂', 'abs': '腹部',
          'legs': '腿部（含臀、下肢功能）', 'fullbody': '全身 / 有氧'}
RELAX = {'stretchRelax', 'massage', 'staticStretching', 'dynamicStretching', 'mobility', 'flexibility'}
SIDE = re.compile(r'左侧|右侧|[左右]')


def classify(meta):
    majors = meta.get('majorTrainingPointNames') or []
    votes = Counter(PART_OF[m] for m in majors if m in PART_OF)
    if votes:
        # Ties go to the larger muscle group: a push-up (triceps + chest) is a chest exercise.
        part = max(votes, key=lambda p: (votes[p], -TIE_ORDER.index(p)))
    else:
        part = 'fullbody'
    kinds = set(meta.get('classifies') or [])
    tag = '拉伸放松' if kinds & RELAX else ('有氧' if 'cardio' in kinds else '力量' if 'muscleStrength' in kinds else '其他')
    return part, tag


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source-root', required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()
    root = os.path.join(args.source_root, 'actions')

    rows = []
    for d in sorted(os.listdir(root)):
        with open(os.path.join(root, d, 'metadata.json'), encoding='utf-8') as f:
            meta = json.load(f)
        part, tag = classify(meta)
        rows.append({'id': meta['id'], 'name': meta['name'], 'part': part, 'tag': tag,
                     'majors': meta.get('majorTrainingPointNames') or [],
                     'mirrorKey': SIDE.sub('', meta['name']),
                     'countdownOnly': (meta.get('actionTypes') or []) == ['countdown']})

    mirror = defaultdict(list)
    for r in rows:
        mirror[(r['part'], r['mirrorKey'])].append(r)
    for group in mirror.values():
        group.sort(key=lambda r: r['name'])
        for i, r in enumerate(group):
            r['mirrorOf'] = group[0]['id'] if i and len(group) > 1 else None

    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, 'classification.json'), 'w', encoding='utf-8') as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)

    lines = ['# 动作库按 Steady 部位分类', '',
             f'共 {len(rows)} 个动作。依据 metadata.json 主练肌群投票；无部位肌群（“全身”）归入全身/有氧。'
             '镜像 = 同部位下仅左右不同的另一侧，可由翻转生成。', '',
             '| 部位 | 动作数 | 去镜像后需制作 | 力量 | 拉伸放松 | 有氧 | 其他 | 纯计时 |',
             '|---|---|---|---|---|---|---|---|']
    for part in TITLES:
        rs = [r for r in rows if r['part'] == part]
        tags = Counter(r['tag'] for r in rs)
        own = sum(1 for r in rs if not r['mirrorOf'])
        lines.append(f"| {TITLES[part]} | {len(rs)} | {own} | {tags['力量']} | {tags['拉伸放松']} | "
                     f"{tags['有氧']} | {tags['其他']} | {sum(r['countdownOnly'] for r in rs)} |")
    own_total = sum(1 for r in rows if not r['mirrorOf'])
    lines.append(f'| **合计** | **{len(rows)}** | **{own_total}** | | | | | |')
    lines += ['', '## 各部位示例', '']
    for part in TITLES:
        rs = [r for r in rows if r['part'] == part and not r['mirrorOf']]
        lines.append(f"- **{TITLES[part]}**：" + '、'.join(r['name'] for r in rs[:12]))
    with open(os.path.join(args.out, 'summary.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    print('\n'.join(lines))


if __name__ == '__main__':
    main()
