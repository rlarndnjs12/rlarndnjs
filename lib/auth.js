const crypto=require('node:crypto');const {promisify}=require('node:util');const scrypt=promisify(crypto.scrypt);const store=require('./auth-store');
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const accountKey=email=>'user:'+hash(email);
async function passwordHash(password){const salt=crypto.randomBytes(16).toString('hex');const value=await scrypt(password,salt,64);return salt+':'+value.toString('hex')}
async function verify(password,encoded){const [salt,value]=encoded.split(':');const candidate=await scrypt(password,salt,64);const expected=Buffer.from(value,'hex');return expected.length===candidate.length&&crypto.timingSafeEqual(expected,candidate)}
function token(req){return (req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('tripmate_session='))?.slice(17)||''}
async function session(req){const raw=token(req);if(!/^[a-f0-9]{64}$/.test(raw))return null;const s=await store.get('session:'+hash(raw));if(!s)return null;const user=await store.get(s.userKey);return user&&user.version===s.version?{user,key:s.userKey}:null}
function cookie(res,value,age){res.setHeader('Set-Cookie',`tripmate_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${process.env.VERCEL?'; Secure':''}`)}
function publicUser(user){return {name:user.name,email:user.email,profile:user.profile||null}}
module.exports={hash,accountKey,passwordHash,verify,token,session,cookie,publicUser};
