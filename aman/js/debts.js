/* أمان للديون - debts.js
   يغطي: عرض ملف العميل (customer.html) + منطق إضافة دين جديد (new-debt.html) */
Auth.requireAuth();
renderBottomNav(document.getElementById("newDebtForm") ? "add" : "customers");

let showAllTxns = false;

function loadCustomerProfile() {
  const id = getParam("id");
  const c = DB.getCustomer(id);
  if (!c) {
    qs(".container-app").innerHTML = `<div class="empty-state"><i class="fa-regular fa-face-frown"></i>لم يتم العثور على العميل</div>`;
    return;
  }
  qs("#custName").textContent = c.name;
  qs("#custPhone").textContent = c.phone || "—";
  qs("#custAddress").textContent = c.address || "—";
  qs("#custNotes").textContent = c.notes || "—";

  const bal = DB.balanceFor(c.id);
  qs("#totalDebt").textContent = `${fmtMoney(bal)} ريال`;
  qs("#totalDebt").style.color = bal > 0 ? "var(--red)" : "var(--green-darker)";

  const isLate = DB.lateCustomers().some((x) => x.id === c.id);
  qs("#lateBadge").classList.toggle("hidden", !isLate);

  const txns = DB.getTxnsFor(c.id);
  const last = txns[0];
  qs("#lastOpText").textContent = last
    ? `آخر عملية: ${last.type === "debt" ? "دين جديد" : "تسديد"} ${fmtMoney(last.amount)} ريال (${timeAgo(last.createdAt)})`
    : "لا توجد عمليات بعد";

  if (txns.length) {
    const firstDebt = [...txns].reverse().find((t) => t.type === "debt");
    if (firstDebt) {
      const days = Math.floor((Date.now() - new Date(firstDebt.date).getTime()) / 86400000);
      qs("#debtAge").textContent = `${days} يوم`;
    }
    const payments = txns.filter((t) => t.type === "payment");
    qs("#payFreq").textContent = payments.length ? `${payments.length} مرات` : "لا يوجد";
  }

  renderTimeline(txns);

  qs("#showMoreLink").addEventListener("click", (e) => {
    e.preventDefault();
    showAllTxns = !showAllTxns;
    qs("#showMoreLink").textContent = showAllTxns ? "إخفاء العمليات ▴" : "عرض المزيد من العمليات ▾";
    renderTimeline(txns);
  });

  qs("#menuBtn").addEventListener("click", async () => {
    const result = await Swal.fire({
      title: c.name,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "تعديل البيانات",
      denyButtonText: "حذف العميل",
      cancelButtonText: "إغلاق",
      confirmButtonColor: "#0B2A5B",
      denyButtonColor: "#E5484D",
    });
    if (result.isConfirmed) {
      location.href = "customers.html?edit=" + c.id;
    } else if (result.isDenied) {
      const ok = await confirmDialog("حذف العميل؟", "سيتم حذف جميع عمليات هذا العميل نهائياً.");
      if (ok) {
        DB.deleteCustomer(c.id);
        toast("success", "تم حذف العميل");
        setTimeout(() => (location.href = "customers.html"), 600);
      }
    }
  });
}

function renderTimeline(txns) {
  const wrap = qs("#txnTimeline");
  const shown = showAllTxns ? txns : txns.slice(0, 3);
  if (!shown.length) {
    wrap.innerHTML = `<div class="empty-state"><i class="fa-regular fa-file-lines"></i>لا توجد عمليات مسجلة</div>`;
    return;
  }
  wrap.innerHTML = shown
    .map((t) => {
      const isDebt = t.type === "debt";
      return `<div class="tl-item">
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="tl-dot ${t.type}"><i class="fa-solid ${isDebt ? "fa-arrow-trend-up" : "fa-check"}"></i></div>
        <div>
          <div class="tl-title ${t.type}">${isDebt ? "دين جديد" : "تسديد"}</div>
          <div class="tl-sub">${t.date}${t.time ? "، " + t.time : ""}${t.reason ? " — " + t.reason : ""}${t.method ? " — " + t.method : ""}</div>
        </div>
      </div>
      <div class="tl-amount ${t.type}">${fmtMoney(t.amount)} ريال</div>
    </div>`;
    })
    .join("");
}

function printStatement() {
  window.print();
}

/* -------------------- إضافة دين جديد (new-debt.html) -------------------- */
let currentInvoiceType = "credit";
function setInvoiceType(t) {
  currentInvoiceType = t;
  qs("#btnCredit")?.classList.toggle("active", t === "credit");
  qs("#btnCash")?.classList.toggle("active", t === "cash");
  const dueField = qs("#dueDateField");
  if (dueField) dueField.style.display = t === "credit" ? "block" : "none";
}
window.setInvoiceType = setInvoiceType;

function initNewDebtPage() {
  setInvoiceType("credit");
  const select = qs("#customerSelect");
  const customers = DB.getCustomers();
  select.innerHTML =
    `<option value="">ابحث عن اسم العميل...</option>` +
    customers.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");

  const presetId = getParam("id");
  if (presetId) select.value = presetId;

  qs("#currentTotal").textContent = `${fmtMoney(DB.totalDebt())} ريال`;
  qs("#debtDate").value = todayISO();

  qs("#newDebtForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const customerId = select.value;
    const amount = Number(qs("#debtAmount").value);
    if (!customerId) return toast("error", "الرجاء اختيار العميل");
    if (!amount || amount <= 0) return toast("error", "الرجاء إدخال مبلغ صحيح");

    const txn = DB.addTxn({
      customerId,
      type: "debt",
      amount,
      discount: Number(qs("#debtDiscount")?.value || 0),
      invoiceType: currentInvoiceType,
      reason: qs("#debtReason").value.trim(),
      date: qs("#debtDate").value || todayISO(),
      time: nowTime(),
      dueDate: currentInvoiceType === "credit" ? (qs("#debtDueDate")?.value || "") : "",
      notes: qs("#debtNotes").value.trim(),
    });

    toast("success", "تم تسجيل الدين بنجاح");
    if (e.submitter?.dataset?.action === "print") {
      location.href = `invoices.html?type=debt&custId=${customerId}&txnId=${txn.id}`;
    } else {
      setTimeout(() => (location.href = `customer.html?id=${customerId}`), 500);
    }
  });
}

if (document.getElementById("txnTimeline")) loadCustomerProfile();
if (document.getElementById("newDebtForm")) initNewDebtPage();
