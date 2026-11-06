const fs=require('node:fs'),path=require('node:path');
const shared=Boolean(process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN);
const file=path.join(process.env.AUTH_DATA_DIR||path.join(__dirname,'../.data'),'auth.json');
async function remote(args){const r=await fetch(process.env.UPSTASH_REDIS_REST_URL,{method:'POST',headers:{Authorization:'Bearer '+process.env.UPSTASH_REDIS_REST_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Storage unavailable');const d=await r.json();if(d.error)throw Error('Storage unavailable');return d.result;}
function local(fn){if(process.env.VERCEL)throw Error('Persistent auth storage required');fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});let data={};try{data=JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}for(const k of Object.keys(data))if(data[k].expires&&data[k].expires<Date.now())delete data[k];const result=fn(data);const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(data),{mode:0o600});fs.renameSync(temp,file);return result;}
const key=k=>'tripmate:auth:'+k;
module.exports={ready:()=>!process.env.VERCEL||shared,
 async get(k){if(shared){const v=await remote(['GET',key(k)]);return v?JSON.parse(v):null}return local(d=>d[k]?.value??null)},
 async set(k,v,ttl=0,nx=false){if(shared){const args=['SET',key(k),JSON.stringify(v)];if(ttl)args.push('EX',ttl);if(nx)args.push('NX');return await remote(args)==='OK'}return local(d=>{if(nx&&d[k])return false;d[k]={value:v,expires:ttl?Date.now()+ttl*1000:0};return true})},
 async take(k){if(shared){const v=await remote(['GETDEL',key(k)]);return v?JSON.parse(v):null}return local(d=>{const v=d[k]?.value??null;delete d[k];return v})},
 async compareSet(k,before,after){if(shared){const script="if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('SET',KEYS[1],ARGV[2]); return 1 else return 0 end";return await remote(['EVAL',script,1,key(k),JSON.stringify(before),JSON.stringify(after)])===1}return local(d=>{if(JSON.stringify(d[k]?.value)!==JSON.stringify(before))return false;d[k]={value:after,expires:0};return true})},
 async remove(k){if(shared)await remote(['DEL',key(k)]);else local(d=>delete d[k])},
 async limit(k,max,seconds){if(shared){const script="local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n";return await remote(['EVAL',script,1,key('rate:'+k),seconds])<=max}return local(d=>{const id='rate:'+k;const value=(d[id]?.value||0)+1;d[id]={value,expires:d[id]?.expires||Date.now()+seconds*1000};return value<=max})}
};
