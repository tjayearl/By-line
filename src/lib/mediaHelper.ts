/**
 * Media and Document Helper for KBC Byline Portal
 * Handles Base64 conversion, fresh Blob URL creation, safe new-tab opening,
 * and reliable file downloading across modern browsers.
 */

/**
 * Converts a File object to a persistent Base64 Data URL.
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert file to Base64 string"));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a Base64 Data URL into a binary Blob object with precise MIME detection.
 */
export function dataUrlToBlob(dataUrl: string, defaultMime = "application/octet-stream"): Blob {
  try {
    const parts = dataUrl.split(",");
    const header = parts[0];
    const base64Data = parts[1] || "";
    const mimeMatch = header.match(/:(.*?);/);
    let mime = mimeMatch ? mimeMatch[1] : "";

    // Override generic or empty mime with provided defaultMime if available
    if ((!mime || mime === "application/octet-stream" || mime === "binary/octet-stream") && defaultMime) {
      mime = defaultMime;
    }
    if (!mime) {
      mime = "application/octet-stream";
    }

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([byteNumbers], { type: mime });
  } catch (err) {
    console.error("Error converting Data URL to Blob:", err);
    return new Blob([dataUrl], { type: defaultMime || "application/octet-stream" });
  }
}

/**
 * Checks if a string is a Base64 Data URL.
 */
export function isDataUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith("data:");
}

/**
 * Checks if a URL is an expired or dead session blob URL.
 */
export function isBlobUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith("blob:");
}

/**
 * Checks if a file or URL represents a PDF document.
 */
export function isPdfFile(file: { name?: string; url?: string; dataUrl?: string; type?: string }): boolean {
  const name = (file.name || "").toLowerCase();
  const url = (file.url || "").toLowerCase();
  const dataUrl = (file.dataUrl || "").toLowerCase();
  const type = (file.type || "").toLowerCase();

  return (
    name.endsWith(".pdf") ||
    url.includes(".pdf") ||
    url.startsWith("data:application/pdf") ||
    dataUrl.startsWith("data:application/pdf") ||
    type === "pdf" ||
    (type === "document" && name.endsWith(".pdf"))
  );
}

/**
 * Creates a fresh, valid runtime Blob URL from either a Data URL, regular URL, or text.
 */
export function getSafePreviewUrl(file: { name?: string; url: string; dataUrl?: string }): {
  safeUrl: string;
  isBlob: boolean;
} {
  const rawUrl = file.dataUrl || file.url;

  if (!rawUrl) {
    return { safeUrl: "", isBlob: false };
  }

  // If it's a Base64 data URL, convert it to a fresh Blob URL
  if (rawUrl.startsWith("data:")) {
    try {
      const mime = isPdfFile(file) ? "application/pdf" : undefined;
      const blob = dataUrlToBlob(rawUrl, mime);
      const freshBlobUrl = URL.createObjectURL(blob);
      return { safeUrl: freshBlobUrl, isBlob: true };
    } catch (e) {
      console.warn("Could not create blob from data URL:", e);
      return { safeUrl: rawUrl, isBlob: false };
    }
  }

  // If it's an existing blob URL, check if we have dataUrl fallback
  if (rawUrl.startsWith("blob:")) {
    if (file.dataUrl && file.dataUrl.startsWith("data:")) {
      const mime = isPdfFile(file) ? "application/pdf" : undefined;
      const blob = dataUrlToBlob(file.dataUrl, mime);
      const freshBlobUrl = URL.createObjectURL(blob);
      return { safeUrl: freshBlobUrl, isBlob: true };
    }
    return { safeUrl: rawUrl, isBlob: true };
  }

  // Regular HTTP/HTTPS URL
  return { safeUrl: rawUrl, isBlob: false };
}

/**
 * Resolves the proper browser-renderable MIME type for a file.
 */
export function getFileMimeType(file: { name?: string; url?: string; dataUrl?: string; type?: string }): string {
  const name = (file.name || "").toLowerCase();
  const url = (file.url || "").toLowerCase();
  const type = (file.type || "").toLowerCase();

  if (name.endsWith(".pdf") || url.includes(".pdf") || type === "pdf") return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".svg")) return "image/svg+xml";
  if (name.endsWith(".mp3")) return "audio/mpeg";
  if (name.endsWith(".wav")) return "audio/wav";
  if (name.endsWith(".ogg")) return "audio/ogg";
  if (name.endsWith(".m4a") || name.endsWith(".aac")) return "audio/aac";
  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".webm")) return "video/webm";
  if (name.endsWith(".mov")) return "video/quicktime";
  if (name.endsWith(".txt")) return "text/plain";

  if (type === "image") return "image/png";
  if (type === "audio") return "audio/mpeg";
  if (type === "video") return "video/mp4";

  return "application/octet-stream";
}

