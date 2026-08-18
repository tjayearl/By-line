import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import type { AppUser, Role } from "../types";
import { usersList } from "../data/mockData";

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  demoRole: Role | null;
  setDemoRole: (role: Role | null) => void;
  switchRole: (role: Role | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  demoRole: null,
  setDemoRole: () => {},
  switchRole: () => {},
  logout: async () => {},
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
  adManager: {
    uid: "demo-ad-manager",
    email: "admanager@adboard.com",
    name: "Alex Kimani (Ad Operations Manager)",
    role: "adManager",
  },
  finance: {
    uid: "demo-finance",
    email: "finance@adboard.com",
    name: "Grace Muthoni (Finance Controller)",
    role: "finance",
  },
  digitalOps: {
    uid: "demo-digital-ops",
    email: "ops@adboard.com",
    name: "David Ochieng (Digital Operations Lead)",
    role: "digitalOps",
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [realUser, setRealUser] = useState<AppUser | null>(null);
  const [demoRole, setDemoRole] = useState<Role | null>(null);
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

          if (claimRole) {
            resolvedRole = claimRole;
          } else {
            // 1. Check Firestore user profile first
            let profileFound = false;
            try {
              const profileRef = doc(db, "users", fbUser.uid);
              const profileSnap = await getDoc(profileRef);

              if (profileSnap.exists()) {
                const profileData = profileSnap.data() as { role?: Role; name?: string } | undefined;
                if (profileData?.role) {
                  resolvedRole = profileData.role;
                  profileFound = true;
                }
                if (profileData?.name) {
                  resolvedName = profileData.name;
                }
              }
            } catch (fsErr) {
              console.warn("Could not query Firestore user profile:", fsErr);
            }

            // 2. If not found in Firestore, check mock user list
            if (!profileFound && fbUser.email) {
              const mockUser = usersList.find((u) => u.email.toLowerCase() === fbUser.email?.toLowerCase());
              if (mockUser) {
                resolvedRole = mockUser.role as Role;
                if (mockUser.name) resolvedName = mockUser.name;
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

  const switchRole = (role: Role | null) => {
    setDemoRole(role);
    if (role) {
      localStorage.setItem("byline_demo_role", role);
      localStorage.setItem("role", role);
    } else {
      localStorage.removeItem("byline_demo_role");
      localStorage.removeItem("role");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Signout error:", err);
    } finally {
      setRealUser(null);
      setDemoRole(null);
      localStorage.removeItem("byline_demo_role");
      localStorage.removeItem("role");
    }
  };

  // Determine active user:
  // 1. Real authenticated Firebase user
  // 2. Explicit demo role selection if set
  // 3. Otherwise null -> ProtectedRoute will redirect to /login
  const activeUser: AppUser | null = realUser
    ? realUser
    : demoRole
    ? DEMO_USERS[demoRole] || null
    : null;

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        firebaseUser,
        loading,
        demoRole,
        setDemoRole,
        switchRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);