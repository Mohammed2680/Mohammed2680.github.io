# أمان للديون — تطبيق ويب لإدارة ديون العملاء

تطبيق ويب (HTML + CSS + JavaScript) متجاوب بالكامل (Mobile First) لإدارة ديون
العملاء اليومية: إضافة عملاء، تسجيل ديون، تسجيل سداد، فواتير احترافية قابلة
للطباعة، تقارير، وإعدادات. مبني ليعمل كتطبيق PWA قابل للتثبيت على الهاتف.

## التشغيل السريع

لا يحتاج التطبيق أي إعداد لتجربته فوراً — يعمل ببيانات تجريبية محفوظة في
`localStorage` في متصفحك:

1. افتح `index.html` (يفضّل عبر خادم محلي بسيط بدل فتح الملف مباشرة، حتى تعمل
   خدمة الـ Service Worker):
   ```bash
   npx serve .
   # أو
   python3 -m http.server 8080
   ```
2. افتح `http://localhost:8080` في المتصفح.
3. سجّل حساباً جديداً أو ادخل بأي بريد إلكتروني (تسجيل دخول تجريبي).

> ملاحظة: بدون Firebase، بياناتك محفوظة محلياً في هذا المتصفح فقط ولن تُزامن
> بين الأجهزة. لتفعيل المزامنة الحقيقية اتبع القسم التالي.

## تفعيل Firebase (مزامنة حقيقية بين الأجهزة)

1. أنشئ مشروعاً على [Firebase Console](https://console.firebase.google.com).
2. فعّل:
   - **Authentication** → طريقة البريد الإلكتروني/كلمة المرور
   - **Firestore Database**
   - **Storage** (لحفظ صور سندات الديون وشعار النشاط)
3. افتح `js/firebase.js` وضع بيانات مشروعك داخل `firebaseConfig`.
4. أضف أكواد Firebase SDK في `<head>` كل صفحة (قبل استدعاء `js/firebase.js`):
   ```html
   <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js"></script>
   ```
5. استبدل دوال `DB` و`Auth` في `js/app.js` باستدعاءات Firestore/Auth المكافئة
   (أمثلة جاهزة موجودة في تعليقات `js/firebase.js`).
6. طبّق قواعد الأمان المقترحة في `js/firebase.js` على Firestore حتى تكون بيانات
   كل مستخدم خاصة به فقط.

## هيكل المشروع

```
aman-debts/
├── index.html          نقطة الدخول (splash + توجيه حسب حالة الدخول)
├── login.html           تسجيل الدخول / إنشاء حساب
├── dashboard.html        الصفحة الرئيسية (إحصائيات + آخر العمليات)
├── customers.html         قائمة العملاء (بحث/تصفية/ترتيب/إضافة/تعديل)
├── customer.html           ملف العميل (سجل العمليات + إضافة دين/سداد)
├── new-debt.html            إضافة دين جديد
├── payment.html               تسجيل سداد
├── invoices.html                فاتورة دين/سداد (طباعة/PDF/واتساب)
├── reports.html                  التقارير (يومي/أسبوعي/شهري/سنوي + Excel/PDF)
├── settings.html                   الإعدادات (النشاط، المظهر، نسخ احتياطي)
├── manifest.json + service-worker.js   إعدادات PWA
├── css/style.css                        كل التنسيقات (متغيرات الألوان RTL)
├── js/
│   ├── app.js       طبقة بيانات موحدة (localStorage/Firebase) + أدوات مشتركة
│   ├── firebase.js  إعداد Firebase وتعليمات التفعيل
│   ├── auth.js       منطق تسجيل الدخول/الحساب
│   ├── customers.js   منطق صفحة العملاء
│   ├── debts.js        منطق ملف العميل + إضافة دين
│   ├── payments.js       منطق تسجيل السداد
│   ├── invoices.js         منطق الفواتير (QR/Barcode/PDF/مشاركة)
│   ├── reports.js            منطق التقارير والرسوم البيانية
│   └── settings.js             منطق الإعدادات
└── assets/icons, assets/images   أيقونات وصور PWA
```

## المكتبات المستخدمة (عبر CDN)

Bootstrap 5 (RTL) · Font Awesome 6 · Google Fonts (Cairo) · SweetAlert2 ·
Chart.js · jsPDF · html2canvas · QRCode.js · JsBarcode

## ملاحظات

- التصميم يتبع الألوان الأساسية: كحلي `#0B2A5B`، أخضر فاتح `#8EF0B2`، أبيض،
  رمادي فاتح، مع حواف دائرية وظلال ناعمة ودعم كامل للغة العربية RTL.
- يدعم الوضع الليلي والفاتح من صفحة الإعدادات.
- بيانات الفواتير التجريبية أمثلة فقط ويمكن حذفها من `js/app.js` (دالة
  `seedIfEmpty`) عند ربط Firebase الحقيقي.
