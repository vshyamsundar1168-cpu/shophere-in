'use strict';
// ── State ─────────────────────────────────────────────────────────────────────
let allProducts=[], allCategories=[], allBanners=[], storeSettings={};
let cart=JSON.parse(localStorage.getItem('sh_cart')||'[]');
let wishlist=JSON.parse(localStorage.getItem('sh_wish')||'[]');
let myOrders=JSON.parse(localStorage.getItem('sh_orders')||'[]');
let currentCat='all', currentBadge='', currentSort='', currentQ='', currentMin=0, currentMax=Infinity, currentRating=0;
let page=1; const PAGE=12;
let heroIdx=0, heroTimer=null;
let selectedPayment='cod';
const CAT_ICONS={'Electronics':'📱','Fashion':'👗','Kitchen':'🍳','Sports':'⚽','Beauty':'💄','Books':'📚','Toys':'🧸','Home':'🏠','Kids':'🧒','Women':'👩','Men':'👨','default':'🛍️'};

// ── Utility ───────────────────────────────────────────────────────────────────
function toast(msg,dur=3000){
  const w=document.getElementById('toastWrap'),el=document.createElement('div');
  el.className='toast';el.textContent=msg;w.appendChild(el);
  setTimeout(()=>el.classList.add('show'),10);
  setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),300);},dur);
}
function closeOverlay(id){const el=document.getElementById(id);if(el)el.classList.remove('open');}
function openOverlay(id){const el=document.getElementById(id);if(el)el.classList.add('open');}

// ── Auth ──────────────────────────────────────────────────────────────────────
let currentUser=JSON.parse(localStorage.getItem('sh_user')||'null');

function updateAuthUI(){
  const u=currentUser;
  const ab=document.getElementById('authBtn'), uc=document.getElementById('userChip');
  if(ab) ab.style.display=u?'none':'block';
  if(uc) uc.style.display=u?'flex':'none';
  const un=document.getElementById('userName');
  if(un&&u) un.textContent=u.name||u.username||'User';
}

function openLogin(){openOverlay('loginOverlay');}
function closeLogin(){
  closeOverlay('loginOverlay');
  const e1=document.getElementById('loginErr'), e2=document.getElementById('regErr');
  if(e1) e1.style.display='none';
  if(e2) e2.style.display='none';
}
function switchAuthTab(tab,el){
  document.querySelectorAll('.login-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('loginForm').style.display=tab==='login'?'block':'none';
  document.getElementById('registerForm').style.display=tab==='register'?'block':'none';
  const fp=document.getElementById('forgotForm');
  if(fp) fp.style.display='none';
}

// #7 Forgot Password
function showForgot(){
  document.getElementById('loginForm').style.display='none';
  document.getElementById('registerForm').style.display='none';
  document.getElementById('forgotForm').style.display='block';
  document.querySelectorAll('.login-tab').forEach(t=>t.classList.remove('active'));
}
function doForgot(){
  const u=document.getElementById('f_user').value.trim();
  if(!u){document.getElementById('forgotMsg').textContent='Please enter your registered email/phone.';return;}
  const users=JSON.parse(localStorage.getItem('sh_users')||'[]');
  const found=users.find(x=>x.username===u);
  document.getElementById('forgotMsg').style.color=found?'var(--g)':'var(--rd)';
  document.getElementById('forgotMsg').textContent=found?`Your password is: ${found.password}`:'No account found with this email/phone.';
}

// #8 Password show/hide
function togglePassVis(inputId,btn){
  const inp=document.getElementById(inputId);
  if(!inp) return;
  inp.type=inp.type==='password'?'text':'password';
  btn.textContent=inp.type==='password'?'👁️':'🙈';
}

function doLogin(){
  const u=document.getElementById('l_user').value.trim(), p=document.getElementById('l_pass').value;
  if(!u||!p){showLoginErr('Please enter username and password');return;}
  // Check admin credentials first via API
  fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})})
    .then(r=>r.json())
    .then(data=>{
      if(data.success && data.isAdmin){
        // Admin login → redirect to admin panel
        closeLogin();
        toast('Admin login successful! Redirecting…');
        setTimeout(()=>{ window.location.href='/admin.html'; },800);
      } else if(data.success){
        // Normal user API login success
        currentUser={name:u,username:u};
        localStorage.setItem('sh_user',JSON.stringify(currentUser));
        closeLogin(); updateAuthUI(); toast(`Welcome back, ${u}! 👋`);
      } else {
        // Try local user store
        const users=JSON.parse(localStorage.getItem('sh_users')||'[]');
        const found=users.find(x=>x.username===u&&x.password===p);
        if(!found){showLoginErr('Invalid username or password');return;}
        currentUser=found; localStorage.setItem('sh_user',JSON.stringify(found));
        closeLogin(); updateAuthUI(); toast(`Welcome back, ${found.name||found.username}! 👋`);
      }
    })
    .catch(()=>{
      // Offline fallback — check local users
      const users=JSON.parse(localStorage.getItem('sh_users')||'[]');
      const found=users.find(x=>x.username===u&&x.password===p);
      if(!found){showLoginErr('Invalid username or password');return;}
      currentUser=found; localStorage.setItem('sh_user',JSON.stringify(found));
      closeLogin(); updateAuthUI(); toast(`Welcome back, ${found.name||found.username}! 👋`);
    });
}
function doRegister(){
  const name=document.getElementById('r_name').value.trim(), u=document.getElementById('r_user').value.trim(), p=document.getElementById('r_pass').value;
  if(!name||!u||!p){showRegErr('Please fill all fields');return;}
  if(p.length<6){showRegErr('Password must be at least 6 characters');return;}
  const users=JSON.parse(localStorage.getItem('sh_users')||'[]');
  if(users.find(x=>x.username===u)){showRegErr('This email/phone is already registered');return;}
  const newUser={name,username:u,password:p};
  users.push(newUser); localStorage.setItem('sh_users',JSON.stringify(users));
  currentUser=newUser; localStorage.setItem('sh_user',JSON.stringify(newUser));
  closeLogin(); updateAuthUI(); toast(`Account created! Welcome, ${name} 🎉`);
}
function showLoginErr(m){const el=document.getElementById('loginErr');el.textContent=m;el.style.display='block';}
function showRegErr(m){const el=document.getElementById('regErr');el.textContent=m;el.style.display='block';}
function logout(){
  currentUser=null;
  localStorage.removeItem('sh_user');
  updateAuthUI();
  const um=document.getElementById('userMenu'); if(um) um.style.display='none';
  toast('Logged out successfully');
}
function toggleUserMenu(){
  const m=document.getElementById('userMenu');
  if(m) m.style.display=m.style.display==='none'||!m.style.display?'block':'none';
}
document.addEventListener('click',e=>{
  if(!e.target.closest('#userChip')){
    const m=document.getElementById('userMenu'); if(m) m.style.display='none';
  }
});

