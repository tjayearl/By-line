import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, LogIn, Newspaper, Sparkles, ShieldCheck } from "lucide-react";
import { auth } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import type { Role } from "../../types";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { switchRole } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    console.log("Attempting login with Email:", JSON.stringify(email), "Password:", JSON.stringify(password));

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate("/");
    } catch (err: any) {
      console.error("Login error:", err);
      const code = err?.code || "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        setError("Invalid email or password. Note: If testing locally without live Firebase credentials, click any of the Quick Review accounts below.");
      } else if (code === "auth/wrong-password") {
        setError("Incorrect password.");
      } else if (code === "auth/invalid-api-key" || code === "auth/api-key-not-valid") {
        setError("Invalid Firebase API Key. Please update your .env file with your actual Firebase config.");
      } else {
        setError(err?.message || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoRole = (role: Role) => {
    switchRole(role);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand-teal/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-brand-gold text-brand-navy px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow">
            <Newspaper className="w-4 h-4" /> KBC Digital Portal
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">BYLINE</h1>
          <p className="text-xs text-blue-200 uppercase tracking-widest font-semibold">
            Correspondent & Contributor Management System
          </p>
        </div>

        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-2xl border-t-4 border-brand-gold space-y-4">
          <div className="text-center pb-2 border-b">
            <h2 className="text-xl font-bold text-brand-navy">Portal Sign In</h2>
            <p className="text-xs text-gray-500 mt-0.5">Enter your credentials to access your newsroom workflow</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
            <div className="flex items-center border border-gray-300 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-brand-navy">
              <Mail className="w-4 h-4 text-gray-400 mr-2.5" />
              <input
                type="email"
                placeholder="name@kbc.co.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 outline-none text-sm text-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
            <div className="flex items-center border border-gray-300 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-brand-navy">
              <Lock className="w-4 h-4 text-gray-400 mr-2.5" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 outline-none text-sm text-slate-900"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-brand-red text-white text-xs font-semibold rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-navy hover:bg-blue-900 text-white font-bold py-3 rounded-xl shadow-lg transition text-sm"
          >
            <LogIn className="w-4 h-4 text-brand-gold" />
            <span>{loading ? "Authenticating..." : "Sign In to Byline"}</span>
          </button>
        </form>

        <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 text-white text-center space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-brand-gold text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Quick Product Review Accounts</span>
          </div>
          <p className="text-[11px] text-gray-200">
            Click any role below to test all V1 features from assignment to payment request:
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => handleQuickDemoRole("super_admin")}
              className="bg-brand-navy text-white hover:bg-blue-900 py-2 px-3 rounded-xl border border-brand-gold/40 flex items-center justify-center gap-1.5 shadow"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
              <span>Super Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoRole("managing_editor")}
              className="bg-brand-navy text-white hover:bg-blue-900 py-2 px-3 rounded-xl border border-brand-gold/40 flex items-center justify-center gap-1.5 shadow"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
              <span>Managing Editor</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoRole("editor")}
              className="bg-brand-navy text-white hover:bg-blue-900 py-2 px-3 rounded-xl border border-brand-gold/40 flex items-center justify-center gap-1.5 shadow"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
              <span>Desk Editor</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoRole("correspondent")}
              className="bg-brand-navy text-white hover:bg-blue-900 py-2 px-3 rounded-xl border border-brand-gold/40 flex items-center justify-center gap-1.5 shadow"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
              <span>Correspondent</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
