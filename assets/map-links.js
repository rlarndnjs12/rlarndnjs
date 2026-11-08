(function(root){
 const modes=['transit','driving','walking'];
 const keywords=[['호텔','리조트','게스트하우스'],['음식점','카페','패스트푸드']];
 function google(page,index,origin,destination){if(page===0&&index===3)return 'https://www.google.com/maps/search/?'+new URLSearchParams({api:'1',query:'항공편 '+origin.trim()+' '+destination.trim()});if(page===0)return 'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',origin:origin.trim(),destination:destination.trim(),travelmode:modes[index]||modes[0]});return 'https://www.google.com/maps/search/?'+new URLSearchParams({api:'1',query:destination.trim()+' 주변 '+keywords[page-1][index]});}
 const api={google,domestic:(origin,destination)=>'https://map.naver.com/p/search/'+encodeURIComponent(origin.trim()+' '+destination.trim())};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.TripMateMaps=api;
})(globalThis);
