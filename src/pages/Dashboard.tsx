import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  UserPlus, FilePlus, ClipboardCheck, Settings,
  UploadCloud, FileText, Clock, Newspaper, CheckCircle2,
  DollarSign, ArrowRight, Users, RefreshCw, Layers,
  Trash2, AlertTriangle, X, Edit3
} from "lucide-react";
import { getDocs, collection, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import {
  loadStoredData, saveStoredData, INITIAL_ASSIGNMENTS, INITIAL_CORRESPONDENTS,
  INITIAL_SUBMISSIONS, INITIAL_CLAIMS, clearAllStoriesData,
  withdrawStoryFiling, deleteAssignment
} from "../lib/dataStore";
import type { Assignment, Correspondent, PaymentClaim, Platform, Submission } from "../types";

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
  const [activeTab, setActiveTab] = useState<"all" | "assignments" | "filings" | "claims">("all");
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  const [withdrawTarget, setWithdrawTarget] = useState<{ subId: string; asgId?: string; title: string } | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [pipelineFeedback, setPipelineFeedback] = useState<string | null>(null);

  const handleMarkClaimAsPaid = async (claimId: string) => {
    const paidTimestamp = new Date().toISOString();
    const updated = claims.map((c) =>
      c.id === claimId ? { ...c, status: "paid" as const, paidAt: paidTimestamp } : c
    );
    setClaims(updated);
    saveStoredData("byline_claims_v1", updated);

    try {
      await updateDoc(doc(db, "claims", claimId), { status: "paid", paidAt: paidTimestamp });
    } catch (fsErr) {
      console.warn("Firestore mark claim paid notice:", fsErr);
    }

    try {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("byline:data_updated"));
    } catch {}

    setPipelineFeedback(`Claim [${claimId}] successfully marked as PAID & Settled!`);
  };

  const handleResetAllStories = async () => {
    setIsResetting(true);
    setResetFeedback(null);
    try {
      const res = await clearAllStoriesData();
      await fetchData();
      setResetFeedback(res.message);
      setTimeout(() => {
        setShowResetModal(false);
        setResetFeedback(null);
      }, 1500);
    } catch (e: any) {
      setResetFeedback(e?.message || "Failed to reset stories");
    } finally {
      setIsResetting(false);
    }
  };

  const handleExecuteWithdraw = async () => {
    if (!withdrawTarget) return;
    setIsWithdrawing(true);
    try {
      const res = await withdrawStoryFiling(withdrawTarget.subId, withdrawTarget.asgId);
      setPipelineFeedback(res.message);
      await fetchData();
    } catch (err: any) {
      setPipelineFeedback(err?.message || "Failed to withdraw story filing");
    } finally {
      setIsWithdrawing(false);
      setWithdrawTarget(null);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Assignments (merge localStorage and Firestore)
      const localAsgs = loadStoredData<Assignment[]>("byline_assignments_v1", INITIAL_ASSIGNMENTS);
      const asgMap = new Map<string, Assignment>();
      localAsgs.forEach((a) => { if (a && a.id) asgMap.set(a.id, a); });
      try {
        const asgSnap = await getDocs(collection(db, "assignments"));
        asgSnap.forEach((d) => {
          const a = d.data() as Assignment;
          if (a && (a.id || d.id)) {
            const id = a.id || d.id;
            const existing = asgMap.get(id);
            asgMap.set(id, { ...existing, ...a, id });
          }
        });
      } catch (fsErr) {
        console.warn("Firestore asg notice:", fsErr);
      }
      const allAsgs = Array.from(asgMap.values());
      saveStoredData("byline_assignments_v1", allAsgs);
      setAssignments(allAsgs);

      // 2. Submissions (merge localStorage and Firestore)
      const localSubs = loadStoredData<Submission[]>("byline_submissions_v1", INITIAL_SUBMISSIONS);
      const subMap = new Map<string, Submission>();
      localSubs.forEach((s) => { if (s && s.id) subMap.set(s.id, s); });
      try {
        const subSnap = await getDocs(collection(db, "submissions"));
        subSnap.forEach((d) => {
          const s = d.data() as Submission;
          if (s && (s.id || d.id)) {
            const id = s.id || d.id;
            const existing = subMap.get(id);
            subMap.set(id, { ...existing, ...s, id });
          }
        });
      } catch (fsErr) {
        console.warn("Firestore subs notice:", fsErr);
      }
      const allSubs = Array.from(subMap.values());
      saveStoredData("byline_submissions_v1", allSubs);
      setSubmissions(allSubs);

      // 3. Claims
      let allClaims: PaymentClaim[] = [];
      try {
        const claimSnap = await getDocs(collection(db, "claims"));
        const fsClaims: PaymentClaim[] = [];
        claimSnap.forEach((d) => {
          const c = d.data() as PaymentClaim;
          if (c && (c.id || d.id)) fsClaims.push({ ...c, id: c.id || d.id });
        });
        allClaims = fsClaims;
        saveStoredData("byline_claims_v1", fsClaims);
      } catch (fsErr) {
        console.warn("Firestore claims notice:", fsErr);
        allClaims = loadStoredData<PaymentClaim[]>("byline_claims_v1", INITIAL_CLAIMS);
      }
      setClaims(allClaims);

      // 4. Correspondents
      const corrMap = new Map<string, Correspondent>();
      INITIAL_CORRESPONDENTS.forEach((c) => corrMap.set(c.email.toLowerCase(), c));
      const localCorrs = loadStoredData<Correspondent[]>("byline_correspondents_v1", []);
      localCorrs.forEach((c) => {
        if (c.email) corrMap.set(c.email.toLowerCase(), c);
      });
      try {
        const uSnap = await getDocs(collection(db, "users"));
        uSnap.forEach((d) => {
          const u = d.data() as any;
          if (u.role === "correspondent" && u.email) {
            corrMap.set(u.email.toLowerCase(), {
              id: d.id,
              name: u.name || u.email,
              email: u.email,
              phone: u.phone || "",
              idNumber: u.idNumber || "",
              bankDetails: u.bankDetails || "",
              specialisation: u.specialisation || "News",
              county: u.county || "Nairobi",
              registeredAt: u.registeredAt || new Date().toISOString(),
            });
          }
        });
      } catch (fsErr) {
        console.warn("Firestore users notice:", fsErr);
      }
      setCorrespondents(Array.from(corrMap.values()));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleUpdate = () => {
      fetchData();
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("byline:data_updated", handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("byline:data_updated", handleUpdate);
    };
  }, []);

  if (!user) return null;

  const isCorrespondent = user.role === "correspondent";
  const isEditor = user.role === "editor" || user.role === "managing_editor" || user.role === "super_admin";
  const isManagement = user.role === "managing_editor" || user.role === "super_admin";

  const userEmailLower = (user.email || "").toLowerCase().trim();

  // Correspondent specific assignments
  const visibleAssignments = assignments.filter((a) => {
    if (!isCorrespondent) return true;
    const asgEmail = (a.correspondentEmail || "").toLowerCase().trim();
    if (asgEmail && userEmailLower && asgEmail === userEmailLower) return true;
    if (a.correspondentId && (a.correspondentId === user.uid || a.correspondentId === userEmailLower)) return true;
    if (a.correspondentName && user.name && a.correspondentName.toLowerCase() === user.name.toLowerCase()) return true;
    return false;
  });

  const sortedAssignments = [...visibleAssignments].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  const pendingSubmissions = submissions.filter((s) => s.status === "pending_review");
  const pendingClaims = claims.filter((c) => c.status === "pending");
  const totalPendingPayout = pendingClaims.reduce((sum, c) => sum + c.totalAmountKES, 0);

  // Filter submissions based on user role
  const visibleSubmissions = submissions.filter((sub) => {
    if (isCorrespondent) {
      if (sub.correspondentId === user.uid || sub.correspondentId === userEmailLower) return true;
      if (sub.correspondentName && user.name && sub.correspondentName.toLowerCase() === user.name.toLowerCase()) return true;
      return false;
    }
    return true;
  });

  const sortedSubmissions = [...visibleSubmissions].sort((a, b) => {
    const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return timeB - timeA;
  });

  // Filter claims based on user role
  const visibleClaims = claims.filter((c) => {
    if (isCorrespondent) {
      if (c.correspondentId === user.uid || c.correspondentId === userEmailLower) return true;
      if (c.correspondentEmail && userEmailLower && c.correspondentEmail.toLowerCase() === userEmailLower) return true;
      if (c.correspondentName && user.name && c.correspondentName.toLowerCase() === user.name.toLowerCase()) return true;
      return false;
    }
    return true;
  });

  // Consolidated Pipeline of all stories
  interface UnifiedStory {
    id: string;
    subId?: string;
    itemType: "assignment" | "filing";
    title: string;
    correspondentName: string;
    correspondentEmail?: string;
    date: string;
    deadline?: string;
    platforms: Platform[];
    status: string;
    statusLabel: string;
    statusBadgeClass: string;
    payoutKES?: number;
    brief?: string;
    actionUrl: string;
    actionLabel: string;
  }

  const findMatchingSubmission = (asg: Assignment): Submission | undefined => {
    return sortedSubmissions.find((s) => {
      // 1. Direct ID matching
      if (s.assignmentId && (s.assignmentId === asg.id || s.assignmentId.toLowerCase() === asg.id.toLowerCase())) return true;
      if (s.id && s.id === asg.id) return true;
      
      // 2. Exact or substring title matching
      if (s.assignmentTitle && asg.title) {
        const sT = s.assignmentTitle.trim().toLowerCase();
        const aT = asg.title.trim().toLowerCase();
        if (sT === aT || sT.includes(aT) || aT.includes(sT)) return true;

        // Keyword overlap match
        const sWords = sT.split(/\s+/).filter((w) => w.length > 3);
        const aWords = aT.split(/\s+/).filter((w) => w.length > 3);
        const common = sWords.filter((w) => aWords.includes(w));
        if (common.length >= 2 || (common.length >= 1 && sWords.length <= 2)) return true;
      }

      // 3. Correspondent match
      if (s.correspondentName && asg.correspondentName && s.correspondentName.toLowerCase().trim() === asg.correspondentName.toLowerCase().trim()) {
        if (s.assignmentTitle && asg.title) {
          const sT = s.assignmentTitle.toLowerCase();
          const aT = asg.title.toLowerCase();
          if (sT.includes(aT) || aT.includes(sT)) return true;
        }
      }

      return false;
    });
  };

  const unifiedStories: UnifiedStory[] = [];
  const processedSubmissionIds = new Set<string>();

  // 1. Process all assignments first
  sortedAssignments.forEach((a) => {
    const matchSub = findMatchingSubmission(a);

    if (matchSub) {
      processedSubmissionIds.add(matchSub.id);
      const isApproved = matchSub.status === "approved" || a.status === "completed";
      const isRevision = matchSub.status === "revision_needed";
      const isDeclined = matchSub.status === "declined";

      let statusLabel = "Pending Desk Review";
      let statusBadgeClass = "bg-amber-500 text-white border-amber-500";
      let actionUrl = isCorrespondent ? `/submit?edit=${matchSub.id}` : "/editor/review";
      let actionLabel = isCorrespondent ? "Edit Filing" : "Review Filing";

      if (isApproved) {
        statusLabel = "Approved (Ready for Payout)";
        statusBadgeClass = "bg-brand-teal text-white border-brand-teal";
        actionUrl = isCorrespondent ? "/report" : "/editor/review";
        actionLabel = isCorrespondent ? "View Report" : "Review Details";
      } else if (isRevision) {
        statusLabel = "Revision Requested";
        statusBadgeClass = "bg-orange-600 text-white border-orange-600";
        actionUrl = isCorrespondent ? `/submit?edit=${matchSub.id}` : "/editor/review";
        actionLabel = isCorrespondent ? "Revise Story" : "Review Queue";
      } else if (isDeclined) {
        statusLabel = "Declined";
        statusBadgeClass = "bg-brand-red text-white border-brand-red";
        actionUrl = isCorrespondent ? "/report" : "/editor/review";
        actionLabel = "View Notes";
      }

      unifiedStories.push({
        id: a.id,
        subId: matchSub.id,
        itemType: "filing",
        title: matchSub.assignmentTitle || a.title,
        correspondentName: matchSub.correspondentName || a.correspondentName || "Correspondent",
        correspondentEmail: a.correspondentEmail,
        date: matchSub.submittedAt || a.createdAt || new Date().toISOString(),
        deadline: a.deadline,
        platforms: matchSub.publishedPlatforms && matchSub.publishedPlatforms.length > 0 ? matchSub.publishedPlatforms : a.targetPlatforms || [],
        status: matchSub.status,
        statusLabel,
        statusBadgeClass,
        payoutKES: matchSub.calculatedAmountKES,
        brief: a.brief,
        actionUrl,
        actionLabel,
      });
    } else {
      const isSubmitted = a.status === "submitted";
      const isCompleted = a.status === "completed";

      let statusLabel = "Assigned (Awaiting Filing)";
      let statusBadgeClass = "bg-blue-50 text-brand-navy border-blue-300";
      let actionUrl = isCorrespondent ? `/submit?asg=${a.id}` : "/editor/assign";
      let actionLabel = isCorrespondent ? "Submit Filing" : "View Brief";

      if (isCompleted) {
        statusLabel = "Approved (Completed)";
        statusBadgeClass = "bg-brand-teal text-white border-brand-teal";
      } else if (isSubmitted) {
        statusLabel = "Pending Desk Review";
        statusBadgeClass = "bg-amber-500 text-white border-amber-500";
        actionUrl = isCorrespondent ? `/submit?asg=${a.id}` : "/editor/review";
        actionLabel = isCorrespondent ? "Filing Lodged" : "Review Filing";
      }

      unifiedStories.push({
        id: a.id,
        itemType: "assignment",
        title: a.title,
        correspondentName: a.correspondentName || "Correspondent",
        correspondentEmail: a.correspondentEmail,
        date: a.createdAt || new Date().toISOString(),
        deadline: a.deadline,
        platforms: a.targetPlatforms || [],
        status: a.status,
        statusLabel,
        statusBadgeClass,
        brief: a.brief,
        actionUrl,
        actionLabel,
      });
    }
  });

  // 2. Add unlinked / direct pitch submissions
  sortedSubmissions.forEach((s) => {
    if (!processedSubmissionIds.has(s.id)) {
      const isApproved = s.status === "approved";
      const isRevision = s.status === "revision_needed";
      const isDeclined = s.status === "declined";

      let statusLabel = "Pending Desk Review";
      let statusBadgeClass = "bg-amber-500 text-white border-amber-500";
      let actionUrl = isCorrespondent ? `/submit?edit=${s.id}` : "/editor/review";
      let actionLabel = isCorrespondent ? "Edit Filing" : "Review Filing";

      if (isApproved) {
        statusLabel = "Approved (Ready for Payout)";
        statusBadgeClass = "bg-brand-teal text-white border-brand-teal";
        actionUrl = isCorrespondent ? "/report" : "/editor/review";
        actionLabel = isCorrespondent ? "View Report" : "Review Details";
      } else if (isRevision) {
        statusLabel = "Revision Requested";
        statusBadgeClass = "bg-orange-600 text-white border-orange-600";
        actionUrl = isCorrespondent ? `/submit?edit=${s.id}` : "/editor/review";
        actionLabel = isCorrespondent ? "Revise Story" : "Review Queue";
      } else if (isDeclined) {
        statusLabel = "Declined";
        statusBadgeClass = "bg-brand-red text-white border-brand-red";
        actionUrl = isCorrespondent ? "/report" : "/editor/review";
        actionLabel = "View Notes";
      }

      unifiedStories.push({
        id: s.id,
        subId: s.id,
        itemType: "filing",
        title: s.assignmentTitle,
        correspondentName: s.correspondentName,
        date: s.submittedAt,
        platforms: s.publishedPlatforms || [],
        status: s.status,
        statusLabel,
        statusBadgeClass,
        payoutKES: s.calculatedAmountKES,
        actionUrl,
        actionLabel,
      });
    }
  });

  unifiedStories.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Dashboard Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-black text-brand-navy tracking-tight">Editorial Overview & Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time story assignments, contributor filings, and claims tracking</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-white border border-gray-200 hover:border-brand-navy text-slate-700 font-bold rounded-xl shadow-xs transition text-xs flex items-center gap-1.5 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 text-brand-navy ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {isEditor && (
            <button
              onClick={() => setShowResetModal(true)}
              className="p-2.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 font-bold rounded-xl shadow-xs transition text-xs flex items-center gap-1.5 cursor-pointer"
              title="Delete all stories and start fresh"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline">Start Fresh</span>
            </button>
          )}

          <Link
            to={isCorrespondent ? "/submit" : "/editor/assign"}
            className="bg-brand-gold hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2.5 rounded-xl shadow transition text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            {isCorrespondent ? <UploadCloud className="w-4 h-4" /> : <FilePlus className="w-4 h-4" />}
            <span>{isCorrespondent ? "Submit Filing" : "New Story Assignment"}</span>
          </Link>
        </div>
      </div>

      {/* Action / Success Banner */}
      {pipelineFeedback && (
        <div className="p-4 bg-brand-teal text-white rounded-xl shadow text-sm font-semibold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{pipelineFeedback}</span>
          </div>
          <button onClick={() => setPipelineFeedback(null)} className="text-white hover:opacity-80 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Key Metrics Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={isCorrespondent ? "My Assignments" : "Active Correspondents"}
          value={isCorrespondent ? sortedAssignments.length : correspondents.length}
          sub={isCorrespondent ? "Commissioned story briefs" : "Registered field journalists"}
          icon={isCorrespondent ? <Clock className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
        />
        <StatCard
          title={isCorrespondent ? "My Story Filings" : "Story Assignments"}
          value={isCorrespondent ? sortedSubmissions.length : sortedAssignments.length}
          sub={isCorrespondent ? "Filed reports in portal" : "Dispatched editorial briefs"}
          icon={isCorrespondent ? <UploadCloud className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ActionCard
              to="/admin/rates"
              icon={<Settings className="w-6 h-6" />}
              title="Rate Card System Design"
              desc="Set and update base rates per platform (TV National, Regional, Radio, Web, Social) applied across KBC."
              tag="Rate Engine"
            />
            <ActionCard
              to="/report"
              icon={<FileText className="w-6 h-6" />}
              title="Payment Summaries & Reports"
              desc="Review all approved story filings, platform breakdowns, monthly claim statements, and export formal PDF invoices."
              tag="Financial Gate"
            />
            {user.role === "super_admin" && (
              <ActionCard
                to="/admin/users"
                icon={<Users className="w-6 h-6" />}
                title="User Administration & Roles"
                desc="Full system access: manage Super Admins, Managing Editors, Desk Editors, Correspondents, and Finance accounts."
                tag="Super Admin"
              />
            )}
          </div>
        )}
      </div>

      {/* Activity Table with Interactive Tabs for All Stories, Assignments & Filings */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Header with Mode Switcher */}
        <div className="bg-brand-navy text-white px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b-2 border-brand-gold">
          <div className="flex flex-wrap items-center gap-2">
            <Layers className="w-5 h-5 text-brand-gold hidden sm:inline" />
            <div className="flex flex-wrap bg-blue-950/80 p-1 rounded-xl border border-blue-800/60 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "all"
                    ? "bg-brand-gold text-slate-900 shadow-sm"
                    : "text-blue-200 hover:text-white hover:bg-blue-900/40"
                }`}
              >
                <Newspaper className="w-3.5 h-3.5" />
                <span>All Stories & Pipeline ({unifiedStories.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("assignments")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "assignments"
                    ? "bg-brand-gold text-slate-900 shadow-sm"
                    : "text-blue-200 hover:text-white hover:bg-blue-900/40"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Story Assignments ({sortedAssignments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("filings")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "filings"
                    ? "bg-brand-gold text-slate-900 shadow-sm"
                    : "text-blue-200 hover:text-white hover:bg-blue-900/40"
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Recent Story Filings ({sortedSubmissions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("claims")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "claims"
                    ? "bg-brand-gold text-slate-900 shadow-sm"
                    : "text-blue-200 hover:text-white hover:bg-blue-900/40"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Payment Claims ({visibleClaims.length})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto text-xs text-blue-200 font-semibold">
            <span>
              {activeTab === "all" && `Live feed of ${unifiedStories.length} stories across commissioning & filing`}
              {activeTab === "assignments" && `Showing ${sortedAssignments.length} Commissioned Story Briefs`}
              {activeTab === "filings" && `Showing ${sortedSubmissions.length} Filed Stories & Reviews`}
              {activeTab === "claims" && `Showing ${visibleClaims.length} Payment Claims (${pendingClaims.length} Pending Finance)`}
            </span>
          </div>
        </div>

        {/* Tab 1: All Stories Pipeline Consolidated Table */}
        {activeTab === "all" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-byline">
              <thead>
                <tr className="bg-gray-100 text-xs font-bold uppercase tracking-wider text-slate-700 border-b">
                  <th className="p-4">Type & Headline</th>
                  <th className="p-4">Correspondent</th>
                  <th className="p-4">Stage & Status</th>
                  <th className="p-4">Target / Aired Platforms</th>
                  <th className="p-4">Date & Activity</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs sm:text-sm">
                {unifiedStories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No stories or assignments found. Get started by dispatching a story assignment or filing a report.
                    </td>
                  </tr>
                ) : (
                  unifiedStories.map((item) => (
                    <tr key={`${item.itemType}-${item.id}`} className="hover:bg-blue-50/50 transition">
                      <td className="p-4 font-semibold text-slate-900 max-w-xs sm:max-w-md">
                        <div className="flex items-center gap-2 mb-1">
                          {item.itemType === "assignment" ? (
                            <span className="bg-blue-100 text-brand-navy border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Assignment
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Filing
                            </span>
                          )}
                          <span className="text-[11px] text-gray-500 font-mono font-bold">{item.id}</span>
                        </div>
                        <div className="text-brand-navy font-bold text-sm">{item.title}</div>
                        {item.brief && (
                          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5 font-normal">
                            {item.brief}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800 block">{item.correspondentName}</span>
                        {item.correspondentEmail && (
                          <span className="text-[11px] text-gray-400 block truncate max-w-[160px]">{item.correspondentEmail}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`border text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${item.statusBadgeClass}`}>
                          {item.itemType === "assignment" ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          <span>{item.statusLabel}</span>
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {item.platforms && item.platforms.length > 0 ? (
                            item.platforms.map((p) => (
                              <span key={p} className="bg-blue-100 text-brand-navy text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                                {p.replace("_", " ").toUpperCase()}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs italic">General</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-700">
                        <div className="text-xs font-bold text-slate-900">
                          {new Date(item.date).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {item.deadline && (
                          <div className="text-[10px] text-brand-red font-semibold mt-0.5">
                            Due: {new Date(item.deadline).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Link
                            to={item.actionUrl}
                            className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 bg-brand-gold hover:bg-yellow-500 px-3 py-1.5 rounded-lg shadow-xs transition"
                          >
                            {item.actionLabel.includes("Edit") && <Edit3 className="w-3.5 h-3.5" />}
                            <span>{item.actionLabel}</span>
                            {!item.actionLabel.includes("Edit") && <ArrowRight className="w-3.5 h-3.5" />}
                          </Link>

                          {isCorrespondent && (item.status === "pending_review" || item.status === "revision_needed") && (
                            <button
                              type="button"
                              onClick={() => setWithdrawTarget({
                                subId: item.subId || item.id,
                                asgId: item.itemType === "assignment" ? item.id : undefined,
                                title: item.title
                              })}
                              className="p-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition cursor-pointer"
                              title="Delete / withdraw this pending filing"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Story Assignments Table */}
        {activeTab === "assignments" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-byline">
              <thead>
                <tr className="bg-gray-100 text-xs font-bold uppercase tracking-wider text-slate-700 border-b">
                  <th className="p-4">Assignment ID & Headline</th>
                  <th className="p-4">Assigned Correspondent</th>
                  <th className="p-4">Target Platforms</th>
                  <th className="p-4">Filing Deadline</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs sm:text-sm">
                {sortedAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      {isCorrespondent
                        ? "No story assignments commissioned for you yet."
                        : "No story assignments created yet. Click 'New Story Assignment' to dispatch your first brief."
                      }
                    </td>
                  </tr>
                ) : (
                  sortedAssignments.map((asg) => {
                    const matchSub = findMatchingSubmission(asg);
                    const isPending = asg.status === "submitted" || matchSub?.status === "pending_review";
                    const isCompleted = asg.status === "completed" || matchSub?.status === "approved";
                    const isRevision = matchSub?.status === "revision_needed";
                    const isDeclined = matchSub?.status === "declined";

                    return (
                      <tr key={asg.id} className="hover:bg-blue-50/50 transition">
                        <td className="p-4 font-semibold text-slate-900 max-w-xs sm:max-w-md">
                          <div className="text-brand-navy font-bold text-sm">{asg.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-gray-500 font-mono font-bold bg-gray-100 px-1.5 py-0.5 rounded">
                              {asg.id}
                            </span>
                            <span className="text-[11px] text-gray-400">Assigned by {asg.assignedBy}</span>
                          </div>
                          {asg.brief && (
                            <p className="text-xs text-gray-500 line-clamp-1 mt-1 font-normal">
                              {asg.brief}
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-800 block">{asg.correspondentName || "Correspondent"}</span>
                          {asg.correspondentEmail && (
                            <span className="text-[11px] text-gray-400 block truncate max-w-[180px]">{asg.correspondentEmail}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {asg.targetPlatforms && asg.targetPlatforms.length > 0 ? (
                              asg.targetPlatforms.map((p) => (
                                <span key={p} className="bg-blue-100 text-brand-navy text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                                  {p.replace("_", " ").toUpperCase()}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs italic">General</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-gray-700">
                          <div className="text-xs font-bold text-slate-900">
                            {new Date(asg.deadline).toLocaleDateString()}
                          </div>
                          <div className="text-[11px] text-brand-red font-semibold">
                            {new Date(asg.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="p-4">
                          {isCompleted ? (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed
                            </span>
                          ) : isRevision ? (
                            <span className="bg-orange-600 text-white text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                              Revision Needed
                            </span>
                          ) : isDeclined ? (
                            <span className="bg-brand-red text-white text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                              Declined
                            </span>
                          ) : isPending ? (
                            <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-white" /> Pending Desk Review
                            </span>
                          ) : (
                            <span className="bg-blue-50 text-brand-navy border border-blue-300 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-blue-600" /> Assigned
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {isCorrespondent ? (
                              <>
                                <Link
                                  to={isCompleted ? "/report" : isPending || isRevision ? `/submit?edit=${matchSub?.id || ""}` : `/submit?asg=${asg.id}`}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 bg-brand-gold hover:bg-yellow-500 px-3 py-1.5 rounded-lg shadow-xs transition"
                                >
                                  {(isPending || isRevision) && <Edit3 className="w-3.5 h-3.5" />}
                                  <span>{isCompleted ? "View Report" : isRevision ? "Revise Story" : isPending ? "Edit Filing" : "Submit Filing"}</span>
                                  {!isPending && !isRevision && <ArrowRight className="w-3.5 h-3.5" />}
                                </Link>

                                {(isPending || isRevision) && matchSub && (
                                  <button
                                    type="button"
                                    onClick={() => setWithdrawTarget({
                                      subId: matchSub.id,
                                      asgId: asg.id,
                                      title: asg.title
                                    })}
                                    className="p-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition cursor-pointer"
                                    title="Delete / withdraw this pending filing"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <Link
                                  to="/editor/review"
                                  className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition ${
                                    isPending
                                      ? "text-slate-900 bg-brand-gold hover:bg-yellow-500"
                                      : "text-brand-navy hover:text-blue-900 hover:underline"
                                  }`}
                                >
                                  <span>{isPending ? "Review Filing" : "Review Queue"}</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (window.confirm(`Delete assignment [${asg.id}] "${asg.title}"?`)) {
                                      const res = await deleteAssignment(asg.id);
                                      setPipelineFeedback(res.message);
                                      await fetchData();
                                    }
                                  }}
                                  className="p-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition cursor-pointer"
                                  title="Delete this assignment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Story Filings Table */}
        {activeTab === "filings" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-byline">
              <thead>
                <tr className="bg-gray-100 text-xs font-bold uppercase tracking-wider text-slate-700 border-b">
                  <th className="p-4">Filing ID & Headline</th>
                  <th className="p-4">Correspondent</th>
                  <th className="p-4">Submitted Date</th>
                  <th className="p-4">Editorial Status</th>
                  <th className="p-4">Aired Platforms</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs sm:text-sm">
                {sortedSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      {isCorrespondent 
                        ? "No story filings submitted by you yet. File a story from an assigned brief to get started."
                        : "No story filings received yet. When correspondents file their stories, they will appear here."
                      }
                    </td>
                  </tr>
                ) : (
                  sortedSubmissions.map((sub) => (
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
                      <td className="p-4 font-bold text-brand-gold">
                        {sub.calculatedAmountKES > 0 ? `KES ${sub.calculatedAmountKES.toLocaleString()}` : "KES 0"}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {isCorrespondent ? (
                            <>
                              {sub.status === "approved" ? (
                                <Link
                                  to="/report"
                                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 bg-brand-gold hover:bg-yellow-500 px-3 py-1.5 rounded-lg shadow-xs transition"
                                >
                                  <span>View Report</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              ) : (
                                <>
                                  <Link
                                    to={`/submit?edit=${sub.id}`}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 bg-brand-gold hover:bg-yellow-500 px-2.5 py-1.5 rounded-lg shadow-xs transition"
                                    title="Edit story filing"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => setWithdrawTarget({
                                      subId: sub.id,
                                      asgId: sub.assignmentId,
                                      title: sub.assignmentTitle
                                    })}
                                    className="p-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition cursor-pointer"
                                    title="Delete / withdraw this pending filing"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </>
                          ) : (
                            <Link
                              to="/editor/review"
                              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition text-slate-900 bg-brand-gold hover:bg-yellow-500"
                            >
                              <span>{sub.status === "pending_review" ? "Review Filing" : "Review Queue"}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Payment Claims Table */}
        {activeTab === "claims" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-byline">
              <thead>
                <tr className="bg-gray-100 text-xs font-bold uppercase tracking-wider text-slate-700 border-b">
                  <th className="p-4">Claim Ref & Period</th>
                  <th className="p-4">Correspondent & Bank Details</th>
                  <th className="p-4">Included Stories</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Payment Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs sm:text-sm">
                {visibleClaims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      {isCorrespondent
                        ? "No payment claims lodged yet. Go to 'Monthly Stories Report' to submit your claim."
                        : "No payment claims lodged in the system yet."
                      }
                    </td>
                  </tr>
                ) : (
                  visibleClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-blue-50/50 transition">
                      <td className="p-4 font-semibold text-slate-900">
                        <div className="text-brand-navy font-bold font-mono text-sm">{claim.id}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{claim.month}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">Lodged: {new Date(claim.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800 block">{claim.correspondentName}</span>
                        <span className="text-xs text-gray-500 block">{claim.bankDetails}</span>
                        {claim.correspondentEmail && (
                          <span className="text-[11px] text-gray-400 block">{claim.correspondentEmail}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="bg-blue-100 text-brand-navy text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200 inline-block">
                          {claim.submissions ? claim.submissions.length : (claim.submissionIds ? claim.submissionIds.length : 0)} Verified Stories
                        </span>
                      </td>
                      <td className="p-4 font-black text-brand-gold text-sm">
                        KES {claim.totalAmountKES.toLocaleString()}
                      </td>
                      <td className="p-4">
                        {claim.status === "paid" ? (
                          <div>
                            <span className="bg-brand-teal text-white text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Paid & Settled
                            </span>
                            {claim.paidAt && (
                              <div className="text-[10px] text-gray-500 mt-1">
                                Paid: {new Date(claim.paidAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-white" /> Pending Finance Payment
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <Link
                            to="/report"
                            className="inline-flex items-center gap-1 text-xs font-bold text-brand-navy hover:text-blue-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg shadow-xs transition"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Statement / PDF</span>
                          </Link>

                          {claim.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => handleMarkClaimAsPaid(claim.id)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-white bg-brand-teal hover:bg-emerald-800 px-3 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
                              title="Confirm payment received from Finance"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark as Paid</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reset All Stories Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-rose-700 font-black text-base">
                <AlertTriangle className="w-5 h-5" />
                <span>Delete All Stories & Start Fresh?</span>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-gray-600 leading-relaxed">
              <p>
                This action will <strong className="text-rose-900">permanently delete all story assignments, filed submissions, and payment claims</strong> from both Firestore and local storage.
              </p>
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl">
                <p className="font-bold">What is preserved:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                  <li>Registered user and correspondent accounts</li>
                  <li>Configured platform rate cards</li>
                  <li>System settings and user credentials</li>
                </ul>
              </div>

              {resetFeedback && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-center">
                  {resetFeedback}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetAllStories}
                disabled={isResetting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting All Stories...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Wipe All Stories</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correspondent Story Filing Withdraw Modal */}
      {withdrawTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-rose-700 font-black text-base">
                <AlertTriangle className="w-5 h-5" />
                <span>Withdraw Story Filing?</span>
              </div>
              <button
                onClick={() => setWithdrawTarget(null)}
                disabled={isWithdrawing}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-gray-600 leading-relaxed">
              <p>
                Are you sure you want to delete and withdraw filing <strong className="text-slate-900">[{withdrawTarget.subId}] "{withdrawTarget.title}"</strong>?
              </p>
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl">
                <p className="font-bold">What happens:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                  <li>The draft submission is deleted from the editor's review queue.</li>
                  <li>The story brief returns to <strong>Assigned (Awaiting Filing)</strong> so you can re-file when ready.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setWithdrawTarget(null)}
                disabled={isWithdrawing}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteWithdraw}
                disabled={isWithdrawing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isWithdrawing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Filing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Filing</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}