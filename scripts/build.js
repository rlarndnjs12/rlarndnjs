const fs=require('node:fs');
fs.mkdirSync('public/assets',{recursive:true});
for(const file of ['index.html','hotels.html','restaurants.html','assets/map-links.js','assets/app.js','assets/style.css','assets/browser-auth.js','assets/auth.js','assets/session.js','login.html','signup.html','forgot-password.html','reset-password.html','profile.html'])fs.copyFileSync(file,'public/'+file);
console.log('Built static pages in public/');
