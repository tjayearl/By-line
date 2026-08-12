import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  UserPlus, FilePlus, ClipboardCheck, Settings,
  UploadCloud, FileText, Clock, Newspaper, CheckCircle2,
  DollarSign, ArrowRight
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import EditorialDirectiveNotice from "../components/EditorialDirectiveNotice";
import {
  loadStoredData, INITIAL_ASSIGNMENTS, INITIAL_CORRESPONDENTS,
  INITIAL_SUBMISSIONS, INITIAL_CLAIMS
} from "../lib/dataStore";
import type { Assignment, Correspondent, PaymentClaim, Submission } from "../types";

function StatCard({ title, value, sub, icon, bgClass = "bg-white", textClass = "text-brand-navy" }: {
  title: string; value: string | number; sub: string; icon: React.ReactNode; bgClass?: string; textClass?: string;
}) {
  return (
    <div className={`${bgClass} p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p>
        <h3 className={`text-2xl font-black mt-1 ${textClass}`}>{value}</h3>
        <p className="text-xs text-gray-500 mt-1">{sub}</p>
      </div>
      <div className="p-3 bg-brand-offwhite rounded-xl text-brand-navy shadow-inner">
        {icon}
      </div>
    </div>
  );
}

function ActionCard({ to, icon, title, desc, tag }: { to: string; icon: React.ReactNode; title: string; desc: string; tag?: string }) {
  return (
    <Link
      to={to}
      className="group bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-brand-gold hover:shadow-md transition flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 bg-brand-navy text-brand-gold rounded-lg group-hover:bg-brand-gold group-hover:text-brand-navy transition">
            {icon}
          </div>
          {tag && (
            <span className="text-[10px] uppercase font-bold bg-brand-teal text-white px-2 py-0.5 rounded-full">
              {tag}
            </span>
          )}
        </div>
        <h4 className="font-bold text-slate-900 group-hover:text-brand-navy transition">{title}</h4>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs font-bold text-brand-navy group-hover:text-brand-gold transition">
        <span>Open Module</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [claims, setClaims] = useState<PaymentClaim[]>([]);
  const [correspondents, setCorrespondents] = useState<Correspondent[]>([]);

  useEffect(() => {
    setAssignments(loadStoredData("byline_assignments_v1", INITIAL_ASSIGNMENTS));
    setSubmissions(loadStoredData("byline_submissions_v1", INITIAL_SUBMISSIONS));
    setClaims(loadStoredData("byline_claims_v1", INITIAL_CLAIMS));
    setCorrespondents(loadStoredData("byline_correspondents_v1", INITIAL_CORRESPONDENTS));
  }, []);

  if (!user) return null;

  const isCorrespondent = user.role === "correspondent";
  const isEditor = user.role === "editor" || user.role === "managing_editor" || user.role === "super_admin";
  const isManagement = user.role === "managing_editor" || user.role === "super_admin";

  const pendingSubmissions = submissions.filter((s) => s.status === "pending_review");
  const pendingClaims = claims.filter((c) => c.status === "pending");
  const totalPendingPayout = pendingClaims.reduce((sum, c) => sum + c.totalAmountKES, 0);

  // Filter submissions based on user role
  const visibleSubmissions = submissions.filter((sub) => {
    // If user is a Correspondent, only show their own submissions
    if (user?.role === "correspondent") {
      return sub.correspondentId === user?.uid;
    }
    // Editors and Admins see all submissions
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Bar */}
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow-lg border-b-4 border-brand-gold flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-brand-teal text-white text-xs font-bold px-2.5 py-0.5 rounded-full uppercase">
              Active Session
            </span>
            <span className="text-brand-gold text-xs font-semibold">Kenya Broadcasting Corporation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-1 text-white tracking-tight">
            Welcome, {user.name || user.email}
          </h1>
          <p className="text-xs sm:text-sm text-blue-200 mt-1 capitalize">
            Role: <span className="text-brand-gold font-bold">{user.role.replace("_", " ")}</span> &bull; Byline System of Record
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={isCorrespondent ? "/submit" : "/editor/assign"}
            className="bg-brand-gold hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2.5 rounded-xl shadow transition text-sm flex items-center gap-2"
          >
            {isCorrespondent ? <UploadCloud className="w-4 h-4" /> : <FilePlus className="w-4 h-4" />}
            <span>{isCorrespondent ? "Submit Filing" : "New Story Assignment"}</span>
          </Link>
        </div>
      </div>

      {/* Red Mandatory Directive Notice */}
      <EditorialDirectiveNotice />

      {/* Key Metrics Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Correspondents"
          value={correspondents.length}
          sub="Registered field journalists"
          icon={<UserPlus className="w-6 h-6" />}
        />
        <StatCard
          title="Story Assignments"
          value={assignments.length}
          sub="Dispatched editorial briefs"
          icon={<Clock className="w-6 h-6" />}
        />
        <StatCard
          title="Pending Reviews"
          value={pendingSubmissions.length}
          sub="Filings awaiting desk editor"
          icon={<ClipboardCheck className="w-6 h-6 text-amber-600" />}
        />
        <StatCard
          title="Total Pending Claims"
          value={`KES ${totalPendingPayout.toLocaleString()}`}
          sub={`${pendingClaims.length} payment requests lodged`}
          icon={<DollarSign className="w-6 h-6 text-brand-gold" />}
          textClass="text-brand-gold"
        />
      </div>

      {/* Role Action Modules */}
      <div>
        <h2 className="text-lg font-bold text-brand-navy mb-3 flex items-center gap-2 border-b-2 border-brand-navy/20 pb-2">
          <Newspaper className="w-5 h-5 text-brand-gold" />
          <span>Core Workflow Modules</span>
        </h2>

        {isCorrespondent && (
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <ActionCard
              to="/submit"
              icon={<UploadCloud className="w-6 h-6" />}
              title="Submit Story Filing"
              desc="File your multi-format story: text body, audio clips, video packages, or images with timestamping."
              tag="Correspondent"
            />
            <ActionCard
              to="/report"
              icon={<FileText className="w-6 h-6" />}
              title="Monthly Stories Report"
              desc="View automatic payment calculations and download formal PDF payment requests for Finance."
              tag="Finance Claim"
            />
            <ActionCard
              to="/assignments"
              icon={<Clock className="w-6 h-6" />}
              title="My Assignments"
              desc="Review stories assigned to you by desk editors, platform targets, and submission deadlines."
              tag="Commissioned"
            />
          </div>
        )}

        {isEditor && (
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <ActionCard
              to="/editor/register"
              icon={<UserPlus className="w-6 h-6" />}
              title="Register Correspondent"
              desc="Internal onboarding: register correspondent contact, national ID, bank details, and beat specialisation."
              tag="Desk Editor"
            />
            <ActionCard
              to="/editor/assign"
              icon={<FilePlus className="w-6 h-6" />}
              title="Create Story Assignment"
              desc="Dispatch formal story commissions with headline, brief, platform target, and strict deadline."
              tag="Commissioning"
            />
            <ActionCard
              to="/editor/review"
              icon={<ClipboardCheck className="w-6 h-6" />}
              title="Review & Confirm Broadcast"
              desc="Approve filings, record TV/Radio airing platforms, verify proof of use, and trigger automated rates."
              tag="Editorial Gate"
            />
          </div>
        )}

        {isManagement && (
          <div className="grid sm:grid-cols-3 gap-4">
            <ActionCard
              to="/admin/rates"
              icon={<Settings className="w-6 h-6" />}
              title="Rate Card System Design"
              desc="Set and update base rates per platform (TV National, Regional, Radio, Web, Social) applied across KBC."
              tag="Rate Engine"
            />
          </div>
        )}
      </div>

      {/* Recent Activity Table with Alternating Off-white #F7F7F7 Rows */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-brand-gold">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Clock className="w-5 h-5 text-brand-gold" />
            <span>Recent Story Filings & Status</span>
          </div>
          <span className="text-xs text-brand-gold font-semibold">Total Filings: {visibleSubmissions.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-byline">
            <thead>
              <tr className="bg-gray-100 text-xs font-bold uppercase tracking-wider text-slate-700 border-b">
                <th className="p-4">Filing ID & Headline</th>
                <th className="p-4">Correspondent</th>
                <th className="p-4">Submitted Date</th>
                <th className="p-4">Editorial Status</th>
                <th className="p-4">Aired Platforms</th>
                <th className="p-4 text-right">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs sm:text-sm">
              {visibleSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    {user?.role === "correspondent" 
                      ? "No submissions found for you yet. Submit a filing to get started."
                      : "No submissions found yet. Click Submit Filing or Create Assignment to start."
                    }
                  </td>
                </tr>
              ) : (
                visibleSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-blue-50/50 transition">
                    <td className="p-4 font-semibold text-slate-900">
                      <div className="text-brand-navy font-bold">{sub.assignmentTitle}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">{sub.id}</div>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-slate-800">{sub.correspondentName}</span>
                    </td>
                    <td className="p-4 text-gray-600">
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {sub.status === "approved" && (
                        <span className="bg-brand-teal text-white text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {sub.status === "pending_review" && (
                        <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      )}
                      {sub.status === "revision_needed" && (
                        <span className="bg-orange-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                          Revision Needed
                        </span>
                      )}
                      {sub.status === "declined" && (
                        <span className="bg-brand-red text-white text-xs font-bold px-2.5 py-1 rounded-full">
                          Declined
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {sub.publishedPlatforms && sub.publishedPlatforms.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {sub.publishedPlatforms.map((p) => (
                            <span key={p} className="bg-blue-100 text-brand-navy text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                              {p.replace("_", " ").toUpperCase()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Not marked yet</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-bold text-brand-gold">
                      {sub.calculatedAmountKES > 0 ? `KES ${sub.calculatedAmountKES.toLocaleString()}` : "KES 0"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}