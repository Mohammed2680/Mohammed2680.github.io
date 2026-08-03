/* أمان للديون - settings.js */
Auth.requireAuth();
renderBottomNav("settings");

const user = Auth.currentUser();
const settings = DB.getSettings();

qs("#userEmail").textContent = user?.email || "—";
qs("#userShop").textContent = settings.shopName || "أمان للديون";
qs("#userAvatar").textContent = initialLetter(settings.shopName || user?.name || "؟");
qs("#shopNameInput").value = settings.shopName || "";
qs("#currencyInput").value = settings.currency || "ريال يمني";
qs("#darkModeToggle").checked = (settings.theme || "light") === "dark";

qs("#shopNameInput").addEventListener("change", (e) => {
  DB.saveSettings({ shopName: e.target.value.trim() });
  toast("success", "تم تحديث اسم النشاط");
});
qs("#currencyInput").addEventListener("change", (e) => {
  DB.saveSettings({ currency: e.target.value });
  toast("success", "تم تحديث العملة");
});
qs("#darkModeToggle").addEventListener("change", (e) => {
  DB.saveSettings({ theme: e.target.checked ? "dark" : "light" });
  applyTheme();
});

function backupData() {
  const data = {
    customers: DB.getCustomers(),
    txns: DB.getTxns(),
    settings: DB.getSettings(),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `aman-backup-${todayISO()}.json`;
  link.click();
  toast("success", "تم إنشاء نسخة احتياطية بنجاح");
}
window.backupData = backupData;

qs("#restoreFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const ok = await confirmDialog("استعادة البيانات؟", "سيتم استبدال جميع بياناتك الحالية بالنسخة المستوردة.");
  if (!ok) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    if (data.customers) localStorage.setItem("aman_customers", JSON.stringify(data.customers));
    if (data.txns) localStorage.setItem("aman_txns", JSON.stringify(data.txns));
    if (data.settings) localStorage.setItem("aman_settings", JSON.stringify(data.settings));
    toast("success", "تم استعادة البيانات بنجاح");
    setTimeout(() => location.reload(), 800);
  } catch {
    toast("error", "ملف غير صالح");
  }
});

async function doLogout() {
  const ok = await confirmDialog("تسجيل الخروج؟", "سيتم تسجيل خروجك من التطبيق.");
  if (ok) Auth.logout();
}
window.doLogout = doLogout;
