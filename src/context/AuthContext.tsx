import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc, getDocs, collection, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { loadStoredData } from "../lib/dataStore";
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
    email: "zippyk80@gmail.com",
    name: "ZIPPORAH KWAMBOKA OGANDA (Managing Editor)",
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
        const userEmail = (fbUser.email || "").toLowerCase().trim();
        let resolvedRole: Role = "correspondent";
        let resolvedName = fbUser.displayName ?? fbUser.email ?? "User";

        try {
          // 1. Check token custom claim
          const tokenResult = await fbUser.getIdTokenResult();
          const claimRole = tokenResult.claims.role as Role | undefined;

          if (claimRole) {
            resolvedRole = claimRole;
          } else {
            let profileFound = false;

            // 2. Check Firestore doc by UID
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
              console.warn("Could not query Firestore user profile by UID:", fsErr);
            }

            // 3. If not found by UID, search Firestore by email
            if (!profileFound && userEmail) {
              try {
                const uSnap = await getDocs(collection(db, "users"));
                uSnap.forEach((d) => {
                  const u = d.data() as any;
                  if (u && u.email && u.email.toLowerCase().trim() === userEmail) {
                    if (u.role) {
                      resolvedRole = u.role as Role;
                      profileFound = true;
                    }
                    if (u.name) {
                      resolvedName = u.name;
                    }
                  }
                });

                if (profileFound) {
                  try {
                    await setDoc(doc(db, "users", fbUser.uid), {
                      uid: fbUser.uid,
                      email: userEmail,
                      role: resolvedRole,
                      name: resolvedName,
                    }, { merge: true });
                  } catch {}
                }
              } catch (fsErr2) {
                console.warn("Could not query Firestore users collection by email:", fsErr2);
              }
            }

            // 4. Check locally saved custom users from User Admin
            if (!profileFound && userEmail) {
              const customUsers = loadStoredData<any[]>("byline_custom_users_v1", []);
              const foundCustom = customUsers.find(
                (u) => u.email && u.email.toLowerCase().trim() === userEmail
              );
              if (foundCustom) {
                if (foundCustom.role) {
                  resolvedRole = foundCustom.role as Role;
                  profileFound = true;
                }
                if (foundCustom.name) {
                  resolvedName = foundCustom.name;
                }
              }
            }

            // 5. Check mock user list (usersList)
            if (!profileFound && userEmail) {
              const mockUser = usersList.find(
                (u) => u.email && u.email.toLowerCase().trim() === userEmail
              );
              if (mockUser) {
                resolvedRole = mockUser.role as Role;
                if (mockUser.name) resolvedName = mockUser.name;
                profileFound = true;
              }
            }

            // 6. Check stored role in localStorage
            if (!profileFound) {
              const storedRole = localStorage.getItem("role") as Role | null;
              if (storedRole) {
                resolvedRole = storedRole;
              }
            }
          }
        } catch (err) {
          console.warn("Could not fetch claims or profile document, falling back:", err);
        }

        // Keep localStorage updated with active role
        localStorage.setItem("role", resolvedRole);

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