// ── Settings ──────────────────────────────────────────────────────────────────
async function loadSettings(){
  try{
    const s=await fetch('/api/settings').then(r=>r.json());
    storeSettings=s;
    // #21 Store name + logo in header
    const logoText=document.getElementById('logoText');
    const logoImg=document.getElementById('headerLogo');
    if(s.storeName){
      document.title=s.storeName;
      if(logoText){
        const nm=s.storeName;
        const mid=Math.floor(nm.length/2);
        logoText.innerHTML=`<span style="color:var(--p)">${nm.slice(0,mid)}</span><span>${nm.slice(mid)}</span>`;
      }
    }
    if(s.logo&&s.logo.trim()){
      if(logoImg){logoImg.src=s.logo;logoImg.style.display='block';}
      // Keep text too — don't hide
    }
    if(s.primaryColor) document.documentElement.style.setProperty('--p',s.primaryColor);
    // Build dynamic CSS block combining all settings
    let dynCSS = '';
    // Legacy area-wise text colors
    const hasColors = s.colorBody || s.colorHeading || s.colorLink || s.colorProdName;
    if(hasColors){
      const bc  = s.colorBody         || '#1e293b';
      const hc  = s.colorHeading      || '#1e293b';
      const lc  = s.colorLink         || s.primaryColor || '#f97316';
      const pc  = s.colorProdName     || '#1e293b';
      const ppc = s.colorProdPrice    || '#1e293b';
      const pbc = s.colorProdBrand    || '#64748b';
      const ftc = s.colorFooterText   || '#94a3b8';
      const fhc = s.colorFooterHead   || '#ffffff';
      const nc  = s.colorNavText      || '#94a3b8';
      const atc = s.colorAnnoText     || '#ffffff';
      const abg = s.colorAnnoBg       || '#1e293b';
      const btc = s.bannerTextColor   || '#ffffff';
      dynCSS += `body{color:${bc}}h1,h2,h3,h4,h5,h6{color:${hc}}.pc-name{color:${pc}}.pc-price .cur{color:${ppc}}.pc-brand{color:${pbc}}a{color:${lc}}.footer-col ul li a{color:${ftc}}.footer-col h5{color:${fhc}}.footer-brand p{color:${ftc}}.nav-inner a{color:${nc}}.nav-inner a.active,.nav-inner a:hover{color:#fff}.top-bar{background:${abg};color:${atc}}.marquee-bar{background:${abg};color:${atc}}.hero-slide h1,.hero-slide p{color:${btc}}`;
    }
    // VC — Color Theme
    if(s.colorBg)       { dynCSS+=`:root{--bg:${s.colorBg}}body{background:${s.colorBg}}`; }
    if(s.colorBtnCart)  { dynCSS+=`.btn-cart{background:${s.colorBtnCart}}`; }
    if(s.colorBtnBuy)   { dynCSS+=`.btn-buy{background:${s.colorBtnBuy}}`; }
    if(s.colorNavBg)    { dynCSS+=`.main-nav{background:${s.colorNavBg}}`; }
    if(s.colorFooterBg) { dynCSS+=`footer{background:${s.colorFooterBg}}`; }
    // VC — Product card
    if(s.prodCardBg)     { dynCSS+=`.product-card{background:${s.prodCardBg}}`; }
    if(s.prodCardRadius) { dynCSS+=`.product-card{border-radius:${s.prodCardRadius}px}`; }
    if(s.badgeNewBg)     { dynCSS+=`.pc-badge.new{background:${s.badgeNewBg}}`; }
    if(s.badgeDealBg)    { dynCSS+=`.pc-badge.deal{background:${s.badgeDealBg}}`; }
    if(s.badgeHotBg)     { dynCSS+=`.pc-badge.hot{background:${s.badgeHotBg}}`; }
    if(s.prodNameSize)   { dynCSS+=`.pc-name{font-size:${s.prodNameSize}px}`; }
    if(s.prodPriceSize)  { dynCSS+=`.pc-price .cur{font-size:${s.prodPriceSize}px}`; }
    if(s.prodImgHeight && parseInt(s.prodImgHeight) > 0){ dynCSS+=`.pc-img{height:${s.prodImgHeight}px;aspect-ratio:unset}`; }
    // VC — Typography per section
    const VC_SEC_MAP = {
      heading:         'h1,h2,h3,h4,h5,h6',
      body:            'body',
      productName:     '.pc-name',
      productPrice:    '.pc-price .cur',
      productBrand:    '.pc-brand',
      navigation:      '.nav-inner a',
      footer:          '.footer-col',
      announcementBar: '.top-bar,.marquee-bar',
    };
    const usedFonts = new Set();
    Object.entries(VC_SEC_MAP).forEach(([key, sel]) => {
      const font = s['font_'+key], sz = s['fontSize_'+key], fw = s['fontWeight_'+key], col = s['textColor_'+key];
      let rule = '';
      if(font)  { rule += `font-family:'${font}',sans-serif;`; usedFonts.add(font); }
      if(sz)    { rule += `font-size:${sz}px;`; }
      if(fw)    { rule += `font-weight:${fw};`; }
      if(col)   { rule += `color:${col};`; }
      if(rule)  { dynCSS += `${sel}{${rule}}`; }
    });
    // Inject Google Fonts for any fonts found
    usedFonts.forEach(font => {
      const id = 'gf_sf_'+font.replace(/\s+/g,'_');
      if(!document.getElementById(id)){
        const link = document.createElement('link');
        link.id=id; link.rel='stylesheet';
        link.href=`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;700&display=swap`;
        link.onerror=()=>{ /* CDN failed — font-family rule still applied with fallback */ };
        document.head.appendChild(link);
      }
    });
    // Apply combined dynamic style
    let dynStyle = document.getElementById('dynamic-colors');
    if(!dynStyle){ dynStyle=document.createElement('style'); dynStyle.id='dynamic-colors'; document.head.appendChild(dynStyle); }
    if(dynCSS) dynStyle.textContent = dynCSS;
    // Banner size
    if(s.bannerSizeVal && s.bannerSizeUnit){
      const slider = document.getElementById('heroSlider');
      if(slider) slider.style.height = s.bannerSizeVal + s.bannerSizeUnit;
    }
    // #20 Free shipping threshold
    const thresh=parseFloat(s.freeShippingThreshold)||0;
    const bar=document.getElementById('topBar');
    if(bar){
      if(thresh>0) bar.innerHTML=`🎉 Free shipping on orders above <strong>₹${thresh.toLocaleString('en-IN')}</strong>${s.announcementBar?' | '+s.announcementBar:''}`;
      else if(s.announcementBar) bar.textContent=s.announcementBar;
    }
    // Scrolling text
    if(s.scrollingText){
      const parts=s.scrollingText.split('|').map(x=>x.trim()).filter(Boolean);
      const inner=document.getElementById('marqueeText');
      if(inner) inner.innerHTML=[...parts,...parts].map(t=>`<span>${t}</span>`).join('');
    }
    const ft=document.getElementById('footerText'); if(ft&&s.footerText) ft.textContent=s.footerText;
    // #15 copyright 2026
    const fc=document.getElementById('footerCopy');
    if(fc) fc.textContent=`© 2026 ${s.storeName||'ShopHere.in'} — All rights reserved`;
    if(s.contactEmail){const e1=document.getElementById('cEmail'),e2=document.getElementById('popEmail');if(e1)e1.textContent=s.contactEmail;if(e2)e2.textContent=s.contactEmail;}
    if(s.contactPhone){const p1=document.getElementById('cPhone'),p2=document.getElementById('popPhone');if(p1)p1.textContent=s.contactPhone;if(p2)p2.textContent=s.contactPhone;}
    if(s.contactAddress){const a1=document.getElementById('cAddr'),a2=document.getElementById('popAddr');if(a1)a1.textContent=s.contactAddress;if(a2)a2.textContent=s.contactAddress;}
    const tc=document.getElementById('termsContent'); if(tc) tc.textContent=s.termsAndConditions||'Terms and conditions will be updated soon.';
    const pc=document.getElementById('privacyContent'); if(pc) pc.textContent=s.privacyPolicy||'Privacy policy will be updated soon.';
    const rc=document.getElementById('returnContent'); if(rc) rc.textContent=s.returnPolicy||'Return policy will be updated soon.';
    const faq=document.getElementById('faqContent'); if(faq) buildFAQ(s.faqText||'');
  }catch(e){console.warn('Settings load failed',e.message);}
}

function buildFAQ(text){
  const faq=document.getElementById('faqContent');
  if(!faq) return;
  if(!text.trim()){faq.innerHTML='<p style="color:var(--m)">No FAQs available yet.</p>';return;}
  const blocks=text.split('\n\n').filter(Boolean);
  faq.innerHTML=blocks.map(b=>{
    const lines=b.split('\n');
    const q=lines[0]||''; const a=lines.slice(1).join(' ')||'';
    return `<div style="border:1px solid var(--b);border-radius:10px;margin-bottom:10px;overflow:hidden">
      <div style="padding:14px 18px;font-weight:700;font-size:.88rem;cursor:pointer;background:#f8fafc" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">❓ ${q}</div>
      <div style="padding:14px 18px;font-size:.85rem;color:var(--m);display:none">${a||q}</div>
    </div>`;
  }).join('');
}

