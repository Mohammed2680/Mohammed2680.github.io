/* أمان للديون - invoices.js (فاتورة احترافية) */
Auth.requireAuth();

const type = getParam("type") || "debt"; // debt | payment
const custId = getParam("custId");
const txnId = getParam("txnId");

const settings = DB.getSettings();
const identity = settings.invoiceIdentity || {};
const printSettings = settings.printSettings || {};

/* ---------- هوية الفاتورة (شعار / ألوان) ---------- */
if (identity.primaryColor) document.documentElement.style.setProperty("--navy", identity.primaryColor);
if (identity.accentColor) document.documentElement.style.setProperty("--green", identity.accentColor);
if (identity.logo && printSettings.showLogo !== false) {
  qs("#invoiceLogoWrap").innerHTML = `<img src="${identity.logo}" alt="شعار" style="width:100%;height:100%;object-fit:contain;border-radius:16px;">`;
} else if (printSettings.showLogo === false) {
  qs("#invoiceLogoWrap").style.display = "none";
}
if (identity.icon && printSettings.showLogo !== false) {
  const iconBadge = document.createElement("div");
  iconBadge.className = "inv-icon-badge";
  iconBadge.innerHTML = `<img src="${identity.icon}" alt="أيقونة">`;
  qs("#invoiceLogoWrap").style.position = "relative";
  qs("#invoiceLogoWrap").appendChild(iconBadge);
}

qs("#shopNameInv").textContent = settings.shopName || "أمان للديون";
qs("#shopAddrInv").textContent = settings.address || "";
qs("#shopPhoneInv").textContent = settings.phone ? "هاتف: " + settings.phone : "";
if (!settings.address) qs("#shopAddrInv").style.display = "none";
if (!settings.phone) qs("#shopPhoneInv").style.display = "none";

/* ---------- مقاس الطباعة ---------- */
const invoiceWrap = qs(".invoice-wrap");
function applyPaperSize(size) {
  invoiceWrap.classList.remove("paper-58", "paper-80", "paper-a4", "paper-a5");
  invoiceWrap.classList.add("paper-" + String(size).toLowerCase());
  qsa("#paperSizeBar .chip").forEach((c) => c.classList.toggle("active", c.dataset.size === size));
}
applyPaperSize(getParam("paper") || printSettings.defaultPaperSize || "58");
qsa("#paperSizeBar .chip").forEach((chip) => chip.addEventListener("click", () => applyPaperSize(chip.dataset.size)));

qs("#invoiceCard").classList.add("font-" + (printSettings.fontSize || "md"));
qs("#invoiceCard").classList.add("margin-" + (printSettings.margin || "md"));

/* ---------- تحميل بيانات الفاتورة ---------- */
const customer = DB.getCustomer(custId);
const allTxns = DB.getTxnsFor(custId);
const txn = allTxns.find((t) => t.id === txnId) || allTxns[0];

