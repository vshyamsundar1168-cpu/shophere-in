const https = require('https');
function get(url){return new Promise((res,rej)=>{https.get(url,{timeout:15000},r=>{const c=[];r.on('data',d=>c.push(d));r.on('end',()=>res(Buffer.concat(c).toString('utf8')));}).on('error',rej);});}
async function main(){
  const html = await get('https://shophere.in/');
  
  // Get the sort select area
  const sortIdx = html.indexOf('sortSelect');
  console.log('SORT SELECT area:\n', html.substring(sortIdx-20, sortIdx+300));
  
  // Get the filterCat nav links - all of them
  const navStart = html.indexOf('id="mainNav"');
  const navEnd = html.indexOf('</nav>', navStart);
  console.log('\nFULL NAV:\n', html.substring(navStart, navEnd+6));
  
  // Check if filterCat is defined correctly in app.js
  const appjs = await get('https://shophere.in/app.js');
  const fcIdx = appjs.indexOf('function filterCat(');
  console.log('\nfilterCat function (live):\n', appjs.substring(fcIdx, fcIdx+200));
  
  const spIdx = appjs.indexOf('function showProducts(');
  console.log('\nshowProducts function (live):\n', appjs.substring(spIdx, spIdx+150));
}
main().catch(e=>console.error('ERR:',e.message));
