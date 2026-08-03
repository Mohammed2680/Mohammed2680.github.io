/* =========================================================
   أمان للديون - settings.js
   ========================================================= */

initProtectedPage('settings');

function loadSettingsForm(){
  const s = getSettings();
  document.getElementById('settingAppName').value = s.appName;
  document.getElementById('settingCurrency').value = s.currency;
  document.getElementById('settingPrinter').value = s.printerSize || '80';
  document.getElementById('darkModeToggle').checked = (localStorage.getItem('aman_theme') === 'dark');
  if (s.logo) document.getElementById('logoPreview').innerHTML = `<img src="${s.logo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;

  const session = currentSession();
  if (session){
    document.getElementById('settingsUserName').textContent = session.name || '-';
    document.getElementById('settingsUserEmail').textContent = session.email || '-';
  }
}

function onLogoChange(e){
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('logoPreview').innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    document.getElementById('logoPreview').dataset.logo = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function saveAllSettings(){
  const s = getSettings();
  s.appName = document.getElementById('settingAppName').value.trim() || APP_NAME_DEFAULT;
  s.currency = document.getElementById('settingCurrency').value;
  s.printerSize = document.getElementById('settingPrinter').value;
  const newLogo = document.getElementById('logoPreview').dataset.logo;
  if (newLogo) s.logo = newLogo;
  saveSettings(s);
  toastSuccess('تم حفظ الإعدادات بنجاح');
  setTimeout(() => location.reload(), 800);
}

function toggleDarkMode(){
  const checked = document.getElementById('darkModeToggle').checked;
  const theme = checked ? 'dark' : 'light';
  localStorage.setItem('aman_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

/* ---------- نسخ احتياطي / استعادة ---------- */
async function backupData(){
  const [customers, debts, payments] = await Promise.all([
    DataLayer.getAll('customers'), DataLayer.getAll('debts'), DataLayer.getAll('payments')
  ]);
  const backup = { exportedAt: nowISO(), settings: getSettings(), customers, debts, payments };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aman-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toastSuccess('تم تنزيل النسخة الاحتياطية');
}

async function restoreData(e){
  const file = e.target.files[0];
  if (!file) return;
  const ok = await confirmDialog('استعادة البيانات', 'سيتم استبدال البيانات الحالية بالنسخة المستعادة. هل تريد المتابعة؟');
  if (!ok) return;

  const reader = new FileReader();
  reader.onload = async (ev) => {
    try{
      const data = JSON.parse(ev.target.result);
      for (const c of (data.customers||[])) await DataLayer.add('customers', c);
      for (const d of (data.debts||[])) await DataLayer.add('debts', d);
      for (const p of (data.payments||[])) await DataLayer.add('payments', p);
      if (data.settings) saveSettings(data.settings);
      toastSuccess('تمت استعادة البيانات بنجاح');
      setTimeout(() => location.reload(), 1000);
    } catch(err){
      toastError('ملف النسخة الاحتياطية غير صالح');
    }
  };
  reader.readAsText(file);
}

loadSettingsForm();
