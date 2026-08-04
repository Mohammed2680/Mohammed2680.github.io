/* أمان للديون - payments.js */
Auth.requireAuth();
renderBottomNav("customers");

const select = qs("#customerSelect");
select.innerHTML =
  `<option value="">اختر عميل...</option>` +
  DB.getCustomers().map((c) => `<option value="${c.id}">${c.name}</option>`).join("");

const presetId = getParam("id");
if (presetId) select.value = presetId;

function updateBalance() {
  const c = DB.getCustomer(select.value);
  const bal = c ? DB.balanceFor(c.id) : 0;
  qs("#custBalance").textContent = `${fmtMoney(Math.max(bal, 0))} ريال`;
  if (qs("#btnFull").classList.contains("active")) qs("#payAmount").value = Math.max(bal, 0);
}
select.addEventListener("change", updateBalance);
updateBalance();

function setPayType(type) {
  const full = type === "full";
  qs("#btnFull").classList.toggle("active", full);
  qs("#btnPartial").classList.toggle("active", !full);
  if (full) {
    const c = DB.getCustomer(select.value);
    qs("#payAmount").value = c ? Math.max(DB.balanceFor(c.id), 0) : "";
    qs("#payAmount").setAttribute("readonly", "readonly");
  } else {
    qs("#payAmount").removeAttribute("readonly");
  }
}
window.setPayType = setPayType;

qs("#paymentForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const customerId = select.value;
  const amount = Number(qs("#payAmount").value);
  if (!customerId) return toast("error", "الرجاء اختيار العميل");
  if (!amount || amount <= 0) return toast("error", "الرجاء إدخال مبلغ صحيح");

  const txn = DB.addTxn({
    customerId,
    type: "payment",
    amount,
    method: qs("#payMethod").value,
    date: todayISO(),
    time: nowTime(),
    notes: qs("#payNotes").value.trim(),
  });

  toast("success", "تم تسجيل الدفعة وتحديث الرصيد تلقائياً");
  if (e.submitter?.dataset?.action === "print") {
    location.href = `invoices.html?type=payment&custId=${customerId}&txnId=${txn.id}`;
  } else {
    setTimeout(() => (location.href = `customer.html?id=${customerId}`), 500);
  }
});
