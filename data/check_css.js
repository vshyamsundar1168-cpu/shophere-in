const https = require('https');
function get(url){return new Promise((res,rej)=>{https.get(url,{timeout:15000},r=>{const c=[];r.on('data',d=>c.push(d));r.on('end',()=>res(Buffer.concat(c).toString('utf8')));}).on('error',rej);});}
async function main(){
  const html = await get('https://shophere.in/');
  
  // Check homeSections div
  const hsIdx = html.indexOf('id="homeSections"');
  console.log('homeSections tag:\n', html.substring(hsIdx-5, hsIdx+120));
  
  // Check featuredSection
  const fsIdx = html.indexOf('id="featuredSection"');
  console.log('\nfeaturedSection:\n', html.substring(fsIdx-5, fsIdx+100));
  
  // Check catStrip
  const csIdx = html.indexOf('id="catStrip"');
  console.log('\ncatStrip:\n', html.substring(csIdx-5, csIdx+100));
  
  // Check the CSS - does it hide homeSections?
  const css = await get('https://shophere.in/style.css');
  
  // Find homeSections in CSS
  const hsCss = css.indexOf('homeSections');
  if(hsCss >= 0) console.log('\nhomeSections in CSS:\n', css.substring(hsCss-20, hsCss+100));
  else console.log('\nhomeSections: NOT in CSS');
  
  // Check if there's a display:none on the sections
  const hiddenIdx = html.indexOf('homeSections" style');
  if(hiddenIdx >= 0) console.log('\nhomeSections inline style:', html.substring(hiddenIdx, hiddenIdx+80));
  
  // Check featuredGrid
  const fgIdx = html.indexOf('id="featuredGrid"');
  console.log('\nfeaturedGrid tag:\n', html.substring(fgIdx-5, fgIdx+80));
  
  // Check if products section overlap issue - productsSection display
  const psIdx = html.indexOf('id="productsSection"');
  console.log('\nproductsSection tag:\n', html.substring(psIdx-5, psIdx+80));
}
main().catch(e=>console.error('ERR:',e.message));
