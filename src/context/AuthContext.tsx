import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import type { AppUser, Role } from "../types";

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, firebaseUser: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        const tokenResult = await fbUser.getIdTokenResult();
        const claimRole = tokenResult.claims.role as Role | undefined;

        let resolvedRole: Role = "correspondent";
        let resolvedName = fbUser.displayName ?? fbUser.email ?? "";

        if (claimRole && ["super_admin", "managing_editor", "editor", "correspondent"].includes(claimRole)) {
          resolvedRole = claimRole;
        } else {
          const profileRef = doc(db, "users", fbUser.uid);
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            const profileData = profileSnap.data() as { role?: Role; name?: string } | undefined;
            if (profileData?.role && ["super_admin", "managing_editor", "editor", "correspondent"].includes(profileData.role)) {
              resolvedRole = profileData.role;
            }
            if (profileData?.name) {
              resolvedName = profileData.name;
            }
          }
        }

        setUser({
          uid: fbUser.uid,
          email: fbUser.email ?? "",
          role: resolvedRole,
          name: resolvedName,
        });
      } else {
        setUser(null);
      }

      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);