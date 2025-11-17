import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';  // ← CAMBIATO
import { getStorage } from 'firebase/storage';

// Configurazione Firebase da variabili di ambiente
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // ❌ Rimosso: databaseURL (non serve per Firestore)
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Esporta i servizi Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);  // ← CAMBIATO
export const storage = getStorage(app);
export default app;