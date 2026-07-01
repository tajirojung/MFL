import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// For Vercel or other deployments, we must use the official Firebase authDomain (e.g. charismatic-cosmos-nxhgq.firebaseapp.com)
// Because custom domains cannot be added to the Authorized Domains list on an AI Studio-managed Firebase project,
// using the default authDomain allows Google Sign-in to work flawlessly across all environments (AI Studio, localhost, and Vercel).
const config = {
  ...firebaseConfig,
  authDomain: firebaseConfig.authDomain
};

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || 'main');
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