// ── Categories ────────────────────────────────────────────────────────────────
async function loadCategories(){
  try{
    allCategories=await fetch('/api/categories').then(r=>r.json());
    // Nav bar
    const nav=document.getElementById('mainNav');
    if(nav) nav.innerHTML=
      `<a onclick="goHome();setActive(this)" class="active">🏠 Home</a>`+
      `<a onclick="filterCat('all');setActive(this)">🛍️ All</a>`+
      `<a onclick="filterBadge('deal');setActive(this)">🔥 Deals</a>`+
      `<a onclick="filterBadge('new');setActive(this)">✨ New</a>`+
      allCategories.map(c=>`<a onclick="filterCat('${c.replace(/'/g,"\\'")}');setActive(this)">${CAT_ICONS[c]||'🛍️'} ${c}</a>`).join('');
    // Category cards
    const cg=document.getElementById('catGrid');
    if(cg) cg.innerHTML=allCategories.map(c=>`
      <div class="cat-card" onclick="filterCat('${c.replace(/'/g,"\\'")}')">
        <div class="cat-icon">${CAT_ICONS[c]||'🛍️'}</div><span>${c}</span>
      </div>`).join('');
    // Search dropdown
    const sel=document.getElementById('searchCat');
    if(sel) sel.innerHTML='<option value="all">All</option>'+allCategories.map(c=>`<option value="${c}">${c}</option>`).join('');
    // Filter sidebar
    const fc=document.getElementById('filterCats');
    if(fc) fc.innerHTML=`<label><input type="checkbox" value="all" checked onchange="catCkChange(this)"> All Categories</label>`+
      allCategories.map(c=>`<label><input type="checkbox" value="${c}" onchange="catCkChange(this)"> ${c}</label>`).join('');
    // Footer shop links #18
    const fl=document.getElementById('footerCatLinks');
    if(fl) fl.innerHTML=allCategories.slice(0,6).map(c=>`<li><a onclick="filterCat('${c.replace(/'/g,"\\'")}');window.scrollTo(0,0)" style="cursor:pointer">${c}</a></li>`).join('');
  }catch(e){console.warn('Categories failed',e.message);}
}

// ── Banners ───────────────────────────────────────────────────────────────────
async function loadBanners(){
  try{
    let bans=await fetch('/api/banners').then(r=>r.json());
    allBanners=bans.filter(b=>b.active!==false);
    if(!allBanners.length) allBanners=[{bgGradient:'linear-gradient(135deg,#1e293b,#f97316)',headline:'Welcome to ShopHere.in 🛍️',subtitle:"India's favourite store",ctaLabel:'Shop Now'}];
    const slider=document.getElementById('heroSlider');
    const prev=slider.querySelector('.hero-prev'), next=slider.querySelector('.hero-next'), dots=document.getElementById('heroDots');
    slider.innerHTML=allBanners.map((b,i)=>{
      const fit  = (storeSettings&&storeSettings.bannerFit)  || 'cover';
      const posV = (storeSettings&&storeSettings.bannerPos)  || 'center';
      const hSz  = ({'xlarge':'3rem','large':'2.4rem','medium':'1.8rem','small':'1.4rem'})[(storeSettings&&storeSettings.bannerTextSize)] || '2.4rem';
      const tClr = (storeSettings&&storeSettings.bannerTextColor) || '#ffffff';
      const alignMap = {'center':'center','flex-start':'flex-start','flex-end':'flex-end','left':'flex-start','right':'flex-end'};
      const textMap  = {'center':'center','flex-start':'left','flex-end':'right','left':'left','right':'right'};
      const aItems = alignMap[posV] || 'center';
      const tAlign = textMap[posV]  || 'center';
      // Build background correctly — do NOT duplicate background-size
      let bgStyle;
      if(b.bgImage && b.bgImage.trim()){
        bgStyle = `background-image:url('${b.bgImage}');background-size:${fit};background-position:center;background-repeat:no-repeat`;
      } else {
        bgStyle = `background:${b.bgGradient||'linear-gradient(135deg,#1e293b 0%,#f97316 100%)'}`;
      }
      return `<div style="${bgStyle};position:absolute;inset:0;display:flex;align-items:${aItems};justify-content:center;flex-direction:column;text-align:${tAlign};color:${tClr};padding:32px 48px;opacity:${i===0?1:0};transition:opacity .6s;pointer-events:${i===0?'all':'none'}">
        <h1 style="font-size:${hSz};font-weight:800;margin-bottom:10px;text-shadow:0 2px 8px rgba(0,0,0,.4)">${b.headline||''}</h1>
        <p style="font-size:1rem;margin-bottom:22px;opacity:.88">${b.subtitle||''}</p>
        <button onclick="filterCat('all')" class="btn btn-outline">${b.ctaLabel||'Shop Now'} →</button>
      </div>`;
    }).join('');
    slider.appendChild(prev); slider.appendChild(next);
    dots.innerHTML=allBanners.map((_,i)=>`<button onclick="heroGo(${i})" style="width:10px;height:10px;border-radius:50%;background:${i===0?'#fff':'rgba(255,255,255,.45)'};border:none;cursor:pointer;transition:all .3s;padding:0"></button>`).join('');
    slider.appendChild(dots);
    if(allBanners.length>1){clearInterval(heroTimer);heroTimer=setInterval(heroNext,5000);}
  }catch(e){}
}
function heroGo(i){
  heroIdx=i;
  document.querySelectorAll('#heroSlider>div').forEach((s,j)=>{s.style.opacity=j===i?1:0;s.style.pointerEvents=j===i?'all':'none';});
  document.querySelectorAll('#heroDots button').forEach((d,j)=>{d.style.background=j===i?'#fff':'rgba(255,255,255,.45)';});
}
function heroNext(){if(allBanners.length>1)heroGo((heroIdx+1)%allBanners.length);}
function heroPrev(){if(allBanners.length>1)heroGo((heroIdx-1+allBanners.length)%allBanners.length);}

// ── Products ──────────────────────────────────────────────────────────────────
async function loadProducts(){
  try{
    const res=await fetch('/api/products?limit=500').then(r=>r.json());
    allProducts=res.products||res;
    renderHomeGrids();
  }catch(e){console.warn('Products failed',e.message);}
}

// ── Search #9 — searches ALL fields including description, tags ────────────────
function liveSearch(){
  const q=document.getElementById('searchInput').value.trim().toLowerCase();
  if(!q){closeSearch();return;}
  const cat=document.getElementById('searchCat').value;
  // #9 broad search: name, brand, category, description
  let list=allProducts.filter(p=>{
    const hay=(p.name+' '+p.brand+' '+p.category+' '+(p.description||'')).toLowerCase();
    return hay.includes(q);
  });
  if(cat&&cat!=='all') list=list.filter(p=>p.category===cat);
  const panel=document.getElementById('searchPanel');
  const title=document.getElementById('searchTitle');
  const grid=document.getElementById('searchGrid');
  title.textContent=`Results for "${q}" (${list.length})`;
  grid.innerHTML=list.length?list.slice(0,20).map(p=>productCard(p)).join(''):`<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--m)">No products found for "<b>${q}</b>"</div>`;
  panel.style.display='block';
}
function doSearch(){
  const q=document.getElementById('searchInput').value.trim();
  if(!q) return;
  currentQ=q.toLowerCase(); currentCat=document.getElementById('searchCat').value||'all'; currentBadge=''; page=1;
  document.getElementById('sectionTitle').textContent=`Search: "${q}"`;
  closeSearch(); showProducts(); renderProducts();
}
function closeSearch(){const p=document.getElementById('searchPanel');if(p)p.style.display='none';}

