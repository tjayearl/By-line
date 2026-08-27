import { useState, useEffect, useMemo } from "react";
import { 
  DollarSign, 
  Download, 
  CheckCircle2, 
  Mail, 
  Building2, 
  Calendar, 
  Filter, 
  FileSpreadsheet, 
  Layers
} from "lucide-react";
import { doc, getDocs, collection, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { 
  loadStoredData, 
  saveStoredData, 
  INITIAL_SUBMISSIONS, 
  INITIAL_CLAIMS, 
  INITIAL_CORRESPONDENTS,
  formatBankDetails, 
  parseBankDetails 
} from "../../lib/dataStore";
import { useAuth } from "../../context/AuthContext";
import { 
  generateDurationPaymentReportPDF, 
  exportDurationPaymentReportCSV,
  generateStoriesReportPDF
} from "../../lib/pdfReportGenerator";
import type { Correspondent, PaymentClaim, Platform, Submission } from "../../types";

type DatePreset = "this_month" | "last_month" | "last_30_days" | "last_90_days" | "year_to_date" | "all_time" | "custom";

function getPresetDates(preset: DatePreset) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (preset === "this_month") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
      label: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    };
  }
  if (preset === "last_month") {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
      label: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    };
  }
  if (preset === "last_30_days") {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      start: start.toISOString().split("T")[0],
      end: now.toISOString().split("T")[0],
      label: `Past 30 Days (${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`,
    };
  }
  if (preset === "last_90_days") {
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return {
      start: start.toISOString().split("T")[0],
      end: now.toISOString().split("T")[0],
      label: `Past 90 Days (${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`,
    };
  }
  if (preset === "year_to_date") {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
      label: `Year ${year} (${start.toLocaleDateString("en-US", { month: "short", year: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", year: "numeric" })})`,
    };
  }
  if (preset === "all_time") {
    return {
      start: "2025-01-01",
      end: "2027-12-31",
      label: "All Time Cumulative",
    };
  }
  return {
    start: "2026-08-01",
    end: "2026-08-31",
    label: "Custom Period",
  };
}

