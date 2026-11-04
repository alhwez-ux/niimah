import { isFirebaseConfigured, loadFirebase } from '../firebase';
import { isSaudiMobile } from './phone';

const DB_KEY = 'niimah.db.v1';

export const CATEGORIES = ['طعام', 'ملابس', 'أثاث', 'أخرى'];
export const ROLE_LABEL = { donor: 'متبرع', beneficiary: 'محتاج' };
export const KIND_LABEL = { donate: 'تبرع', need: 'احتياج' };
export const STATUS_LABEL = { open: 'مفتوح', done: 'مكتمل' };

let memory = null;
let hydratePromise = null;

function seed() {
  const now = Date.now();
  return {
    users: [],
    requests: [
      {
        id: 'seed-food',
        title: 'وجبات فائضة بعد وليمة',
        description: 'طعام يكفي عدة أسر، جاهز للاستلام اليوم مساءً.',
        category: 'طعام',
        kind: 'donate',
        status: 'open',
        contact: '0500000001',
        userId: '',
        createdAt: now - 3600000,
      },
      {
        id: 'seed-clothes',
        title: 'ملابس أطفال بحالة جيدة',
        description: 'مقاسات من سنتين إلى ست سنوات، مغسولة ومرتبة.',
        category: 'ملابس',
        kind: 'donate',
        status: 'open',
        contact: '0500000002',
        userId: '',
        createdAt: now - 7200000,
      },
      {
        id: 'seed-furniture',
        title: 'حاجة إلى أثاث غرفة',
        description: 'أسرة تبحث عن سرير وخزانة بحالة مقبولة.',
        category: 'أثاث',
        kind: 'need',
        status: 'open',
        contact: '0500000003',
        userId: '',
        createdAt: now - 5400000,
      },
    ],
    ads: [
      {
        id: 'seed-ad-share',
        title: 'لا ترمِ الفائض',
        body: 'وجبة زائدة أو قطعة ملابس قد تكفي يومًا كاملًا لأسرة. انشرها في نعمه.',
        active: true,
        createdAt: now - 1800000,
      },
      {
        id: 'seed-ad-time',
        title: 'الاستلام في نفس اليوم',
        body: 'اكتب وقت التسليم داخل وصف الطلب حتى يصل الطعام قبل أن يتلف.',
        active: true,
        createdAt: now - 9000000,
      },
    ],
  };
}

function writeLocal(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function readLocal() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const seeded = seed();
      writeLocal(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      ads: Array.isArray(parsed.ads) ? parsed.ads : [],
    };
  } catch {
    const seeded = seed();
    writeLocal(seeded);
    return seeded;
  }
}

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function findUserByPhone(phone) {
  const local = (memory || readLocal()).users.find((user) => user.phone === phone) || null;
  if (local || !isFirebaseConfigured()) return local;
  try {
    const firebase = await loadFirebase();
    const snap = await firebase.getDoc(firebase.doc(firebase.db, 'users', phone));
    if (!snap.exists()) return null;
    const user = { id: snap.id, ...snap.data() };
    const current = memory || readLocal();
    memory = {
      ...current,
      users: [user, ...current.users.filter((item) => item.phone !== phone)],
    };
    writeLocal(memory);
    return user;
  } catch (error) {
    console.warn(error);
    return null;
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('firestore-timeout')), ms);
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

async function pullAll(firebase) {
  const { db, collection, getDocs } = firebase;
  async function pull(name) {
    const snap = await getDocs(collection(db, name));
    return {
      items: snap.docs.map((item) => ({ id: item.id, ...item.data() })),
      fromCache: snap.metadata.fromCache,
    };
  }
  const [requests, ads] = await Promise.all([pull('requests'), pull('ads')]);
  return {
    data: { requests: requests.items, ads: ads.items },
    fromCache: requests.fromCache || ads.fromCache,
  };
}

export function hydrate() {
  if (!hydratePromise) hydratePromise = doHydrate();
  return hydratePromise;
}

async function doHydrate() {
  memory = readLocal();
  if (!isFirebaseConfigured()) return memory;
  try {
    const firebase = await loadFirebase();
    if (!firebase) return memory;
    const remote = await withTimeout(pullAll(firebase), 6000);
    if (remote.fromCache) return memory;
    memory = { ...memory, requests: remote.data.requests, ads: remote.data.ads };
    writeLocal(memory);
    return memory;
  } catch (error) {
    console.warn(error);
    return memory;
  }
}

function commit(next) {
  memory = next;
  writeLocal(next);
}

export async function saveItem(kind, item) {
  let record = item;
  const current = memory || readLocal();
  let list = [...current[kind]];
  if (kind === 'users') {
    if (!isSaudiMobile(record.phone)) throw new Error('تعذر حفظ هذا المستخدم');
    record = { ...record, id: record.phone };
    list = list.filter((entry) => entry.id !== item.id && entry.phone !== record.phone);
    list.unshift(record);
  } else {
    const index = list.findIndex((entry) => entry.id === record.id);
    if (index >= 0) list[index] = record;
    else list.unshift(record);
  }
  const next = { ...current, [kind]: list };
  commit(next);

  if (!isFirebaseConfigured()) return { data: next, warning: '' };
  try {
    const firebase = await loadFirebase();
    await firebase.setDoc(firebase.doc(firebase.db, kind, record.id), record);
    return { data: next, warning: '' };
  } catch (error) {
    console.warn(error);
    return { data: next, warning: 'حُفظ على هذا الجهاز، وتعذر تحديث قاعدة البيانات.' };
  }
}

export async function listOwnerCollection(kind) {
  const firebase = await loadFirebase();
  const snap = await withTimeout(firebase.getDocs(firebase.collection(firebase.db, kind)), 8000);
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function removeItem(kind, id) {
  const current = memory || readLocal();
  const next = {
    ...current,
    [kind]: current[kind].filter((item) => item.id !== id),
  };
  commit(next);

  if (!isFirebaseConfigured()) return { data: next, warning: '' };
  try {
    const firebase = await loadFirebase();
    await firebase.deleteDoc(firebase.doc(firebase.db, kind, id));
    return { data: next, warning: '' };
  } catch (error) {
    console.warn(error);
    return { data: next, warning: 'حُذف من هذا الجهاز، وتعذر تحديث قاعدة البيانات.' };
  }
}
