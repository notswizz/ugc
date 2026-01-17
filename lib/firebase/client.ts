import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:demo",
};

// Initialize Firebase (only if we have real config)
let app;
let auth;
let db;
let storage;
let functions;
let googleProvider;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
} catch (error) {
  console.warn('Firebase initialization failed, using mock services:', error.message);

  // Mock services for development
  auth = {
    onAuthStateChanged: (callback) => {
      const mockUser = {
        uid: 'dev-user-123',
        email: 'dev@example.com',
        displayName: 'Dev User',
        photoURL: null,
      };
      setTimeout(() => callback(mockUser), 100);
      return () => {};
    },
    signInWithPopup: async () => ({ user: { uid: 'dev-user-123', email: 'dev@example.com' } }),
    signInWithEmailAndPassword: async () => ({ user: { uid: 'dev-user-123', email: 'dev@example.com' } }),
    createUserWithEmailAndPassword: async () => ({ user: { uid: 'dev-user-123', email: 'dev@example.com' } }),
    signOut: async () => {},
  };

  db = {
    collection: () => ({
      doc: () => ({
        get: async () => ({
          exists: () => true,
          data: () => ({
            role: 'creator',
            name: 'Dev User',
            email: 'dev@example.com',
          }),
        }),
        set: async () => {},
        update: async () => {},
      }),
    }),
  };

  storage = {};
  functions = {};
  googleProvider = {};
}

export { auth, db, storage, functions, googleProvider };
export default app;