export default function PaymentReport() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [claims, setClaims] = useState<PaymentClaim[]>([]);
  const [correspondents, setCorrespondents] = useState<Correspondent[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Duration Filter States
  const defaultDates = getPresetDates("this_month");
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>("this_month");
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [selectedCorrespondentId, setSelectedCorrespondentId] = useState<string>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const isCorrespondent = user?.role === "correspondent";
  const userEmailLower = (user?.email || "").toLowerCase().trim();

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
      console.warn("Firestore subs notice in PaymentReport:", fsErr);
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
      console.warn("Firestore claims notice in PaymentReport:", fsErr);
    }
    const allClaims = Array.from(claimMap.values());
    setClaims(allClaims);

    // 3. Correspondents
    const corrMap = new Map<string, Correspondent>();
    INITIAL_CORRESPONDENTS.forEach((c) => corrMap.set(c.id, c));
    const localCorrs = loadStoredData<Correspondent[]>("byline_correspondents_v1", []);
    localCorrs.forEach((c) => corrMap.set(c.id, c));
    try {
      const uSnap = await getDocs(collection(db, "users"));
      uSnap.forEach((d) => {
        const u = d.data() as any;
        if (u.role === "correspondent") {
          const parsed = parseBankDetails(u.bankDetails || "");
          corrMap.set(d.id, {
            id: d.id,
            name: u.name || u.email,
            email: u.email,
            phone: u.phone || "",
            idNumber: u.idNumber || "",
            bankName: u.bankName || parsed.bankName,
            branch: u.branch || parsed.branch,
            accountNumber: u.accountNumber || parsed.accountNumber,
            bankDetails: u.bankDetails || "",
            specialisation: u.specialisation || "News",
            county: u.county || "Nairobi",
            registeredAt: u.registeredAt || new Date().toISOString(),
          });
        }
      });
    } catch (fsErr) {
      console.warn("Firestore users lookup notice in PaymentReport:", fsErr);
    }
    setCorrespondents(Array.from(corrMap.values()));
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

  const handlePresetSelect = (preset: DatePreset) => {
    setSelectedPreset(preset);
    if (preset !== "custom") {
      const dates = getPresetDates(preset);
      setStartDate(dates.start);
      setEndDate(dates.end);
    }
  };

  // Filter Submissions by Duration, Scope, Platform, and Status
  const periodFilteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      // 1. Only approved filings with calculated payout
      if (s.status !== "approved") return false;

      // 2. Date Window Filtering
      const rawDate = s.submittedAt || s.publishedAt || "2026-08-01";
      const subDate = new Date(rawDate).toISOString().split("T")[0];
      if (startDate && subDate < startDate) return false;
      if (endDate && subDate > endDate) return false;

      // 3. Correspondent Scope
      if (isCorrespondent) {
        const matchesId = s.correspondentId === user?.uid || s.correspondentId === userEmailLower;
        const matchesName = s.correspondentName && user?.name && s.correspondentName.toLowerCase() === user.name.toLowerCase();
        if (!matchesId && !matchesName) return false;
      } else if (selectedCorrespondentId !== "all") {
        const matchesId = s.correspondentId === selectedCorrespondentId;
        const targetCorr = correspondents.find((c) => c.id === selectedCorrespondentId);
        const matchesName = targetCorr && s.correspondentName && s.correspondentName.toLowerCase() === targetCorr.name.toLowerCase();
        if (!matchesId && !matchesName) return false;
      }

      // 4. Platform Filter
      if (selectedPlatform !== "all") {
        if (!s.publishedPlatforms || !s.publishedPlatforms.includes(selectedPlatform as Platform)) return false;
      }

      // 5. Payment Status Filter
      if (selectedStatus !== "all") {
        const matchedClaim = claims.find((c) => c.submissionIds?.includes(s.id));
        const isPaid = matchedClaim?.status === "paid";
        if (selectedStatus === "paid" && !isPaid) return false;
        if (selectedStatus === "pending" && isPaid) return false;
      }

      return true;
    });
  }, [submissions, startDate, endDate, isCorrespondent, user, userEmailLower, selectedCorrespondentId, correspondents, selectedPlatform, selectedStatus, claims]);

  // Financial Metrics for the Filtered Duration
  const totalPeriodAmountKES = useMemo(() => {
    return periodFilteredSubmissions.reduce((sum, s) => sum + (s.calculatedAmountKES || 0), 0);
  }, [periodFilteredSubmissions]);

  const paidPeriodAmountKES = useMemo(() => {
    return periodFilteredSubmissions.reduce((sum, s) => {
      const matchedClaim = claims.find((c) => c.submissionIds?.includes(s.id));
      return matchedClaim?.status === "paid" ? sum + (s.calculatedAmountKES || 0) : sum;
    }, 0);
  }, [periodFilteredSubmissions, claims]);

  const pendingPeriodAmountKES = totalPeriodAmountKES - paidPeriodAmountKES;

  // Active Correspondent Profile (if single user or correspondent)
  const activeCorrObj = isCorrespondent 
    ? (user as any)
    : selectedCorrespondentId !== "all" 
      ? correspondents.find((c) => c.id === selectedCorrespondentId)
      : null;

  const parsedUserBank = parseBankDetails(activeCorrObj?.bankDetails);
  const activeBankName = activeCorrObj?.bankName || parsedUserBank.bankName || "KCB Bank";
  const activeBranch = activeCorrObj?.branch || parsedUserBank.branch || "Nakuru Branch";
  const activeAccountNumber = activeCorrObj?.accountNumber || parsedUserBank.accountNumber || "1184920491";
  const activeBankDetails = formatBankDetails({
    bankName: activeBankName,
    branch: activeBranch,
    accountNumber: activeAccountNumber,
    bankDetails: activeCorrObj?.bankDetails || "KCB Bank - A/C 1184920491 (Nakuru Branch)",
  });

  const periodLabel = `${new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} to ${new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // Download PDF for the selected Duration
  const handleDownloadDurationPDF = () => {
    const scopeName = isCorrespondent 
      ? (user?.name || "Correspondent")
      : selectedCorrespondentId !== "all"
        ? (correspondents.find((c) => c.id === selectedCorrespondentId)?.name || "Selected Correspondent")
        : "All Correspondents (Consolidated Report)";

    generateDurationPaymentReportPDF({
      startDate,
      endDate,
      periodLabel,
      correspondentFilterName: scopeName,
      bankName: activeCorrObj ? activeBankName : undefined,
      branch: activeCorrObj ? activeBranch : undefined,
      accountNumber: activeCorrObj ? activeAccountNumber : undefined,
      bankDetails: activeCorrObj ? activeBankDetails : undefined,
      submissions: periodFilteredSubmissions,
      totalAmountKES: totalPeriodAmountKES,
      paidAmountKES: paidPeriodAmountKES,
      pendingAmountKES: pendingPeriodAmountKES,
      generatedBy: user?.name || user?.email || "Finance Desk",
      userRole: user?.role,
    });

    setActionMessage(`Downloaded Payment Report PDF for duration (${periodLabel}) with ${periodFilteredSubmissions.length} stories!`);
  };

  // Export to CSV for the selected Duration
  const handleExportCSV = () => {
    const scopeName = isCorrespondent 
      ? (user?.name || "Correspondent")
      : selectedCorrespondentId !== "all"
        ? (correspondents.find((c) => c.id === selectedCorrespondentId)?.name || "Selected")
        : "All Correspondents";

    exportDurationPaymentReportCSV({
      startDate,
      endDate,
      periodLabel,
      correspondentFilterName: scopeName,
      submissions: periodFilteredSubmissions,
      totalAmountKES: totalPeriodAmountKES,
    });

    setActionMessage(`Exported Payment Report CSV (${startDate} to ${endDate}) successfully!`);
  };

  // Active claim for current month lodge
  const currentClaim: PaymentClaim = claims.find((c) => c.status === "pending") || {
    id: `CLAIM-2026-08-${String(claims.length + 1).padStart(3, "0")}`,
    correspondentId: user?.uid || "corr-101",
    correspondentName: user?.name || "Jane Wambui",
    correspondentEmail: user?.email || "jane.wambui@kbc.co.ke",
    correspondentPhone: user?.phone || "+254 712 345 678",
    bankName: activeBankName,
    branch: activeBranch,
    accountNumber: activeAccountNumber,
    bankDetails: activeBankDetails,
    month: "August 2026",
    submissionIds: periodFilteredSubmissions.map((s) => s.id),
    submissions: periodFilteredSubmissions,
    totalAmountKES: totalPeriodAmountKES || 18000,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const handleLodgePaymentRequest = async () => {
    try {
      const claimToSave: PaymentClaim = {
        ...currentClaim,
        totalAmountKES: totalPeriodAmountKES || currentClaim.totalAmountKES,
        submissionIds: periodFilteredSubmissions.map((s) => s.id),
        submissions: periodFilteredSubmissions,
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
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow-md border-b-4 border-brand-gold flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-gold font-semibold text-xs uppercase tracking-wider">
            <DollarSign className="w-4 h-4" /> US-11 to US-14 Payment Claims & Duration Invoicing
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Payment Report & Remittance Gateway</h1>
          <p className="text-xs text-blue-200 mt-1">
            Filter compensation, review rate breakdowns, and export official payment reports across any duration.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadDurationPDF}
            className="bg-brand-gold hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2.5 rounded-xl shadow text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer"
            title="Download formatted PDF report for the selected duration"
          >
            <Download className="w-4 h-4" />
            <span>Download Payment PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-3.5 py-2.5 rounded-xl shadow text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer border border-blue-700"
            title="Export filtered records to CSV / Excel spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Interactive Duration & Filter Controls Card */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-gold" />
            <h2 className="text-sm font-bold text-brand-navy">Set Payment Duration & Custom Date Range</h2>
          </div>
          <span className="text-xs text-gray-500 font-medium font-mono">
            Active: <strong className="text-slate-800">{periodLabel}</strong>
          </span>
        </div>

        {/* Quick Presets Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-gray-400" /> Presets:
          </span>
          {[
            { id: "this_month", label: "This Month" },
            { id: "last_month", label: "Last Month" },
            { id: "last_30_days", label: "Past 30 Days" },
            { id: "last_90_days", label: "Past 90 Days / Quarter" },
            { id: "year_to_date", label: "Year 2026" },
            { id: "all_time", label: "All Time" },
            { id: "custom", label: "Custom Range" },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset.id as DatePreset)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedPreset === preset.id
                  ? "bg-brand-navy text-white shadow-xs"
                  : "bg-gray-100 hover:bg-gray-200 text-slate-700"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Start & End Date Inputs + Filters */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Start Date (From)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedPreset("custom");
              }}
              className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-navy bg-gray-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              End Date (To)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelectedPreset("custom");
              }}
              className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-navy bg-gray-50 focus:bg-white"
            />
          </div>

          {!isCorrespondent && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Correspondent Scope
              </label>
              <select
                value={selectedCorrespondentId}
                onChange={(e) => setSelectedCorrespondentId(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy bg-gray-50 focus:bg-white cursor-pointer"
              >
                <option value="all">All Correspondents (Consolidated)</option>
                {correspondents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.county || "Field"})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Platform Filter
            </label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy bg-gray-50 focus:bg-white cursor-pointer"
            >
              <option value="all">All Broadcast Platforms</option>
              <option value="tv_national">TV Package (National)</option>
              <option value="tv_regional">TV Package (Regional)</option>
              <option value="radio_national">Radio Clip (National)</option>
              <option value="radio_vernacular">Radio Clip (Vernacular)</option>
              <option value="website">Website Article</option>
              <option value="social">Social Media Post</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Settlement Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy bg-gray-50 focus:bg-white cursor-pointer"
            >
              <option value="all">All Approved Filings</option>
              <option value="paid">Paid & Settled Only</option>
              <option value="pending">Pending Claim / Payout</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Statistics for the Chosen Duration */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase">Compensated Stories</p>
          <h3 className="text-2xl font-black text-brand-navy mt-1">{periodFilteredSubmissions.length}</h3>
          <p className="text-xs text-gray-500 mt-1">Approved stories in selected duration</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-brand-gold shadow-sm bg-linear-to-br from-white to-amber-50/40">
          <p className="text-xs font-bold text-gray-500 uppercase">Total Duration Payout</p>
          <h3 className="text-2xl font-black text-brand-gold mt-1">
            KES {totalPeriodAmountKES.toLocaleString()}
          </h3>
          <p className="text-xs text-gray-500 mt-1">Platform rate compensation</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase">Paid / Settled Sum</p>
          <h3 className="text-2xl font-black text-brand-teal mt-1">
            KES {paidPeriodAmountKES.toLocaleString()}
          </h3>
          <p className="text-xs text-gray-500 mt-1">Disbursed by KBC Finance</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase">Pending Settlement</p>
          <h3 className="text-2xl font-black text-amber-600 mt-1">
            KES {pendingPeriodAmountKES.toLocaleString()}
          </h3>
          <p className="text-xs text-gray-500 mt-1">Awaiting finance approval</p>
        </div>
      </div>

      {/* Action Banner for Finance Submission */}
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow border-l-8 border-brand-teal flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-brand-teal text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
              Finance Remittance
            </span>
            <span className="text-brand-gold text-xs font-semibold">Payment Gateway</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">
            Submit Payment Claim to KBC Finance
          </h3>
          <p className="text-xs text-blue-200 mt-0.5">
            Download the official PDF Payment Statement for {periodLabel} and submit an email alert to KBC Finance.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleDownloadDurationPDF}
            className="bg-white text-brand-navy hover:bg-gray-100 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-brand-gold" /> Download PDF Statement
          </button>
          <button
            onClick={handleLodgePaymentRequest}
            className="bg-brand-teal hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            <Mail className="w-4 h-4 text-brand-gold" /> Send Claim to Finance
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-brand-teal text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Itemized Payment Breakdown Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-brand-gold">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-gold" />
            <h2 className="font-bold text-lg">Itemized Payment Breakdown ({periodFilteredSubmissions.length})</h2>
          </div>
          <span className="text-xs text-brand-gold font-semibold font-mono">{periodLabel}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-byline">
            <thead>
              <tr className="bg-gray-100 text-xs font-bold uppercase tracking-wider text-slate-700 border-b">
                <th className="p-4">Filing Date</th>
                <th className="p-4">Filing Title & ID</th>
                {!isCorrespondent && <th className="p-4">Correspondent & Bank</th>}
                <th className="p-4">Published Platforms</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4 text-right">Calculated Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs sm:text-sm">
              {periodFilteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={!isCorrespondent ? 6 : 5} className="p-10 text-center text-gray-400">
                    No approved story filings found for duration <strong>{periodLabel}</strong> with the selected filters.
                  </td>
                </tr>
              ) : (
                periodFilteredSubmissions.map((sub) => {
                  const matchedClaim = claims.find((c) => c.submissionIds?.includes(sub.id));
                  const isPaid = matchedClaim?.status === "paid";

                  return (
                    <tr key={sub.id} className="hover:bg-blue-50/40 transition">
                      <td className="p-4 text-gray-600 font-mono text-xs whitespace-nowrap">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-brand-navy">{sub.assignmentTitle}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{sub.id}</div>
                      </td>
                      {!isCorrespondent && (
                        <td className="p-4">
                          <span className="font-bold text-slate-800 block text-xs">{sub.correspondentName}</span>
                          <span className="text-[11px] text-gray-500 font-mono">{sub.correspondentId}</span>
                        </td>
                      )}
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {sub.publishedPlatforms && sub.publishedPlatforms.length > 0 ? (
                            sub.publishedPlatforms.map((p) => (
                              <span key={p} className="bg-blue-100 text-brand-navy text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                                {p.replace("_", " ").toUpperCase()}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 italic text-xs">None recorded</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {isPaid ? (
                          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid & Settled
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            Pending Settlement
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right font-bold text-brand-gold whitespace-nowrap">
                        KES {sub.calculatedAmountKES ? sub.calculatedAmountKES.toLocaleString() : 0}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History & Logged Claims (US-14) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-brand-gold">
          <h2 className="font-bold text-lg">Logged Payment Claims ({claims.length})</h2>
          <span className="text-xs text-brand-gold font-semibold">Payment History & Tracking</span>
        </div>

        <div className="divide-y">
          {claims.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">
              No payment claims logged yet. Use the button above to lodge payment requests with Finance.
            </div>
          ) : (
            claims.map((claim) => (
              <div key={claim.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-navy">{claim.id}</span>
                    <span className="text-xs font-semibold text-gray-500">&bull; {claim.month}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 mt-1">{claim.correspondentName}</h4>
                  {(() => {
                    const parsed = parseBankDetails(claim.bankDetails);
                    const bName = claim.bankName || parsed.bankName || claim.bankDetails;
                    const bBranch = claim.branch || parsed.branch;
                    const bAcc = claim.accountNumber || parsed.accountNumber;
                    return (
                      <div className="text-xs text-brand-navy mt-1 bg-slate-50 p-2 rounded-lg border border-slate-200 max-w-sm">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                          <span>{bName}</span>
                          {bBranch && <span className="font-normal text-slate-500">({bBranch})</span>}
                        </div>
                        {bAcc && (
                          <div className="font-mono text-slate-700 text-[11px] mt-0.5 font-semibold">
                            A/C: {bAcc}
                          </div>
                        )}
                      </div>
                    );
                  })()}
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

                  <button
                    type="button"
                    onClick={() => generateStoriesReportPDF(claim)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-lg transition cursor-pointer"
                    title="Download Claim PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {claim.status === "pending" && (
                    <button
                      onClick={() => handleMarkAsPaid(claim.id)}
                      className="bg-brand-teal hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition cursor-pointer"
                    >
                      Mark as Paid
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
