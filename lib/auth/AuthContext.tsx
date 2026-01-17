import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/client';
import { User } from '../models/types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: FirebaseUser | null;
  appUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await loadAppUser(firebaseUser);
      } else {
        setUser(null);
        setAppUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loadAppUser = async (firebaseUser: FirebaseUser) => {
    const uid = firebaseUser.uid;
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      const firebaseName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '';
      const firebaseEmail = firebaseUser.email || '';
      const firebasePhotoURL = firebaseUser.photoURL || null;
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // If stored name is empty/unknown and Firebase has a name, prefer Firebase and update
        const storedName = userData.name || '';
        const shouldUpdateName = (!storedName || storedName === 'Unknown User') && firebaseName;
        const finalName = shouldUpdateName ? firebaseName : (storedName || firebaseName || 'Unknown User');
        
        // Also update email/photo if missing
        const shouldUpdate = shouldUpdateName || !userData.email || !userData.photoURL;
        
        // Always prefer Firebase photoURL if available (most up-to-date)
        const finalPhotoURL = firebasePhotoURL || userData.photoURL || null;
        const finalEmail = firebaseEmail || userData.email || '';
        
        const appUserData = {
          uid: uid,
          role: userData.role || 'creator',
          name: finalName,
          email: finalEmail,
          photoURL: finalPhotoURL,
          createdAt: userData.createdAt?.toDate() || new Date(),
          lastActiveAt: new Date(),
        };
        
        // Update Firestore if we improved the data
        const shouldUpdatePhoto = !userData.photoURL && firebasePhotoURL;
        if (shouldUpdate || shouldUpdatePhoto) {
          await setDoc(doc(db, 'users', uid), {
            ...appUserData,
            createdAt: userData.createdAt || serverTimestamp(),
            lastActiveAt: serverTimestamp(),
          }, { merge: true });
        }
        
        setAppUser(appUserData);
      } else {
        // Create basic user document if it doesn't exist
        const basicUser: Omit<User, 'id'> = {
          uid: uid,
          role: 'creator', // Default role, will be updated during onboarding
          name: firebaseName || 'Unknown User',
          email: firebaseEmail,
          photoURL: firebasePhotoURL,
          createdAt: new Date(),
          lastActiveAt: new Date(),
        };
        await setDoc(doc(db, 'users', uid), {
          ...basicUser,
          createdAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
        });
        setAppUser(basicUser);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      console.log('🔧 Falling back to Firebase user data');
      // Fallback to Firebase user data
      const firebaseName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Dev User';
      setAppUser({
        uid: uid,
        role: 'creator',
        name: firebaseName,
        email: firebaseUser.email || 'dev@example.com',
        photoURL: firebaseUser.photoURL || null,
        createdAt: new Date(),
        lastActiveAt: new Date(),
      });
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Signed in successfully!');
    } catch (error: any) {
      console.error('Google sign in error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Signed in successfully!');
    } catch (error: any) {
      console.error('Email sign in error:', error);
      toast.error(error.message || 'Failed to sign in');
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast.success('Account created successfully!');
    } catch (error: any) {
      console.error('Email sign up error:', error);
      toast.error(error.message || 'Failed to create account');
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      toast.success('Signed out successfully!');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const refreshUser = async () => {
    if (user) {
      await loadAppUser(user);
    }
  };

  const value: AuthContextType = {
    user,
    appUser,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}