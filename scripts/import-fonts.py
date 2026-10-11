"""Bundle the original UI fonts for offline use (SIL Open Font License)."""
from pathlib import Path
from io import BytesIO
from urllib.request import urlopen
from fontTools.ttLib import TTFont
from fontTools import subset
ROOT=Path(__file__).resolve().parents[1]
BASE='https://raw.githubusercontent.com/google/fonts/main/ofl/'
for family,source,outputs,label in [('dmsans','DMSans%5Bopsz,wght%5D.ttf',['sans-regular.woff','sans-bold.woff'],'Repclub Sans'),('barlowcondensed','BarlowCondensed-Bold.ttf',['display.woff'],'Repclub Display')]:
 with urlopen(BASE+family+'/'+source,timeout=30) as r:font=TTFont(BytesIO(r.read()))
 options=subset.Options();s=subset.Subsetter(options=options);s.populate(unicodes=list(range(32,384))+[0x2013,0x2014,0x2018,0x2019,0x201c,0x201d,0x2022,0x2026]);s.subset(font)
 for record in font['name'].names:
  if record.nameID in [1,4,6,16]:
   name=label.replace(' ','') if record.nameID==6 else label
   record.string=name.encode(record.getEncoding(),errors='replace')
 font.flavor='woff'
 for output in outputs:font.save(ROOT/'dist/fonts'/output)
 with urlopen(BASE+family+'/OFL.txt',timeout=30) as r:(ROOT/'dist/fonts'/('OFL-'+family+'.txt')).write_bytes(r.read())
 print('Bundled',family,flush=True)
