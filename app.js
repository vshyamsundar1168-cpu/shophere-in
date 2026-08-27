'use strict';
// ── State ─────────────────────────────────────────────────────────────────────
let allProducts=[], allCategories=[], allBanners=[], storeSettings={};
let cart=JSON.parse(localStorage.getItem('sh_cart')||'[]');
let wishlist=JSON.parse(localStorage.getItem('sh_wish')||'[]');
let myOrders=JSON.parse(localStorage.getItem('sh_orders')||'[]');
let currentCat='all', currentBadge='', currentSort='newest', currentQ='', currentMin=0, currentMax=Infinity, currentRating=0;
let page=1; const PAGE=12;
let heroIdx=0, heroTimer=null;
let selectedPayment='cod';
const CAT_ICONS={'Electronics':'[Mobile]','Fashion':'👗','Kitchen':'🍳','Sports':'⚽','Beauty':'💄','Books':'📚','Toys':'🧸','Home':'[Home]','Kids':'🧒','Women':'👩','Men':'👨','default':'🛍️'};
const CAT_COLORS={'Electronics':['#dbeafe','#1d4ed8'],'Fashion':['#fce7f3','#be185d'],'Kitchen':['#fef3c7','#d97706'],'Sports':['#dcfce7','#16a34a'],'Beauty':['#fdf4ff','#9333ea'],'Books':['#fff7ed','#ea580c'],'Toys':['#fef9c3','#ca8a04'],'Home':['#f0fdf4','#15803d'],'Kids':['#ffe4e6','#e11d48'],'Women':['#fdf2f8','#db2777'],'Men':['#eff6ff','#2563eb'],'default':['#f8fafc','#475569']};

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
  closeLogin(); updateAuthUI(); toast(`Account created! Welcome, ${name} [+]`);
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
    // Store name + logo in header — preserve new design colors
    const logoText=document.getElementById('logoText');
    const logoImg=document.getElementById('headerLogo');
    if(s.storeName){
      document.title=s.storeName;
      // Don't override logo HTML — let HTML/CSS control colors
    }
    if(s.logo&&s.logo.trim()&&s.logo.startsWith('http')){
      if(logoImg){logoImg.src=s.logo;logoImg.style.display='block';}
    }
    if(s.primaryColor) document.documentElement.style.setProperty('--p',s.primaryColor);

    // Apply essential dynamic settings from admin Store Settings
    let dynCSS = '';

    // Extended Color Theme — applies colors set in admin Visual Customizer
    if(s.colorBg)        { dynCSS += `body{background:${s.colorBg}}:root{--bg:${s.colorBg}}`; }
    if(s.colorBtnCart)   { dynCSS += `.btn-cart{background:${s.colorBtnCart}!important;}`; }
    if(s.colorBtnBuy)    { dynCSS += `.btn-buy{background:${s.colorBtnBuy}}`; }
    if(s.colorNavBg)     { dynCSS += `.main-nav{background:${s.colorNavBg}}`; }
    if(s.colorFooterBg)  { dynCSS += `footer{background:${s.colorFooterBg}}`; }
    if(s.colorFooterText){ dynCSS += `.footer-col ul li a{color:${s.colorFooterText}}.footer-brand p{color:${s.colorFooterText}}`; }
    if(s.colorFooterHead){ dynCSS += `.footer-col h5{color:${s.colorFooterHead}}`; }
    if(s.prodCardBg)     { dynCSS += `.product-card{background:${s.prodCardBg}}`; }
    if(s.prodCardRadius) { dynCSS += `.product-card{border-radius:${s.prodCardRadius}px}`; }
    if(s.badgeNewBg)     { dynCSS += `.pc-badge.new{background:${s.badgeNewBg}}`; }
    if(s.badgeDealBg)    { dynCSS += `.pc-badge.deal{background:${s.badgeDealBg}}`; }
    if(s.badgeHotBg)     { dynCSS += `.pc-badge.hot{background:${s.badgeHotBg}}`; }
    if(s.colorBody)      { dynCSS += `body{color:${s.colorBody}}`; }
    if(s.colorHeading)   { dynCSS += `h1,h2,h3,h4,h5,h6{color:${s.colorHeading}}`; }
    if(s.colorProdName)  { dynCSS += `.pc-name{color:${s.colorProdName}}`; }
    if(s.colorProdPrice) { dynCSS += `.pc-price .cur{color:${s.colorProdPrice}}`; }
    if(s.colorProdBrand) { dynCSS += `.pc-brand{color:${s.colorProdBrand}}`; }
    // Banner text color — only applied if explicitly set in store settings
    // Per-banner textColor is applied directly on h1/p via inline style so no override needed
    if(s.bannerTextColor) dynCSS += `.hero-slide h1,.hero-slide p{color:${s.bannerTextColor}}`;

    // Apply combined dynamic style
    let dynStyle = document.getElementById('dynamic-colors');
    if(!dynStyle){ dynStyle=document.createElement('style'); dynStyle.id='dynamic-colors'; document.head.appendChild(dynStyle); }
    if(dynCSS) dynStyle.textContent = dynCSS;
    // Banner size
    if(s.bannerSizeVal && s.bannerSizeUnit){
      const slider = document.getElementById('heroSlider');
      if(slider){
        slider.style.height = s.bannerSizeVal + s.bannerSizeUnit;
        // Ensure content always visible inside resized banner
        slider.style.overflow = 'hidden';
        slider.style.minHeight = '80px';
      }
    }
    // #20 Free shipping threshold
    const thresh=parseFloat(s.freeShippingThreshold)||0;
    const bar=document.getElementById('topBar');
    if(bar){
      if(thresh>0) bar.innerHTML=`[+] Free shipping on orders above <strong>₹${thresh.toLocaleString('en-IN')}</strong>${s.announcementBar?' | '+s.announcementBar:''}`;
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

    // ── Preferred nav order ───────────────────────────────────────────────────
    const NAV_ORDER = [
      'Women','Woman','Women\'s','Ladies',
      'Men','Man','Men\'s','Gents',
      'Kids','Children','Boy','Girl',
      'Fashion','Clothing','Apparel','Dress','Sarees','Kurta',
      'Home','Home & Office','Home/Office Needs','Kitchen','Furniture','Bedding',
      'Electronics','Mobiles','Computers','Laptops','Gadgets',
      'Vehicle','Vehicle Accessories','Automobile','Auto',
      'Uncategorized','Others','Miscellaneous'
    ];
    const navOrderLower = NAV_ORDER.map(x=>x.toLowerCase());
    const sortedCats = [...allCategories].sort((a,b)=>{
      const ai = navOrderLower.findIndex(x=>a.toLowerCase().includes(x)||x.includes(a.toLowerCase()));
      const bi = navOrderLower.findIndex(x=>b.toLowerCase().includes(x)||x.includes(b.toLowerCase()));
      const aIdx = ai === -1 ? 999 : ai;
      const bIdx = bi === -1 ? 999 : bi;
      if(aIdx !== bIdx) return aIdx - bIdx;
      return a.localeCompare(b); // alphabetical for same group
    });

    // Nav bar — append dynamic DB categories AFTER the fixed hardcoded items in index.html
    // Fixed items: Home, All Products, Women, Men, Kids, Fashion, Deals, Home/Office, Electricals, Electronics, Vehicle Accessories
    const fixedCats = ['all','women','man','men','kids','fashion','deal','home','home/office','electricals','electronics','vehicle'];
    const nav = document.getElementById('mainNav');
    if(nav){
      // Only add categories not already shown as fixed nav items
      const extraCats = sortedCats.filter(c=>{
        const cl = c.toLowerCase();
        return !fixedCats.some(f => cl.includes(f) || f.includes(cl));
      });
      if(extraCats.length){
        extraCats.forEach(c=>{
          const a = document.createElement('a');
          a.textContent = c;
          a.onclick = ()=>{ filterCat(c); setActive(a); };
          nav.appendChild(a);
        });
      }
    }

    // Category strip below hero — same sorted order
    const cs=document.getElementById('catStrip');
    if(cs){
      cs.innerHTML=sortedCats.map(c=>{
        const [cbg,cc]=CAT_COLORS[c]||CAT_COLORS.default;
        return `<div class="cat-chip" onclick="filterCat('${c.replace(/'/g,"\\'")}');window.scrollTo(0,0)" style="--chip-bg:${cbg};--chip-color:${cc}">
          <div class="cat-chip-icon" style="background:${cbg};color:${cc}">${CAT_ICONS[c]||'🛍️'}</div>
          <span>${c}</span>
        </div>`;
      }).join('');
    }

    // Keep catGrid for backward compatibility (hidden now)
    const cg=document.getElementById('catGrid');
    if(cg) cg.style.display='none';
    // Search dropdown — sorted order
    const sel=document.getElementById('searchCat');
    if(sel) sel.innerHTML='<option value="all">All</option>'+sortedCats.map(c=>`<option value="${c}">${c}</option>`).join('');
    // Filter sidebar — sorted order
    const fc=document.getElementById('filterCats');
    if(fc) fc.innerHTML=`<label><input type="checkbox" value="all" checked onchange="catCkChange(this)"> All Categories</label>`+
      sortedCats.map(c=>`<label><input type="checkbox" value="${c}" onchange="catCkChange(this)"> ${c}</label>`).join('');
    // Footer shop links — sorted order
    const fl=document.getElementById('footerCatLinks');
    if(fl) fl.innerHTML=sortedCats.slice(0,6).map(c=>`<li><a onclick="filterCat('${c.replace(/'/g,"\\'")}');window.scrollTo(0,0)" style="cursor:pointer">${c}</a></li>`).join('');
  }catch(e){console.warn('Categories failed',e.message);}
}

