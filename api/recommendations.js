const shared=require('../lib/shared-store');
// Public OSM services: explicit searches only; bounded caches and per-process throttling.
const filters = {hotel:'["tourism"="hotel"]',resort:'["leisure"="resort"]',guesthouse:'["tourism"="guest_house"]',restaurant:'["amenity"="restaurant"]',cafe:'["amenity"="cafe"]',snack:'["amenity"="fast_food"]'};
const cache=new Map(), pending=new Map();
const nextAllowed={};
const headers={'User-Agent':'TripMate/1.0 (https://github.com/rlarndnjs12/rlarndnjs)','Accept':'application/json','Accept-Language':'ko,en'};
class ServiceError extends Error { constructor(status,message){super(message);this.status=status} }
function remember(key,value){if(cache.size>=200)cache.delete(cache.keys().next().value);cache.set(key,{value,expires:Date.now()+86400000});}
async function cached(key,load){if(shared.configured){const value=await shared.get(key);if(value!==undefined)return value;}const item=cache.get(key);if(item?.expires>Date.now())return item.value;if(pending.has(key))return pending.get(key);const task=load().then(async value=>{if(shared.configured)await shared.set(key,value);remember(key,value);return value}).finally(()=>pending.delete(key));pending.set(key,task);return task;}
async function request(service,url,options={}){
 // Do not queue bursts against public servers. Caller can retry manually.
 if(shared.configured&&!await shared.allow(service,service==='geocode'?1100:2000))throw new ServiceError(429,'검색 요청이 많습니다. 잠시 후 다시 검색해 주세요.');
 const now=Date.now();if(now<(nextAllowed[service]||0))throw new ServiceError(429,'검색 요청이 많습니다. 잠시 후 다시 검색해 주세요.');
 nextAllowed[service]=now+(service==='geocode'?1100:2000);
 const response=await fetch(url,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new ServiceError(response.status===429?429:502,'무료 지도 서비스가 혼잡합니다. 잠시 후 다시 검색해 주세요.');
 return response.json();
}
function distance(a,b){const rad=x=>x*Math.PI/180;const s=Math.sin(rad(b.lat-a.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lon-a.lon)/2)**2;return Math.round(6371000*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s)));}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET 요청만 지원합니다.'})}
 const destination=typeof req.query.destination==='string'?req.query.destination.trim():'';
 const category=req.query.category;
 if(!destination||destination.length>200||!Object.hasOwn(filters,category))return res.status(400).json({error:'도착지와 올바른 추천 카테고리가 필요합니다.'});
 if(process.env.VERCEL&&!shared.configured)return res.status(503).json({error:'주변 추천 서비스를 준비하고 있습니다. 아래 지도 검색을 이용해 주세요.'});
 try{
  const center=await cached('geo:'+destination.toLowerCase(),async()=>{
   const data=await request('geocode','https://nominatim.openstreetmap.org/search?'+new URLSearchParams({q:destination,format:'jsonv2',limit:'1'}));
   if(!Array.isArray(data)||!data.length)throw new ServiceError(404,'도착지를 찾지 못했습니다. 도시명이나 상세 주소를 함께 입력해 주세요.');
   const lat=Number(data[0].lat),lon=Number(data[0].lon);
   if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw new Error('Invalid coordinates');
   return {lat,lon,label:data[0].display_name};
  });
  const places=await cached(`places:${center.lat},${center.lon}:${category}`,async()=>{
   const query=`[out:json][timeout:15];nwr(around:5000,${center.lat},${center.lon})${filters[category]};out center tags;`;
   const data=await request('places','https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:query}).toString()});
   if(!Array.isArray(data.elements)||data.remark)throw new Error('Incomplete response');
   const unique=new Map();
   for(const element of data.elements){
    const t=element.tags||{},lat=element.lat??element.center?.lat,lon=element.lon??element.center?.lon;
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||!(t['name:ko']||t.name))continue;
    const name=t['name:ko']||t.name,meters=distance(center,{lat,lon});
    const place={id:element.type+'/'+element.id,name,address:t['addr:full']||[t['addr:city'],t['addr:street'],t['addr:housenumber']].filter(Boolean).join(' ')||'등록된 주소 없음',distance:meters,url:`https://www.openstreetmap.org/${element.type}/${element.id}`};
    const key=name+':'+lat.toFixed(3)+','+lon.toFixed(3);if(!unique.has(key)||meters<unique.get(key).distance)unique.set(key,place);
   }
   return [...unique.values()].sort((a,b)=>a.distance-b.distance).slice(0,12);
  });
  return res.status(200).json({places,center,radius:5000,provider:'OpenStreetMap',attributionUrl:'https://www.openstreetmap.org/copyright'});
 }catch(error){if(error.status===429)res.setHeader('Retry-After','3');return res.status(error.status||502).json({error:error.status?error.message:'무료 지도 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'});}
};
