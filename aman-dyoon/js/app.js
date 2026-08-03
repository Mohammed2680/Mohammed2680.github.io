/* =========================================================
   أمان للديون — منطق التطبيق
   ========================================================= */

let currentClientId = null;
let currentInvoiceTx = null;
let homeChartInst = null, reportChartInst = null;

/* ---------------- أدوات مساعدة عامة ---------------- */
function fmt(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: v % 1 !== 0 ? 2 : 0 });
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}
function openSheet(id) { document.getElementById(id).classList.remove('app-hidden'); }
function closeSheet(id) { document.getElementById(id).classList.add('app-hidden'); }
function avatarColor(name) {
  const colors = ['#0B2A5B', '#1E9E5A', '#C97A1E', '#2D6CDF', '#7A3FC9'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
}
function initials(name) { return (name || '؟').trim().charAt(0); }
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}
function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}
function relativeTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return formatDate(iso);
}

/* ---------------- التنقل بين الصفحات ---------------- */
function navigate(page) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.add('app-hidden'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.remove('app-hidden');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-btn[data-nav="${page}"]`);
  if (navBtn) navBtn.classList.add('active');
  window.scrollTo(0, 0);

  if (page === 'home') renderHome();
  if (page === 'clients') renderClients();
  if (page === 'reports') renderReports('day');
  if (page === 'settings') renderSettings();
  if (page === 'add-debt') prepareAddDebt();
}
document.querySelectorAll('[data-nav]').forEach(el => {
  el.addEventListener('click', () => navigate(el.getAttribute('data-nav')));
});

/* ==================================================================
   المصادقة (محاكاة محلية — يمكن استبدالها لاحقًا بـ Firebase Auth)
   ================================================================== */
const AUTH_KEY = 'aman_dyoon_session';

function initAuth() {
  const session = localStorage.getItem(AUTH_KEY);
  if (session) enterApp(); else showAuth();

  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.tab === 'login';
      document.getElementById('loginForm').classList.toggle('app-hidden', !isLogin);
      document.getElementById('signupForm').classList.toggle('app-hidden', isLogin);
    });
  });

  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    localStorage.setItem(AUTH_KEY, JSON.stringify({ email, remember: document.getElementById('rememberMe').checked }));
    enterApp();
  });

  document.getElementById('signupForm').addEventListener('submit', e => {
    e.preventDefault();
    const business = document.getElementById('suBusiness').value.trim();
    const email = document.getElementById('suEmail').value.trim();
    if (business) Store.updateSettings({ businessName: business });
    localStorage.setItem(AUTH_KEY, JSON.stringify({ email }));
    showToast('تم إنشاء الحساب ومزامنة البيانات');
    enterApp();
  });

  document.getElementById('googleBtn').addEventListener('click', () => {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ email: 'google-user' }));
    enterApp();
  });
  document.getElementById('guestBtn').addEventListener('click', () => {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ email: 'زائر' }));
    enterApp();
  });
  document.getElementById('forgotPassBtn').addEventListener('click', e => {
    e.preventDefault();
    showToast('تم إرسال رابط استعادة كلمة المرور إلى بريدك (محاكاة)');
  });
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem(AUTH_KEY);
    showAuth();
  });
}
function showAuth() {
  document.getElementById('authScreen').classList.remove('app-hidden');
  document.getElementById('appShell').classList.add('app-hidden');
}
function enterApp() {
  document.getElementById('authScreen').classList.add('app-hidden');
  document.getElementById('appShell').classList.remove('app-hidden');
  applyTheme();
  navigate('home');
}

/* ==================================================================
   الوضع الليلي
   ================================================================== */
function applyTheme() {
  const theme = Store.getSettings().theme || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = document.getElementById('darkModeToggle');
  if (toggle) toggle.checked = theme === 'dark';
}
document.getElementById('darkModeToggle').addEventListener('change', e => {
  Store.updateSettings({ theme: e.target.checked ? 'dark' : 'light' });
  applyTheme();
  renderHome();
});

/* ==================================================================
   الصفحة الرئيسية
   ================================================================== */
function renderHome() {
  const settings = Store.getSettings();
  document.getElementById('brandName').textContent = settings.businessName;
  document.getElementById('homeCurrency').textContent = settings.currency;
  const stats = Store.getDashboardStats();
  document.getElementById('homeTotalDebit').innerHTML = `${fmt(stats.totalDebit)} <small>${settings.currency}</small>`;
  document.getElementById('creditChip').innerHTML = `<span class="material-symbols-rounded" style="font-size:15px">savings</span> رصيد دائن: ${fmt(stats.totalCredit)}`;
  document.getElementById('statTodaySales').textContent = fmt(stats.todaySales);
  document.getElementById('statTodayCollected').textContent = fmt(stats.todayCollected);

  const recentWrap = document.getElementById('homeRecentList');
  const recent = Store.getRecentTransactions(6);
  if (!recent.length) {
    recentWrap.innerHTML = `<div class="empty-state"><span class="material-symbols-rounded">receipt_long</span><div>لا توجد معاملات بعد</div></div>`;
  } else {
    recentWrap.innerHTML = recent.map(t => {
      const client = Store.getClient(t.clientId);
      const amount = t.type === 'payment' ? t.amount : t.totalAfterDiscount;
      const isPayment = t.type === 'payment';
      return `
        <div class="list-card" data-open-client="${t.clientId}">
          <div class="lc-info">
            <div class="avatar" style="background:${avatarColor(client?.name || '؟')}22;color:${avatarColor(client?.name || '؟')}">${initials(client?.name)}</div>
            <div><div class="lc-name">${client?.name || 'عميل محذوف'}</div><div class="lc-sub">${relativeTime(t.date)}</div></div>
          </div>
          <div class="lc-amount">
            <div class="amt ${isPayment ? 'credit' : 'debit'}">${fmt(amount)} ${settings.currency}</div>
            <span class="badge ${isPayment ? 'paid' : 'pending'}">${isPayment ? 'تسديد' : 'دين جديد'}</span>
          </div>
        </div>`;
    }).join('');
  }
  recentWrap.querySelectorAll('[data-open-client]').forEach(el => {
    el.addEventListener('click', () => openClientDetail(el.dataset.openClient));
  });

  drawHomeChart();
}

function drawHomeChart() {
  const ctx = document.getElementById('homeChart');
  if (!ctx) return;
  const labels = [], sales = [], collections = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('ar-EG', { weekday: 'short' }));
    const dayStr = d.toDateString();
    const txs = Store.getTransactions();
    sales.push(txs.filter(t => t.type !== 'payment' && new Date(t.date).toDateString() === dayStr).reduce((s, t) => s + t.totalAfterDiscount, 0));
    collections.push(txs.filter(t => t.type === 'payment' && new Date(t.date).toDateString() === dayStr).reduce((s, t) => s + t.amount, 0));
  }
  if (homeChartInst) homeChartInst.destroy();
  const styles = getComputedStyle(document.documentElement);
  homeChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'مبيعات', data: sales, borderColor: styles.getPropertyValue('--primary'), backgroundColor: 'transparent', tension: .4 },
        { label: 'تحصيل', data: collections, borderColor: styles.getPropertyValue('--success'), backgroundColor: 'transparent', tension: .4 }
      ]
    },
    options: { plugins: { legend: { labels: { color: styles.getPropertyValue('--text') } } }, scales: { x: { ticks: { color: styles.getPropertyValue('--text-muted') } }, y: { ticks: { color: styles.getPropertyValue('--text-muted') } } } }
  });
}

document.getElementById('qaNewDebt').addEventListener('click', () => navigate('add-debt'));
document.getElementById('qaNewClient').addEventListener('click', () => openNewClientSheet());

/* ==================================================================
   العملاء
   ================================================================== */
let clientFilter = 'all';
function renderClients() {
  const settings = Store.getSettings();
  const stats = Store.getDashboardStats();
  document.getElementById('clientsTotal').innerHTML = `${fmt(stats.totalDebit)} <small>${settings.currency}</small>`;

  const searchVal = (document.getElementById('clientSearch').value || '').trim();
  let clients = Store.getClients().filter(c => !c.archived);
  if (searchVal) clients = clients.filter(c => c.name.includes(searchVal) || (c.phone || '').includes(searchVal));

  const withBalance = clients.map(c => ({ c, balance: Store.getClientBalance(c.id) }));

  let filtered = withBalance;
  if (clientFilter === 'debtors') filtered = withBalance.filter(x => x.balance > 0);
  if (clientFilter === 'paid') filtered = withBalance.filter(x => x.balance === 0);
  if (clientFilter === 'late') filtered = withBalance.filter(x => x.balance > 0 && isLate(x.c.id));

  const list = document.getElementById('clientsList');
  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><span class="material-symbols-rounded">group_off</span><div>لا يوجد عملاء مطابقون</div></div>`;
    return;
  }
  list.innerHTML = filtered.map(({ c, balance }) => {
    const late = isLate(c.id);
    const badge = balance === 0 ? '' : late ? `<span class="badge late">● متأخر عن السداد</span>` : '';
    const lastTx = Store.getTransactions(c.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const sub = lastTx ? `آخر نشاط: ${relativeTime(lastTx.date)}` : 'لا يوجد نشاط';
    return `
      <div class="list-card" data-client="${c.id}">
        <div class="lc-info">
          <div class="avatar" style="background:${avatarColor(c.name)}22;color:${avatarColor(c.name)}">${initials(c.name)}</div>
          <div><div class="lc-name">${c.name}</div><div class="lc-sub">${sub}</div></div>
        </div>
        <div class="lc-amount">
          ${balance !== 0 ? `<div class="text-muted" style="font-size:11px">${balance > 0 ? 'مدين بـ' : 'رصيد دائن'}</div>` : ''}
          <div class="amt ${balance > 0 ? 'debit' : balance < 0 ? 'credit' : 'zero'}">${balance === 0 ? '0 ريال' : fmt(Math.abs(balance)) + ' ريال'}</div>
          ${badge}
        </div>
      </div>`;
  }).join('');
  list.querySelectorAll('[data-client]').forEach(el => {
    el.addEventListener('click', () => openClientDetail(el.dataset.client));
  });
}
function isLate(clientId) {
  const txs = Store.getTransactions(clientId).filter(t => t.type !== 'payment').sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!txs.length) return false;
  const daysSince = (Date.now() - new Date(txs[0].date).getTime()) / 86400000;
  return daysSince > 30 && Store.getClientBalance(clientId) > 0;
}
document.getElementById('clientSearch').addEventListener('input', renderClients);
document.querySelectorAll('#page-clients .filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#page-clients .filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    clientFilter = chip.dataset.filter;
    renderClients();
  });
});
document.getElementById('addClientTopBtn').addEventListener('click', openNewClientSheet);

