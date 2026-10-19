"""Extract review frames from one Keep action video. Read-only on the source library; needs ffmpeg.

  python3 -I tools/action-library/frames.py overview <sourceID> --source-root <action-library>
      12 evenly spaced frames -> build/action-library/<id>/overview/ (for choosing one repetition)
  python3 -I tools/action-library/frames.py keyframes <sourceID> --source-root <action-library> --spec <spec.json>
      the six spec.times frames -> build/action-library/<id>/key-<i>.jpg (for comparison sheets)
"""
import argparse
import hashlib
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'build/action-library'


def action_dir(source_root, source_id):
    hits = list((source_root / 'actions').glob(source_id + '_*'))
    if len(hits) != 1:
        raise SystemExit(f'No unique action folder for {source_id}')
    return hits[0]


def probe(video):
    data = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
                                               'format=duration:stream=width,height', '-of', 'json', str(video)]))
    stream = next(s for s in data['streams'] if 'width' in s)
    return float(data['format']['duration']), stream['width'] * stream['height']


def main_video(folder):
    # The highest-resolution demo is the clearest; equal-length alternates are the same take re-encoded.
    videos = sorted(folder.glob('*.mp4'), key=lambda v: probe(v)[1], reverse=True)
    if not videos:
        raise SystemExit(f'No video in {folder}')
    return videos[0]


def grab(video, t, dest, size=512):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', str(video), '-frames:v', '1',
                    '-vf', f'scale={size}:{size}:force_original_aspect_ratio=decrease', '-q:v', '3', str(dest)],
                   check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('mode', choices=['overview', 'keyframes'])
    ap.add_argument('source_id')
    ap.add_argument('--source-root', type=pathlib.Path, required=True)
    ap.add_argument('--spec', type=pathlib.Path)
    ap.add_argument('--count', type=int, default=12)
    args = ap.parse_args()

    folder = action_dir(args.source_root, args.source_id)
    video = main_video(folder)
    duration, _ = probe(video)
    out = OUT / args.source_id
    out.mkdir(parents=True, exist_ok=True)
    info = {'sourceID': args.source_id, 'folder': folder.name, 'video': video.name,
            'sha256': hashlib.sha256(video.read_bytes()).hexdigest(), 'duration': round(duration, 2)}

    if args.mode == 'overview':
        (out / 'overview').mkdir(exist_ok=True)
        times = [round(duration * (i + 0.5) / args.count, 2) for i in range(args.count)]
        for i, t in enumerate(times):
            grab(video, t, out / 'overview' / f'{i:02d}_{t:.2f}s.jpg', 384)
        info['overviewSeconds'] = times
    else:
        spec = json.loads(args.spec.read_text())
        for i, t in enumerate(spec['times']):
            if not 0 <= t <= duration:
                raise SystemExit(f'time {t} outside video (0–{duration:.2f}s)')
            grab(video, t, out / f'key-{i}.jpg')
        info['keyframeSeconds'] = spec['times']
    (out / 'source.json').write_text(json.dumps(info, ensure_ascii=False, indent=1))
    print(json.dumps(info, ensure_ascii=False))


if __name__ == '__main__':
    main()
