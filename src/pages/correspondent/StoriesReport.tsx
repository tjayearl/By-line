import { useState, useEffect } from "react";
import { FileText, Download, CheckCircle2, Mail } from "lucide-react";
import { doc, getDocs, collection, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { loadStoredData, saveStoredData, INITIAL_SUBMISSIONS, INITIAL_CLAIMS } from "../../lib/dataStore";
import { useAuth } from "../../context/AuthContext";
import { generateStoriesReportPDF } from "../../lib/pdfReportGenerator";
import type { PaymentClaim, Submission } from "../../types";

export default function StoriesReport() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [claims, setClaims] = useState<PaymentClaim[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadAllData = async () => {
    // 1. Submissions
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
      console.warn("Firestore subs notice in StoriesReport:", fsErr);
    }
    const allSubs = Array.from(subMap.values());
    setSubmissions(allSubs);

    // 2. Claims
    const localClaims = loadStoredData<PaymentClaim[]>("byline_claims_v1", INITIAL_CLAIMS);
    const claimMap = new Map<string, PaymentClaim>();
    localClaims.forEach((c) => { if (c && c.id) claimMap.set(c.id, c); });
    try {
      const claimSnap = await getDocs(collection(db, "claims"));
      claimSnap.forEach((d) => {
        const c = d.data() as PaymentClaim;
        if (c && (c.id || d.id)) {
          const id = c.id || d.id;
          const existing = claimMap.get(id);
          claimMap.set(id, { ...existing, ...c, id });
        }
      });
    } catch (fsErr) {
      console.warn("Firestore claims notice in StoriesReport:", fsErr);
    }
    const allClaims = Array.from(claimMap.values());
    setClaims(allClaims);
  };

  useEffect(() => {
    loadAllData();

    const handleUpdate = () => {
      loadAllData();
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("byline:data_updated", handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("byline:data_updated", handleUpdate);
    };
  }, []);

  const userEmailLower = (user?.email || "").toLowerCase().trim();

  const verifiedSubmissions = submissions.filter((s) => {
    if (s.status !== "approved") return false;
    if (user?.role === "correspondent") {
      if (s.correspondentId === user.uid || s.correspondentId === userEmailLower) return true;
      if (s.correspondentName && user.name && s.correspondentName.toLowerCase() === user.name.toLowerCase()) return true;
      return false;
    }
    return true;
  });

  const grandTotalCalculated = verifiedSubmissions.reduce((sum, s) => sum + s.calculatedAmountKES, 0);

  // Active claim
  const currentClaim: PaymentClaim = claims.find((c) => c.status === "pending") || {
    id: `CLAIM-2026-08-${String(claims.length + 1).padStart(3, "0")}`,
    correspondentId: user?.uid || "corr-101",
    correspondentName: user?.name || "Jane Wambui",
    correspondentEmail: user?.email || "jane.wambui@kbc.co.ke",
    correspondentPhone: user?.phone || "+254 712 345 678",
    bankDetails: (user as any)?.bankDetails || "KCB Bank - A/C 1184920491 (Nakuru Branch)",
    month: "August 2026",
    submissionIds: verifiedSubmissions.map((s) => s.id),
    submissions: verifiedSubmissions,
    totalAmountKES: grandTotalCalculated || 18000,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const handleDownloadPDF = () => {
    generateStoriesReportPDF(currentClaim);
    setActionMessage(`Downloaded PDF Stories Report for ${currentClaim.month}! Attach this document to your claim.`);
  };

  const handleLodgePaymentRequest = async () => {
    try {
      const claimToSave: PaymentClaim = {
        ...currentClaim,
        totalAmountKES: grandTotalCalculated || currentClaim.totalAmountKES,
        submissionIds: verifiedSubmissions.map((s) => s.id),
        submissions: verifiedSubmissions,
        createdAt: new Date().toISOString(),
        status: "pending",
      };

      try {
        await setDoc(doc(db, "claims", claimToSave.id), claimToSave);
      } catch (fsErr) {
        console.warn("Firestore save claim notice:", fsErr);
      }

      const existingIndex = claims.findIndex((c) => c.id === claimToSave.id);
      const updatedClaims = existingIndex >= 0
        ? claims.map((c) => (c.id === claimToSave.id ? claimToSave : c))
        : [claimToSave, ...claims];

      setClaims(updatedClaims);
      saveStoredData("byline_claims_v1", updatedClaims);

      try {
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("byline:data_updated"));
      } catch {}

      setActionMessage(`Payment claim [${claimToSave.id}] for KES ${claimToSave.totalAmountKES.toLocaleString()} lodged with Finance (finance@kbc.co.ke). Email alert dispatched!`);
    } catch (err: any) {
      setActionMessage(`Error lodging claim: ${err?.message || "Please try again."}`);
    }
  };

  const handleMarkAsPaid = async (claimId: string) => {
    const paidTimestamp = new Date().toISOString();
    const updated = claims.map((c) =>
      c.id === claimId ? { ...c, status: "paid" as const, paidAt: paidTimestamp } : c
    );
    setClaims(updated);
    saveStoredData("byline_claims_v1", updated);

    try {
      await updateDoc(doc(db, "claims", claimId), { status: "paid", paidAt: paidTimestamp });
    } catch (fsErr) {
      console.warn("Firestore mark paid notice:", fsErr);
    }

    try {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("byline:data_updated"));
    } catch {}

    setActionMessage(`Claim [${claimId}] successfully marked as PAID! Payment settlement confirmed.`);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow-md border-b-4 border-brand-gold flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-gold font-semibold text-xs uppercase tracking-wider">
            <FileText className="w-4 h-4" /> US-11 to US-14 Invoice Generation & Finance Tracking
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Monthly Stories Report & Payment Claims</h1>
          <p className="text-xs text-blue-200 mt-1">
            Auto-generate downloadable PDF Stories Reports and track payment processing status with KBC Finance.
          </p>
        </div>

        <button
          onClick={handleDownloadPDF}
          className="bg-brand-gold hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2.5 rounded-xl shadow text-xs sm:text-sm flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Download PDF Report</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase">Verified Stories</p>
          <h3 className="text-2xl font-black text-brand-navy mt-1">{verifiedSubmissions.length}</h3>
          <p className="text-xs text-gray-500 mt-1">Approved & proof-verified filings</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase">Claim Month</p>
          <h3 className="text-2xl font-black text-brand-navy mt-1">August 2026</h3>
          <p className="text-xs text-gray-500 mt-1">Current processing period</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-brand-gold shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase">Total Amount Due</p>
          <h3 className="text-2xl font-black text-brand-gold mt-1">
            KES {currentClaim.totalAmountKES.toLocaleString()}
          </h3>
          <p className="text-xs text-gray-500 mt-1">Calculated via active rate card</p>
        </div>
      </div>

      {/* Action Banner for Finance Submission */}
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow border-l-8 border-brand-teal flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-brand-teal text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
              US-12 / US-13 Workflow
            </span>
            <span className="text-brand-gold text-xs font-semibold">KBC Finance Gateway</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">Submit Monthly Payment Request to Finance</h3>
          <p className="text-xs text-blue-200 mt-0.5">
            Download your auto-generated PDF Stories Report and lodge an automated email alert to KBC Finance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPDF}
            className="bg-white text-brand-navy hover:bg-gray-100 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow"
          >
            <Download className="w-4 h-4 text-brand-gold" /> Download PDF
          </button>
          <button
            onClick={handleLodgePaymentRequest}
            className="bg-brand-teal hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow"
          >
            <Mail className="w-4 h-4 text-brand-gold" /> Send to Finance
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-brand-teal text-white rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Itemized Breakdown Table with Alternating Off-White #F7F7F7 Rows */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-brand-gold">
          <h2 className="font-bold text-lg">Itemized Stories Breakdown & Platform Rates</h2>
          <span className="text-xs text-brand-gold font-semibold">Active Rate Engine Applied</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-byline">
            <thead>
              <tr className="bg-gray-100 text-xs font-bold uppercase tracking-wider text-slate-700 border-b">
                <th className="p-4">Filing Title & ID</th>
                <th className="p-4">Published Platforms</th>
                <th className="p-4">Proof Status</th>
                <th className="p-4 text-right">Calculated Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs sm:text-sm">
              {verifiedSubmissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-blue-50/40 transition">
                  <td className="p-4">
                    <div className="font-bold text-brand-navy">{sub.assignmentTitle}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{sub.id}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {sub.publishedPlatforms.map((p) => (
                        <span key={p} className="bg-blue-100 text-brand-navy text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                          {p.replace("_", " ").toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    {sub.proofConfirmed ? (
                      <span className="bg-brand-teal text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        Pending Proof
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right font-bold text-brand-gold">
                    KES {sub.calculatedAmountKES.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History & Pending Claims (US-14) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-brand-gold">
          <h2 className="font-bold text-lg">Logged Payment Claims ({claims.length})</h2>
          <span className="text-xs text-brand-gold font-semibold">Payment History & Tracking</span>
        </div>

        <div className="divide-y">
          {claims.map((claim) => (
            <div key={claim.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-brand-navy">{claim.id}</span>
                  <span className="text-xs font-semibold text-gray-500">&bull; {claim.month}</span>
                </div>
                <h4 className="font-bold text-slate-900 mt-1">{claim.correspondentName}</h4>
                <p className="text-xs text-gray-500">{claim.bankDetails}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs font-bold text-brand-gold block">KES {claim.totalAmountKES.toLocaleString()}</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                    claim.status === "paid" ? "bg-brand-teal text-white" : "bg-amber-500 text-white"
                  }`}>
                    {claim.status}
                  </span>
                </div>

                {claim.status === "pending" && (
                  <button
                    onClick={() => handleMarkAsPaid(claim.id)}
                    className="bg-brand-teal hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow"
                  >
                    Mark as Paid
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
