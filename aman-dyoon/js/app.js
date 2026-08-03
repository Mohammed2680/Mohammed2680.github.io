// APP STATE & STORAGE
let currentItems = [];
let invoiceHistory = JSON.parse(localStorage.getItem('pos_history')) || [];
let storeSettings = JSON.parse(localStorage.getItem('pos_settings')) || {
    name: "متجر الكاشير النموذجي",
    desc: "للخدمات التجارية والتسوق الذكي",
    taxNo: "310123456700003",
    phone: "0500000000",
    logo: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24' fill='none' stroke='%232c3e50' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='2' y='3' width='20' height='14' rx='2' ry='2'/><line x1='8' y1='21' x2='16' y2='21'/><line x1='12' y1='17' x2='12' y2='21'/></svg>"
};

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
    initDefaultValues();
    applySettings();
    renderItems();
    renderHistoryTable();
    generateBarcode("INV-1001");
});

// INITIAL SETUP
function initDefaultValues() {
    const now = new Date();
    const localDatetime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    document.getElementById('inv-date').value = localDatetime;
    
    // Auto-generate invoice number
    const nextInvNum = 'INV-' + (1000 + invoiceHistory.length + 1);
    document.getElementById('inv-number').value = nextInvNum;

    // Attach event listeners for real-time receipt dynamic update
    document.getElementById('cust-name').addEventListener('input', updateReceiptMeta);
    document.getElementById('cust-phone').addEventListener('input', updateReceiptMeta);
    document.getElementById('inv-date').addEventListener('change', updateReceiptMeta);
}

// TAB SWITCHING
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    event.currentTarget.classList.add('active');
}

// ITEM MANAGEMENT
function addQuickItem(name, price) {
    addItem(name, 1, price);
}

function addItemFromInput() {
    const nameInput = document.getElementById('item-name');
    const qtyInput = document.getElementById('item-qty');
    const priceInput = document.getElementById('item-price');

    const name = nameInput.value.trim();
    const qty = parseFloat(qtyInput.value);
    const price = parseFloat(priceInput.value);

    if (!name || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        alert('يرجى إدخال اسم المنتج، الكمية والسعر بشكل صحيح');
        return;
    }

    addItem(name, qty, price);

    // Reset inputs
    nameInput.value = '';
    qtyInput.value = '1';
    priceInput.value = '';
    nameInput.focus();
}

function addItem(name, qty, price) {
    const existingIndex = currentItems.findIndex(item => item.name === name && item.price === price);
    if (existingIndex > -1) {
        currentItems[existingIndex].qty += qty;
    } else {
        currentItems.push({ name, qty, price });
    }
    renderItems();
}

function removeItem(index) {
    currentItems.splice(index, 1);
    renderItems();
}

