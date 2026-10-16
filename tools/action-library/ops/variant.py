import json,sys,copy
src,name,patch=sys.argv[1],sys.argv[2],json.loads(sys.argv[3])
s=json.load(open(src))
def merge(a,b):
    for k,v in b.items():
        if isinstance(v,dict) and isinstance(a.get(k),dict): merge(a[k],v)
        else: a[k]=v
merge(s,patch); s['sourceID']=name
out=f"{sys.argv[4]}/{name}.json"; json.dump(s,open(out,'w'),ensure_ascii=False); print(out)
