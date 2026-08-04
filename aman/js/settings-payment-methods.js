/* أمان للديون - settings-payment-methods.js */
Auth.requireAuth();

const modal = () => new bootstrap.Modal(document.getElementById("methodModal"));
let draggedId = null;

function loadSectionSettings() {
  const s = DB.getSettings();
  qs("#pmEnabled").checked = s.paymentMethodsEnabled !== false;
  qs("#pmScope").value = s.paymentMethodsScope || "all";
  qs("#paymentNoteInput").value = s.paymentNote || "";
}
qs("#pmEnabled").addEventListener("change", (e) => {
  DB.saveSettings({ paymentMethodsEnabled: e.target.checked });
  toast("success", "تم تحديث الإعداد");
});
qs("#pmScope").addEventListener("change", (e) => {
  DB.saveSettings({ paymentMethodsScope: e.target.value });
  toast("success", "تم تحديث نطاق الظهور");
});
qs("#paymentNoteInput").addEventListener("change", (e) => {
  DB.saveSettings({ paymentNote: e.target.value.trim() });
  toast("success", "تم تحديث رسالة السداد");
});

function renderList() {
  const methods = DB.getPaymentMethods();
  const wrap = qs("#methodsList");
  if (!methods.length) {
    wrap.innerHTML = `<div class="empty-state"><i class="fa-regular fa-credit-card"></i>لا توجد وسائل سداد بعد</div>`;
    return;
  }
  wrap.innerHTML = methods.map((m) => `
    <div class="pm-row" draggable="true" data-id="${m.id}">
      <div class="pm-row-drag"><i class="fa-solid fa-grip-lines"></i></div>
      ${m.logo ? `<img src="${m.logo}" class="pm-row-logo">` : `<div class="pm-row-icon"><i class="${m.icon || 'fa-solid fa-circle-dot'}"></i></div>`}
      <div class="pm-row-info" onclick="openMethodForm('${m.id}')">
        <div class="pm-row-name">${m.name}</div>
        <div class="pm-row-meta">${m.visible === false ? "مخفية" : "ظاهرة"} · ${m.scope === "credit" ? "آجلة فقط" : "كل الفواتير"}</div>
      </div>
      <label class="switch" style="flex:0 0 auto;">
        <input type="checkbox" ${m.visible !== false ? "checked" : ""} onchange="toggleVisible('${m.id}', this.checked)">
        <span class="slider"></span>
      </label>
    </div>`).join("");

  qsa(".pm-row").forEach((row) => {
    row.addEventListener("dragstart", () => { draggedId = row.dataset.id; row.classList.add("dragging"); });
    row.addEventListener("dragend", () => row.classList.remove("dragging"));
    row.addEventListener("dragover", (e) => e.preventDefault());
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      const targetId = row.dataset.id;
      if (!draggedId || draggedId === targetId) return;
      const ids = qsa(".pm-row").map((r) => r.dataset.id);
      const from = ids.indexOf(draggedId);
      const to = ids.indexOf(targetId);
      ids.splice(from, 1);
      ids.splice(to, 0, draggedId);
      DB.reorderPaymentMethods(ids);
      renderList();
    });
  });
}

function toggleVisible(id, visible) {
  DB.savePaymentMethod({ id, visible });
  renderList();
}
window.toggleVisible = toggleVisible;

let currentDetailRows = 0;
function addDetailRow(label = "", value = "") {
  const wrap = qs("#detailsWrap");
  const idx = currentDetailRows++;
  const row = document.createElement("div");
  row.className = "detail-row";
  row.dataset.idx = idx;
  row.innerHTML = `
    <input class="control" placeholder="اسم الحقل (مثال: رقم الآيبان)" value="${label}" style="margin-bottom:6px;">
    <div style="display:flex;gap:8px;">
      <input class="control" placeholder="القيمة" value="${value}" style="flex:1;">
      <button type="button" class="icon-btn" style="color:var(--red);" onclick="this.closest('.detail-row').remove()"><i class="fa-solid fa-xmark"></i></button>
    </div>`;
  wrap.appendChild(row);
}
window.addDetailRow = addDetailRow;

function openMethodForm(id) {
  qs("#methodForm").reset();
  qs("#detailsWrap").innerHTML = "";
  currentDetailRows = 0;
  qs("#mLogoFile").value = "";
  qs("#mQrFile").value = "";
  qs("#mLogoLabel").textContent = "ارفع صورة الشعار";
  qs("#mQrLabel").textContent = "ارفع صورة QR";
  qs("#mId").value = id || "";
  qs("#deleteMethodBtn").style.display = id ? "flex" : "none";

  if (id) {
    const m = DB.getPaymentMethods().find((x) => x.id === id);
    qs("#methodModalTitle").textContent = "تعديل وسيلة السداد";
    qs("#mName").value = m.name || "";
    qs("#mIconSelect").value = m.icon || "fa-solid fa-wallet";
    qs("#mVisible").checked = m.visible !== false;
    qs("#mScope").value = m.scope || "all";
    qs("#methodForm").dataset.logo = m.logo || "";
    qs("#methodForm").dataset.qr = m.qr || "";
    if (m.logo) qs("#mLogoLabel").textContent = "تم رفع شعار ✓";
    if (m.qr) qs("#mQrLabel").textContent = "تم رفع QR ✓";
    (m.details || []).forEach((d) => addDetailRow(d.label, d.value));
  } else {
    qs("#methodModalTitle").textContent = "إضافة وسيلة سداد جديدة";
    qs("#methodForm").dataset.logo = "";
    qs("#methodForm").dataset.qr = "";
  }
  if (!qs("#detailsWrap").children.length) addDetailRow();
  modal().show();
}
window.openMethodForm = openMethodForm;

qs("#mLogoFile").addEventListener("change", async (e) => {
  const dataUrl = await fileToDataUrl(e.target.files[0]);
  qs("#methodForm").dataset.logo = dataUrl;
  qs("#mLogoLabel").textContent = "تم رفع شعار ✓";
});
qs("#mQrFile").addEventListener("change", async (e) => {
  const dataUrl = await fileToDataUrl(e.target.files[0], 600);
  qs("#methodForm").dataset.qr = dataUrl;
  qs("#mQrLabel").textContent = "تم رفع QR ✓";
});

qs("#methodForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const details = qsa("#detailsWrap .detail-row").map((row) => {
    const inputs = row.querySelectorAll("input");
    return { label: inputs[0].value.trim(), value: inputs[1].value.trim() };
  }).filter((d) => d.label || d.value);

  DB.savePaymentMethod({
    id: qs("#mId").value || undefined,
    name: qs("#mName").value.trim(),
    icon: qs("#mIconSelect").value,
    logo: qs("#methodForm").dataset.logo || "",
    qr: qs("#methodForm").dataset.qr || "",
    details,
    visible: qs("#mVisible").checked,
    scope: qs("#mScope").value,
  });
  bootstrap.Modal.getInstance(qs("#methodModal"))?.hide();
  toast("success", "تم حفظ وسيلة السداد");
  renderList();
});

async function deleteCurrentMethod() {
  const id = qs("#mId").value;
  if (!id) return;
  const ok = await confirmDialog("حذف وسيلة السداد؟", "لن تظهر هذه الوسيلة بعد الآن في الفواتير.");
  if (!ok) return;
  DB.deletePaymentMethod(id);
  bootstrap.Modal.getInstance(qs("#methodModal"))?.hide();
  toast("success", "تم حذف الوسيلة");
  renderList();
}
window.deleteCurrentMethod = deleteCurrentMethod;

loadSectionSettings();
renderList();
