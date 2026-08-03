/* =========================================================
   أمان للديون - debts.js
   ========================================================= */

initProtectedPage('new-debt');

const preselectCustomerId = new URLSearchParams(location.search).get('customer');

async function initDebtForm(){
  document.getElementById('debtCurrency').value = getSettings().currency;
  document.getElementById('debtDate').value = new Date().toISOString().slice(0,10);
  document.getElementById('debtTime').value = new Date().toTimeString().slice(0,5);

  const customers = await DataLayer.getAll('customers');
  const select = document.getElementById('debtCustomer');
  if (customers.length === 0){
    select.innerHTML = `<option value="">لا يوجد عملاء - أضف عميلًا أولًا</option>`;
    return;
  }
  select.innerHTML = `<option value="">اختر العميل...</option>` +
    customers.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name} - ${c.phone||''}</option>`).join('');

  if (preselectCustomerId) select.value = preselectCustomerId;
}

async function saveDebt(e){
  e.preventDefault();
  const select = document.getElementById('debtCustomer');
  const customerId = select.value;
  if (!customerId){ toastError('يرجى اختيار العميل'); return; }
  const customerName = select.options[select.selectedIndex].dataset.name;

  const dateVal = document.getElementById('debtDate').value;
  const timeVal = document.getElementById('debtTime').value;

  const data = {
    customerId,
    customerName,
    amount: Number(document.getElementById('debtAmount').value),
    currency: getSettings().currency,
    reason: document.getElementById('debtReason').value.trim(),
    dueDate: document.getElementById('debtDueDate').value || null,
    notes: document.getElementById('debtNotes').value.trim(),
    date: dateVal,
    time: timeVal,
    status: 'unpaid'
  };

  if (!data.amount || data.amount <= 0){ toastError('يرجى إدخال مبلغ صحيح'); return; }

  try{
    const newDebt = await DataLayer.add('debts', data);
    toastSuccess('تم تسجيل الدين بنجاح');
    if (window.__printAfter){
      localStorage.setItem('aman_print_invoice', JSON.stringify({ type:'debt', id: newDebt.id }));
      setTimeout(() => window.location.href = 'invoices.html?print=1', 500);
    } else {
      setTimeout(() => window.location.href = 'customer.html?id=' + customerId, 600);
    }
  } catch(err){
    toastError('حدث خطأ أثناء حفظ الدين');
  }
}

initDebtForm();
