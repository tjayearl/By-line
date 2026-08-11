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
  demoRole: Role | null;
  setDemoRole: (role: Role | null) => void;
  switchRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  demoRole: null,
  setDemoRole: () => {},
  switchRole: () => {},
});

// Demo accounts for instant 1-click role testing
export const DEMO_USERS: Record<Role, AppUser> = {
  super_admin: {
    uid: "demo-super-admin",
    email: "mungai.charles@kbc.co.ke",
    name: "Mungai Charles (Chief Digital)",
    role: "super_admin",
  },
  managing_editor: {
    uid: "demo-managing-editor",
    email: "managing.editor@kbc.co.ke",
    name: "Samuel Ochieng (Managing Editor)",
    role: "managing_editor",
  },
  editor: {
    uid: "demo-editor",
    email: "desk.editor@kbc.co.ke",
    name: "Faith Njeri (Desk Editor)",
    role: "editor",
  },
  correspondent: {
    uid: "corr-101",
    email: "jane.wambui@kbc.co.ke",
    name: "Jane Wambui (Correspondent)",
    role: "correspondent",
    phone: "+254 712 345 678",
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [realUser, setRealUser] = useState<AppUser | null>(null);
  const [demoRole, setDemoRole] = useState<Role | null>(() => {
    return (localStorage.getItem("byline_demo_role") as Role) || null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        let resolvedRole: Role = "correspondent";
        let resolvedName = fbUser.displayName ?? fbUser.email ?? "";

        try {
          const tokenResult = await fbUser.getIdTokenResult();
          const claimRole = tokenResult.claims.role as Role | undefined;

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
        } catch (err) {
          console.warn("Could not fetch claims or profile document, falling back:", err);
        }

        setRealUser({
          uid: fbUser.uid,
          email: fbUser.email ?? "",
          role: resolvedRole,
          name: resolvedName,
        });
      } else {
        setRealUser(null);
      }

      setLoading(false);
    });
    return unsub;
  }, []);

  const switchRole = (role: Role) => {
    setDemoRole(role);
    localStorage.setItem("byline_demo_role", role);
  };

  // Determine active user (demo role takes precedence for testing, or real authenticated user, or default demo correspondent)
  const activeUser: AppUser | null = demoRole
    ? DEMO_USERS[demoRole]
    : realUser
    ? realUser
    : DEMO_USERS["super_admin"]; // Default active session for instant review

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        firebaseUser,
        loading,
        demoRole,
        setDemoRole,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);