/**
 * Opens a PDF directly in a new browser tab with full embedded viewer.
 */
export function openPdfInNewTab(file: { name?: string; url: string; dataUrl?: string }): void {
  const rawUrl = file.dataUrl || file.url;
  if (!rawUrl || rawUrl === "#") {
    alert("No PDF file data is available to view.");
    return;
  }

  const fileName = file.name || "PDF Document";
  let targetUrl = rawUrl;

  if (rawUrl.startsWith("data:")) {
    try {
      const blob = dataUrlToBlob(rawUrl, "application/pdf");
      targetUrl = URL.createObjectURL(blob);
    } catch (err) {
      console.error("Error creating PDF blob:", err);
    }
  }

  const newTab = window.open("", "_blank");
  if (newTab) {
    newTab.document.title = `${fileName} — KBC Byline Portal`;
    newTab.document.body.style.margin = "0";
    newTab.document.body.style.padding = "0";
    newTab.document.body.style.height = "100vh";
    newTab.document.body.style.backgroundColor = "#1e293b";
    newTab.document.body.style.display = "flex";
    newTab.document.body.style.flexDirection = "column";

    newTab.document.body.innerHTML = `
      <div style="background-color: #0b1f3a; color: white; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-bottom: 2px solid #eab308; box-shadow: 0 2px 8px rgba(0,0,0,0.3); z-index: 10;">
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
          <span style="background-color: #eab308; color: #0b1f3a; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; white-space: nowrap;">KBC Byline PDF</span>
          <span style="font-weight: 700; font-size: 14px; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${fileName}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
          <a href="${targetUrl}" download="${fileName}" style="background-color: #eab308; color: #0b1f3a; text-decoration: none; font-weight: 700; font-size: 12px; padding: 6px 14px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px; font-family: sans-serif;">
            📥 Download PDF
          </a>
        </div>
      </div>
      <iframe src="${targetUrl}#toolbar=1&navpanes=1&view=FitH" style="width: 100%; flex: 1; border: none; background-color: #525659;" title="${fileName}"></iframe>
    `;
  } else {
    // If popup blocker intercepted window.open, fall back to anchor click
    const a = document.createElement("a");
    a.href = targetUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Safely opens any media file or document directly in a dedicated new browser tab.
 */
export function openMediaSafely(file: { name?: string; url: string; dataUrl?: string; type?: string }): void {
  const rawUrl = file.dataUrl || file.url;
  if (!rawUrl || rawUrl === "#") {
    alert("No file URL or data is available for this attachment.");
    return;
  }

  const fileName = file.name || "Attachment";
  const mime = getFileMimeType(file);
  const isPdf = isPdfFile(file);

  if (isPdf || mime === "application/pdf") {
    openPdfInNewTab(file);
    return;
  }

  let safeTargetUrl = rawUrl;
  if (rawUrl.startsWith("data:")) {
    try {
      const blob = dataUrlToBlob(rawUrl, mime);
      safeTargetUrl = URL.createObjectURL(blob);
    } catch (err) {
      console.warn("Could not create blob from data URL:", err);
    }
  }

  const isImage = mime.startsWith("image/") || file.type === "image";
  const isAudio = mime.startsWith("audio/") || file.type === "audio";
  const isVideo = mime.startsWith("video/") || file.type === "video";

  const newTab = window.open("", "_blank");
  if (newTab) {
    newTab.document.title = `${fileName} — KBC Byline Portal`;
    newTab.document.body.style.margin = "0";
    newTab.document.body.style.padding = "0";
    newTab.document.body.style.height = "100vh";
    newTab.document.body.style.backgroundColor = "#0f172a";
    newTab.document.body.style.display = "flex";
    newTab.document.body.style.flexDirection = "column";
    newTab.document.body.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    let mediaContentHtml = "";
    if (isImage) {
      mediaContentHtml = `
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; padding: 20px;">
          <img src="${safeTargetUrl}" alt="${fileName}" style="max-width: 95%; max-height: 85vh; object-fit: contain; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);" />
        </div>
      `;
    } else if (isAudio) {
      mediaContentHtml = `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
          <div style="background-color: #1e293b; padding: 32px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); text-align: center; max-width: 480px; width: 100%; border: 1px solid #334155;">
            <div style="width: 64px; height: 64px; background-color: #0b1f3a; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px;">🎵</div>
            <h3 style="color: white; margin: 0 0 8px; font-size: 16px; word-break: break-word;">${fileName}</h3>
            <p style="color: #94a3b8; font-size: 12px; margin: 0 0 24px;">KBC Field Audio Dispatch</p>
            <audio controls autoplay style="width: 100%; outline: none;" src="${safeTargetUrl}"></audio>
          </div>
        </div>
      `;
    } else if (isVideo) {
      mediaContentHtml = `
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px;">
          <video controls autoplay style="max-width: 95%; max-height: 85vh; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); outline: none;" src="${safeTargetUrl}"></video>
        </div>
      `;
    } else {
      mediaContentHtml = `
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px;">
          <div style="background-color: #1e293b; padding: 32px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); text-align: center; max-width: 480px; width: 100%; border: 1px solid #334155; color: white;">
            <div style="font-size: 36px; margin-bottom: 12px;">📄</div>
            <h3 style="margin: 0 0 8px; font-size: 16px; word-break: break-word;">${fileName}</h3>
            <p style="color: #94a3b8; font-size: 12px; margin: 0 0 20px;">Newsroom Field Document &bull; ${mime}</p>
            <a href="${safeTargetUrl}" download="${fileName}" style="background-color: #eab308; color: #0b1f3a; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 20px; border-radius: 10px; display: inline-block;">
              📥 Download Document
            </a>
          </div>
        </div>
      `;
    }

    newTab.document.body.innerHTML = `
      <div style="background-color: #0b1f3a; color: white; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #eab308; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10;">
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
          <span style="background-color: #eab308; color: #0b1f3a; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; white-space: nowrap;">KBC Newsroom Asset</span>
          <span style="font-weight: 700; font-size: 14px; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${fileName}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
          <a href="${safeTargetUrl}" download="${fileName}" style="background-color: #eab308; color: #0b1f3a; text-decoration: none; font-weight: 700; font-size: 12px; padding: 6px 14px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px; font-family: sans-serif;">
            📥 Download
          </a>
        </div>
      </div>
      ${mediaContentHtml}
    `;
  } else {
    const a = document.createElement("a");
    a.href = safeTargetUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Safely downloads any media file or PDF onto user's device.
 */
export async function downloadMediaSafely(file: { name: string; url: string; dataUrl?: string; type?: string }): Promise<void> {
  const rawUrl = file.dataUrl || file.url;
  if (!rawUrl || rawUrl === "#") {
    alert("No file data available to download.");
    return;
  }

  const fileName = file.name || (isPdfFile(file) ? "document.pdf" : "download");

  try {
    let blob: Blob;

    if (rawUrl.startsWith("data:")) {
      const mime = isPdfFile(file) ? "application/pdf" : undefined;
      blob = dataUrlToBlob(rawUrl, mime);
    } else if (rawUrl.startsWith("blob:")) {
      try {
        const res = await fetch(rawUrl);
        blob = await res.blob();
      } catch {
        if (file.dataUrl && file.dataUrl.startsWith("data:")) {
          blob = dataUrlToBlob(file.dataUrl);
        } else {
          alert("This temporary session file is no longer available in memory. Please re-attach the document.");
          return;
        }
      }
    } else {
      // For HTTP/HTTPS URLs (including Firebase Storage):
      // Fetching the blob ensures the browser triggers a real download without cross-origin blockage
      try {
        const response = await fetch(rawUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        blob = await response.blob();
      } catch (fetchErr) {
        console.warn("Direct blob fetch notice, falling back to anchor download:", fetchErr);
        const a = document.createElement("a");
        a.href = rawUrl;
        a.download = fileName;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
    }

    const downloadBlobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadBlobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(downloadBlobUrl), 10000);
  } catch (err) {
    console.error("Download failed:", err);
    alert("Failed to download file. Please check file connection.");
  }
}
