import { initializeApp } from 'firebase/app';
import {
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDaGBWr7ZNrw6jQirhyn26MoWwNHH8zyEg',
  authDomain: 'niimah.firebaseapp.com',
  projectId: 'niimah',
  storageBucket: 'niimah.firebasestorage.app',
  messagingSenderId: '500035395969',
  appId: '1:500035395969:web:726365fba15763bb058880',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (error) {
  console.warn(error);
  db = getFirestore(app);
}

export { app, auth, db };

export function isFirebaseConfigured() {
  return true;
}

export function loadFirebase() {
  return Promise.resolve({
    auth,
    db,
    signInWithEmailAndPassword,
    signOut,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    onAuthStateChanged,
    signInAnonymously,
    doc,
    setDoc,
    deleteDoc,
    getDoc,
    getDocs,
    collection,
  });
}
