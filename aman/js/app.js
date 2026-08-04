/* =========================================================
   أمان للديون - app.js
   طبقة بيانات عامة + أدوات مشتركة تُستخدم في كل الصفحات
   تعمل تلقائياً محلياً (localStorage) إن لم يتم ضبط Firebase،
   وتتحول تلقائياً لاستخدام Firestore عند توفر إعدادات صحيحة
   في js/firebase.js (انظر التعليمات هناك). كل القراءة/الكتابة
   تمر عبر كائن DB بحيث يسهل استبدال المخزن لاحقاً دون تعديل
   بقية الصفحات.
   ========================================================= */

const CURRENCY = "ريال";
const AVATAR_COLORS = [
  { bg: "#DCE8FF", fg: "#0B2A5B" },
  { bg: "#D6F7E4", fg: "#157a45" },
  { bg: "#FDE2E2", fg: "#C0392B" },
  { bg: "#FFF0CF", fg: "#8a5b00" },
];

/* ---------------- عام: أدوات مساعدة ---------------- */
function fmtMoney(n) {
  n = Number(n || 0);
  return n.toLocaleString("ar-EG");
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function nowTime() {
  return new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}
function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 172800) return "يوم أمس";
  return `منذ ${Math.floor(diff / 86400)} أيام`;
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function initialLetter(name) {
  return (name || "؟").trim().charAt(0);
}
function avatarColorFor(id) {
  let sum = 0;
  for (const c of String(id)) sum += c.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}
function toast(icon, title) {
  if (window.Swal) {
    Swal.fire({
      icon, title, toast: true, position: "top", timer: 2200,
      showConfirmButton: false, background: "var(--card)", color: "var(--text)",
    });
  } else {
    alert(title);
  }
}
async function confirmDialog(title, text, confirmText = "تأكيد") {
  if (!window.Swal) return confirm(title);
  const res = await Swal.fire({
    title, text, icon: "warning", showCancelButton: true,
    confirmButtonText: confirmText, cancelButtonText: "إلغاء",
    confirmButtonColor: "#E5484D", cancelButtonColor: "#0B2A5B",
  });
  return res.isConfirmed;
}
/* تحويل ملف صورة مرفوع إلى Data URL (لتخزين الشعارات/الأيقونات/QR محلياً) */
function fileToDataUrl(file, maxWidth = 480) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png", 0.9));
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
/* اسم ملف آمن (يزيل الرموز غير الصالحة لأسماء الملفات) */
function safeFileName(str) {
  return String(str || "").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
}

/* ---------------- طبقة البيانات (Data Layer) ----------------
   واجهة موحدة DB تُستخدم في كل الصفحات. تعتمد افتراضياً على
   localStorage للعمل الفوري بدون إعداد، وإن وُجد Firebase مهيّأ
   (window.__FIREBASE_READY__) فستُستخدم Firestore بدلاً منها
   (راجع js/firebase.js لإعداد بياناتك الحقيقية). */
const DB_KEYS = {
  customers: "aman_customers",
  txns: "aman_txns",
  settings: "aman_settings",
  user: "aman_user",
};

/* الإعدادات الافتراضية للتطبيق عند أول تشغيل (نظيفة تماماً بلا بيانات تجريبية) */
function defaultPaymentMethods() {
  return [
    {
      id: "pm_cash", name: "نقدية", icon: "fa-solid fa-money-bill-wave", logo: "", qr: "",
      details: [], visible: true, scope: "all", order: 0,
    },
    {
      id: "pm_wallets", name: "المحافظ الإلكترونية", icon: "fa-solid fa-wallet", logo: "", qr: "",
      details: [], visible: true, scope: "all", order: 1,
    },
    {
      id: "pm_naqta", name: "نقطة حاسب", icon: "fa-solid fa-cash-register", logo: "", qr: "",
      details: [], visible: true, scope: "all", order: 2,
    },
    {
      id: "pm_omfloos", name: "أم فلوس", icon: "fa-solid fa-mobile-screen-button", logo: "", qr: "",
      details: [], visible: true, scope: "all", order: 3,
    },
    {
      id: "pm_kuraimi", name: "الكريمي", icon: "fa-solid fa-building-columns", logo: "", qr: "",
      details: [], visible: true, scope: "all", order: 4,
    },
    {
      id: "pm_bank", name: "الحساب البنكي", icon: "fa-solid fa-university", logo: "", qr: "",
      details: [
        { label: "رقم الآيبان (IBAN)", value: "" },
        { label: "اسم المستفيد", value: "" },
      ],
      visible: true, scope: "all", order: 5,
    },
  ];
}

