const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
test('account lifecycle: signup, login, profile, reset, session revocation and storage protection',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tripmate-auth-'));process.env.AUTH_DATA_DIR=temp;delete process.env.VERCEL;delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;
 const handler=require('../api/auth');let cookie='';
 async function request(body,method='POST',origin='http://localhost'){const res={headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(data){this.data=data;return this}};await handler({method,headers:{host:'localhost',origin,'content-type':'application/json',cookie},body,socket:{remoteAddress:'test'}},res);if(res.headers['Set-Cookie'])cookie=res.headers['Set-Cookie'].split(';')[0];return res;}
 try{
  const signup={action:'signup',name:'홍길동',email:'test@example.com',password:'secret123',confirmPassword:'secret123'};
  assert.equal((await request({...signup,password:'short',confirmPassword:'short'})).code,400);
  assert.equal((await request({...signup,confirmPassword:'different'})).code,400);
  assert.equal((await request(signup)).code,201);
  assert.equal((await request(signup)).code,409);
  const saved=fs.readFileSync(path.join(temp,'auth.json'),'utf8');assert.ok(!saved.includes('secret123'));
  assert.equal((await request({},'GET')).data.user,null);
  assert.equal((await request({action:'login',email:signup.email,password:'wrongpass'})).code,401);
  const login=await request({action:'login',email:signup.email,password:signup.password});assert.equal(login.code,200);assert.match(login.headers['Set-Cookie'],/HttpOnly; SameSite=Lax/);assert.equal(login.data.user.profile,null);assert.ok(!login.data.user.password);
  const oldCookie=cookie;
  assert.equal((await request({action:'profile',nickname:'여행자',gender:'female',age:0})).code,400);
  assert.equal((await request({action:'profile',nickname:'여행자',gender:'female',age:25})).code,200);
  assert.equal((await request({},'GET')).data.user.profile.nickname,'여행자');
  assert.equal((await request({action:'logout'},'POST','https://evil.example')).code,403);
  delete process.env.RESEND_API_KEY;assert.equal((await request({action:'forgot',email:signup.email})).code,503);
  process.env.RESEND_API_KEY='test-only';process.env.AUTH_FROM_EMAIL='test@example.com';process.env.AUTH_PUBLIC_URL='https://trip.example';let resetToken='';
  const originalFetch=global.fetch;global.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');const email=JSON.parse(options.body);const link=email.text.match(/https:\/\/\S+/)[0];resetToken=new URLSearchParams(new URL(link).hash.slice(1)).get('token');return {ok:true}};
  const forgot=await request({action:'forgot',email:signup.email});assert.equal(forgot.code,200);assert.ok(resetToken);assert.ok(!JSON.stringify(forgot.data).includes(resetToken));global.fetch=originalFetch;
  assert.equal((await request({action:'reset',token:resetToken,password:'newsecret123',confirmPassword:'newsecret123'})).code,200);
  cookie=oldCookie;assert.equal((await request({},'GET')).data.user,null);
  assert.equal((await request({action:'reset',token:resetToken,password:'othersecret',confirmPassword:'othersecret'})).code,400);
  assert.equal((await request({action:'login',email:signup.email,password:'secret123'})).code,401);
  assert.equal((await request({action:'login',email:signup.email,password:'newsecret123'})).code,200);
  assert.equal((await request({action:'logout'})).code,200);assert.equal((await request({},'GET')).data.user,null);
  process.env.VERCEL='1';assert.equal((await request({},'GET')).code,503);delete process.env.VERCEL;
 }finally{fs.rmSync(temp,{recursive:true,force:true});delete process.env.AUTH_DATA_DIR;}
});
