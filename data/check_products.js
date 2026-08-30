const https = require('https');
function get(url){return new Promise((res,rej)=>{https.get(url,{timeout:15000},r=>{const c=[];r.on('data',d=>c.push(d));r.on('end',()=>res(Buffer.concat(c).toString('utf8')));}).on('error',rej);});}
async function main(){
  const raw = await get('https://shophere.in/api/products?limit=500');
  const data = JSON.parse(raw);
  const prods = data.products || data;
  console.log('Total products:', prods.length);
  
  const featured = prods.filter(p=>p.featured);
  const deals = prods.filter(p=>p.badge==='deal');
  const newProds = prods.filter(p=>p.badge==='new');
  const hot = prods.filter(p=>p.badge==='hot');
  const noBadge = prods.filter(p=>!p.badge && !p.featured);
  
  console.log('Featured:', featured.length);
  console.log('Deals (badge=deal):', deals.length);
  console.log('New (badge=new):', newProds.length);
  console.log('Hot:', hot.length);
  console.log('No badge/featured:', noBadge.length);
  
  // Show all unique badges
  const badges = [...new Set(prods.map(p=>p.badge||'none'))];
  console.log('All badge values:', badges);
  
  // Show first 3 products
  prods.slice(0,3).forEach(p=>console.log('Product:', p.id, p.name.substring(0,30), 'badge:', p.badge, 'featured:', p.featured));
}
main().catch(e=>console.error('ERR:',e.message));
