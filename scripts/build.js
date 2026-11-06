const fs=require('node:fs');
fs.mkdirSync('public/assets',{recursive:true});
for(const file of ['index.html','hotels.html','restaurants.html','assets/app.js','assets/style.css'])fs.copyFileSync(file,'public/'+file);
console.log('Built static pages in public/');
