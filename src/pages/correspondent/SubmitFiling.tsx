import { useState } from "react";
import { UploadCloud, Link as LinkIcon, Loader2, CheckCircle2 } from "lucide-react";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) throw new Error("Upload failed: " + res.statusText);

  const data = await res.json();
  return data.secure_url as string;
}

export default function SubmitFiling() {
  const [text, setText] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setUploading(true);

    try {
      let fileUrls: string[] = [];
      if (files && files.length > 0) {
        fileUrls = await Promise.all(
          Array.from(files).map((file) => uploadToCloudinary(file))
        );
      }
      setUploadedUrls(fileUrls);
      console.log("Submission ready:", { text, proofUrl, fileUrls });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong during upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold flex items-center gap-2 mb-4">
        <UploadCloud className="w-5 h-5" /> Submit Filing
      </h1>
      <form onSubmit={handleSubmit} className="space-y-3 bg-white p-6 rounded-lg shadow-sm border">
        <textarea
          placeholder="Story text (optional if attaching audio/video)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
          rows={5}
        />
        <input
          type="file"
          multiple
          accept="audio/*,video/*,image/*"
          onChange={(e) => setFiles(e.target.files)}
          className="w-full border rounded-md px-3 py-2"
        />
        <div className="flex items-center border rounded-md px-3 py-2">
          <LinkIcon className="w-4 h-4 text-gray-400 mr-2" />
          <input
            placeholder="Proof of use URL (website / YouTube link)"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            className="flex-1 outline-none"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && (
          <p className="text-green-600 text-sm flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Submitted - {uploadedUrls.length} file(s) uploaded
          </p>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
          {uploading ? "Uploading..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
