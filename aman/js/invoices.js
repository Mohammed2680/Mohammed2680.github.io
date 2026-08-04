<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>الفاتورة - أمان للديون</title>
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#0B2A5B">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
<link rel="stylesheet" href="css/style.css">

<style>
/* إجبار جميع الأرقام على الظهور بالإنجليزية */
body,
body * {
    font-variant-numeric: lining-nums;
    font-feature-settings: "lnum";
}

/* تحويل الأرقام العربية إلى إنجليزية داخل الفاتورة */
#invoiceCard,
#invoiceCard * {
    unicode-bidi: plaintext;
}
</style>
</head>
<body>

<div class="invoice-wrap">
  <div class="invoice-top no-print">
    <div class="icon-btn" onclick="window.print()" title="طباعة"><i class="fa-solid fa-print"></i></div>
    <div style="font-weight:800;" id="invTopTitle">فاتورة الدين</div>
    <a class="icon-btn" href="javascript:history.back()"><i class="fa-solid fa-arrow-right"></i></a>
  </div>

  <!-- شريط اختيار مقاس الطباعة -->
  <div class="paper-size-bar no-print" id="paperSizeBar">
    <span class="text-muted-app" style="font-size:.78rem;">مقاس الطباعة:</span>
    <div class="chip-row" style="flex:1;">
      <div class="chip" data-size="58">حراري 58مم</div>
      <div class="chip" data-size="80">حراري 80مم</div>
      <div class="chip" data-size="A4">A4</div>
      <div class="chip" data-size="A5">A5</div>
    </div>
  </div>

  <div class="invoice-card" id="invoiceCard">

    <!-- شعار وهوية النشاط -->
    <div class="invoice-logo" id="invoiceLogoWrap"><i class="fa-solid fa-shield-halved"></i></div>
    <h3 id="shopNameInv">أمان للديون</h3>
    <div class="inv-sub" id="shopAddrInv">—</div>
    <div class="inv-sub" id="shopPhoneInv">—</div>

    <!-- صندوق نوع الفاتورة والحالة -->
    <div class="inv-info-box" id="invInfoBox">
      <div class="inv-info-row">
        <span>نوع الفاتورة</span>
        <b id="invType" class="inv-type-badge">—</b>
      </div>
      <div class="inv-info-row"><span>رقم الفاتورة</span><b id="invNumber">#MT-2026-885</b></div>
      <div class="inv-info-row"><span>التاريخ</span><b id="invDate">—</b></div>
      <div class="inv-info-row"><span>الوقت</span><b id="invTime">—</b></div>
      <div class="inv-info-row" id="invEmployeeRow"><span>أصدرها</span><b id="invEmployee">—</b></div>
      <div class="inv-info-row" id="invDueRow" style="display:none;"><span>تاريخ الاستحقاق</span><b id="invDueDate">—</b></div>
      <div class="inv-info-row" style="margin-bottom:0;">
        <span>حالة الدين</span>
        <span id="invDebtStatus" class="debt-status-pill">—</span>
      </div>
    </div>

    <div class="inv-debt-notice no-empty" id="invDebtNotice"></div>

    <hr class="inv-divider">

    <div class="inv-row"><span>اسم العميل</span><b id="invCustName">—</b></div>
    <div class="inv-row" id="invCustPhoneRow"><span>رقم الهاتف</span><b id="invCustPhone">—</b></div>

    <hr class="inv-divider">

    <table class="inv-table">
      <thead><tr><th>الوصف</th><th>الكمية</th><th>المبلغ</th></tr></thead>
      <tbody id="invItemsBody"></tbody>
    </table>

    <div class="inv-total-box">
      <div class="inv-row"><span>إجمالي الفاتورة</span><b id="invNewTotal">0 ريال</b></div>
      <div class="inv-row" id="invDiscountRow"><span>إجمالي الخصم</span><b id="invDiscount" style="color:var(--red)">0 ريال</b></div>
      <div class="inv-row"><span>المبلغ المدفوع</span><b id="invPaid" style="color:var(--green-darker)">0 ريال</b></div>
      <div class="inv-row" style="margin-bottom:0;"><span>الرصيد بعد الخصم</span><b id="invGrandTotal" style="font-size:1.05rem;">0 ريال</b></div>
    </div>

    <div class="inv-remain">
      <div class="inv-qr" id="qrCanvasWrap"></div>
      <div style="text-align:left;">
        <div class="text-muted-app" style="font-size:.8rem;">المتبقي للتحصيل من إجمالي حساب العميل</div>
        <div style="font-weight:800;color:var(--red);font-size:1.1rem;" id="invRemaining">0 ريال</div>
      </div>
    </div>

    <div class="inv-notes-box" id="invNotesBox" style="display:none;">
      <div class="text-muted-app" style="font-size:.78rem;margin-bottom:4px;"><i class="fa-regular fa-note-sticky"></i> ملاحظات خاصة بالفاتورة</div>
      <div id="invNotesText" style="font-size:.85rem;"></div>
    </div>

    <!-- قسم طرق السداد -->
    <div class="inv-payment-section" id="invPaymentSection">
      <div class="inv-payment-title">طرق السداد</div>
      <div class="inv-payment-methods" id="invPaymentMethods"></div>
      <div class="inv-payment-note" id="invPaymentNote"></div>
    </div>

    <!-- توقيع / ختم -->
    <div class="inv-sign-row" id="invSignRow" style="display:none;">
      <div class="inv-sign-box">
        <div class="text-muted-app" style="font-size:.72rem;">توقيع العميل</div>
        <canvas id="custSignCanvas" width="140" height="60"></canvas>
      </div>
      <div class="inv-sign-box" id="invStampBox" style="display:none;">
        <div class="text-muted-app" style="font-size:.72rem;">ختم / توقيع المسؤول</div>
        <img id="invStampImg" alt="ختم" style="max-height:60px;max-width:140px;">
      </div>
    </div>
    <div class="no-print" id="signClearWrap" style="display:none;text-align:center;margin-top:4px;">
      <a href="#" onclick="clearSignature();return false;" style="font-size:.75rem;color:var(--text-muted);">مسح التوقيع</a>
    </div>

    <div class="inv-thanks" id="invThanks">شكرًا لتعاملكم معنا، نأمل مراجعة الحساب باستمرار.</div>
    <div style="text-align:center;margin-top:10px;" id="barcodeWrap"></div>
    <div class="inv-verify no-empty" id="invVerifyText" style="text-align:center;font-size:.68rem;color:var(--text-muted);margin-top:6px;"></div>
  </div>

  <div class="inv-actions no-print">
    <div class="inv-action-grid">
      <button class="btn-app btn-navy" onclick="downloadPdf()"><i class="fa-solid fa-file-pdf"></i> PDF</button>
      <button class="btn-app btn-outline" onclick="downloadWord()"><i class="fa-solid fa-file-word"></i> Word</button>
      <button class="btn-app btn-outline" onclick="downloadPng()"><i class="fa-solid fa-file-image"></i> صورة PNG</button>
      <button class="btn-app btn-outline" onclick="window.print()"><i class="fa-solid fa-print"></i> طباعة</button>
    </div>
    <div class="inv-action-grid" style="margin-top:10px;">
      <button class="btn-app btn-light" onclick="shareWhatsapp()"><i class="fa-brands fa-whatsapp"></i> واتساب</button>
      <button class="btn-app btn-light" onclick="shareTelegram()"><i class="fa-brands fa-telegram"></i> تيليجرام</button>
      <button class="btn-app btn-light" onclick="shareEmail()"><i class="fa-regular fa-envelope"></i> إيميل</button>
      <button class="btn-app btn-light" onclick="copyInvoiceLink()"><i class="fa-solid fa-link"></i> نسخ رابط</button>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="js/app.js"></script>
