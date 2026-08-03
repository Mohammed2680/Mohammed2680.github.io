/* =========================================================
   أمان للديون — طبقة البيانات (Data Layer)
   يستخدم localStorage الآن، لكنه مصمم بحيث يسهل استبداله
   بـ Firebase Firestore لاحقًا (نفس الدوال، مصدر مختلف).
   ========================================================= */

const DB_KEY = 'aman_dyoon_db_v1';

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function todayISO() {
  return new Date().toISOString();
}

const DEFAULT_DB = {
  settings: {
    businessName: 'أمان للديون',
    tagline: 'إدارة الديون والحسابات المالية',
    logo: '', // base64 dataURL
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    taxNumber: '',
    crNumber: '',
    currency: 'ريال',
    taxEnabled: false,
    taxRate: 0,
    invoiceFooterMessage: 'شكرًا لتعاملكم معنا، نأمل مراجعة الحساب باستمرار.',
    returnPolicy: '',
    showPaymentMethodsOnAllInvoices: true, // false = آجلة فقط
    paymentMethodsEnabled: true,
    paymentMethodsNote: 'يرجى إرسال إشعار التحويل مع ذكر رقم الفاتورة لتأكيد عملية السداد، وشكرًا لتعاملكم معنا.',
    paymentMethods: [
      { id: uid('pm'), title: 'عبر المحافظ الإلكترونية', value: '', icon: 'wallet', active: true },
      { id: uid('pm'), title: 'نقطة حاسب', value: '', icon: 'point_of_sale', active: true },
      { id: uid('pm'), title: 'أم فلوس', value: '', icon: 'account_balance_wallet', active: true },
      { id: uid('pm'), title: 'الكريمي', value: '', icon: 'account_balance', active: true },
      { id: uid('pm'), title: 'الحساب البنكي (IBAN)', value: '', icon: 'account_balance', active: true },
      { id: uid('pm'), title: 'اسم المستفيد', value: '', icon: 'badge', active: true }
    ],
    theme: 'light'
  },
  clients: [],
  transactions: [], // {id, clientId, type: 'debt'|'sale'|'payment', amount, discount, discountType, items, paid, notes, date, method, invoiceNo}
  cashbox: {
    openingBalance: 0,
    entries: [] // {id, type:'in'|'out', category, amount, notes, date}
  },
  invoiceCounter: 880
};

function loadDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    saveDB(DEFAULT_DB);
    return structuredClone(DEFAULT_DB);
  }
  try {
    const parsed = JSON.parse(raw);
    // دمج أي حقول إعدادات جديدة أضيفت في تحديثات لاحقة
    parsed.settings = Object.assign(structuredClone(DEFAULT_DB.settings), parsed.settings);
    return parsed;
  } catch (e) {
    console.error('DB parse error', e);
    return structuredClone(DEFAULT_DB);
  }
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

