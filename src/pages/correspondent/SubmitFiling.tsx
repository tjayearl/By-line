import { useState, useEffect, useRef } from "react";
import { 
  UploadCloud, 
  Link as LinkIcon, 
  CheckCircle2, 
  Music, 
  Video, 
  Image as ImageIcon, 
  Paperclip, 
  Send, 
  RefreshCw, 
  Trash2, 
  ExternalLink,
  Upload,
  AlertCircle,
  Edit3,
  RotateCcw,
  X,
  ArrowRight,
  Download,
  FileText
} from "lucide-react";
import { doc, getDocs, collection, setDoc, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { loadStoredData, saveStoredData, INITIAL_ASSIGNMENTS, INITIAL_SUBMISSIONS } from "../../lib/dataStore";
import { useAuth } from "../../context/AuthContext";
import { Navigate, useSearchParams, Link } from "react-router-dom";
import type { Assignment, MediaFile, Submission } from "../../types";
import MediaPreviewModal from "../../components/MediaPreviewModal";
import { readFileAsBase64, openMediaSafely, downloadMediaSafely, isPdfFile } from "../../lib/mediaHelper";

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function sanitizeFirestoreDoc<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeFirestoreDoc).filter((item) => item !== undefined) as any;
  }
  if (typeof obj === "object") {
    const clean: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        clean[k] = sanitizeFirestoreDoc(v);
      }
    }
    return clean;
  }
  return obj;
}

