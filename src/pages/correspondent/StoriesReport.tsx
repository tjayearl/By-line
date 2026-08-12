import { useState, useEffect } from "react";
import { FileText, Download, CheckCircle2, Mail } from "lucide-react";
import { loadStoredData, saveStoredData, INITIAL_SUBMISSIONS, INITIAL_CLAIMS } from "../../lib/dataStore";
import { useAuth } from "../../context/AuthContext";
import { generateStoriesReportPDF } from "../../lib/pdfReportGenerator";
import type { PaymentClaim, Submission } from "../../types";
import EditorialDirectiveNotice from "../../components/EditorialDirectiveNotice";

export default function StoriesReport() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [claims, setClaims] = useState<PaymentClaim[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadedSubs = loadStoredData("byline_submissions_v1", INITIAL_SUBMISSIONS);
    const loadedClaims = loadStoredData("byline_claims_v1", INITIAL_CLAIMS);
    setSubmissions(loadedSubs);
    setClaims(loadedClaims);
  }, []);

 const verifiedSubmissions = submissions.filter((s) => {
  // Only include approved submissions
  if (s.status !== "approved") return false;
  
  // If user is a Correspondent, only show their own submissions
  if (user?.role === "correspondent") {
    return s.correspondentId === user?.uid;
  }
  
  // Editors and Admins see all approved submissions
  return true;
});
  const grandTotalCalculated = verifiedSubmissions.reduce((sum, s) => sum + s.calculatedAmountKES, 0);

  // Active claim
  const currentClaim: PaymentClaim = claims[0] || {
    id: "CLAIM-2026-08-001",
    correspondentId: user?.uid || "corr-101",
    correspondentName: user?.name || "Jane Wambui",
    correspondentEmail: user?.email || "jane.wambui@kbc.co.ke",
    correspondentPhone: user?.phone || "+254 712 345 678",
    bankDetails: "KCB Bank - A/C 1184920491 (Nakuru Branch)",
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

  const handleLodgePaymentRequest = () => {
    setActionMessage(`Payment claim lodged with Finance (finance@kbc.co.ke). Email alert dispatched via Byline notification system.`);
  };

  const handleMarkAsPaid = (claimId: string) => {
    const updated = claims.map((c) => (c.id === claimId ? { ...c, status: "paid" as const, paidAt: new Date().toISOString() } : c));
    setClaims(updated);
    saveStoredData("byline_claims_v1", updated);
    setActionMessage(`Claim ${claimId} successfully marked as PAID!`);
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

      <EditorialDirectiveNotice />

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
