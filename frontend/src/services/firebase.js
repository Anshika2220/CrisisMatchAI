import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC_zLy7DdNI_OAWwMGZjoi7P4kx4kv46RQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "crisismatch.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "crisismatch",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "crisismatch.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "641271032758",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:641271032758:web:319e131a37da4823936f17",
};

if (!firebaseConfig.apiKey) {
  console.error("Firebase API Key is missing! Check your .env file and ensure it starts with VITE_");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const signUpEmail = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

// Phone Auth Helpers
export const setupRecaptcha = (containerId) => {
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
  }
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: (response) => {
      // reCAPTCHA solved, allow signInWithPhoneNumber.
    }
  });
  // Firebase v9 sometimes requires an explicit render() call for invisible reCAPTCHA.
  window.recaptchaVerifier.render().catch(() => {});
  return window.recaptchaVerifier;
};

export const signInPhone = (phoneNumber, appVerifier) => signInWithPhoneNumber(auth, phoneNumber, appVerifier);
