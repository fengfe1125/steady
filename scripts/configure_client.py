#!/usr/bin/env python3
"""Copy ONLY public configuration to the app. Never source the private file as shell code."""
from pathlib import Path
import plistlib
import sys
from urllib.parse import urlparse
ROOT = Path(__file__).resolve().parents[1]
def read_env():
    path = ROOT / '.env.local'
    if not path.exists():
        raise SystemExit('Missing .env.local. Copy .env.example and fill required values.')
    values = {}
    for line in path.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith('#'): continue
        name, sep, value = line.partition('=')
        if sep: values[name.strip()] = value.strip().strip('"').strip("'")
    return values

def configure(values):
    url = values.get('SUPABASE_URL', '')
    key = values.get('SUPABASE_PUBLISHABLE_KEY', '')
    if urlparse(url).scheme != 'https' or not urlparse(url).hostname or not key.startswith('sb_publishable_'):
        raise SystemExit('Client configuration needs HTTPS SUPABASE_URL and sb_publishable_ key. No privileged keys accepted.')
    destination = ROOT / 'Steady' / 'CloudConfig.plist'
    destination.write_bytes(plistlib.dumps({'SUPABASE_URL': url, 'SUPABASE_PUBLISHABLE_KEY': key}))
    print('Generated Steady/CloudConfig.plist containing public configuration only.')
if __name__ == '__main__': configure(read_env())