// ── Product Card ──────────────────────────────────────────────────────────────
function productCard(p){
  const disc=p.originalPrice>p.price?Math.round((1-p.price/p.originalPrice)*100):0;
  const stars='★'.repeat(Math.round(p.rating||0))+'☆'.repeat(5-Math.round(p.rating||0));
  const inW=wishlist.includes(p.id);
  const imgHtml=p.images&&p.images.length
    ?`<img src="${p.images[0].url}" alt="${p.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`
    :`<span style="font-size:4rem">📦</span>`;
  return `<div class="product-card">
    ${p.badge?`<span class="pc-badge ${p.badge}">${p.badge}</span>`:''}
    <button class="pc-wish${inW?' active':''}" onclick="toggleWish(${p.id},event)">${inW?'❤️':'🤍'}</button>
    <div class="pc-img" onclick="openProduct(${p.id})">${imgHtml}</div>
    <div class="pc-body">
      <div class="pc-brand">${p.brand}</div>
      <div class="pc-name" onclick="openProduct(${p.id})">${p.name}</div>
      <div class="pc-stars">${stars} <span>(${p.reviewCount||0})</span></div>
      <div class="pc-price">
        <span class="cur">₹${p.price.toLocaleString('en-IN')}</span>
        ${disc?`<span class="orig">₹${p.originalPrice.toLocaleString('en-IN')}</span><span class="off">${disc}% off</span>`:''}
      </div>
      <div class="pc-btns">
        <button class="btn-cart" onclick="addToCart(${p.id})">Add to Cart</button>
        <button class="btn-buy" onclick="buyNow(${p.id})">Buy Now</button>
      </div>
    </div>
  </div>`;
}

function renderHomeGrids(){
  const featured=allProducts.filter(p=>p.featured).slice(0,8);
  const deals=allProducts.filter(p=>p.badge==='deal').slice(0,8);
  const newA=allProducts.filter(p=>p.badge==='new').slice(0,8);
  const fill=(arr,id,sec)=>{
    const el=document.getElementById(id); if(!el)return;
    el.innerHTML=arr.length?arr.map(p=>productCard(p)).join(''):'<p style="color:var(--m);padding:20px">None available</p>';
    const secEl=document.getElementById(sec); if(secEl) secEl.style.display=arr.length?'block':'none';
  };
  fill(featured,'featuredGrid','featuredSection');
  fill(deals,'dealsGrid','dealsSection');
  fill(newA,'newGrid','newSection');
}

function getFiltered(){
  let list=[...allProducts];
  if(currentCat&&currentCat!=='all') list=list.filter(p=>p.category===currentCat);
  if(currentBadge) list=list.filter(p=>p.badge===currentBadge);
  // #9 broad search
  if(currentQ){
    const q=currentQ;
    list=list.filter(p=>(p.name+' '+p.brand+' '+p.category+' '+(p.description||'')).toLowerCase().includes(q));
  }
  if(currentMin>0) list=list.filter(p=>p.price>=currentMin);
  if(currentMax<Infinity) list=list.filter(p=>p.price<=currentMax);
  if(currentRating>0) list=list.filter(p=>p.rating>=currentRating);
  if(currentSort==='price_asc') list.sort((a,b)=>a.price-b.price);
  else if(currentSort==='price_desc') list.sort((a,b)=>b.price-a.price);
  else if(currentSort==='rating') list.sort((a,b)=>b.rating-a.rating);
  return list;
}
function renderProducts(){
  const list=getFiltered(), start=(page-1)*PAGE, slice=list.slice(start,start+PAGE);
  const rc=document.getElementById('resultCount'); if(rc) rc.textContent=`Showing ${list.length} product${list.length!==1?'s':''}`;
  const pg=document.getElementById('productsGrid');
  pg.innerHTML=slice.length?slice.map(p=>productCard(p)).join(''):'<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--m)"><div style="font-size:3rem">🔍</div><p>No products found</p></div>';
  const pag=document.getElementById('pagination');
  const pages=Math.ceil(list.length/PAGE);
  pag.innerHTML=pages<=1?'':[...Array(pages)].map((_,i)=>`<button class="page-btn${i+1===page?' active':''}" onclick="goPage(${i+1})">${i+1}</button>`).join('');
}
function goPage(p2){page=p2;renderProducts();window.scrollTo({top:document.getElementById('productsSection').offsetTop-80,behavior:'smooth'});}
function showProducts(){document.getElementById('homeSections').style.display='none';document.getElementById('productsSection').style.display='block';}
function showHome(){document.getElementById('homeSections').style.display='block';document.getElementById('productsSection').style.display='none';}
function goHome(){showHome();currentCat='all';currentBadge='';currentQ='';page=1;closeSearch();}
// #13 category links working
function filterCat(cat){currentCat=cat;currentBadge='';currentQ='';page=1;document.getElementById('sectionTitle').textContent=cat==='all'?'All Products':cat;showProducts();renderProducts();window.scrollTo({top:0,behavior:'smooth'});}
function filterBadge(b){currentBadge=b;currentCat='all';currentQ='';page=1;document.getElementById('sectionTitle').textContent=b==='deal'?"Today's Deals":b==='new'?'New Arrivals':'Hot Picks';showProducts();renderProducts();window.scrollTo({top:0,behavior:'smooth'});}
function setSortAndFilter(v){currentSort=v;page=1;renderProducts();}
function applyFilters(){currentMin=parseFloat(document.getElementById('minPrice').value)||0;currentMax=parseFloat(document.getElementById('maxPrice').value)||Infinity;page=1;renderProducts();}
function setRating(r){currentRating=r;document.querySelectorAll('.star-btn').forEach((b,i)=>b.classList.toggle('active',i<r));page=1;renderProducts();}
function clearFilters(){currentMin=0;currentMax=Infinity;currentRating=0;currentSort='';document.getElementById('minPrice').value='';document.getElementById('maxPrice').value='';document.querySelectorAll('.star-btn').forEach(b=>b.classList.remove('active'));page=1;renderProducts();}
function catCkChange(el){currentCat=el.value;page=1;renderProducts();}
function setActive(el){document.querySelectorAll('.nav-inner a').forEach(a=>a.classList.remove('active'));el.classList.add('active');}

