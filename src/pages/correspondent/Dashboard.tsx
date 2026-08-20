import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, UploadCloud, ArrowRight, RefreshCw, FileText, CheckCircle2, AlertCircle, Edit3, Trash2, Lock, AlertTriangle, X } from "lucide-react";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { loadStoredData, saveStoredData, INITIAL_ASSIGNMENTS, INITIAL_SUBMISSIONS, withdrawStoryFiling } from "../../lib/dataStore";
import { useAuth } from "../../context/AuthContext";
import type { Assignment, Submission } from "../../types";

export default function CorrespondentDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawTarget, setWithdrawTarget] = useState<{ subId: string; asgId: string; title: string } | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      // 1. Assignments (merge localStorage and Firestore)
      const localAsgs = loadStoredData<Assignment[]>("byline_assignments_v1", INITIAL_ASSIGNMENTS);
      const asgMap = new Map<string, Assignment>();
      localAsgs.forEach((a) => { if (a && a.id) asgMap.set(a.id, a); });
      try {
        const snap = await getDocs(collection(db, "assignments"));
        snap.forEach((d) => {
          const data = d.data() as Assignment;
          if (data && (data.id || d.id)) {
            const id = data.id || d.id;
            const existing = asgMap.get(id);
            asgMap.set(id, { ...existing, ...data, id });
          }
        });
      } catch (fsErr) {
        console.warn("Firestore assignments fetch notice:", fsErr);
      }
      const allAsg = Array.from(asgMap.values());
      saveStoredData("byline_assignments_v1", allAsg);
      setAssignments(allAsg);

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
        console.warn("Firestore submissions fetch notice:", fsErr);
      }
      const allSubs = Array.from(subMap.values());
      saveStoredData("byline_submissions_v1", allSubs);
      setSubmissions(allSubs);
    } catch (err) {
      console.error("Error loading assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();

    const handleUpdate = () => {
      fetchAssignments();
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("byline:data_updated", handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("byline:data_updated", handleUpdate);
    };
  }, []);

  const handleExecuteWithdraw = async () => {
    if (!withdrawTarget) return;
    setIsWithdrawing(true);
    try {
      const res = await withdrawStoryFiling(withdrawTarget.subId, withdrawTarget.asgId);
      setActionMessage(res.message);
      await fetchAssignments();
    } catch (err: any) {
      setActionMessage(err?.message || "Failed to withdraw filing");
    } finally {
      setIsWithdrawing(false);
      setWithdrawTarget(null);
    }
  };

  const myAssignments = assignments.filter((a) => {
    if (!user || user.role !== "correspondent") return true;

    const userEmail = (user.email || "").toLowerCase().trim();
    const asgEmail = (a.correspondentEmail || "").toLowerCase().trim();

    if (asgEmail && userEmail && asgEmail === userEmail) return true;
    if (a.correspondentId && (a.correspondentId === user.uid || a.correspondentId === userEmail)) return true;
    if (a.correspondentName && user.name && a.correspondentName.toLowerCase() === user.name.toLowerCase()) return true;

    return false;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow-md border-b-4 border-brand-gold flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-gold font-semibold text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4" /> US-05 Field Reporter Assignments Portal
          </div>
          <h1 className="text-2xl font-black text-white mt-1">My Assigned Stories</h1>
          <p className="text-xs text-blue-200 mt-1">
            Review commissioned story briefs, deadlines, and target platforms assigned to you.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAssignments}
            className="p-2.5 bg-blue-900/60 hover:bg-blue-800 text-white rounded-xl transition cursor-pointer text-xs flex items-center gap-1.5"
            title="Refresh Assignments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            to="/submit"
            className="bg-brand-gold hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2.5 rounded-xl shadow text-xs sm:text-sm flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>File Story Submission</span>
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-brand-teal text-white rounded-xl shadow text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-white hover:opacity-80 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Assignments List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-brand-gold">
          <h2 className="font-bold text-lg">Commissioned Story Assignments ({myAssignments.length})</h2>
          <span className="text-xs text-brand-gold font-semibold">Field Assignments</span>
        </div>

        <div className="divide-y">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-brand-navy" />
              <span className="text-xs font-semibold">Loading your assignments...</span>
            </div>
          ) : myAssignments.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-full text-gray-400">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">No Commissioned Stories Yet</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  When the Central News Desk or your Desk Editor assigns you a story with platform targets and deadlines, it will appear here instantly.
                </p>
              </div>
            </div>
          ) : (
            myAssignments.map((asg) => {
              const matchSub = submissions.find(
                (s) => s.assignmentId === asg.id || (s.assignmentTitle && asg.title && s.assignmentTitle.toLowerCase().trim() === asg.title.toLowerCase().trim())
              );
              const isPending = asg.status === "submitted" || matchSub?.status === "pending_review";
              const isCompleted = asg.status === "completed" || matchSub?.status === "approved";
              const isRevision = matchSub?.status === "revision_needed";

              return (
                <div key={asg.id} className="p-6 hover:bg-blue-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-brand-navy text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                        {asg.id}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">Assigned by: {asg.assignedBy}</span>
                      {isCompleted ? (
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved for Broadcast
                        </span>
                      ) : isRevision ? (
                        <span className="bg-orange-100 text-orange-900 border border-orange-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-orange-600" /> Revision Needed
                        </span>
                      ) : isPending ? (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" /> Pending Desk Review
                        </span>
                      ) : (
                        <span className="bg-blue-100 text-brand-navy border border-blue-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-600" /> Assigned (Awaiting Filing)
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">{asg.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed bg-brand-offwhite p-3 rounded-xl border">
                      {asg.brief}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs font-bold text-slate-700">Target Platforms:</span>
                      {asg.targetPlatforms?.map((p) => (
                        <span key={p} className="bg-blue-100 text-brand-navy text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                          {p.replace("_", " ").toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Filing Deadline</span>
                      <span className="text-xs font-bold text-brand-red">
                        {new Date(asg.deadline).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <Link
                          to="/report"
                          className="bg-brand-teal text-white hover:bg-emerald-800 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>View Report</span>
                        </Link>
                      ) : matchSub ? (
                        <>
                          <Link
                            to={`/submit?edit=${matchSub.id}`}
                            className="bg-brand-gold hover:bg-yellow-500 text-slate-900 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition"
                            title="Edit this filed draft"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-900" />
                            <span>Edit Filing</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setWithdrawTarget({ subId: matchSub.id, asgId: asg.id, title: asg.title })}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition cursor-pointer"
                            title="Withdraw filing and restore assignment to unfiled"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Withdraw</span>
                          </button>
                        </>
                      ) : (
                        <Link
                          to={`/submit?asg=${asg.id}`}
                          className="bg-brand-navy hover:bg-blue-900 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition"
                        >
                          <span>Submit Filing</span>
                          <ArrowRight className="w-3.5 h-3.5 text-brand-gold" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Withdraw Confirmation Modal */}
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
                Are you sure you want to withdraw the submission for <strong className="text-slate-900">"{withdrawTarget.title}"</strong>?
              </p>
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl">
                <p className="font-bold">What happens next:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                  <li>The draft filing and attached media will be deleted from the review queue.</li>
                  <li>The assignment will be restored to <strong>Assigned (Awaiting Filing)</strong> so you can re-file when ready.</li>
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
                    <span>Withdrawing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Withdraw Filing</span>
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