// ── Banners ───────────────────────────────────────────────────────────────────
async function loadBanners(){
  try{
    let bans=await fetch('/api/banners').then(r=>r.json());
    allBanners=bans.filter(b=>b.active!==false);
    if(!allBanners.length) allBanners=[{bgGradient:'linear-gradient(135deg,#1e293b,#f97316)',headline:'Welcome to ShopHere.in 🛍️',subtitle:"India's favourite store",ctaLabel:'Shop Now',displayMode:'slider',widthPct:'100',objectFit:'contain'}];

    const slider = document.getElementById('heroSlider');
    const track  = document.getElementById('heroTrack');
    const dots   = document.getElementById('heroDots');

    // Inject banner animation keyframes once
    if(!document.getElementById('bn-anim-styles')){
      const st=document.createElement('style');
      st.id='bn-anim-styles';
      st.textContent=`
        @keyframes bn-fade-in{from{opacity:0}to{opacity:1}}
        @keyframes bn-slide-up{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
        @keyframes bn-slide-left{from{transform:translateX(-60px);opacity:0}to{transform:none;opacity:1}}
        @keyframes bn-slide-right{from{transform:translateX(60px);opacity:0}to{transform:none;opacity:1}}
        @keyframes bn-zoom-in{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes bn-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
        @keyframes bn-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        .bn-fade-in .slide-overlay{animation:bn-fade-in .8s ease forwards}
        .bn-slide-up .slide-overlay{animation:bn-slide-up .7s ease forwards}
        .bn-slide-left .slide-overlay{animation:bn-slide-left .7s ease forwards}
        .bn-slide-right .slide-overlay{animation:bn-slide-right .7s ease forwards}
        .bn-zoom-in{animation:bn-zoom-in .8s ease forwards}
        .bn-pulse .banner-img{animation:bn-pulse 3s ease infinite}
        .bn-bounce .slide-overlay{animation:bn-bounce 2s ease infinite}
      `;
      document.head.appendChild(st);
    }

    // Separate slider banners from grid banners
    const sliderBans = allBanners.filter(b=>!b.displayMode||b.displayMode==='slider');
    const gridBans   = allBanners.filter(b=>b.displayMode==='grid');

    // ── GRID banners — shown side by side above or below slider ────────────────
    let gridEl = document.getElementById('banner-grid-row');
    if(!gridEl){
      gridEl = document.createElement('div');
      gridEl.id = 'banner-grid-row';
      gridEl.style.cssText = 'display:flex;flex-wrap:wrap;gap:0;width:100%';
      slider.parentNode.insertBefore(gridEl, slider.nextSibling);
    }
    if(gridBans.length){
      gridEl.style.display='flex';
      gridEl.innerHTML = gridBans.map(b=>{
        const h   = b.bannerHeight ? b.bannerHeight+'px' : '280px';
        const fit = b.objectFit||'contain';
        const w   = b.widthPct||'50';
        const tClr= b.textColor||'#fff';
        const hSz = ({'xlarge':'2.2rem','large':'1.6rem','medium':'1.2rem','small':'.9rem','none':'0'})[b.textSize||'large']||'1.6rem';
        const posMap={'center':'center','left':'flex-start','right':'flex-end','top':'flex-start','bottom':'flex-end'};
        const aPos = posMap[b.textPosition||'center']||'center';
        const animClass = b.animation ? 'bn-'+b.animation : '';
        const imgTag = (b.bgImage||b.bgImageUrl) ? `<img class="banner-img" src="${b.bgImage||b.bgImageUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${fit};object-position:center;display:block;" loading="lazy">` : '';
        const gradBg = (!b.bgImage&&!b.bgImageUrl) ? `background:${b.bgGradient||'linear-gradient(135deg,#1e293b,#f97316)'}` : 'background:#1e293b';
        const showText = b.textSize !== 'none';
        return `<div class="${animClass}" style="${gradBg};position:relative;flex:0 0 ${w}%;width:${w}%;height:${h};overflow:hidden;cursor:pointer;" onclick="filterCat('all');showProducts()">
          ${imgTag}
          ${showText?`<div class="slide-overlay" style="align-items:${aPos};text-align:${b.textPosition==='center'?'center':b.textPosition==='right'?'right':'left'};background:none;">
            <h2 style="font-size:${hSz};font-weight:800;margin-bottom:4px;line-height:1.3;color:${tClr};text-shadow:0 2px 6px rgba(0,0,0,.5)">${b.headline||''}</h2>
            ${b.subtitle?`<p style="font-size:clamp(.7rem,.88rem,.9rem);margin-bottom:0;line-height:1.5;color:${tClr};opacity:.92">${b.subtitle}</p>`:''}
          </div>`:''}
        </div>`;
      }).join('');
    } else {
      gridEl.style.display='none';
    }

    // ── SLIDER banners ─────────────────────────────────────────────────────────
    // Apply height from first slider banner or store settings
    const bSzVal  = storeSettings&&storeSettings.bannerSizeVal;
    const bSzUnit = storeSettings&&storeSettings.bannerSizeUnit || 'px';
    if(bSzVal) slider.style.height = bSzVal + bSzUnit;
    else if(sliderBans[0]&&sliderBans[0].bannerHeight) slider.style.height = sliderBans[0].bannerHeight+'px';

    if(!sliderBans.length){ slider.style.display='none'; return; }
    slider.style.display='';

    const globalFit = (storeSettings&&storeSettings.bannerFit)||'contain';

    track.innerHTML = sliderBans.map((b,i)=>{
      const fit  = b.objectFit||globalFit;
      const hSz  = ({'xlarge':'3rem','large':'2.4rem','medium':'1.8rem','small':'1.4rem','none':'0'})[b.textSize||(storeSettings&&storeSettings.bannerTextSize)||'large']||'2.4rem';
      // Use per-banner color directly — not inherited from parent (avoids store-level CSS override)
      const tClr = b.textColor||(storeSettings&&storeSettings.bannerTextColor)||'#ffffff';
      const hasBg  = b.bgImage&&b.bgImage.trim();
      const gradBg = b.bgGradient||'linear-gradient(135deg,#1e293b 0%,#f97316 100%)';
      const animClass = b.animation ? 'bn-'+b.animation : '';
      const imgTag = hasBg ? `<img class="banner-img" src="${b.bgImage}" style="object-fit:${fit};" loading="lazy" alt="">` : '';
      const showText = b.textSize !== 'none';

      // Text position — actually move the overlay vertically
      const pos = b.textPosition || (storeSettings&&storeSettings.bannerPos) || 'center';
      let overlayStyle = 'position:absolute;left:0;right:0;display:flex;flex-direction:column;background:none;padding:16px 32px;';
      if(pos==='top')         overlayStyle += 'top:0;bottom:auto;justify-content:flex-start;align-items:center;text-align:center;';
      else if(pos==='bottom') overlayStyle += 'top:auto;bottom:0;justify-content:flex-end;align-items:center;text-align:center;';
      else if(pos==='left')   overlayStyle += 'top:0;bottom:0;justify-content:center;align-items:flex-start;text-align:left;';
      else if(pos==='right')  overlayStyle += 'top:0;bottom:0;justify-content:center;align-items:flex-end;text-align:right;';
      else                    overlayStyle += 'top:0;bottom:0;justify-content:center;align-items:center;text-align:center;'; // center

      return `<div class="hero-slide ${animClass}" style="${hasBg?'background:#1e293b':'background:'+gradBg}">
        ${imgTag}
        ${showText?`<div style="${overlayStyle}z-index:1;">
          <h1 style="font-size:clamp(.85rem,${hSz},${hSz});font-weight:800;color:${tClr};text-shadow:0 2px 8px rgba(0,0,0,.5);margin-bottom:6px;line-height:1.2;font-family:'Poppins',sans-serif;">${b.headline||''}</h1>
          ${b.subtitle?`<p style="color:${tClr};opacity:.92;font-size:clamp(.7rem,.95rem,.95rem);text-shadow:0 1px 4px rgba(0,0,0,.4);margin:0;line-height:1.5;">${b.subtitle}</p>`:''}
        </div>`:''}
      </div>`;
    }).join('');

    dots.innerHTML = sliderBans.map((_,i)=>
      `<button onclick="heroGo(${i})" style="width:10px;height:10px;border-radius:50%;background:${i===0?'#fff':'rgba(255,255,255,.5)'};border:none;cursor:pointer;padding:0;transition:all .3s"></button>`
    ).join('');

    heroIdx = 0;
    if(sliderBans.length>1){ clearInterval(heroTimer); heroTimer=setInterval(heroNext,5000); }
  }catch(e){ console.warn('Banners failed',e); }
}