/* --------- Sheet: عميل جديد / تعديل --------- */
function openNewClientSheet(clientId = null) {
  document.getElementById('editClientId').value = clientId || '';
  if (clientId) {
    const c = Store.getClient(clientId);
    document.getElementById('clientSheetTitle').textContent = 'تعديل بيانات العميل';
    document.getElementById('ncName').value = c.name;
    document.getElementById('ncPhone').value = c.phone;
    document.getElementById('ncAddress').value = c.address;
    document.getElementById('ncCreditLimit').value = c.creditLimit;
    document.getElementById('ncNotes').value = c.notes;
  } else {
    document.getElementById('clientSheetTitle').textContent = 'إضافة عميل جديد';
    ['ncName', 'ncPhone', 'ncAddress', 'ncNotes'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('ncCreditLimit').value = 0;
  }
  openSheet('clientSheet');
}
document.getElementById('saveClientBtn').addEventListener('click', () => {
  const name = document.getElementById('ncName').value.trim();
  if (!name) { showToast('يرجى إدخال اسم العميل'); return; }
  const data = {
    name,
    phone: document.getElementById('ncPhone').value.trim(),
    address: document.getElementById('ncAddress').value.trim(),
    creditLimit: document.getElementById('ncCreditLimit').value,
    notes: document.getElementById('ncNotes').value.trim()
  };
  const editId = document.getElementById('editClientId').value;
  if (editId) { Store.updateClient(editId, data); showToast('تم تحديث بيانات العميل'); }
  else { Store.addClient(data); showToast('تمت إضافة العميل بنجاح'); }
  closeSheet('clientSheet');
  refreshClientAwareViews();
});

/* ==================================================================
   تفاصيل العميل
   ================================================================== */
function openClientDetail(clientId) {
  currentClientId = clientId;
  navigate('client-detail');
  renderClientDetail();
}
function renderClientDetail() {
  const c = Store.getClient(currentClientId);
  if (!c) { navigate('clients'); return; }
  const settings = Store.getSettings();
  const balance = Store.getClientBalance(c.id);
  document.getElementById('cdName').textContent = c.name;
  document.getElementById('cdBalance').innerHTML = `${fmt(Math.abs(balance))} <span style="font-size:13px">${settings.currency}</span>`;
  document.getElementById('cdBalance').style.color = balance > 0 ? 'var(--danger)' : balance < 0 ? 'var(--success)' : 'var(--text)';

  const badge = document.getElementById('cdStatusBadge');
  if (balance === 0) { badge.textContent = 'مسدد بالكامل'; badge.className = 'badge paid'; }
  else if (isLate(c.id)) { badge.textContent = 'متأخر ⚠'; badge.className = 'badge late'; }
  else if (balance < 0) { badge.textContent = 'رصيد دائن'; badge.className = 'badge partial'; }
  else { badge.textContent = 'نشط'; badge.className = 'badge pending'; }

  const txs = Store.getTransactions(c.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const last = txs[0];
  document.getElementById('cdLastOp').textContent = last
    ? `آخر عملية: ${last.type === 'payment' ? 'تسديد' : 'دين جديد'} ${fmt(last.type === 'payment' ? last.amount : last.totalAfterDiscount)} ريال (${relativeTime(last.date)})`
    : 'لا توجد عمليات بعد';

  document.getElementById('cdOpsCount').textContent = txs.length;
  document.getElementById('cdCreditLimit').textContent = fmt(c.creditLimit || 0);

  const statement = Store.getClientStatement(c.id);
  const tl = document.getElementById('cdTimeline');
  if (!statement.length) {
    tl.innerHTML = `<div class="empty-state"><span class="material-symbols-rounded">receipt_long</span><div>لا توجد عمليات مسجلة</div></div>`;
  } else {
    tl.innerHTML = statement.map(t => {
      const isPay = t.type === 'payment';
      const amount = isPay ? t.amount : t.totalAfterDiscount;
      const desc = isPay ? (t.notes || 'دفعة نقدية') : (t.items?.length ? t.items.map(i => i.name).join('، ') : (t.notes || 'دين جديد'));
      return `
        <div class="timeline-item" data-open-invoice="${t.id}">
          <div class="tl-icon ${isPay ? 'payment' : 'debt'}"><span class="material-symbols-rounded" style="font-size:18px">${isPay ? 'check' : 'trending_up'}</span></div>
          <div class="tl-body">
            <div class="tl-top"><span class="tl-type ${isPay ? 'payment' : 'debt'}">${isPay ? 'تسديد' : 'دين جديد'}</span><span class="tl-amount">${fmt(amount)} ريال</span></div>
            <div class="tl-note">${desc}</div>
            <div class="tl-date">${formatDate(t.date)}، ${formatTime(t.date)}</div>
          </div>
        </div>`;
    }).join('');
    tl.querySelectorAll('[data-open-invoice]').forEach(el => {
      el.addEventListener('click', () => openInvoiceForTx(el.dataset.openInvoice));
    });
  }
}
document.getElementById('cdPayBtn').addEventListener('click', () => {
  document.getElementById('payCurrentBalance').textContent = fmt(Store.getClientBalance(currentClientId)) + ' ريال';
  document.getElementById('payAmount').value = '';
  document.getElementById('payNotes').value = '';
  openSheet('paySheet');
});
document.getElementById('cdDebtBtn').addEventListener('click', () => {
  navigate('add-debt');
  document.getElementById('debtClientSelect').value = currentClientId;
});
document.getElementById('cdCallBtn').addEventListener('click', () => {
  const c = Store.getClient(currentClientId);
  if (c?.phone) window.location.href = `tel:${c.phone}`;
  else showToast('لا يوجد رقم هاتف مسجل');
});
document.getElementById('cdMoreBtn').addEventListener('click', () => openSheet('clientMoreSheet'));
document.getElementById('cmEditBtn').addEventListener('click', () => { closeSheet('clientMoreSheet'); openNewClientSheet(currentClientId); });
document.getElementById('cmArchiveBtn').addEventListener('click', () => {
  Store.archiveClient(currentClientId, true);
  closeSheet('clientMoreSheet');
  showToast('تم أرشفة العميل');
  navigate('clients');
});
document.getElementById('cmDeleteBtn').addEventListener('click', () => {
  if (confirm('هل أنت متأكد من حذف هذا العميل وجميع عملياته نهائيًا؟')) {
    Store.deleteClient(currentClientId);
    closeSheet('clientMoreSheet');
    showToast('تم حذف العميل');
    navigate('clients');
  }
});

/* --------- تأكيد الدفعة --------- */
document.getElementById('confirmPayBtn').addEventListener('click', () => {
  const amount = Number(document.getElementById('payAmount').value);
  if (!amount || amount <= 0) { showToast('يرجى إدخال مبلغ صحيح'); return; }
  const balanceBefore = Store.getClientBalance(currentClientId);
  Store.addPayment(currentClientId, {
    amount,
    method: document.getElementById('payMethod').value,
    notes: document.getElementById('payNotes').value.trim()
  });
  closeSheet('paySheet');
  const overpaid = amount > balanceBefore ? amount - balanceBefore : 0;
  showToast(overpaid > 0 ? `تم السداد، وتحويل ${fmt(overpaid)} ريال إلى رصيد دائن` : 'تم تسجيل الدفعة بنجاح');
  renderClientDetail();
  refreshClientAwareViews();
});

/* ==================================================================
   إضافة دين / فاتورة بيع
   ================================================================== */
let itemRowCount = 0;
function prepareAddDebt() {
  const select = document.getElementById('debtClientSelect');
  select.innerHTML = '<option value="">-- ابحث عن اسم العميل --</option>' +
    Store.getClients().filter(c => !c.archived).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  if (currentClientId) select.value = currentClientId;
  updateAddDebtHeader();
  document.getElementById('itemsContainer').innerHTML = '';
  itemRowCount = 0;
  addItemRow();
  document.getElementById('manualAmount').value = '';
  document.getElementById('invoiceDiscount').value = '';
  document.getElementById('paidNow').value = '';
  document.getElementById('debtNotes').value = '';
  document.getElementById('debtDate').value = new Date().toISOString().slice(0, 10);
  updateDebtTotalsPreview();
}
function updateAddDebtHeader() {
  const stats = Store.getDashboardStats();
  document.getElementById('addDebtCurrentTotal').textContent = `${fmt(stats.totalDebit)} ريال`;
}
document.getElementById('debtClientSelect').addEventListener('change', e => { currentClientId = e.target.value; });

function addItemRow() {
  itemRowCount++;
  const row = document.createElement('div');
  row.className = 'item-row';
  row.dataset.row = itemRowCount;
  row.innerHTML = `
    <input type="text" placeholder="اسم الصنف" class="item-name">
    <input type="number" placeholder="الكمية" class="item-qty" value="1" min="0">
    <input type="number" placeholder="السعر" class="item-price" min="0">
    <button class="remove-item" type="button"><span class="material-symbols-rounded" style="font-size:16px">close</span></button>`;
  document.getElementById('itemsContainer').appendChild(row);
  row.querySelector('.remove-item').addEventListener('click', () => { row.remove(); updateDebtTotalsPreview(); });
  row.querySelectorAll('input').forEach(inp => inp.addEventListener('input', updateDebtTotalsPreview));
}
document.getElementById('addItemBtn').addEventListener('click', addItemRow);
document.getElementById('manualAmount').addEventListener('input', updateDebtTotalsPreview);
document.getElementById('invoiceDiscount').addEventListener('input', updateDebtTotalsPreview);
document.getElementById('discountType').addEventListener('change', updateDebtTotalsPreview);
document.getElementById('paidNow').addEventListener('input', updateDebtTotalsPreview);

function collectItems() {
  return [...document.querySelectorAll('#itemsContainer .item-row')].map(row => ({
    name: row.querySelector('.item-name').value.trim() || 'صنف',
    qty: Number(row.querySelector('.item-qty').value) || 1,
    price: Number(row.querySelector('.item-price').value) || 0,
    discount: 0
  })).filter(it => it.price > 0 || it.name !== 'صنف');
}
function updateDebtTotalsPreview() {
  const manual = document.getElementById('manualAmount').value;
  const items = manual ? [] : collectItems();
  const subtotal = manual ? Number(manual) || 0 : items.reduce((s, it) => s + it.qty * it.price, 0);
  const discountVal = Number(document.getElementById('invoiceDiscount').value) || 0;
  const discountType = document.getElementById('discountType').value;
  const discountAmount = discountType === 'percent' ? subtotal * discountVal / 100 : discountVal;
  const totalAfter = Math.max(subtotal - discountAmount, 0);
  const paidNow = Number(document.getElementById('paidNow').value) || 0;

  const previousBalance = currentClientId ? Store.getClientBalance(currentClientId) : 0;
  const creditAvailable = previousBalance < 0 ? Math.abs(previousBalance) : 0;
  const creditUsed = Math.min(creditAvailable, totalAfter);
  const remaining = Math.max(totalAfter - paidNow - creditUsed, 0);

  document.getElementById('debtTotalsPreview').innerHTML = `
    ${previousBalance !== 0 ? `<div class="totals-row"><span>الرصيد السابق</span><span>${fmt(previousBalance)} ريال</span></div>` : ''}
    <div class="totals-row"><span>إجمالي الفاتورة</span><span>${fmt(subtotal)} ريال</span></div>
    <div class="totals-row"><span>الخصم</span><span>-${fmt(discountAmount)} ريال</span></div>
    <div class="totals-row"><span>الإجمالي بعد الخصم</span><span>${fmt(totalAfter)} ريال</span></div>
    ${creditUsed > 0 ? `<div class="totals-row"><span>مستخدم من الرصيد الدائن</span><span>-${fmt(creditUsed)} ريال</span></div>` : ''}
    <div class="totals-row"><span>المدفوع الآن</span><span>-${fmt(paidNow)} ريال</span></div>
    <div class="totals-row remaining"><span>المتبقي (دين)</span><span>${fmt(remaining)} ريال</span></div>
  `;
}
document.getElementById('closeAddDebt').addEventListener('click', () => navigate('home'));

document.getElementById('saveDebtBtn').addEventListener('click', () => {
  const clientId = document.getElementById('debtClientSelect').value;
  if (!clientId) { showToast('يرجى اختيار العميل'); return; }
  const manual = document.getElementById('manualAmount').value;
  const items = manual ? [] : collectItems();
  if (!manual && !items.length) { showToast('يرجى إضافة صنف واحد على الأقل أو مبلغ إجمالي'); return; }

  const tx = Store.addDebt(clientId, {
    items,
    manualAmount: manual ? Number(manual) : null,
    discount: Number(document.getElementById('invoiceDiscount').value) || 0,
    discountType: document.getElementById('discountType').value,
    paidNow: Number(document.getElementById('paidNow').value) || 0,
    notes: document.getElementById('debtNotes').value.trim(),
    date: document.getElementById('debtDate').value ? new Date(document.getElementById('debtDate').value).toISOString() : null
  });
  showToast('تم حفظ العملية بنجاح');
  currentClientId = clientId;
  openInvoiceForTx(tx.id);
  refreshClientAwareViews();
});

/* ==================================================================
   الفاتورة
   ================================================================== */
function openInvoiceForTx(txId) {
  const tx = Store.getTransactions().find(t => t.id === txId);
  if (!tx) return;
  currentInvoiceTx = tx;
  navigate('invoice');
  renderInvoice(tx);
}
function renderInvoice(tx) {
  const settings = Store.getSettings();
  const client = Store.getClient(tx.clientId);
  const isPayment = tx.type === 'payment';
  const currency = settings.currency;

  let itemsHtml = '';
  if (!isPayment) {
    const rows = tx.items && tx.items.length ? tx.items : [{ name: tx.notes || 'دين', qty: 1, price: tx.subtotal }];
    itemsHtml = `
      <table class="invoice-table">
        <thead><tr><th>الوصف</th><th>الكمية</th><th>المبلغ</th></tr></thead>
        <tbody>
          ${rows.map(it => `<tr><td>${it.name}</td><td>${it.qty}</td><td>${fmt(it.qty * it.price)} ${currency}</td></tr>`).join('')}
        </tbody>
      </table>`;
  }

  const totalsHtml = isPayment ? `
    <div class="totals-row"><span>مبلغ الدفعة</span><span>${fmt(tx.amount)} ${currency}</span></div>
    <div class="totals-row"><span>طريقة الدفع</span><span>${tx.method || '—'}</span></div>
  ` : `
    <div class="totals-row"><span>إجمالي الفاتورة الجديدة</span><span>${fmt(tx.totalAfterDiscount)} ${currency}</span></div>
    <div class="totals-row"><span>رصيد سابق</span><span>${fmt(tx.previousBalance)} ${currency}</span></div>
    <div class="totals-row grand"><span>الإجمالي الكلي</span><span>${fmt(tx.previousBalance + tx.totalAfterDiscount)} ${currency}</span></div>
    <div class="totals-row"><span>المبلغ المدفوع</span><span>${fmt(tx.paid)} ${currency}</span></div>
  `;

  const balanceNow = Store.getClientBalance(tx.clientId);
  let noticeHtml = '';
  if (!isPayment && tx.remaining > 0) {
    const status = balanceNow > 0 && isLate(tx.clientId) ? 'متأخر' : 'مستحق';
    noticeHtml = `
      <div class="debt-notice">
        <div class="dn-title"><span class="material-symbols-rounded" style="font-size:17px">error</span> إشعار دين</div>
        <div class="dn-row"><span>نوع الفاتورة</span><span>${tx.paid > 0 ? 'جزئية' : 'آجلة'}</span></div>
        <div class="dn-row"><span>الرصيد السابق</span><span>${fmt(tx.previousBalance)} ${currency}</span></div>
        <div class="dn-row"><span>المبلغ المتبقي (الدين)</span><span>${fmt(tx.remaining)} ${currency}</span></div>
        <div class="dn-row"><span>الرصيد الحالي</span><span>${fmt(balanceNow)} ${currency}</span></div>
        <div class="dn-row"><span>حالة الدين</span><span>${status}</span></div>
        <div class="dn-msg">يتبقى على العميل مبلغ ${fmt(tx.remaining)} ${currency}، يرجى السداد في الموعد المحدد.</div>
      </div>`;
  }

  let payMethodsHtml = '';
  const showPm = settings.paymentMethodsEnabled && (settings.showPaymentMethodsOnAllInvoices || (!isPayment && tx.remaining > 0));
  if (showPm) {
    const active = settings.paymentMethods.filter(m => m.active && m.value);
    if (active.length) {
      payMethodsHtml = `
        <div class="pay-methods">
          <h4>طرق السداد</h4>
          ${active.map(m => `<div class="pm-row"><span>${m.title}</span><span class="pmv">${m.value}</span></div>`).join('')}
          <div class="pay-note">${settings.paymentMethodsNote}</div>
        </div>`;
    }
  }

  const logoHtml = settings.logo
    ? `<img src="${settings.logo}" alt="logo">`
    : `<span class="material-symbols-rounded">shield</span>`;

  document.getElementById('invoicePrintArea').innerHTML = `
    <div class="invoice-head">
      <div class="invoice-logo">${logoHtml}</div>
      <h2>${settings.businessName}</h2>
      <p>${settings.tagline || ''}</p>
      ${settings.address ? `<p>${settings.address}</p>` : ''}
      ${settings.phone ? `<p>هاتف: ${settings.phone}</p>` : ''}
    </div>
    <div class="invoice-meta">
      <div><div class="k">اسم العميل</div><div class="v">${client?.name || '—'}</div></div>
      <div style="text-align:left"><div class="k">رقم الفاتورة</div><div class="v">#${tx.invoiceNo}</div></div>
    </div>
    <div class="invoice-meta">
      <div><div class="k">التاريخ</div><div class="v">${formatDate(tx.date)}</div></div>
      <div style="text-align:left"><div class="k">الوقت</div><div class="v">${formatTime(tx.date)}</div></div>
    </div>
    ${itemsHtml}
    <div class="invoice-totals">${totalsHtml}</div>
    ${noticeHtml}
    ${payMethodsHtml}
    <div class="invoice-collect">
      <div class="invoice-qr" id="invoiceQr"></div>
      <div><div class="text-muted" style="font-size:12px">امسح الرمز لعرض الفاتورة إلكترونيًا</div></div>
    </div>
    <div class="invoice-thanks">${settings.invoiceFooterMessage}</div>
  `;

  const qrHolder = document.getElementById('invoiceQr');
  if (window.QRCode && qrHolder) {
    QRCode.toCanvas(document.createElement('canvas'), `INV:${tx.invoiceNo}|CLIENT:${client?.name}|AMT:${isPayment ? tx.amount : tx.totalAfterDiscount}`, { width: 120, margin: 0 }, (err, canvas) => {
      if (!err) qrHolder.appendChild(canvas);
    });
  }
}
document.getElementById('closeInvoiceBtn').addEventListener('click', () => {
  if (currentClientId) openClientDetail(currentClientId); else navigate('home');
});
document.getElementById('printInvoiceBtn').addEventListener('click', () => window.print());
document.getElementById('invoicePdfBtn').addEventListener('click', async () => {
  showToast('جاري تجهيز ملف PDF...');
  const el = document.getElementById('invoicePrintArea');
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--surface') });
  const imgData = canvas.toDataURL('image/png');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'pt', [canvas.width / 2, canvas.height / 2]);
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
  pdf.save(`فاتورة-${currentInvoiceTx?.invoiceNo || ''}.pdf`);
});
document.getElementById('invoiceWaBtn').addEventListener('click', () => {
  const client = Store.getClient(currentInvoiceTx?.clientId);
  const amount = currentInvoiceTx?.type === 'payment' ? currentInvoiceTx.amount : currentInvoiceTx?.remaining;
  const text = encodeURIComponent(`فاتورة رقم #${currentInvoiceTx?.invoiceNo} - ${client?.name}\nالمبلغ: ${fmt(amount)} ${Store.getSettings().currency}`);
  window.open(`https://wa.me/${(client?.phone || '').replace(/\D/g, '')}?text=${text}`, '_blank');
});
document.getElementById('invoiceSmsBtn').addEventListener('click', () => {
  const client = Store.getClient(currentInvoiceTx?.clientId);
  const amount = currentInvoiceTx?.type === 'payment' ? currentInvoiceTx.amount : currentInvoiceTx?.remaining;
  const text = encodeURIComponent(`فاتورة رقم #${currentInvoiceTx?.invoiceNo} - المبلغ: ${fmt(amount)} ${Store.getSettings().currency}`);
  window.location.href = `sms:${client?.phone || ''}?body=${text}`;
});

/* ==================================================================
   التقارير
   ================================================================== */
document.querySelectorAll('#page-reports .filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#page-reports .filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderReports(chip.dataset.period);
  });
});
function periodStart(period) {
  const d = new Date();
  if (period === 'day') d.setHours(0, 0, 0, 0);
  if (period === 'week') d.setDate(d.getDate() - 7);
  if (period === 'month') d.setMonth(d.getMonth() - 1);
  if (period === 'year') d.setFullYear(d.getFullYear() - 1);
  return d;
}
function renderReports(period) {
  const start = periodStart(period);
  const txs = Store.getTransactions().filter(t => new Date(t.date) >= start);
  const sales = txs.filter(t => t.type !== 'payment').reduce((s, t) => s + t.totalAfterDiscount, 0);
  const collected = txs.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0);
  const netDebt = txs.filter(t => t.type !== 'payment').reduce((s, t) => s + t.remaining, 0);

  document.getElementById('repSales').textContent = fmt(sales);
  document.getElementById('repCollected').textContent = fmt(collected);
  document.getElementById('repNetDebt').textContent = fmt(netDebt);
  document.getElementById('repCash').textContent = fmt(Store.getCashboxBalance());

  const clients = Store.getClients().filter(c => !c.archived);
  const withBalance = clients.map(c => ({ c, balance: Store.getClientBalance(c.id) }));
  const top = [...withBalance].sort((a, b) => b.balance - a.balance).slice(0, 5).filter(x => x.balance > 0);
  const late = withBalance.filter(x => isLate(x.c.id)).sort((a, b) => b.balance - a.balance).slice(0, 5);

  document.getElementById('topClientsList').innerHTML = top.length ? top.map(({ c, balance }) => clientMiniRow(c, balance)).join('') :
    `<div class="empty-state"><span class="material-symbols-rounded">emoji_events</span><div>لا توجد بيانات كافية</div></div>`;
  document.getElementById('lateClientsList').innerHTML = late.length ? late.map(({ c, balance }) => clientMiniRow(c, balance, true)).join('') :
    `<div class="empty-state"><span class="material-symbols-rounded">verified</span><div>لا يوجد عملاء متأخرون 🎉</div></div>`;

  document.querySelectorAll('#topClientsList [data-client], #lateClientsList [data-client]').forEach(el => {
    el.addEventListener('click', () => openClientDetail(el.dataset.client));
  });

  drawReportChart(txs);
}
function clientMiniRow(c, balance, late = false) {
  return `<div class="list-card" data-client="${c.id}">
    <div class="lc-info"><div class="avatar" style="background:${avatarColor(c.name)}22;color:${avatarColor(c.name)}">${initials(c.name)}</div><div class="lc-name">${c.name}</div></div>
    <div class="lc-amount"><div class="amt debit">${fmt(balance)} ريال</div>${late ? '<span class="badge late">متأخر</span>' : ''}</div>
  </div>`;
}
function drawReportChart(txs) {
  const ctx = document.getElementById('reportChart');
  if (!ctx) return;
  const styles = getComputedStyle(document.documentElement);
  const sales = txs.filter(t => t.type !== 'payment').reduce((s, t) => s + t.totalAfterDiscount, 0);
  const collected = txs.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0);
  if (reportChartInst) reportChartInst.destroy();
  reportChartInst = new Chart(ctx, {
    type: 'bar',
    data: { labels: ['المبيعات', 'التحصيلات'], datasets: [{ data: [sales, collected], backgroundColor: [styles.getPropertyValue('--primary'), styles.getPropertyValue('--success')], borderRadius: 8 }] },
    options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: styles.getPropertyValue('--text-muted') } }, y: { ticks: { color: styles.getPropertyValue('--text-muted') } } } }
  });
}
document.getElementById('printReportBtn').addEventListener('click', () => window.print());
document.getElementById('exportPdfBtn').addEventListener('click', async () => {
  showToast('جاري تجهيز التقرير...');
  const el = document.querySelector('#page-reports .page');
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg') });
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'pt', [canvas.width / 2, canvas.height / 2]);
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
  pdf.save('تقرير.pdf');
});
document.getElementById('exportExcelBtn').addEventListener('click', () => {
  const clients = Store.getClients();
  let csv = 'الاسم,الهاتف,الرصيد\n';
  clients.forEach(c => { csv += `${c.name},${c.phone},${Store.getClientBalance(c.id)}\n`; });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'تقرير-العملاء.csv';
  a.click();
});

