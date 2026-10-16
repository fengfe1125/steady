#!/bin/zsh
# Check, build, extract keyframes and render comparison sheets for every spec of a part.
#   tools/action-library/review.sh chest
set -uo pipefail
root=${0:A:h:h:h}
part=$1
lib=${ACTION_LIBRARY:-/Volumes/Developer/Projects/keep/action-library}
cd $root
node tools/action-library/check.mjs --part $part
curl -s -o /dev/null http://127.0.0.1:8767/ || { python3 -m http.server 8767 --bind 127.0.0.1 >/dev/null 2>&1 & sleep 1; }
for spec in tools/action-library/specs/$part/*.json; do
  id=${spec:t:r}
  node tools/action-library/check.mjs $spec >/dev/null || continue
  node tools/action-library/build.mjs $spec >/dev/null &&
  python3 -I tools/action-library/frames.py keyframes $id --source-root $lib --spec $spec >/dev/null &&
  tools/action-library/render.sh $id
done
