/* =========================================================
   أمان للديون - app.js
   طبقة بيانات عامة + أدوات مشتركة تُستخدم في كل الصفحات
   تعمل تلقائياً محلياً (localStorage) إن لم يتم ضبط Firebase،
   وتتحول تلقائياً لاستخدام Firestore عند توفر إعدادات صحيحة
   في js/firebase.js (انظر التعليمات هناك).
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

/* ---------------- طبقة البيانات (Data Layer) ----------------
   واجهة موحدة DB تُستخدم في كل الصفحات. تعتمد افتراضياً على
   localStorage للعمل الفوري بدون إعداد، وإن وُجد Firebase مهيّأ
   (window.__FIREBASE_READY__) فستُستخدم Firestore بدلاً منها
   (راجع js/firebase.js لإعداد بياناتك الحقيقية). */
const DB_KEYS = { customers: "aman_customers", txns: "aman_txns", settings: "aman_settings", user: "aman_user" };

function seedIfEmpty() {
  if (localStorage.getItem(DB_KEYS.customers)) return;
  const customers = [
    { id: "c1", name: "محمد صالح", phone: "777123456", address: "صنعاء - شارع الخمسين", notes: "", createdAt: new Date(Date.now() - 2*3600*1000).toISOString() },
    { id: "c2", name: "أحمد عبدالله سالم", phone: "733222111", address: "صنعاء", notes: "", createdAt: new Date(Date.now() - 86400*1000).toISOString() },
    { id: "c3", name: "شركة السلام", phone: "011555222", address: "صنعاء - المنطقة التجارية", notes: "عميل جملة", createdAt: new Date(Date.now() - 5*86400*1000).toISOString() },
    { id: "c4", name: "ناصر العامري", phone: "770444888", address: "تعز", notes: "", createdAt: new Date(Date.now() - 3*86400*1000).toISOString() },
  ];
  const txns = [
    { id: "t1", customerId: "c1", type: "debt", amount: 50000, reason: "بضائع متنوعة", date: "2024-10-24", time: "10:30 ص", notes: "" },
    { id: "t2", customerId: "c2", type: "debt", amount: 38500, reason: "كرتون زيت الطبخ", date: "2024-10-10", time: "09:00 ص", notes: "" },
    { id: "t3", customerId: "c2", type: "payment", amount: 5000, method: "نقدية", date: "2024-10-12", time: "04:15 م", notes: "دفعة نقدية" },
    { id: "t4", customerId: "c2", type: "debt", amount: 12000, reason: "كيس سكر 10 كيلو", date: todayISO(), time: "10:30 ص", notes: "" },
    { id: "t5", customerId: "c3", type: "debt", amount: 274700, reason: "توريد بضاعة شهرية", date: "2024-09-01", time: "12:00 م", notes: "" },
    { id: "t6", customerId: "c4", type: "debt", amount: 20000, reason: "دين سابق", date: "2024-07-01", time: "09:00 ص", notes: "" },
    { id: "t7", customerId: "c4", type: "payment", amount: 20000, method: "تحويل بنكي", date: "2024-07-20", time: "01:00 م", notes: "تسديد كامل" },
  ];
  localStorage.setItem(DB_KEYS.customers, JSON.stringify(customers));
  localStorage.setItem(DB_KEYS.txns, JSON.stringify(txns));
  localStorage.setItem(DB_KEYS.settings, JSON.stringify({
    shopName: "أمان للديون", currency: "ريال يمني", theme: "light",
    address: "صنعاء - شارع الخمسين", phone: "456-123-777",
  }));
}

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
  getTxnsFor(customerId) {
    return this.getTxns().filter((t) => t.customerId === customerId).sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  },
  addTxn(txn) {
    txn.id = uid();
    txn.createdAt = new Date().toISOString();
    const list = this.getTxns();
    list.unshift(txn);
    localStorage.setItem(DB_KEYS.txns, JSON.stringify(list));
    return txn;
  },
  deleteTxn(id) {
    localStorage.setItem(DB_KEYS.txns, JSON.stringify(this.getTxns().filter((t) => t.id !== id)));
  },
  /* -------- حسابات -------- */
  balanceFor(customerId) {
    const txns = this.getTxns().filter((t) => t.customerId === customerId);
    return txns.reduce((sum, t) => sum + (t.type === "debt" ? t.amount : -t.amount), 0);
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
    // متأخر = رصيد موجب ولم يحصل سداد خلال آخر 30 يوم
    return this.getCustomers().filter((c) => {
      const bal = this.balanceFor(c.id);
      if (bal <= 0) return false;
      const last = this.lastTxnFor(c.id);
      if (!last) return true;
      const days = (Date.now() - new Date(last.date).getTime()) / 86400000;
      return days > 30 || (last.type === "debt" && days > 14);
    });
  },
  /* -------- إعدادات -------- */
  getSettings() {
    return JSON.parse(localStorage.getItem(DB_KEYS.settings) || "{}");
  },
  saveSettings(s) {
    localStorage.setItem(DB_KEYS.settings, JSON.stringify({ ...this.getSettings(), ...s }));
  },
};
seedIfEmpty();

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
window.Utils = { fmtMoney, todayISO, nowTime, timeAgo, uid, initialLetter, avatarColorFor, qs, qsa, getParam, toast, confirmDialog, applyTheme, renderBottomNav };

/* ---------------- تسجيل PWA Service Worker ---------------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
