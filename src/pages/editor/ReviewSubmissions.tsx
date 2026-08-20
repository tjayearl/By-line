import { useState, useEffect } from "react";
import { 
  ClipboardCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Tv, 
  Radio, 
  Globe, 
  Sparkles,
  Music,
  Video,
  Image as ImageIcon,
  Paperclip,
  ExternalLink,
  RefreshCw,
  Search,
  User as UserIcon,
  Download,
  FileText,
  Clock
} from "lucide-react";
import { doc, getDocs, collection, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import MediaPreviewModal from "../../components/MediaPreviewModal";
import { openMediaSafely, downloadMediaSafely, isPdfFile } from "../../lib/mediaHelper";
import {
  loadStoredData, saveStoredData, INITIAL_SUBMISSIONS, DEFAULT_RATES,
  INITIAL_CORRESPONDENTS, INITIAL_ASSIGNMENTS,
  calculatePaymentForPlatforms
} from "../../lib/dataStore";
import { sendEditorialReviewDecisionEmail } from "../../lib/emailService";
import type { Assignment, Correspondent, MediaFile, Platform, RateCardEntry, Submission } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";

const PLATFORMS_LIST: { key: Platform; label: string }[] = [
  { key: "tv_national", label: "TV Package (National)" },
  { key: "tv_regional", label: "TV Package (Regional/Vernacular)" },
  { key: "radio_national", label: "Radio Clip (National)" },
  { key: "radio_vernacular", label: "Radio Clip (Vernacular)" },
  { key: "website", label: "Website Article" },
  { key: "social", label: "Social Media Post" },
];

export default function ReviewSubmissions() {
  const { user } = useAuth();

  // Check if user is authorized to access this page at all
  if (!user || !["super_admin", "managing_editor", "editor"].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Determine if user is Managing Editor (limited access)
  const isManagingEditor = user.role === "managing_editor";

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [correspondents, setCorrespondents] = useState<Correspondent[]>([]);
  const [rates, setRates] = useState<RateCardEntry[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [selectedPublishedPlatforms, setSelectedPublishedPlatforms] = useState<Platform[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending_review" | "approved" | "revision_needed" | "declined">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewModalFile, setPreviewModalFile] = useState<MediaFile | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load Submissions (Firestore authoritative)
      let allSubs: Submission[] = [];
      try {
        const snap = await getDocs(collection(db, "submissions"));
        const fsSubs: Submission[] = [];
        snap.forEach((d) => {
          const s = d.data() as Submission;
          if (s && (s.id || d.id)) {
            fsSubs.push({ ...s, id: s.id || d.id });
          }
        });
        allSubs = fsSubs;
        saveStoredData("byline_submissions_v1", fsSubs);
      } catch (fsErr) {
        console.warn("Firestore submissions lookup notice:", fsErr);
        allSubs = loadStoredData<Submission[]>("byline_submissions_v1", INITIAL_SUBMISSIONS);
      }

      allSubs.sort((a, b) => {
        const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return timeB - timeA;
      });

      setSubmissions(allSubs);

      // 2. Load Rates
      const loadedRates = loadStoredData("byline_rates_v1", DEFAULT_RATES);
      setRates(loadedRates);

      // 3. Load Correspondents for contact & email lookup
      const corrMap = new Map<string, Correspondent>();
      INITIAL_CORRESPONDENTS.forEach((c) => corrMap.set(c.id, c));
      const localCorrs = loadStoredData<Correspondent[]>("byline_correspondents_v1", []);
      localCorrs.forEach((c) => corrMap.set(c.id, c));

      try {
        const uSnap = await getDocs(collection(db, "users"));
        uSnap.forEach((d) => {
          const u = d.data() as any;
          if (u.role === "correspondent") {
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
      setCorrespondents(Array.from(corrMap.values()));

      // Select default submission if none selected
      if (allSubs.length > 0) {
        setSelectedSub((prev) => {
          if (prev) {
            const found = allSubs.find((s) => s.id === prev.id);
            if (found) return found;
          }
          const pending = allSubs.find((s) => s.status === "pending_review");
          const target = pending || allSubs[0];
          setSelectedPublishedPlatforms(target.publishedPlatforms || []);
          setFeedbackInput(target.editorialFeedback || "");
          return target;
        });
      }
    } catch (err) {
      console.error("Error loading submissions for review:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("byline:data_updated", handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("byline:data_updated", handleUpdate);
    };
  }, []);

  const selectSubmission = (sub: Submission) => {
    setSelectedSub(sub);
    setSelectedPublishedPlatforms(sub.publishedPlatforms || []);
    setFeedbackInput(sub.editorialFeedback || "");
    setActionMessage(null);
  };

  const togglePlatform = (p: Platform) => {
    let updated: Platform[];
    if (selectedPublishedPlatforms.includes(p)) {
      updated = selectedPublishedPlatforms.filter((item) => item !== p);
    } else {
      updated = [...selectedPublishedPlatforms, p];
    }
    setSelectedPublishedPlatforms(updated);
  };

  const calculatedSum = calculatePaymentForPlatforms(selectedPublishedPlatforms, rates);

  const getCorrespondentEmail = (corrId: string, corrName: string): string => {
    const matchById = correspondents.find((c) => c.id === corrId || c.email?.toLowerCase() === corrId?.toLowerCase());
    if (matchById && matchById.email) return matchById.email;
    const matchByName = correspondents.find((c) => c.name?.toLowerCase() === corrName?.toLowerCase());
    if (matchByName && matchByName.email) return matchByName.email;
    return corrId.includes("@") ? corrId : "";
  };

  const updateSubmissionStatus = async (status: "approved" | "revision_needed" | "declined") => {
    if (!selectedSub) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      const updatedSub: Submission = {
        ...selectedSub,
        status,
        editorialFeedback: feedbackInput.trim(),
        reviewedBy: user?.name || user?.email || "Desk Editor",
        reviewedAt: new Date().toISOString(),
        publishedPlatforms: selectedPublishedPlatforms,
        isPublished: selectedPublishedPlatforms.length > 0,
        calculatedAmountKES: calculatedSum,
      };

      // 1. Save to Firestore
      try {
        await setDoc(doc(db, "submissions", selectedSub.id), updatedSub);
        if (status === "approved" && selectedSub.assignmentId) {
          try {
            await updateDoc(doc(db, "assignments", selectedSub.assignmentId), { status: "completed" });
          } catch (asgErr) {
            console.warn("Could not update assignment status in firestore:", asgErr);
          }
        }
      } catch (fsErr) {
        console.warn("Firestore submission status update notice:", fsErr);
      }

      // 2. Save to local storage
      const updatedList = submissions.map((s) => (s.id === selectedSub.id ? updatedSub : s));
      setSubmissions(updatedList);
      saveStoredData("byline_submissions_v1", updatedList);
      setSelectedSub(updatedSub);

      // 3. Update local assignment status if approved
      if (status === "approved" && selectedSub.assignmentId) {
        const localAsgs = loadStoredData<Assignment[]>("byline_assignments_v1", INITIAL_ASSIGNMENTS);
        const updatedAsgs = localAsgs.map((a) =>
          a.id === selectedSub.assignmentId ? { ...a, status: "completed" as const } : a
        );
        saveStoredData("byline_assignments_v1", updatedAsgs);
      }

      // 4. Dispatch Email Decision Notification to Correspondent
      const corrEmail = getCorrespondentEmail(selectedSub.correspondentId, selectedSub.correspondentName);
      if (corrEmail) {
        try {
          await sendEditorialReviewDecisionEmail({
            correspondentName: selectedSub.correspondentName,
            correspondentEmail: corrEmail,
            submissionId: selectedSub.id,
            storyTitle: selectedSub.assignmentTitle,
            status,
            feedback: feedbackInput.trim(),
            reviewedBy: user?.name || "Desk Editor",
            publishedPlatforms: selectedPublishedPlatforms,
            calculatedAmountKES: calculatedSum,
          });
        } catch (emailErr) {
          console.warn("Decision email dispatch notice:", emailErr);
        }
      }

      const statusLabels = {
        approved: "APPROVED",
        revision_needed: "REVISION REQUESTED",
        declined: "DECLINED",
      };

      setActionMessage(
        `Filing marked as ${statusLabels[status]}. ${corrEmail ? `Notification email sent to ${corrEmail}.` : ""} Calculated payout: KES ${calculatedSum.toLocaleString()}`
      );
    } catch (err: any) {
      console.error("Failed to update submission status:", err);
      setActionMessage(`Error updating status: ${err?.message || "Please try again."}`);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleProofConfirmation = async (confirmStatus: boolean) => {
    if (!selectedSub) return;

    try {
      const updatedSub: Submission = {
        ...selectedSub,
        proofConfirmed: confirmStatus,
        proofConfirmedBy: user?.name || user?.email || "Desk Editor",
        proofConfirmedAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, "submissions", selectedSub.id), updatedSub);
      } catch (fsErr) {
        console.warn("Firestore proof confirmation notice:", fsErr);
      }

      const updatedList = submissions.map((s) => (s.id === selectedSub.id ? updatedSub : s));
      setSubmissions(updatedList);
      saveStoredData("byline_submissions_v1", updatedList);
      setSelectedSub(updatedSub);

      setActionMessage(confirmStatus ? "Proof of Use verified & confirmed!" : "Proof of Use marked as pending verification.");
    } catch (err: any) {
      console.error("Proof confirmation error:", err);
    }
  };

  // Filter queue
  const filteredSubmissions = submissions.filter((sub) => {
    if (filterStatus !== "all" && sub.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = sub.assignmentTitle?.toLowerCase().includes(q);
      const matchName = sub.correspondentName?.toLowerCase().includes(q);
      const matchId = sub.id?.toLowerCase().includes(q);
      if (!matchTitle && !matchName && !matchId) return false;
    }
    return true;
  });

  const pendingCount = submissions.filter((s) => s.status === "pending_review").length;
  const approvedCount = submissions.filter((s) => s.status === "approved").length;
  const revisionCount = submissions.filter((s) => s.status === "revision_needed").length;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow-md border-b-4 border-brand-gold flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-gold font-semibold text-xs uppercase tracking-wider">
            <ClipboardCheck className="w-4 h-4" /> US-07 / US-08 / US-10 Editorial Gate & Payment Engine
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Review Filings & Airing Confirmation</h1>
          <p className="text-xs text-blue-200 mt-1">
            Review submitted text and field media, confirm broadcast/publication platforms, verify proof of use, and dispatch editorial decisions.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2.5 bg-blue-900/60 hover:bg-blue-800 text-white rounded-xl transition cursor-pointer text-xs flex items-center gap-1.5 self-start sm:self-auto"
          title="Refresh Queue"
        >
          <RefreshCw className={`w-4 h-4 text-brand-gold ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* View-Only Mode Notice for Managing Editor */}
      {isManagingEditor && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-lg shadow-sm">
          <p className="text-xs text-amber-700 font-semibold">
            👁️ View-Only Mode: As Managing Editor, you can confirm Published/Aired status and verify proof of use. Approve/Decline/Revision actions are reserved for Desk Editors.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Submissions List Sidebar */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-brand-navy text-white px-5 py-3.5 border-b-2 border-brand-gold space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">Submissions Queue ({filteredSubmissions.length})</span>
              <span className="text-[11px] text-brand-gold font-semibold">Select to Review</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-blue-300 absolute left-2.5 top-2.5" />
              <input
                placeholder="Search headline, reporter, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-blue-950/80 text-white placeholder-blue-300 text-xs rounded-lg pl-8 pr-3 py-1.5 border border-blue-800 focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1 pt-1">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition cursor-pointer ${
                  filterStatus === "all" ? "bg-brand-gold text-slate-900" : "bg-blue-900/60 text-blue-200 hover:text-white"
                }`}
              >
                All ({submissions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("pending_review")}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition cursor-pointer ${
                  filterStatus === "pending_review" ? "bg-amber-500 text-white" : "bg-blue-900/60 text-amber-300 hover:text-white"
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("approved")}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition cursor-pointer ${
                  filterStatus === "approved" ? "bg-brand-teal text-white" : "bg-blue-900/60 text-emerald-300 hover:text-white"
                }`}
              >
                Approved ({approvedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("revision_needed")}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition cursor-pointer ${
                  filterStatus === "revision_needed" ? "bg-orange-600 text-white" : "bg-blue-900/60 text-orange-300 hover:text-white"
                }`}
              >
                Revision ({revisionCount})
              </button>
            </div>
          </div>

          <div className="divide-y overflow-y-auto max-h-[600px]">
            {loading ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-brand-navy" />
                <span className="text-xs">Loading story filings...</span>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                No submissions found matching the selected filter.
              </div>
            ) : (
              filteredSubmissions.map((sub) => {
                const isSelected = selectedSub?.id === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => selectSubmission(sub)}
                    className={`w-full text-left p-4 transition flex flex-col gap-1 cursor-pointer ${
                      isSelected ? "bg-blue-50 border-l-4 border-brand-navy shadow-inner" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-gray-500">{sub.id}</span>
                      {sub.status === "approved" && (
                        <span className="bg-brand-teal text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Approved
                        </span>
                      )}
                      {sub.status === "pending_review" && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Pending Review
                        </span>
                      )}
                      {sub.status === "revision_needed" && (
                        <span className="bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Revision Needed
                        </span>
                      )}
                      {sub.status === "declined" && (
                        <span className="bg-brand-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Declined
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs line-clamp-2 mt-0.5">{sub.assignmentTitle}</h4>
                    <div className="text-[11px] text-gray-600 flex items-center justify-between mt-1">
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3 text-gray-400" />
                        {sub.correspondentName}
                      </span>
                      <span className="font-bold text-brand-gold">KES {sub.calculatedAmountKES?.toLocaleString()}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Submission Review & Platform Confirmation Panel */}
        <div className="lg:col-span-8 space-y-6">
          {selectedSub ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              {/* Top Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono font-bold bg-gray-100 px-2 py-0.5 rounded">
                      Filing Ref: {selectedSub.id}
                    </span>
                    {selectedSub.status === "pending_review" && (
                      <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                        Awaiting Review
                      </span>
                    )}
                    {selectedSub.status === "approved" && (
                      <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                        Approved for Broadcast
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-brand-navy mt-1">{selectedSub.assignmentTitle}</h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Filed by: <strong className="text-slate-900">{selectedSub.correspondentName}</strong> &bull; Date: {new Date(selectedSub.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col sm:items-end">
                  <span className="text-xs text-gray-500 font-bold uppercase">Calculated Payout</span>
                  <span className="text-2xl font-black text-brand-gold">
                    KES {calculatedSum.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Text Content */}
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-700 mb-1">Story Text Content</h3>
                <div className="bg-brand-offwhite p-4 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed font-serif border border-gray-200 whitespace-pre-line">
                  {selectedSub.textContent || "No text story body provided."}
                </div>
              </div>

              {/* Media Attachments */}
              {selectedSub.mediaFiles && selectedSub.mediaFiles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase text-slate-700">
                      Attached Field Media ({selectedSub.mediaFiles.length})
                    </h3>
                    <span className="text-[11px] text-brand-teal font-semibold">
                      Interactive Preview Enabled
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedSub.mediaFiles.map((m, i) => {
                      const isPdf = isPdfFile(m);
                      return (
                        <div 
                          key={i} 
                          className="p-3 bg-gray-50 hover:bg-blue-50/50 rounded-xl border border-gray-200 hover:border-brand-navy/30 flex flex-col justify-between text-xs gap-3 transition shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-xl bg-white border border-gray-200 shrink-0 text-brand-navy shadow-xs">
                              {isPdf ? (
                                <FileText className="w-4 h-4 text-rose-600" />
                              ) : m.type === "audio" ? (
                                <Music className="w-4 h-4 text-blue-600" />
                              ) : m.type === "video" ? (
                                <Video className="w-4 h-4 text-purple-600" />
                              ) : m.type === "image" ? (
                                <ImageIcon className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Paperclip className="w-4 h-4 text-amber-600" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 truncate text-xs" title={m.name}>
                                {m.name}
                              </p>
                              <p className="text-[10px] text-gray-500 uppercase font-mono mt-0.5">
                                {isPdf ? "PDF Document" : m.type} &bull; {m.size || "File"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-gray-200 gap-1.5">
                            <button
                              type="button"
                              onClick={() => openMediaSafely(m)}
                              className="flex-1 bg-brand-navy hover:bg-blue-900 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                              title={isPdf ? "View PDF in new tab" : "Open file in new tab"}
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-brand-gold" />
                              <span>{isPdf ? "View PDF" : "Open in New Tab"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => downloadMediaSafely(m)}
                              className="bg-white hover:bg-gray-100 text-slate-700 border border-gray-200 p-1.5 rounded-lg transition cursor-pointer"
                              title="Download copy to device"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Airing & Publication Confirmation Engine (US-08) */}
              <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-gold" />
                    <h3 className="font-bold text-brand-navy text-sm">Select Airing / Publication Platform(s)</h3>
                  </div>
                  <span className="text-xs font-bold text-brand-teal bg-white px-2.5 py-1 rounded-full border">
                    Auto-sum Active
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Check all KBC platforms where this story was published or aired. System will look up rate card values and automatically sum total compensation:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PLATFORMS_LIST.map((pl) => {
                    const isChecked = selectedPublishedPlatforms.includes(pl.key);
                    const rateObj = rates.find((r) => r.platform === pl.key);
                    const rateAmount = rateObj ? rateObj.rateKES : 0;
                    return (
                      <button
                        type="button"
                        key={pl.key}
                        onClick={() => togglePlatform(pl.key)}
                        className={`p-3 rounded-xl border text-left text-xs font-semibold flex flex-col justify-between transition cursor-pointer ${
                          isChecked
                            ? "bg-brand-navy text-white border-brand-navy shadow-xs"
                            : "bg-white text-slate-800 hover:border-brand-navy"
                        }`}
                      >
                        <span className="font-bold">{pl.label}</span>
                        <span className={`text-[11px] mt-1 font-mono font-bold ${isChecked ? "text-brand-gold" : "text-brand-teal"}`}>
                          + KES {rateAmount.toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Proof of Use Section (US-09 & US-10) */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Proof of Broadcast & Publication Evidence</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Verify airing links submitted by field correspondent</p>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className={`transition-all duration-300 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-xs ${
                    selectedSub.proofConfirmed 
                      ? "bg-brand-teal text-white border border-emerald-600" 
                      : "bg-amber-100 text-amber-900 border border-amber-300"
                  }`}>
                    {selectedSub.proofConfirmed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-gold" />
                        <span>Verified & Confirmed</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Pending Verification</span>
                      </>
                    )}
                  </div>
                </div>

                {selectedSub.proofOfUse ? (
                  <div className="space-y-2.5 text-xs">
                    {selectedSub.proofOfUse.url && (
                      <div className="flex items-center gap-2 text-blue-600 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                        <Globe className="w-4 h-4 shrink-0 text-blue-700" />
                        <span className="font-bold text-slate-700 shrink-0">Web Article:</span>
                        <a href={selectedSub.proofOfUse.url} target="_blank" rel="noreferrer" className="underline truncate flex-1 hover:text-blue-800 font-medium">
                          {selectedSub.proofOfUse.url}
                        </a>
                      </div>
                    )}
                    {selectedSub.proofOfUse.youtubeUrl && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-50/60 p-2.5 rounded-xl border border-red-100">
                        <Tv className="w-4 h-4 shrink-0 text-red-700" />
                        <span className="font-bold text-slate-700 shrink-0">TV Package Broadcast:</span>
                        <a href={selectedSub.proofOfUse.youtubeUrl} target="_blank" rel="noreferrer" className="underline truncate flex-1 hover:text-red-800 font-medium">
                          {selectedSub.proofOfUse.youtubeUrl}
                        </a>
                      </div>
                    )}
                    {selectedSub.proofOfUse.audioClipUrl && (
                      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                        <Radio className="w-4 h-4 shrink-0 text-emerald-700" />
                        <span className="font-bold text-slate-700 shrink-0">Radio Clip / Podcast:</span>
                        <a href={selectedSub.proofOfUse.audioClipUrl} target="_blank" rel="noreferrer" className="underline truncate flex-1 hover:text-emerald-800 font-medium">
                          {selectedSub.proofOfUse.audioClipUrl}
                        </a>
                      </div>
                    )}
                    {selectedSub.proofOfUse.notes && (
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <span className="font-bold text-[11px] text-slate-700 block mb-0.5">Airing Confirmation Details:</span>
                        <p className="text-gray-600 italic text-xs leading-relaxed">"{selectedSub.proofOfUse.notes}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic bg-gray-50 p-3.5 rounded-xl border border-dashed text-center">
                    No proof links entered by correspondent. Use the verification toggle below to set confirmation status:
                  </p>
                )}

                {/* Animated Left/Right Sliding Toggle Switch */}
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Proof Verification State:</span>
                    <span className="text-gray-500 text-[11px]">
                      {selectedSub.proofConfirmed ? "Proof is currently verified and approved" : "Proof is unverified / pending check"}
                    </span>
                  </div>

                  <div className="relative bg-slate-100 p-1 rounded-2xl border border-slate-200 flex items-center max-w-lg shadow-inner overflow-hidden select-none">
                    {/* Animated Sliding Background Pill */}
                    <div
                      className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300 ease-in-out shadow-md flex items-center justify-center ${
                        selectedSub.proofConfirmed
                          ? "left-[calc(50%+2px)] bg-brand-teal text-white shadow-emerald-900/30 border border-emerald-600"
                          : "left-1 bg-amber-500 text-white shadow-amber-900/20 border border-amber-600"
                      }`}
                    />

                    {/* Left Button: Mark Unverified */}
                    <button
                      type="button"
                      onClick={() => toggleProofConfirmation(false)}
                      className={`relative z-10 w-1/2 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                        !selectedSub.proofConfirmed
                          ? "text-white font-black drop-shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <XCircle className={`w-4 h-4 transition-transform duration-200 ${!selectedSub.proofConfirmed ? "text-white scale-110" : "text-slate-400"}`} />
                      <span>Mark Unverified</span>
                    </button>

                    {/* Right Button: Confirm Proof Valid */}
                    <button
                      type="button"
                      onClick={() => toggleProofConfirmation(true)}
                      className={`relative z-10 w-1/2 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                        selectedSub.proofConfirmed
                          ? "text-white font-black drop-shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <CheckCircle2 className={`w-4 h-4 transition-transform duration-200 ${selectedSub.proofConfirmed ? "text-brand-gold scale-110" : "text-slate-400"}`} />
                      <span>Confirm Proof Valid</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Editorial Feedback & Review Actions (US-07) */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Desk Editor Review Notes / Feedback (Sent to Correspondent)
                </label>
                <textarea
                  placeholder="Provide feedback, revision instructions, broadcast package angle, or approval notes..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy leading-relaxed"
                />

                {/* Approve/Decline/Revision Buttons - HIDDEN for Managing Editor */}
                {!isManagingEditor && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => updateSubmissionStatus("approved")}
                      className="bg-brand-teal hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Approve Story Filing</span>
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => updateSubmissionStatus("revision_needed")}
                      className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>Request Revision</span>
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => updateSubmissionStatus("declined")}
                      className="bg-brand-red hover:bg-red-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Decline Story</span>
                    </button>
                  </div>
                )}

                {/* Show message for Managing Editor */}
                {isManagingEditor && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
                    As Managing Editor, you can view submissions and confirm Published/Aired status. Approve/Decline/Revision actions are restricted to Desk Editors.
                  </div>
                )}
              </div>

              {actionMessage && (
                <div className="p-4 bg-brand-teal text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{actionMessage}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border text-center text-gray-500">
              Select a submission from the queue to review.
            </div>
          )}
        </div>
      </div>

      {/* Interactive Media & Document Preview Modal */}
      <MediaPreviewModal
        file={previewModalFile}
        onClose={() => setPreviewModalFile(null)}
      />
    </div>
  );
}