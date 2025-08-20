/* admin.js
   - Manage products & coupons
   - Saves products into localStorage key 'mountrush_products' used by shop.js
   - Coupons saved into 'mountrush_promos'
*/

(function(){
  const el = id => document.getElementById(id);
  const readFile = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = ()=> res(r.result);
    r.onerror = ()=> rej(r.error);
    r.readAsText(file);
  });

  // UI refs
  const productJson = el('productJson'), uploadFile = el('uploadFile'), applyProducts = el('applyProducts'),
        exportProducts = el('exportProducts'), productsList = el('productsList'), importSheet = el('importSheet'),
        sheetUrl = el('sheetUrl'), clearOverride = el('clearOverride'), downloadProducts = el('downloadProducts'),
        couponCode = el('couponCode'), couponType = el('couponType'), couponValue = el('couponValue'), createCoupon = el('createCoupon'),
        couponsList = el('couponsList'), pushToServer = el('pushToServer');

  // load current products (if override present)
  function loadProductsFromStorage(){ try{ const p = JSON.parse(localStorage.getItem('mountrush_products') || 'null'); return Array.isArray(p) ? p : []; }catch(e){return [];} }
  function renderProductsList(arr){
    productsList.innerHTML = '';
    (arr||[]).forEach(p=>{
      const node = document.createElement('div'); node.className='product-item';
      node.innerHTML = `<img src="${p.image || 'images/placeholder.png'}" alt=""><div style="flex:1"><strong>${p.title || '(no title)'}</strong><div class="muted">${p.category || ''} • ${p.price ? '₹'+p.price : ''}</div></div><div style="display:flex;flex-direction:column;gap:6px"><button class="btn small" data-id="${p.id}">Edit</button><button class="btn small ghost" data-id="${p.id}">Delete</button></div>`;
      productsList.appendChild(node);
    });
    // bind delete/edit simple behaviors (edit just preloads to textarea)
    productsList.querySelectorAll('.btn').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const id = e.target.dataset.id;
        if(e.target.textContent.trim().toLowerCase()==='delete'){
          if(!confirm('Delete product?')) return;
          let arr = loadProductsFromStorage();
          arr = arr.filter(x=>x.id !== id);
          localStorage.setItem('mountrush_products', JSON.stringify(arr));
          renderProductsList(arr);
          alert('Deleted (saved to local override). Refresh shop to see changes.');
        } else {
          const arr = loadProductsFromStorage();
          const p = arr.find(x=>x.id===id);
          if(p) productJson.value = JSON.stringify(arr, null, 2).replace(/\n/g,'\n');
          // simpler: copy entire array into textarea for bulk edit
          productJson.value = JSON.stringify(arr, null, 2);
        }
      });
    });
  }

  // load coupons
  function loadCoupons(){ try{ const c = JSON.parse(localStorage.getItem('mountrush_promos') || 'null') || {}; return c; }catch(e){ return {}; } }
  function renderCoupons(){
    const coupons = loadCoupons();
    couponsList.innerHTML = '';
    Object.keys(coupons).forEach(code=>{
      const p = coupons[code];
      const row = document.createElement('div'); row.className='coupon-row';
      row.innerHTML = `<strong style="width:110px">${code}</strong><div style="flex:1">${p.type} ${p.type==='percent'?p.value+'%':p.value?'₹'+p.value:''} <span class="muted"> ${p.desc||''}</span></div><button class="btn small" data-code="${code}">Edit</button><button class="btn small ghost" data-code="${code}">Delete</button>`;
      couponsList.appendChild(row);
    });
    couponsList.querySelectorAll('.btn').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const code = e.target.dataset.code;
        if(e.target.textContent.trim().toLowerCase()==='delete'){
          if(!confirm('Delete coupon?')) return;
          const coupons = loadCoupons(); delete coupons[code];
          localStorage.setItem('mountrush_promos', JSON.stringify(coupons));
          renderCoupons();
        } else {
          const coupons = loadCoupons();
          const p = coupons[code];
          couponCode.value = code;
          couponType.value = p.type;
          couponValue.value = p.value || '';
        }
      });
    });
  }

  // Apply products from textarea (expects full array)
  applyProducts.addEventListener('click', ()=>{
    const txt = productJson.value.trim();
    if(!txt) return alert('Paste product array JSON first');
    try{
      const arr = JSON.parse(txt);
      if(!Array.isArray(arr)) throw new Error('Not an array');
      // basic validation: ensure ids
      arr.forEach((p,i)=>{ if(!p.id) p.id = 'p-'+Date.now()+'-'+i; });
      localStorage.setItem('mountrush_products', JSON.stringify(arr));
      renderProductsList(arr);
      alert('Products saved to local override (localStorage). Open shop.html to view.');
    }catch(err){ alert('Invalid JSON: '+err.message); }
  });

  // file upload
  uploadFile.addEventListener('change', async (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    try{
      const txt = await readFile(f);
      const arr = JSON.parse(txt);
      if(!Array.isArray(arr)) throw new Error('Not an array');
      localStorage.setItem('mountrush_products', JSON.stringify(arr));
      renderProductsList(arr);
      alert('Imported products from file and saved to local override.');
    }catch(err){ alert('Import failed: '+err.message); }
  });

  // export products saved in storage OR current products from shop (if none saved)
  exportProducts.addEventListener('click', ()=>{
    const arr = loadProductsFromStorage();
    if(!arr.length) return alert('No override products found. Paste into the textarea first.');
    const blob = new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'products.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  // clear override
  clearOverride.addEventListener('click', ()=>{
    if(!confirm('Clear local product override? This reverts to products.json or fallback.')) return;
    localStorage.removeItem('mountrush_products'); renderProductsList([]); alert('Cleared override.');
  });

  // download (alias of export)
  downloadProducts.addEventListener('click', ()=> exportProducts.click());

  // create coupon
  createCoupon.addEventListener('click', ()=>{
    const code = (couponCode.value||'').trim().toUpperCase();
    if(!code) return alert('Enter code');
    const type = couponType.value;
    const value = couponValue.value ? Number(couponValue.value) : 0;
    const coupons = loadCoupons();
    coupons[code] = { type, value, desc: type==='percent'? `${value}% off` : type==='fixed' ? `₹${value} off` : 'Free shipping' };
    localStorage.setItem('mountrush_promos', JSON.stringify(coupons));
    renderCoupons();
    couponCode.value=''; couponValue.value='';
    alert('Coupon saved (localStorage). Shop will pick it up immediately.');
  });

  // Google Sheets CSV import helper
  async function fetchSheetCSV(csvUrl){
    try{
      const res = await fetch(csvUrl);
      if(!res.ok) throw new Error('Fetch failed: '+res.status);
      const txt = await res.text();
      return parseCSVToProducts(txt);
    }catch(err){ throw err; }
  }

  // Simple CSV parser -> tries to map headers: id,title,category,price,image,desc
  function parseCSVToProducts(csvText){
    const lines = csvText.split(/\r?\n/).filter(Boolean);
    if(!lines.length) return [];
    const header = lines.shift().split(',').map(h=>h.trim().toLowerCase());
    const rows = lines.map(l => {
      // handle quoted fields with simple regex
      const parts = l.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const obj = {};
      parts.forEach((v,i)=> obj[header[i]||i] = (v||'').replace(/^"|"$/g,'').trim());
      return obj;
    });
    // map each row to product
    const mapped = rows.map((r, idx) => {
      // attempt to find price key
      let priceKey = Object.keys(r).find(k=>k.includes('price')) || Object.keys(r).find(k=>k==='price') || 'price';
      let priceVal = Math.round(Number((r[priceKey]||'').replace(/[^\d.-]/g,''))||0);
      return {
        id: r.id || `p-import-${Date.now()}-${idx}`,
        title: r.title || r.name || `Item ${idx+1}`,
        category: r.category || r.type || 'uncategorized',
        price: priceVal,
        image: r.image || r.img || r.photo || 'images/placeholder.png',
        desc: r.desc || r.description || ''
      };
    });
    return mapped;
  }

  // import sheet button
  importSheet.addEventListener('click', async ()=>{
    const url = (sheetUrl.value||'').trim();
    if(!url) return alert('Paste a public CSV URL (File → Publish to web → CSV) from Google Sheets or similar');
    try{
      importSheet.disabled = true;
      importSheet.textContent = 'Fetching...';
      const arr = await fetchSheetCSV(url);
      if(!arr.length) throw new Error('No rows parsed');
      localStorage.setItem('mountrush_products', JSON.stringify(arr));
      renderProductsList(arr);
      alert('Imported products from sheet and saved override.');
    }catch(err){ alert('Import failed: '+err.message); }
    finally{ importSheet.disabled = false; importSheet.textContent = 'Fetch'; }
  });

  // simple pushToServer button (example only)
  pushToServer.addEventListener('click', ()=>{
    alert('This site is static — implement a server endpoint to receive exported JSON. See README for sample Node/Express.');
  });

  // init render
  renderProductsList(loadProductsFromStorage());
  renderCoupons();

})();
