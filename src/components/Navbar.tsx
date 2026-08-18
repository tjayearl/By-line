import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Newspaper, LogOut, Users, Settings, UserPlus,
  FilePlus, ClipboardCheck, UploadCloud, FileText, Clock
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

  const isCorrespondent = user?.role === "correspondent";
  const isEditor = ["editor", "managing_editor", "super_admin"].includes(user?.role || "");
  const isManagement = ["managing_editor", "super_admin"].includes(user?.role || "");
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <header className="bg-brand-navy text-white shadow-md border-b-4 border-brand-gold sticky top-0 z-50">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-white hover:text-brand-gold transition">
            <div className="p-1.5 bg-brand-gold text-brand-navy rounded-lg shadow-sm">
              <Newspaper className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="leading-none text-2xl font-black text-white tracking-wide">BYLINE</span>
              <span className="text-[10px] text-brand-gold tracking-wider uppercase font-semibold">KBC Contributor Portal</span>
            </div>
          </Link>

          {/* Role-based Navigation Links */}
          {user && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold">
              {isSuperAdmin && (
                <Link
                  to="/admin/users"
                  className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                    location.pathname === "/admin/users"
                      ? "bg-brand-gold text-brand-navy font-bold shadow-sm"
                      : "text-blue-100 hover:bg-blue-900/60 hover:text-white"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Users</span>
                </Link>
              )}

              {isManagement && (
                <Link
                  to="/admin/rates"
                  className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                    location.pathname === "/admin/rates"
                      ? "bg-brand-gold text-brand-navy font-bold shadow-sm"
                      : "text-blue-100 hover:bg-blue-900/60 hover:text-white"
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Rate Card</span>
                </Link>
              )}

              {isEditor && (
                <>
                  <Link
                    to="/editor/assign"
                    className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      location.pathname === "/editor/assign"
                        ? "bg-brand-gold text-brand-navy font-bold shadow-sm"
                        : "text-blue-100 hover:bg-blue-900/60 hover:text-white"
                    }`}
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>Assign Story</span>
                  </Link>

                  <Link
                    to="/editor/review"
                    className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      location.pathname === "/editor/review"
                        ? "bg-brand-gold text-brand-navy font-bold shadow-sm"
                        : "text-blue-100 hover:bg-blue-900/60 hover:text-white"
                    }`}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>Review Filings</span>
                  </Link>

                  <Link
                    to="/editor/register"
                    className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      location.pathname === "/editor/register"
                        ? "bg-brand-gold text-brand-navy font-bold shadow-sm"
                        : "text-blue-100 hover:bg-blue-900/60 hover:text-white"
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
                    className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      location.pathname === "/submit"
                        ? "bg-brand-gold text-brand-navy font-bold shadow-sm"
                        : "text-blue-100 hover:bg-blue-900/60 hover:text-white"
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Submit Filing</span>
                  </Link>

                  <Link
                    to="/report"
                    className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      location.pathname === "/report"
                        ? "bg-brand-gold text-brand-navy font-bold shadow-sm"
                        : "text-blue-100 hover:bg-blue-900/60 hover:text-white"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Stories Report</span>
                  </Link>

                  <Link
                    to="/assignments"
                    className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      location.pathname === "/assignments"
                        ? "bg-brand-gold text-brand-navy font-bold shadow-sm"
                        : "text-blue-100 hover:bg-blue-900/60 hover:text-white"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Assignments</span>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

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
