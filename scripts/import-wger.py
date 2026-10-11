"""Build-time importer. It never receives or uploads personal workout data."""
import json, urllib.request, concurrent.futures, html, re, time, argparse, tempfile
from html.parser import HTMLParser
from pathlib import Path
from io import BytesIO
from PIL import Image, ImageOps
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description='Import a local, attributed exercise dataset snapshot.')
parser.add_argument('--source-dir',type=Path,help='Use previously downloaded wger API JSON files.')
args=parser.parse_args()
temporary=tempfile.TemporaryDirectory() if args.source_dir is None else None
SOURCE=args.source_dir or Path(temporary.name)
if args.source_dir is None:
 for name,endpoint in [('wger-licenses','license'),('wger-exerciseinfo','exerciseinfo')]:
  with urllib.request.urlopen('https://wger.de/api/v2/'+endpoint+'/?limit=1000',timeout=60) as response:
   payload=json.load(response)
  if payload.get('next'):raise RuntimeError('Pagination required; fetch every page before importing.')
  (SOURCE/(name+'.json')).write_text(json.dumps(payload))
licenses={x['id']:x for x in json.loads((SOURCE/'wger-licenses.json').read_text())['results']}
raw=json.loads((SOURCE/'wger-exerciseinfo.json').read_text())['results']
class PlainText(HTMLParser):
 def __init__(self):super().__init__();self.parts=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ['script','style']:self.skip+=1
  if tag in ['p','li','br','div','h1','h2','h3','h4']:self.parts.append('\n')
 def handle_endtag(self,tag):
  if tag in ['script','style']:self.skip=max(0,self.skip-1)
  if tag in ['p','li','div']:self.parts.append('\n')
 def handle_data(self,text):
  if not self.skip:self.parts.append(text)
def plain(value):
 p=PlainText();p.feed(value or '');return [re.sub(r'\s+',' ',t).strip() for t in ''.join(p.parts).split('\n') if t.strip()]
assets={};catalog=[]
for entry in raw:
 translation=next((t for t in entry['translations'] if t['language']==2),None)
 if not translation:continue
 tips=plain(translation['description'])
 if sum(map(len,tips))<20:continue
 name=translation['name'].strip();equipment=[x['name'] for x in entry['equipment']];category=entry['category']['name']
 body=any(x['id'] in [6,7] for x in entry['equipment']) or bool(re.search(r'push.?up|pull.?up|chin.?up|body.?weight|burpee|crunch|sit.?up|jumping jack',name,re.I))
 loaded=any(x['id'] in [1,2,3,5,10,12] for x in entry['equipment']) or bool(re.search(r'weighted|barbell|dumbbell|kettlebell|cable|machine',name,re.I))
 timed=category=='Cardio' or bool(re.search(r'^plank$|^front plank$|^side plank$|isometric|\bhold\b',name,re.I))
 mode='time' if timed else 'reps' if body and not loaded else 'weight'
 image_list=[]
 for i in entry['images']:
  if i.get('is_ai_generated'):continue
  license=licenses[i['license']]
  if i['license'] not in [1,2,3,4]:continue
  asset=f'exercise-images/{i["id"]}.webp'
  assets[i['id']]={'image':i,'path':ROOT/'dist'/asset}
  image_list.append({'src':asset,'author':i.get('license_author') or ', '.join(i.get('author_history',[])) or 'wger contributors','license':license['short_name'],'licenseUrl':license['url'],'sourceUrl':i.get('license_object_url') or i['image'],'authorUrl':i.get('license_author_url') or '', 'changes':'Resized and converted to WebP.'})
 license=entry['license']
 group='Lower body' if category in ['Legs','Calves'] else 'Core' if category=='Abs' else 'Cardio' if category=='Cardio' else 'Upper body'
 catalog.append({'id':'wger_'+str(entry['id']),'name':name,'group':group,'bodyPart':category,'equipment':', '.join('Bodyweight' if 'bodyweight' in x else x for x in equipment) or 'Not specified','muscles':[x.get('name_en') or x['name'] for x in entry['muscles']], 'secondaryMuscles':[x.get('name_en') or x['name'] for x in entry['muscles_secondary']], 'mode':mode,'base':0 if mode!='weight' else 20,'reps':30 if mode=='time' else 10,'tips':tips,'images':image_list,'sourceId':entry['id'],'sourceUrl':f'https://wger.de/en/exercise/{entry["id"]}/view/','sourceAuthor':translation.get('license_author') or entry.get('license_author') or ', '.join(entry.get('author_history',[])) or 'wger contributors','license':license['short_name'],'licenseUrl':license['url'],'snapshotDate':time.strftime('%Y-%m-%d')})
def download(asset):
 image=asset['image'];target=asset['path']
 if target.exists():
  try:
   with Image.open(target) as im:im.verify()
   return True,image['id'],target.stat().st_size
  except Exception:target.unlink()
 for attempt in range(3):
  try:
   request=urllib.request.Request(image['image'],headers={'User-Agent':'Repclub local exercise snapshot/1.0'})
   with urllib.request.urlopen(request,timeout=25) as response:content=response.read()
   im=Image.open(BytesIO(content));im.seek(0);im=ImageOps.exif_transpose(im);im.thumbnail((600,600))
   if im.mode not in ['RGB','RGBA']:im=im.convert('RGBA')
   target.parent.mkdir(parents=True,exist_ok=True);im.save(target,format='WEBP',quality=82,method=4)
   return True,image['id'],target.stat().st_size
  except Exception as e:
   if attempt==2:return False,image['id'],str(e)
failed=[];total=0
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 for index,(ok,id,size) in enumerate(pool.map(download,assets.values()),1):
  if ok:total+=size
  else:failed.append(id)
  if index%50==0:print(f'Images: {index}/{len(assets)}; {total/1024/1024:.1f} MB',flush=True)
for e in catalog:e['images']=[i for i in e['images'] if (ROOT/'dist'/i['src']).exists()]
payload={'source':'wger community exercise database','sourceUrl':'https://wger.de/','snapshotDate':time.strftime('%Y-%m-%d'),'exercises':catalog}
(ROOT/'dist'/'exercise-data.js').write_text('window.REPCLUB_CATALOG='+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';\n')
(ROOT/'dist'/'exercise-sources.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2))
print(json.dumps({'exercises':len(catalog),'illustrated':sum(bool(e['images']) for e in catalog),'images':len(assets)-len(failed),'imageMB':round(total/1024/1024,1),'failed':failed}),flush=True)