export default function SubmitFiling() {
  const { user } = useAuth();

  // Only Correspondents and Super Admin can submit filings
  if (!user || !["correspondent", "super_admin"].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  const [searchParams, setSearchParams] = useSearchParams();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  const [selectedAsgId, setSelectedAsgId] = useState("");
  const [storyHeadline, setStoryHeadline] = useState("");
  const [textContent, setTextContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audioClipUrl, setAudioClipUrl] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewModalFile, setPreviewModalFile] = useState<MediaFile | null>(null);

  // Hidden File Input Refs
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const generalInputRef = useRef<HTMLInputElement>(null);


  const startEditing = (sub: Submission) => {
    setEditingSubId(sub.id);
    setSelectedAsgId(sub.assignmentId || "");
    setStoryHeadline(sub.assignmentTitle || "");
    setTextContent(sub.textContent || "");
    setMediaFiles(sub.mediaFiles || []);
    if (sub.proofOfUse) {
      setProofUrl(sub.proofOfUse.url || "");
      setYoutubeUrl(sub.proofOfUse.youtubeUrl || "");
      setAudioClipUrl(sub.proofOfUse.audioClipUrl || "");
      setProofNotes(sub.proofOfUse.notes || "");
    }
    setMessage(null);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditing = () => {
    setEditingSubId(null);
    setSelectedAsgId("");
    setStoryHeadline("");
    setTextContent("");
    setMediaFiles([]);
    setProofUrl("");
    setYoutubeUrl("");
    setAudioClipUrl("");
    setProofNotes("");
    setMessage(null);
    setErrorMessage(null);
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadData = async () => {
    try {
      // 1. Assignments (merge localStorage and Firestore)
      const localAsgs = loadStoredData<Assignment[]>("byline_assignments_v1", INITIAL_ASSIGNMENTS);
      const asgMap = new Map<string, Assignment>();
      localAsgs.forEach((a) => { if (a && a.id) asgMap.set(a.id, a); });
      try {
        const snap = await getDocs(collection(db, "assignments"));
        snap.forEach((d) => {
          const a = d.data() as Assignment;
          if (a && (a.id || d.id)) {
            const id = a.id || d.id;
            const existing = asgMap.get(id);
            asgMap.set(id, { ...existing, ...a, id });
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
        console.warn("Firestore submissions lookup notice:", fsErr);
      }
      const allSubs = Array.from(subMap.values());
      saveStoredData("byline_submissions_v1", allSubs);
      setSubmissions(allSubs);

      // Check query param for edit or assignment
      const editParam = searchParams.get("edit");
      const asgParam = searchParams.get("asg");

      if (editParam) {
        const matchEdit = allSubs.find((s) => s.id === editParam);
        if (matchEdit) {
          startEditing(matchEdit);
          return;
        }
      }

      // Auto-select matching assignment if provided or found
      if (asgParam) {
        const matchAsg = allAsg.find((a) => a.id === asgParam);
        if (matchAsg) {
          setSelectedAsgId(matchAsg.id);
          setStoryHeadline(matchAsg.title);
          return;
        }
      }

      const matching = allAsg.filter((a) => {
        if (user.role !== "correspondent") return true;
        const userEmail = (user.email || "").toLowerCase().trim();
        const asgEmail = (a.correspondentEmail || "").toLowerCase().trim();
        if (asgEmail && userEmail && asgEmail === userEmail) return true;
        if (a.correspondentId && (a.correspondentId === user.uid || a.correspondentId === userEmail)) return true;
        if (a.correspondentName && user.name && a.correspondentName.toLowerCase() === user.name.toLowerCase()) return true;
        return true;
      });

      if (!editingSubId) {
        if (matching.length > 0) {
          setSelectedAsgId(matching[0].id);
          setStoryHeadline(matching[0].title);
        } else {
          setSelectedAsgId("");
        }
      }
    } catch (err) {
      console.error("Error loading assignments for filing:", err);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    const handleWindowPaste = async (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        // Prevent default paste if files were detected in clipboard
        e.preventDefault();
        await handleFilesSelected(e.clipboardData.files, "document");
      }
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("byline:data_updated", handleUpdate);
    window.addEventListener("paste", handleWindowPaste);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("byline:data_updated", handleUpdate);
      window.removeEventListener("paste", handleWindowPaste);
    };
  }, []);

  const handleAssignmentChange = (asgId: string) => {
    setSelectedAsgId(asgId);
    if (asgId) {
      const found = assignments.find((a) => a.id === asgId);
      if (found) {
        setStoryHeadline(found.title);
      }
    } else {
      setStoryHeadline("");
    }
  };

  // Upload individual file to Firebase Storage with timeout & instant persistent fallback
  const uploadSingleFile = async (file: File, fallbackType: "audio" | "video" | "image" | "document"): Promise<MediaFile> => {
    let resolvedType: "audio" | "video" | "image" | "document" = fallbackType;
    if (file.type.startsWith("audio/")) resolvedType = "audio";
    else if (file.type.startsWith("video/")) resolvedType = "video";
    else if (file.type.startsWith("image/")) resolvedType = "image";
    else resolvedType = "document";

    // 1. Read file as Base64 Data URL (for files <= 4MB) so it is persistent across reloads
    let base64DataUrl = "";
    if (file.size <= 4 * 1024 * 1024) {
      try {
        base64DataUrl = await readFileAsBase64(file);
      } catch (readErr) {
        console.warn("Base64 file read notice:", readErr);
      }
    }
    const localBlobUrl = URL.createObjectURL(file);

    // 2. Upload to Firebase Storage with a strict 3.5-second timeout
    try {
      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `submissions/${user?.uid || "corr"}/${timestamp}_${cleanFileName}`;
      const fileRef = storageRef(storage, storagePath);

      const snapshot = await Promise.race([
        uploadBytes(fileRef, file),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Storage upload timed out")), 3500)
        ),
      ]);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        name: file.name,
        url: downloadURL,
        type: resolvedType,
        size: formatFileSize(file.size),
        dataUrl: base64DataUrl || undefined,
      };
    } catch (err) {
      console.warn("Storage upload notice (persisting attachment locally):", err);
      return {
        name: file.name,
        url: base64DataUrl || localBlobUrl,
        type: resolvedType,
        size: formatFileSize(file.size),
        dataUrl: base64DataUrl || undefined,
      };
    }
  };

  const handleFilesSelected = async (files: FileList | null, fallbackType: "audio" | "video" | "image" | "document") => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      const fileArray = Array.from(files);
      // Process all selected files concurrently in parallel
      const uploadedList = await Promise.all(
        fileArray.map((file) => uploadSingleFile(file, fallbackType))
      );

      setMediaFiles((prev) => [...prev, ...uploadedList]);
      setMessage(`Successfully attached ${uploadedList.length} media file(s).`);
    } catch (err: any) {
      console.error("File selection error:", err);
      setErrorMessage(`Failed to attach files: ${err?.message || "Please try again."}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFilesSelected(e.dataTransfer.files, "document");
    }
  };

  const handleRemoveFile = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitFiling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent.trim() && mediaFiles.length === 0) {
      setErrorMessage("Please enter story text copy or attach at least one field media file (Audio, Video, Photo).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      let targetAsgId = selectedAsgId;
      let matchedAsg = assignments.find((a) => a.id === targetAsgId);

      if (!targetAsgId) {
        const found = assignments.find((a) => {
          if (!a.title || !storyHeadline) return false;
          const h = storyHeadline.trim().toLowerCase();
          const t = a.title.trim().toLowerCase();
          return h === t || h.includes(t) || t.includes(h);
        });
        if (found) {
          targetAsgId = found.id;
          matchedAsg = found;
        }
      }

      const finalTitle = storyHeadline.trim() || (matchedAsg ? matchedAsg.title : "Custom Story Filing");

      const proofObj: Record<string, string> = {};
      if (proofUrl.trim()) proofObj.url = proofUrl.trim();
      if (youtubeUrl.trim()) proofObj.youtubeUrl = youtubeUrl.trim();
      if (audioClipUrl.trim()) proofObj.audioClipUrl = audioClipUrl.trim();
      if (proofNotes.trim()) proofObj.notes = proofNotes.trim();
      if (Object.keys(proofObj).length > 0) {
        proofObj.submittedAt = new Date().toISOString();
      }

      if (editingSubId) {
        // Updating an existing submission
        const existing = submissions.find((s) => s.id === editingSubId);
        const updatedSub: Submission = {
          id: editingSubId,
          assignmentId: targetAsgId || "",
          assignmentTitle: finalTitle,
          correspondentId: existing?.correspondentId || user?.uid || user?.email || "corr-101",
          correspondentName: existing?.correspondentName || user?.name || user?.email || "Correspondent",
          textContent: textContent.trim(),
          mediaFiles: mediaFiles.map((m) => ({
            name: m.name || "file",
            url: m.url || "",
            type: m.type || "document",
            size: m.size || "0 B",
          })),
          submittedAt: new Date().toISOString(),
          status: "pending_review",
          editorialFeedback: existing?.editorialFeedback ? `${existing.editorialFeedback} (Updated & re-submitted)` : undefined,
          publishedPlatforms: existing?.publishedPlatforms || [],
          isPublished: existing?.isPublished || false,
          proofConfirmed: false,
          calculatedAmountKES: existing?.calculatedAmountKES || 0,
          ...(Object.keys(proofObj).length > 0 ? { proofOfUse: proofObj as any } : {}),
        };

        // 1. Update Firestore
        try {
          const cleanDoc = sanitizeFirestoreDoc(updatedSub);
          await setDoc(doc(db, "submissions", editingSubId), cleanDoc);
          if (targetAsgId) {
            try {
              await updateDoc(doc(db, "assignments", targetAsgId), { status: "submitted" });
            } catch (asgErr) {
              console.warn("Could not update assignment in firestore:", asgErr);
            }
          }
        } catch (fsErr) {
          console.warn("Firestore update submission notice:", fsErr);
        }

        // 2. Update local storage
        const updatedSubs = submissions.map((s) => (s.id === editingSubId ? updatedSub : s));
        setSubmissions(updatedSubs);
        saveStoredData("byline_submissions_v1", updatedSubs);

        if (targetAsgId) {
          const currentAsgs = loadStoredData<Assignment[]>("byline_assignments_v1", []);
          const updatedAsgs = currentAsgs.map((a) =>
            a.id === targetAsgId ? { ...a, status: "submitted" as const } : a
          );
          setAssignments(updatedAsgs);
          saveStoredData("byline_assignments_v1", updatedAsgs);
        }

        // 3. Broadcast data update
        try {
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new CustomEvent("byline:data_updated"));
        } catch {}

        setMessage(`Story Filing [${editingSubId}] "${updatedSub.assignmentTitle}" updated and re-submitted to Desk Editor successfully!`);
        cancelEditing();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // Create brand new filing
        const existingNums = submissions
          .map((s) => {
            const m = s.id.match(/\d+$/);
            return m ? parseInt(m[0], 10) : 0;
          })
          .filter((n) => !isNaN(n));
        const nextNum = (existingNums.length > 0 ? Math.max(...existingNums) : submissions.length) + 1;
        const subId = `SUB-2026-${String(nextNum).padStart(3, "0")}`;

        const newSub: Submission = {
          id: subId,
          assignmentId: targetAsgId || "",
          assignmentTitle: finalTitle,
          correspondentId: user?.uid || user?.email || "corr-101",
          correspondentName: user?.name || user?.email || "Correspondent",
          textContent: textContent.trim(),
          mediaFiles: mediaFiles.map((m) => ({
            name: m.name || "file",
            url: m.url || "",
            type: m.type || "document",
            size: m.size || "0 B",
          })),
          submittedAt: new Date().toISOString(),
          status: "pending_review",
          publishedPlatforms: [],
          isPublished: false,
          proofConfirmed: false,
          calculatedAmountKES: 0,
          ...(Object.keys(proofObj).length > 0 ? { proofOfUse: proofObj as any } : {}),
        };

        // 1. Save to Firestore
        try {
          const cleanDoc = sanitizeFirestoreDoc(newSub);
          await setDoc(doc(db, "submissions", subId), cleanDoc);
          if (targetAsgId) {
            try {
              await updateDoc(doc(db, "assignments", targetAsgId), { status: "submitted" });
            } catch (asgErr) {
              console.warn("Could not update assignment in firestore:", asgErr);
            }
          }
        } catch (fsErr) {
          console.warn("Firestore save submission notice:", fsErr);
        }

        // 2. Save to local storage
        const updatedSubs = [newSub, ...submissions.filter((s) => s.id !== subId)];
        setSubmissions(updatedSubs);
        saveStoredData("byline_submissions_v1", updatedSubs);

        // Update local assignment status
        if (targetAsgId) {
          const currentAsgs = loadStoredData<Assignment[]>("byline_assignments_v1", []);
          const updatedAsgs = currentAsgs.map((a) =>
            a.id === targetAsgId ? { ...a, status: "submitted" as const } : a
          );
          setAssignments(updatedAsgs);
          saveStoredData("byline_assignments_v1", updatedAsgs);
        }

        // 3. Broadcast data update
        try {
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new CustomEvent("byline:data_updated"));
        } catch {}

        setMessage(`Story Filing [${subId}] "${newSub.assignmentTitle}" submitted successfully! Desk editors have received this in their Review Queue.`);
        setTextContent("");
        setMediaFiles([]);
        setProofUrl("");
        setYoutubeUrl("");
        setAudioClipUrl("");
        setProofNotes("");
        setStoryHeadline("");
        setSelectedAsgId("");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err: any) {
      console.error("Failed to submit filing:", err);
      setErrorMessage(`Error submitting filing: ${err?.message || "Please try again."}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  const userEmailLower = (user?.email || "").toLowerCase().trim();

  // Filter available assignments for this user
  const availableAssignments = assignments.filter((a) => {
    if (user.role !== "correspondent") return true;
    const asgEmail = (a.correspondentEmail || "").toLowerCase().trim();
    if (asgEmail && userEmailLower && asgEmail === userEmailLower) return true;
    if (a.correspondentId && (a.correspondentId === user.uid || a.correspondentId === userEmailLower)) return true;
    if (a.correspondentName && user.name && a.correspondentName.toLowerCase() === user.name.toLowerCase()) return true;
    return false;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-brand-navy text-white p-6 rounded-2xl shadow-md border-b-4 border-brand-gold flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-gold font-semibold text-xs uppercase tracking-wider">
            <UploadCloud className="w-4 h-4" /> US-06 & US-09 Multi-Format Filing & Proof of Use
          </div>
          <h1 className="text-2xl font-black text-white mt-1">
            {editingSubId ? `Edit Story Filing (${editingSubId})` : "Submit Story Filing"}
          </h1>
          <p className="text-xs text-blue-200 mt-1">
            File text stories, upload field media (audio/video/photos), and attach proof of broadcast/publication.
          </p>
        </div>

        {editingSubId && (
          <button
            type="button"
            onClick={cancelEditing}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancel Edit</span>
          </button>
        )}
      </div>

      {editingSubId && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-4 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold">
            <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>You are editing draft [<strong>{editingSubId}</strong>]. Changes will update the existing submission in the Desk Editor's queue.</span>
          </div>
          <button
            type="button"
            onClick={cancelEditing}
            className="text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer shrink-0"
          >
            Switch to New Filing
          </button>
        </div>
      )}

      {message && (
        <div className="p-4 bg-brand-teal text-white rounded-2xl shadow-md text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-brand-gold" />
            <span>{message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/"
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
            >
              <span>View in Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => setMessage(null)}
              className="text-white hover:opacity-80 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-brand-red text-white rounded-2xl shadow-md text-sm flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-white hover:opacity-80 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmitFiling} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={audioInputRef}
          onChange={(e) => {
            handleFilesSelected(e.target.files, "audio");
            e.target.value = "";
          }}
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
          multiple
          className="hidden"
        />
        <input
          type="file"
          ref={videoInputRef}
          onChange={(e) => {
            handleFilesSelected(e.target.files, "video");
            e.target.value = "";
          }}
          accept="video/*,.mp4,.mov,.avi,.mkv,.webm"
          multiple
          className="hidden"
        />
        <input
          type="file"
          ref={imageInputRef}
          onChange={(e) => {
            handleFilesSelected(e.target.files, "image");
            e.target.value = "";
          }}
          accept="image/*,.jpg,.jpeg,.png,.webp,.gif"
          multiple
          className="hidden"
        />
        <input
          type="file"
          ref={docInputRef}
          onChange={(e) => {
            handleFilesSelected(e.target.files, "document");
            e.target.value = "";
          }}
          accept=".pdf,.doc,.docx,.txt"
          multiple
          className="hidden"
        />
        <input
          type="file"
          ref={generalInputRef}
          onChange={(e) => {
            handleFilesSelected(e.target.files, "document");
            e.target.value = "";
          }}
          multiple
          className="hidden"
        />

        {/* Assignment Link Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Link to Commissioned Story Assignment
          </label>
          <select
            value={selectedAsgId}
            onChange={(e) => handleAssignmentChange(e.target.value)}
            className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy"
          >
            <option value="">-- Direct Pitch / Breaking News Filing (No Pre-Assignment) --</option>
            {availableAssignments.map((a) => (
              <option key={a.id} value={a.id}>
                [{a.id}] {a.title} &bull; Deadline: {new Date(a.deadline).toLocaleDateString()}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Select a commissioned story brief to automatically link your submission, or choose Direct Pitch for breaking field reports.
          </p>
        </div>

        {/* Story Headline / Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Story Headline / Working Title <span className="text-brand-red">*</span>
          </label>
          <input
            type="text"
            required
            value={storyHeadline}
            onChange={(e) => setStoryHeadline(e.target.value)}
            placeholder="e.g. Nakuru Farmers Celebrate Revival of Pyrethrum Subsidies"
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy font-semibold text-slate-900 placeholder:text-gray-400 placeholder:font-normal"
          />
          <p className="text-xs text-gray-500 mt-1">
            Provide a descriptive headline for your filing (pre-filled if linked to an assignment above).
          </p>
        </div>

        {/* Text Story Submission */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Text Story / News Copy Draft
          </label>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            rows={7}
            placeholder="DATELINE, LOCATION — Enter full written news dispatch, cue sheets, intro, soundbite transcriptions, and reporter sign-off..."
            className="w-full border rounded-xl p-4 text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-brand-navy leading-relaxed placeholder:text-gray-400"
          />
        </div>

        {/* Field Media Uploads (Audio / Video / Photos) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Field Media Uploads (Audio / Video / Photos)
            </label>
            <span className="text-[11px] text-brand-navy font-semibold">
              {mediaFiles.length} file(s) attached
            </span>
          </div>

          {/* Media Pickers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              disabled={isUploading}
              className="p-3 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded-xl flex flex-col items-center gap-1.5 transition text-brand-navy cursor-pointer disabled:opacity-50"
            >
              <Music className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-bold">Add Audio Clip</span>
              <span className="text-[10px] text-gray-500">MP3, WAV, AAC</span>
            </button>

            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploading}
              className="p-3 bg-purple-50/80 hover:bg-purple-100 border border-purple-200 rounded-xl flex flex-col items-center gap-1.5 transition text-purple-900 cursor-pointer disabled:opacity-50"
            >
              <Video className="w-5 h-5 text-purple-600" />
              <span className="text-xs font-bold">Add Video Footage</span>
              <span className="text-[10px] text-gray-500">MP4, MOV, MKV</span>
            </button>

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploading}
              className="p-3 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex flex-col items-center gap-1.5 transition text-emerald-900 cursor-pointer disabled:opacity-50"
            >
              <ImageIcon className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold">Add Photos</span>
              <span className="text-[10px] text-gray-500">JPG, PNG, WEBP</span>
            </button>

            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              disabled={isUploading}
              className="p-3 bg-amber-50/80 hover:bg-amber-100 border border-amber-200 rounded-xl flex flex-col items-center gap-1.5 transition text-amber-900 cursor-pointer disabled:opacity-50"
            >
              <Paperclip className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-bold">Add Document</span>
              <span className="text-[10px] text-gray-500">PDF, DOCX, TXT</span>
            </button>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => generalInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
              isDragging
                ? "border-brand-gold bg-amber-50/50"
                : "border-gray-300 hover:border-brand-navy bg-gray-50/50 hover:bg-blue-50/30"
            }`}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Drag & drop files here, or click to browse any file</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Supports audio clips, raw footage, photos, and background documents</p>
          </div>

          {/* Uploading Status Indicator */}
          {isUploading && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs font-medium text-brand-navy animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-gold" />
              <span>Uploading and attaching selected files...</span>
            </div>
          )}

          {/* Attached Files List */}
          <div className="mt-3">
            {mediaFiles.length > 0 ? (
              <div className="space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Attached Media Files ({mediaFiles.length})</span>
                  <button
                    type="button"
                    onClick={() => setMediaFiles([])}
                    className="text-[11px] text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
                {mediaFiles.map((file, i) => {
                  const isPdf = isPdfFile(file);
                  return (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-white p-3 rounded-xl border border-gray-200 shadow-xs hover:border-gray-300 transition gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="p-2 rounded-lg bg-gray-100 shrink-0 text-brand-navy">
                          {isPdf ? (
                            <FileText className="w-4 h-4 text-rose-600" />
                          ) : file.type === "audio" ? (
                            <Music className="w-4 h-4 text-blue-600" />
                          ) : file.type === "video" ? (
                            <Video className="w-4 h-4 text-purple-600" />
                          ) : file.type === "image" ? (
                            <ImageIcon className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Paperclip className="w-4 h-4 text-amber-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-800 block truncate max-w-xs sm:max-w-md" title={file.name}>
                            {file.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-500 uppercase bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                              {isPdf ? "PDF Document" : file.type} &bull; {file.size || "File"}
                            </span>
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Attached
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => openMediaSafely(file)}
                          className="bg-brand-navy hover:bg-blue-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                          title={isPdf ? "View PDF in new tab" : "Open file in new tab"}
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-brand-gold" />
                          <span>{isPdf ? "View PDF" : "Open in New Tab"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadMediaSafely(file)}
                          className="text-slate-700 hover:text-brand-navy bg-gray-50 hover:bg-gray-100 p-1.5 rounded-lg border border-gray-200 transition cursor-pointer"
                          title="Download file copy"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(i)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition cursor-pointer border border-transparent hover:border-red-200"
                          title="Remove attached file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              !isUploading && (
                <div className="p-3 bg-gray-50/80 rounded-xl border border-dashed text-center text-xs text-gray-400">
                  No field media attached yet. Choose files using the buttons above.
                </div>
              )
            )}
          </div>
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

        {/* Submit / Update Button */}
        <button
          type="submit"
          disabled={loading || isUploading}
          className="w-full bg-brand-navy hover:bg-blue-900 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-brand-gold" />
          ) : editingSubId ? (
            <Edit3 className="w-4 h-4 text-brand-gold" />
          ) : (
            <Send className="w-4 h-4 text-brand-gold" />
          )}
          <span>
            {loading
              ? editingSubId ? "Updating Filing..." : "Submitting Filing..."
              : editingSubId ? "Update & Re-Submit Story Filing" : "Submit Story Filing to Desk Editor"}
          </span>
        </button>
      </form>

      {/* Interactive Media & Document Preview Modal */}
      <MediaPreviewModal
        file={previewModalFile}
        onClose={() => setPreviewModalFile(null)}
      />
    </div>
  );
}