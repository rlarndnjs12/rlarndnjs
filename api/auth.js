const crypto=require('node:crypto');const store=require('../lib/auth-store');const auth=require('../lib/auth');
const fail=(res,status,error)=>res.status(status).json({error});
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 try{
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return fail(res,405,'지원하지 않는 요청입니다.')}
  if(!store.ready())return fail(res,503,'로그인 서비스를 준비하고 있습니다. 잠시 후 다시 이용해 주세요.');
  if(req.method==='GET'){const s=await auth.session(req);return res.status(200).json({user:s?auth.publicUser(s.user):null})}
  if(!(req.headers['content-type']||'').startsWith('application/json'))return fail(res,415,'JSON 요청이 필요합니다.');
  const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)return fail(res,403,'요청을 확인할 수 없습니다.');
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const action=body.action;
  const ip=process.env.VERCEL?(req.headers['x-vercel-forwarded-for']||'unknown'):(req.socket?.remoteAddress||'local');
  if(!await store.limit(auth.hash(ip),40,900))return fail(res,429,'요청이 많습니다. 15분 후 다시 시도해 주세요.');
  if(action==='logout'){await store.remove('session:'+auth.hash(auth.token(req)));auth.cookie(res,'',0);return res.status(200).json({ok:true})}
  if(action==='profile'){
   const s=await auth.session(req);if(!s)return fail(res,401,'로그인이 필요합니다.');
   const nickname=typeof body.nickname==='string'?body.nickname.trim():'';
   if(nickname.length<2||nickname.length>20||!['male','female','other','undisclosed'].includes(body.gender)||!Number.isInteger(body.age)||body.age<1||body.age>120)return fail(res,400,'닉네임은 2~20자, 나이는 1~120세로 입력하고 성별을 선택해 주세요.');
   const before=structuredClone(s.user);s.user.profile={nickname,gender:body.gender,age:body.age};if(!await store.compareSet(s.key,before,s.user))return fail(res,409,'계정이 변경되었습니다. 다시 로그인해 주세요.');return res.status(200).json({user:auth.publicUser(s.user)})
  }
  if(action==='reset'){
   if(typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))return fail(res,400,'유효하지 않은 재설정 링크입니다.');
   if(typeof body.password!=='string'||body.password.length<8||body.password.length>128||body.password!==body.confirmPassword)return fail(res,400,'비밀번호는 8~128자이며 확인 값과 같아야 합니다.');
   const reset=await store.take('reset:'+auth.hash(body.token));if(!reset)return fail(res,400,'만료되었거나 이미 사용한 링크입니다. 다시 요청해 주세요.');
   const user=await store.get(reset.userKey);if(!user||user.version!==reset.version)return fail(res,400,'유효하지 않은 재설정 링크입니다.');
   const before=structuredClone(user);user.password=await auth.passwordHash(body.password);user.version=crypto.randomBytes(16).toString('hex');if(!await store.compareSet(reset.userKey,before,user))return fail(res,409,'계정이 변경되었습니다. 재설정을 다시 요청해 주세요.');auth.cookie(res,'',0);return res.status(200).json({ok:true})
  }
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))return fail(res,400,'올바른 이메일 주소를 입력해 주세요.');
  const key=auth.accountKey(email);
  if(action==='forgot'){
   if(!process.env.RESEND_API_KEY||!process.env.AUTH_FROM_EMAIL||!process.env.AUTH_PUBLIC_URL)return fail(res,503,'비밀번호 재설정 이메일 서비스를 준비하고 있습니다.');
   if(!await store.limit('reset:'+auth.hash(email),3,3600))return fail(res,429,'이메일 재설정 요청이 많습니다. 1시간 후 다시 시도해 주세요.');
   const user=await store.get(key);
   if(user){
    const raw=crypto.randomBytes(32).toString('hex');await store.set('reset:'+auth.hash(raw),{userKey:key,version:user.version},1800);
    const url=new URL('/reset-password.html',process.env.AUTH_PUBLIC_URL);url.hash=new URLSearchParams({token:raw}).toString();
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.AUTH_FROM_EMAIL,to:[email],subject:'Trip Mate 비밀번호 재설정',text:`아래 링크에서 비밀번호를 재설정하세요. 링크는 30분 동안 한 번만 사용할 수 있습니다.\n\n${url}\n\n요청하지 않았다면 무시해 주세요.`}),signal:AbortSignal.timeout(10000)});
    if(!response.ok){await store.remove('reset:'+auth.hash(raw));return fail(res,502,'이메일을 전송하지 못했습니다. 잠시 후 다시 시도해 주세요.')}
   }
   return res.status(200).json({message:'등록된 이메일이라면 재설정 링크를 보냈습니다. 받은편지함과 스팸함을 확인해 주세요.'})
  }
  if(!['signup','login'].includes(action))return fail(res,400,'올바른 작업을 선택해 주세요.');
  if(typeof body.password!=='string'||body.password.length<8||body.password.length>128)return fail(res,400,'비밀번호는 8~128자로 입력해 주세요.');
  if(!await store.limit('account:'+auth.hash(email),20,900))return fail(res,429,'시도가 많습니다. 15분 후 다시 로그인해 주세요.');
  if(action==='signup'){
   const name=typeof body.name==='string'?body.name.trim():'';if(!name||name.length>50||body.password!==body.confirmPassword)return fail(res,400,'이름을 입력하고 비밀번호 확인을 맞춰 주세요.');
   const user={name,email,password:await auth.passwordHash(body.password),version:crypto.randomBytes(16).toString('hex'),profile:null};
   if(!await store.set(key,user,0,true))return fail(res,409,'가입할 수 없는 이메일입니다. 로그인 또는 비밀번호 찾기를 이용해 주세요.');
   return res.status(201).json({ok:true})
  }
  const user=await store.get(key);
  // Run scrypt even for unknown accounts to reduce account timing differences.
  const valid=await auth.verify(body.password,user?.password||'00000000000000000000000000000000:'+ '00'.repeat(64));
  if(!user||!valid)return fail(res,401,'이메일 또는 비밀번호가 올바르지 않습니다.');
  const raw=crypto.randomBytes(32).toString('hex');await store.set('session:'+auth.hash(raw),{userKey:key,version:user.version},604800);auth.cookie(res,raw,604800);return res.status(200).json({user:auth.publicUser(user)})
 }catch{return fail(res,503,'서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')}
};