const Store = {
  get db() { return loadDB(); },

  // ---------- الإعدادات ----------
  getSettings() { return this.db.settings; },
  updateSettings(patch) {
    const db = loadDB();
    db.settings = Object.assign(db.settings, patch);
    saveDB(db);
    return db.settings;
  },
  savePaymentMethods(methods) {
    const db = loadDB();
    db.settings.paymentMethods = methods;
    saveDB(db);
  },

  // ---------- العملاء ----------
  getClients() { return this.db.clients; },
  getClient(id) { return this.db.clients.find(c => c.id === id); },
  addClient(data) {
    const db = loadDB();
    const client = {
      id: uid('cl'),
      name: data.name,
      phone: data.phone || '',
      address: data.address || '',
      notes: data.notes || '',
      creditLimit: Number(data.creditLimit) || 0,
      status: 'active',
      archived: false,
      createdAt: todayISO()
    };
    db.clients.push(client);
    saveDB(db);
    return client;
  },
  updateClient(id, patch) {
    const db = loadDB();
    const c = db.clients.find(c => c.id === id);
    if (!c) return null;
    Object.assign(c, patch);
    saveDB(db);
    return c;
  },
  archiveClient(id, archived = true) {
    return this.updateClient(id, { archived });
  },
  deleteClient(id) {
    const db = loadDB();
    db.clients = db.clients.filter(c => c.id !== id);
    db.transactions = db.transactions.filter(t => t.clientId !== id);
    saveDB(db);
  },

  // ---------- المعاملات ----------
  getTransactions(clientId = null) {
    const list = this.db.transactions;
    return clientId ? list.filter(t => t.clientId === clientId) : list;
  },

  // الرصيد = موجب => العميل مدين لنا | سالب => لدينا رصيد دائن له
  getClientBalance(clientId) {
    const txs = this.getTransactions(clientId).sort((a, b) => new Date(a.date) - new Date(b.date));
    let balance = 0;
    for (const t of txs) {
      if (t.type === 'payment') balance -= t.amount;
      else balance += t.netAmount; // debt or sale: صافي بعد الخصم والمدفوع الفوري محسوب في netAmount
    }
    return Math.round(balance * 100) / 100;
  },

  getClientStatement(clientId) {
    const txs = this.getTransactions(clientId).sort((a, b) => new Date(a.date) - new Date(b.date));
    let running = 0;
    return txs.map(t => {
      if (t.type === 'payment') running -= t.amount;
      else running += t.netAmount;
      return { ...t, balanceAfter: Math.round(running * 100) / 100 };
    }).reverse(); // الأحدث أولًا
  },

  nextInvoiceNo() {
    const db = loadDB();
    db.invoiceCounter += 1;
    saveDB(db);
    return `RCV-${new Date().getFullYear()}-${db.invoiceCounter}`;
  },

  /**
   * إضافة دين/فاتورة بيع
   * items: [{name, qty, price, discount}]
   * discount: خصم عام على الفاتورة (مبلغ)
   * discountType: 'amount' | 'percent'
   * paidNow: المبلغ المدفوع فورًا عند الإنشاء
   * useCreditBalance: استخدام الرصيد الدائن تلقائيًا بعد الخصم
   */
  addDebt(clientId, { items = [], manualAmount = null, discount = 0, discountType = 'amount', paidNow = 0, notes = '', date = null, method = 'نقدًا', useCreditBalance = true }) {
    const db = loadDB();
    const previousBalance = this.getClientBalance(clientId);

    let subtotal = 0;
    if (manualAmount !== null) {
      subtotal = Number(manualAmount) || 0;
    } else {
      subtotal = items.reduce((sum, it) => {
        const lineTotal = (Number(it.qty) || 1) * (Number(it.price) || 0);
        const lineDiscount = Number(it.discount) || 0;
        return sum + Math.max(lineTotal - lineDiscount, 0);
      }, 0);
    }

    let discountAmount = 0;
    if (discountType === 'percent') discountAmount = subtotal * (Number(discount) || 0) / 100;
    else discountAmount = Number(discount) || 0;

    const totalAfterDiscount = Math.max(subtotal - discountAmount, 0);

    // استخدام الرصيد الدائن (previousBalance سالب = رصيد دائن)
    let creditUsed = 0;
    if (useCreditBalance && previousBalance < 0) {
      creditUsed = Math.min(Math.abs(previousBalance), totalAfterDiscount);
    }

    let paid = (Number(paidNow) || 0) + creditUsed;
    const remaining = Math.max(totalAfterDiscount - paid, 0);
    // إن دفع أكثر من المطلوب، الفرق يتحول لرصيد دائن تلقائيًا (يُعالج عبر netAmount السالب)
    const overpaid = Math.max(paid - totalAfterDiscount, 0);

    const netAmount = totalAfterDiscount - paid; // قد تكون سالبة (رصيد دائن للعميل)

    const tx = {
      id: uid('tx'),
      invoiceNo: this.nextInvoiceNo(),
      clientId,
      type: manualAmount !== null && items.length === 0 ? 'debt' : 'sale',
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discountAmount * 100) / 100,
      discountType,
      totalAfterDiscount: Math.round(totalAfterDiscount * 100) / 100,
      paid: Math.round(paid * 100) / 100,
      creditUsed: Math.round(creditUsed * 100) / 100,
      overpaid: Math.round(overpaid * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      previousBalance: Math.round(previousBalance * 100) / 100,
      notes,
      method,
      date: date || todayISO()
    };
    db.transactions.push(tx);
    saveDB(db);
    return tx;
  },

  /** تسجيل دفعة سداد (قد تتجاوز الدين فيتحول الفائض لرصيد دائن) */
  addPayment(clientId, { amount, notes = '', date = null, method = 'نقدًا' }) {
    const db = loadDB();
    const tx = {
      id: uid('tx'),
      invoiceNo: this.nextInvoiceNo(),
      clientId,
      type: 'payment',
      amount: Number(amount) || 0,
      notes,
      method,
      date: date || todayISO()
    };
    db.transactions.push(tx);
    saveDB(db);
    return tx;
  },

  deleteTransaction(id) {
    const db = loadDB();
    db.transactions = db.transactions.filter(t => t.id !== id);
    saveDB(db);
  },

  // ---------- إجماليات لوحة التحكم ----------
  getDashboardStats() {
    const clients = this.getClients().filter(c => !c.archived);
    let totalDebit = 0, totalCredit = 0;
    clients.forEach(c => {
      const b = this.getClientBalance(c.id);
      if (b > 0) totalDebit += b; else totalCredit += Math.abs(b);
    });
    const todayStr = new Date().toDateString();
    const txs = this.getTransactions();
    const todaySales = txs.filter(t => t.type !== 'payment' && new Date(t.date).toDateString() === todayStr)
      .reduce((s, t) => s + t.totalAfterDiscount, 0);
    const todayCollected = txs.filter(t => t.type === 'payment' && new Date(t.date).toDateString() === todayStr)
      .reduce((s, t) => s + t.amount, 0);
    return {
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      clientsCount: clients.length,
      todaySales: Math.round(todaySales * 100) / 100,
      todayCollected: Math.round(todayCollected * 100) / 100
    };
  },

  getRecentTransactions(limit = 6) {
    return [...this.getTransactions()]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  },

  // ---------- الصندوق ----------
  getCashbox() { return this.db.cashbox; },
  addCashEntry(entry) {
    const db = loadDB();
    db.cashbox.entries.push({ id: uid('cx'), date: todayISO(), ...entry });
    saveDB(db);
  },
  getCashboxBalance() {
    const cb = this.getCashbox();
    const txs = this.getTransactions();
    let balance = cb.openingBalance || 0;
    txs.forEach(t => {
      if (t.type === 'payment') balance += t.amount;
      else balance += t.paid; // ما دفع نقدًا فقط عند البيع
    });
    cb.entries.forEach(e => { balance += e.type === 'in' ? e.amount : -e.amount; });
    return Math.round(balance * 100) / 100;
  },

  // ---------- تفريغ/استعادة ----------
  exportAll() { return JSON.stringify(this.db, null, 2); },
  importAll(json) {
    const data = JSON.parse(json);
    saveDB(data);
  },
  wipeAll() { saveDB(structuredClone(DEFAULT_DB)); }
};
