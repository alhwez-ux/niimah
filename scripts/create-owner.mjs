import { readFileSync, existsSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';

const envPath = new URL('../.env', import.meta.url);
if (!existsSync(envPath)) {
  console.error('أنشئ ملف .env من .env.example وأضف مفاتيح Firebase و OWNER_PASSWORD.');
  process.exit(1);
}

for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
}

const password = process.env.OWNER_PASSWORD || '';
const ownerEmail = process.env.OWNER_EMAIL || '';
const apiKey = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDaGBWr7ZNrw6jQirhyn26MoWwNHH8zyEg';
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'niimah';

if (!ownerEmail || !ownerEmail.endsWith('@niimah.app')) {
  console.error('ضع OWNER_EMAIL في ملف .env، مثل الحساب الذي أُنشئ في Firebase Auth.');
  process.exit(1);
}

if (password.length < 6) {
  console.error('ضع OWNER_PASSWORD في ملف .env بطول 6 أحرف على الأقل، ثم أعد تشغيل الأمر.');
  process.exit(1);
}

const app = initializeApp({
  apiKey,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'niimah.firebaseapp.com',
  projectId,
  appId: process.env.VITE_FIREBASE_APP_ID || '1:500035395969:web:726365fba15763bb058880',
});

try {
  await createUserWithEmailAndPassword(getAuth(app), ownerEmail, password);
  console.log('تم إنشاء حساب المالك في Firebase Auth.');
  process.exit(0);
} catch (error) {
  console.error(error.code || error.message);
  process.exit(1);
}
