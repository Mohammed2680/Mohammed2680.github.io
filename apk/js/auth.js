/* أمان للديون - auth.js: منطق صفحة تسجيل الدخول / إنشاء حساب */

function switchTab(which) {
  const isLogin = which === "login";
  qs("#tabLogin").classList.toggle("active", isLogin);
  qs("#tabSignup").classList.toggle("active", !isLogin);
  qs("#loginForm").classList.toggle("hidden", !isLogin);
  qs("#signupForm").classList.toggle("hidden", isLogin);
}

function togglePass(id, icon) {
  const input = document.getElementById(id);
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  icon.classList.toggle("fa-eye", !show);
  icon.classList.toggle("fa-eye-slash", show);
}

function forgotPassword() {
  if (!window.Swal) return;
  Swal.fire({
    title: "استعادة كلمة المرور",
    input: "email",
    inputPlaceholder: "بريدك الإلكتروني",
    confirmButtonText: "إرسال رابط الاستعادة",
    confirmButtonColor: "#0B2A5B",
    showCancelButton: true,
    cancelButtonText: "إلغاء",
  }).then((r) => {
    if (r.isConfirmed) toast("success", "تم إرسال رابط استعادة كلمة المرور إلى بريدك (تجريبي)");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // إن كان المستخدم مسجلاً دخوله بالفعل، انتقل للرئيسية مباشرة
  if (Auth.isLoggedIn()) location.href = "dashboard.html";

  qs("#loginForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = qs("#loginEmail").value.trim();
    if (!email) return;
    Auth.login(email);
    toast("success", "مرحباً بعودتك 👋");
    setTimeout(() => (location.href = "dashboard.html"), 700);
  });

  qs("#signupForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const shop = qs("#suShop").value.trim();
    const email = qs("#suEmail").value.trim();
    if (!shop || !email) return;
    DB.saveSettings({ shopName: shop });
    Auth.login(email);
    toast("success", "تم إنشاء الحساب ومزامنة البيانات");
    setTimeout(() => (location.href = "dashboard.html"), 700);
  });
});
