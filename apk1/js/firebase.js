/* =========================================================
   أمان للديون - إعداد Firebase
   =========================================================
   * هام جدًا: ضع بيانات مشروعك من Firebase Console هنا:
   *   1) اذهب إلى https://console.firebase.google.com
   *   2) أنشئ مشروعًا جديدًا (أو استخدم مشروعًا موجودًا)
   *   3) فعّل: Authentication (Email/Password) + Firestore Database + Storage
   *   4) انسخ إعدادات الويب (Web App Config) وضعها في الكائن أدناه
   *
   * ملاحظة: طالما لم تُستبدل القيم بقيم حقيقية (لا تزال تحتوي على
   * "YOUR_"), سيعمل التطبيق تلقائيًا بوضع محلي (localStorage)
   * بكامل الوظائف على نفس الجهاز، دون مزامنة سحابية بين الأجهزة.
   * بمجرد إدخال بيانات حقيقية سيتحول تلقائيًا للعمل السحابي الكامل.
   ========================================================= */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// هل تم إدخال إعداد حقيقي؟
const IS_FIREBASE_CONFIGURED = !Object.values(firebaseConfig).some(v => String(v).includes("YOUR_"));

let fbApp = null, fbAuth = null, fbDB = null, fbStorage = null;

if (IS_FIREBASE_CONFIGURED && typeof firebase !== "undefined") {
  try {
    fbApp = firebase.initializeApp(firebaseConfig);
    fbAuth = firebase.auth();
    fbDB = firebase.firestore();
    fbStorage = firebase.storage();
    // تفعيل التخزين المؤقت دون اتصال + المزامنة اللحظية بين الأجهزة
    fbDB.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    console.info("✅ أمان للديون: متصل بـ Firebase (مزامنة سحابية مفعّلة).");
  } catch (e) {
    console.error("خطأ في تهيئة Firebase:", e);
  }
} else {
  console.info("ℹ️ أمان للديون: لا يوجد إعداد Firebase حقيقي — التطبيق يعمل بوضع محلي (localStorage) على هذا الجهاز.");
}

/* قواعد أمان مقترحة لـ Firestore (انسخها إلى Firebase Console > Firestore > Rules):

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}

*/
