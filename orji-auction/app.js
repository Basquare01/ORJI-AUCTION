// Simple auction app using localStorage
// Auction app with enhanced UX and validation
(async ()=>{
  // ============ Utilities ============
  const $ = (s, el=document)=> el.querySelector(s);
  const $$ = (s, el=document)=> Array.from(el.querySelectorAll(s));
  const storage = {
    get(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null}},
    set(k,v){localStorage.setItem(k,JSON.stringify(v))}
  };

  // ============ Toast Notifications ============
  function showToast(message, type='info', duration=3000){
    const container = $('#toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(()=>{
      toast.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(()=>toast.remove(), 300);
    }, duration);
  }

  // ============ Hashing ============
  async function hash(text){
    try{
      if(!(window.crypto && window.crypto.subtle)){
        const msg = 'Web Crypto API not available. Serve the site over http(s) (not file://).';
        console.error('CRYPTO ERROR:', msg);
        throw new Error(msg);
      }
      const enc = new TextEncoder();
      const data = enc.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b=>b.toString(16).padStart(2,'0')).join('');
    }catch(err){
      console.error('Hash function error:', err);
      throw err;
    }
  }

  // ============ Seed Demo Data ============
  async function seedIfEmpty(){
    console.log('Checking if users need seeding...');
    let users = storage.get('users');
    
    if(!users || users.length === 0){
      console.log('Seeding users...');
      users = [
        {id:1,email:'admin@123',password:'admin123',role:'admin'},
        {id:2,email:'admin@abu.edu',password:'admin123',role:'admin'},
        {id:3,email:'student@abu.edu',password:'student123',role:'user'}
      ];
      storage.set('users',users);
      console.log('Users seeded successfully:', users.map(u=>({email:u.email, role:u.role})));
    }else{
      console.log('Users already exist:', users.map(u=>({email:u.email, role:u.role})));
    }
    if(!storage.get('auctions')){
      storage.set('auctions',[]);
      console.log('Auctions initialized');
    }
  }
  try{
    await seedIfEmpty();
  }catch(err){
    console.error('Seeding failed:', err);
    try{ showToast('Web Crypto unavailable — open via Live Server or run: python -m http.server 8000', 'warning', 8000); }catch(e){}
    // continue without seeding so the app still loads (user can register manually)
  }

  // ============ Auth Functions ============
  async function register(email, password){
    // Validation
    if(!email || !email.includes('@')) throw new Error('Invalid email address');
    if(password.length < 6) throw new Error('Password must be at least 6 characters');
    
    const users = storage.get('users')||[];
    if(users.find(u=>u.email===email.toLowerCase())) throw new Error('Email already exists');
    
    const id = Date.now();
    users.push({id, email: email.toLowerCase(), password, role:'user'});
    storage.set('users', users);
    storage.set('currentUser', {id, email: email.toLowerCase(), role:'user'});
    return {id, email: email.toLowerCase(), role:'user'};
  }

  async function login(email, password){
    console.log('Login attempt for:', email);
    const users = storage.get('users')||[];
    console.log('Users in storage:', users.length);
    const user = users.find(u=>{
      const emailMatch = u.email.toLowerCase() === email.toLowerCase();
      const passwordMatch = u.password === password;
      console.log(`Checking ${u.email}: email=${emailMatch}, password=${passwordMatch}`);
      return emailMatch && passwordMatch;
    });
    if(!user){
      console.log('User not found or password incorrect');
      throw new Error('Invalid email or password');
    }
    console.log('Login successful for:', user.email);
    storage.set('currentUser', {id:user.id, email:user.email, role:user.role});
    return {id:user.id, email:user.email, role:user.role};
  }

  function logout(){
    storage.set('currentUser', null);
    updateHeader();
    location.reload();
  }

  function getCurrentUser(){
    return storage.get('currentUser');
  }

  // ============ Auction Functions ============
  function getAuctions(){
    return storage.get('auctions')||[];
  }

  function saveAuctions(auctions){
    storage.set('auctions', auctions);
  }

  function createAuction(data){
    const auctions = getAuctions();
    const id = Date.now();
    auctions.unshift({
      id,
      title: data.title,
      description: data.description,
      image: data.image,
      startDate: data.startDate,
      endDate: data.endDate,
      startingPrice: Number(data.startingPrice)||0,
      currentPrice: Number(data.startingPrice)||0,
      highestBidder: null,
      bids: [],
      status: 'active'
    });
    saveAuctions(auctions);
    renderAuctions();
  }

  function placeBid(auctionId, userEmail, amount){
    const auctions = getAuctions();
    const auction = auctions.find(a=>a.id===auctionId);
    if(!auction) throw new Error('Auction not found');
    if(auction.status!=='active') throw new Error('This auction has ended');
    amount = Number(amount);
    if(isNaN(amount) || amount <= 0) throw new Error('Invalid bid amount');
    if(amount <= auction.currentPrice) throw new Error(`Bid must be higher than ₦${auction.currentPrice.toLocaleString()}`);
    
    auction.currentPrice = amount;
    auction.highestBidder = userEmail;
    auction.bids.push({by:userEmail, amount:amount, time:Date.now()});
    saveAuctions(auctions);
    renderAuctions();
  }

  function endAuction(auctionId){
    console.log('Ending auction:', auctionId);
    const auctions = getAuctions();
    const auction = auctions.find(a=>a.id===auctionId);
    if(auction){
      console.log('Found auction, current status:', auction.status);
      auction.status = 'ended';
      console.log('Updated status to:', auction.status);
      saveAuctions(auctions);
      console.log('Auctions saved');
      return true;
    }
    console.log('Auction not found');
    return false;
  }

  // ============ Auto-end Expired Auctions ============
  function sweepEnded(){
    const auctions = getAuctions();
    let changed = false;
    const now = Date.now();
    auctions.forEach(a=>{
      if(a.status==='active' && a.endDate && now > new Date(a.endDate).getTime()){
        a.status = 'ended';
        changed = true;
      }
    });
    if(changed) saveAuctions(auctions);
  }

  setInterval(()=>{
    sweepEnded();
    updateAllTimers();
  }, 1000);

  // ============ Timer Formatting ============
  function formatTimeRemaining(ms){
    if(ms <= 0) return 'Ended';
    const s = Math.floor(ms/1000) % 60;
    const m = Math.floor(ms/60000) % 60;
    const h = Math.floor(ms/3600000) % 24;
    const d = Math.floor(ms/86400000);
    const parts = [];
    if(d) parts.push(d+'d');
    if(h) parts.push(h+'h');
    if(m) parts.push(m+'m');
    if(parts.length > 0) parts.push(s+'s');
    else parts.push(s+'s');
    return parts.join(' ');
  }

  function updateTimer(el){
    const end = el.dataset.end;
    if(!end){el.textContent='No end time'; return}
    const diff = new Date(end).getTime() - Date.now();
    const timeStr = formatTimeRemaining(diff);
    el.textContent = timeStr;
    el.classList.toggle('ended', diff <= 0);
  }

  function updateAllTimers(){
    $$('.timer-display').forEach(t=>updateTimer(t));
  }

  // ============ Render Auctions ============
  function renderAuctions(){
    const container = $('#auctions');
    const emptyState = $('#empty-state');
    if(!container) return;

    const template = document.getElementById('auction-card-template');
    container.innerHTML = '';
    
    const searchEl = $('#search');
    const query = searchEl ? (searchEl.value||'').toLowerCase() : '';
    const filterEl = $('#filter-status');
    const filter = filterEl ? filterEl.value : 'all';
    
    let auctions = getAuctions();
    auctions = auctions.filter(a=>{
      if(filter!=='all' && a.status!==filter) return false;
      if(!query) return true;
      return (a.title||'').toLowerCase().includes(query) || 
             (a.description||'').toLowerCase().includes(query);
    });

    if(auctions.length === 0 && emptyState){
      emptyState.classList.remove('hidden');
      updateUserDashboard();
      return;
    }
    if(emptyState) emptyState.classList.add('hidden');

    auctions.forEach(a=>{
      const el = template.content.cloneNode(true);
      const img = el.querySelector('.card-image');
      img.src = a.image || `https://picsum.photos/seed/${a.id}/400/250?random=${Math.random()}`;
      el.querySelector('.card-title').textContent = a.title;
      el.querySelector('.card-description').textContent = a.description || '—';
      el.querySelector('.card-meta').textContent = `Created: ${new Date(a.startDate||a.id).toLocaleDateString()}`;
      el.querySelector('.current-price').textContent = Number(a.currentPrice).toLocaleString();
      
      const status = el.querySelector('.card-status');
      status.textContent = a.status==='active' ? 'Active' : 'Ended';
      status.classList.toggle('ended', a.status!=='active');
      
      const timer = el.querySelector('.timer-display');
      timer.dataset.end = a.endDate||'';
      updateTimer(timer);
      
      const btn = el.querySelector('.btn-bid-primary');
      btn.disabled = a.status!=='active';
      btn.textContent = a.status==='active' ? 'Place Bid' : 'Auction Ended';
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        openBidPrompt(a.id);
      });
      
      container.appendChild(el);
    });

    updateUserDashboard();
  }

  // ============ Bid Prompt ============
  function openBidPrompt(auctionId){
    const user = getCurrentUser();
    if(!user){
      showToast('Please login to place a bid', 'warning');
      openAuthModal('login');
      return;
    }

    const auctions = getAuctions();
    const auction = auctions.find(a=>a.id===auctionId);
    if(!auction) return;

    const bidAmount = prompt(
      `Place your bid for "${auction.title}"\n\nCurrent bid: ₦${auction.currentPrice.toLocaleString()}\nEnter your bid amount:`
    );
    if(!bidAmount) return;

    try{
      const amount = Number(bidAmount);
      if(isNaN(amount)) throw new Error('Please enter a valid number');
      placeBid(auctionId, user.email, amount);
      showToast('✓ Bid placed successfully!', 'success');
    }catch(e){
      showToast(e.message, 'error');
    }
  }

  // ============ Auth Modal ============
  function openAuthModal(mode='login'){
    const modal = $('#auth-modal');
    if(!modal) return;
    modal.classList.remove('hidden');
    
    const title = $('#auth-title');
    const subtitle = $('#auth-subtitle');
    const submit = $('#auth-submit');
    const prompt = $('#auth-prompt');
    const switchBtn = $('#switch-auth');
    
    if(mode==='login'){
      title.textContent = 'Welcome Back';
      subtitle.textContent = 'Sign in to your ABU Auction account';
      submit.textContent = 'Login';
      prompt.textContent = "Don't have an account?";
      switchBtn.textContent = 'Create one';
    }else{
      title.textContent = 'Create Account';
      subtitle.textContent = 'Join the ABU Auction marketplace';
      submit.textContent = 'Create Account';
      prompt.textContent = 'Already have an account?';
      switchBtn.textContent = 'Sign in';
    }
    
    $('#auth-form').dataset.mode = mode;
  }

  function closeAuthModal(){
    const modal = $('#auth-modal');
    if(modal) modal.classList.add('hidden');
    clearAuthForm();
  }

  function clearAuthForm(){
    const form = $('#auth-form');
    if(form) form.reset();
    $$('.form-error').forEach(el=>el.classList.remove('show'));
  }

  // ============ Header Update ============
  function updateHeader(){
    const user = getCurrentUser();
    const loginBtn = $('#btn-login');
    const userInfo = $('#user-info');
    
    if(!loginBtn) return;
    
    if(user){
      loginBtn.style.display = 'none';
      if(userInfo){
        userInfo.classList.remove('hidden');
        $('#user-email').textContent = user.email;
      }
      const logoutBtn = $('#btn-logout');
      if(logoutBtn){
        logoutBtn.onclick = ()=>logout();
      }
      updateUserDashboard();
    }else{
      loginBtn.style.display = 'inline-flex';
      if(userInfo) userInfo.classList.add('hidden');
      const dashboard = $('#user-dashboard');
      if(dashboard) dashboard.classList.add('hidden');
    }
  }

  function updateUserDashboard(){
    const dashboard = $('#user-dashboard');
    if(!dashboard) return;
    
    const user = getCurrentUser();
    if(!user){
      dashboard.classList.add('hidden');
      return;
    }

    dashboard.classList.remove('hidden');
    $('#dashboard-email').textContent = user.email.split('@')[0];

    const auctions = getAuctions();
    const userBids = [];
    let highestBid = 0;

    auctions.forEach(a=>{
      const bidsPlaced = a.bids.filter(b=>b.by===user.email);
      userBids.push(...bidsPlaced);
      const userHighestBid = bidsPlaced.length > 0 ? Math.max(...bidsPlaced.map(b=>b.amount)) : 0;
      if(userHighestBid > highestBid) highestBid = userHighestBid;
    });

    const activeCount = auctions.filter(a=>a.status==='active').length;

    $('#total-bids').textContent = userBids.length;
    $('#active-count').textContent = activeCount;
    $('#highest-bid').textContent = highestBid > 0 ? '₦' + highestBid.toLocaleString() : '—';
  }

  // ============ Form Validation & Errors ============
  function clearFormError(fieldId){
    const errorEl = $(`#${fieldId}-error`);
    if(errorEl) errorEl.classList.remove('show');
  }

  function showFormError(fieldId, message){
    const errorEl = $(`#${fieldId}-error`);
    if(errorEl){
      errorEl.textContent = message;
      errorEl.classList.add('show');
    }
  }

  // ============ Index Page Init ============
  function wireIndex(){
    const loginBtn = $('#btn-login');
    if(loginBtn){
      loginBtn.addEventListener('click', ()=>openAuthModal('login'));
    }

    const closeBtn = $('#close-modal');
    if(closeBtn){
      closeBtn.addEventListener('click', closeAuthModal);
    }

    const switchBtn = $('#switch-auth');
    if(switchBtn){
      switchBtn.addEventListener('click', ()=>{
        const mode = $('#auth-form').dataset.mode==='login' ? 'register' : 'login';
        openAuthModal(mode);
      });
    }

    const form = $('#auth-form');
    if(form){
      form.addEventListener('submit', async (ev)=>{
        ev.preventDefault();
        const mode = form.dataset.mode || 'login';
        const email = $('#email').value.trim();
        const password = $('#password').value;

        // Clear previous errors
        clearFormError('email');
        clearFormError('password');

        try{
          if(mode==='login'){
            await login(email, password);
            showToast('✓ Logged in successfully!', 'success');
          }else{
            await register(email, password);
            showToast('✓ Account created! Welcome aboard!', 'success');
          }
          closeAuthModal();
          updateHeader();
          renderAuctions();
        }catch(e){
          showToast(e.message, 'error');
          if(e.message.includes('email')) showFormError('email', e.message);
          else if(e.message.includes('password') || e.message.includes('Invalid')) showFormError('password', e.message);
        }
      });
    }

    const searchEl = $('#search');
    if(searchEl) searchEl.addEventListener('input', renderAuctions);
    
    const filterEl = $('#filter-status');
    if(filterEl) filterEl.addEventListener('change', renderAuctions);

    updateHeader();
    renderAuctions();
  }

  // ============ Admin Page Init ============
  async function wireAdmin(){
    console.log('wireAdmin called');
    
    // Hide the login modal
    const adminModal = $('#admin-auth-modal');
    if(adminModal) adminModal.classList.add('hidden');
    
    // Check if already logged in as admin
    let user = getCurrentUser();
    if(user && user.role === 'admin'){
      console.log('Already logged in as admin');
      initAdminDashboard(user);
      return;
    }
    
    // Show password prompt
    const password = prompt('🔐 Enter admin password:');
    
    if(password === null){
      // User cancelled
      location.href = 'index.html';
      return;
    }
    
    if(password === 'admin123'){
      // Correct password
      const tempAdminUser = {id: 999, email: 'admin', role: 'admin'};
      storage.set('currentUser', tempAdminUser);
      showToast('✓ Admin access granted!', 'success');
      initAdminDashboard(tempAdminUser);
    }else{
      // Wrong password
      showToast('❌ Incorrect password', 'error');
      location.href = 'index.html';
    }
  }

  function initAdminDashboard(user){
    $('#admin-email').textContent = user.email;

    const logoutBtn = $('#admin-logout');
    if(logoutBtn){
      logoutBtn.addEventListener('click', ()=>logout());
    }

    const form = $('#create-auction-form');
    if(form){
      form.addEventListener('submit', (ev)=>{
        ev.preventDefault();
        const data = {
          title: $('#a-title').value.trim(),
          description: $('#a-desc').value.trim(),
          image: $('#a-image').value.trim(),
          startDate: $('#a-start').value || new Date().toISOString(),
          endDate: $('#a-end').value,
          startingPrice: Number($('#a-start-price').value)||0
        };
        
        if(!data.title) {showToast('Please enter a title', 'warning'); return}
        if(!data.endDate) {showToast('Please set an end time', 'warning'); return}
        if(data.startingPrice <= 0) {showToast('Starting price must be greater than 0', 'warning'); return}

        try{
          createAuction(data);
          showToast('✓ Auction created successfully!', 'success');
          form.reset();
          renderAdminAuctions();
        }catch(e){
          showToast(e.message, 'error');
        }
      });
    }

    const seedBtn = $('#seed-demo');
    if(seedBtn){
      seedBtn.addEventListener('click', ()=>{
        const now = new Date();
        const auctions = [
          {
            title: '💻 Laptop — Core i5 (8GB RAM)',
            description: 'Well-maintained laptop, excellent condition, original charger included',
            image: 'https://picsum.photos/seed/laptop/400/250',
            startDate: now.toISOString(),
            endDate: new Date(now.getTime() + 3600000).toISOString(),
            startingPrice: 250000
          },
          {
            title: '🚴 Mountain Bike',
            description: 'Professional grade mountain bike, recently serviced',
            image: 'https://picsum.photos/seed/bike/400/250',
            startDate: now.toISOString(),
            endDate: new Date(now.getTime() + 7200000).toISOString(),
            startingPrice: 80000
          },
          {
            title: '📚 Complete Textbook Collection',
            description: '20+ engineering and science textbooks for final year students',
            image: 'https://picsum.photos/seed/books/400/250',
            startDate: now.toISOString(),
            endDate: new Date(now.getTime() + 5400000).toISOString(),
            startingPrice: 15000
          }
        ];
        auctions.forEach(a=>createAuction(a));
        showToast('✓ Demo auctions created!', 'success');
        renderAdminAuctions();
      });
    }

    renderAdminAuctions();
  }

  function renderAdminAuctions(){
    console.log('Rendering admin auctions');
    const container = $('#admin-auctions');
    if(!container) return;
    container.innerHTML = '';

    const auctions = getAuctions();
    console.log('Total auctions:', auctions.length);
    
    if(auctions.length === 0){
      container.innerHTML = '<p style="color: var(--text-secondary);">No auctions yet. Create one to get started!</p>';
      return;
    }

    auctions.forEach(a=>{
      console.log(`Rendering auction: ${a.title} (status: ${a.status})`);
      const item = document.createElement('div');
      item.className = 'auction-item';
      
      // Add a data attribute for status
      item.dataset.status = a.status;
      
      item.innerHTML = `
        <div>
          <div class="auction-item-title">${a.title}</div>
          <div class="auction-item-details">
            <span>Status: <strong style="color: ${a.status === 'ended' ? '#ef4444' : '#10b981'}">${a.status.toUpperCase()}</strong></span> • 
            <span>Bids: <strong>${a.bids.length}</strong></span> • 
            <span>Current: <strong>₦${Number(a.currentPrice).toLocaleString()}</strong></span>
          </div>
          <div class="auction-item-details">Ends: ${a.endDate ? new Date(a.endDate).toLocaleString() : '—'}</div>
        </div>
        <div class="auction-item-actions">
          <button class="btn btn-sm ${a.status === 'ended' ? 'btn-outline' : 'btn-outline'} end-btn" data-id="${a.id}" ${a.status === 'ended' ? 'disabled' : ''}>
            ${a.status === 'ended' ? '✓ Ended' : 'End Auction'}
          </button>
          <button class="btn btn-sm btn-outline bids-btn" data-id="${a.id}">View Bids</button>
        </div>
      `;
      
      const endBtn = item.querySelector('.end-btn');
      if(!endBtn.disabled){
        endBtn.addEventListener('click', (e)=>{
          e.preventDefault();
          e.stopPropagation();
          const auctionId = Number(e.target.dataset.id);
          console.log('End button clicked for auction:', auctionId);
          try{
            const success = endAuction(auctionId);
            if(success){
              console.log('Auction ended successfully, re-rendering');
              showToast('✓ Auction ended successfully!', 'success');
              // Re-render immediately with a small delay to ensure DOM is ready
              setTimeout(()=>{
                renderAdminAuctions();
              }, 100);
            }else{
              showToast('Failed to end auction', 'error');
            }
          }catch(err){
            console.error('Error ending auction:', err);
            showToast('Failed to end auction: ' + err.message, 'error');
          }
        });
      }

      const bidsBtn = item.querySelector('.bids-btn');
      bidsBtn.addEventListener('click', ()=>{
        if(a.bids.length === 0){
          showToast('No bids placed yet', 'info');
          return;
        }
        const list = a.bids
          .sort((x,y)=>y.amount-x.amount)
          .map((b,i)=>`${i+1}. ${b.by} — ₦${Number(b.amount).toLocaleString()} @ ${new Date(b.time).toLocaleString()}`)
          .join('\n');
        alert('Bid History:\n\n'+list);
      });

      container.appendChild(item);
    });
  }

  // ============ Debug Panel (Admin page only) ============
  async function fixUsersWithPasswords(){
    console.log('Fixing users with plain text passwords...');
    try{
      const users = storage.get('users')||[];
      
      users.forEach(u=>{
        if(u.email === 'admin@123' || u.email === 'admin@abu.edu'){
          u.password = 'admin123';
          delete u.pwHash;
        }else if(u.email === 'student@abu.edu'){
          u.password = 'student123';
          delete u.pwHash;
        }
      });
      
      storage.set('users', users);
      console.log('✓ Users fixed:', users.map(u=>({email:u.email, password:u.password})));
      showToast('✓ Users passwords updated!', 'success');
      updateDebugPanel();
    }catch(e){
      console.error('Error fixing users:', e);
      showToast('❌ Failed to fix users: ' + e.message, 'error');
    }
  }

  function updateDebugPanel(){
    if(!location.href.includes('admin.html')) return;
    const currentUser = storage.get('currentUser');
    const users = storage.get('users')||[];
    
    const debugCurrent = $('#debug-current-user');
    const debugUsers = $('#debug-all-users');
    
    if(debugCurrent){
      debugCurrent.textContent = currentUser 
        ? JSON.stringify(currentUser, null, 2)
        : '(null — not logged in)';
    }
    if(debugUsers){
      const usersDisplay = users.map(u=>({
        email: u.email,
        role: u.role,
        password: u.password || '(none)'
      }));
      debugUsers.textContent = usersDisplay.length > 0 
        ? JSON.stringify(usersDisplay, null, 2)
        : '(no users yet)';
    }
  }

  // Initialize debug panel and clear button
  if(location.href.includes('admin.html')){
    updateDebugPanel();
    const clearBtn = $('#clear-storage-btn');
    if(clearBtn){
      clearBtn.addEventListener('click', ()=>{
        if(confirm('⚠️ Clear ALL localStorage? (users, auctions, currentUser)')){
          localStorage.clear();
          updateDebugPanel();
          showToast('✓ localStorage cleared! Reload page.', 'warning', 5000);
          setTimeout(()=>location.reload(), 2000);
        }
      });
    }
    
    // Add fix button
    const fixBtn = document.createElement('button');
    fixBtn.textContent = 'Fix Users Passwords';
    fixBtn.style.cssText = 'width: 100%; padding: 6px; margin-bottom: 8px; margin-top: 8px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 500;';
    const debugPanel = $('#debug-panel');
    if(debugPanel){
      const clearBtnParent = clearBtn.parentNode;
      clearBtnParent.insertBefore(fixBtn, clearBtn.nextSibling);
      fixBtn.addEventListener('click', fixUsersWithPasswords);
    }
    
    // Update debug panel every 2 seconds
    setInterval(updateDebugPanel, 2000);
  }

  // ============ Initialize ============
  if(location.pathname.includes('admin.html') || location.href.includes('admin.html')){
    wireAdmin();
  }else{
    wireIndex();
  }

})();
