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
import { get, getDatabase, ref, remove, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyDaGBWr7ZNrw6jQirhyn26MoWwNHH8zyEg',
  authDomain: 'niimah.firebaseapp.com',
  databaseURL: 'https://niimah-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'niimah',
  storageBucket: 'niimah.firebasestorage.app',
  messagingSenderId: '500035395969',
  appId: '1:500035395969:web:726365fba15763bb058880',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { app, auth, db };

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL);
}

export function loadFirebase() {
  return Promise.resolve({
    auth,
    db,
    ref,
    get,
    set,
    remove,
    signInWithEmailAndPassword,
    signOut,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    onAuthStateChanged,
    signInAnonymously,
  });
}
