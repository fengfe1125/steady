#!/bin/zsh
# Comparison sheets for review: source keyframes 0,2,3,4 (top row) vs SVG detail panel, plus the mistake panel.
#   tools/action-library/render.sh <sourceID> [...]
# Needs a local server on the repo root:  python3 -m http.server 8767 --bind 127.0.0.1
set -euo pipefail
root=${0:A:h:h:h}
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for id in "$@"; do
  dir=$root/build/action-library/$id
  for panel in detail mistakes; do
    "$chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
      --window-size=800,800 --virtual-time-budget=3000 \
      --screenshot=$dir/svg-$panel.png "http://127.0.0.1:8767/build/action-library/$id/lesson.html#$panel" 2>/dev/null
  done
  ffmpeg -v error -y -i $dir/key-0.jpg -i $dir/key-2.jpg -i $dir/key-3.jpg -i $dir/key-4.jpg -i $dir/svg-detail.png -filter_complex \
    "[0]crop=iw*0.8:ih*0.45:iw*0.1:ih*0.3,scale=400:-2,pad=400:400:0:(oh-ih)/2:white[s0];[1]crop=iw*0.8:ih*0.45:iw*0.1:ih*0.3,scale=400:-2,pad=400:400:0:(oh-ih)/2:white[s1];\
[2]crop=iw*0.8:ih*0.45:iw*0.1:ih*0.3,scale=400:-2,pad=400:400:0:(oh-ih)/2:white[s2];[3]crop=iw*0.8:ih*0.45:iw*0.1:ih*0.3,scale=400:-2,pad=400:400:0:(oh-ih)/2:white[s3];\
[s0][s1][s2][s3]hstack=4[src];\
[4]split=4[a][b][c][d];[a]crop=400:400:0:0[p0];[b]crop=400:400:400:0[p1];[c]crop=400:400:0:400[p2];[d]crop=400:400:400:400[p3];\
[p0][p1][p2][p3]hstack=4[svg];[src][svg]vstack" -frames:v 1 $dir/comparison.jpg
  echo "$dir/comparison.jpg"
done
