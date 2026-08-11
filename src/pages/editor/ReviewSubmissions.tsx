import { useState, useEffect } from "react";
import { ClipboardCheck, CheckCircle2, XCircle, AlertCircle, Tv, Radio, Globe, Sparkles } from "lucide-react";
import {
  loadStoredData, saveStoredData, INITIAL_SUBMISSIONS, DEFAULT_RATES,
  calculatePaymentForPlatforms
} from "../../lib/dataStore";
import type { Platform, RateCardEntry, Submission } from "../../types";
import EditorialDirectiveNotice from "../../components/EditorialDirectiveNotice";

const PLATFORMS_LIST: { key: Platform; label: string }[] = [
  { key: "tv_national", label: "TV Package (National)" },
  { key: "tv_regional", label: "TV Package (Regional/Vernacular)" },
  { key: "radio_national", label: "Radio Clip (National)" },
  { key: "radio_vernacular", label: "Radio Clip (Vernacular)" },
  { key: "website", label: "Website Article" },
  { key: "social", label: "Social Media Post" },
];

export default function ReviewSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [rates, setRates] = useState<RateCardEntry[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [selectedPublishedPlatforms, setSelectedPublishedPlatforms] = useState<Platform[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadedSubs = loadStoredData("byline_submissions_v1", INITIAL_SUBMISSIONS);
    const loadedRates = loadStoredData("byline_rates_v1", DEFAULT_RATES);
    setSubmissions(loadedSubs);
    setRates(loadedRates);
    if (loadedSubs.length > 0) {
      setSelectedSub(loadedSubs[0]);
      setSelectedPublishedPlatforms(loadedSubs[0].publishedPlatforms || []);
      setFeedbackInput(loadedSubs[0].editorialFeedback || "");
    }
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

  const updateSubmissionStatus = (status: "approved" | "revision_needed" | "declined") => {
    if (!selectedSub) return;

    const updatedSub: Submission = {
      ...selectedSub,
      status,
      editorialFeedback: feedbackInput,
      reviewedBy: "Desk Editor",
      reviewedAt: new Date().toISOString(),
      publishedPlatforms: selectedPublishedPlatforms,
      isPublished: selectedPublishedPlatforms.length > 0,
      calculatedAmountKES: calculatedSum,
    };

    const updatedList = submissions.map((s) => (s.id === selectedSub.id ? updatedSub : s));
    setSubmissions(updatedList);
    saveStoredData("byline_submissions_v1", updatedList);
    setSelectedSub(updatedSub);

    setActionMessage(`Filing marked as ${status.replace("_", " ").toUpperCase()}. Calculated payout: KES ${calculatedSum.toLocaleString()}`);
  };

  const toggleProofConfirmation = (confirmStatus: boolean) => {
    if (!selectedSub) return;

    const updatedSub: Submission = {
      ...selectedSub,
      proofConfirmed: confirmStatus,
      proofConfirmedBy: "Desk Editor",
      proofConfirmedAt: new Date().toISOString(),
    };

    const updatedList = submissions.map((s) => (s.id === selectedSub.id ? updatedSub : s));
    setSubmissions(updatedList);
    saveStoredData("byline_submissions_v1", updatedList);
    setSelectedSub(updatedSub);

    setActionMessage(confirmStatus ? "Proof of Use verified & confirmed!" : "Proof of Use marked as pending verification.");
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow-md border-b-4 border-brand-gold flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-gold font-semibold text-xs uppercase tracking-wider">
            <ClipboardCheck className="w-4 h-4" /> US-07 / US-08 / US-10 Editorial Gate & Payment Engine
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Review Filings & Airing Confirmation</h1>
          <p className="text-xs text-blue-200 mt-1">
            Review story submissions, confirm broadcast/publication platforms, verify proof of use, and calculate rate card payouts.
          </p>
        </div>
      </div>

      <EditorialDirectiveNotice />

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Submissions List Sidebar */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-brand-navy text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-brand-gold">
            <span className="font-bold text-sm">Submissions Queue ({submissions.length})</span>
            <span className="text-[11px] text-brand-gold font-semibold">Select to Review</span>
          </div>

          <div className="divide-y overflow-y-auto max-h-[600px]">
            {submissions.map((sub) => {
              const isSelected = selectedSub?.id === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => selectSubmission(sub)}
                  className={`w-full text-left p-4 transition flex flex-col gap-1 ${
                    isSelected ? "bg-blue-50 border-l-4 border-brand-navy" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-500">{sub.id}</span>
                    {sub.status === "approved" && (
                      <span className="bg-brand-teal text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Approved
                      </span>
                    )}
                    {sub.status === "pending_review" && (
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                    {sub.status === "revision_needed" && (
                      <span className="bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Revision
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs line-clamp-2">{sub.assignmentTitle}</h4>
                  <div className="text-[11px] text-gray-600 flex items-center justify-between mt-1">
                    <span>{sub.correspondentName}</span>
                    <span className="font-bold text-brand-gold">KES {sub.calculatedAmountKES?.toLocaleString()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Submission Review & Platform Confirmation Panel */}
        <div className="lg:col-span-8 space-y-6">
          {selectedSub ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              {/* Top Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                <div>
                  <div className="text-xs text-gray-500 font-mono">Filing Reference: {selectedSub.id}</div>
                  <h2 className="text-xl font-black text-brand-navy mt-0.5">{selectedSub.assignmentTitle}</h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Filed by: <strong className="text-slate-900">{selectedSub.correspondentName}</strong> &bull; Date: {new Date(selectedSub.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-gray-500 font-bold uppercase">Calculated Payout</span>
                  <span className="text-2xl font-black text-brand-gold">
                    KES {calculatedSum.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Text Content */}
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-700 mb-1">Story Text Content</h3>
                <div className="bg-brand-offwhite p-4 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed font-sans border border-gray-200">
                  {selectedSub.textContent || "No text story body provided."}
                </div>
              </div>

              {/* Media Attachments */}
              {selectedSub.mediaFiles && selectedSub.mediaFiles.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase text-slate-700 mb-2">Attached Field Media ({selectedSub.mediaFiles.length})</h3>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {selectedSub.mediaFiles.map((m, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-xl border flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900 truncate max-w-[140px]">{m.name}</p>
                          <p className="text-[10px] text-gray-500 uppercase">{m.type} &bull; {m.size || "File"}</p>
                        </div>
                        <span className="bg-brand-navy text-white text-[10px] px-2 py-1 rounded">View</span>
                      </div>
                    ))}
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
                        className={`p-3 rounded-xl border text-left text-xs font-semibold flex flex-col justify-between transition ${
                          isChecked
                            ? "bg-brand-navy text-white border-brand-navy shadow"
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
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-xs uppercase">Proof of Use Evidence</h3>
                  {selectedSub.proofConfirmed ? (
                    <span className="bg-brand-teal text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      Verified & Confirmed
                    </span>
                  ) : (
                    <span className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      Pending Verification
                    </span>
                  )}
                </div>

                {selectedSub.proofOfUse ? (
                  <div className="space-y-2 text-xs">
                    {selectedSub.proofOfUse.url && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Globe className="w-4 h-4 shrink-0" />
                        <a href={selectedSub.proofOfUse.url} target="_blank" rel="noreferrer" className="underline truncate">
                          {selectedSub.proofOfUse.url}
                        </a>
                      </div>
                    )}
                    {selectedSub.proofOfUse.youtubeUrl && (
                      <div className="flex items-center gap-2 text-red-600">
                        <Tv className="w-4 h-4 shrink-0" />
                        <a href={selectedSub.proofOfUse.youtubeUrl} target="_blank" rel="noreferrer" className="underline truncate">
                          {selectedSub.proofOfUse.youtubeUrl}
                        </a>
                      </div>
                    )}
                    {selectedSub.proofOfUse.audioClipUrl && (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <Radio className="w-4 h-4 shrink-0" />
                        <a href={selectedSub.proofOfUse.audioClipUrl} target="_blank" rel="noreferrer" className="underline truncate">
                          {selectedSub.proofOfUse.audioClipUrl}
                        </a>
                      </div>
                    )}
                    {selectedSub.proofOfUse.notes && (
                      <p className="text-gray-600 italic bg-gray-50 p-2 rounded">"{selectedSub.proofOfUse.notes}"</p>
                    )}

                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={() => toggleProofConfirmation(true)}
                        className="bg-brand-teal hover:bg-emerald-800 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Proof Valid
                      </button>
                      <button
                        onClick={() => toggleProofConfirmation(false)}
                        className="bg-gray-200 hover:bg-gray-300 text-slate-800 text-xs px-3 py-1.5 rounded-lg font-bold"
                      >
                        Mark Unverified
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No proof of use links submitted yet by correspondent.</p>
                )}
              </div>

              {/* Editorial Feedback & Review Actions (US-07) */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase">Desk Editor Review Notes / Feedback</label>
                <textarea
                  placeholder="Provide feedback, revision instructions, or approval notes..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  rows={2}
                  className="w-full border rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy"
                />

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => updateSubmissionStatus("approved")}
                    className="bg-brand-teal hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve Story Filing
                  </button>

                  <button
                    onClick={() => updateSubmissionStatus("revision_needed")}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition flex items-center gap-1.5"
                  >
                    <AlertCircle className="w-4 h-4" /> Request Revision
                  </button>

                  <button
                    onClick={() => updateSubmissionStatus("declined")}
                    className="bg-brand-red hover:bg-red-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Decline Story
                  </button>
                </div>
              </div>

              {actionMessage && (
                <div className="p-3 bg-brand-teal text-white rounded-lg text-xs font-semibold">
                  {actionMessage}
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
    </div>
  );
}
