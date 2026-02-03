
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAx8EmPIwxlAcXqxNAn9HKnzUkgqEUUmrI",
  authDomain: "prisma-92d72.firebaseapp.com",
  projectId: "prisma-92d72",
  storageBucket: "prisma-92d72.firebasestorage.app",
  messagingSenderId: "646496635681",
  appId: "1:646496635681:web:5294d68e61feb25f784c60",
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export { firebaseApp as app };
