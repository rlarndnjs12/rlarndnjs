const url=process.env.UPSTASH_REDIS_REST_URL;
const token=process.env.UPSTASH_REDIS_REST_TOKEN;
const configured=Boolean(url&&token);
async function command(args){
 const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(3000)});
 if(!response.ok)throw new Error('Shared store unavailable');
 const data=await response.json();if(data.error)throw new Error('Shared store command failed');return data.result;
}
const hash=key=>require('node:crypto').createHash('sha256').update(key).digest('hex');
module.exports={configured,async get(key){const data=await command(['GET','tripmate:cache:'+hash(key)]);return data?JSON.parse(data):undefined},async set(key,value){await command(['SET','tripmate:cache:'+hash(key),JSON.stringify(value),'EX',86400])},async allow(service,ms){return await command(['SET','tripmate:limit:'+service,'1','PX',ms,'NX'])==='OK'}};
