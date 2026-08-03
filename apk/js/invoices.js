/* أمان للديون - invoices.js */
Auth.requireAuth();

const type = getParam("type") || "debt"; // debt | payment
const custId = getParam("custId");
const txnId = getParam("txnId");

const settings = DB.getSettings();
qs("#shopNameInv").textContent = settings.shopName || "أمان للديون";
qs("#shopAddrInv").textContent = settings.address || "صنعاء - شارع الخمسين";
qs("#shopPhoneInv").textContent = "هاتف: " + (settings.phone || "456-123-777");

const customer = DB.getCustomer(custId);
const allTxns = DB.getTxnsFor(custId);
const txn = allTxns.find((t) => t.id === txnId) || allTxns[0];

if (!customer || !txn) {
  qs("#invoiceCard").innerHTML = `<div class="empty-state"><i class="fa-regular fa-file"></i>لا توجد بيانات كافية لعرض الفاتورة</div>`;
} else {
  document.title = (type === "payment" ? "فاتورة السداد" : "فاتورة الدين") + " - أمان للديون";
  qs(".invoice-top div:nth-child(3)").textContent = type === "payment" ? "فاتورة السداد" : "فاتورة الدين";

  qs("#invCustName").textContent = customer.name;
  qs("#invNumber").textContent = "#RCV-" + txn.id.slice(-6).toUpperCase();
  qs("#invDate").textContent = txn.date;
  qs("#invTime").textContent = txn.time || "—";

  // بند الفاتورة (بند واحد يمثل هذه العملية)
  const desc = type === "payment" ? `تسديد دفعة (${txn.method || "نقدية"})` : (txn.reason || "دين جديد");
  qs("#invItemsBody").innerHTML = `<tr><td>${desc}</td><td>1</td><td>${fmtMoney(txn.amount)} ريال</td></tr>`;

  // حساب الرصيد السابق (كل العمليات قبل هذه)
  const idx = allTxns.findIndex((t) => t.id === txn.id);
  const priorTxns = allTxns.slice(idx + 1); // الأقدم بعد هذا في الترتيب التنازلي
  const prevBalance = priorTxns.reduce((s, t) => s + (t.type === "debt" ? t.amount : -t.amount), 0);
  const newTotal = type === "payment" ? -txn.amount : txn.amount;
  const grandTotal = prevBalance + (type === "debt" ? txn.amount : 0);
  const paidAmount = type === "payment" ? txn.amount : 0;
  const remaining = DB.balanceFor(custId);

  qs("#invNewTotal").textContent = `${fmtMoney(txn.amount)} ريال`;
  qs("#invPrevBalance").textContent = `${fmtMoney(Math.max(prevBalance, 0))} ريال`;
  qs("#invGrandTotal").textContent = `${fmtMoney(Math.max(type === "debt" ? grandTotal : prevBalance, 0))} ريال`;
  qs("#invPaidRow").style.display = type === "payment" ? "flex" : "none";
  qs("#invPaid").textContent = `${fmtMoney(paidAmount)} ريال`;
  qs("#invRemaining").textContent = `${fmtMoney(Math.max(remaining, 0))} ريال`;

  // QR Code
  if (window.QRCode) {
    new QRCode(qs("#qrCanvasWrap"), {
      text: `AMAN-INVOICE:${qs("#invNumber").textContent}:${customer.name}:${txn.amount}`,
      width: 56, height: 56, colorDark: "#0B2A5B", colorLight: "#ffffff",
    });
  }
  // Barcode
  if (window.JsBarcode) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    qs("#barcodeWrap").appendChild(svg);
    JsBarcode(svg, qs("#invNumber").textContent.replace("#", ""), { height: 36, displayValue: false, margin: 0 });
  }
}

function shareInvoice() {
  toast("info", "سيتم فتح خيارات مشاركة الفاتورة (بريد إلكتروني / رسالة)");
}
function shareWhatsapp() {
  const text = encodeURIComponent(`فاتورة من ${settings.shopName || "أمان للديون"} - العميل: ${customer?.name || ""} - المبلغ: ${fmtMoney(txn?.amount || 0)} ريال`);
  window.open(`https://wa.me/?text=${text}`, "_blank");
}
async function downloadPdf() {
  if (!window.html2canvas || !window.jspdf) return toast("error", "تعذر تجهيز أدوات PDF");
  toast("info", "جاري تجهيز ملف PDF...");
  const card = qs("#invoiceCard");
  const canvas = await html2canvas(card, { scale: 2, backgroundColor: "#ffffff" });
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "px", format: [canvas.width, canvas.height] });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(`فاتورة-${qs("#invNumber").textContent}.pdf`);
}
