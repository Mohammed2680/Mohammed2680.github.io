/* =========================================================
   أمان للديون - إعداد Firebase
   ---------------------------------------------------------
   التطبيق يعمل مباشرة بدون إعداد باستخدام تخزين محلي (localStorage)
   ليسهل تجربته فوراً. لتفعيل المزامنة الحقيقية بين عدة أجهزة
   (Firebase Authentication + Firestore + Storage) اتّبع الخطوات:

   1) أنشئ مشروعاً على https://console.firebase.google.com
   2) فعّل Authentication (Email/Password) و Firestore Database و Storage
   3) انسخ إعدادات مشروعك في الكائن firebaseConfig أدناه
   4) أضف أكواد SDK التالية في <head> كل صفحة (قبل هذا الملف):

      <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
      <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
      <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
      <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js"></script>

   5) بعد تفعيل ذلك، استبدل الدوال الموجودة في js/app.js (كائن DB)
      باستدعاءات Firestore المكافئة (مثال موضّح أسفل الملف).

   قواعد أمان مقترحة لـ Firestore (لكل مستخدم بياناته فقط):
   -----------------------------------------------------------
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ========================================================= */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

window.__FIREBASE_READY__ = false;

try {
  if (window.firebase && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    window.fbAuth = firebase.auth();
    window.fbDb = firebase.firestore();
    window.fbStorage = firebase.storage();
    window.__FIREBASE_READY__ = true;
    console.info("✅ تم الاتصال بـ Firebase");
  }
} catch (e) {
  console.warn("Firebase غير مفعّل بعد، سيعمل التطبيق محلياً:", e.message);
}

/* ---------------------------------------------------------
   مثال: كيفية استبدال DB.getCustomers/saveCustomer بـ Firestore
   (اختياري - فعّله بعد ضبط firebaseConfig أعلاه)
   ---------------------------------------------------------

async function fsGetCustomers() {
  const uid = fbAuth.currentUser.uid;
  const snap = await fbDb.collection("users").doc(uid).collection("customers").orderBy("createdAt","desc").get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fsSaveCustomer(customer) {
  const uid = fbAuth.currentUser.uid;
  const col = fbDb.collection("users").doc(uid).collection("customers");
  if (customer.id) {
    await col.doc(customer.id).set(customer, { merge: true });
  } else {
    customer.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    const ref = await col.add(customer);
    customer.id = ref.id;
  }
  return customer;
}

// للمزامنة الفورية بين الأجهزة (Realtime):
function fsListenCustomers(callback) {
  const uid = fbAuth.currentUser.uid;
  return fbDb.collection("users").doc(uid).collection("customers")
    .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}
--------------------------------------------------------- */
