const pages = [
 {file:'index.html',name:'이동 방법',title:'여행의 시작, 어떻게 갈까요?',subtitle:'출발지에서 도착지까지, 나에게 맞는 이동 방법을 찾아보세요.',section:'이동 수단 살펴보기',cards:[['🚆','대중교통','기차, 버스, 지하철 등 대중교통 경로와 운행 정보를 지도에서 확인하세요.','대중교통'],['🚗','자동차','목적지까지의 도로 경로를 확인하고 드라이브를 준비하세요.','자동차'],['🚶','도보','가까운 거리라면 걸어서 이동하는 경로를 확인해 보세요.','도보']]},
 {file:'hotels.html',name:'호텔 추천',title:'여행 끝에 만나는 편안한 쉼',subtitle:'도착지 주변에서 여행 스타일에 맞는 숙소를 찾아보세요.',section:'어떤 숙소를 찾으세요?',cards:[['🏨','호텔','편리한 시설과 서비스를 갖춘 호텔을 도착지 주변에서 찾아보세요.','호텔'],['🌿','리조트','휴식이 중심인 여행이라면 여유롭게 머물 수 있는 리조트를 살펴보세요.','리조트'],['🛏️','게스트하우스','가볍게 머물기 좋은 게스트하우스와 지역 숙소를 찾아보세요.','게스트하우스']]},
 {file:'restaurants.html',name:'맛집 추천',title:'맛있는 순간도 여행이니까',subtitle:'도착지 주변의 맛집과 카페를 찾아 여행을 더 풍성하게 채워보세요.',section:'오늘은 어떤 맛이 끌리세요?',cards:[['🍚','현지 맛집','지역에서 즐길 수 있는 식당과 대표 메뉴를 찾아보세요.','맛집'],['☕','카페 & 디저트','잠시 쉬어 갈 카페와 달콤한 디저트 가게를 살펴보세요.','카페'],['🍜','가볍게 한 끼','패스트푸드 등 간편하게 식사할 수 있는 곳을 찾아보세요.','간편식']]}
];
const current=Number(document.body.dataset.page), page=pages[current];
let stored={};try{stored=JSON.parse(sessionStorage.getItem('tripmate')||'{}')}catch{}
const params=new URLSearchParams(location.search);
let origin=params.get('origin')??stored.origin??'', destination=params.get('destination')??stored.destination??'';
const app=document.querySelector('#app');
app.innerHTML=`<header><a class="brand" href="index.html">✈ Trip Mate<span>당신의 여행 메이트</span></a><nav aria-label="주요 메뉴">${pages.map((p,i)=>`<a data-page="${i}" href="${p.file}" ${i===current?'aria-current="page"':''}>${p.name}</a>`).join('')}</nav></header><main><section class="hero"><div class="eyebrow">YOUR NEXT JOURNEY</div><h1>${page.title}</h1><p>${page.subtitle}</p></section><div class="steps" aria-label="여행 준비 단계">${pages.map((p,i)=>`<a data-page="${i}" href="${p.file}" ${i===current?'aria-current="step"':''}>0${i+1} &nbsp; ${p.name}</a>`).join('')}</div><section class="panel"><form id="trip-form"><div class="form-grid"><label>출발지<input id="origin" name="origin" placeholder="예: 서울역" maxlength="200" ${current===0?'required':''}></label><label>도착지<input id="destination" name="destination" placeholder="예: 부산역" maxlength="200" required></label><button type="submit">${current===0?'이동 경로 찾기':'주변 검색하기'} ↗</button></div><p class="status" id="status" role="status" aria-live="polite"></p></form></section><div class="section-title"><h2>${page.section}</h2><p class="note">${current===0?'Google 지도로 경로 확인':'OpenStreetMap · 반경 5km 거리순'}</p></div><div class="cards">${page.cards.map((c,i)=>`<article class="card"><div class="icon" aria-hidden="true">${c[0]}</div><span class="tag">${current===0?'ROUTE GUIDE':'LOCAL DISCOVERY'}</span><h3>${c[1]}</h3><p>${c[2]}</p><button class="button secondary" data-search="${i}">${current===0?'경로 확인하기':'주변에서 찾아보기'} ↗</button></article>`).join('')}</div><p class="note">${current===0?'실제 소요 시간과 이용 가능한 이동 수단은 지도 서비스에서 확인해 주세요. 지역에 따라 경로 제공 범위가 다를 수 있습니다.':'OpenStreetMap에 등록된 반경 5km 주변 장소를 거리순으로 표시합니다. 평점·가격·예약 정보는 제공하지 않으며 지역에 따라 등록된 장소가 적을 수 있습니다.'}</p><div class="bottom">${current>0?`<a class="button secondary" data-page="${current-1}" href="${pages[current-1].file}">← ${pages[current-1].name}</a>`:'<span></span>'}${current<2?`<a class="button" data-page="${current+1}" href="${pages[current+1].file}">다음: ${pages[current+1].name} →</a>`:'<a class="button" data-page="0" href="index.html">새로운 여행 계획하기 ↗</a>'}</div></main><footer>Trip Mate · 설레는 시작부터 맛있는 마무리까지</footer>`;
const originInput=document.querySelector('#origin'),destinationInput=document.querySelector('#destination');
originInput.value=origin;destinationInput.value=destination;
function sync(){origin=originInput.value.trim();destination=destinationInput.value.trim();try{sessionStorage.setItem('tripmate',JSON.stringify({origin,destination}))}catch{} const query=new URLSearchParams({origin,destination});document.querySelectorAll('[data-page]').forEach(a=>a.href=pages[Number(a.dataset.page)].file+'?'+query.toString());}
function search(index){sync();const form=document.querySelector('form');if(!form.reportValidity())return;let url;if(current===0){const modes=['transit','driving','walking'];url='https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',origin,destination,travelmode:modes[index]});}if(current>0){recommend(index);return;}window.open(url,'_blank','noopener,noreferrer');document.querySelector('#status').textContent='지도 검색을 새 탭으로 열었습니다. 새 탭이 보이지 않으면 브라우저의 팝업 차단 설정을 확인해 주세요.';}
document.querySelector('#trip-form').addEventListener('submit',e=>{e.preventDefault();search(0)});
document.querySelectorAll('[data-search]').forEach(b=>b.addEventListener('click',()=>search(Number(b.dataset.search))));
originInput.addEventListener('input',sync);destinationInput.addEventListener('input',sync);sync();