if (!customer || !txn) {
  qs("#invoiceCard").innerHTML = `<div class="empty-state"><i class="fa-regular fa-file"></i>لا توجد بيانات كافية لعرض الفاتورة</div>`;
  qs(".inv-actions").style.display = "none";
  qs("#paperSizeBar").style.display = "none";
} else {
  const isDebt = type === "debt";
  const invoiceTypeVal = isDebt ? (txn.invoiceType || "credit") : "cash"; // نقدية | آجلة
  document.title = (isDebt ? "فاتورة الدين" : "فاتورة السداد") + " - " + (settings.shopName || "أمان للديون");
  qs("#invTopTitle").textContent = isDebt ? "فاتورة الدين" : "فاتورة السداد";

  const invNoFormatted = "#" + DB.formatInvoiceNo(txn.invoiceNo);
  qs("#invNumber").textContent = invNoFormatted;
  qs("#invDate").textContent = txn.date;
  qs("#invTime").textContent = txn.time || "—";
  if (txn.issuedBy) { qs("#invEmployee").textContent = txn.issuedBy; }
  else { qs("#invEmployeeRow").style.display = "none"; }

  // نوع الفاتورة
  const typeBadge = qs("#invType");
  typeBadge.textContent = invoiceTypeVal === "cash" ? "نقدية" : "آجلة";
  typeBadge.className = "inv-type-badge " + (invoiceTypeVal === "cash" ? "type-cash" : "type-credit");

  // تاريخ الاستحقاق (اختياري)
  if (isDebt && txn.dueDate) {
    qs("#invDueRow").style.display = "flex";
    qs("#invDueDate").textContent = txn.dueDate;
  }

  // بند الفاتورة
  const desc = isDebt ? (txn.reason || "دين جديد") : `تسديد دفعة (${txn.method || "نقدية"})`;
  qs("#invItemsBody").innerHTML = `<tr><td>${desc}</td><td>1</td><td>${fmtMoney(txn.amount)} ريال</td></tr>`;

  // اسم العميل وهاتفه
  qs("#invCustName").textContent = customer.name;
  if (customer.phone) qs("#invCustPhone").textContent = customer.phone;
  else qs("#invCustPhoneRow").style.display = "none";

  // حساب الرصيد السابق (كل العمليات قبل هذه العملية زمنياً)
  const idx = allTxns.findIndex((t) => t.id === txn.id);
  const priorTxns = allTxns.slice(idx + 1);
  const prevBalance = priorTxns.reduce((s, t) => s + (t.type === "debt" ? t.amount - (t.discount || 0) : -t.amount), 0);
  const discount = isDebt ? Number(txn.discount || 0) : 0;
  const netAmount = txn.amount - discount;
  const paidAmount = isDebt ? (invoiceTypeVal === "cash" ? netAmount : 0) : txn.amount;
  const remainingThisInvoice = isDebt ? (invoiceTypeVal === "cash" ? 0 : netAmount) : 0;
  const currentBalanceAfter = isDebt ? prevBalance + netAmount - (invoiceTypeVal === "cash" ? netAmount : 0) : prevBalance - txn.amount;
  const totalOwedNow = DB.balanceFor(custId);

  qs("#invPrevBalance").textContent = `${fmtMoney(Math.max(prevBalance, 0))} ريال`;
  qs("#invNewTotal").textContent = `${fmtMoney(txn.amount)} ريال`;
  if (discount > 0) { qs("#invDiscount").textContent = `${fmtMoney(discount)} ريال`; }
  else qs("#invDiscountRow").style.display = "none";
  qs("#invPaid").textContent = `${fmtMoney(paidAmount)} ريال`;
  qs("#invRemainingRow").textContent = `${fmtMoney(remainingThisInvoice)} ريال`;
  qs("#invGrandTotal").textContent = `${fmtMoney(Math.max(currentBalanceAfter, 0))} ريال`;
  qs("#invRemaining").textContent = `${fmtMoney(Math.max(totalOwedNow, 0))} ريال`;

  // حالة الدين
  const status = DB.debtStatusFor(custId, txn);
  const statusEl = qs("#invDebtStatus");
  const statusMap = {
    paid: { text: "🟢 مسدد", cls: "status-paid" },
    due: { text: "🟡 مستحق", cls: "status-due" },
    late: { text: "🔴 متأخر", cls: "status-late" },
  };
  statusEl.textContent = statusMap[status].text;
  statusEl.className = "debt-status-pill " + statusMap[status].cls;

  // إشعار الدين التلقائي (فواتير آجلة غير مسددة)
  if (isDebt && invoiceTypeVal === "credit" && status !== "paid") {
    qs("#invDebtNotice").textContent = settings.debtNoticeText || "إشعار دين: نأمل التكرم بسداد المبلغ المستحق في أقرب وقت. شكرًا لكم.";
    qs("#invDebtNotice").classList.add("show");
  }

  // ملاحظات خاصة بالفاتورة
  if (txn.notes) {
    qs("#invNotesBox").style.display = "block";
    qs("#invNotesText").textContent = txn.notes;
  }

  // ------------ قسم طرق السداد ------------
  const isCreditInvoice = isDebt && invoiceTypeVal === "credit";
  const sectionShouldShow = settings.paymentMethodsEnabled !== false &&
    (settings.paymentMethodsScope !== "creditOnly" || isCreditInvoice);
  if (sectionShouldShow) {
    const methods = DB.getPaymentMethods().filter((m) => m.visible !== false && (m.scope !== "credit" || isCreditInvoice));
    if (methods.length) {
      qs("#invPaymentMethods").innerHTML = methods.map((m) => `
        <div class="pm-item">
          <div class="pm-item-head">
            ${m.logo ? `<img src="${m.logo}" class="pm-logo">` : `<div class="pm-icon"><i class="${m.icon || 'fa-solid fa-circle-dot'}"></i></div>`}
            <div class="pm-name">${m.name}</div>
          </div>
          ${(m.details || []).filter(d => d.value).map(d => `<div class="pm-detail"><span>${d.label}</span><b>${d.value}</b></div>`).join("")}
          ${m.qr ? `<img src="${m.qr}" class="pm-qr" alt="QR">` : ""}
        </div>`).join("");
      qs("#invPaymentNote").textContent = settings.paymentNote || "";
      qs("#invPaymentSection").classList.add("show");
    } else {
      qs("#invPaymentSection").style.display = "none";
    }
  } else {
    qs("#invPaymentSection").style.display = "none";
  }

  // ------------ التوقيع والختم ------------
  if (printSettings.showSignature !== false) {
    qs("#invSignRow").style.display = "flex";
    if (identity.stamp) {
      qs("#invStampBox").style.display = "block";
      qs("#invStampImg").src = identity.stamp;
    }
    initSignaturePad(txn);
  }

  // ------------ QR + Barcode ------------
  if (printSettings.showQR !== false && window.QRCode) {
    new QRCode(qs("#qrCanvasWrap"), {
      text: `AMAN-VERIFY:${invNoFormatted}:${customer.name}:${txn.amount}:${txn.date}`,
      width: 56, height: 56, colorDark: "#0B2A5B", colorLight: "#ffffff",
    });
    qs("#invVerifyText").textContent = `رمز التحقق من صحة الفاتورة: ${invNoFormatted}`;
  } else {
    qs("#qrCanvasWrap").style.display = "none";
  }
  if (window.JsBarcode) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    qs("#barcodeWrap").appendChild(svg);
    JsBarcode(svg, invNoFormatted.replace("#", ""), { height: 36, displayValue: false, margin: 0 });
  }

  qs("#invThanks").textContent = "شكرًا لتعاملكم معنا، نأمل مراجعة الحساب باستمرار.";
}

