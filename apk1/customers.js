/* =========================================================
   أمان للديون - customers.js
   ========================================================= */

initProtectedPage('customers');

let allCustomers = [];
let allDebts = [];
let allPayments = [];
let currentFilter = 'all';
let currentSort = 'name';
let customerModal;

document.addEventListener('DOMContentLoaded', () => {
  customerModal = new bootstrap.Modal(document.getElementById('customerModal'));

  document.querySelectorAll('[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      renderCustomers();
    });
  });
  document.querySelectorAll('[data-sort]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-sort]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentSort = chip.dataset.sort;
      renderCustomers();
    });
  });
  document.getElementById('searchInput').addEventListener('input', renderCustomers);

  const editId = new URLSearchParams(location.search).get('edit');
  if (editId){
    const cached = JSON.parse(localStorage.getItem('aman_edit_customer') || 'null');
    if (cached && cached.id === editId){
      setTimeout(() => openCustomerModal(cached), 300);
      localStorage.removeItem('aman_edit_customer');
    }
  }
});

async function loadAllData(){
  [allCustomers, allDebts, allPayments] = await Promise.all([
    DataLayer.getAll('customers'),
    DataLayer.getAll('debts'),
    DataLayer.getAll('payments')
  ]);
  renderCustomers();
}

function customerBalance(customerId){
  const debt = allDebts.filter(d => d.customerId === customerId).reduce((s,d)=>s+Number(d.amount||0),0);
  const paid = allPayments.filter(p => p.customerId === customerId).reduce((s,p)=>s+Number(p.amount||0),0);
  return { debt, paid, remaining: Math.max(debt - paid, 0) };
}

function customerIsLate(customerId){
  const debts = allDebts.filter(d => d.customerId === customerId);
  return debts.some(d => {
    const paidForDebt = allPayments.filter(p => p.debtId === d.id).reduce((s,p)=>s+Number(p.amount||0),0);
    return paidForDebt < Number(d.amount||0) && d.dueDate && new Date(d.dueDate) < new Date();
  });
}

function renderCustomers(){
  const search = document.getElementById('searchInput').value.trim().toLowerCase();
  let list = allCustomers.filter(c =>
    c.name.toLowerCase().includes(search) || (c.phone||'').includes(search)
  );

  list = list.map(c => ({ ...c, balance: customerBalance(c.id), late: customerIsLate(c.id) }));

  if (currentFilter === 'late') list = list.filter(c => c.late);
  if (currentFilter === 'paid') list = list.filter(c => c.balance.remaining === 0 && c.balance.debt > 0);
  if (currentFilter === 'pending') list = list.filter(c => c.balance.remaining > 0);

  if (currentSort === 'name') list.sort((a,b) => a.name.localeCompare(b.name, 'ar'));
  if (currentSort === 'debt') list.sort((a,b) => b.balance.remaining - a.balance.remaining);
  if (currentSort === 'recent') list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  const box = document.getElementById('customersList');
  if (list.length === 0){
    box.innerHTML = `<div class="empty-state"><i class="fa-regular fa-user"></i><p>لا يوجد عملاء مطابقون</p></div>`;
    return;
  }

  box.innerHTML = list.map(c => `
    <div class="customer-card" onclick="window.location.href='customer.html?id=${c.id}'">
      <div class="avatar">${c.image ? `<img src="${c.image}">` : initials(c.name)}</div>
      <div class="info">
        <div class="name">${c.name}</div>
        <div class="phone"><i class="fa-solid fa-phone"></i> ${c.phone || '-'}</div>
        ${c.late ? '<span class="badge-status late">متأخر السداد</span>' : (c.balance.remaining === 0 ? '<span class="badge-status ok">مسدد بالكامل</span>' : '')}
      </div>
      <div class="amount debt">
        <div class="num">${c.balance.remaining.toLocaleString('ar-EG')}</div>
        <div class="lbl">متبقٍ</div>
      </div>
    </div>
  `).join('');
}

/* ---------- إضافة / تعديل عميل ---------- */
function openCustomerModal(customer){
  document.getElementById('customerForm').reset();
  document.getElementById('custAvatarPreview').innerHTML = '؟';
  document.getElementById('custId').value = '';
  document.getElementById('customerModalTitle').textContent = 'إضافة عميل جديد';

  if (customer){
    document.getElementById('customerModalTitle').textContent = 'تعديل بيانات العميل';
    document.getElementById('custId').value = customer.id;
    document.getElementById('custName').value = customer.name;
    document.getElementById('custPhone').value = customer.phone;
    document.getElementById('custAddress').value = customer.address || '';
    document.getElementById('custNotes').value = customer.notes || '';
    document.getElementById('custAvatarPreview').innerHTML = customer.image
      ? `<img src="${customer.image}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : initials(customer.name);
  }
  customerModal.show();
}

function previewCustomerImage(e){
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('custAvatarPreview').innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    document.getElementById('custAvatarPreview').dataset.image = ev.target.result;
  };
  reader.readAsDataURL(file);
}

async function saveCustomer(e){
  e.preventDefault();
  const id = document.getElementById('custId').value;
  const data = {
    name: document.getElementById('custName').value.trim(),
    phone: document.getElementById('custPhone').value.trim(),
    address: document.getElementById('custAddress').value.trim(),
    notes: document.getElementById('custNotes').value.trim(),
    image: document.getElementById('custAvatarPreview').dataset.image || (id ? undefined : '')
  };
  if (data.image === undefined) delete data.image;

  try{
    if (id){
      await DataLayer.update('customers', id, data);
      toastSuccess('تم تحديث بيانات العميل');
    } else {
      await DataLayer.add('customers', data);
      toastSuccess('تمت إضافة العميل بنجاح');
    }
    customerModal.hide();
    loadAllData();
  } catch(err){
    toastError('حدث خطأ أثناء الحفظ');
  }
}

async function deleteCustomer(id){
  const ok = await confirmDialog('حذف العميل', 'سيتم حذف بيانات العميل نهائيًا. هل أنت متأكد؟');
  if (!ok) return;
  await DataLayer.remove('customers', id);
  toastSuccess('تم حذف العميل');
  loadAllData();
}

loadAllData();
DataLayer.watch('customers', loadAllData);
DataLayer.watch('debts', loadAllData);
DataLayer.watch('payments', loadAllData);
