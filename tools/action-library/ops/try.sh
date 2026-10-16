#!/bin/zsh
# try.sh <base.json> <name> <patch-json>  -> renders detail+mistakes panels
SC=${SC:-/tmp/action-library-ops}; mkdir -p $SC/variants
cd /Volumes/Developer/Projects/steady
f=$(python3 -I $(dirname $0)/variant.py $1 $2 $3 $SC/variants) || exit 1
node tools/action-library/build.mjs $f >/dev/null || exit 1
for p in detail mistakes; do "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=800,800 --virtual-time-budget=3000 --screenshot=$SC/variants/$2-$p.png "http://127.0.0.1:8767/build/action-library/$2/lesson.html#$p" 2>/dev/null; done
echo $SC/variants/$2-detail.png