function defaultSettings() {
  return {
    shopName: "أمان للديون",
    currency: "ريال يمني",
    theme: "light",
    address: "",
    phone: "",
    ownerName: "",
    // هوية الفاتورة
    invoiceIdentity: {
      logo: "",       // Data URL لشعار التطبيق
      icon: "",        // Data URL لأيقونة التطبيق
      stamp: "",        // Data URL لختم/توقيع إلكتروني
      primaryColor: "#0B2A5B",
      accentColor: "#8EF0B2",
    },
    // إعدادات الطباعة والفواتير
    printSettings: {
      defaultPaperSize: "58",   // 58 | 80 | A4 | A5
      defaultFileType: "pdf",   // pdf | word | png
      showLogo: true,
      fontSize: "md",           // sm | md | lg
      margin: "md",             // sm | md | lg
      showQR: true,
      showSignature: true,
      copies: 1,
    },
    // طرق السداد
    paymentMethods: defaultPaymentMethods(),
    paymentMethodsEnabled: true,          // إظهار/إخفاء القسم بالكامل
    paymentMethodsScope: "all",           // all | creditOnly
    paymentNote: "يرجى إرسال إشعار التحويل مع ذكر رقم الفاتورة لتأكيد عملية السداد، وشكرًا لتعاملكم معنا.",
    debtNoticeText: "إشعار دين: نأمل التكرم بسداد المبلغ المستحق في أقرب وقت. شكرًا لكم.",
    invoiceCounter: 0,
  };
}

function deepMerge(base, extra) {
  const out = Array.isArray(base) ? base.slice() : { ...base };
  if (!extra || typeof extra !== "object") return out;
  Object.keys(extra).forEach((k) => {
    if (extra[k] && typeof extra[k] === "object" && !Array.isArray(extra[k]) && base && typeof base[k] === "object" && !Array.isArray(base[k])) {
      out[k] = deepMerge(base[k], extra[k]);
    } else {
      out[k] = extra[k];
    }
  });
  return out;
}

/* لا يتم زرع أي بيانات تجريبية تلقائياً — التطبيق يبدأ فارغاً تماماً
   وجاهزاً للاستخدام الفعلي منذ أول تشغيل. تُستخدم فقط عند الطلب
   الصريح من صفحة الإعدادات (لأغراض التجربة أثناء التطوير). */
function ensureBaseData() {
  if (!localStorage.getItem(DB_KEYS.customers)) localStorage.setItem(DB_KEYS.customers, "[]");
  if (!localStorage.getItem(DB_KEYS.txns)) localStorage.setItem(DB_KEYS.txns, "[]");
  if (!localStorage.getItem(DB_KEYS.settings)) localStorage.setItem(DB_KEYS.settings, JSON.stringify(defaultSettings()));
}

const SAMPLE_DATA = {
  customers: [
    { id: "c1", name: "محمد صالح", phone: "777123456", address: "صنعاء - شارع الخمسين", notes: "", createdAt: new Date(Date.now() - 2*3600*1000).toISOString() },
    { id: "c2", name: "أحمد عبدالله سالم", phone: "733222111", address: "صنعاء", notes: "", createdAt: new Date(Date.now() - 86400*1000).toISOString() },
    { id: "c3", name: "شركة السلام", phone: "011555222", address: "صنعاء - المنطقة التجارية", notes: "عميل جملة", createdAt: new Date(Date.now() - 5*86400*1000).toISOString() },
    { id: "c4", name: "ناصر العامري", phone: "770444888", address: "تعز", notes: "", createdAt: new Date(Date.now() - 3*86400*1000).toISOString() },
  ],
  txns: [
    { id: "t1", customerId: "c1", type: "debt", amount: 50000, reason: "بضائع متنوعة", date: "2024-10-24", time: "10:30 ص", notes: "", invoiceType: "credit" },
    { id: "t2", customerId: "c2", type: "debt", amount: 38500, reason: "كرتون زيت الطبخ", date: "2024-10-10", time: "09:00 ص", notes: "", invoiceType: "credit" },
    { id: "t3", customerId: "c2", type: "payment", amount: 5000, method: "نقدية", date: "2024-10-12", time: "04:15 م", notes: "دفعة نقدية" },
    { id: "t4", customerId: "c2", type: "debt", amount: 12000, reason: "كيس سكر 10 كيلو", date: todayISO(), time: "10:30 ص", notes: "", invoiceType: "credit" },
    { id: "t5", customerId: "c3", type: "debt", amount: 274700, reason: "توريد بضاعة شهرية", date: "2024-09-01", time: "12:00 م", notes: "", invoiceType: "credit" },
    { id: "t6", customerId: "c4", type: "debt", amount: 20000, reason: "دين سابق", date: "2024-07-01", time: "09:00 ص", notes: "", invoiceType: "credit" },
    { id: "t7", customerId: "c4", type: "payment", amount: 20000, method: "تحويل بنكي", date: "2024-07-20", time: "01:00 م", notes: "تسديد كامل" },
  ],
};