let requestId=0;
const results=document.createElement('section');results.className='panel';results.hidden=true;results.setAttribute('aria-label','추천 결과');document.querySelector('.cards').after(results);
async function recommend(index){
 const id=++requestId,requestedDestination=destination;
 const category=(current===1?['hotel','resort','guesthouse']:['restaurant','cafe','snack'])[index];
 const status=document.querySelector('#status');
 status.textContent='추천 장소를 찾고 있습니다…';results.hidden=false;results.replaceChildren();results.setAttribute('aria-busy','true');
 try{
  const response=await fetch('/api/recommendations?'+new URLSearchParams({destination:requestedDestination,category}));
  const data=await response.json();if(id!==requestId)return;
  if(!response.ok)throw Error(data.error||'추천을 불러오지 못했습니다.');
  const title=document.createElement('h2');title.textContent=requestedDestination+' · '+page.cards[index][1];results.append(title);
  const attribution=document.createElement('p');const credit=document.createElement('a');credit.textContent='© OpenStreetMap contributors · ODbL';credit.href='https://www.openstreetmap.org/copyright';credit.target='_blank';credit.rel='noopener noreferrer';attribution.append(credit);results.append(attribution);const center=document.createElement('p');center.className='note';center.textContent='검색 기준: '+data.center.label+' · 반경 5km, 직선거리순';results.append(center);
  const grid=document.createElement('div');grid.className='cards';results.append(grid);
  for(const place of data.places){
   const card=document.createElement('article');card.className='card';
   const name=document.createElement('h3');name.textContent=place.name;
   const rating=document.createElement('p');rating.textContent=place.distance<1000?'도착지에서 '+place.distance+'m':'도착지에서 '+(place.distance/1000).toFixed(1)+'km';
   const address=document.createElement('p');address.textContent=place.address;card.append(name,rating,address);
   if(/^https:\/\//.test(place.url)){const link=document.createElement('a');link.className='button secondary';link.textContent='지도에서 자세히 보기 ↗';link.href=place.url;link.target='_blank';link.rel='noopener noreferrer';card.append(link);}
   for(const item of place.attributions||[]){const credit=document.createElement('p');credit.className='note';credit.textContent=item.provider||'';card.append(credit);}
   grid.append(card);
  }
  status.textContent=data.places.length?data.places.length+'개의 장소를 찾았습니다.':'검색 결과가 없습니다. 도착지를 더 구체적으로 입력해 주세요.';
 }catch(error){if(id===requestId){status.textContent=error.message;const message=document.createElement('p');message.textContent='추천을 불러오지 못했습니다. 도착지를 확인하고 다시 검색해 주세요.';results.replaceChildren(message);const fallback=document.createElement('a');fallback.className='button secondary';fallback.textContent='지도에서 주변 장소 찾기 ↗';fallback.href='https://www.openstreetmap.org/search?'+new URLSearchParams({query:requestedDestination+' '+page.cards[index][3]});fallback.target='_blank';fallback.rel='noopener noreferrer';results.append(fallback);}}
 finally{if(id===requestId)results.setAttribute('aria-busy','false');}
}
