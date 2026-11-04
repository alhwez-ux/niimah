import { loadFirebase } from '../firebase';
import { isSaudiMobile } from './phone';

export const SUPER_ADMIN_PHONE = '0555748375';
const LOCAL_KEY = 'niimah.supervisors.v1';

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('database-timeout')), ms);
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

function readLocalSupervisors() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.filter((phone) => isSaudiMobile(phone) && phone !== SUPER_ADMIN_PHONE);
  } catch {
    return [];
  }
}

function writeLocalSupervisors(phones) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(phones));
}

export function isSuperAdmin(phone) {
  return phone === SUPER_ADMIN_PHONE;
}

export async function loadSupervisors() {
  const local = readLocalSupervisors();
  try {
    const firebase = await loadFirebase();
    const snap = await withTimeout(firebase.get(firebase.ref(firebase.db, 'settings/supervisors')), 6000);
    if (!snap.exists()) return local;
    const phones = Array.isArray(snap.val()?.phones)
      ? snap.val().phones.filter((phone) => isSaudiMobile(phone) && phone !== SUPER_ADMIN_PHONE)
      : [];
    writeLocalSupervisors(phones);
    return phones;
  } catch (error) {
    console.warn(error);
    return local;
  }
}

export async function isStaffPhone(phone) {
  if (isSuperAdmin(phone)) return 'super';
  const supervisors = await loadSupervisors();
  return supervisors.includes(phone) ? 'supervisor' : null;
}

async function pushSupervisors(phones) {
  const firebase = await loadFirebase();
  await withTimeout(
    (async () => {
      try {
        if (!firebase.auth.currentUser) await firebase.signInAnonymously(firebase.auth);
      } catch (error) {
        console.warn(error);
      }
      await firebase.set(firebase.ref(firebase.db, 'settings/supervisors'), {
        phones,
        updatedAt: Date.now(),
      });
    })(),
    8000,
  );
}

export async function grantSupervisor(phone) {
  if (!isSaudiMobile(phone) || isSuperAdmin(phone)) {
    throw new Error('أدخل رقم جوال صحيح');
  }
  const current = readLocalSupervisors();
  const phones = current.includes(phone) ? current : [phone, ...current];
  writeLocalSupervisors(phones);
  try {
    await pushSupervisors(phones);
    return { phones, warning: '' };
  } catch (error) {
    console.warn(error);
    return {
      phones,
      warning:
        error?.message === 'database-timeout'
          ? 'انتهت مهلة الاتصال بقاعدة البيانات. أعد المحاولة.'
          : 'تعذر حفظ المشرف في قاعدة البيانات. أعد المحاولة.',
    };
  }
}

export async function revokeSupervisor(phone) {
  const phones = readLocalSupervisors().filter((item) => item !== phone);
  writeLocalSupervisors(phones);
  try {
    await pushSupervisors(phones);
    return { phones, warning: '' };
  } catch (error) {
    console.warn(error);
    return {
      phones,
      warning:
        error?.message === 'database-timeout'
          ? 'انتهت مهلة الاتصال بقاعدة البيانات. أعد المحاولة.'
          : 'تعذر تحديث المشرفين في قاعدة البيانات. أعد المحاولة.',
    };
  }
}
