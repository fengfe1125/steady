"""Wait until lane JSONs change (new or modified) and stay quiet for `settle` seconds, or until timeout; print what changed."""
import os, sys, time, json, pathlib
root = pathlib.Path('/Volumes/Developer/Projects/steady/build/action-library/workbuddy/chest')
state = pathlib.Path(sys.argv[1]); settle = int(sys.argv[2]); timeout = int(sys.argv[3])
def snap():
    out = {}
    for p in root.glob('*/lane-*/[0-9]*_*/*.json'):
        try: out[str(p)] = p.stat().st_mtime
        except OSError: pass
    return out
old = json.loads(state.read_text()) if state.exists() else snap()
start = time.time(); changed_at = None
while time.time() - start < timeout:
    cur = snap()
    diff = [k for k in cur if old.get(k) != cur[k]]
    if diff:
        if changed_at is None: changed_at = time.time()
        if time.time() - changed_at >= settle:
            state.write_text(json.dumps(cur))
            print(f'{len(diff)} changed'); [print(' ', k.split('chest/')[1]) for k in sorted(diff)]
            sys.exit(0)
    time.sleep(20)
state.write_text(json.dumps(snap())); print('timeout, no change'); 
