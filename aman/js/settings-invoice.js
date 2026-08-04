/* أمان للديون - settings-invoice.js (هوية الفاتورة + إعدادات الطباعة) */
Auth.requireAuth();

const settings = DB.getSettings();
const identity = settings.invoiceIdentity || {};
const printSettings = settings.printSettings || {};

function refreshPreviews() {
  const s = DB.getSettings();
  const id = s.invoiceIdentity || {};
  qs("#logoPreview").innerHTML = id.logo ? `<img src="${id.logo}">` : `<i class="fa-solid fa-shield-halved"></i>`;
  qs("#iconPreview").innerHTML = id.icon ? `<img src="${id.icon}">` : `<i class="fa-solid fa-icons"></i>`;
  qs("#stampPreview").innerHTML = id.stamp ? `<img src="${id.stamp}">` : `<i class="fa-regular fa-file-signature"></i>`;
}

// تحميل القيم الحالية
qs("#shopNameInput").value = settings.shopName || "";
qs("#shopAddressInput").value = settings.address || "";
qs("#shopPhoneInput").value = settings.phone || "";
qs("#ownerNameInput").value = settings.ownerName || "";
qs("#primaryColorInput").value = identity.primaryColor || "#0B2A5B";
qs("#accentColorInput").value = identity.accentColor || "#8EF0B2";
qs("#paperSizeInput").value = printSettings.defaultPaperSize || "58";
qs("#fileTypeInput").value = printSettings.defaultFileType || "pdf";
qs("#fontSizeInput").value = printSettings.fontSize || "md";
qs("#marginInput").value = printSettings.margin || "md";
qs("#showLogoInput").checked = printSettings.showLogo !== false;
qs("#showQrInput").checked = printSettings.showQR !== false;
qs("#showSignInput").checked = printSettings.showSignature !== false;
qs("#copiesInput").value = printSettings.copies || 1;
qs("#debtNoticeInput").value = settings.debtNoticeText || "";
refreshPreviews();

function saveField(field, value) {
  DB.saveSettings({ [field]: value });
  toast("success", "تم الحفظ");
}
function saveIdentity(patch) {
  DB.saveSettings({ invoiceIdentity: { ...(DB.getSettings().invoiceIdentity || {}), ...patch } });
  refreshPreviews();
  toast("success", "تم الحفظ");
}
function savePrint(patch) {
  DB.saveSettings({ printSettings: { ...(DB.getSettings().printSettings || {}), ...patch } });
  toast("success", "تم الحفظ");
}

qs("#shopNameInput").addEventListener("change", (e) => saveField("shopName", e.target.value.trim()));
qs("#shopAddressInput").addEventListener("change", (e) => saveField("address", e.target.value.trim()));
qs("#shopPhoneInput").addEventListener("change", (e) => saveField("phone", e.target.value.trim()));
qs("#ownerNameInput").addEventListener("change", (e) => saveField("ownerName", e.target.value.trim()));
qs("#debtNoticeInput").addEventListener("change", (e) => saveField("debtNoticeText", e.target.value.trim()));

qs("#primaryColorInput").addEventListener("change", (e) => saveIdentity({ primaryColor: e.target.value }));
qs("#accentColorInput").addEventListener("change", (e) => saveIdentity({ accentColor: e.target.value }));

qs("#logoFile").addEventListener("change", async (e) => saveIdentity({ logo: await fileToDataUrl(e.target.files[0]) }));
qs("#iconFile").addEventListener("change", async (e) => saveIdentity({ icon: await fileToDataUrl(e.target.files[0], 256) }));
qs("#stampFile").addEventListener("change", async (e) => saveIdentity({ stamp: await fileToDataUrl(e.target.files[0], 300) }));

qs("#paperSizeInput").addEventListener("change", (e) => savePrint({ defaultPaperSize: e.target.value }));
qs("#fileTypeInput").addEventListener("change", (e) => savePrint({ defaultFileType: e.target.value }));
qs("#fontSizeInput").addEventListener("change", (e) => savePrint({ fontSize: e.target.value }));
qs("#marginInput").addEventListener("change", (e) => savePrint({ margin: e.target.value }));
qs("#showLogoInput").addEventListener("change", (e) => savePrint({ showLogo: e.target.checked }));
qs("#showQrInput").addEventListener("change", (e) => savePrint({ showQR: e.target.checked }));
qs("#showSignInput").addEventListener("change", (e) => savePrint({ showSignature: e.target.checked }));
qs("#copiesInput").addEventListener("change", (e) => savePrint({ copies: Number(e.target.value) || 1 }));
