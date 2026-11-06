// Temporary, tab-scoped demo accounts. No account data is sent to a server.
(()=>{
 const ACCOUNT='tripmate_tab_account_v1',SESSION='tripmate_tab_session_v1';
 const normalize=value=>value.trim().normalize('NFKC').toLowerCase();
 function read(){try{const raw=sessionStorage.getItem(ACCOUNT);const account=raw?JSON.parse(raw):null;return account&&account.version===1&&typeof account.id==='string'&&typeof account.name==='string'&&typeof account.salt==='string'&&/^[a-f0-9]{64}$/.test(account.digest)?account:null}catch{return null}}
 function save(account){try{sessionStorage.setItem(ACCOUNT,JSON.stringify(account))}catch{throw Error('현재 브라우저에서 임시 저장을 사용할 수 없습니다. 탭의 저장 권한을 확인해 주세요.')}}
 function publicUser(account){return {name:account.name,email:account.email,profile:account.profile||null}}
 function session(){const account=read();try{return account&&sessionStorage.getItem(SESSION)===account.id?{user:publicUser(account)}:{user:null}}catch{return {user:null}}}
 async function derive(password,salt){if(!globalThis.crypto?.subtle)throw Error('안전한 HTTPS 주소에서 다시 접속해 주세요.');const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const result=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:Uint8Array.from(salt.match(/../g),x=>parseInt(x,16)),iterations:600000},key,256);return Array.from(new Uint8Array(result),x=>x.toString(16).padStart(2,'0')).join('')}
 function passwordValid(body){if(typeof body.password!=='string'||body.password.length<8||body.password.length>128)throw Error('비밀번호는 8~128자로 입력해 주세요.')}
 async function request(body){
  const account=read();
  if(body.action==='signup'){
   const name=typeof body.name==='string'?body.name.trim():'';const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
   if(!name||name.length>50)throw Error('이름을 1~50자로 입력해 주세요.');if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('올바른 이메일을 입력해 주세요.');passwordValid(body);if(body.password!==body.confirmPassword)throw Error('비밀번호가 일치하지 않습니다.');
   if(account)throw Error('이 탭에는 이미 가입 정보가 있습니다. 로그인하거나 비밀번호 찾기에서 임시 정보를 초기화해 주세요.');
   const salt=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
   const digest=await derive(body.password,salt);save({version:1,id:crypto.randomUUID(),name,email,salt,digest,profile:null});sessionStorage.removeItem(SESSION);return {ok:true};
  }
  if(body.action==='login'){
   passwordValid(body);const name=typeof body.name==='string'?body.name:'';
   const digest=await derive(body.password,account?.salt||'00'.repeat(16));
   if(!account||normalize(name)!==normalize(account.name)||digest!==account.digest)throw Error('이름 또는 비밀번호가 올바르지 않습니다. 이 탭에서 가입했는지 확인해 주세요.');
   sessionStorage.setItem(SESSION,account.id);return {user:publicUser(account)};
  }
  if(body.action==='logout'){sessionStorage.removeItem(SESSION);return {ok:true}}
  if(body.action==='profile'){
   if(!session().user)throw Error('로그인이 필요합니다.');const nickname=typeof body.nickname==='string'?body.nickname.trim():'';
   if(nickname.length<2||nickname.length>20||!['male','female','other','undisclosed'].includes(body.gender)||!Number.isInteger(body.age)||body.age<1||body.age>120)throw Error('닉네임은 2~20자, 나이는 1~120세로 입력하고 성별을 선택해 주세요.');
   account.profile={nickname,gender:body.gender,age:body.age};save(account);return {user:publicUser(account)};
  }
  throw Error('임시 가입은 이메일로 비밀번호를 재설정할 수 없습니다. 임시 정보를 초기화하고 다시 가입해 주세요.');
 }
 function clear(){for(const key of [ACCOUNT,SESSION,'tripmate','tripmate_signup','tripmate_reset'])sessionStorage.removeItem(key)}
 window.TripMateAuth={request,session,clear};
})();