/* ==================================================================
   الإعدادات
   ================================================================== */
function renderSettings() {
  const s = Store.getSettings();
  document.getElementById('setBusinessName').value = s.businessName;
  document.getElementById('setOwnerName').value = s.ownerName;
  document.getElementById('setPhone').value = s.phone;
  document.getElementById('setEmail').value = s.email;
  document.getElementById('setAddress').value = s.address;
  document.getElementById('setTaxNumber').value = s.taxNumber;
  document.getElementById('setCrNumber').value = s.crNumber;
  document.getElementById('setCurrency').value = s.currency;
  document.getElementById('setFooterMsg').value = s.invoiceFooterMessage;
  document.getElementById('pmEnabledToggle').checked = s.paymentMethodsEnabled;
  document.getElementById('pmAllInvoicesToggle').checked = !s.showPaymentMethodsOnAllInvoices;
  document.getElementById('pmNote').value = s.paymentMethodsNote;
  renderPmEditList(s.paymentMethods);
}
document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  Store.updateSettings({
    businessName: document.getElementById('setBusinessName').value.trim() || 'أمان للديون',
    ownerName: document.getElementById('setOwnerName').value.trim(),
    phone: document.getElementById('setPhone').value.trim(),
    email: document.getElementById('setEmail').value.trim(),
    address: document.getElementById('setAddress').value.trim(),
    taxNumber: document.getElementById('setTaxNumber').value.trim(),
    crNumber: document.getElementById('setCrNumber').value.trim(),
    currency: document.getElementById('setCurrency').value.trim() || 'ريال',
    invoiceFooterMessage: document.getElementById('setFooterMsg').value.trim()
  });
  showToast('تم حفظ الإعدادات بنجاح');
  renderHome();
});

