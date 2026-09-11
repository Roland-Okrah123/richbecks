import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AppUser } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      // Force refresh to pick up role custom claim set by Cloud Function
      const tokenResult = await firebaseUser.getIdTokenResult(true);
      const userDocSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
      const userDoc = userDocSnap.exists() ? userDocSnap.data() : {};

      setUser({
        uid: firebaseUser.uid,
        full_name: userDoc.full_name || firebaseUser.displayName || 'Staff',
        username: userDoc.username || firebaseUser.email || '',
        email: firebaseUser.email || '',
        role: (tokenResult.claims.role as any) || userDoc.role || 'cashier',
      });
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await updateDoc(doc(db, 'users', cred.user.uid), { last_login: serverTimestamp() }).catch(() => {});
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
