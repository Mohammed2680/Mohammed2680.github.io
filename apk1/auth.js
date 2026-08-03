/* =========================================================
   أمان للديون - auth.js
   تسجيل الدخول / إنشاء حساب / نسيت كلمة المرور / تذكرني
   يعمل عبر Firebase Authentication إن توفر إعداد حقيقي،
   وإلا عبر نظام محلي بسيط (localStorage) لأغراض التجربة والتطوير.
   ========================================================= */

function switchAuthTab(tab){
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('formLogin').classList.toggle('d-none', tab !== 'login');
  document.getElementById('formRegister').classList.toggle('d-none', tab !== 'register');
}

/* ---- تخزين محلي لحسابات المستخدمين (يُستخدم فقط دون Firebase حقيقي) ---- */
function localUsers(){
  return JSON.parse(localStorage.getItem('aman_local_users') || '[]');
}
function saveLocalUsers(list){
  localStorage.setItem('aman_local_users', JSON.stringify(list));
}
function simpleHash(str){
  // تجزئة بسيطة لأغراض التخزين المحلي فقط - ليست بديلاً عن أمان حقيقي
  let hash = 0;
  for (let i=0; i<str.length; i++){ hash = (hash << 5) - hash + str.charCodeAt(i); hash |= 0; }
  return String(hash);
}

function setSession(uidVal, email, name, remember){
  const session = { uid: uidVal, email, name };
  localStorage.setItem('aman_session', JSON.stringify(session));
  if (remember) localStorage.setItem('aman_remember_email', email);
  else localStorage.removeItem('aman_remember_email');
}

/* ---------- تسجيل الدخول ---------- */
async function handleLogin(e){
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  const remember = document.getElementById('rememberMe').checked;
  const btn = document.getElementById('loginBtn');
  if (!email || !pass){ toastError('يرجى تعبئة جميع الحقول'); return; }

  btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> جارِ الدخول...';

  try{
    if (typeof IS_FIREBASE_CONFIGURED !== 'undefined' && IS_FIREBASE_CONFIGURED && fbAuth){
      const cred = await fbAuth.signInWithEmailAndPassword(email, pass);
      setSession(cred.user.uid, cred.user.email, cred.user.displayName || email.split('@')[0], remember);
    } else {
      const users = localUsers();
      const u = users.find(x => x.email === email);
      if (!u || u.pass !== simpleHash(pass)) throw new Error('بيانات الدخول غير صحيحة');
      setSession(u.uid, u.email, u.name, remember);
    }
    toastSuccess('تم تسجيل الدخول بنجاح');
    setTimeout(() => window.location.href = 'dashboard.html', 600);
  } catch(err){
    toastError(mapAuthError(err));
  } finally {
    btn.disabled = false; btn.innerHTML = 'تسجيل الدخول';
  }
}

/* ---------- إنشاء حساب ---------- */
async function handleRegister(e){
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPassword').value;
  const pass2 = document.getElementById('regPassword2').value;
  const btn = document.getElementById('registerBtn');

  if (!name || !email || !pass){ toastError('يرجى تعبئة جميع الحقول'); return; }
  if (pass.length < 6){ toastError('كلمة المرور يجب ألا تقل عن 6 أحرف'); return; }
  if (pass !== pass2){ toastError('كلمتا المرور غير متطابقتين'); return; }

  btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> جارِ الإنشاء...';

  try{
    if (typeof IS_FIREBASE_CONFIGURED !== 'undefined' && IS_FIREBASE_CONFIGURED && fbAuth){
      const cred = await fbAuth.createUserWithEmailAndPassword(email, pass);
      await cred.user.updateProfile({ displayName: name });
      setSession(cred.user.uid, email, name, true);
    } else {
      const users = localUsers();
      if (users.some(x => x.email === email)) throw new Error('هذا البريد الإلكتروني مسجل مسبقًا');
      const newUser = { uid: uid(), name, email, pass: simpleHash(pass) };
      users.push(newUser);
      saveLocalUsers(users);
      setSession(newUser.uid, email, name, true);
    }
    toastSuccess('تم إنشاء الحساب بنجاح');
    setTimeout(() => window.location.href = 'dashboard.html', 600);
  } catch(err){
    toastError(mapAuthError(err));
  } finally {
    btn.disabled = false; btn.innerHTML = 'إنشاء حساب';
  }
}

/* ---------- نسيت كلمة المرور ---------- */
async function handleForgotPassword(){
  const { value: email } = await Swal.fire({
    title: 'استعادة كلمة المرور',
    input: 'email',
    inputLabel: 'أدخل بريدك الإلكتروني المسجل',
    inputPlaceholder: 'example@email.com',
    confirmButtonText: 'إرسال رابط الاستعادة',
    confirmButtonColor: '#0B2A5B',
    cancelButtonText: 'إلغاء',
    showCancelButton: true
  });
  if (!email) return;

  try{
    if (typeof IS_FIREBASE_CONFIGURED !== 'undefined' && IS_FIREBASE_CONFIGURED && fbAuth){
      await fbAuth.sendPasswordResetEmail(email);
      toastSuccess('تم إرسال رابط استعادة كلمة المرور إلى بريدك');
    } else {
      const users = localUsers();
      if (!users.some(x => x.email === email)) throw new Error('هذا البريد غير مسجل لدينا');
      toastSuccess('تنبيه: في وضع التطوير المحلي، تواصل مع الدعم لإعادة تعيين كلمة المرور');
    }
  } catch(err){
    toastError(mapAuthError(err));
  }
}

function mapAuthError(err){
  const code = err && err.code;
  const map = {
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد الإلكتروني',
    'auth/wrong-password': 'كلمة المرور غير صحيحة',
    'auth/email-already-in-use': 'هذا البريد الإلكتروني مستخدم من قبل',
    'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة',
    'auth/weak-password': 'كلمة المرور ضعيفة جدًا',
  };
  return map[code] || (err && err.message) || 'حدث خطأ غير متوقع';
}

/* ---------- تعبئة تلقائية إن كان "تذكرني" مفعّلًا ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const remembered = localStorage.getItem('aman_remember_email');
  const emailInput = document.getElementById('loginEmail');
  const rememberBox = document.getElementById('rememberMe');
  if (remembered && emailInput){
    emailInput.value = remembered;
    if (rememberBox) rememberBox.checked = true;
  }
  // إن كان المستخدم مسجّل دخوله بالفعل، انتقل مباشرة للرئيسية
  if (currentSession && typeof currentSession === 'function'){
    const s = currentSession();
    if (s && window.location.pathname.includes('login.html')){
      window.location.href = 'dashboard.html';
    }
  }
});
