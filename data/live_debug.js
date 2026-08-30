// Download live admin.html and simulate exactly what browser does
const https = require('https');
function get(url){return new Promise((r,j)=>{https.get(url,{timeout:20000},res=>{const c=[];res.on('data',d=>c.push(d));res.on('end',()=>r(Buffer.concat(c).toString('utf8')));}).on('error',j);});}

async function main(){
  // Get live admin.html 
  const html = await get('https://shophere.in/admin.html');
  const prods_raw = await get('https://shophere.in/api/products?limit=3');
  const cats_raw = await get('https://shophere.in/api/categories');
  
  const prods = JSON.parse(prods_raw);
  const prodList = prods.products || prods;
  const cats = JSON.parse(cats_raw);
  
  console.log('Products from API:', prodList.length);
  console.log('Categories from API:', cats);
  
  // Check for non-ASCII in admin.html
  let nonAscii = 0;
  for(let i=0;i<html.length;i++) if(html.charCodeAt(i)>127) nonAscii++;
  console.log('Non-ASCII in live admin.html:', nonAscii);
  
  // Extract renderProdTable
  const fnStart = html.indexOf('function renderProdTable(list)');
  const fnEnd = html.indexOf('\n// Save a single', fnStart);
  const fn = html.substring(fnStart, fnEnd);
  
  // Extract populateCatDropdown
  const pcStart = html.indexOf('function populateCatDropdown(');
  const pcEnd = html.indexOf('\n}</script>', pcStart) + 2;
  const pcFn = html.substring(pcStart, pcEnd);
  
  console.log('\n=== populateCatDropdown ===');
  console.log(pcFn.substring(0, 500));
  
  console.log('\n=== renderProdTable first 300 chars ===');
  console.log(fn.substring(0, 300));
  
  // Simulate the EXACT sequence in browser
  const vm = require('vm');
  let prodBodyContent = '';
  let dropdownContent = '';
  
  const ctx = vm.createContext({
    window: { allCats: cats },
    allCats: cats,
    allCustomCols: [],
    allProds: [],
    console: console,
    document: {
      getElementById: function(id) {
        if (id === 'prodBody') return {
          get innerHTML() { return prodBodyContent; },
          set innerHTML(v) { 
            console.log('prodBody SET, length=' + v.length + ', first100=' + v.substring(0,100));
            prodBodyContent = v;
          },
          get children() { return { length: prodBodyContent.length > 0 ? 1 : 0 }; }
        };
        if (id === 'prodSearch') return { value: '' };
        if (id === 'prodCatFilter') return {
          value: '',
          get onchange() { return null; },
          set onchange(v) {},
          set innerHTML(v) { 
            console.log('prodCatFilter SET, length=' + v.length);
            dropdownContent = v;
          }
        };
        return { style: {}, textContent: '', innerHTML: '' };
      },
      querySelector: function(s) {
        return { querySelectorAll: ()=>[], querySelector: ()=>null };
      },
      querySelectorAll: function() { return []; },
      createElement: function() { return { setAttribute:()=>{}, textContent:'' }; }
    },
    ccForTable: function() { return []; },
    toast: function(m) { console.log('TOAST:', m); }
  });
  
  try {
    vm.runInContext(fn, ctx);
    console.log('\nrenderProdTable defined OK');
    
    // Set allProds
    ctx.allProds = prodList;
    
    // Call renderProdTable
    vm.runInContext('renderProdTable(allProds)', ctx, {timeout: 3000});
    
    console.log('\nFINAL prodBody length:', prodBodyContent.length);
    if (prodBodyContent.length === 0) {
      console.log('PROBLEM: prodBody is STILL EMPTY after renderProdTable!');
    }
  } catch(e) {
    console.log('\nERROR:', e.message);
    console.log(e.stack.split('\n').slice(0,6).join('\n'));
  }
}
main().catch(e=>console.error('FATAL:',e.message));
