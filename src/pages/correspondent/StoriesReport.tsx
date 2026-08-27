import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  ExternalLink, 
  Tv, 
  Radio, 
  Globe, 
  Share2, 
  Clock, 
  Search, 
  Filter, 
  DollarSign, 
  FileSpreadsheet, 
  Paperclip, 
  CloudDownload,
  AlertCircle,
  Calendar
} from "lucide-react";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { 
  loadStoredData, 
  INITIAL_SUBMISSIONS, 
  INITIAL_CORRESPONDENTS 
} from "../../lib/dataStore";
import { useAuth } from "../../context/AuthContext";
import { 
  generateStoriesPublicationReportPDF, 
  exportStoriesPublicationReportCSV 
} from "../../lib/pdfReportGenerator";
import type { Correspondent, Platform, Submission } from "../../types";

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

export default function StoriesReport() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [correspondents, setCorrespondents] = useState<Correspondent[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCorrespondentId, setSelectedCorrespondentId] = useState<string>("all");
  const defaultDates = getPresetDates("this_month");
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>("this_month");
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const isCorrespondent = user?.role === "correspondent";
  const userEmailLower = (user?.email || "").toLowerCase().trim();

  const loadData = async () => {
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
    setSubmissions(Array.from(subMap.values()));

    // 2. Correspondents
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
      console.warn("Firestore users notice:", fsErr);
    }
    setCorrespondents(Array.from(corrMap.values()));
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
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

  const periodLabel = useMemo(() => {
    if (selectedPreset === "all_time") return "All Time Cumulative";
    if (startDate && endDate) {
      const s = new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const e = new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `${s} to ${e}`;
    }
    if (startDate) {
      return `From ${new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    if (endDate) {
      return `Until ${new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return "All Time";
  }, [selectedPreset, startDate, endDate]);

  // Filter Submissions
  const filteredStories = useMemo(() => {
    return submissions.filter((s) => {
      // 1. Correspondent Scope
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

      // 2. Search Query (Title, ID, textContent)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (s.assignmentTitle || "").toLowerCase().includes(q);
        const matchesId = (s.id || "").toLowerCase().includes(q);
        const matchesBody = (s.textContent || "").toLowerCase().includes(q);
        const matchesNotes = (s.proofOfUse?.notes || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesId && !matchesBody && !matchesNotes) return false;
      }

      // 3. Platform Filter
      if (selectedPlatform !== "all") {
        if (!s.publishedPlatforms || !s.publishedPlatforms.includes(selectedPlatform as Platform)) {
          return false;
        }
      }

      // 4. Verification / Status Filter
      if (selectedStatus === "verified" && !s.proofConfirmed) return false;
      if (selectedStatus === "pending_proof" && s.proofConfirmed) return false;
      if (selectedStatus === "approved" && s.status !== "approved") return false;

      // 5. Date Window / Duration Filter
      if (selectedPreset !== "all_time" && (startDate || endDate)) {
        const rawDate = s.submittedAt || s.publishedAt || "2026-08-01";
        try {
          const subDateObj = new Date(rawDate);
          if (!isNaN(subDateObj.getTime())) {
            const subDateStr = subDateObj.toISOString().split("T")[0];
            if (startDate && subDateStr < startDate) return false;
            if (endDate && subDateStr > endDate) return false;
          }
        } catch {
          // ignore date parse errors
        }
      }

      return true;
    });
  }, [submissions, isCorrespondent, user, userEmailLower, selectedCorrespondentId, correspondents, searchQuery, selectedPlatform, selectedStatus, selectedPreset, startDate, endDate]);

  // Statistics
  const totalVerifiedCount = useMemo(() => {
    return filteredStories.filter((s) => s.proofConfirmed).length;
  }, [filteredStories]);

  const tvAiredCount = useMemo(() => {
    return filteredStories.filter((s) => 
      s.publishedPlatforms?.includes("tv_national") || s.publishedPlatforms?.includes("tv_regional")
    ).length;
  }, [filteredStories]);

  const radioAiredCount = useMemo(() => {
    return filteredStories.filter((s) => 
      s.publishedPlatforms?.includes("radio_national") || s.publishedPlatforms?.includes("radio_vernacular")
    ).length;
  }, [filteredStories]);

  const webSocialCount = useMemo(() => {
    return filteredStories.filter((s) => 
      s.publishedPlatforms?.includes("website") || s.publishedPlatforms?.includes("social")
    ).length;
  }, [filteredStories]);

  // Download Stories Report PDF
  const handleDownloadPDF = () => {
    const scopeName = isCorrespondent 
      ? (user?.name || "Correspondent")
      : selectedCorrespondentId !== "all"
        ? (correspondents.find((c) => c.id === selectedCorrespondentId)?.name || "Selected Correspondent")
        : "All Correspondents";

    generateStoriesPublicationReportPDF({
      correspondentName: scopeName,
      correspondentEmail: user?.email,
      periodLabel: periodLabel,
      submissions: filteredStories,
      generatedBy: user?.name || "KBC News Desk",
    });

    setActionMessage(`Downloaded Stories Report PDF for (${periodLabel}) with ${filteredStories.length} published stories!`);
  };

  // Export Stories CSV
  const handleExportCSV = () => {
    const scopeName = isCorrespondent 
      ? (user?.name || "Correspondent")
      : selectedCorrespondentId !== "all"
        ? (correspondents.find((c) => c.id === selectedCorrespondentId)?.name || "Selected")
        : "All";

    exportStoriesPublicationReportCSV({
      correspondentName: scopeName,
      submissions: filteredStories,
      periodLabel: periodLabel,
    });

    setActionMessage(`Exported Stories Report CSV for (${periodLabel}) with ${filteredStories.length} records!`);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow-md border-b-4 border-brand-gold flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-gold font-semibold text-xs uppercase tracking-wider">
            <FileText className="w-4 h-4" /> US-05 / US-10 Published Stories & Broadcast Airing Archive
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Published Stories & Airing Report</h1>
          <p className="text-xs text-blue-200 mt-1">
            Complete editorial archive of your filed stories, where they were broadcast, and direct verification links.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadPDF}
            className="bg-brand-gold hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2.5 rounded-xl shadow text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer"
            title="Download published stories report PDF with links & platform details"
          >
            <Download className="w-4 h-4" />
            <span>Download Stories PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-3.5 py-2.5 rounded-xl shadow text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer border border-blue-700"
            title="Export stories to CSV / Excel spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <Link
            to="/payment-report"
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-3.5 py-2.5 rounded-xl shadow text-xs sm:text-sm flex items-center gap-2 transition"
            title="Switch to duration-based Payment Report"
          >
            <DollarSign className="w-4 h-4 text-yellow-300" />
            <span>Go to Payment Report</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase">Total Stories Displayed</p>
          <h3 className="text-2xl font-black text-brand-navy mt-1">{filteredStories.length}</h3>
          <p className="text-xs text-gray-500 mt-1">Filed by correspondent</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
            <Tv className="w-3.5 h-3.5 text-blue-600" /> TV Broadcasts
          </p>
          <h3 className="text-2xl font-black text-brand-navy mt-1">{tvAiredCount}</h3>
          <p className="text-xs text-gray-500 mt-1">National & Regional TV packages</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-purple-600" /> Radio Airings
          </p>
          <h3 className="text-2xl font-black text-brand-navy mt-1">{radioAiredCount}</h3>
          <p className="text-xs text-gray-500 mt-1">National & Vernacular radio feeds</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-teal-500/40 shadow-sm bg-linear-to-br from-white to-emerald-50/40">
          <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal" /> Proof Verified
          </p>
          <h3 className="text-2xl font-black text-brand-teal mt-1">{totalVerifiedCount}</h3>
          <p className="text-xs text-gray-500 mt-1">{webSocialCount} Web/Social articles & clips</p>
        </div>
      </div>

      {/* Interactive Duration & Filter Controls Card */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-gold" />
            <h2 className="text-sm font-bold text-brand-navy">Set Stories Duration & Date Range</h2>
          </div>
          <span className="text-xs text-gray-500 font-medium font-mono">
            Active: <strong className="text-slate-800">{periodLabel}</strong> (Showing <strong className="text-slate-900">{filteredStories.length}</strong> stories)
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
          {/* Start Date (From) */}
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

          {/* End Date (To) */}
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

          {/* Where Published (Platform Filter) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Where Published (Platform)
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

          {/* Verification Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Proof & Verification
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy bg-gray-50 focus:bg-white cursor-pointer"
            >
              <option value="all">All Proof Statuses</option>
              <option value="verified">Verified Proof Only</option>
              <option value="pending_proof">Pending Broadcast Proof</option>
              <option value="approved">Approved Filings Only</option>
            </select>
          </div>

          {/* Search Box */}
          <div className={!isCorrespondent ? "sm:col-span-2 md:col-span-2" : "sm:col-span-2 md:col-span-4"}>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Search Story / Headline
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search headlines, keywords, story ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy bg-gray-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Correspondent Scope (If not single correspondent) */}
          {!isCorrespondent && (
            <div className="sm:col-span-2 md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Filter by Correspondent
              </label>
              <select
                value={selectedCorrespondentId}
                onChange={(e) => setSelectedCorrespondentId(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy bg-gray-50 focus:bg-white cursor-pointer"
              >
                <option value="all">All Correspondents (All Bureaus)</option>
                {correspondents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.county || "Field Bureau"} ({c.email})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-brand-teal text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Stories List Feed */}
      <div className="space-y-4">
        {filteredStories.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-500 shadow-sm space-y-2">
            <FileText className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-base">No Published Stories Found</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              No filed stories match your current filters. Try changing the platform, verification status, or search terms.
            </p>
          </div>
        ) : (
          filteredStories.map((story, index) => {
            const hasWebLink = !!story.proofOfUse?.url;
            const hasYoutubeLink = !!story.proofOfUse?.youtubeUrl;
            const hasAudioLink = !!story.proofOfUse?.audioClipUrl;
            const hasWeTransfer = !!story.wetransferUrl;
            const hasMediaFiles = story.mediaFiles && story.mediaFiles.length > 0;
            const hasAnyLink = hasWebLink || hasYoutubeLink || hasAudioLink || hasWeTransfer || hasMediaFiles;

            return (
              <div 
                key={story.id} 
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition p-6 space-y-4"
              >
                {/* Top Bar: Headline, ID, Date, Verification Badge */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-brand-navy bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                        {story.id}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        Filed: {new Date(story.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      {!isCorrespondent && (
                        <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          Author: {story.correspondentName}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-slate-900 mt-1.5">
                      {index + 1}. {story.assignmentTitle}
                    </h3>
                  </div>

                  <div className="shrink-0">
                    {story.proofConfirmed ? (
                      <span className="bg-brand-teal text-white text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Proof Verified
                      </span>
                    ) : (
                      <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-xs">
                        <AlertCircle className="w-3.5 h-3.5" /> Pending Airing Proof
                      </span>
                    )}
                  </div>
                </div>

                {/* Story Excerpt / Brief Content */}
                {story.textContent && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100 line-clamp-3 leading-relaxed">
                    {story.textContent}
                  </p>
                )}

                {/* WHERE IT WAS PUBLISHED (Platforms Aired) */}
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-brand-navy flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-brand-gold" />
                    <span>Where It Was Published (Aired Platforms)</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {story.publishedPlatforms && story.publishedPlatforms.length > 0 ? (
                      story.publishedPlatforms.map((platform) => {
                        let icon = <Tv className="w-3.5 h-3.5" />;
                        let colorClass = "bg-blue-600 text-white";

                        if (platform === "tv_national") {
                          icon = <Tv className="w-3.5 h-3.5 text-white" />;
                          colorClass = "bg-blue-700 text-white";
                        } else if (platform === "tv_regional") {
                          icon = <Tv className="w-3.5 h-3.5 text-white" />;
                          colorClass = "bg-indigo-700 text-white";
                        } else if (platform === "radio_national") {
                          icon = <Radio className="w-3.5 h-3.5 text-white" />;
                          colorClass = "bg-purple-700 text-white";
                        } else if (platform === "radio_vernacular") {
                          icon = <Radio className="w-3.5 h-3.5 text-white" />;
                          colorClass = "bg-violet-700 text-white";
                        } else if (platform === "website") {
                          icon = <Globe className="w-3.5 h-3.5 text-white" />;
                          colorClass = "bg-teal-700 text-white";
                        } else if (platform === "social") {
                          icon = <Share2 className="w-3.5 h-3.5 text-white" />;
                          colorClass = "bg-pink-700 text-white";
                        }

                        return (
                          <span 
                            key={platform} 
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold shadow-xs ${colorClass}`}
                          >
                            {icon}
                            <span>{platform.replace("_", " ").toUpperCase()}</span>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-gray-400 italic">No broadcast platforms recorded yet</span>
                    )}
                  </div>

                  {/* Airing Bulletin Notes */}
                  {story.proofOfUse?.notes && (
                    <div className="pt-2 text-xs text-slate-700 font-medium">
                      <span className="font-bold text-slate-900">Broadcast / Airing Bulletin: </span>
                      <span className="italic">"{story.proofOfUse.notes}"</span>
                    </div>
                  )}
                </div>

                {/* DIRECT LINKS TO STORIES */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-brand-gold" />
                      <span>Direct Links to Story & Broadcast Proof</span>
                    </div>
                    {hasAnyLink && (
                      <span className="text-[10px] text-brand-teal font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        Interactive Links Available
                      </span>
                    )}
                  </div>

                  {hasAnyLink ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {/* Web Article Link */}
                      {hasWebLink && (
                        <a
                          href={story.proofOfUse!.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white hover:bg-blue-50 text-brand-navy border border-blue-300 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition"
                          title="Open KBC Online Article"
                        >
                          <Globe className="w-3.5 h-3.5 text-teal-600" />
                          <span>KBC Web Article</span>
                          <ExternalLink className="w-3 h-3 text-gray-400" />
                        </a>
                      )}

                      {/* YouTube TV Broadcast Link */}
                      {hasYoutubeLink && (
                        <a
                          href={story.proofOfUse!.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition"
                          title="Watch Broadcast on YouTube / KBC Channel 1"
                        >
                          <Tv className="w-3.5 h-3.5 text-rose-600" />
                          <span>YouTube TV Clip</span>
                          <ExternalLink className="w-3 h-3 text-rose-400" />
                        </a>
                      )}

                      {/* Radio Audio Stream Link */}
                      {hasAudioLink && (
                        <a
                          href={story.proofOfUse!.audioClipUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white hover:bg-purple-50 text-purple-800 border border-purple-300 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition"
                          title="Listen to Radio Broadcast Audio"
                        >
                          <Radio className="w-3.5 h-3.5 text-purple-600" />
                          <span>Radio Audio Stream</span>
                          <ExternalLink className="w-3 h-3 text-purple-400" />
                        </a>
                      )}

                      {/* WeTransfer / Cloud Media Link */}
                      {hasWeTransfer && (
                        <a
                          href={story.wetransferUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white hover:bg-sky-50 text-sky-900 border border-sky-300 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition"
                          title="Download Raw Media via WeTransfer"
                        >
                          <CloudDownload className="w-3.5 h-3.5 text-sky-600" />
                          <span>WeTransfer Media Link</span>
                          <ExternalLink className="w-3 h-3 text-sky-400" />
                        </a>
                      )}

                      {/* Attached Files Badge */}
                      {hasMediaFiles && (
                        <div className="bg-white text-slate-700 border border-gray-300 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs">
                          <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                          <span>{story.mediaFiles.length} Attached File(s)</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic py-1">
                      No external publication links or web URLs recorded for this story filing yet.
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
