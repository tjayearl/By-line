import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LogOut, 
  LayoutDashboard, 
  ClipboardCheck, 
  FilePlus, 
  UserPlus, 
  UploadCloud, 
  FileText, 
  Clock, 
  Settings, 
  Users 
} from "lucide-react";
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Signout error:", err);
    }
  };

  const isEditor = user && ["editor", "managing_editor", "super_admin"].includes(user.role);
  const isCorrespondent = user?.role === "correspondent";
  const isSuperAdmin = user?.role === "super_admin";
  const isManagingEditor = user?.role === "managing_editor" || isSuperAdmin;

  return (
    <header className="bg-brand-navy text-white shadow-md border-b-4 border-brand-gold sticky top-0 z-50">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 font-bold text-xl tracking-tight text-white hover:opacity-95 transition">
          <img
            src="/logo.png"
            alt="Kenya Broadcasting Corporation"
            className="h-8 sm:h-9 w-auto object-contain shrink-0"
          />
          <div className="flex flex-col">
            <span className="leading-none text-2xl font-black text-white tracking-wide">BYLINE</span>
            <span className="text-[10px] text-brand-gold tracking-wider uppercase font-semibold">KBC Contributor Portal</span>
          </div>
        </Link>

        {/* User Info & Sign Out */}
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

      {/* Sub Navigation Bar */}
      {user && (
        <div className="bg-blue-950/90 border-t border-blue-900/80 px-4 sm:px-6 py-1.5 overflow-x-auto">
          <div className="max-w-7xl mx-auto flex items-center gap-1 text-xs whitespace-nowrap">
            <Link
              to="/"
              className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                location.pathname === "/"
                  ? "bg-brand-gold text-slate-900 shadow-xs"
                  : "text-blue-200 hover:text-white hover:bg-blue-900/50"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Overview</span>
            </Link>

            {isEditor && (
              <>
                <Link
                  to="/editor/review"
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    location.pathname === "/editor/review" || location.pathname === "/approvals"
                      ? "bg-brand-gold text-slate-900 shadow-xs"
                      : "text-blue-200 hover:text-white hover:bg-blue-900/50"
                  }`}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>Review Filings</span>
                </Link>

                <Link
                  to="/editor/assign"
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    location.pathname === "/editor/assign"
                      ? "bg-brand-gold text-slate-900 shadow-xs"
                      : "text-blue-200 hover:text-white hover:bg-blue-900/50"
                  }`}
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>Assign Story</span>
                </Link>

                <Link
                  to="/editor/register"
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    location.pathname === "/editor/register"
                      ? "bg-brand-gold text-slate-900 shadow-xs"
                      : "text-blue-200 hover:text-white hover:bg-blue-900/50"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register Correspondent</span>
                </Link>
              </>
            )}

            {isCorrespondent && (
              <>
                <Link
                  to="/submit"
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    location.pathname === "/submit"
                      ? "bg-brand-gold text-slate-900 shadow-xs"
                      : "text-blue-200 hover:text-white hover:bg-blue-900/50"
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Submit Filing</span>
                </Link>

                <Link
                  to="/assignments"
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    location.pathname === "/assignments" || location.pathname === "/operations"
                      ? "bg-brand-gold text-slate-900 shadow-xs"
                      : "text-blue-200 hover:text-white hover:bg-blue-900/50"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>My Assignments</span>
                </Link>

                <Link
                  to="/report"
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    location.pathname === "/report"
                      ? "bg-brand-gold text-slate-900 shadow-xs"
                      : "text-blue-200 hover:text-white hover:bg-blue-900/50"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Stories & Claims Report</span>
                </Link>
              </>
            )}

            {isManagingEditor && (
              <Link
                to="/admin/rates"
                className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                  location.pathname === "/admin/rates"
                    ? "bg-brand-gold text-slate-900 shadow-xs"
                    : "text-blue-200 hover:text-white hover:bg-blue-900/50"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Rate Cards</span>
              </Link>
            )}

            {isSuperAdmin && (
              <Link
                to="/admin/users"
                className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                  location.pathname === "/admin/users"
                    ? "bg-brand-gold text-slate-900 shadow-xs"
                    : "text-blue-200 hover:text-white hover:bg-blue-900/50"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>User Roles</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