/* ------------------- توقيع العميل (Canvas) ------------------- */
function initSignaturePad(txn) {
  const box = qs("#custSignCanvas");
  if (!box) return;
  if (txn.custSignature) {
    const img = document.createElement("img");
    img.src = txn.custSignature;
    img.style.maxWidth = "140px";
    img.style.maxHeight = "60px";
    box.replaceWith(img);
    return;
  }
  qs("#signClearWrap").style.display = "block";
  const ctx = box.getContext("2d");
  ctx.strokeStyle = "#0B2A5B";
  ctx.lineWidth = 2;
  let drawing = false;
  function pos(e) {
    const r = box.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  }
  function start(e) { drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
  function move(e) { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
  function end() {
    if (!drawing) return;
    drawing = false;
    try {
      const list = DB.getTxns();
      const idx = list.findIndex((t) => t.id === txn.id);
      if (idx > -1) { list[idx].custSignature = box.toDataURL("image/png"); localStorage.setItem("aman_txns", JSON.stringify(list)); }
    } catch (e) {}
  }
  box.addEventListener("mousedown", start); box.addEventListener("mousemove", move); window.addEventListener("mouseup", end);
  box.addEventListener("touchstart", start); box.addEventListener("touchmove", move); box.addEventListener("touchend", end);
}
function clearSignature() {
  const box = qs("#custSignCanvas");
  if (box && box.getContext) box.getContext("2d").clearRect(0, 0, box.width, box.height);
}
window.clearSignature = clearSignature;

/* ------------------- اسم ملف الفاتورة ------------------- */
function invoiceFileName(ext) {
  const no = DB.formatInvoiceNo(txn.invoiceNo);
  return `فاتورة-${no}.${ext}`;
}

/* ------------------- تصدير PDF ------------------- */
async function downloadPdf() {
  if (!window.html2canvas || !window.jspdf) return toast("error", "تعذر تجهيز أدوات PDF");
  toast("info", "جاري تجهيز ملف PDF...");
  const card = qs("#invoiceCard");
  const canvas = await html2canvas(card, { scale: 2, backgroundColor: "#ffffff" });
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "px", format: [canvas.width, canvas.height] });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
  if (window.IS_ANDROID_APP) {
    const dataUrl = pdf.output("datauristring");
    const res = await androidSaveFile(dataUrl, invoiceFileName("pdf"), "application/pdf");
    toast(res && res.success ? "success" : "error", res && res.success ? "تم حفظ الملف في مجلد التنزيلات" : "تعذر حفظ الملف");
  } else {
    pdf.save(invoiceFileName("pdf"));
  }
}

