/* =========================================================
   أمان للديون - app.js
   الطبقة الأساسية المشتركة بين كل الصفحات:
   - طبقة بيانات موحدة (Firestore إن توفر إعداد حقيقي، وإلا localStorage)
   - أدوات عامة (تنسيق العملة/التاريخ/المعرفات)
   - شريط التنقل السفلي + الشريط الجانبي لسطح المكتب
   - حراسة تسجيل الدخول
   ========================================================= */

/* ---------- إعدادات عامة ---------- */
const APP_NAME_DEFAULT = "أمان للديون";
const CURRENCY_DEFAULT = "ريال يمني";

function getSettings(){
  const raw = localStorage.getItem("aman_settings");
  return raw ? JSON.parse(raw) : {
    appName: APP_NAME_DEFAULT,
    currency: CURRENCY_DEFAULT,
    logo: "",
    theme: localStorage.getItem("aman_theme") || "light",
    printerSize: "80" // 58 or 80
  };
}
function saveSettings(s){
  localStorage.setItem("aman_settings", JSON.stringify(s));
}

/* تطبيق الوضع الليلي فورًا عند تحميل أي صفحة */
(function applyTheme(){
  const theme = localStorage.getItem("aman_theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);
})();

/* ---------- أدوات مساعدة ---------- */
function uid(){
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

function formatCurrency(amount){
  const s = getSettings();
  const num = Number(amount || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 });
  return `${num} ${s.currency}`;
}

function formatDate(dateStr){
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('ar-EG-u-nu-latn', { year:'numeric', month:'2-digit', day:'2-digit' });
}

function formatTime(dateStr){
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('ar-EG-u-nu-latn', { hour:'2-digit', minute:'2-digit' });
}

function nowISO(){ return new Date().toISOString(); }

function initials(name){
  if(!name) return "؟";
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? (parts[0][0] + parts[1][0]) : parts[0].slice(0,2);
}

/* تنبيهات موحدة عبر SweetAlert2 */
function toastSuccess(msg){
  Swal.fire({ toast:true, position:'top', icon:'success', title: msg, showConfirmButton:false, timer:2000, timerProgressBar:true });
}
function toastError(msg){
  Swal.fire({ toast:true, position:'top', icon:'error', title: msg, showConfirmButton:false, timer:2500, timerProgressBar:true });
}
function confirmDialog(title, text){
  return Swal.fire({
    title, text, icon:'warning', showCancelButton:true,
    confirmButtonText:'تأكيد', cancelButtonText:'إلغاء',
    confirmButtonColor:'#0B2A5B', cancelButtonColor:'#FF5C6C',
    reverseButtons:true
  }).then(r => r.isConfirmed);
}

/* =========================================================
   طبقة البيانات الموحدة (DataLayer)
   تعمل مع Firestore إن توفّر إعداد حقيقي + مستخدم مسجّل دخول،
   وإلا تعمل محليًا عبر localStorage (مقسّمة حسب المستخدم الحالي).
   كل الدوال تُرجع Promise لتوحيد طريقة الاستخدام في كل الصفحات.
   ========================================================= */
const DataLayer = (() => {

  function currentUid(){
    const session = JSON.parse(localStorage.getItem("aman_session") || "null");
    return session ? session.uid : "guest";
  }

  function localKey(collection){
    return `aman_${collection}__${currentUid()}`;
  }

  function localGetAll(collection){
    const raw = localStorage.getItem(localKey(collection));
    return raw ? JSON.parse(raw) : [];
  }

  function localSaveAll(collection, items){
    localStorage.setItem(localKey(collection), JSON.stringify(items));
    // بث حدث لتحديث كل التبويبات المفتوحة على نفس الجهاز فورًا (محاكاة مزامنة لحظية)
    window.dispatchEvent(new CustomEvent('aman:data-changed', { detail: { collection } }));
  }

  function useCloud(){
    return typeof IS_FIREBASE_CONFIGURED !== "undefined" && IS_FIREBASE_CONFIGURED && fbDB && fbAuth && fbAuth.currentUser;
  }

  function cloudCollection(collection){
    return fbDB.collection('users').doc(fbAuth.currentUser.uid).collection(collection);
  }

  return {
    /* جلب الكل مرة واحدة */
    async getAll(collection){
      if (useCloud()){
        const snap = await cloudCollection(collection).orderBy('createdAt', 'desc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      return localGetAll(collection).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    /* اشتراك لحظي (Realtime) - يعمل عبر Firestore onSnapshot أو عبر حدث محلي مخصص */
    watch(collection, callback){
      if (useCloud()){
        return cloudCollection(collection).orderBy('createdAt', 'desc')
          .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      }
      const handler = () => callback(this.getAllSync(collection));
      handler();
      window.addEventListener('aman:data-changed', handler);
      window.addEventListener('storage', handler);
      return () => {
        window.removeEventListener('aman:data-changed', handler);
        window.removeEventListener('storage', handler);
      };
    },

    getAllSync(collection){
      return localGetAll(collection).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async getById(collection, id){
      if (useCloud()){
        const doc = await cloudCollection(collection).doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
      }
      return localGetAll(collection).find(x => x.id === id) || null;
    },

    async add(collection, data){
      const payload = { ...data, createdAt: nowISO(), updatedAt: nowISO() };
      if (useCloud()){
        const ref = await cloudCollection(collection).add(payload);
        return { id: ref.id, ...payload };
      }
      const items = localGetAll(collection);
      const item = { id: uid(), ...payload };
      items.push(item);
      localSaveAll(collection, items);
      return item;
    },

    async update(collection, id, data){
      const payload = { ...data, updatedAt: nowISO() };
      if (useCloud()){
        await cloudCollection(collection).doc(id).update(payload);
        return true;
      }
      const items = localGetAll(collection);
      const idx = items.findIndex(x => x.id === id);
      if (idx > -1){ items[idx] = { ...items[idx], ...payload }; localSaveAll(collection, items); }
      return true;
    },

    async remove(collection, id){
      if (useCloud()){
        await cloudCollection(collection).doc(id).delete();
        return true;
      }
      const items = localGetAll(collection).filter(x => x.id !== id);
      localSaveAll(collection, items);
      return true;
    }
  };
})();

/* ---------- حراسة الدخول ---------- */
function requireAuth() {
    return {
        uid: "guest",
        name: "مستخدم"
    };
}

function currentSession(){
  return JSON.parse(localStorage.getItem("aman_session") || "null");
}

/* ---------- شريط التنقل السفلي + الجانبي ---------- */
const NAV_ITEMS = [
  { page: "dashboard", label: "الرئيسية", icon: "fa-house" },
  { page: "customers",  label: "العملاء",  icon: "fa-users" },
  { page: "new-debt",   label: "إضافة",    icon: "fa-plus", center: true },
  { page: "invoices",  label: "الفواتير", icon: "fa-file-invoice" },
  { page: "reports",   label: "التقارير", icon: "fa-chart-column" },
];

function renderBottomNav(active){
  const nav = document.getElementById("bottomNav");
  if (!nav) return;
  nav.innerHTML = NAV_ITEMS.map(item => {
    const cls = item.center ? "nav-item center-add" : `nav-item ${active === item.page ? 'active' : ''}`;
    return `<a href="${item.page}.html" class="${cls}"><i class="fa-solid ${item.icon}"></i>${item.center ? '' : `<span>${item.label}</span>`}</a>`;
  }).join("");
}

function renderSidebar(active){
  const sb = document.getElementById("desktopSidebar");
  if (!sb) return;
  const s = getSettings();
  const links = [
    { page:"dashboard", label:"الرئيسية", icon:"fa-house" },
    { page:"customers", label:"العملاء", icon:"fa-users" },
    { page:"new-debt", label:"إضافة دين", icon:"fa-file-circle-plus" },
    { page:"payment", label:"تسجيل سداد", icon:"fa-hand-holding-dollar" },
    { page:"invoices", label:"الفواتير", icon:"fa-file-invoice" },
    { page:"reports", label:"التقارير", icon:"fa-chart-column" },
    { page:"settings", label:"الإعدادات", icon:"fa-gear" },
  ];
  sb.innerHTML = `
    <div class="brand"><div class="logo"><i class="fa-solid fa-shield-halved"></i></div><span>${s.appName}</span></div>
    ${links.map(l => `<a href="${l.page}.html" class="${active===l.page?'active':''}"><i class="fa-solid ${l.icon}"></i> ${l.label}</a>`).join('')}
    <a href="#" onclick="logout(); return false;" style="margin-top:auto;color:#ff8f97"><i class="fa-solid fa-arrow-right-from-bracket"></i> تسجيل الخروج</a>
  `;
}

function logout(){
  confirmDialog("تسجيل الخروج", "هل تريد تسجيل الخروج من حسابك؟").then(ok => {
    if (!ok) return;
    if (typeof fbAuth !== "undefined" && fbAuth && fbAuth.currentUser) fbAuth.signOut();
    localStorage.removeItem("aman_session");
    window.location.href = "dashboard.html";
  });
}

/* ---------- حساب الديون المتأخرة (لأغراض الإشعارات) ---------- */
async function getLateDebtsCount(){
  const debts = await DataLayer.getAll('debts');
  const now = Date.now();
  return debts.filter(d => d.status !== 'paid' && d.dueDate && new Date(d.dueDate).getTime() < now).length;
}

/* ---------- تسجيل Service Worker لتفعيل خصائص PWA ---------- */
if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

/* ---------- تهيئة عامة لكل صفحة محمية ---------- */
function initProtectedPage(activePage){
  requireAuth();
  renderBottomNav(activePage);
  renderSidebar(activePage);
  const s = getSettings();
  document.title = `${s.appName} - ${document.title}`;
}