<script src="js/android-bridge.js"></script>
<script src="js/firebase.js"></script>
<script>
function convertArabicNumbersToEnglish(text) {
    if (!text) return text;

    return String(text).replace(/[٠-٩]/g, function(number) {
        return "٠١٢٣٤٥٦٧٨٩".indexOf(number);
    });
}

document.addEventListener("DOMContentLoaded", function () {

    const observer = new MutationObserver(function () {

        document.querySelectorAll("#invoiceCard *").forEach(function(el){

            if (el.childNodes.length === 1 &&
                el.childNodes[0].nodeType === 3) {

                el.textContent = convertArabicNumbersToEnglish(
                    el.textContent
                );

            }

        });

    });

    observer.observe(document.getElementById("invoiceCard"), {
        childList: true,
        subtree: true
    });

});
</script>

<script src="js/invoices.js"></script>
</body>
</html>
list)); }
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
  pdf.save(invoiceFileName("pdf"));
}

/* ------------------- تصدير صورة PNG ------------------- */
async function downloadPng() {
  if (!window.html2canvas) return toast("error", "تعذر تجهيز الصورة");
  toast("info", "جاري تجهيز الصورة...");
  const card = qs("#invoiceCard");
  const canvas = await html2canvas(card, { scale: 2, backgroundColor: "#ffffff" });
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = invoiceFileName("png");
  link.click();
}

/* ------------------- تصدير Word (.doc متوافق مع Word) ------------------- */
function downloadWord() {
  const card = qs("#invoiceCard");
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset="utf-8"><title>فاتورة</title></head>
  <body dir="rtl" style="font-family:Cairo,Tahoma,sans-serif;">${card.outerHTML}</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: "application/msword" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = invoiceFileName("doc");
  link.click();
  toast("success", "تم تجهيز ملف Word");
}

/* ------------------- المشاركة ------------------- */
function shareWhatsapp() {
  const text = encodeURIComponent(`فاتورة من ${settings.shopName || "أمان للديون"} - العميل: ${customer?.name || ""} - المبلغ: ${fmtMoney(txn?.amount || 0)} ريال - رقم الفاتورة: #${DB.formatInvoiceNo(txn?.invoiceNo)}`);
  window.open(`https://wa.me/?text=${text}`, "_blank");
}
function shareTelegram() {
  const text = encodeURIComponent(`فاتورة من ${settings.shopName || "أمان للديون"} - العميل: ${customer?.name || ""} - المبلغ: ${fmtMoney(txn?.amount || 0)} ريال`);
  window.open(`https://t.me/share/url?url=${encodeURIComponent(location.href)}&text=${text}`, "_blank");
}
function shareEmail() {
  const subject = encodeURIComponent(`فاتورة #${DB.formatInvoiceNo(txn?.invoiceNo)} - ${settings.shopName || "أمان للديون"}`);
  const body = encodeURIComponent(`مرفق تفاصيل الفاتورة:\nالعميل: ${customer?.name || ""}\nالمبلغ: ${fmtMoney(txn?.amount || 0)} ريال\nالتاريخ: ${txn?.date || ""}`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
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