function renderPmEditList(methods) {
  const wrap = document.getElementById('pmEditList');
  wrap.innerHTML = methods.map(m => `
    <div class="pm-edit-row" data-pm="${m.id}">
      <input type="text" class="pm-title" value="${m.title}" placeholder="اسم طريقة السداد">
      <input type="text" class="pm-value" value="${m.value}" placeholder="القيمة / الرقم">
      <button class="icon-del" type="button"><span class="material-symbols-rounded" style="font-size:16px">delete</span></button>
    </div>`).join('');
  wrap.querySelectorAll('.icon-del').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.pm-edit-row').remove());
  });
}
document.getElementById('addPmBtn').addEventListener('click', () => {
  const wrap = document.getElementById('pmEditList');
  const row = document.createElement('div');
  row.className = 'pm-edit-row';
  row.innerHTML = `
    <input type="text" class="pm-title" placeholder="اسم طريقة السداد">
    <input type="text" class="pm-value" placeholder="القيمة / الرقم">
    <button class="icon-del" type="button"><span class="material-symbols-rounded" style="font-size:16px">delete</span></button>`;
  wrap.appendChild(row);
  row.querySelector('.icon-del').addEventListener('click', () => row.remove());
});
document.getElementById('savePmBtn').addEventListener('click', () => {
  const rows = [...document.querySelectorAll('#pmEditList .pm-edit-row')];
  const methods = rows.map(r => ({
    id: r.dataset.pm || 'pm_' + Date.now() + Math.random().toString(36).slice(2, 6),
    title: r.querySelector('.pm-title').value.trim(),
    value: r.querySelector('.pm-value').value.trim(),
    active: true
  })).filter(m => m.title);
  Store.savePaymentMethods(methods);
  Store.updateSettings({
    paymentMethodsEnabled: document.getElementById('pmEnabledToggle').checked,
    showPaymentMethodsOnAllInvoices: !document.getElementById('pmAllInvoicesToggle').checked,
    paymentMethodsNote: document.getElementById('pmNote').value.trim()
  });
  showToast('تم حفظ طرق السداد');
  renderSettings();
});

