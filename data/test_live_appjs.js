// Download live app.js and find EVERY place that could crash
const https = require('https');
function get(url) {
  return new Promise((resolve,reject)=>{
    https.get(url,{timeout:15000},res=>{
      const c=[];
      res.on('data',d=>c.push(d));
      res.on('end',()=>resolve(Buffer.concat(c).toString('utf8')));
    }).on('error',reject).on('timeout',function(){this.destroy();reject(new Error('timeout'));});
  });
}
async function main(){
  const appjs = await get('https://shophere.in/app.js');
  console.log('Live app.js size:', appjs.length);
  
  // Find ALL emoji still in live file
  const matches = [];
  for(let i=0;i<appjs.length;i++){
    const cp = appjs.codePointAt(i);
    if(cp > 0xFFFF){ 
      matches.push({pos:i, cp:'U+'+cp.toString(16).toUpperCase(), ctx:JSON.stringify(appjs.substring(Math.max(0,i-15),i+15))});
      i++;
    }
  }
  console.log('Emoji in live app.js:', matches.length);
  matches.slice(0,20).forEach(m=>console.log(' ',m.pos, m.cp, m.ctx));
  
  // Also check for the 'use strict' issue at very top
  console.log('\nFirst 3 chars codes:', [...appjs.substring(0,3)].map(c=>c.charCodeAt(0)));
}
main().catch(e=>console.error('ERR:',e.message));
