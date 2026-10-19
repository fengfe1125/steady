"""Collect agent JSON from WorkBuddy lanes, check it, render comparisons and write feedback back into each folder.

  python3 -I tools/action-library/collect.py --part chest [--source-root <action-library>]

For each action folder: <sourceID>.json → specs/<part>/, then 检查结果.md (✓/✗ + reasons) is written beside it.
Manual verdicts live in reviews/<part>.json: {"<sourceID>": {"status": "approved"|"rejected", "note": "..."}};
a rejection is written back as ✗ so the agent revises it. A changed JSON clears the earlier verdict.
"""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = ROOT / 'tools/action-library'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


def run(*cmd):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    return r.returncode, (r.stdout + r.stderr).strip()


def parse(raw):
    raw = raw.strip()
    m = re.search(r'```(?:json)?\s*(.*?)```', raw, re.S)
    return json.loads(m.group(1) if m else raw)


def server():
    if run('curl', '-s', '-o', '/dev/null', 'http://127.0.0.1:8767/')[0] != 0:
        subprocess.Popen(['python3', '-m', 'http.server', '8767', '--bind', '127.0.0.1'], cwd=ROOT,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        run('sleep', '1')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--part', required=True)
    ap.add_argument('--source-root', default='/Volumes/Developer/Projects/keep/action-library')
    args = ap.parse_args()
    work = ROOT / 'build/action-library/workbuddy' / args.part
    specs = HERE / 'specs' / args.part
    specs.mkdir(parents=True, exist_ok=True)
    reviews_file = HERE / 'reviews' / f'{args.part}.json'
    reviews = json.loads(reviews_file.read_text()) if reviews_file.exists() else {}
    server()
    rows, counts = [], {'missing': 0, 'invalid': 0, 'failed': 0, 'passed': 0, 'approved': 0, 'rejected': 0}
    for folder in sorted(work.glob('*/lane-*/[0-9]*_*')):
        if not (folder / 'input.md').exists():
            continue
        sid = re.search(r'sourceID：`(\w+)`', (folder / 'input.md').read_text()).group(1)
        lane = f'{folder.parent.parent.name}/{folder.parent.name}/{folder.name}'
        src = folder / f'{sid}.json'
        if not src.exists():
            counts['missing'] += 1
            rows.append((lane, sid, '未完成', ''))
            continue
        feedback = folder / '检查结果.md'
        try:
            spec = parse(src.read_text())
        except Exception as e:  # noqa: BLE001 - any parse failure is reported to the agent verbatim
            counts['invalid'] += 1
            feedback.write_text(f'# ✗ 未通过\n\nJSON 无法解析：{e}\n\n请输出严格合法的 JSON（双引号、无注释、无尾逗号）。\n')
            rows.append((lane, sid, '✗ JSON 无效', str(e)))
            continue
        text = json.dumps(spec, ensure_ascii=False, indent=2) + '\n'
        digest = hashlib.sha256(text.encode()).hexdigest()
        dest = specs / f'{sid}.json'
        verdict = reviews.get(sid, {})
        if verdict.get('digest') and verdict['digest'] != digest:
            verdict = {}
            reviews.pop(sid, None)
        unchanged = dest.exists() and dest.read_text() == text and (ROOT / 'build/action-library' / sid / 'comparison.jpg').exists()
        dest.write_text(text)
        code, out = run('node', 'tools/action-library/check.mjs', str(dest))
        problems = [l.strip() for l in out.splitlines() if l.strip().startswith(('error:', 'warn:'))]
        if code != 0:
            counts['failed'] += 1
            feedback.write_text('# ✗ 未通过自动检查\n\n请逐条修改后覆盖 JSON：\n\n' + '\n'.join(f'- {p}' for p in problems) + '\n')
            rows.append((lane, sid, '✗ 自动检查', '; '.join(problems)))
            dest.unlink()
            continue
        if not unchanged:  # Re-rendering every approved spec on each pass takes minutes; only changed specs need new sheets.
            run('node', 'tools/action-library/build.mjs', str(dest))
            run('python3', '-I', 'tools/action-library/frames.py', 'keyframes', sid, '--source-root', args.source_root, '--spec', str(dest))
            run('tools/action-library/render.sh', sid)
        warns = [p for p in problems if p.startswith('warn:')]
        if verdict.get('status') == 'rejected':
            counts['rejected'] += 1
            feedback.write_text(f'# ✗ 人工验收未通过\n\n{verdict.get("note", "")}\n\n请按以上意见修改后覆盖 JSON。\n')
            rows.append((lane, sid, '✗ 人工验收', verdict.get('note', '')))
        elif verdict.get('status') == 'approved':
            counts['approved'] += 1
            feedback.write_text('# ✓ 已通过（自动检查 + 人工验收）\n\n不要再修改这个动作。\n')
            rows.append((lane, sid, '✓ 已验收', ''))
        else:
            counts['passed'] += 1
            feedback.write_text('# ✓ 已通过自动检查，等待人工验收\n\n暂时不要修改。\n' + ''.join(f'\n- {w}' for w in warns))
            rows.append((lane, sid, '待验收', '; '.join(warns)))
            reviews.setdefault(sid, {})['digest'] = digest
    # Pending specs keep their digest so a later edit by the agent is noticed.
    for sid, v in reviews.items():
        if 'digest' not in v and (specs / f'{sid}.json').exists():
            v['digest'] = hashlib.sha256((specs / f'{sid}.json').read_bytes()).hexdigest()
    reviews_file.parent.mkdir(exist_ok=True)
    reviews_file.write_text(json.dumps(reviews, ensure_ascii=False, indent=1) + '\n')
    flags = [f'{sid}: {d}' for _, sid, c, d in rows if 'moves almost like' in d]
    summary = [f'# {args.part} 收集汇总', '', ' · '.join(f'{k} {v}' for k, v in counts.items()), '',
               '| 位置 | sourceID | 状态 | 说明 |', '|---|---|---|---|']
    summary += [f'| {a} | {b} | {c} | {d[:160]} |' for a, b, c, d in rows]
    if flags:
        summary += ['', '## 疑似雷同', ''] + [f'- {f}' for f in flags]
    (work / '汇总.md').write_text('\n'.join(summary) + '\n')
    print('\n'.join(summary[:3]))


if __name__ == '__main__':
    main()
