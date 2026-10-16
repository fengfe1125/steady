#!/usr/bin/env python3
"""Read-only source verification and evidence extraction. Requires ffmpeg and Pillow.
Run with the bundled Python; never writes into the source action library.
"""
import argparse, pathlib, json, hashlib, subprocess, io
from PIL import Image, ImageDraw
root=pathlib.Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--source-root',type=pathlib.Path,required=True);p.add_argument('--only');args=p.parse_args()
out=root/'docs/verification/video-svg-phase1';videos=out/'.cache/videos';videos.mkdir(parents=True,exist_ok=True)
for dossier in sorted(out.glob('*/dossier.json')):
 d=json.loads(dossier.read_text())
 if args.only and d['key'] not in args.only.split(','):continue
 video=args.source_root/d['sourceVideo']
 if hashlib.sha256(video.read_bytes()).hexdigest()!=d['sha256']:raise ValueError('Source hash differs: '+d['key'])
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(video)]))
 d['duration']=float(probe['format']['duration']);d['streams']=probe['streams'];dossier.write_text(json.dumps(d,ensure_ascii=False,indent=2))
 canvas=Image.new('RGB',(1200,860),'#f4f5f0');draw=ImageDraw.Draw(canvas)
 for i,t in enumerate(d['keyframeSeconds']):
  raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(video),'-frames:v','1','-f','image2pipe','-vcodec','png','-'])
  (dossier.parent/f'frame-{i}.png').write_bytes(raw);im=Image.open(io.BytesIO(raw));w,h=im.size;im=im.crop((w*.1,h*.05,w*.9,h*.95));im.thumbnail((390,390));x=i%3*400;y=i//3*430;canvas.paste(im,(x+(400-im.width)//2,y+30));draw.text((x+12,y+10),f'{i+1} | source {t:.2f} s',fill='black')
 canvas.save(out/(d['key']+'-keyframes.jpg'))
 dest=videos/(d['key']+'.mp4')
 if not dest.exists():subprocess.run(['ffmpeg','-v','error','-n','-i',str(video),'-an','-vf','scale=640:-2','-c:v','libx264','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(dest)],check=True)
print('Source hashes, six timestamped frames per lesson, and silent review copies ready.')
