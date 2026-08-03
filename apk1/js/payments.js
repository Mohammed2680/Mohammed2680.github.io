/* =========================================================
   أمان للديون - payments.js
   ========================================================= */

initProtectedPage('payment');

const preselectId = new URLSearchParams(location.search).get('customer');
let currentPayType = 'partial';
let customersCache = [], debtsCache = [], paymentsCache = [];

function setPayType(type){
  currentPayType = type;
  document.querySelectorAll('[data-type]').forEach(c => c.classList.toggle('active', c.dataset.type === type));
  if (type === 'full'){
    const remaining = Number(document.getElementById('infoRemaining').dataset.raw || 0);
    document.getElementById('payAmount').value = remaining;
    document.getElementById('payAmount').readOnly = true;
  } else {
    document.getElementById('payAmount').readOnly = false;
  }
}

async function initPaymentForm(){
  [customersCache, debtsCache, paymentsCache] = await Promise.all([
    DataLayer.getAll('customers'),
    DataLayer.getAll('debts'),
    DataLayer.getAll('payments')
  ]);
  const select = document.getElementById('payCustomer');
  if (customersCache.length === 0){
    select.innerHTML = `<option value="">لا يوجد عملاء - أضف عميلًا أولًا</option>`;
    return;
  }
  select.innerHTML = `<option value="">اختر العميل...</option>` +
    customersCache.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name} - ${c.phone||''}</option>`).join('');

  if (preselectId){ select.value = preselectId; onCustomerChange(); }
}

function onCustomerChange(){
  const select = document.getElementById('payCustomer');
  const customerId = select.value;
  if (!customerId){ document.getElementById('balanceInfo').style.display = 'none'; return; }

  const totalDebt = debtsCache.filter(d => d.customerId === customerId).reduce((s,d)=>s+Number(d.amount||0),0);
  const totalPaid = paymentsCache.filter(p => p.customerId === customerId).reduce((s,p)=>s+Number(p.amount||0),0);
  const remaining = Math.max(totalDebt - totalPaid, 0);

  document.getElementById('infoTotal').textContent = totalDebt.toLocaleString('ar-EG');
  document.getElementById('infoPaid').textContent = totalPaid.toLocaleString('ar-EG');
  document.getElementById('infoRemaining').textContent = remaining.toLocaleString('ar-EG');
  document.getElementById('infoRemaining').dataset.raw = remaining;
  document.getElementById('balanceInfo').style.display = 'block';

  if (currentPayType === 'full') document.getElementById('payAmount').value = remaining;
}

async function savePayment(e){
  e.preventDefault();
  const select = document.getElementById('payCustomer');
  const customerId = select.value;
  if (!customerId){ toastError('يرجى اختيار العميل'); return; }
  const customerName = select.options[select.selectedIndex].dataset.name;
  const amount = Number(document.getElementById('payAmount').value);
  const remaining = Number(document.getElementById('infoRemaining').dataset.raw || 0);

  if (!amount || amount <= 0){ toastError('يرجى إدخال مبلغ صحيح'); return; }
  if (amount > remaining){ toastError('المبلغ المدخل أكبر من المتبقي على العميل'); return; }

  const data = {
    customerId,
    customerName,
    amount,
    method: document.getElementById('payMethod').value,
    payType: currentPayType,
    notes: document.getElementById('payNotes').value.trim(),
    date: new Date().toISOString().slice(0,10),
    time: new Date().toTimeString().slice(0,5)
  };

  try{
    const newPayment = await DataLayer.add('payments', data);
    toastSuccess('تم تسجيل السداد وتحديث الرصيد تلقائيًا');
    if (window.__printAfter){
      localStorage.setItem('aman_print_invoice', JSON.stringify({ type:'payment', id: newPayment.id }));
      setTimeout(() => window.location.href = 'invoices.html?print=1', 500);
    } else {
      setTimeout(() => window.location.href = 'customer.html?id=' + customerId, 600);
    }
  } catch(err){
    toastError('حدث خطأ أثناء حفظ السداد');
  }
}

initPaymentForm();
