/* أمان للديون - customers.js */
Auth.requireAuth();
renderBottomNav("customers");

let currentFilter = "all";
let currentSort = "recent";
const modal = () => new bootstrap.Modal(document.getElementById("customerModal"));

function statusOf(customer) {
  const bal = DB.balanceFor(customer.id);
  if (bal <= 0) return "paid";
  return DB.lateCustomers().some((c) => c.id === customer.id) ? "late" : "debtor";
}

function badgeHtml(status) {
  if (status === "paid") return `<span class="badge-status badge-paid">مسدد</span>`;
  if (status === "late") return `<span class="badge-status badge-late">● متأخر عن السداد</span>`;
  return "";
}

function renderList() {
  const term = qs("#searchBox").value.trim().toLowerCase();
  let list = DB.getCustomers().filter((c) => c.name.toLowerCase().includes(term) || (c.phone || "").includes(term));

  if (currentFilter !== "all") list = list.filter((c) => statusOf(c) === currentFilter);

  list = list.map((c) => ({ c, bal: DB.balanceFor(c.id), last: DB.lastTxnFor(c.id) }));

  if (currentSort === "nameAsc") list.sort((a, b) => a.c.name.localeCompare(b.c.name, "ar"));
  else if (currentSort === "amountDesc") list.sort((a, b) => b.bal - a.bal);
  else if (currentSort === "amountAsc") list.sort((a, b) => a.bal - b.bal);
  else list.sort((a, b) => (new Date(a.last?.createdAt || a.c.createdAt) < new Date(b.last?.createdAt || b.c.createdAt) ? 1 : -1));

  const wrap = qs("#customerList");
  if (!list.length) {
    wrap.innerHTML = `<div class="empty-state"><i class="fa-regular fa-user"></i>لا يوجد عملاء مطابقون</div>`;
    return;
  }

  wrap.innerHTML = list
    .map(({ c, bal, last }) => {
      const color = avatarColorFor(c.id);
      const status = statusOf(c);
      return `<div class="list-card" onclick="location.href='customer.html?id=${c.id}'">
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="avatar" style="background:${color.bg};color:${color.fg}">${initialLetter(c.name)}</div>
        <div>
          <div class="lc-name">${c.name}</div>
          <div class="lc-meta">آخر نشاط: ${last ? timeAgo(last.createdAt) : "لا يوجد"}</div>
        </div>
      </div>
      <div class="lc-right">
        <div class="lc-amount ${bal > 0 ? "debt" : "zero"}">${bal > 0 ? "مدين بـ " + fmtMoney(bal) + " ريال" : "رصيد متبقي: 0 ريال"}</div>
        <div class="lc-sub">${badgeHtml(status)}</div>
      </div>
    </div>`;
    })
    .join("");
}

function renderHero() {
  qs("#heroTotal").innerHTML = `${fmtMoney(DB.totalDebt())} <small>ريال</small>`;
}

qs("#searchBox").addEventListener("input", renderList);
qsa(".chip").forEach((chip) =>
  chip.addEventListener("click", () => {
    qsa(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    currentFilter = chip.dataset.filter;
    renderList();
  })
);
qs("#sortSelect").addEventListener("change", (e) => {
  currentSort = e.target.value;
  renderList();
});

qs("#addCustomerBtn").addEventListener("click", () => openCustomerForm());
function openCustomerForm(customer) {
  qs("#customerForm").reset();
  qs("#cId").value = customer?.id || "";
  qs("#customerModalTitle").textContent = customer ? "تعديل بيانات العميل" : "إضافة عميل جديد";
  if (customer) {
    qs("#cName").value = customer.name || "";
    qs("#cPhone").value = customer.phone || "";
    qs("#cAddress").value = customer.address || "";
    qs("#cNotes").value = customer.notes || "";
  }
  modal().show();
}

qs("#customerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = qs("#cId").value;
  DB.saveCustomer({
    id: id || undefined,
    name: qs("#cName").value.trim(),
    phone: qs("#cPhone").value.trim(),
    address: qs("#cAddress").value.trim(),
    notes: qs("#cNotes").value.trim(),
  });
  bootstrap.Modal.getInstance(qs("#customerModal"))?.hide();
  toast("success", id ? "تم تحديث بيانات العميل" : "تم إضافة العميل بنجاح");
  renderList();
  renderHero();
});

renderHero();
renderList();
if (getParam("new") === "1") openCustomerForm();
const editId = getParam("edit");
if (editId) {
  const c = DB.getCustomer(editId);
  if (c) openCustomerForm(c);
}
