const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const handler = require('./api/recommendations');
const files = new Set(['index.html','hotels.html','restaurants.html','assets/app.js','assets/style.css','assets/browser-auth.js','assets/auth.js','assets/session.js','login.html','signup.html','forgot-password.html','reset-password.html','profile.html']);
http.createServer(async (req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/recommendations') {
  req.query=Object.fromEntries(url.searchParams);
  res.status=code=>{res.statusCode=code;return res};
  res.json=data=>{res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data))};
  if(req.method==='POST'){try{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16384){res.statusCode=413;return res.end('Request too large')}}req.body=JSON.parse(raw||'{}')}catch{return res.status(400).json({error:'올바른 요청을 보내 주세요.'})}}
  return handler(req,res);
 }
 const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
 if(!files.has(file)){res.writeHead(404);return res.end('Not found')}
 try{const data=await fs.readFile(path.join(__dirname,file));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');res.end(data)}catch{res.writeHead(500);res.end('Unable to serve file')}
}).listen(Number(process.env.PORT)||3001,'127.0.0.1',()=>console.log('Trip Mate server ready'));
