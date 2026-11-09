import { useState, useEffect } from "react";
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  Music, 
  Video as VideoIcon, 
  Image as ImageIcon, 
  Paperclip,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2
} from "lucide-react";
import type { MediaFile } from "../types";
import { 
  getSafePreviewUrl, 
  openMediaSafely, 
  downloadMediaSafely, 
  isPdfFile,
  isWordFile
} from "../lib/mediaHelper";
import { extractDocxFromStoredDoc, type DocxExtractResult } from "../lib/docxExtractor";

interface MediaPreviewModalProps {
  file: MediaFile | null;
  onClose: () => void;
}

export default function MediaPreviewModal({ file, onClose }: MediaPreviewModalProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [loadError, setLoadError] = useState(false);
  const [wordExtract, setWordExtract] = useState<DocxExtractResult | null>(null);
  const [loadingWord, setLoadingWord] = useState(false);

  const safeUrl = file ? getSafePreviewUrl(file).safeUrl : "";

  useEffect(() => {
    let isCancelled = false;

    if (file && isWordFile(file) && file.name.toLowerCase().endsWith(".docx")) {
      queueMicrotask(() => {
        if (!isCancelled) setLoadingWord(true);
      });
      extractDocxFromStoredDoc(file)
        .then((res) => {
          if (!isCancelled) {
            setWordExtract(res);
            setLoadingWord(false);
          }
        })
        .catch((err) => {
          console.warn("Could not preview docx in modal:", err);
          if (!isCancelled) {
            setWordExtract(null);
            setLoadingWord(false);
          }
        });
    } else {
      queueMicrotask(() => {
        if (!isCancelled) {
          setWordExtract(null);
          setLoadingWord(false);
        }
      });
    }

    // Escape key listener to close modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      isCancelled = true;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [file, onClose]);

  if (!file) return null;

  const isPdf = isPdfFile(file);
  const isWord = isWordFile(file);
  const isImage = file.type === "image" || (!file.type && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name));
  const isAudio = file.type === "audio" || (!file.type && /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name));
  const isVideo = file.type === "video" || (!file.type && /\.(mp4|mov|avi|webm|mkv)$/i.test(file.name));

  const handleOpenNewWindow = () => {
    openMediaSafely(file);
  };

  const handleDownload = () => {
    downloadMediaSafely(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-brand-navy text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b-2 border-brand-gold gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-900/80 text-brand-gold shrink-0">
              {isPdf && <FileText className="w-5 h-5 text-rose-400" />}
              {isWord && <FileText className="w-5 h-5 text-blue-400" />}
              {isImage && <ImageIcon className="w-5 h-5" />}
              {isAudio && <Music className="w-5 h-5" />}
              {isVideo && <VideoIcon className="w-5 h-5" />}
              {!isPdf && !isWord && !isImage && !isAudio && !isVideo && <Paperclip className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white truncate" title={file.name}>
                {file.name}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-blue-200 mt-0.5">
                <span className="uppercase font-bold tracking-wider text-brand-gold">
                  {isPdf ? "PDF Document" : isWord ? "Word Document" : file.type || "Document"}
                </span>
                {file.size && <span>&bull; {file.size}</span>}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
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
              onClick={handleDownload}
              className="bg-brand-gold hover:bg-yellow-500 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Download file to device"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Close Preview (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer Area */}
        <div className="flex-1 overflow-auto bg-slate-900 p-2 sm:p-4 flex flex-col items-center justify-center min-h-[400px]">
          
          {/* PDF Viewer */}
          {isPdf && (
            <div className="w-full h-full flex flex-col items-center justify-center min-h-[550px] bg-slate-800 rounded-xl overflow-hidden shadow-inner relative">
              {safeUrl && !loadError ? (
                <iframe
                  src={`${safeUrl}#toolbar=1&navpanes=1&view=FitH`}
                  className="w-full h-[70vh] rounded-xl bg-white border-0"
                  title={file.name}
                  onError={() => setLoadError(true)}
                />
              ) : (
                <div className="text-center p-8 text-white space-y-4 max-w-md">
                  <AlertTriangle className="w-12 h-12 text-brand-gold mx-auto" />
                  <div>
                    <h4 className="font-bold text-base">Unable to stream PDF in viewer</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Click below to download the PDF file or open it directly in a new window.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={handleDownload}
                      className="bg-brand-gold hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Download PDF
                    </button>
                    <button
                      onClick={handleOpenNewWindow}
                      className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" /> Open Tab
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Image Viewer */}
          {isImage && (
            <div className="w-full h-full flex flex-col items-center justify-center min-h-[450px] relative overflow-hidden">
              {safeUrl && !loadError ? (
                <>
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                      className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-300 font-mono px-1">{Math.round(zoomLevel * 100)}%</span>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                      className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setZoomLevel(1)}
                      className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition"
                      title="Reset Zoom"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="overflow-auto max-h-[70vh] flex items-center justify-center p-4">
                    <img
                      src={safeUrl}
                      alt={file.name}
                      style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.15s ease-out" }}
                      className="max-h-[65vh] max-w-full rounded-lg shadow-2xl object-contain"
                      onError={() => setLoadError(true)}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center p-8 text-white space-y-4 max-w-md">
                  <AlertTriangle className="w-12 h-12 text-brand-gold mx-auto" />
                  <div>
                    <h4 className="font-bold text-base">Image Preview Unavailable</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      {loadError
                        ? "Failed to render this image stream. Click below to try downloading the original file."
                        : "This attachment was stored locally on the reporting device or cloud upload timed out."}
                    </p>
                  </div>
                  {safeUrl && (
                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        onClick={handleDownload}
                        className="bg-brand-gold hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4" /> Download Image
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Audio Player */}
          {isAudio && (
            <div className="w-full max-w-xl p-8 bg-slate-800 rounded-2xl border border-slate-700 text-center space-y-6 shadow-2xl">
              <div className="p-4 bg-blue-950/80 text-brand-gold rounded-full w-16 h-16 mx-auto flex items-center justify-center shadow-inner">
                <Music className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base truncate">{file.name}</h4>
                <p className="text-xs text-slate-400 mt-1">Field Audio Dispatch &bull; Soundbite Broadcast Master</p>
              </div>
              {safeUrl && !loadError ? (
                <>
                  <audio
                    controls
                    src={safeUrl}
                    className="w-full rounded-xl"
                    autoPlay={false}
                    onError={() => setLoadError(true)}
                  >
                    Your browser does not support audio playback.
                  </audio>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={handleDownload}
                      className="bg-brand-gold hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Download Audio File
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-300 bg-slate-900/60 p-4 rounded-xl border border-slate-700 space-y-2">
                  <p>Audio streaming unavailable for this dispatch.</p>
                  <p className="text-[11px] text-slate-400">
                    The audio was stored locally on the reporting device or cloud storage upload timed out.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Video Player */}
          {isVideo && (
            <div className="w-full max-w-3xl flex flex-col items-center justify-center space-y-4">
              {safeUrl && !loadError ? (
                <>
                  <video
                    controls
                    src={safeUrl}
                    className="w-full max-h-[65vh] rounded-xl shadow-2xl bg-black border border-slate-800"
                    autoPlay={false}
                    onError={() => setLoadError(true)}
                  >
                    Your browser does not support video playback.
                  </video>
                  <button
                    onClick={handleDownload}
                    className="bg-brand-gold hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Download Video Footage
                  </button>
                </>
              ) : (
                <div className="text-center p-8 text-white space-y-4 max-w-md bg-slate-800 rounded-2xl border border-slate-700">
                  <AlertTriangle className="w-12 h-12 text-brand-gold mx-auto" />
                  <div>
                    <h4 className="font-bold text-base">Video Footage Unavailable</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      High-resolution video footage was stored on the correspondent's device or the cloud upload timed out. Correspondents can also provide a WeTransfer link.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Word Document (.docx) Viewer */}
          {isWord && wordExtract && (
            <div className="w-full max-w-3xl flex flex-col h-[65vh] bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden text-slate-800">
              <div className="bg-slate-100 px-4 py-2 border-b flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-slate-800">{file.name}</span>
                  <span>&bull; {wordExtract.wordCount.toLocaleString()} words</span>
                </div>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                  Word Document Preview
                </span>
              </div>
              <div
                className="flex-1 overflow-y-auto p-6 text-sm leading-relaxed max-w-none bg-white font-serif space-y-3"
                dangerouslySetInnerHTML={{ __html: wordExtract.html }}
              />
            </div>
          )}

          {isWord && loadingWord && (
            <div className="p-8 text-center text-slate-300 space-y-3">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Reading Word document contents...</p>
            </div>
          )}

          {isWord && !loadingWord && !wordExtract && (
            <div className="w-full max-w-md p-8 bg-slate-800 rounded-2xl border border-slate-700 text-center space-y-4 shadow-2xl text-white">
              <FileText className="w-12 h-12 text-blue-400 mx-auto" />
              <div>
                <h4 className="font-bold text-base truncate">{file.name}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Microsoft Word Document &bull; {file.size || "File"}
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handleDownload}
                  className="bg-brand-gold hover:bg-yellow-500 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" /> Download Word Document
                </button>
              </div>
            </div>
          )}

          {/* Generic Document / Fallback */}
          {!isPdf && !isWord && !isImage && !isAudio && !isVideo && (
            <div className="w-full max-w-md p-8 bg-slate-800 rounded-2xl border border-slate-700 text-center space-y-4 shadow-2xl text-white">
              <Paperclip className="w-12 h-12 text-brand-gold mx-auto" />
              <div>
                <h4 className="font-bold text-base truncate">{file.name}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Attached Story Background Document &bull; {file.size || "File"}
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handleDownload}
                  className="bg-brand-gold hover:bg-yellow-500 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" /> Download Document
                </button>
                <button
                  onClick={handleOpenNewWindow}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" /> Open File
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2 shrink-0">
          <span className="font-medium text-slate-700">
            KBC Editorial File Viewer &bull; Verified Newsroom Asset
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="text-brand-navy hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Copy</span>
            </button>
            <button
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1 rounded-lg cursor-pointer transition"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
