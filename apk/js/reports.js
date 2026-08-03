/* أمان للديون - reports.js */
Auth.requireAuth();
renderBottomNav("reports");

let currentRange = "daily";
let chartInstance = null;

qs("#custFilter").innerHTML += DB.getCustomers().map((c) => `<option value="${c.id}">${c.name}</option>`).join("");

qsa(".chip").forEach((chip) =>
  chip.addEventListener("click", () => {
    qsa(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    currentRange = chip.dataset.range;
    render();
  })
);
qs("#custFilter").addEventListener("change", render);

function rangeStart() {
  const now = new Date();
  if (currentRange === "daily") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (currentRange === "weekly") { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (currentRange === "monthly") return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), 0, 1);
}

function filteredTxns() {
  const start = rangeStart();
  const custId = qs("#custFilter").value;
  return DB.getTxns().filter((t) => {
    if (custId && t.customerId !== custId) return false;
    return new Date(t.date) >= start;
  });
}

function render() {
  const txns = filteredTxns().sort((a, b) => (a.date < b.date ? 1 : -1));
  const debts = txns.filter((t) => t.type === "debt").reduce((s, t) => s + t.amount, 0);
  const payments = txns.filter((t) => t.type === "payment").reduce((s, t) => s + t.amount, 0);
  qs("#repDebts").textContent = fmtMoney(debts);
  qs("#repPayments").textContent = fmtMoney(payments);

  const list = qs("#repList");
  if (!txns.length) {
    list.innerHTML = `<div class="empty-state"><i class="fa-regular fa-chart-bar"></i>لا توجد عمليات ضمن هذه الفترة</div>`;
  } else {
    list.innerHTML = txns
      .map((t) => {
        const c = DB.getCustomer(t.customerId);
        return `<div class="list-card" style="cursor:default;">
        <div>
          <div class="lc-name">${c ? c.name : "عميل محذوف"}</div>
          <div class="lc-meta">${t.date} ${t.time || ""} ${t.type === "debt" ? "— " + (t.reason || "دين") : "— " + (t.method || "سداد")}</div>
        </div>
        <div class="lc-amount ${t.type === "debt" ? "debt" : ""}" style="${t.type === "payment" ? "color:var(--green-darker)" : ""}">
          ${t.type === "debt" ? "+" : "-"} ${fmtMoney(t.amount)} ريال
        </div>
      </div>`;
      })
      .join("");
  }

  drawChart(debts, payments);
}

function drawChart(debts, payments) {
  const ctx = qs("#repChart").getContext("2d");
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["ديون جديدة", "مبالغ محصّلة"],
      datasets: [{ data: [debts, payments], backgroundColor: ["#E5484D", "#1E9E5A"], borderRadius: 10, barThickness: 46 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: "rgba(0,0,0,.05)" } }, x: { grid: { display: false } } },
    },
  });
}

function exportPdf() {
  if (!window.html2canvas || !window.jspdf) return toast("error", "تعذر تجهيز أدوات PDF");
  toast("info", "جاري تجهيز تقرير PDF...");
  html2canvas(qs(".container-app"), { scale: 2, backgroundColor: "#ffffff" }).then((canvas) => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`تقرير-أمان-للديون.pdf`);
  });
}

function exportExcel() {
  const txns = filteredTxns();
  let csv = "\uFEFF" + "العميل,النوع,المبلغ,التاريخ,الوقت,التفاصيل\n";
  txns.forEach((t) => {
    const c = DB.getCustomer(t.customerId);
    csv += `${c ? c.name : ""},${t.type === "debt" ? "دين" : "سداد"},${t.amount},${t.date},${t.time || ""},"${(t.reason || t.method || "").replace(/"/g, '""')}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "تقرير-أمان-للديون.csv";
  link.click();
}

render();