// ── Product Detail ────────────────────────────────────────────────────────────
async function openProduct(id){
  const p=allProducts.find(x=>x.id===id); if(!p) return;
  document.getElementById('pmTitle').textContent=p.name;
  openOverlay('productModal');
  const disc=p.originalPrice>p.price?Math.round((1-p.price/p.originalPrice)*100):0;
  const stars='★'.repeat(Math.round(p.rating||0))+'☆'.repeat(5-Math.round(p.rating||0));
  const out=p.stock===0;
  const mainImg=p.images&&p.images.length?`<img id="mgMainImg" src="${p.images[0].url}" style="width:100%;height:100%;object-fit:contain;cursor:zoom-in" onclick="openLightbox('${p.images[0].url}')">`:`<span style="font-size:6rem">📦</span>`;
  const thumbs=p.images&&p.images.length>1?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${p.images.map((img,i)=>`<div style="width:60px;height:60px;border-radius:8px;overflow:hidden;border:2px solid ${i===0?'var(--p)':'var(--b)'};cursor:pointer;flex-shrink:0" onclick="mgShow('${img.url}',this)"><img src="${img.url}" style="width:100%;height:100%;object-fit:cover"></div>`).join('')}</div>`:'';
  const videos=p.videos&&p.videos.length?`<div style="margin-top:12px"><h4 style="font-size:.8rem;font-weight:700;color:var(--m);margin-bottom:6px">📹 Videos</h4>${p.videos.map(v=>`<video src="${v.url}" controls style="width:100%;border-radius:8px;margin-bottom:6px;max-height:200px"></video>`).join('')}</div>`:'';
  const audios=p.audios&&p.audios.length?`<div style="margin-top:12px"><h4 style="font-size:.8rem;font-weight:700;color:var(--m);margin-bottom:6px">🎵 Audio</h4>${p.audios.map(a=>`<div style="margin-bottom:8px"><div style="font-size:.73rem;color:var(--m);margin-bottom:3px">${a.name}</div><audio src="${a.url}" controls style="width:100%"></audio></div>`).join('')}</div>`:'';
  let revs=[]; try{revs=await fetch(`/api/reviews/${id}`).then(r=>r.json());}catch(e){}
  const revList=revs.length?revs.map(r=>`<div style="border:1px solid var(--b);border-radius:10px;padding:12px;margin-bottom:8px"><div style="display:flex;justify-content:space-between"><strong style="font-size:.83rem">${r.name}</strong><span style="font-size:.72rem;color:var(--m)">${new Date(r.date).toLocaleDateString('en-IN')}</span></div><div style="color:#f59e0b;font-size:.82rem">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><p style="font-size:.82rem;margin-top:4px;color:var(--t)">${r.text}</p></div>`).join(''):'<p style="color:var(--m);font-size:.84rem">No reviews yet.</p>';
  document.getElementById('pmBody').innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
    <div>
      <div style="aspect-ratio:4/3;background:#f1f5f9;border-radius:12px;display:flex;align-items:center;justify-content:center;overflow:hidden">${mainImg}</div>
      ${thumbs}${videos}${audios}
    </div>
    <div>
      <div style="font-size:.72rem;color:var(--m);text-transform:uppercase;margin-bottom:4px">${p.brand} · ${p.category}</div>
      <h2 style="font-size:1.2rem;font-weight:800;margin-bottom:8px">${p.name}</h2>
      <div style="color:#f59e0b;font-size:.88rem;margin-bottom:8px">${stars} <span style="color:var(--m);font-size:.78rem">(${p.reviewCount||0})</span></div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:1.6rem;font-weight:800">₹${p.price.toLocaleString('en-IN')}</span>
        ${disc?`<span style="text-decoration:line-through;color:var(--m)">₹${p.originalPrice.toLocaleString('en-IN')}</span><span style="color:var(--g);font-weight:700">${disc}% off</span>`:''}
      </div>
      <div style="margin-bottom:12px">${out?'<span style="color:var(--rd);font-weight:700">Out of Stock</span>':`<span style="color:var(--g);font-weight:700">✅ In Stock (${p.stock} available)</span>`}</div>
      ${p.description?`<p style="font-size:.84rem;color:var(--m);margin-bottom:14px;line-height:1.6">${p.description}</p>`:''}
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px">
        <button class="btn btn-primary btn-sm" ${out?'disabled style="opacity:.5"':''} onclick="addToCart(${p.id});closeOverlay('productModal')">Add to Cart</button>
        <button class="btn btn-sec btn-sm" ${out?'disabled style="opacity:.5"':''} onclick="buyNow(${p.id});closeOverlay('productModal')">Buy Now</button>
        <button class="btn btn-sec btn-sm" onclick="toggleWish(${p.id})">❤️ Wishlist</button>
      </div>
      <div style="border-top:1px solid var(--b);padding-top:14px">
        <h4 style="font-size:.9rem;font-weight:700;margin-bottom:10px">Customer Reviews</h4>
        <div>${revList}</div>
        <div style="margin-top:12px;background:var(--bg);border-radius:10px;padding:14px">
          <h5 style="font-size:.82rem;font-weight:700;margin-bottom:8px">Write a Review</h5>
          <input id="rv_name" placeholder="Your name" style="width:100%;padding:8px 12px;border:1.5px solid var(--b);border-radius:7px;font-size:.83rem;margin-bottom:8px;outline:none">
          <div style="display:flex;gap:4px;margin-bottom:8px">${[1,2,3,4,5].map(n=>`<button onclick="setRevStar(${n})" id="rstar${n}" style="font-size:1.4rem;background:none;border:none;cursor:pointer;color:#d1d5db;transition:color .2s">★</button>`).join('')}</div>
          <textarea id="rv_text" placeholder="Your review…" style="width:100%;padding:8px 12px;border:1.5px solid var(--b);border-radius:7px;font-size:.83rem;min-height:70px;resize:vertical;outline:none;margin-bottom:8px"></textarea>
          <button class="btn btn-primary btn-sm" onclick="submitReview(${p.id})">Submit Review</button>
        </div>
      </div>
    </div>
  </div>`;
}
let _revStar=5;
function setRevStar(n){_revStar=n;[1,2,3,4,5].forEach(i=>{const b=document.getElementById('rstar'+i);if(b)b.style.color=i<=n?'#f59e0b':'#d1d5db';});}
function mgShow(url,el){const img=document.getElementById('mgMainImg');if(img){img.src=url;img.onclick=()=>openLightbox(url);}document.querySelectorAll('[onclick^="mgShow"]').forEach(x=>x.parentElement&&(x.parentElement.style.borderColor='var(--b)'));el.style.borderColor='var(--p)';}
function openLightbox(url){const lb=document.getElementById('lightbox');document.getElementById('lightboxImg').src=url;lb.style.display='flex';}
async function submitReview(pid){
  const name=document.getElementById('rv_name').value.trim(), text=document.getElementById('rv_text').value.trim();
  if(!name||!text){toast('Name and review are required');return;}
  try{const r=await fetch(`/api/reviews/${pid}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,rating:_revStar,text})});if(!r.ok)throw new Error();toast('Review submitted! ⭐');openProduct(pid);}
  catch(e){toast('Could not submit review');}
}

// ── Cart ──────────────────────────────────────────────────────────────────────
function saveCart(){localStorage.setItem('sh_cart',JSON.stringify(cart));}
function cartCount(){return cart.reduce((s,i)=>s+i.qty,0);}
function cartTotal(){return cart.reduce((s,i)=>s+i.price*i.qty,0);}
function updateCartBadge(){const n=cartCount(),b=document.getElementById('cartBadge');if(b){b.textContent=n;b.style.display=n?'flex':'none';}}
function addToCart(id){
  const p=allProducts.find(x=>x.id===id); if(!p) return;
  if(p.stock===0){toast('This item is out of stock');return;}
  const ex=cart.find(x=>x.id===id);
  if(ex){if(ex.qty>=99){toast('Maximum quantity reached');return;}ex.qty++;}
  else cart.push({id:p.id,name:p.name,price:p.price,image:p.images&&p.images.length?p.images[0].url:'',qty:1});
  saveCart(); updateCartBadge(); toast(`${p.name} added to cart 🛒`);
}
function removeFromCart(id){cart=cart.filter(x=>x.id!==id);saveCart();updateCartBadge();renderCartBody();}
function changeQty(id,d){const i=cart.find(x=>x.id===id);if(!i)return;if(d>0&&i.qty>=99){toast('Max 99 per item');return;}i.qty=Math.max(1,i.qty+d);saveCart();updateCartBadge();renderCartBody();}
function renderCartBody(){
  const body=document.getElementById('cartBody');
  document.getElementById('cartCount').textContent=cartCount();
  document.getElementById('cartTotal').textContent='₹'+cartTotal().toLocaleString('en-IN',{minimumFractionDigits:2});
  if(!cart.length){body.innerHTML='<div style="text-align:center;padding:48px;color:var(--m)"><div style="font-size:3rem">🛒</div><h3 style="margin-top:8px">Cart is empty</h3></div>';return;}
  body.innerHTML=cart.map(i=>`<div class="cart-item">
    <div class="ci-img">${i.image?`<img src="${i.image}" alt="" style="width:100%;height:100%;object-fit:cover">`:'<span style="font-size:1.8rem">📦</span>'}</div>
    <div class="ci-info">
      <div class="ci-name">${i.name}</div>
      <div class="ci-price">₹${(i.price*i.qty).toLocaleString('en-IN')}</div>
      <div class="ci-qty">
        <button class="qty-btn" onclick="changeQty(${i.id},-1)">−</button>
        <span class="qty-num">${i.qty}</span>
        <button class="qty-btn" onclick="changeQty(${i.id},+1)">+</button>
        <button class="rm-btn" onclick="removeFromCart(${i.id})">Remove</button>
      </div>
    </div>
  </div>`).join('');
}
function openCart(){renderCartBody();document.getElementById('cartDrawer').classList.add('open');document.getElementById('drawerOverlay').classList.add('open');}
function closeCart(){document.getElementById('cartDrawer').classList.remove('open');document.getElementById('drawerOverlay').classList.remove('open');}
function buyNow(id){addToCart(id);closeCart();startCheckout();}

// ── Wishlist ──────────────────────────────────────────────────────────────────
function saveWish(){localStorage.setItem('sh_wish',JSON.stringify(wishlist));}
function updateWishBadge(){const n=wishlist.length,b=document.getElementById('wishBadge');if(b){b.textContent=n;b.style.display=n?'flex':'none';}}
function toggleWish(id,ev){if(ev)ev.stopPropagation();const p=allProducts.find(x=>x.id===id);if(!p)return;if(wishlist.includes(id)){wishlist=wishlist.filter(x=>x!==id);toast('Removed from wishlist');}else{if(wishlist.length>=50){toast('Wishlist full (max 50)');return;}wishlist.push(id);toast(`${p.name} added to wishlist ❤️`);}saveWish();updateWishBadge();}
function openWishlist(){
  const items=allProducts.filter(p=>wishlist.includes(p.id));
  document.getElementById('wishBody').innerHTML=items.length?`<div class="products-grid">${items.map(p=>productCard(p)).join('')}</div>`:'<div style="text-align:center;padding:48px;color:var(--m)"><div style="font-size:3rem">❤️</div><h3 style="margin-top:8px">Wishlist is empty</h3></div>';
  openOverlay('wishModal');
}

// ── Checkout ──────────────────────────────────────────────────────────────────
let coStep=1;
function startCheckout(){
  if(!cart.length){toast('Cart is empty!');return;}
  // #28 — Reset all checkout form fields before opening
  coStep=1; updateCoSteps();
  // Clear delivery fields
  ['co_name','co_phone','co_email','co_addr1','co_addr2','co_city','co_state','co_pin'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  ['er_name','er_phone','er_addr1','er_city','er_state','er_pin'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.textContent='';
  });
  const pd=document.getElementById('payDetail'); if(pd) pd.innerHTML='';
  // Reset payment to COD
  selectedPayment='cod';
  const radios=document.querySelectorAll('input[name="pay"]');
  radios.forEach(r=>r.checked=r.value==='cod');
  document.querySelectorAll('#coP3 label').forEach(l=>l.style.borderColor='var(--b)');
  // Render current cart items only
  document.getElementById('coCartItems').innerHTML=cart.map(i=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--b)">
      <div style="display:flex;align-items:center;gap:10px">
        ${i.image?`<img src="${i.image}" style="width:44px;height:44px;object-fit:cover;border-radius:6px" alt="">`:'<span style="font-size:1.6rem">📦</span>'}
        <div>
          <div style="font-size:.85rem;font-weight:600">${i.name}</div>
          <div style="font-size:.78rem;color:var(--m)">Qty: ${i.qty} × ₹${i.price.toLocaleString('en-IN')}</div>
        </div>
      </div>
      <span style="font-weight:700">₹${(i.price*i.qty).toLocaleString('en-IN')}</span>
    </div>`).join('');
  document.getElementById('coTotal').textContent='₹'+cartTotal().toLocaleString('en-IN',{minimumFractionDigits:2});
  openOverlay('checkoutModal');
}
function coGoStep(n){coStep=n;updateCoSteps();}
function updateCoSteps(){
  for(let i=1;i<=4;i++){
    document.getElementById('cst'+i).className='cs-step'+(i===coStep?' active':i<coStep?' done':'');
    document.getElementById('coP'+i).className='checkout-panel'+(i===coStep?' active':'');
    const l=document.getElementById('csl'+i); if(l) l.className='cs-line'+(i<coStep?' done':'');
  }
}
function selectPay(el,val){
  document.querySelectorAll('#coP3 label').forEach(l=>l.style.borderColor='var(--b)');
  el.style.borderColor='var(--p)'; selectedPayment=val;
  const det=document.getElementById('payDetail');
  if(val==='upi') det.innerHTML='<div class="form-group"><label>UPI ID</label><input id="co_upi" placeholder="name@upi"></div>';
  else if(val==='card') det.innerHTML='<div class="form-row"><div class="form-group"><label>Card Number</label><input id="co_card" placeholder="XXXX XXXX XXXX XXXX" maxlength="19"></div><div class="form-group"><label>Expiry</label><input id="co_exp" placeholder="MM/YY" maxlength="5"></div></div><div class="form-group"><label>CVV</label><input id="co_cvv" type="password" placeholder="•••" maxlength="3"></div>';
  else if(val==='netbanking') det.innerHTML='<div class="form-group"><label>Select Bank</label><select id="co_bank"><option>SBI</option><option>HDFC Bank</option><option>ICICI Bank</option><option>Axis Bank</option><option>Kotak Bank</option></select></div>';
  else det.innerHTML='';
}
function coValidate(){
  let ok=true;
  [['co_name','er_name'],['co_phone','er_phone'],['co_addr1','er_addr1'],['co_city','er_city'],['co_state','er_state'],['co_pin','er_pin']].forEach(([fid,eid])=>{
    const el=document.getElementById(fid),er=document.getElementById(eid);
    if(!el||!el.value.trim()){if(er)er.textContent='This field is required';ok=false;}else if(er)er.textContent='';
  });
  const ph=document.getElementById('co_phone');
  if(ph&&ok&&!/^[6-9]\d{9}$/.test(ph.value)){const er=document.getElementById('er_phone');if(er)er.textContent='Enter valid 10-digit Indian mobile';ok=false;}
  if(ok) coGoStep(3);
}
async function placeOrder(){
  const total = cartTotal();
  const payload = {
    items:cart, total,
    name:document.getElementById('co_name').value,
    phone:document.getElementById('co_phone').value,
    email:document.getElementById('co_email').value,
    address:document.getElementById('co_addr1').value+' '+(document.getElementById('co_addr2').value||''),
    city:document.getElementById('co_city').value,
    state:document.getElementById('co_state').value,
    pin:document.getElementById('co_pin').value,
    payment:selectedPayment
  };

  // COD — place directly without Razorpay
  if(selectedPayment === 'cod'){
    try{
      const res=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const order=await res.json();
      if(!res.ok) throw new Error(order.error||'Failed');
      _confirmOrder(order,'COD');
    }catch(e){toast('Order failed: '+e.message);}
    return;
  }

  // RAZORPAY — for UPI, Card, NetBanking, Wallet
  try{
    // Step 1: Create Razorpay order on server
    const rzpRes=await fetch('/api/razorpay/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:total})});
    const rzpData=await rzpRes.json();
    if(!rzpRes.ok) throw new Error(rzpData.error||'Razorpay order creation failed');

    // Step 2: Open Razorpay checkout
    const options = {
      key: rzpData.keyId,
      amount: rzpData.amount,
      currency: 'INR',
      name: storeSettings.storeName || 'ShopHere.in',
      description: `Order — ${cart.length} item(s)`,
      order_id: rzpData.orderId,
      prefill:{
        name: payload.name,
        email: payload.email || '',
        contact: payload.phone
      },
      theme: { color: getComputedStyle(document.documentElement).getPropertyValue('--p').trim() || '#f97316' },
      handler: async function(response){
        // Step 3: Verify payment on server
        try{
          const verRes=await fetch('/api/razorpay/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(response)});
          const verData=await verRes.json();
          if(!verData.success) throw new Error('Payment verification failed');
          // Step 4: Place order in DB with Razorpay payment ID
          payload.payment = selectedPayment;
          payload.razorpayPaymentId = verData.paymentId;
          payload.razorpayOrderId = rzpData.orderId;
          const orderRes=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
          const order=await orderRes.json();
          if(!orderRes.ok) throw new Error(order.error||'Failed');
          _confirmOrder(order,'Razorpay | '+selectedPayment.toUpperCase());
        }catch(e){toast('Payment verified but order failed: '+e.message);}
      },
      modal:{
        ondismiss: function(){ toast('Payment cancelled'); }
      }
    };

    // Load Razorpay script if not already loaded
    if(!window.Razorpay){
      await new Promise((resolve,reject)=>{
        const s=document.createElement('script');
        s.src='https://checkout.razorpay.com/v1/checkout.js';
        s.onload=resolve; s.onerror=reject;
        document.head.appendChild(s);
      });
    }
    const rzp = new window.Razorpay(options);
    rzp.open();

  }catch(e){
    toast('Payment error: '+e.message);
    console.error(e);
  }
}

function _confirmOrder(order, paymentLabel){
  myOrders.unshift(order); localStorage.setItem('sh_orders',JSON.stringify(myOrders));
  cart=[]; saveCart(); updateCartBadge();
  document.getElementById('coOrderId').textContent=order.id;
  document.getElementById('coConfirmItems').innerHTML=
    `${(order.items||[]).map(i=>`${i.name} × ${i.qty} — ₹${(i.price*i.qty).toLocaleString('en-IN')}`).join('<br>')}`+
    `<br><strong style="margin-top:6px;display:block">Total: ₹${order.total.toLocaleString('en-IN')}</strong>`+
    `<br>Payment: ${paymentLabel}`;
  coGoStep(4);
}

// #11 Track Order
function openTrackOrder(){
  document.getElementById('trackOrderModal').classList.add('open');
  document.getElementById('trackResult').innerHTML='';
  document.getElementById('trackInput').value='';
}
function trackOrder(){
  const id=document.getElementById('trackInput').value.trim().toUpperCase();
  const res=document.getElementById('trackResult');
  if(!id){res.innerHTML='<p style="color:var(--rd)">Please enter an Order ID</p>';return;}
  const order=myOrders.find(o=>o.id===id);
  if(!order){res.innerHTML=`<p style="color:var(--rd)">Order "${id}" not found. Please check your Order ID.</p>`;return;}
  const statusColors={Processing:'#f97316',Shipped:'#3b82f6',Delivered:'#22c55e',Cancelled:'#ef4444'};
  const clr=statusColors[order.status]||'#64748b';
  res.innerHTML=`<div style="border:2px solid ${clr};border-radius:12px;padding:16px;margin-top:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <strong style="font-size:1rem">${order.id}</strong>
      <span style="background:${clr};color:#fff;padding:4px 12px;border-radius:50px;font-size:.78rem;font-weight:700">${order.status}</span>
    </div>
    <div style="font-size:.82rem;color:var(--m);margin-bottom:8px">Ordered: ${new Date(order.date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</div>
    <div style="font-size:.84rem;margin-bottom:8px">${(order.items||[]).map(i=>`${i.name} × ${i.qty}`).join(', ')}</div>
    <div style="font-weight:700">₹${(order.total||0).toLocaleString('en-IN')} · ${(order.payment||'').toUpperCase()}</div>
    <div style="margin-top:10px;font-size:.82rem;color:var(--m)">Delivery to: ${order.address||''}, ${order.city||''} ${order.pin||''}</div>
  </div>`;
}

// Orders modal
function openOrders(){
  document.getElementById('ordersBody').innerHTML=myOrders.length?myOrders.map(o=>`
    <div style="border:1px solid var(--b);border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <strong>${o.id}</strong>
        <span class="status-badge s-${(o.status||'').toLowerCase()}">${o.status||'Processing'}</span>
      </div>
      <div style="font-size:.78rem;color:var(--m);margin-bottom:6px">${o.date?new Date(o.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):''} · ${(o.payment||'').toUpperCase()}</div>
      <div style="font-size:.82rem;margin-bottom:6px">${(o.items||[]).map(i=>`${i.name} × ${i.qty}`).join(', ')}</div>
      <div style="font-weight:700">₹${(o.total||0).toLocaleString('en-IN')}</div>
    </div>`).join(''):'<div style="text-align:center;padding:48px;color:var(--m)"><div style="font-size:3rem">📦</div><h3 style="margin-top:8px">No orders yet</h3></div>';
  openOverlay('ordersModal');
}

// ── Popups ────────────────────────────────────────────────────────────────────
function openContactPopup(){openOverlay('contactPopup');}
function openTerms(){openOverlay('termsPopup');}
function openPrivacy(){openOverlay('privacyPopup');}
function openReturns(){openOverlay('returnsPopup');}
function openFAQ(){openOverlay('faqPopup');}
function openCareers(){openOverlay('careersPopup');}
function openAbout(){openOverlay('aboutPopup');}
function closePopup(id){closeOverlay(id);}

// #10 Send message via mailto
function sendMessage(){
  const name=document.getElementById('msg_name').value.trim();
  const contact=document.getElementById('msg_contact').value.trim();
  const text=document.getElementById('msg_text').value.trim();
  if(!name||!text){toast('Please fill name and message');return;}
  const email=storeSettings.contactEmail||'support@shophere.in';
  const subject=encodeURIComponent(`Customer Message from ${name}`);
  const body=encodeURIComponent(`Name: ${name}\nContact: ${contact}\n\nMessage:\n${text}`);
  window.location.href=`mailto:${email}?subject=${subject}&body=${body}`;
  toast('Opening email client to send your message 📧');
  document.getElementById('msg_name').value='';
  document.getElementById('msg_contact').value='';
  document.getElementById('msg_text').value='';
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',async()=>{
  updateAuthUI();
  updateCartBadge();
  updateWishBadge();
  await loadSettings();
  await loadCategories();
  await loadBanners();
  await loadProducts();
  loadPageBlocks();

  // Re-fetch page blocks when user returns to this tab (after admin changes)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadPageBlocks();
  });
});