function renderItems() {
    const body = document.getElementById('items-body');
    const rBody = document.getElementById('r-items-body');
    
    body.innerHTML = '';
    rBody.innerHTML = '';

    if (currentItems.length === 0) {
        body.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">لا توجد أصناف مضافة بعد</td></tr>';
        rBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#555;">لا توجد أصناف</td></tr>';
    } else {
        currentItems.forEach((item, index) => {
            const itemTotal = item.qty * item.price;

            // Form Table Row
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${item.name}</strong></td>
                <td>${item.qty}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${itemTotal.toFixed(2)}</td>
                <td><button class="btn btn-danger btn-sm" onclick="removeItem(${index})"><i class="fa-solid fa-xmark"></i></button></td>
            `;
            body.appendChild(tr);

            // Receipt Thermal Row
            const rTr = document.createElement('tr');
            rTr.innerHTML = `
                <td>${item.name}</td>
                <td class="text-center">${item.qty}</td>
                <td class="text-left">${item.price.toFixed(2)}</td>
                <td class="text-left">${itemTotal.toFixed(2)}</td>
            `;
            rBody.appendChild(rTr);
        });
    }

    calculateTotals();
}

// CALCULATION LOGIC (Handles Discount & Previous Amount)
function calculateTotals() {
    const subtotal = currentItems.reduce((acc, item) => acc + (item.qty * item.price), 0);
    const prevBalance = parseFloat(document.getElementById('prev-balance').value) || 0;
    const discountAmount = parseFloat(document.getElementById('discount-amount').value) || 0;
    const taxRate = parseFloat(document.getElementById('tax-rate').value) || 0;
    const paidAmount = parseFloat(document.getElementById('paid-amount').value) || 0;

    // Subtotal after discount
    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    
    // Tax calculated on discounted current bill
    const taxAmount = (discountedSubtotal * taxRate) / 100;
    
    // Total for CURRENT INVOICE
    const currentTotal = discountedSubtotal + taxAmount;

    // GRAND TOTAL = Current Total + Previous Amount
    const grandTotal = currentTotal + prevBalance;
    const remaining = grandTotal - paidAmount;

    // Update Live Thermal Receipt Preview
    document.getElementById('r-subtotal').textContent = `${subtotal.toFixed(2)} ر.س`;
    document.getElementById('r-discount-val').textContent = `-${discountAmount.toFixed(2)} ر.س`;
    document.getElementById('r-tax-rate-display').textContent = taxRate;
    document.getElementById('r-tax').textContent = `${taxAmount.toFixed(2)} ر.س`;
    document.getElementById('r-current-total').textContent = `${currentTotal.toFixed(2)} ر.س`;
    
    // Previous Amount updates
    document.getElementById('r-prev-val').textContent = `+${prevBalance.toFixed(2)} ر.س`;
    document.getElementById('r-grand-total').textContent = `${grandTotal.toFixed(2)} ر.س`;
    
    document.getElementById('r-paid').textContent = `${paidAmount.toFixed(2)} ر.س`;
    document.getElementById('r-remaining').textContent = `${remaining.toFixed(2)} ر.س`;

    updateReceiptMeta();
}

function updateReceiptMeta() {
    const invNum = document.getElementById('inv-number').value || 'INV-1001';
    const custName = document.getElementById('cust-name').value || 'عميل نقدي';
    const custPhone = document.getElementById('cust-phone').value || '-';
    const rawDate = document.getElementById('inv-date').value;

    let formattedDate = rawDate ? rawDate.replace('T', ' ') : new Date().toISOString().slice(0, 16).replace('T', ' ');

    document.getElementById('r-inv-num').textContent = invNum;
    document.getElementById('r-inv-date').textContent = formattedDate;
    document.getElementById('r-cust-name').textContent = custName;
    document.getElementById('r-cust-phone').textContent = custPhone;
    document.getElementById('r-barcode-val').textContent = invNum;

    // Generate SVG Barcode
    generateBarcode(invNum);
}

// CUSTOM SVG BARCODE GENERATOR (Code 128 / Direct SVG)
function generateBarcode(text) {
    const container = document.getElementById('barcode-container');
    container.innerHTML = '';

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 200 50");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "45");

    let x = 10;
    // Simple bar visual pattern derived from string code
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const barWidth = (charCode % 3) + 1.5;
        const gap = (charCode % 2) + 2;

        const rect = document.createElementNS(svgNS, "rect");
        rect.setAttribute("x", x);
        rect.setAttribute("y", "5");
        rect.setAttribute("width", barWidth);
        rect.setAttribute("height", "40");
        rect.setAttribute("fill", "#000");

        svg.appendChild(rect);
        x += barWidth + gap;
    }

    // Border line accents
    const startLine = document.createElementNS(svgNS, "rect");
    startLine.setAttribute("x", "5"); startLine.setAttribute("y", "5");
    startLine.setAttribute("width", "2"); startLine.setAttribute("height", "40");
    startLine.setAttribute("fill", "#000");
    svg.appendChild(startLine);

    const endLine = document.createElementNS(svgNS, "rect");
    endLine.setAttribute("x", x + 5); endLine.setAttribute("y", "5");
    endLine.setAttribute("width", "3"); endLine.setAttribute("height", "40");
    endLine.setAttribute("fill", "#000");
    svg.appendChild(endLine);

    container.appendChild(svg);
}

// LOGO & SETTINGS MANAGEMENT
function applySettings() {
    document.getElementById('receipt-logo').src = storeSettings.logo;
    document.getElementById('settings-logo-preview').src = storeSettings.logo;
    document.getElementById('receipt-store-name').textContent = storeSettings.name;
    document.getElementById('receipt-store-desc').textContent = storeSettings.desc;
    document.getElementById('receipt-tax-no').textContent = storeSettings.taxNo;
    document.getElementById('receipt-store-phone').textContent = storeSettings.phone;

    document.getElementById('setting-store-name').value = storeSettings.name;
    document.getElementById('setting-store-desc').value = storeSettings.desc;
    document.getElementById('setting-tax-no').value = storeSettings.taxNo;
    document.getElementById('setting-phone').value = storeSettings.phone;
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Image = e.target.result;
            storeSettings.logo = base64Image;
            document.getElementById('settings-logo-preview').src = base64Image;
            document.getElementById('receipt-logo').src = base64Image;
            localStorage.setItem('pos_settings', JSON.stringify(storeSettings));
            alert('تم تغيير شعار الفاتورة بنجاح!');
        };
        reader.readAsDataURL(file);
    }
}

function resetDefaultLogo() {
    const defaultLogo = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24' fill='none' stroke='%232c3e50' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='2' y='3' width='20' height='14' rx='2' ry='2'/><line x1='8' y1='21' x2='16' y2='21'/><line x1='12' y1='17' x2='12' y2='21'/></svg>";
    storeSettings.logo = defaultLogo;
    document.getElementById('settings-logo-preview').src = defaultLogo;
    document.getElementById('receipt-logo').src = defaultLogo;
    localStorage.setItem('pos_settings', JSON.stringify(storeSettings));
    alert('تم إعادة الشعار الافتراضي');
}

function saveSettings(event) {
    event.preventDefault();
    storeSettings.name = document.getElementById('setting-store-name').value;
    storeSettings.desc = document.getElementById('setting-store-desc').value;
    storeSettings.taxNo = document.getElementById('setting-tax-no').value;
    storeSettings.phone = document.getElementById('setting-phone').value;

    localStorage.setItem('pos_settings', JSON.stringify(storeSettings));
    applySettings();
    alert('تم حفظ إعدادات المتجر والشعار بنجاح!');
}

// INVOICE SAVE & HISTORY
function saveInvoiceToHistory() {
    if (currentItems.length === 0) {
        alert('الفاتورة فارغة! أضف منتجات قبل الحفظ.');
        return;
    }

    const invNum = document.getElementById('inv-number').value;
    const invDate = document.getElementById('inv-date').value;
    const custName = document.getElementById('cust-name').value || 'عميل نقدي';
    const prevAmount = parseFloat(document.getElementById('prev-balance').value) || 0;
    const discountAmount = parseFloat(document.getElementById('discount-amount').value) || 0;
    const grandTotal = document.getElementById('r-grand-total').textContent;

    const invoiceData = {
        invNum,
        invDate,
        custName,
        prevAmount,
        discountAmount,
        grandTotal,
        items: [...currentItems]
    };

    invoiceHistory.push(invoiceData);
    localStorage.setItem('pos_history', JSON.stringify(invoiceHistory));
    renderHistoryTable();
    alert(`تم حفظ الفاتورة ${invNum} في السجل بنجاح.`);
}

function renderHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';

    if (invoiceHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">لا توجد فواتير محفوظة</td></tr>';
        return;
    }

    invoiceHistory.forEach(inv => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${inv.invNum}</strong></td>
            <td>${inv.invDate.replace('T', ' ')}</td>
            <td>${inv.custName}</td>
            <td><span style="color:#ef4444; font-weight:bold;">-${inv.discountAmount.toFixed(2)} ر.س</span></td>
            <td><span style="color:#d97706; font-weight:bold;">+${inv.prevAmount.toFixed(2)} ر.س</span></td>
            <td><strong>${inv.grandTotal}</strong></td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="printInvoice()"><i class="fa-solid fa-print"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function clearHistory() {
    if (confirm('هل أنت تأكد من مسح جميع الفواتير المحفوظة؟')) {
        invoiceHistory = [];
        localStorage.removeItem('pos_history');
        renderHistoryTable();
    }
}

// PRINTING
function printInvoice() {
    if (currentItems.length === 0) {
        alert('لا توجد عناصر في الفاتورة للطباعة.');
        return;
    }
    window.print();
}

// RESET FORM
function resetForm() {
    currentItems = [];
    document.getElementById('cust-name').value = '';
    document.getElementById('cust-phone').value = '';
    document.getElementById('prev-balance').value = '0';
    document.getElementById('discount-amount').value = '0';
    document.getElementById('paid-amount').value = '0';
    
    initDefaultValues();
    renderItems();
}