function heroGo(i){
  heroIdx = i;
  const track = document.getElementById('heroTrack');
  if(track) track.style.transform = `translateX(-${i*100}%)`;
  document.querySelectorAll('#heroDots button').forEach((d,j)=>{
    d.style.background = j===i ? '#fff' : 'rgba(255,255,255,.5)';
    d.style.transform  = j===i ? 'scale(1.3)' : 'scale(1)';
  });
}
function heroNext(){ if(allBanners.length>1) heroGo((heroIdx+1)%allBanners.filter(b=>!b.displayMode||b.displayMode==='slider').length); }
function heroPrev(){ if(allBanners.length>1) heroGo((heroIdx-1+allBanners.filter(b=>!b.displayMode||b.displayMode==='slider').length)%allBanners.filter(b=>!b.displayMode||b.displayMode==='slider').length); }

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
  const price = p.price || 0;
  const origPrice = p.originalPrice || 0;
  const disc=origPrice>price?Math.round((1-price/origPrice)*100):0;
  const stars='&#9733;'.repeat(Math.round(p.rating||0))+'&#9734;'.repeat(5-Math.round(p.rating||0));
  const inW=wishlist.includes(p.id);
  const imgHtml=p.images&&p.images.length
    ?`<img src="${p.images[0].url}" alt="${p.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`
    :`<span style="font-size:4rem">[No Image]</span>`;
  return `<div class="product-card">
    ${p.badge?`<span class="pc-badge ${p.badge}">${p.badge}</span>`:''}
    <button class="pc-wish${inW?' active':''}" onclick="toggleWish(${p.id},event)">${inW?'&#9829;':'&#9825;'}</button>
    <div class="pc-img" onclick="openProduct(${p.id})">${imgHtml}</div>
    <div class="pc-body">
      <div class="pc-brand">${p.brand||''}</div>
      <div class="pc-name" onclick="openProduct(${p.id})">${p.name||''}</div>
      <div class="pc-stars">${stars} <span>(${p.reviewCount||0})</span></div>
      <div class="pc-price">
        <span class="cur">₹${price.toLocaleString('en-IN')}</span>
        ${disc?`<span class="orig">₹${origPrice.toLocaleString('en-IN')}</span><span class="off">${disc}% off</span>`:''}
      </div>
      <div class="pc-btns">
        <button class="btn-cart" onclick="addToCart(${p.id})">Add to Cart</button>
        <button class="btn-buy" onclick="buyNow(${p.id})">Buy Now</button>
      </div>
    </div>
  </div>`;
}