/* ------------------- تصدير صورة PNG ------------------- */
async function downloadPng() {
  if (!window.html2canvas) return toast("error", "تعذر تجهيز الصورة");
  toast("info", "جاري تجهيز الصورة...");
  const card = qs("#invoiceCard");
  const canvas = await html2canvas(card, { scale: 2, backgroundColor: "#ffffff" });
  const dataUrl = canvas.toDataURL("image/png");
  if (window.IS_ANDROID_APP) {
    const res = await androidSaveFile(dataUrl, invoiceFileName("png"), "image/png");
    toast(res && res.success ? "success" : "error", res && res.success ? "تم حفظ الصورة في مجلد التنزيلات" : "تعذر حفظ الصورة");
  } else {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = invoiceFileName("png");
    link.click();
  }
}

/* ------------------- تصدير Word (.doc متوافق مع Word) ------------------- */
async function downloadWord() {
  const card = qs("#invoiceCard");
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset="utf-8"><title>فاتورة</title></head>
  <body dir="rtl" style="font-family:Cairo,Tahoma,sans-serif;">${card.outerHTML}</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: "application/msword" });
  if (window.IS_ANDROID_APP) {
    const res = await androidSaveFile(blob, invoiceFileName("doc"), "application/msword");
    toast(res && res.success ? "success" : "error", res && res.success ? "تم حفظ ملف Word في مجلد التنزيلات" : "تعذر حفظ الملف");
  } else {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = invoiceFileName("doc");
    link.click();
    toast("success", "تم تجهيز ملف Word");
  }
}

/* ------------------- المشاركة ------------------- */
function shareWhatsapp() {
  const text = `فاتورة من ${settings.shopName || "أمان للديون"} - العميل: ${customer?.name || ""} - المبلغ: ${fmtMoney(txn?.amount || 0)} ريال - رقم الفاتورة: #${DB.formatInvoiceNo(txn?.invoiceNo)}`;
  if (window.IS_ANDROID_APP) return androidOpenWhatsapp(text);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}
function shareTelegram() {
  const text = `فاتورة من ${settings.shopName || "أمان للديون"} - العميل: ${customer?.name || ""} - المبلغ: ${fmtMoney(txn?.amount || 0)} ريال`;
  if (window.IS_ANDROID_APP) return androidOpenTelegram(text);
  window.open(`https://t.me/share/url?url=${encodeURIComponent(location.href)}&text=${encodeURIComponent(text)}`, "_blank");
}
function shareEmail() {
  const subject = `فاتورة #${DB.formatInvoiceNo(txn?.invoiceNo)} - ${settings.shopName || "أمان للديون"}`;
  const body = `مرفق تفاصيل الفاتورة:\nالعميل: ${customer?.name || ""}\nالمبلغ: ${fmtMoney(txn?.amount || 0)} ريال\nالتاريخ: ${txn?.date || ""}`;
  if (window.IS_ANDROID_APP) return androidSendEmail(subject, body);
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
async function copyInvoiceLink() {
  try {
    await navigator.clipboard.writeText(location.href);
    toast("success", "تم نسخ رابط الفاتورة (يعمل بشكل كامل عند تفعيل المزامنة السحابية بين الأجهزة)");
  } catch {
    toast("error", "تعذر نسخ الرابط");
  }
}
window.shareWhatsapp = shareWhatsapp;
window.shareTelegram = shareTelegram;
window.shareEmail = shareEmail;
window.copyInvoiceLink = copyInvoiceLink;
window.downloadPdf = downloadPdf;
window.downloadPng = downloadPng;
window.downloadWord = downloadWord;
