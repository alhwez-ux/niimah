import { loadFirebase } from '../firebase';
import { SESSION_KEY } from './owner';

const attempts = { count: 0, until: 0 };

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function remember(session) {
  if (!session) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem('niimah.owner.hash');
  return session;
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  return remember(session);
}

function ensureNotLocked() {
  if (Date.now() < attempts.until) {
    throw new Error('تعذر التحقق، حاول مرة أخرى بعد قليل');
  }
}

function failAttempt() {
  attempts.count += 1;
  if (attempts.count >= 5) {
    attempts.until = Date.now() + 30000;
    attempts.count = 0;
  }
  throw new Error('تعذر التحقق');
}

export async function loginOwner(identifier, password) {
  ensureNotLocked();
  const secret = password.trim();
  if (!/^\d{10}$/.test(identifier) || secret.length < 6) failAttempt();

  const firebase = await loadFirebase();
  try {
    await withTimeout(
      firebase.signInWithEmailAndPassword(firebase.auth, `${identifier}@niimah.app`, secret),
      8000,
    );
  } catch (error) {
    if (error?.message === 'timeout') {
      throw new Error('انتهت مهلة الاتصال. أعد المحاولة.');
    }
    failAttempt();
  }

  attempts.count = 0;
  attempts.until = 0;
  return remember({ kind: 'owner', role: 'super' });
}

export async function signInStaff(user, role) {
  const session = remember({
    kind: 'owner',
    role,
    phone: user.phone,
    name: user.name,
  });
  try {
    const firebase = await loadFirebase();
    if (!firebase.auth.currentUser) {
      await withTimeout(firebase.signInAnonymously(firebase.auth), 8000);
    }
  } catch (error) {
    console.warn(error);
  }
  return session;
}

export async function signInRegularUser(user) {
  const session = remember({
    kind: 'user',
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
    },
  });

  try {
    const firebase = await loadFirebase();
    if (!firebase.auth.currentUser) {
      await withTimeout(firebase.signInAnonymously(firebase.auth), 8000);
    }
  } catch (error) {
    console.warn(error);
  }

  return session;
}

export async function logout() {
  remember(null);
  try {
    const firebase = await loadFirebase();
    if (firebase.auth.currentUser) await withTimeout(firebase.signOut(firebase.auth), 8000);
  } catch (error) {
    console.warn(error);
  }
}

export async function watchAuthUser() {
  const firebase = await loadFirebase();
  return new Promise((resolve) => {
    let stop = () => {};
    const timer = setTimeout(() => {
      stop();
      resolve(null);
    }, 4000);
    stop = firebase.onAuthStateChanged(firebase.auth, (user) => {
      clearTimeout(timer);
      stop();
      resolve(user);
    });
  });
}

export async function changeOwnerPassword(currentPassword, nextPassword) {
  const current = currentPassword.trim();
  const next = nextPassword.trim();
  if (next.length < 6) {
    throw new Error('استخدم 6 أحرف على الأقل للرقم السري الجديد');
  }
  if (current === next) {
    throw new Error('اختر رقماً سرياً مختلفاً عن الحالي');
  }

  const firebase = await loadFirebase();
  const { auth, db, ref, set, EmailAuthProvider, reauthenticateWithCredential, updatePassword } = firebase;
  const email = auth.currentUser?.email;
  if (!email) {
    throw new Error('تعذر تحديث الرقم السري. تأكد من الرقم الحالي.');
  }

  try {
    const credential = EmailAuthProvider.credential(email, current);
    await Promise.race([
      (async () => {
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, next);
        try {
          await set(ref(db, 'settings/owner'), { updatedAt: Date.now() });
        } catch (error) {
          console.warn(error);
        }
      })(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 8000);
      }),
    ]);
  } catch (error) {
    console.warn(error);
    throw new Error(
      error?.message === 'timeout'
        ? 'انتهت مهلة الاتصال بقاعدة البيانات. أعد المحاولة.'
        : 'تعذر تحديث الرقم السري. تأكد من الرقم الحالي.',
    );
  }
}