ensureBaseData();

const DB = {
  /* -------- عملاء -------- */
  getCustomers() {
    return JSON.parse(localStorage.getItem(DB_KEYS.customers) || "[]");
  },
  getCustomer(id) {
    return this.getCustomers().find((c) => c.id === id) || null;
  },
  saveCustomer(customer) {
    const list = this.getCustomers();
    if (customer.id) {
      const idx = list.findIndex((c) => c.id === customer.id);
      if (idx > -1) list[idx] = { ...list[idx], ...customer };
    } else {
      customer.id = uid();
      customer.createdAt = new Date().toISOString();
      list.unshift(customer);
    }
    localStorage.setItem(DB_KEYS.customers, JSON.stringify(list));
    return customer;
  },
  deleteCustomer(id) {
    localStorage.setItem(DB_KEYS.customers, JSON.stringify(this.getCustomers().filter((c) => c.id !== id)));
    localStorage.setItem(DB_KEYS.txns, JSON.stringify(this.getTxns().filter((t) => t.customerId !== id)));
  },
  /* -------- عمليات (ديون/سداد) -------- */
  getTxns() {
    return JSON.parse(localStorage.getItem(DB_KEYS.txns) || "[]");
  },
  getTxn(id) {
    return this.getTxns().find((t) => t.id === id) || null;
  },
  getTxnsFor(customerId) {
    return this.getTxns().filter((t) => t.customerId === customerId).sort((a, b) => (a.date + (a.time||"") < b.date + (b.time||"") ? 1 : -1));
  },
  addTxn(txn) {
    txn.id = uid();
    txn.createdAt = new Date().toISOString();
    txn.invoiceNo = this.nextInvoiceNumber();
    txn.issuedBy = (Auth.currentUser() && (this.getSettings().ownerName || Auth.currentUser().name)) || "";
    const list = this.getTxns();
    list.unshift(txn);
    localStorage.setItem(DB_KEYS.txns, JSON.stringify(list));
    return txn;
  },
  deleteTxn(id) {
    localStorage.setItem(DB_KEYS.txns, JSON.stringify(this.getTxns().filter((t) => t.id !== id)));
  },
  /* -------- ترقيم الفواتير -------- */
  nextInvoiceNumber() {
    const s = this.getSettings();
    const n = (Number(s.invoiceCounter) || 0) + 1;
    this.saveSettings({ invoiceCounter: n });
    return n;
  },
  formatInvoiceNo(n) {
    return String(n || 0).padStart(6, "0");
  },
  /* -------- حسابات -------- */
  balanceFor(customerId) {
    const txns = this.getTxns().filter((t) => t.customerId === customerId);
    return txns.reduce((sum, t) => sum + (t.type === "debt" ? t.amount - (t.discount || 0) : -t.amount), 0);
  },
  lastTxnFor(customerId) {
    const txns = this.getTxnsFor(customerId);
    return txns[0] || null;
  },
  totalDebt() {
    return this.getCustomers().reduce((s, c) => s + Math.max(this.balanceFor(c.id), 0), 0);
  },
  todayCollected() {
    return this.getTxns().filter((t) => t.type === "payment" && t.date === todayISO()).reduce((s, t) => s + t.amount, 0);
  },
  lateCustomers() {
    // متأخر = رصيد موجب ولم يحصل سداد خلال آخر 30 يوم (أو تجاوز تاريخ الاستحقاق)
    return this.getCustomers().filter((c) => {
      const bal = this.balanceFor(c.id);
      if (bal <= 0) return false;
      const overdue = this.getTxnsFor(c.id).some((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.type === "debt");
      if (overdue) return true;
      const last = this.lastTxnFor(c.id);
      if (!last) return true;
      const days = (Date.now() - new Date(last.date).getTime()) / 86400000;
      return days > 30 || (last.type === "debt" && days > 14);
    });
  },
  /* حالة دين عملية معيّنة: paid | due | late */
  debtStatusFor(customerId, txn) {
    const bal = this.balanceFor(customerId);
    if (bal <= 0) return "paid";
    if (txn && txn.dueDate && new Date(txn.dueDate) < new Date()) return "late";
    const isLate = this.lateCustomers().some((c) => c.id === customerId);
    return isLate ? "late" : "due";
  },
  /* -------- إعدادات -------- */
  getSettings() {
    const raw = JSON.parse(localStorage.getItem(DB_KEYS.settings) || "{}");
    return deepMerge(defaultSettings(), raw);
  },
  saveSettings(s) {
    const merged = deepMerge(this.getSettings(), s);
    localStorage.setItem(DB_KEYS.settings, JSON.stringify(merged));
    return merged;
  },
  /* -------- طرق السداد -------- */
  getPaymentMethods() {
    return (this.getSettings().paymentMethods || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  },
  savePaymentMethod(method) {
    const settings = this.getSettings();
    const list = settings.paymentMethods || [];
    if (method.id) {
      const idx = list.findIndex((m) => m.id === method.id);
      if (idx > -1) list[idx] = { ...list[idx], ...method };
      else list.push({ ...method, order: list.length });
    } else {
      method.id = "pm_" + uid();
      method.order = list.length;
      list.push(method);
    }
    this.saveSettings({ paymentMethods: list });
    return method;
  },
  deletePaymentMethod(id) {
    const settings = this.getSettings();
    const list = (settings.paymentMethods || []).filter((m) => m.id !== id);
    this.saveSettings({ paymentMethods: list });
  },
  reorderPaymentMethods(orderedIds) {
    const settings = this.getSettings();
    const list = settings.paymentMethods || [];
    orderedIds.forEach((id, i) => {
      const m = list.find((x) => x.id === id);
      if (m) m.order = i;
    });
    this.saveSettings({ paymentMethods: list });
  },
  /* -------- تهيئة التطبيق قبل التسليم -------- */
  wipeAllData({ keepSettings = true } = {}) {
    localStorage.setItem(DB_KEYS.customers, "[]");
    localStorage.setItem(DB_KEYS.txns, "[]");
    if (keepSettings) {
      this.saveSettings({ invoiceCounter: 0 });
    } else {
      localStorage.setItem(DB_KEYS.settings, JSON.stringify(defaultSettings()));
    }
  },
  loadSampleData() {
    localStorage.setItem(DB_KEYS.customers, JSON.stringify(SAMPLE_DATA.customers));
    localStorage.setItem(DB_KEYS.txns, JSON.stringify(SAMPLE_DATA.txns));
  },
};

/* ---------------- المصادقة (تجريبية محلياً) ---------------- */
const Auth = {
  currentUser() {
    return JSON.parse(localStorage.getItem(DB_KEYS.user) || "null");
  },
  isLoggedIn() {
    return !!this.currentUser();
  },
  login(email) {
    localStorage.setItem(DB_KEYS.user, JSON.stringify({ email, name: email.split("@")[0] }));
  },
  logout() {
    localStorage.removeItem(DB_KEYS.user);
    location.href = "login.html";
  },
  requireAuth() {
    if (!this.isLoggedIn()) location.href = "login.html";
  },
};

/* ---------------- الثيم (فاتح/ليلي) ---------------- */
function applyTheme() {
  const theme = DB.getSettings().theme || "light";
  document.documentElement.setAttribute("data-theme", theme);
}
applyTheme();

/* ---------------- التنقل السفلي المشترك ---------------- */
function renderBottomNav(active) {
  const el = document.getElementById("bottomNav");
  if (!el) return;
  const items = [
    { key: "home", href: "dashboard.html", icon: "fa-house", label: "الرئيسية" },
    { key: "customers", href: "customers.html", icon: "fa-user-group", label: "العملاء" },
    { key: "add", href: "new-debt.html", icon: "fa-circle-plus", label: "إضافة", center: true },
    { key: "reports", href: "reports.html", icon: "fa-chart-column", label: "التقارير" },
    { key: "settings", href: "settings.html", icon: "fa-gear", label: "الإعدادات" },
  ];
  el.innerHTML = items
    .map(
      (it) => `<a class="bn-item ${it.key === active ? "active" : ""} ${it.center ? "center-add" : ""}" href="${it.href}">
        <i class="fa-solid ${it.icon}"></i><span>${it.label}</span>
      </a>`
    )
    .join("");
}

/* تصدير عام */
window.DB = DB;
window.Auth = Auth;
window.Utils = { fmtMoney, todayISO, nowTime, timeAgo, uid, initialLetter, avatarColorFor, qs, qsa, getParam, toast, confirmDialog, applyTheme, renderBottomNav, fileToDataUrl, safeFileName };

/* ---------------- تسجيل PWA Service Worker ---------------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
