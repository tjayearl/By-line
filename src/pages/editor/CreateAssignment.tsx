import { useState, useEffect } from "react";
import { FilePlus, Send, RefreshCw, CheckCircle2, AlertCircle, Trash2, AlertTriangle, X } from "lucide-react";
import { doc, getDocs, collection, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { loadStoredData, saveStoredData, INITIAL_ASSIGNMENTS, INITIAL_CORRESPONDENTS, deleteAssignment } from "../../lib/dataStore";
import { sendAssignmentCommissionEmail } from "../../lib/emailService";
import type { Assignment, Correspondent, Platform } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";

const PLATFORM_OPTIONS: { key: Platform; label: string; icon: string }[] = [
  { key: "tv_national", label: "TV Package (National)", icon: "📺" },
  { key: "tv_regional", label: "TV Package (Regional/Vernacular)", icon: "📡" },
  { key: "radio_national", label: "Radio Clip (National)", icon: "📻" },
  { key: "radio_vernacular", label: "Radio Clip (Vernacular)", icon: "🎙️" },
  { key: "website", label: "Website Article", icon: "🌐" },
  { key: "social", label: "Social Media Post", icon: "📱" },
];

export default function CreateAssignment() {
  const { user } = useAuth();

  // Only Editors and Super Admin can create assignments
  if (!user || !["editor", "managing_editor", "super_admin"].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  const [correspondents, setCorrespondents] = useState<Correspondent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: "",
    brief: "",
    correspondentId: "",
    deadline: "",
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
    "tv_national",
    "website",
  ]);

  const loadAllData = async () => {
    try {
      // 1. Load Correspondents
      const corrMap = new Map<string, Correspondent>();
      INITIAL_CORRESPONDENTS.forEach((c) => corrMap.set(c.id, c));
      const localCorrs = loadStoredData<Correspondent[]>("byline_correspondents_v1", []);
      localCorrs.forEach((c) => corrMap.set(c.id, c));

      try {
        const uSnap = await getDocs(collection(db, "users"));
        uSnap.forEach((d) => {
          const u = d.data() as any;
          if (u.role === "correspondent" && u.email) {
            corrMap.set(d.id, {
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
        console.warn("Firestore users lookup notice:", fsErr);
      }

      const mergedCorrs = Array.from(corrMap.values());
      setCorrespondents(mergedCorrs);
      if (mergedCorrs.length > 0 && !form.correspondentId) {
        setForm((prev) => ({ ...prev, correspondentId: mergedCorrs[0].id }));
      }

      // 2. Load Assignments (Firestore authoritative)
      let mergedAsg: Assignment[] = [];
      try {
        const asgSnap = await getDocs(collection(db, "assignments"));
        const fsAsgs: Assignment[] = [];
        asgSnap.forEach((d) => {
          const a = d.data() as Assignment;
          if (a && (a.id || d.id)) {
            fsAsgs.push({ ...a, id: a.id || d.id });
          }
        });
        mergedAsg = fsAsgs;
        saveStoredData("byline_assignments_v1", fsAsgs);
      } catch (fsAsgErr) {
        console.warn("Firestore assignments lookup notice:", fsAsgErr);
        mergedAsg = loadStoredData<Assignment[]>("byline_assignments_v1", INITIAL_ASSIGNMENTS);
      }
      setAssignments(mergedAsg);
    } catch (err) {
      console.error("Error loading assignment data:", err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const togglePlatform = (p: Platform) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((item) => item !== p));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.correspondentId) return;

    setLoading(true);
    setMessage(null);

    try {
      const assignedCorr = correspondents.find((c) => c.id === form.correspondentId);
      const existingNums = assignments
        .map((a) => {
          const m = a.id.match(/\d+$/);
          return m ? parseInt(m[0], 10) : 0;
        })
        .filter((n) => !isNaN(n));
      const nextNum = (existingNums.length > 0 ? Math.max(...existingNums) : assignments.length) + 1;
      const asgId = `ASG-2026-${String(nextNum).padStart(3, "0")}`;

      const newAssignment: Assignment = {
        id: asgId,
        title: form.title.trim(),
        brief: form.brief.trim(),
        targetPlatforms: selectedPlatforms,
        deadline: form.deadline || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
        correspondentId: form.correspondentId,
        correspondentName: assignedCorr ? assignedCorr.name : "Assigned Correspondent",
        correspondentEmail: assignedCorr ? assignedCorr.email : "",
        assignedBy: user?.name || user?.email || "Desk Editor",
        createdAt: new Date().toISOString(),
        status: "assigned",
      };

      // 1. Save to Firestore
      try {
        await setDoc(doc(db, "assignments", asgId), newAssignment);
      } catch (fsSaveErr) {
        console.warn("Firestore assignment save notice:", fsSaveErr);
      }

      // 2. Save to local storage
      const updated = [newAssignment, ...assignments.filter((a) => a.id !== asgId)];
      setAssignments(updated);
      saveStoredData("byline_assignments_v1", updated);

      // 3. Dispatch Email Alert to Correspondent
      if (assignedCorr?.email) {
        await sendAssignmentCommissionEmail({
          correspondentName: newAssignment.correspondentName || "Correspondent",
          correspondentEmail: assignedCorr.email,
          assignmentId: newAssignment.id,
          title: newAssignment.title,
          brief: newAssignment.brief,
          targetPlatforms: newAssignment.targetPlatforms,
          deadline: newAssignment.deadline,
          assignedBy: newAssignment.assignedBy,
        });
      }

      setMessage({
        type: "success",
        text: `Assignment "${newAssignment.title}" successfully dispatched to ${newAssignment.correspondentName} (${assignedCorr?.email || "Email"}). Notification email sent!`,
      });

      setForm({ title: "", brief: "", deadline: "", correspondentId: correspondents[0]?.id || "" });
      setSelectedPlatforms(["tv_national"]);
    } catch (err: any) {
      console.error("Assignment dispatch error:", err);
      setMessage({ type: "error", text: err?.message || "Failed to dispatch assignment." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow-md border-b-4 border-brand-gold flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-gold font-semibold text-xs uppercase tracking-wider">
            <FilePlus className="w-4 h-4" /> US-04 Commissioning Workflow
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Create Story Assignment</h1>
          <p className="text-xs text-blue-200 mt-1">
            Dispatch formal story assignments to registered field correspondents with platform targets.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Assignment Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-brand-navy mb-4 flex items-center gap-2 border-b pb-2">
            <Send className="w-5 h-5 text-brand-gold" />
            <span>Story Commission Details</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assign To Correspondent</label>
              <select
                value={form.correspondentId}
                onChange={(e) => setForm({ ...form, correspondentId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy bg-white font-medium"
                required
              >
                {correspondents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.county || "Correspondent"}) — {c.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Story Title / Headline</label>
              <input
                placeholder="e.g. Nakuru Pyrethrum Farmers Revival Initiative"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Editorial Brief & Angle</label>
              <textarea
                placeholder="Detailed coverage instructions, required interviews, soundbites, or key focus points..."
                value={form.brief}
                onChange={(e) => setForm({ ...form, brief: e.target.value })}
                rows={4}
                className="w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Target Platform(s)</label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORM_OPTIONS.map((p) => {
                  const isSelected = selectedPlatforms.includes(p.key);
                  return (
                    <button
                      type="button"
                      key={p.key}
                      onClick={() => togglePlatform(p.key)}
                      className={`p-2 rounded-lg border text-left text-xs font-semibold flex items-center gap-1.5 transition ${
                        isSelected
                          ? "bg-brand-navy text-white border-brand-navy shadow-sm"
                          : "bg-gray-50 text-slate-700 hover:bg-gray-100"
                      }`}
                    >
                      <span>{p.icon}</span>
                      <span className="truncate">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Submission Deadline</label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-navy hover:bg-blue-900 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin text-brand-gold" /> : <Send className="w-4 h-4 text-brand-gold" />}
              <span>{loading ? "Dispatching..." : "Dispatch Story Assignment"}</span>
            </button>
          </form>

          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-brand-teal text-white"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}
        </div>

        {/* Dispatched Assignments List Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-brand-gold">
            <h2 className="font-bold text-lg">Dispatched Assignments ({assignments.length})</h2>
            <span className="text-xs text-brand-gold font-semibold">Live Commissions</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse table-byline">
              <thead>
                <tr className="bg-gray-100 text-xs font-bold uppercase tracking-wider text-slate-700 border-b">
                  <th className="p-3.5">ID & Title</th>
                  <th className="p-3.5">Assigned Reporter</th>
                  <th className="p-3.5">Target Platforms</th>
                  <th className="p-3.5">Deadline</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No dispatched assignments yet. Use the form on the left to commission your first story.
                    </td>
                  </tr>
                ) : (
                  assignments.map((asg) => (
                    <tr key={asg.id} className="hover:bg-blue-50/40 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-brand-navy text-sm">{asg.title}</div>
                        <div className="text-gray-500 font-mono text-[11px] mt-0.5">{asg.id}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800">{asg.correspondentName}</span>
                        {asg.correspondentEmail && (
                          <div className="text-[10px] text-gray-400">{asg.correspondentEmail}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {asg.targetPlatforms?.map((p) => (
                            <span key={p} className="bg-blue-100 text-brand-navy text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                              {p.replace("_", " ").toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-gray-600 font-medium">
                        {new Date(asg.deadline).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        {asg.status === "completed" && (
                          <span className="bg-brand-teal text-white text-[10px] font-bold px-2 py-1 rounded-full">
                            Completed
                          </span>
                        )}
                        {asg.status === "submitted" && (
                          <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                            Filed
                          </span>
                        )}
                        {asg.status === "assigned" && (
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                            Assigned
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(asg)}
                          className="p-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition cursor-pointer"
                          title="Delete this assignment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Assignment Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-rose-700 font-black text-base">
                <AlertTriangle className="w-5 h-5" />
                <span>Delete Assignment?</span>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-gray-600 leading-relaxed">
              <p>
                Are you sure you want to permanently delete assignment <strong className="text-slate-900">[{deleteTarget.id}] "{deleteTarget.title}"</strong>?
              </p>
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl">
                <p className="font-bold">What happens:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                  <li>The assignment will be removed from the newsroom pipeline and correspondent portal.</li>
                  <li>Any unapproved draft submissions linked to it will also be deleted.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!deleteTarget) return;
                  setIsDeleting(true);
                  try {
                    await deleteAssignment(deleteTarget.id);
                    await loadAllData();
                  } finally {
                    setIsDeleting(false);
                    setDeleteTarget(null);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Assignment</span>
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
