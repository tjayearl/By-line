import { useState, useEffect } from "react";
import { UploadCloud, Link as LinkIcon, CheckCircle2, Music, Video, Image, Paperclip, Send } from "lucide-react";
import { loadStoredData, saveStoredData, INITIAL_ASSIGNMENTS, INITIAL_SUBMISSIONS } from "../../lib/dataStore";
import { useAuth } from "../../context/AuthContext";
import type { Assignment, MediaFile, Submission } from "../../types";
import EditorialDirectiveNotice from "../../components/EditorialDirectiveNotice";

export default function SubmitFiling() {
  const { user } = useAuth();
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

  useEffect(() => {
    const loadedAsg = loadStoredData("byline_assignments_v1", INITIAL_ASSIGNMENTS);
    const loadedSubs = loadStoredData("byline_submissions_v1", INITIAL_SUBMISSIONS);
    setAssignments(loadedAsg);
    setSubmissions(loadedSubs);
    if (loadedAsg.length > 0) {
      setSelectedAsgId(loadedAsg[0].id);
    }
  }, []);

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

  const handleSubmitFiling = (e: React.FormEvent) => {
    e.preventDefault();
    const asg = assignments.find((a) => a.id === selectedAsgId);

    const newSub: Submission = {
      id: `SUB-2026-${String(submissions.length + 1).padStart(3, "0")}`,
      assignmentId: selectedAsgId,
      assignmentTitle: asg ? asg.title : "Custom Story Submission",
      correspondentId: user?.uid || "corr-101",
      correspondentName: user?.name || "Jane Wambui",
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

    const updated = [newSub, ...submissions];
    setSubmissions(updated);
    saveStoredData("byline_submissions_v1", updated);

    setMessage(`Filing "${newSub.assignmentTitle}" submitted successfully! Desk editor notified.`);
    setTextContent("");
    setProofUrl("");
    setYoutubeUrl("");
    setAudioClipUrl("");
    setProofNotes("");
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

      <EditorialDirectiveNotice />

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
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                [{a.id}] {a.title}
              </option>
            ))}
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
            className="w-full border rounded-lg p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy font-sans leading-relaxed"
            required
          />
        </div>

        {/* Media Attachments */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase">Attach Field Media Files</label>
            <span className="text-xs text-gray-500">Audio (MP3/WAV), Video (MP4), Photos (JPG)</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSimulateAddFile("audio")}
              className="bg-brand-navy text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-900"
            >
              <Music className="w-3.5 h-3.5 text-brand-gold" /> + Audio Clip
            </button>
            <button
              type="button"
              onClick={() => handleSimulateAddFile("video")}
              className="bg-brand-navy text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-900"
            >
              <Video className="w-3.5 h-3.5 text-brand-gold" /> + Video Package
            </button>
            <button
              type="button"
              onClick={() => handleSimulateAddFile("image")}
              className="bg-brand-navy text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-900"
            >
              <Image className="w-3.5 h-3.5 text-brand-gold" /> + Photo
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-2 pt-1">
            {mediaFiles.map((f, i) => (
              <div key={i} className="p-3 bg-brand-offwhite rounded-xl border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-brand-navy" />
                  <div>
                    <p className="font-bold text-slate-900">{f.name}</p>
                    <p className="text-[10px] text-gray-500 uppercase">{f.type} &bull; {f.size}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMediaFiles(mediaFiles.filter((_, idx) => idx !== i))}
                  className="text-brand-red font-bold text-xs hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Proof of Use Links (US-09) */}
        <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200 space-y-4">
          <div>
            <h3 className="font-bold text-brand-navy text-sm flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-brand-gold" />
              <span>Attach Proof of Use / Broadcast Links (US-09)</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Provide evidence of publication or broadcast (e.g. kbc.co.ke URL, YouTube clip, or radio broadcast link). Verified evidence triggers payment calculation!
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Website Article URL</label>
              <input
                type="url"
                placeholder="https://www.kbc.co.ke/your-story-headline"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                className="w-full border rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">YouTube Broadcast / Channel 1 Link</label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=kbc_broadcast_id"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="w-full border rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Radio Broadcast Audio Clip URL</label>
              <input
                type="url"
                placeholder="https://kbc.co.ke/audio/mayienga_broadcast.mp3"
                value={audioClipUrl}
                onChange={(e) => setAudioClipUrl(e.target.value)}
                className="w-full border rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Broadcast Notes</label>
              <input
                placeholder="e.g. Aired on KBC Channel 1 7PM Bulletin and Mayienga FM 4PM Broadcast"
                value={proofNotes}
                onChange={(e) => setProofNotes(e.target.value)}
                className="w-full border rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-brand-navy hover:bg-blue-900 text-white font-bold py-3 rounded-xl shadow transition flex items-center justify-center gap-2 text-sm"
        >
          <Send className="w-4 h-4 text-brand-gold" />
          <span>Submit Official Filing to Desk Editor</span>
        </button>

        {message && (
          <div className="p-4 bg-brand-teal text-white rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </form>
    </div>
  );
}