function renderHomeGrids(){
  const featured=allProducts.filter(p=>p.featured).slice(0,10);
  const deals=allProducts.filter(p=>p.badge==='deal').slice(0,10);
  const newA=allProducts.filter(p=>p.badge==='new').slice(0,10);
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
  if(currentQ){
    const q=currentQ;
    list=list.filter(p=>(p.name+' '+p.brand+' '+p.category+' '+(p.description||'')).toLowerCase().includes(q));
  }
  if(currentMin>0) list=list.filter(p=>p.price>=currentMin);
  if(currentMax<Infinity) list=list.filter(p=>p.price<=currentMax);
  if(currentRating>0) list=list.filter(p=>p.rating>=currentRating);
  // Sort
  if(currentSort==='price_asc')  list.sort((a,b)=>a.price-b.price);
  else if(currentSort==='price_desc') list.sort((a,b)=>b.price-a.price);
  else if(currentSort==='rating')     list.sort((a,b)=>(b.rating||0)-(a.rating||0));
  else if(currentSort==='name_asc')   list.sort((a,b)=>a.name.localeCompare(b.name));
  else if(currentSort==='newest')     list.sort((a,b)=>(b.id||0)-(a.id||0));
  else if(currentSort==='discount')   list.sort((a,b)=>{
    const da=a.originalPrice>a.price?Math.round((1-a.price/a.originalPrice)*100):0;
    const db=b.originalPrice>b.price?Math.round((1-b.price/b.originalPrice)*100):0;
    return db-da;
  });
  return list;
}

function renderProducts(){
  const list = getFiltered();
  const pg   = document.getElementById('productsGrid');
  const rc   = document.getElementById('resultCount');
  if(rc) rc.textContent = `${list.length} product${list.length!==1?'s':''}`;

  if(!list.length){
    pg.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--m)"><div style="font-size:3rem">[Search]</div><p>No products found</p></div>';
    return;
  }

  // If filtering/searching a specific category or badge — show flat grid (no grouping)
  const showGrouped = (currentCat==='all' || !currentCat) && !currentBadge && !currentQ;

  if(showGrouped){
    // Group by category and show each as a section
    const catMap = {};
    list.forEach(p=>{
      const c = p.category || 'Other';
      if(!catMap[c]) catMap[c]=[];
      catMap[c].push(p);
    });
    const cats = Object.keys(catMap).sort((a,b)=>{
      // Use same NAV_ORDER logic for consistent section order
      const navOL = ['women','men','kids','fashion','clothing','sarees','kurta','home','kitchen','electronics','mobiles','vehicle','auto','uncategorized','others'];
      const ai = navOL.findIndex(x=>a.toLowerCase().includes(x)||x.includes(a.toLowerCase()));
      const bi = navOL.findIndex(x=>b.toLowerCase().includes(x)||x.includes(b.toLowerCase()));
      const aIdx = ai === -1 ? 999 : ai;
      const bIdx = bi === -1 ? 999 : bi;
      if(aIdx !== bIdx) return aIdx - bIdx;
      return a.localeCompare(b);
    });
    pg.innerHTML = cats.map(cat=>`
      <div class="cat-section" id="cat-${cat.replace(/\s+/g,'-')}">
        <div class="cat-section-hdr">
          <h3 class="cat-section-title">${cat}</h3>
          <span class="cat-section-count">${catMap[cat].length} product${catMap[cat].length!==1?'s':''}</span>
          <button onclick="filterCat('${cat.replace(/'/g,"\\'")}');setSortSelect()" class="cat-see-all">See All →</button>
        </div>
        <div class="products-grid">${catMap[cat].map(p=>productCard(p)).join('')}</div>
      </div>`
    ).join('');
  } else {
    // Flat grid for single category / search / badge
    pg.innerHTML = `<div class="products-grid">${list.map(p=>productCard(p)).join('')}</div>`;
  }
}