// extra popup
function openAbout(){openOverlay('aboutPopup');}

// ── Page Builder Renderer ─────────────────────────────────────────────────────
async function loadPageBlocks(){
  try{
    const blocks = await fetch('/api/pageblocks').then(r=>r.json());
    const visible = blocks.filter(b=>b.visible!==false);

    // Inject animation keyframes once
    if(!document.getElementById('pb-anim-styles')){
      const st=document.createElement('style');
      st.id='pb-anim-styles';
      st.textContent=`
        @keyframes pb-fade-in{from{opacity:0}to{opacity:1}}
        @keyframes pb-slide-up{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
        @keyframes pb-slide-down{from{transform:translateY(-24px);opacity:0}to{transform:none;opacity:1}}
        @keyframes pb-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes pb-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
        @keyframes pb-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
        @keyframes pb-marquee{from{transform:translateX(100vw)}to{transform:translateX(-100%)}}
        .pb-fade-in{animation:pb-fade-in .7s ease forwards}
        .pb-slide-up{animation:pb-slide-up .6s ease forwards}
        .pb-slide-down{animation:pb-slide-down .6s ease forwards}
        .pb-bounce{animation:pb-bounce 1.2s ease infinite}
        .pb-pulse{animation:pb-pulse 2s ease infinite}
        .pb-shake{animation:pb-shake .4s ease infinite}
        .pb-floating-block{position:fixed;z-index:9990}
        .pb-sticky-block{position:sticky;z-index:100;top:0}
      `;
      document.head.appendChild(st);
    }

    // Clear all inline zones
    document.querySelectorAll('.pb-zone').forEach(z=>z.innerHTML='');
    // Remove existing floating/fixed blocks
    document.querySelectorAll('.pb-floating-block,.pb-dynamic-top').forEach(e=>e.remove());

    visible.forEach(b=>{
      const s = b.style || {};

      // Build full CSS string from style object — apply ALL non-empty values
      const styleStr = Object.entries({
        'color':            s.color,
        'background':       s.background,
        'background-image': s.backgroundImage,
        'background-size':  s.backgroundImage ? (s.backgroundSize||'cover') : null,
        'background-position': s.backgroundImage ? 'center' : null,
        'font-size':        s.fontSize,
        'font-weight':      s.fontWeight,
        'text-align':       s.textAlign,
        'line-height':      s.lineHeight,
        'padding':          s.padding,
        'margin':           s.margin,
        'border-radius':    s.borderRadius,
        'border':           s.borderWidth && s.borderStyle ? `${s.borderWidth} ${s.borderStyle} ${s.borderColor||'#e2e8f0'}` : null,
        'box-shadow':       s.boxShadow,
        'opacity':          s.opacity,
        'width':            s.width,
        'min-height':       s.minHeight,
      }).filter(([,v])=>v).map(([k,v])=>`${k}:${v}`).join(';');

      const animClass = s.animation ? ` ${s.animation}` : '';

      // Build block HTML
      let html = '';
      if(b.type==='text'){
        html=`<div class="${animClass.trim()}" style="${styleStr}">${b.content||''}</div>`;
      } else if(b.type==='heading'){
        html=`<h2 class="${animClass.trim()}" style="font-weight:800;${styleStr}">${b.content||''}</h2>`;
      } else if(b.type==='image'||b.type==='image-link'){
        const imgW = s.width || '100%';
        const imgH = s.minHeight ? `height:${s.minHeight};object-fit:cover;` : '';
        const imgS=`width:${imgW};max-width:100%;display:block;${imgH}${s.borderRadius?';border-radius:'+s.borderRadius:''}`;
        const img=`<img src="${b.content||''}" alt="${b.alt||''}" style="${imgS}" loading="lazy" onerror="this.style.display='none'">`;
        const inner=b.link?`<a href="${b.link}" target="${b.target||'_self'}" title="${b.alt||''}" style="display:block">${img}</a>`:img;
        html=`<div class="${animClass.trim()}" style="${styleStr}">${inner}</div>`;
      } else if(b.type==='video'){
        html=`<div class="${animClass.trim()}" style="${styleStr}"><video src="${b.content||''}" controls style="width:100%;border-radius:${s.borderRadius||'8px'};max-height:400px"></video>${b.alt?`<p style="font-size:.82rem;color:var(--m);margin-top:6px">${b.alt}</p>`:''}</div>`;
      } else if(b.type==='audio'){
        html=`<div class="${animClass.trim()}" style="${styleStr}">${b.alt?`<p style="font-size:.84rem;font-weight:600;margin-bottom:6px">${b.alt}</p>`:''}<audio src="${b.content||''}" controls style="width:100%"></audio></div>`;
      } else if(b.type==='button'){
        const btnS=`background:${b.btnColor||s.background||'var(--p)'};color:${s.color||'#fff'};padding:${s.padding||'12px 28px'};border:none;border-radius:${s.borderRadius||'50px'};font-size:${s.fontSize||'.9rem'};font-weight:700;cursor:pointer;display:inline-block;text-decoration:none`;
        html=`<div class="${animClass.trim()}" style="text-align:${s.textAlign||'center'};${styleStr}"><a href="${b.link||'#'}" style="${btnS}">${b.content||'Click Here'}</a></div>`;
      } else if(b.type==='marquee'){
        const speed={'slow':'20s','normal':'12s','fast':'6s'}[b.alt||'normal']||'12s';
        const parts=(b.content||'').split('|').map(t=>t.trim()).filter(Boolean).join(' &nbsp;•&nbsp; ');
        html=`<div style="overflow:hidden;${styleStr}"><div style="white-space:nowrap;display:inline-block;animation:pb-marquee ${speed} linear infinite">${parts}&nbsp;&nbsp;&nbsp;&nbsp;${parts}</div></div>`;
      } else if(b.type==='countdown'){
        const endDate=b.content;
        const endedMsg=b.link||'Offer ended!';
        const label=b.alt||'Sale ends in:';
        const cdId='pb-cd-'+b.id;
        html=`<div class="${animClass.trim()}" style="${styleStr};text-align:${s.textAlign||'center'}">
          <div style="font-weight:600;margin-bottom:8px">${label}</div>
          <div id="${cdId}" style="display:flex;gap:8px;justify-content:${s.textAlign==='left'?'flex-start':s.textAlign==='right'?'flex-end':'center'}">
            <span class="pb-cd-h" style="background:${s.background||'#1e293b'};color:${s.color||'#fff'};padding:8px 14px;border-radius:8px;font-size:1.4rem;font-weight:800;min-width:52px;text-align:center">--</span>
            <span style="font-size:1.4rem;font-weight:800;line-height:2.2">:</span>
            <span class="pb-cd-m" style="background:${s.background||'#1e293b'};color:${s.color||'#fff'};padding:8px 14px;border-radius:8px;font-size:1.4rem;font-weight:800;min-width:52px;text-align:center">--</span>
            <span style="font-size:1.4rem;font-weight:800;line-height:2.2">:</span>
            <span class="pb-cd-s" style="background:${s.background||'#1e293b'};color:${s.color||'#fff'};padding:8px 14px;border-radius:8px;font-size:1.4rem;font-weight:800;min-width:52px;text-align:center">--</span>
          </div>
          <small style="color:var(--m);font-size:.72rem">Hours : Minutes : Seconds</small>
        </div>`;
        // Start countdown timer after render
        setTimeout(()=>{
          const el=document.getElementById(cdId);
          if(!el||!endDate) return;
          const tick=()=>{
            const diff=new Date(endDate)-new Date();
            if(diff<=0){el.innerHTML=`<span style="color:#ef4444;font-weight:700">${endedMsg}</span>`;return;}
            const h=Math.floor(diff/3600000);
            const m=Math.floor((diff%3600000)/60000);
            const s2=Math.floor((diff%60000)/1000);
            const pad=n=>String(n).padStart(2,'0');
            el.querySelector('.pb-cd-h').textContent=pad(h);
            el.querySelector('.pb-cd-m').textContent=pad(m);
            el.querySelector('.pb-cd-s').textContent=pad(s2);
          };
          tick();
          setInterval(tick,1000);
        },100);
      } else if(b.type==='notice'){
        const colors={info:['#eff6ff','#1d4ed8','#bfdbfe'],success:['#f0fdf4','#166534','#bbf7d0'],warning:['#fff7ed','#c2410c','#fed7aa'],error:['#fef2f2','#991b1b','#fecaca'],promo:['#faf5ff','#7c3aed','#e9d5ff']};
        const [bg,tc,bc]=colors[b.alt||'info']||colors.info;
        const icon=b.link||'';
        html=`<div class="${animClass.trim()}" style="background:${s.background||bg};color:${s.color||tc};border:1.5px solid ${s.borderColor||bc};border-radius:${s.borderRadius||'8px'};padding:${s.padding||'12px 16px'};${styleStr}">${icon?icon+' ':''}<strong>${b.content||''}</strong></div>`;
      } else if(b.type==='divider'){
        html=`<div style="${styleStr}"><hr style="border:none;border-top:${s.borderWidth||'2px'} ${b.content||'solid'} ${s.borderColor||s.color||'var(--b)'}"></div>`;
      } else if(b.type==='spacer'){
        html=`<div style="height:${b.content||'40'}px"></div>`;
      } else if(b.type==='html'){
        html=`<div class="${animClass.trim()}" style="${styleStr}">${b.content||''}</div>`;
      }

      if(!html) return;

      // Determine positioning & zone
      const isFixed  = s.position==='fixed';
      const isSticky = s.position==='sticky';

      if(isFixed || b.page==='floating'){
        // Floating/fixed — inject directly into body
        const wrap=document.createElement('div');
        wrap.className='pb-floating-block';
        wrap.style.cssText=`position:fixed;z-index:${s.zIndex||9990};top:${s.top||'auto'};right:${s.right||'20px'};bottom:${(!s.top||s.top==='auto')?'20px':'auto'}`;
        wrap.innerHTML=html;
        document.body.appendChild(wrap);
        return;
      }

      if(b.page==='top'){
        const wrap=document.createElement('div');
        wrap.className='pb-dynamic-top';
        if(isSticky) wrap.style.cssText=`position:sticky;top:0;z-index:${s.zIndex||100}`;
        wrap.innerHTML=html;
        const header=document.querySelector('header,.main-header,.top-bar,.announcement-bar,nav');
        if(header) document.body.insertBefore(wrap,header);
        else document.body.insertBefore(wrap,document.body.firstChild);
        return;
      }

      // Standard zones
      const zoneMap={
        'home':'pb-zone-home-bottom',
        'header':'pb-zone-header',
        'footer':'pb-zone-footer',
        'products':'pb-zone-products',
        'between':'pb-zone-between',
        'sidebar':'pb-zone-sidebar',
        'custom':'pb-zone-custom'
      };
      const zoneId=zoneMap[b.page]||'pb-zone-custom';
      const zone=document.getElementById(zoneId);
      if(!zone) return;

      const wrap=document.createElement('div');
      if(isSticky) wrap.style.cssText=`position:sticky;top:0;z-index:${s.zIndex||100}`;
      wrap.innerHTML=html;
      zone.appendChild(wrap);
    });
  }catch(e){console.warn('Page blocks failed',e.message);}
}

