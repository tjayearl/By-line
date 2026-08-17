import { Link, useNavigate } from "react-router-dom";
import { Newspaper, LogOut, UserCheck, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";

const ROLE_LABELS: Record<Role, { title: string; desc: string }> = {
  super_admin: { title: "Super Admin", desc: "Head of Digital / Full Access" },
  managing_editor: { title: "Managing Editor", desc: "Rate Cards & Publication Sign-off" },
  editor: { title: "Desk Editor", desc: "Assignments & Editorial Review" },
  correspondent: { title: "Correspondent", desc: "Field Reporting & Invoice Claims" },
  adManager: { title: "Ad Manager", desc: "Advertising & Campaign Approvals" },
  finance: { title: "Finance", desc: "Billing, Invoices & Claims Settlement" },
  digitalOps: { title: "Digital Ops", desc: "Inventory & Campaign Operations" },
};

export default function Navbar() {
  const { user, switchRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Signout error:", err);
    }
  };

  return (
    <header className="bg-brand-navy text-white shadow-md border-b-4 border-brand-gold sticky top-0 z-50">
      {/* Top Demo / Role Switcher Toolbar */}
      <div className="bg-[#102747] text-xs px-4 py-1.5 border-b border-blue-900/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-gray-300">
          <Sparkles className="w-3.5 h-3.5 text-brand-gold animate-pulse" />
          <span className="font-semibold text-white">Role Switcher (Product Review Mode):</span>
          <span className="hidden sm:inline text-gray-400">Click any role to test end-to-end features instantly:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["super_admin", "managing_editor", "editor", "correspondent"] as Role[]).map((r) => {
            const isActive = user?.role === r;
            return (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                  isActive
                    ? "bg-brand-gold text-slate-900 font-bold shadow"
                    : "bg-blue-950/80 text-blue-200 hover:bg-blue-900 hover:text-white"
                }`}
                title={ROLE_LABELS[r].desc}
              >
                {isActive && <UserCheck className="w-3 h-3" />}
                {ROLE_LABELS[r].title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-white hover:text-brand-gold transition">
          <div className="p-1.5 bg-brand-gold text-brand-navy rounded-lg shadow-sm">
            <Newspaper className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="leading-none text-2xl font-black text-white tracking-wide">BYLINE</span>
            <span className="text-[10px] text-brand-gold tracking-wider uppercase font-semibold">KBC Contributor Portal</span>
          </div>
        </Link>

        {/* User Info & Navigation */}
        <div className="flex items-center gap-4 text-sm">
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="font-semibold text-white leading-tight">{user.name || user.email}</span>
                <span className="text-xs text-brand-gold font-medium flex items-center justify-end gap-1">
                  <span className="w-2 h-2 rounded-full bg-brand-teal inline-block"></span>
                  {ROLE_LABELS[user.role]?.title || user.role}
                </span>
              </div>

              {/* Role badge in Teal #0F6E56 */}
              <span className="bg-brand-teal text-white text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                {user.role.replace("_", " ")}
              </span>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1 bg-red-900/80 hover:bg-brand-red text-white text-xs px-3 py-1.5 rounded-md transition shadow-sm cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
