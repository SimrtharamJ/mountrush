/* shop.js
   Dynamic MountRush shop:
   - Loads products from products.json OR optional Google Sheets CSV feed (Admin sets)
   - Cart with promo/tax/shipping and persistence
   - Wishlist
   - Admin-friendly: will respect products stored in localStorage if Admin saved them
   - Animated UI via GSAP and Lottie (empty state)
*/

(() => {
  // CONFIG
  const PRODUCTS_JSON = 'products.json';      // default local file
  const TAX_PERCENT = 5;
  const DEFAULT_SHIPPING = 49;
  const PROMOS_DEFAULT = {
    'MOUNT10': { type: 'percent', value: 10, desc: '10% off subtotal' },
    'FREESHIP': { type: 'freeship', value: 0, desc: 'Free shipping' }
  };

  // DOM helpers
  const el = (id) => document.getElementById(id);
  const can = (x) => !!x;
  const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const fmt = (n) => currency.format(Math.round(n || 0));

  // DOM refs
  const grid = el('grid'), searchEl = el('search'), categorySelect = el('categoryFilter'), sortSelect = el('sortBy'),
        cartToggle = el('cartToggle'), cartCount = el('cartCount'), cartSidebar = el('cartSidebar'),
        cartItemsEl = el('cartItems'), subtotalEl = el('subtotal'), discountEl = el('discount'),
        taxEl = el('tax'), taxPctEl = el('taxPct'), shippingEl = el('shipping'), grandTotalEl = el('grandTotal'),
        promoCodeInput = el('promoCode'), applyPromoBtn = el('applyPromo'), promoMsg = el('promoMsg'),
        clearCartBtn = el('clearCart'), checkoutBtn = el('checkoutBtn'),
        wishlistListEl = el('wishlistList'), emptyLottieContainer = el('emptyLottie'), emptyState = el('emptyState'),
        productModal = el('productModal'), closeProductBtn = el('closeProduct'), modalImg = el('modalImg'),
        productTitle = el('productTitle'), productDesc = el('productDesc'), qtyInput = el('qty'), addToCartModalBtn = el('addToCartModal'),
        wishlistToggle = el('wishlistToggle'), checkoutModal = el('checkoutModal'), closeCheckout = el('closeCheckout'),
        miniCartCount = el('miniCartCount');

  // State (persisted where useful)
  let PRODUCTS = [];                                   // product list
  let PROMOS = JSON.parse(localStorage.getItem('mountrush_promos') || 'null') || PROMOS_DEFAULT;
  let CART = JSON.parse(localStorage.getItem('mountrush_cart') || '{}');
  let WISHLIST = JSON.parse(localStorage.getItem('mountrush_wishlist') || '[]');
  let ACTIVE_PROMO = JSON.parse(localStorage.getItem('mountrush_promo') || 'null');
  taxPctEl && (taxPctEl.textContent = String(TAX_PERCENT));
  shippingEl && (shippingEl.textContent = fmt(DEFAULT_SHIPPING));

  // Utility save
  function saveState(){ localStorage.setItem('mountrush_cart', JSON.stringify(CART)); localStorage.setItem('mountrush_wishlist', JSON.stringify(WISHLIST)); localStorage.setItem('mountrush_promos', JSON.stringify(PROMOS)); localStorage.setItem('mountrush_promo', JSON.stringify(ACTIVE_PROMO)); }

  // Fetch products strategy:
  // 1) If Admin stored products in localStorage under 'mountrush_products' use it.
  // 2) Else try products.json (local).
  // 3) Else fallback embedded sample.
  async function fetchProducts() {
    // 1: admin-provided
    const adminProducts = JSON.parse(localStorage.getItem('mountrush_products') || 'null');
    if (adminProducts && Array.isArray(adminProducts) && adminProducts.length) {
      PRODUCTS = adminProducts;
      return;
    }
    // 2: try file
    try {
      const r = await fetch(PRODUCTS_JSON, {cache:'no-cache'});
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j) && j.length) { PRODUCTS = j; return; }
      }
    } catch(e){ /* ignore */ }
    // 3: fallback
    PRODUCTS = [
      { id: 'p-tent-01', title: 'Summit 2P Tent', category: 'camping', price: 8499, image: 'images/tent.jpg', desc: 'Ultra-light 2-person tent, waterproof, compact.' },
      { id: 'p-stove-01', title: 'Trail Compact Stove', category: 'camping', price: 2499, image: 'images/stove.jpg', desc: 'Gas canister stove with wind guard.' },
      { id: 'p-boots-01', title: 'Alpine Hiker Boots', category: 'hiking', price: 6999, image: 'images/boots.jpg', desc: 'Waterproof boots with durable grip.' },
      { id: 'p-pack-01', title: 'Voyager 45L Pack', category: 'gear', price: 4999, image: 'images/pack.jpg', desc: 'Comfort-fit trekking pack with rain cover.' }
    ];
  }

  // Create product card element
  function createProductCard(p) {
    const card = document.createElement('article'); card.className = 'product'; card.setAttribute('draggable','true'); card.dataset.id = p.id;
    card.innerHTML = `
      <div class="badge">${p.category}</div>
      <div class="thumb"><img loading="lazy" src="${p.image}" alt="${p.title}"></div>
      <h3>${p.title}</h3>
      <div class="meta"><div class="price">${fmt(p.price)}</div><div class="muted">In stock</div></div>
      <div class="actions">
        <button class="action-btn view" data-id="${p.id}">View</button>
        <button class="action-btn add" data-id="${p.id}">Add</button>
        <button class="action-btn wish" data-id="${p.id}">♡</button>
      </div>
    `;
    // Events
    const viewBtn = card.querySelector('.view'), addBtn = card.querySelector('.add'), wishBtn = card.querySelector('.wish');
    viewBtn && viewBtn.addEventListener('click', ()=> openModalFor(p));
    addBtn && addBtn.addEventListener('click', (ev)=> addToCart(p.id,1,ev.target));
    wishBtn && wishBtn.addEventListener('click', ()=> toggleWishlist(p));
    // hover tilt
    try {
      card.addEventListener('mousemove', (e)=>{
        const r = card.getBoundingClientRect();
        const dx = ((e.clientX - r.left)/r.width - 0.5)*10;
        const dy = ((e.clientY - r.top)/r.height - 0.5)*6;
        gsap.to(card, { rotationY: dx, rotationX: -dy, scale:1.02, duration:0.45, ease:'power3.out' });
      });
      ['mouseleave','blur'].forEach(ev => card.addEventListener(ev, ()=> gsap.to(card, { rotationY:0, rotationX:0, scale:1, duration:0.8, ease:'power3.out' })));
    } catch(e){}
    // drag
    card.addEventListener('dragstart', (ev)=>{ try{ ev.dataTransfer.setData('text/plain', p.id); }catch(e){} card.classList.add('dragging');});
    card.addEventListener('dragend', ()=> card.classList.remove('dragging'));
    return card;
  }

  function renderGrid(list) {
    if (!can(grid)) return;
    grid.innerHTML = '';
    if (!list.length) {
      emptyState && emptyState.classList.remove('hidden');
      emptyState && emptyState.setAttribute('aria-hidden','false');
    } else {
      emptyState && emptyState.classList.add('hidden');
      emptyState && emptyState.setAttribute('aria-hidden','true');
      list.forEach((p,i)=> {
        const card = createProductCard(p);
        grid.appendChild(card);
      });
      // entrance anim
      try { gsap.utils.toArray('.product').forEach((c,i)=> gsap.fromTo(c,{y:18,opacity:0},{y:0,opacity:1,duration:0.7,delay:i*0.03,ease:'power3.out'})); }catch(e){}
    }
  }

  // Filtering & sorting
  function getFiltered() {
    const q = (searchEl && searchEl.value || '').trim().toLowerCase();
    const cat = (categorySelect && categorySelect.value) || 'all';
    let list = PRODUCTS.slice();
    if (cat !== 'all') list = list.filter(p=>p.category===cat);
    if (q) list = list.filter(p => (p.title + ' ' + p.desc + ' ' + p.category).toLowerCase().includes(q));
    const sort = sortSelect && sortSelect.value;
    if (sort === 'price-asc') list.sort((a,b)=>a.price-b.price);
    else if (sort === 'price-desc') list.sort((a,b)=>b.price-a.price);
    else if (sort === 'popular') list.sort((a,b)=>b.price-a.price);
    return list;
  }

  // Initialize categories dropdown
  function initCategories() {
    if (!can(categorySelect)) return;
    const cats = Array.from(new Set(PRODUCTS.map(p=>p.category)));
    cats.forEach(c => {
      const opt = document.createElement('option'); opt.value = c; opt.textContent = c[0].toUpperCase()+c.slice(1);
      categorySelect.appendChild(opt);
    });
  }

  // Cart logic
  function addToCart(id, qty=1, triggerEl=null) {
    const prod = PRODUCTS.find(p=>p.id===id); if(!prod) return;
    if (!CART[id]) CART[id] = {...prod, qty:0};
    CART[id].qty = (CART[id].qty || 0) + Math.max(1, Number(qty));
    saveState();
    updateCartUI();
    // fly animation
    if (triggerEl && prod.image) {
      const img = document.createElement('img'); img.src = prod.image; img.style.position='fixed'; img.style.width='80px'; img.style.height='60px'; img.style.objectFit='cover';
      const rect = triggerEl.getBoundingClientRect(); img.style.left = rect.left + 'px'; img.style.top = rect.top + 'px'; img.style.zIndex=9999; document.body.appendChild(img);
      const cartBtnRect = cartToggle ? cartToggle.getBoundingClientRect() : {left: window.innerWidth-40, top:20};
      gsap.to(img, {duration:0.9, x: cartBtnRect.left - rect.left, y: cartBtnRect.top - rect.top, scale:0.2, opacity:0.7, ease:'power3.inOut', onComplete: ()=> { img.remove(); pulseCart(); }});
    } else pulseCart();
  }
  function removeFromCart(id){ delete CART[id]; saveState(); updateCartUI(); }
  function updateCartUI(){
    if(!can(cartItemsEl) || !can(cartCount)) return;
    const items = Object.values(CART);
    const count = items.reduce((s,i)=> s + (i.qty||0), 0);
    cartCount.textContent = String(count); miniCartCount && (miniCartCount.textContent = `${count} items`);
    cartItemsEl.innerHTML = '';
    if (!items.length) { cartItemsEl.innerHTML = '<div style="color:var(--muted);padding:12px">Your cart is empty</div>'; }
    else {
      items.forEach(item => {
        const row = document.createElement('div'); row.className='cart-row';
        row.innerHTML = `<img src="${item.image}" alt="${item.title}"><div style="flex:1"><div style="font-weight:800">${item.title}</div><div style="color:var(--muted);font-size:13px">${fmt(item.price)}</div></div><div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end"><input class="qty-input" type="number" min="1" value="${item.qty}" data-id="${item.id}"><button class="btn small ghost remove" data-id="${item.id}">Remove</button></div>`;
        cartItemsEl.appendChild(row);
      });
    }
    // bind qty & remove
    cartItemsEl.querySelectorAll('.qty-input').forEach(inp=>inp.addEventListener('change', (e)=> { const id = e.target.dataset.id; const v = Math.max(1, Math.floor(Number(e.target.value)||1)); if(CART[id]) CART[id].qty = v; saveState(); updateCartUI(); }));
    cartItemsEl.querySelectorAll('.remove').forEach(btn=>btn.addEventListener('click', (e)=> removeFromCart(e.target.dataset.id)));

    // totals
    const subtotal = items.reduce((s,i)=> s + (i.price * i.qty), 0);
    let discount = 0;
    if (ACTIVE_PROMO) {
      if (ACTIVE_PROMO.type === 'percent') discount = Math.round(subtotal * (ACTIVE_PROMO.value/100));
      else if (ACTIVE_PROMO.type === 'fixed') discount = ACTIVE_PROMO.value;
    }
    const taxable = Math.max(0, subtotal - discount);
    const tax = Math.round(taxable * (TAX_PERCENT/100));
    let shipping = items.length ? DEFAULT_SHIPPING : 0;
    if (ACTIVE_PROMO && ACTIVE_PROMO.type === 'freeship') shipping = 0;
    const grand = Math.max(0, taxable + tax + shipping);
    subtotalEl && (subtotalEl.textContent = fmt(subtotal));
    discountEl && (discountEl.textContent = '-' + fmt(discount));
    taxEl && (taxEl.textContent = fmt(tax));
    shippingEl && (shippingEl.textContent = fmt(shipping));
    grandTotalEl && (grandTotalEl.textContent = fmt(grand));
  }

  function pulseCart(){ if(!can(cartToggle)) return; try{ gsap.fromTo(cartToggle,{scale:1},{scale:1.06,duration:0.12,yoyo:true,repeat:1}); }catch(e){} }

  // Wishlist
  function toggleWishlist(prod){ const idx = WISHLIST.indexOf(prod.id); if(idx===-1) WISHLIST.push(prod.id); else WISHLIST.splice(idx,1); saveState(); renderWishlist(); }
  function renderWishlist(){ if(!can(wishlistListEl)) return; if(!WISHLIST.length) return wishlistListEl.textContent = 'No wishlist items yet'; wishlistListEl.innerHTML = ''; WISHLIST.forEach(id=>{ const p = PRODUCTS.find(x=>x.id===id); if(!p) return; const row = document.createElement('div'); row.style.padding='6px 0'; row.innerHTML = `<strong>${p.title}</strong> • ${fmt(p.price)}`; wishlistListEl.appendChild(row); }); }

  // Promo
  function applyPromo(code){ if(!code){ promoMsg && (promoMsg.textContent = 'Enter a promo code'); return; } const up = code.trim().toUpperCase(); if(PROMOS[up]){ ACTIVE_PROMO = { code: up, ...PROMOS[up] }; promoMsg && (promoMsg.textContent = `Applied ${up} — ${PROMOS[up].desc}`); saveState(); updateCartUI(); } else { ACTIVE_PROMO = null; promoMsg && (promoMsg.textContent = 'Invalid promo code'); saveState(); updateCartUI(); } }

  // Modal
  let activeProduct = null;
  function openModalFor(prod){ activeProduct = prod; if(productModal) productModal.classList.add('open'); modalImg && (modalImg.src = prod.image || ''); productTitle && (productTitle.textContent = prod.title || ''); productDesc && (productDesc.textContent = prod.desc || ''); qtyInput && (qtyInput.value = 1); wishlistToggle && (wishlistToggle.textContent = WISHLIST.includes(prod.id) ? '♥ In wishlist' : '♡ Wishlist'); }
  function closeModal(){ productModal && productModal.classList.remove('open'); activeProduct=null; }

  // Checkout (simulated)
  function checkout(){ const items = Object.values(CART); if(!items.length){ alert('Cart is empty'); return; } CART = {}; saveState(); updateCartUI(); closeCart(); if(checkoutModal) checkoutModal.classList.add('open'); }

  // Drag receiver
  function setupDragReceiver(){
    if(!can(cartSidebar)) return;
    cartSidebar.addEventListener('dragover', (e)=> e.preventDefault());
    cartSidebar.addEventListener('drop', (e)=> { e.preventDefault(); try{ const id = e.dataTransfer.getData('text/plain'); if(id) addToCart(id,1); }catch(e){} });
  }

  // Lottie empty
  function initEmptyLottie(){ if(!can(emptyLottieContainer) || !can(window.lottie)) return; try{ lottie.loadAnimation({ container: emptyLottieContainer, renderer:'svg', loop:true, autoplay:true, path:'https://assets8.lottiefiles.com/packages/lf20_qtsqgr7d.json' }); }catch(e){} }

  // Bind UI
  function bindUI(){
    if (searchEl) searchEl.addEventListener('input', ()=> renderGrid(getFiltered()));
    if (categorySelect) categorySelect.addEventListener('change', ()=> renderGrid(getFiltered()));
    if (sortSelect) sortSelect.addEventListener('change', ()=> renderGrid(getFiltered()));
    if (applyPromoBtn) applyPromoBtn.addEventListener('click', ()=> applyPromo(promoCodeInput.value || ''));
    if (cartToggle) cartToggle.addEventListener('click', ()=> toggleCart());
    if (clearCartBtn) clearCartBtn.addEventListener('click', ()=> { CART = {}; saveState(); updateCartUI(); });
    if (checkoutBtn) checkoutBtn.addEventListener('click', checkout);
    if (closeProductBtn) closeProductBtn.addEventListener('click', closeModal);
    if (addToCartModalBtn) addToCartModalBtn.addEventListener('click', ()=> { if(activeProduct) addToCart(activeProduct.id, Number(qtyInput.value||1), addToCartModalBtn), closeModal(); });
    if (wishlistToggle) wishlistToggle.addEventListener('click', ()=> { if(activeProduct) toggleWishlist(activeProduct); });
    if (closeCheckout) closeCheckout.addEventListener('click', ()=> checkoutModal && checkoutModal.classList.remove('open'));
    // chips
    document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', ()=> { const f = c.dataset.filter; if(searchEl) searchEl.value = f; renderGrid(getFiltered()); }));
    // season pick
    const seasonBtn = document.getElementById('seasonWinter'); seasonBtn && seasonBtn.addEventListener('click', ()=> { if(categorySelect) categorySelect.value = 'camping'; if(searchEl) searchEl.value = 'snow'; renderGrid(getFiltered()); gsap.fromTo('.promo-card',{y:-6,opacity:0.9},{y:0,opacity:1,duration:0.6,ease:'power2.out'}); });
    // drag
    setupDragReceiver();
    // close cart when clicking outside
    document.addEventListener('click', (e)=> { const target = e.target; if(!cartSidebar || !cartSidebar.classList.contains('open')) return; if(!cartSidebar.contains(target) && target !== cartToggle) closeCart(); });
  }

  function toggleCart(){ if(!can(cartSidebar)) return; if(cartSidebar.classList.contains('open')) closeCart(); else openCart(); }
  function openCart(){ cartSidebar.classList.add('open'); cartSidebar.setAttribute('aria-hidden','false'); }
  function closeCart(){ cartSidebar.classList.remove('open'); cartSidebar.setAttribute('aria-hidden','true'); }

  // Get filtered wrapper bound to DOM elements (call after fetch)
  function getFiltered(){ return getFiltered; } // placeholder
  function defineGetFiltered(){ getFiltered = function(){ const q = (searchEl && searchEl.value || '').trim().toLowerCase(); const cat = (categorySelect && categorySelect.value) || 'all'; let list = PRODUCTS.slice(); if(cat!=='all') list = list.filter(p=> p.category===cat); if(q) list = list.filter(p => (p.title+' '+p.desc+' '+p.category).toLowerCase().includes(q)); const sort = sortSelect && sortSelect.value; if(sort==='price-asc') list.sort((a,b)=>a.price-b.price); else if(sort==='price-desc') list.sort((a,b)=>b.price-a.price); else if(sort==='popular') list.sort((a,b)=>b.price-a.price); return list; }; }

  // Init
  async function init(){
    await fetchProducts();
    defineGetFiltered();
    initCategories();
    renderGrid(PRODUCTS);
    updateCartUI();
    renderWishlist();
    initEmptyLottie();
    bindUI();
    try{ gsap.from('.sr-header', { y:-10, opacity:0, duration:0.7, ease:'power3.out' }); }catch(e){}
    trackEvent('shop_view',{});
  }

  // Analytics stub
  function trackEvent(name, payload={}){ try{ navigator.sendBeacon && navigator.sendBeacon('/analytics', JSON.stringify({ name, payload, ts: Date.now() })); }catch(e){} console.log('analytics', name, payload); }

  // Start app
  init();

  // Expose small API for Admin page or debugging
  window.MOUNTRUSH_SHOP = {
    getProducts: ()=> PRODUCTS,
    setProducts: (arr)=> { if(Array.isArray(arr)){ localStorage.setItem('mountrush_products', JSON.stringify(arr)); PRODUCTS = arr; init(); } },
    clearProductsOverride: ()=> { localStorage.removeItem('mountrush_products'); location.reload(); },
    PROMOS, saveState
  };
})();
