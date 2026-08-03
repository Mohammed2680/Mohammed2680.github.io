/* =========================================================
   أمان للديون - invoices.js
   ========================================================= */

initProtectedPage('invoices');

let invoiceModal;
let debtsAll = [], paymentsAll = [];
let currentInvoice = null;
let currentPrinterSize = getSettings().printerSize || '80';

document.addEventListener('DOMContentLoaded', () => {
  invoiceModal = new bootstrap.Modal(document.getElementById('invoiceModal'));
  document.querySelectorAll('[data-t]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-t]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderInvoices();
    });
  });
  document.getElementById('invSearch').addEventListener('input', renderInvoices);
});

function invoiceNumber(prefix, id){
  return prefix + '-' + id.replace(/[^0-9a-zA-Z]/g,'').slice(-6).toUpperCase();
}

async function loadInvoices(){
  [debtsAll, paymentsAll] = await Promise.all([
    DataLayer.getAll('debts'),
    DataLayer.getAll('payments')
  ]);
  renderInvoices();

  // فتح فاتورة تلقائيًا بعد الحفظ من صفحات إضافة الدين/السداد
  const params = new URLSearchParams(location.search);
  if (params.get('print') === '1'){
    const req = JSON.parse(localStorage.getItem('aman_print_invoice') || 'null');
    if (req){
      const list = req.type === 'debt' ? debtsAll : paymentsAll;
      const item = list.find(x => x.id === req.id);
      if (item) openInvoice(item, req.type);
      localStorage.removeItem('aman_print_invoice');
    }
  }
}

function renderInvoices(){
  const activeType = document.querySelector('[data-t].active').dataset.t;
  const search = document.getElementById('invSearch').value.trim().toLowerCase();

  let items = [
    ...debtsAll.map(d => ({ ...d, type:'debt' })),
    ...paymentsAll.map(p => ({ ...p, type:'payment' }))
  ].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (activeType !== 'all') items = items.filter(i => i.type === activeType);
  if (search){
    items = items.filter(i =>
      (i.customerName||'').toLowerCase().includes(search) ||
      invoiceNumber(i.type==='debt'?'D':'P', i.id).toLowerCase().includes(search)
    );
  }

  const box = document.getElementById('invoicesList');
  if (items.length === 0){
    box.innerHTML = `<div class="empty-state"><i class="fa-regular fa-file-lines"></i><p>لا توجد فواتير بعد</p></div>`;
    return;
  }

  box.innerHTML = items.map(i => `
    <div class="customer-card" onclick='openInvoice(${JSON.stringify(i).replace(/'/g,"&apos;")}, "${i.type}")'>
      <div class="avatar" style="background:${i.type==='debt' ? 'linear-gradient(135deg,#FF5C6C,#c73a48)' : 'linear-gradient(135deg,#34C77B,#1a8a4f)'}">
        <i class="fa-solid ${i.type==='debt'?'fa-file-invoice':'fa-receipt'}"></i>
      </div>
      <div class="info">
        <div class="name">${invoiceNumber(i.type==='debt'?'D':'P', i.id)} - ${i.customerName||''}</div>
        <div class="phone">${formatDate(i.createdAt)} - ${formatTime(i.createdAt)}</div>
      </div>
      <div class="amount ${i.type==='debt'?'debt':'paid'}">
        <div class="num">${Number(i.amount||0).toLocaleString('ar-EG')}</div>
        <div class="lbl">${i.type==='debt'?'دين':'سداد'}</div>
      </div>
    </div>
  `).join('');
}

async function openInvoice(item, type){
  currentInvoice = { ...item, type };
  await renderInvoicePreview();
  invoiceModal.show();
}

function setPrinterSize(size){
  currentPrinterSize = size;
  document.getElementById('size80').classList.toggle('active', size === '80');
  document.getElementById('size58').classList.toggle('active', size === '58');
  renderInvoicePreview();
}