function setSortSelect(){
  const sel = document.getElementById('sortSelect');
  if(sel) sel.value = currentSort||'';
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
  const stars='&#9733;'.repeat(Math.round(p.rating||0))+'&#9734;'.repeat(5-Math.round(p.rating||0));
  const out=p.stock===0;
  const mainImg=p.images&&p.images.length?`<img id="mgMainImg" src="${p.images[0].url}" style="width:100%;height:100%;object-fit:contain;cursor:zoom-in" onclick="openLightbox('${p.images[0].url}')">`:`<span style="font-size:6rem">[No Image]</span>`;

  // Show first 3 thumbnails, then "+ N more colours/designs" expandable
  const THUMB_SHOW = 3;
  let thumbs = '';
  if(p.images && p.images.length > 1){
    const allImgs = p.images;
    const visibleImgs = allImgs.slice(0, THUMB_SHOW);
    const hiddenImgs  = allImgs.slice(THUMB_SHOW);
    const thumbItem = (img, i) => `<div class="mg-thumb" style="width:60px;height:60px;border-radius:8px;overflow:hidden;border:2px solid ${i===0?'var(--p)':'var(--b)'};cursor:pointer;flex-shrink:0;transition:border-color .2s" onclick="mgShow('${img.url}',this)"><img src="${img.url}" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div>`;
    const visibleHtml = visibleImgs.map((img,i)=>thumbItem(img,i)).join('');
    const hiddenHtml  = hiddenImgs.length
      ? `<div id="mgExtraThumb" style="display:none;display:flex;flex-wrap:wrap;gap:8px;display:none">${hiddenImgs.map((img,i)=>thumbItem(img,i+THUMB_SHOW)).join('')}</div>
         <button onclick="mgToggleMore(this)" style="margin-top:6px;padding:5px 14px;background:#fff7ed;color:var(--p);border:1.5px solid var(--p);border-radius:20px;font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap">
           🎨 +${hiddenImgs.length} more colours/designs ▾
         </button>`
      : '';
    thumbs = `<div style="margin-top:8px"><div style="display:flex;gap:8px;flex-wrap:wrap">${visibleHtml}</div>${hiddenHtml}</div>`;
  }
  const videos=p.videos&&p.videos.length?`<div style="margin-top:12px"><h4 style="font-size:.8rem;font-weight:700;color:var(--m);margin-bottom:6px">📹 Videos</h4>${p.videos.map(v=>`<video src="${v.url}" controls style="width:100%;border-radius:8px;margin-bottom:6px;max-height:200px"></video>`).join('')}</div>`:'';
  const audios=p.audios&&p.audios.length?`<div style="margin-top:12px"><h4 style="font-size:.8rem;font-weight:700;color:var(--m);margin-bottom:6px">🎵 Audio</h4>${p.audios.map(a=>`<div style="margin-bottom:8px"><div style="font-size:.73rem;color:var(--m);margin-bottom:3px">${a.name}</div><audio src="${a.url}" controls style="width:100%"></audio></div>`).join('')}</div>`:'';
  let revs=[]; try{revs=await fetch(`/api/reviews/${id}`).then(r=>r.json());}catch(e){}
  const revList=revs.length?revs.map(r=>`<div style="border:1px solid var(--b);border-radius:10px;padding:12px;margin-bottom:8px"><div style="display:flex;justify-content:space-between"><strong style="font-size:.83rem">${r.name}</strong><span style="font-size:.72rem;color:var(--m)">${new Date(r.date).toLocaleDateString('en-IN')}</span></div><div style="color:#f59e0b;font-size:.82rem">${'&#9733;'.repeat(r.rating)}${'&#9734;'.repeat(5-r.rating)}</div><p style="font-size:.82rem;margin-top:4px;color:var(--t)">${r.text}</p></div>`).join(''):'<p style="color:var(--m);font-size:.84rem">No reviews yet.</p>';
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
      <div style="margin-bottom:12px">${out?'<span style="color:var(--rd);font-weight:700">Out of Stock</span>':`<span style="color:var(--g);font-weight:700">[OK] In Stock (${p.stock} available)</span>`}</div>
      ${p.description?`<p style="font-size:.84rem;color:var(--m);margin-bottom:14px;line-height:1.6">${p.description}</p>`:''}
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px">
        <button class="btn btn-primary btn-sm" ${out?'disabled style="opacity:.5"':''} onclick="addToCart(${p.id});closeOverlay('productModal')">Add to Cart</button>
        <button class="btn btn-sec btn-sm" ${out?'disabled style="opacity:.5"':''} onclick="buyNow(${p.id});closeOverlay('productModal')">Buy Now</button>
        <button class="btn btn-sec btn-sm" onclick="toggleWish(${p.id})">&#9829; Wishlist</button>
      </div>
      <div style="border-top:1px solid var(--b);padding-top:14px">
        <h4 style="font-size:.9rem;font-weight:700;margin-bottom:10px">Customer Reviews</h4>
        <div>${revList}</div>
        <div style="margin-top:12px;background:var(--bg);border-radius:10px;padding:14px">
          <h5 style="font-size:.82rem;font-weight:700;margin-bottom:8px">Write a Review</h5>
          <input id="rv_name" placeholder="Your name" style="width:100%;padding:8px 12px;border:1.5px solid var(--b);border-radius:7px;font-size:.83rem;margin-bottom:8px;outline:none">
          <div style="display:flex;gap:4px;margin-bottom:8px">${[1,2,3,4,5].map(n=>`<button onclick="setRevStar(${n})" id="rstar${n}" style="font-size:1.4rem;background:none;border:none;cursor:pointer;color:#d1d5db;transition:color .2s">&#9733;</button>`).join('')}</div>
          <textarea id="rv_text" placeholder="Your review…" style="width:100%;padding:8px 12px;border:1.5px solid var(--b);border-radius:7px;font-size:.83rem;min-height:70px;resize:vertical;outline:none;margin-bottom:8px"></textarea>
          <button class="btn btn-primary btn-sm" onclick="submitReview(${p.id})">Submit Review</button>
        </div>
      </div>
    </div>
  </div>`;
}
let _revStar=5;
function setRevStar(n){_revStar=n;[1,2,3,4,5].forEach(i=>{const b=document.getElementById('rstar'+i);if(b)b.style.color=i<=n?'#f59e0b':'#d1d5db';});}
function mgShow(url,el){const img=document.getElementById('mgMainImg');if(img){img.src=url;img.onclick=()=>openLightbox(url);}document.querySelectorAll('.mg-thumb').forEach(x=>{x.style.borderColor='var(--b)';});el.style.borderColor='var(--p)';}

function mgToggleMore(btn){
  const extra = document.getElementById('mgExtraThumb');
  if(!extra) return;
  const isHidden = extra.style.display === 'none' || extra.style.display === '';
  if(isHidden){
    extra.style.display = 'flex';
    extra.style.flexWrap = 'wrap';
    extra.style.gap = '8px';
    extra.style.marginTop = '8px';
    // Count remaining
    const count = extra.querySelectorAll('.mg-thumb').length;
    btn.innerHTML = `🎨 Hide extra colours/designs ▴`;
  } else {
    extra.style.display = 'none';
    const count = extra.querySelectorAll('.mg-thumb').length;
    btn.innerHTML = `🎨 +${count} more colours/designs ▾`;
  }
}
function openLightbox(url){const lb=document.getElementById('lightbox');document.getElementById('lightboxImg').src=url;lb.style.display='flex';}
async function submitReview(pid){
  const name=document.getElementById('rv_name').value.trim(), text=document.getElementById('rv_text').value.trim();
  if(!name||!text){toast('Name and review are required');return;}
  try{const r=await fetch(`/api/reviews/${pid}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,rating:_revStar,text})});if(!r.ok)throw new Error();toast('Review submitted! &#9733;');openProduct(pid);}
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
  saveCart(); updateCartBadge(); toast(`${p.name} added to cart [Cart]`);
}
function removeFromCart(id){cart=cart.filter(x=>x.id!==id);saveCart();updateCartBadge();renderCartBody();}
function changeQty(id,d){const i=cart.find(x=>x.id===id);if(!i)return;if(d>0&&i.qty>=99){toast('Max 99 per item');return;}i.qty=Math.max(1,i.qty+d);saveCart();updateCartBadge();renderCartBody();}
function renderCartBody(){
  const body=document.getElementById('cartBody');
  document.getElementById('cartCount').textContent=cartCount();
  document.getElementById('cartTotal').textContent='₹'+cartTotal().toLocaleString('en-IN',{minimumFractionDigits:2});
  if(!cart.length){body.innerHTML='<div style="text-align:center;padding:48px;color:var(--m)"><div style="font-size:3rem">[Cart]</div><h3 style="margin-top:8px">Cart is empty</h3></div>';return;}
  body.innerHTML=cart.map(i=>`<div class="cart-item">
    <div class="ci-img">${i.image?`<img src="${i.image}" alt="" style="width:100%;height:100%;object-fit:cover">`:'<span style="font-size:1.8rem">[No Image]</span>'}</div>
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
function toggleWish(id,ev){if(ev)ev.stopPropagation();const p=allProducts.find(x=>x.id===id);if(!p)return;if(wishlist.includes(id)){wishlist=wishlist.filter(x=>x!==id);toast('Removed from wishlist');}else{if(wishlist.length>=50){toast('Wishlist full (max 50)');return;}wishlist.push(id);toast(`${p.name} added to wishlist &#9829;`);}saveWish();updateWishBadge();}
function openWishlist(){
  const items=allProducts.filter(p=>wishlist.includes(p.id));
  document.getElementById('wishBody').innerHTML=items.length?`<div class="products-grid">${items.map(p=>productCard(p)).join('')}</div>`:'<div style="text-align:center;padding:48px;color:var(--m)"><div style="font-size:3rem">&#9829;</div><h3 style="margin-top:8px">Wishlist is empty</h3></div>';
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
        ${i.image?`<img src="${i.image}" style="width:44px;height:44px;object-fit:cover;border-radius:6px" alt="">`:'<span style="font-size:1.6rem">[No Image]</span>'}
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
    </div>`).join(''):'<div style="text-align:center;padding:48px;color:var(--m)"><div style="font-size:3rem">[No Image]</div><h3 style="margin-top:8px">No orders yet</h3></div>';
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
  trackVisit(); // record this visit silently

  // Re-fetch page blocks when user returns to this tab (after admin changes)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadPageBlocks();
  });
});

// ── Visitor Tracking ──────────────────────────────────────────────────────────
function trackVisit(){
  try{
    let sid = sessionStorage.getItem('sh_sid');
    if(!sid){ sid = Math.random().toString(36).slice(2)+Date.now().toString(36); sessionStorage.setItem('sh_sid',sid); }
    else return; // already tracked this session

    const ua = navigator.userAgent;
    const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobile'
                 : /Tablet|iPad/i.test(ua) ? 'tablet' : 'desktop';
    const os = /Windows/i.test(ua)?'Windows':/Mac/i.test(ua)?'Mac':/Android/i.test(ua)?'Android':/iPhone|iPad/i.test(ua)?'iOS':/Linux/i.test(ua)?'Linux':'Other';
    const browser = /Edg/i.test(ua)?'Edge':/Chrome/i.test(ua)?'Chrome':/Firefox/i.test(ua)?'Firefox':/Safari/i.test(ua)?'Safari':'Other';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = navigator.language || '';
    const screen = `${window.screen.width}x${window.screen.height}`;

    const baseData = {
      page: window.location.pathname,
      ref:  document.referrer || '',
      ua, device, os, browser, tz, lang, screen,
      sessionId: sid,
    };

    // Client-side geo lookup using ipinfo.io (HTTPS, free, reliable)
    // This runs in the browser so no Render HTTPS restriction
    fetch('https://ipinfo.io/json?token=')
      .then(r=>r.ok?r.json():null)
      .then(geo=>{
        if(geo){
          baseData.country     = geo.country  || '';
          baseData.city        = geo.city      || '';
          baseData.region      = geo.region    || '';
          baseData.countryName = geo.org       || '';
          baseData.ip          = geo.ip        || '';
          baseData.loc         = geo.loc       || ''; // lat,lng
        }
        return fetch('/api/visit',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(baseData) });
      })
      .catch(()=>{
        // If geo fails, still track without location
        fetch('/api/visit',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(baseData) }).catch(()=>{});
      });
  }catch(e){}
}


// extra popup
function openAbout(){openOverlay('aboutPopup');}

// ── Page Builder click action handler ─────────────────────────────────────────
function pbBlockClick(b, imgUrl) {
  if (b.clickAction === 'product' && b.productId) {
    openProduct(b.productId);
  } else if (b.clickAction === 'link' && b.clickLink) {
    window.open(b.clickLink, '_blank');
  } else if (b.clickAction === 'category' && b.clickCat) {
    filterCat(b.clickCat);
    document.getElementById('productsSection') && showProducts();
  } else if (imgUrl) {
    openLightbox(imgUrl);
  }
}

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
        // CLEAN IMAGE BLOCK — no cropping, zoom on hover, click opens lightbox
        const imgW  = s.width  || '100%';
        const imgH  = s.minHeight || '';  // height the user set in admin
        const fit   = s.objectFit || 'contain';
        const rad   = s.borderRadius || '8px';
        const src   = (b.content||'').replace(/'/g,"\\'");

        // The image tag — scales to fit its container, never overflows or crops
        // If height is set:  image fills that height using object-fit
        // If no height set:  image is natural size (width:100%, height:auto) — never crops
        let imgCSS;
        if(imgH){
          imgCSS = `width:100%;height:${imgH};object-fit:${fit};object-position:center;display:block;border-radius:${rad};`;
        } else {
          imgCSS = `width:100%;height:auto;display:block;border-radius:${rad};`;
        }

        // Wrapper: only sets width, background, padding — NO overflow:hidden so zoom is visible
        const wrapCSS = `display:block;width:${imgW};max-width:100%;${imgH?'':''}${s.background?'background:'+s.background+';':''}${s.padding?'padding:'+s.padding+';':''}${s.margin?'margin:'+s.margin+';':''}border-radius:${rad};line-height:0;`;

        const imgTag  = `<img src="${b.content||''}" alt="${b.alt||''}" style="${imgCSS}" loading="lazy" onerror="this.style.display='none'">`;
        // Build click handler — product modal, link, category filter, or lightbox
        const clickFn = b.clickAction==='product'&&b.productId ? `openProduct(${b.productId})`
          : b.clickAction==='link'&&b.clickLink ? `window.open('${b.clickLink}','_blank')`
          : b.clickAction==='category'&&b.clickCat ? `filterCat('${b.clickCat}');showProducts()`
          : `openLightbox('${src}')`;
        const wrapDiv = `<div class="pb-img-zoom" style="${wrapCSS}" onclick="${clickFn}">${imgTag}</div>`;
        const linked  = b.link ? `<a href="${b.link}" target="${b.target||'_self'}" style="display:block;border-radius:${rad};">${wrapDiv}</a>` : wrapDiv;
        const caption = b.alt  ? `<div style="font-size:.85rem;color:#475569;text-align:center;padding:6px 4px;">${b.alt}</div>` : '';
        html=`<div class="${animClass.trim()}" style="${s.textAlign?'text-align:'+s.textAlign:''}${s.opacity?';opacity:'+s.opacity:''}">${linked}${caption}</div>`;
      } else if(b.type==='mixed'){
        let mx={img:'',imgLink:'',video:'',text:'',layout:'img-top'};
        try{ mx=JSON.parse(b.content||'{}'); }catch(e){}
        const rad = s.borderRadius||'8px';
        const imgPart = mx.img ? `<div style="flex:1;min-width:200px">
          <div class="pb-img-zoom" onclick="openLightbox('${mx.img.replace(/'/g,"\\'")}')">
            <img src="${mx.img}" style="width:100%;height:auto;display:block;border-radius:${rad};max-width:100%" loading="lazy">
          </div></div>` : '';
        const textPart = mx.text ? `<div style="flex:1;min-width:200px;${s.color?'color:'+s.color:''};${s.fontSize?'font-size:'+s.fontSize:''}">
          ${mx.text}</div>` : '';
        const videoPart = mx.video ? `<div style="flex:1;min-width:200px">
          <video src="${mx.video}" controls style="width:100%;border-radius:${rad};display:block"></video></div>` : '';
        let inner='';
        if(mx.layout==='img-left')  inner=`<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start">${imgPart}${textPart}${videoPart}</div>`;
        else if(mx.layout==='img-right') inner=`<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start">${textPart}${videoPart}${imgPart}</div>`;
        else if(mx.layout==='text-top')  inner=`${textPart}<div style="margin-top:12px">${imgPart}${videoPart}</div>`;
        else if(mx.layout==='video-top') inner=`${videoPart}<div style="margin-top:12px">${textPart}${imgPart}</div>`;
        else inner=`${mx.imgLink?`<a href="${mx.imgLink}" style="display:block">${imgPart}</a>`:imgPart}<div style="margin-top:12px">${textPart}${videoPart}</div>`; // img-top default
        if(mx.imgLink && mx.layout==='img-top') inner=`<a href="${mx.imgLink}" style="display:block">${imgPart}</a><div style="margin-top:12px">${textPart}${videoPart}</div>`;
        html=`<div class="${animClass.trim()}" style="${styleStr}">${inner}</div>`;
      } else if(b.type==='gallery'){
        // Filter to only valid image URLs (skip any text that got mixed in)
        const urls = (b.content||'').split('\n')
          .map(u=>u.trim())
          .filter(u=>u && (u.startsWith('http')||u.startsWith('/uploads/')));
        const layout = b.alt || 'grid3';
        const imgH   = b.link || '200px';
        const fit    = s.objectFit || 'contain';
        const gap    = s.padding || '8px';
        let gridStyle = '';
        if(layout==='row')    gridStyle=`display:flex;flex-wrap:wrap;gap:${gap};align-items:flex-start`;
        else if(layout==='grid2') gridStyle=`display:grid;grid-template-columns:repeat(2,1fr);gap:${gap}`;
        else if(layout==='grid4') gridStyle=`display:grid;grid-template-columns:repeat(4,1fr);gap:${gap}`;
        else                  gridStyle=`display:grid;grid-template-columns:repeat(3,1fr);gap:${gap}`;
        const rad = s.borderRadius||'6px';
        const imgs = urls.map(url=>{
          const src = url.replace(/'/g,"\\'");
          const clickFn = b.clickAction==='product'&&b.productId ? `openProduct(${b.productId})`
            : b.clickAction==='link'&&b.clickLink ? `window.open('${b.clickLink}','_blank')`
            : b.clickAction==='category'&&b.clickCat ? `filterCat('${b.clickCat}');showProducts()`
            : `openLightbox('${src}')`;
          return `<div class="pb-img-zoom" style="overflow:hidden;border-radius:${rad};cursor:${b.clickAction==='product'?'pointer':'zoom-in'};" onclick="${clickFn}">
            <img src="${url}" style="width:100%;height:${imgH};object-fit:${fit};object-position:center;display:block;border-radius:${rad};" loading="lazy" onerror="this.parentElement.style.display='none'">
          </div>`;
        }).join('');
        // Gallery always fills its wrap — use width:100%, ignore fixed px width from styleStr
        const galleryStyle = Object.entries({
          'background':    s.background,
          'padding':       s.padding,
          'border-radius': s.borderRadius,
          'border':        s.borderWidth&&s.borderStyle?`${s.borderWidth} ${s.borderStyle} ${s.borderColor||'#e2e8f0'}`:null,
          'box-shadow':    s.boxShadow,
          'opacity':       s.opacity,
        }).filter(([,v])=>v).map(([k,v])=>`${k}:${v}`).join(';');
        html=`<div class="${animClass.trim()}" style="width:100%;${galleryStyle}"><div style="${gridStyle}">${imgs}</div></div>`;
      } else if(b.type==='columns'){
        let cols=[];
        try{ cols=JSON.parse(b.content||'[]'); }catch(e){ cols=[b.content||'']; }
        const layout=b.alt||'2';
        let gridCols='1fr 1fr';
        if(layout==='3')   gridCols='1fr 1fr 1fr';
        else if(layout==='4')   gridCols='1fr 1fr 1fr 1fr';
        else if(layout==='2-1') gridCols='2fr 1fr';
        else if(layout==='1-2') gridCols='1fr 2fr';
        const colHtml=cols.map(c=>`<div style="min-width:0;${s.color?'color:'+s.color:''};${s.fontSize?'font-size:'+s.fontSize:''}">${c||''}</div>`).join('');
        html=`<div class="${animClass.trim()}" style="${styleStr};display:grid;grid-template-columns:${gridCols};gap:${s.padding||'16px'};align-items:start">${colHtml}</div>`;
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
      wrap.className='pb-block-wrap';
      wrap.setAttribute('data-bid', b.id||b._id||'');
      wrap.setAttribute('data-scale','1');

      // Apply block-level width to the wrap so blocks can be side by side
      // s.width controls the wrap width (e.g. 50% = 2 per row, 33% = 3 per row)
      const wrapW = s.width || '100%';
      const isPercent = wrapW.includes('%');
      // If width is a percentage — use it as flex-basis so blocks sit side by side
      // If width is px — use max-width so it doesn't overflow
      if(isPercent){
        wrap.style.flex = `0 0 calc(${wrapW} - 8px)`;
        wrap.style.maxWidth = `calc(${wrapW} - 8px)`;
      } else {
        wrap.style.flex = '1';
        wrap.style.minWidth = '0';
        wrap.style.maxWidth = '100%';
        wrap.style.width = '100%';
      }

      // ── Block title + caption shown on store ────────────────────────────────
      const titleHtml = (b.title && b.title !== 'Untitled Block')
        ? `<div style="font-size:1.05rem;font-weight:800;color:#1e293b;padding:8px 4px 6px;font-family:'Poppins',sans-serif;border-bottom:2px solid #f97316;margin-bottom:8px;display:block;">${b.title}</div>` : '';
      const captionHtml = b.caption
        ? `<div style="font-size:.88rem;color:#475569;padding:8px 4px 4px;line-height:1.6;display:block;">${b.caption}</div>` : '';
      wrap.innerHTML = titleHtml + html + captionHtml;

      // ── Per-block zoom toolbar ──────────────────────────────────────────────
      const zoomBar = document.createElement('div');
      zoomBar.className = 'pb-zoom-bar';
      zoomBar.innerHTML = `
        <button class="pb-zoom-btn" title="Zoom In"  onclick="pbZoom(this,0.1)">[Search]+</button>
        <span   class="pb-zoom-val">100%</span>
        <button class="pb-zoom-btn" title="Zoom Out" onclick="pbZoom(this,-0.1)">[Search]−</button>
        <button class="pb-zoom-btn" title="Reset"    onclick="pbZoomReset(this)">↺</button>`;
      wrap.appendChild(zoomBar);

      zone.appendChild(wrap);
    });

    // ── Drag & drop reorder within each zone ─────────────────────────────────
    document.querySelectorAll('.pb-zone').forEach(zone=>{
      const blocks = zone.querySelectorAll('.pb-block-wrap');
      if(blocks.length < 2) return; // nothing to reorder
      let dragSrc = null;
      blocks.forEach(block=>{
        // Add drag handle indicator
        block.style.position = 'relative';
        const grip = document.createElement('div');
        grip.title = 'Drag to reorder';
        grip.style.cssText = 'position:absolute;top:4px;right:4px;z-index:9;background:rgba(0,0,0,.45);color:#fff;border-radius:4px;padding:2px 6px;font-size:.65rem;cursor:grab;user-select:none;opacity:0;transition:opacity .2s;pointer-events:auto;';
        grip.textContent = '⠿ drag';
        block.appendChild(grip);
        block.addEventListener('mouseenter', ()=>{ grip.style.opacity='1'; });
        block.addEventListener('mouseleave', ()=>{ grip.style.opacity='0'; });

        block.setAttribute('draggable','true');
        block.addEventListener('dragstart', e=>{
          dragSrc = block;
          e.dataTransfer.effectAllowed = 'move';
          setTimeout(()=>{ block.style.opacity='0.4'; }, 0);
        });
        block.addEventListener('dragend', ()=>{
          block.style.opacity='1';
          zone.querySelectorAll('.pb-block-wrap').forEach(b2=>{ b2.style.outline=''; b2.style.background=''; });
        });
        block.addEventListener('dragover', e=>{
          e.preventDefault();
          if(block === dragSrc) return;
          block.style.outline='2px dashed #f97316';
          block.style.background='rgba(249,115,22,.05)';
        });
        block.addEventListener('dragleave', e=>{
          if(!block.contains(e.relatedTarget)){
            block.style.outline=''; block.style.background='';
          }
        });
        block.addEventListener('drop', async e=>{
          e.preventDefault();
          block.style.outline=''; block.style.background='';
          if(!dragSrc || dragSrc===block) return;
          // Reorder in DOM immediately
          const parent = block.parentNode;
          const srcIdx  = Array.from(parent.children).indexOf(dragSrc);
          const tgtIdx  = Array.from(parent.children).indexOf(block);
          if(srcIdx < tgtIdx) parent.insertBefore(dragSrc, block.nextSibling);
          else parent.insertBefore(dragSrc, block);
          dragSrc.style.opacity='1';
          // Save new order to server
          const ids = Array.from(parent.querySelectorAll('.pb-block-wrap')).map(w=>w.dataset.bid).filter(Boolean);
          try{
            await fetch('/api/pageblocks/reorder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});
          }catch(err){}
          dragSrc=null;
        });
      });
    });
  }catch(e){console.warn('Page blocks failed',e.message);}
}

// ── Per-block zoom controls ───────────────────────────────────────────────────
function pbZoom(btn, delta) {
  const wrap = btn.closest('.pb-block-wrap');
  if (!wrap) return;
  let scale = parseFloat(wrap.getAttribute('data-scale') || '1');
  scale = Math.min(3, Math.max(0.3, Math.round((scale + delta) * 10) / 10));
  wrap.setAttribute('data-scale', scale);
  wrap.style.transform       = `scale(${scale})`;
  wrap.style.transformOrigin = 'top left';
  wrap.style.marginBottom    = scale > 1 ? `${(scale - 1) * wrap.offsetHeight}px` : '';
  const val = wrap.querySelector('.pb-zoom-val');
  if (val) val.textContent = Math.round(scale * 100) + '%';
}

function pbZoomReset(btn) {
  const wrap = btn.closest('.pb-block-wrap');
  if (!wrap) return;
  wrap.setAttribute('data-scale', '1');
  wrap.style.transform    = '';
  wrap.style.marginBottom = '';
  const val = wrap.querySelector('.pb-zoom-val');
  if (val) val.textContent = '100%';
}

