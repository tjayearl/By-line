import { Link } from "react-router-dom";
import {
  UserPlus, FilePlus, ClipboardCheck, Settings,
  UploadCloud, FileText, Clock, Newspaper
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

function ActionCard({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="flex items-start gap-3 bg-white p-4 rounded-lg border shadow-sm hover:border-blue-400 hover:shadow-md transition"
    >
      <div className="text-blue-600 mt-1">{icon}</div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-1">
        <Newspaper className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Welcome, {user.name || user.email}</h1>
      </div>
      <p className="text-gray-500 mb-6 capitalize">Signed in as {user.role.replace("_", " ")}</p>

      {user.role === "correspondent" && (
        <div className="grid sm:grid-cols-3 gap-4">
          <ActionCard
            to="/submit"
            icon={<UploadCloud className="w-5 h-5" />}
            title="Submit Filing"
            desc="File your story text, audio, video, or images"
          />
          <ActionCard
            to="/report"
            icon={<FileText className="w-5 h-5" />}
            title="Stories Report"
            desc="View earnings and download your monthly PDF report"
          />
          <ActionCard
            to="/assignments"
            icon={<Clock className="w-5 h-5" />}
            title="My Assignments"
            desc="See what's been assigned to you and deadlines"
          />
        </div>
      )}

      {(user.role === "editor" || user.role === "managing_editor" || user.role === "super_admin") && (
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <ActionCard
            to="/editor/register"
            icon={<UserPlus className="w-5 h-5" />}
            title="Register Correspondent"
            desc="Add a new correspondent to the system"
          />
          <ActionCard
            to="/editor/assign"
            icon={<FilePlus className="w-5 h-5" />}
            title="Create Assignment"
            desc="Dispatch a new story assignment"
          />
          <ActionCard
            to="/editor/review"
            icon={<ClipboardCheck className="w-5 h-5" />}
            title="Review Submissions"
            desc="Approve, request revision, or decline filings"
          />
        </div>
      )}

      {(user.role === "managing_editor" || user.role === "super_admin") && (
        <div className="grid sm:grid-cols-3 gap-4">
          <ActionCard
            to="/admin/rates"
            icon={<Settings className="w-5 h-5" />}
            title="Rate Card"
            desc="Set or update payment rates per platform"
          />
        </div>
      )}
    </div>
  );
}