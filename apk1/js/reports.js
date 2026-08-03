/* =========================================================
   أمان للديون - reports.js
   ========================================================= */

initProtectedPage('reports');

let repDebts = [], repPayments = [], repCustomers = [];
let currentPeriod = 'day';
let chartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-period]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-period]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentPeriod = chip.dataset.period;
      document.getElementById('customDateRange').style.display = currentPeriod === 'custom' ? 'flex' : 'none';
      renderReport();
    });
  });
  document.getElementById('filterCustomer').addEventListener('change', renderReport);
  document.getElementById('dateFrom').addEventListener('change', renderReport);
  document.getElementById('dateTo').addEventListener('change', renderReport);
});

async function loadReportData(){
  [repDebts, repPayments, repCustomers] = await Promise.all([
    DataLayer.getAll('debts'),
    DataLayer.getAll('payments'),
    DataLayer.getAll('customers')
  ]);
  const sel = document.getElementById('filterCustomer');
  sel.innerHTML = `<option value="">كل العملاء</option>` + repCustomers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  renderReport();
}

function getRange(){
  const now = new Date();
  let from, to;
  if (currentPeriod === 'day'){
    from = new Date(now.setHours(0,0,0,0));
    to = new Date();
  } else if (currentPeriod === 'week'){
    from = new Date(); from.setDate(from.getDate()-7);
    to = new Date();
  } else if (currentPeriod === 'month'){
    from = new Date(); from.setMonth(from.getMonth()-1);
    to = new Date();
  } else if (currentPeriod === 'year'){
    from = new Date(); from.setFullYear(from.getFullYear()-1);
    to = new Date();
  } else {
    const f = document.getElementById('dateFrom').value;
    const t = document.getElementById('dateTo').value;
    from = f ? new Date(f) : new Date(0);
    to = t ? new Date(t + 'T23:59:59') : new Date();
  }
  return { from, to };
}

function filterByRange(items){
  const { from, to } = getRange();
  const customerId = document.getElementById('filterCustomer').value;
  return items.filter(i => {
    const d = new Date(i.createdAt);
    const inRange = d >= from && d <= to;
    const matchCustomer = !customerId || i.customerId === customerId;
    return inRange && matchCustomer;
  });
}

function renderReport(){
  const debts = filterByRange(repDebts);
  const payments = filterByRange(repPayments);

  const totalDebts = debts.reduce((s,d)=>s+Number(d.amount||0),0);
  const totalPayments = payments.reduce((s,p)=>s+Number(p.amount||0),0);
  document.getElementById('rDebts').textContent = totalDebts.toLocaleString('ar-EG');
  document.getElementById('rPayments').textContent = totalPayments.toLocaleString('ar-EG');

  drawChart(debts, payments);

  const all = [
    ...debts.map(d => ({...d, type:'دين'})),
    ...payments.map(p => ({...p, type:'سداد'}))
  ].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  const wrap = document.getElementById('reportTableWrap');
  if (all.length === 0){
    wrap.innerHTML = `<div class="empty-state"><i class="fa-regular fa-chart-bar"></i><p>لا توجد بيانات في هذه الفترة</p></div>`;
    return;
  }
  wrap.innerHTML = `
    <div style="overflow-x:auto;">
    <table class="table table-sm align-middle mb-0">
      <thead><tr><th>النوع</th><th>العميل</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
      <tbody>
        ${all.map(r => `<tr><td>${r.type}</td><td>${r.customerName||''}</td><td>${Number(r.amount||0).toLocaleString('ar-EG')}</td><td>${formatDate(r.createdAt)}</td></tr>`).join('')}
      </tbody>
    </table>
    </div>
  `;
  window.__reportRows = all;
}

function drawChart(debts, payments){
  const ctx = document.getElementById('reportChart');
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['الديون', 'السدادات'],
      datasets: [{
        label: getSettings().currency,
        data: [debts.reduce((s,d)=>s+Number(d.amount||0),0), payments.reduce((s,p)=>s+Number(p.amount||0),0)],
        backgroundColor: ['#0B2A5B', '#8EF0B2'],
        borderRadius: 10
      }]
    },
    options: { responsive:true, plugins:{ legend:{ display:false } } }
  });
}

/* ---------- تصدير PDF ---------- */
function exportPDF(){
  const rows = window.__reportRows || [];
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('تقرير - ' + getSettings().appName, 14, 15);
  doc.autoTable({
    head: [['النوع','العميل','المبلغ','التاريخ']],
    body: rows.map(r => [r.type, r.customerName||'', Number(r.amount||0).toLocaleString('ar-EG'), formatDate(r.createdAt)]),
    startY: 22
  });
  doc.save('تقرير.pdf');
}

/* ---------- تصدير Excel ---------- */
function exportExcel(){
  const rows = window.__reportRows || [];
  const data = rows.map(r => ({ النوع:r.type, العميل:r.customerName||'', المبلغ:r.amount, التاريخ:formatDate(r.createdAt) }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'تقرير');
  XLSX.writeFile(wb, 'تقرير.xlsx');
}

loadReportData();
DataLayer.watch('debts', loadReportData);
DataLayer.watch('payments', loadReportData);
