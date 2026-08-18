import { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { usersList } from "../../data/mockData";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // Get token + role claims
      const tokenResult = await user.getIdTokenResult(true);
      let role = tokenResult.claims.role as string | undefined;

      console.log("USER EMAIL:", user.email);
      console.log("USER UID:", user.uid);
      console.log("USER CLAIMS:", tokenResult.claims);
      console.log("ROLE:", role);

      // 1. Fallback to mock user list role if no custom claim exists
      if (!role && user.email) {
        const mockUser = usersList.find(
          (u) => u.email.toLowerCase() === user.email?.toLowerCase()
        );
        if (mockUser) {
          role = mockUser.role;
        }
      }

      // 2. Fallback to Firestore user profile if registered dynamically
      if (!role && user.uid) {
        try {
          const profileSnap = await getDoc(doc(db, "users", user.uid));
          if (profileSnap.exists()) {
            const profileData = profileSnap.data();
            if (profileData?.role) {
              role = profileData.role;
            }
          }
        } catch (fsErr) {
          console.warn("Firestore role lookup error in login:", fsErr);
        }
      }

      // Save role to localStorage for dashboard to use
      if (role) {
        localStorage.setItem("role", role);
        setMessage(`Welcome back, ${user.email}. Role: ${role}`);
      } else {
        localStorage.removeItem("role");
        setMessage(`Welcome back, ${user.email}. No role assigned. Contact admin.`);
      }

      // Instead of forcing a hard refresh via window.location.href, we change the URL path
      // client-side and let App.tsx handle mounting the router at this new path.
      let redirectUrl = "/";
      if (role === "adManager" || role === "finance") {
        redirectUrl = "/approvals";
      } else if (role === "digitalOps") {
        redirectUrl = "/operations";
      }

      const currentPath = window.location.pathname;
      if (currentPath !== redirectUrl) {
        window.history.replaceState({}, "", redirectUrl);
      }

      // Navigate to destination route in React Router
      navigate(redirectUrl);

    } catch (err: any) {
      console.error(err);
      const code = err?.code || "";
      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password"
      ) {
        setError("Invalid email or password");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later");
      } else {
        setError(err?.message || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  // FORGOT PASSWORD
  const handleResetPassword = async () => {
    setError("");
    setMessage("");

    if (!email) {
      setError("Please enter your email first");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent!");
    } catch (err: any) {
      console.error(err);
      setError("Failed to send reset email");
    }
  };

  return (
    <div style={styles.page}>

      <img
        src="/logo.png"
        alt="Byline Logo"
        style={styles.logo}
        onError={(e) => {
          (e.target as HTMLElement).style.display = "none";
        }}
      />

      <h1 style={styles.title}>Byline</h1>
      <p style={styles.subtitle}>
        Contributor Portal
      </p>

      <form style={styles.card} onSubmit={handleLogin}>

        <h2 style={styles.welcome}>Welcome Back</h2>

        {/* EMAIL */}
        <div style={styles.field}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* PASSWORD */}
        <div style={styles.field}>
          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}
        {message && <p style={styles.success}>{message}</p>}

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p style={styles.forgot} onClick={handleResetPassword}>
          Forgot password?
        </p>

      </form>
    </div>
  );
}

/* ================= STYLES ================= */
const styles: Record<string, React.CSSProperties> = {
  page: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Arial, Inter, sans-serif",
    backgroundColor: "#F7F7F7",
    padding: "20px",
    boxSizing: "border-box",
  },

  logo: {
    width: "160px",
    marginBottom: "5px",
    objectFit: "contain",
  },

  title: {
    color: "#1A3E6F",
    fontSize: "26px",
    fontWeight: 700,
    margin: "0 0 4px 0",
    textAlign: "center",
  },

  subtitle: {
    color: "#1A3E6F",
    fontSize: "14px",
    marginBottom: "20px",
    opacity: 0.85,
    margin: "0 0 20px 0",
    textAlign: "center",
  },

  card: {
    width: "100%",
    maxWidth: "420px",
    backgroundColor: "#1A3E6F",
    borderRadius: "14px",
    padding: "30px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
    boxSizing: "border-box",
  },

  welcome: {
    color: "#fff",
    marginBottom: "20px",
    marginTop: 0,
    fontSize: "22px",
    fontWeight: 600,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    marginBottom: "15px",
  },

  label: {
    color: "#fff",
    fontSize: "15px",
    marginBottom: "6px",
    fontWeight: 500,
  },

  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    fontSize: "16px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    color: "#1A3E6F",
  },

  button: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#C8972B",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "17px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },

  forgot: {
    color: "#C8972B",
    fontSize: "15px",
    marginTop: "14px",
    marginBottom: 0,
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "underline",
  },

  error: {
    color: "#B71C1C",
    fontSize: "14px",
    marginBottom: "12px",
    backgroundColor: "#ffebee",
    padding: "8px 12px",
    borderRadius: "6px",
    fontWeight: 500,
  },

  success: {
    color: "#0F6E56",
    fontSize: "14px",
    marginBottom: "12px",
    backgroundColor: "#e8f5e9",
    padding: "8px 12px",
    borderRadius: "6px",
    fontWeight: 500,
  },
};