document.getElementById('exportDataBtn').addEventListener('click', () => {
  const blob = new Blob([Store.exportAll()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `نسخة-احتياطية-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
});
document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFileInput').click());
document.getElementById('importFileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try { Store.importAll(reader.result); showToast('تمت استعادة النسخة الاحتياطية'); navigate('home'); }
    catch (err) { showToast('ملف غير صالح'); }
  };
  reader.readAsText(file);
});
document.getElementById('wipeDataBtn').addEventListener('click', () => {
  if (confirm('سيتم حذف جميع البيانات نهائيًا (العملاء، الديون، الإعدادات). هل أنت متأكد؟')) {
    Store.wipeAll();
    showToast('تم حذف جميع البيانات');
    navigate('home');
  }
});

/* ==================================================================
   البحث العام
   ================================================================== */
document.getElementById('searchBtn').addEventListener('click', () => { openSheet('searchSheet'); document.getElementById('globalSearchInput').focus(); });
document.getElementById('globalSearchInput').addEventListener('input', e => {
  const q = e.target.value.trim();
  const wrap = document.getElementById('globalSearchResults');
  if (!q) { wrap.innerHTML = ''; return; }
  const clients = Store.getClients().filter(c => c.name.includes(q) || (c.phone || '').includes(q));
  const txs = Store.getTransactions().filter(t => (t.notes || '').includes(q) || (t.invoiceNo || '').includes(q));
  let html = '';
  if (clients.length) html += `<div class="text-muted mt-8">العملاء</div>` + clients.map(c => clientMiniRow(c, Store.getClientBalance(c.id))).join('');
  if (txs.length) html += `<div class="text-muted mt-8">العمليات</div>` + txs.map(t => `<div class="list-card" data-open-invoice="${t.id}"><div class="lc-info"><div class="lc-name">#${t.invoiceNo}</div></div><div class="lc-amount">${fmt(t.type === 'payment' ? t.amount : t.totalAfterDiscount)} ريال</div></div>`).join('');
  wrap.innerHTML = html || `<div class="empty-state"><span class="material-symbols-rounded">search_off</span><div>لا توجد نتائج</div></div>`;
  wrap.querySelectorAll('[data-client]').forEach(el => el.addEventListener('click', () => { closeSheet('searchSheet'); openClientDetail(el.dataset.client); }));
  wrap.querySelectorAll('[data-open-invoice]').forEach(el => el.addEventListener('click', () => { closeSheet('searchSheet'); openInvoiceForTx(el.dataset.openInvoice); }));
});
document.getElementById('menuBtn').addEventListener('click', () => navigate('settings'));
document.getElementById('profileBtn').addEventListener('click', () => navigate('settings'));

/* ==================================================================
   إغلاق الـ Sheets
   ================================================================== */
document.querySelectorAll('[data-close-sheet]').forEach(btn => {
  btn.addEventListener('click', () => closeSheet(btn.dataset.closeSheet));
});
document.querySelectorAll('.sheet-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('app-hidden'); });
});

function refreshClientAwareViews() {
  renderHome();
  renderClients();
}

/* ==================================================================
   تشغيل التطبيق
   ================================================================== */
initAuth();

/* تسجيل Service Worker لتفعيل PWA */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