async function renderInvoicePreview(){
  if (!currentInvoice) return;
  const s = getSettings();
  const isDebt = currentInvoice.type === 'debt';
  const invNo = invoiceNumber(isDebt ? 'D' : 'P', currentInvoice.id);

  let remaining = 0;
  if (isDebt){
    const paidForDebt = paymentsAll.filter(p => p.debtId === currentInvoice.id).reduce((s,p)=>s+Number(p.amount||0),0);
    remaining = Math.max(Number(currentInvoice.amount||0) - paidForDebt, 0);
  } else {
    const custDebts = debtsAll.filter(d => d.customerId === currentInvoice.customerId).reduce((s,d)=>s+Number(d.amount||0),0);
    const custPaid = paymentsAll.filter(p => p.customerId === currentInvoice.customerId).reduce((s,p)=>s+Number(p.amount||0),0);
    remaining = Math.max(custDebts - custPaid, 0);
  }

  const sizeClass = currentPrinterSize === '58' ? 'receipt-58' : 'receipt-80';

  document.getElementById('invoicePreview').innerHTML = `
    <div class="invoice-paper ${sizeClass}" id="invoiceToPrint">
      <div class="inv-header">
        <div class="logo avatar" style="margin:0 auto;background:linear-gradient(135deg,#0B2A5B,#12386f);">
          ${s.logo ? `<img src="${s.logo}">` : '<i class="fa-solid fa-shield-halved"></i>'}
        </div>
        <h6 class="fw-bold mb-0">${s.appName}</h6>
        <p class="text-muted-sm mb-0">${isDebt ? 'فاتورة دين' : 'فاتورة سداد'}</p>
      </div>
      <hr>
      <div class="inv-row"><span>رقم الفاتورة</span><b>${invNo}</b></div>
      <div class="inv-row"><span>اسم العميل</span><b>${currentInvoice.customerName || ''}</b></div>
      <div class="inv-row"><span>التاريخ</span><b>${formatDate(currentInvoice.createdAt)}</b></div>
      <div class="inv-row"><span>الوقت</span><b>${formatTime(currentInvoice.createdAt)}</b></div>
      ${!isDebt ? `<div class="inv-row"><span>طريقة الدفع</span><b>${paymentMethodLabel(currentInvoice.method)}</b></div>` : ''}
      ${isDebt && currentInvoice.reason ? `<div class="inv-row"><span>سبب الدين</span><b>${currentInvoice.reason}</b></div>` : ''}
      <hr>
      <div class="inv-row inv-total"><span>${isDebt ? 'مبلغ الدين' : 'المبلغ المدفوع'}</span><b>${Number(currentInvoice.amount||0).toLocaleString('ar-EG')} ${s.currency}</b></div>
      <div class="inv-row"><span>المتبقي على العميل</span><b>${remaining.toLocaleString('ar-EG')} ${s.currency}</b></div>
      <hr>
      <div class="inv-codes">
        <div id="qrCodeBox" style="display:flex;justify-content:center;margin-bottom:8px;"></div>
        <svg id="barcodeBox"></svg>
      </div>
      <div style="text-align:center;margin-top:14px;">
        <div style="border-top:1px solid #ccc;width:70%;margin:24px auto 4px;"></div>
        <p class="text-muted-sm" style="margin:0;">التوقيع</p>
      </div>
      <p class="text-muted-sm text-center mt-2" style="font-size:10px;">شكرًا لتعاملكم معنا - ${s.appName}</p>
    </div>
  `;

  document.getElementById('qrCodeBox').innerHTML = '';
  new QRCode(document.getElementById('qrCodeBox'), {
    text: `${s.appName}|${invNo}|${currentInvoice.customerName}|${currentInvoice.amount}`,
    width: 90, height: 90
  });
  try{
    JsBarcode('#barcodeBox', invNo, { width:1.4, height:38, fontSize:11, margin:0 });
  } catch(e){}
}

function paymentMethodLabel(m){
  return { cash:'نقدًا', transfer:'تحويل بنكي', wallet:'محفظة إلكترونية', other:'أخرى' }[m] || 'نقدًا';
}

function printInvoice(){
  const content = document.getElementById('invoicePreview').innerHTML;
  const w = window.open('', '_blank');
  w.document.write(`<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>فاتورة</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
      body{font-family:'Tajawal',sans-serif;display:flex;justify-content:center;padding:20px;}
      .invoice-paper{background:#fff;padding:16px;max-width:300px;}
      .inv-row{display:flex;justify-content:space-between;font-size:13px;padding:3px 0;}
      .inv-total{font-weight:800;font-size:15px;}
      hr{border:none;border-top:1px dashed #ccc;margin:8px 0;}
      .inv-header{text-align:center;}
    </style>
    </head><body>${content}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

async function downloadInvoicePDF(){
  const node = document.getElementById('invoiceToPrint');
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit:'px', format:[canvas.width/2, canvas.height/2] });
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width/2, canvas.height/2);
  pdf.save(`فاتورة-${currentInvoice ? invoiceNumber(currentInvoice.type==='debt'?'D':'P', currentInvoice.id) : ''}.pdf`);
}

async function shareInvoiceWhatsapp(){
  if (!currentInvoice) return;
  const s = getSettings();
  const invNo = invoiceNumber(currentInvoice.type==='debt'?'D':'P', currentInvoice.id);
  const text = encodeURIComponent(
    `*${s.appName}*\nفاتورة رقم: ${invNo}\nالعميل: ${currentInvoice.customerName}\nالمبلغ: ${Number(currentInvoice.amount).toLocaleString('ar-EG')} ${s.currency}\nالتاريخ: ${formatDate(currentInvoice.createdAt)}`
  );
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

loadInvoices();
DataLayer.watch('debts', loadInvoices);
DataLayer.watch('payments', loadInvoices);
