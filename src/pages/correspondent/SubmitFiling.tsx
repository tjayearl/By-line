import { useState, useEffect } from "react";
import { UploadCloud, Link as LinkIcon, CheckCircle2, Music, Video, Image, Paperclip, Send, RefreshCw } from "lucide-react";
import { doc, getDocs, collection, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { loadStoredData, saveStoredData, INITIAL_ASSIGNMENTS, INITIAL_SUBMISSIONS } from "../../lib/dataStore";
import { useAuth } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";
import type { Assignment, MediaFile, Submission } from "../../types";

export default function SubmitFiling() {
  const { user } = useAuth();

  // Only Correspondents and Super Admin can submit filings
  if (!user || !["correspondent", "super_admin"].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedAsgId, setSelectedAsgId] = useState("");
  const [textContent, setTextContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([
    { name: "Field_Audio_Interview.wav", url: "#", type: "audio", size: "14.2 MB" },
  ]);
  const [proofUrl, setProofUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audioClipUrl, setAudioClipUrl] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const asgMap = new Map<string, Assignment>();
      INITIAL_ASSIGNMENTS.forEach((a) => asgMap.set(a.id, a));

      const localAsg = loadStoredData<Assignment[]>("byline_assignments_v1", []);
      localAsg.forEach((a) => asgMap.set(a.id, a));

      try {
        const snap = await getDocs(collection(db, "assignments"));
        snap.forEach((d) => {
          const a = d.data() as Assignment;
          if (a && (a.id || d.id)) {
            asgMap.set(a.id || d.id, { ...a, id: a.id || d.id });
          }
        });
      } catch (fsErr) {
        console.warn("Firestore assignments fetch notice:", fsErr);
      }

      const allAsg = Array.from(asgMap.values());
      setAssignments(allAsg);

      const loadedSubs = loadStoredData("byline_submissions_v1", INITIAL_SUBMISSIONS);
      setSubmissions(loadedSubs);

      // Auto-select first matching assignment if available
      const matching = allAsg.filter((a) => {
        if (user.role !== "correspondent") return true;
        const userEmail = (user.email || "").toLowerCase().trim();
        const asgEmail = (a.correspondentEmail || "").toLowerCase().trim();
        if (asgEmail && userEmail && asgEmail === userEmail) return true;
        if (a.correspondentId && (a.correspondentId === user.uid || a.correspondentId === userEmail)) return true;
        if (a.correspondentName && user.name && a.correspondentName.toLowerCase() === user.name.toLowerCase()) return true;
        return false;
      });

      if (matching.length > 0) {
        setSelectedAsgId(matching[0].id);
      }
    } catch (err) {
      console.error("Error loading assignments for filing:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter assignments based on user role & email / UID
  const availableAssignments = assignments.filter((a) => {
    if (user?.role !== "correspondent") return true;
    const userEmail = (user?.email || "").toLowerCase().trim();
    const asgEmail = (a.correspondentEmail || "").toLowerCase().trim();

    if (asgEmail && userEmail && asgEmail === userEmail) return true;
    if (a.correspondentId && (a.correspondentId === user?.uid || a.correspondentId === userEmail)) return true;
    if (a.correspondentName && user?.name && a.correspondentName.toLowerCase() === user.name.toLowerCase()) return true;

    return false;
  });

  const handleSimulateAddFile = (type: "audio" | "video" | "image" | "document") => {
    const ext = type === "audio" ? "mp3" : type === "video" ? "mp4" : type === "image" ? "jpg" : "pdf";
    const newFile: MediaFile = {
      name: `Field_${type}_${Date.now()}.${ext}`,
      url: "#",
      type,
      size: type === "video" ? "42.1 MB" : "5.8 MB",
    };
    setMediaFiles([...mediaFiles, newFile]);
  };

  const handleSubmitFiling = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const asg = assignments.find((a) => a.id === selectedAsgId);
      const subId = `SUB-2026-${String(submissions.length + 1).padStart(3, "0")}`;

      const newSub: Submission = {
        id: subId,
        assignmentId: selectedAsgId,
        assignmentTitle: asg ? asg.title : "Custom Story Submission",
        correspondentId: user?.uid || "corr-101",
        correspondentName: user?.name || user?.email || "Correspondent",
        textContent,
        mediaFiles,
        submittedAt: new Date().toISOString(),
        status: "pending_review",
        publishedPlatforms: [],
        isPublished: false,
        proofOfUse: (proofUrl || youtubeUrl || audioClipUrl) ? {
          url: proofUrl || undefined,
          youtubeUrl: youtubeUrl || undefined,
          audioClipUrl: audioClipUrl || undefined,
          notes: proofNotes || undefined,
          submittedAt: new Date().toISOString(),
        } : undefined,
        proofConfirmed: false,
        calculatedAmountKES: 0,
      };

      // 1. Save to Firestore
      try {
        await setDoc(doc(db, "submissions", subId), newSub);
        if (selectedAsgId) {
          await updateDoc(doc(db, "assignments", selectedAsgId), { status: "submitted" });
        }
      } catch (fsErr) {
        console.warn("Firestore save submission notice:", fsErr);
      }

      // 2. Save to local storage
      const updatedSubs = [newSub, ...submissions];
      setSubmissions(updatedSubs);
      saveStoredData("byline_submissions_v1", updatedSubs);

      // Update local assignment status
      const updatedAsg = assignments.map((a) =>
        a.id === selectedAsgId ? { ...a, status: "submitted" as const } : a
      );
      setAssignments(updatedAsg);
      saveStoredData("byline_assignments_v1", updatedAsg);

      setMessage(`Filing "${newSub.assignmentTitle}" submitted successfully! Desk editor notified.`);
      setTextContent("");
      setProofUrl("");
      setYoutubeUrl("");
      setAudioClipUrl("");
      setProofNotes("");
    } catch (err: any) {
      console.error("Failed to submit filing:", err);
      setMessage(`Error submitting filing: ${err?.message || "Please try again."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow-md border-b-4 border-brand-gold flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-gold font-semibold text-xs uppercase tracking-wider">
            <UploadCloud className="w-4 h-4" /> US-06 & US-09 Multi-Format Filing & Proof of Use
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Submit Story Filing</h1>
          <p className="text-xs text-blue-200 mt-1">
            File text stories, upload field media (audio/video/photos), and attach proof of broadcast/publication.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmitFiling} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        {/* Assignment Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Commissioned Assignment</label>
          <select
            value={selectedAsgId}
            onChange={(e) => setSelectedAsgId(e.target.value)}
            className="w-full border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy bg-white font-semibold"
            required
          >
            {availableAssignments.length === 0 ? (
              <option value="">No assignments commissioned for your account</option>
            ) : (
              availableAssignments.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.id}] {a.title}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Text Body */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Story Text Article / Dispatch</label>
          <textarea
            placeholder="Type or paste your complete story text filing here..."
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            rows={8}
            className="w-full border rounded-lg p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy leading-relaxed font-serif"
            required
          />
        </div>

        {/* Media Attachments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-700 uppercase">Field Media Uploads (Audio / Video / Photos)</label>
            <span className="text-xs text-brand-gold font-bold">Cloud Storage Integration</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <button
              type="button"
              onClick={() => handleSimulateAddFile("audio")}
              className="p-3 border rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-bold flex flex-col items-center gap-1.5 transition text-slate-700 cursor-pointer"
            >
              <Music className="w-5 h-5 text-blue-600" />
              <span>+ Audio Clip</span>
            </button>
            <button
              type="button"
              onClick={() => handleSimulateAddFile("video")}
              className="p-3 border rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-bold flex flex-col items-center gap-1.5 transition text-slate-700 cursor-pointer"
            >
              <Video className="w-5 h-5 text-purple-600" />
              <span>+ Raw Video</span>
            </button>
            <button
              type="button"
              onClick={() => handleSimulateAddFile("image")}
              className="p-3 border rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-bold flex flex-col items-center gap-1.5 transition text-slate-700 cursor-pointer"
            >
              <Image className="w-5 h-5 text-emerald-600" />
              <span>+ Field Photo</span>
            </button>
            <button
              type="button"
              onClick={() => handleSimulateAddFile("document")}
              className="p-3 border rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-bold flex flex-col items-center gap-1.5 transition text-slate-700 cursor-pointer"
            >
              <Paperclip className="w-5 h-5 text-amber-600" />
              <span>+ PDF / Brief</span>
            </button>
          </div>

          {/* Attached Files List */}
          {mediaFiles.length > 0 && (
            <div className="space-y-1.5 bg-gray-50 p-3 rounded-xl border">
              {mediaFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-teal" />
                    <span className="font-semibold text-slate-800">{file.name}</span>
                    <span className="text-[10px] text-gray-500 uppercase bg-gray-100 px-1.5 py-0.5 rounded">
                      {file.type} &bull; {file.size}
                    </span>
                  </div>
                  <span className="text-emerald-600 font-bold text-[10px]">Uploaded</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Proof of Use Section */}
        <div className="pt-4 border-t space-y-4">
          <div>
            <h3 className="text-sm font-bold text-brand-navy flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-brand-gold" />
              <span>Proof of Broadcast & Publication Links</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Provide direct links to published articles, YouTube broadcast clips, or audio soundbites for desk editor rate verification.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">KBC Web Article Link</label>
              <input
                placeholder="https://www.kbc.co.ke/article-title"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">YouTube TV Broadcast Link</label>
              <input
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Radio Clip / Podcast Cloud URL</label>
            <input
              placeholder="https://soundcloud.com/kbc/audio-clip"
              value={audioClipUrl}
              onChange={(e) => setAudioClipUrl(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Airing Confirmation Notes</label>
            <textarea
              placeholder="e.g. Aired on KBC Channel 1 7:00 PM Primetime Bulletin on 18th Aug 2026, Package lead story."
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || availableAssignments.length === 0}
          className="w-full bg-brand-navy hover:bg-blue-900 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin text-brand-gold" /> : <Send className="w-4 h-4 text-brand-gold" />}
          <span>{loading ? "Submitting Filing..." : "Submit Story Filing to Desk Editor"}</span>
        </button>
      </form>

      {message && (
        <div className="p-4 bg-brand-teal text-white rounded-xl shadow text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}