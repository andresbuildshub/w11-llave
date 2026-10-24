# Builds the app's static data from REAL public sources (no personal data):
#  1) SEGIAGUA "Agua en tu colonia" API pull(s)  -> data/history/YYYY-MM-DD.json (raw, one per day)
#  2) Fiscal tandeo list (Uno TV transcription, ene-2024)
# Output: public/data/colonias.json (one row per colonia, latest pull + history counts + join bucket)
#         public/data/resumen.json (counts by alcaldía, join buckets, robust bound)
import json, re, glob, os, unicodedata, difflib, sys
ROOT=sys.argv[1] if len(sys.argv)>1 else '.'
H=sorted(glob.glob(os.path.join(ROOT,'data/history/*.json')))
assert H, 'no pulls'
pulls=[(os.path.basename(f)[:10], {r['id']:r for r in json.load(open(f))['rows']}) for f in H]
last_date, last = pulls[-1]
DAYS=['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO']
def tipo(r):
    h=(r.get('hours_of_service') or '').upper()
    if r.get('supply_zone')=='PIPAS': return 'pipas'
    if 'CONTINUO' in h: return 'continuo'
    if not h: return 'sin_horario'
    if any(d in h for d in DAYS): return 'ventana_dias'
    return 'ventana_diaria'
def horas(h):
    m=re.findall(r'(\d{1,2}):(\d{2}) ?([AP])M',(h or '').upper())
    if len(m)<2: return None
    t=[(int(a)%12+(12 if p=='P' else 0))*60+int(b) for a,b,p in m[:2]]
    d=(t[1]-t[0])%1440; return round((d or 1440)/60,1)
def norm(s):
    s=unicodedata.normalize('NFKD',s.upper()); s=''.join(c for c in s if not unicodedata.combining(c))
    s=re.sub(r'\bCOL\.?\s','',s); s=re.sub(r'\bAMPL\.?\s','AMPLIACION ',s)
    s=re.sub(r'\bU\.\s?H\.?\s','UNIDAD HABITACIONAL ',s); s=re.sub(r'[^\w\s()]',' ',s)
    return re.sub(r'\s+',' ',s).strip()
STRIP=r'\b(BARRIO|PUEBLO|UNIDAD HABITACIONAL|UNIDAD|AMPLIACION|SEGUNDA|PRIMERA|TERCERA|1A|2A|3A|1RA|2DA|3RA|SECCION|DE|LA|EL|LOS|LAS|ZU|U)\b'
core=lambda s: re.sub(r'\s+',' ',re.sub(STRIP,' ',re.sub(r'\(.*?\)',' ',norm(s)))).strip()
fis={}
for l in open(os.path.join(ROOT,'data/lista-fiscal-tandeo-unotv-2024.txt')):
    if l.startswith('#') or '|' not in l: continue
    a,c=l.strip().split('|',1); fis.setdefault(norm(a),[]).append(c)
rows=[]
for cid,r in last.items():
    alc=r['alcaldia']; na=norm(alc)
    hist=[p.get(cid) for _,p in pulls]
    atip=sum(1 for x in hist if x and x.get('is_atypical_condition'))
    G=fis.get(na,[]); n=norm(r['colonia'])
    gn=[norm(g) for g in G]
    if n in gn: join='exacto'
    elif any(difflib.SequenceMatcher(None,n,g).ratio()>=0.85 for g in gn): join='revision'
    else:
        c=core(r['colonia']); gc=[core(g) for g in G]+[core(m) for g in G for m in re.findall(r'\((.*?)\)',g)]
        join='posible' if any(c and g and (c in g or g in c or difflib.SequenceMatcher(None,c,g).ratio()>=0.75) for g in gc) else 'fuera'
    t=tipo(r)
    rows.append({'id':cid,'alc':alc,'col':r['colonia'],'cp':r.get('cp'),
        'lat':float(r['latitude']) if r.get('latitude') else None,'lon':float(r['longitude']) if r.get('longitude') else None,
        'horario':r.get('hours_of_service') or None,'fuente':r.get('supply_zone'),'atip':bool(r.get('is_atypical_condition')),
        'tipo':t,'horas':horas(r.get('hours_of_service')) if t=='ventana_diaria' else None,
        'dias_pull':len([x for x in hist if x]),'dias_atip':atip,'join':join})
# NOTE: "join" is computed for every colonia, but the app only DISPLAYS 'exacto' as a match;
# 'revision' is counted per alcaldía and shown as "en revisión manual (no mostradas)".
os.makedirs(os.path.join(ROOT,'public/data'),exist_ok=True)
json.dump({'fecha_pull':last_date,'pulls':[d for d,_ in pulls],'rows':rows},open(os.path.join(ROOT,'public/data/colonias.json'),'w'),ensure_ascii=False,separators=(',',':'))
from collections import Counter,defaultdict
res={'fecha_pull':last_date,'n_pulls':len(pulls),'total':len(rows),'por_tipo':Counter(r['tipo'] for r in rows),
     'atipicas':sum(r['atip'] for r in rows),'alcaldias':{}}
for alc in sorted(set(r['alc'] for r in rows)):
    R=[r for r in rows if r['alc']==alc]; f=fis.get(norm(alc),[])
    short=[r for r in R if r['tipo']=='ventana_diaria' and r['horas'] is not None and r['horas']<=8]
    res['alcaldias'][alc]={'n':len(R),'tipo':Counter(r['tipo'] for r in R),'atip':sum(r['atip'] for r in R),
        'lista_fiscal':len(f),'join':Counter(r['join'] for r in R),
        'ventana_le8':len(short),'ventana_le8_fuera':sum(1 for r in short if r['join']=='fuera')}
json.dump(res,open(os.path.join(ROOT,'public/data/resumen.json'),'w'),ensure_ascii=False,indent=1)
print(json.dumps({k:v for k,v in res['alcaldias'].items() if k in('IZTAPALAPA','GUSTAVO A. MADERO','TLALPAN')},ensure_ascii=False))
