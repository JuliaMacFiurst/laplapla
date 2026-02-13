"use client";

import { useEffect, useRef, useState } from "react";

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (payload: { url: string; mediaType: "image" | "video" }) => void;
}

export default function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
}: MediaPickerModalProps) {
  const [activeTab, setActiveTab] = useState<"giphy" | "pexels" | "upload">("giphy");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [confirmRights, setConfirmRights] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const lastObjectUrlRef = useRef<string | null>(null);

  const MAX_IMAGE_MB = 10;
  const MAX_VIDEO_MB = 25;
  const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
  const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
  const MAX_VIDEO_SECONDS = 20;

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
    }

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    setResults([]);
    setQuery("");
  }, [activeTab]);

  useEffect(() => {
    if (!isOpen) {
      setUploadError(null);
      setConfirmRights(false);
    }
  }, [isOpen]);

  async function handleSearch() {
    if (!query.trim()) return;

    setLoading(true);
    setResults([]);

    try {
      if (activeTab === "giphy") {
        const res = await fetch("/api/search-giphy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        const data = await res.json();
        setResults(data.gifs || []);
      }

      if (activeTab === "pexels") {
        const res = await fetch("/api/search-pexels-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        const data = await res.json();
        setResults(data.videos || []);
      }
    } catch (err) {
      console.error("Media search error:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError(null);
    
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
console.log("UPLOAD:", file.type, file.name);
    // Require rights confirmation
    if (!confirmRights) {
      setUploadError("Please confirm you own the rights to this file (or it is allowed to use).");
      // Reset input so selecting the same file again triggers onChange
      input.value = "";
      return;
    }

    // Block SVG explicitly (XSS risk)
    const lowerName = file.name.toLowerCase();
    if (file.type === "image/svg+xml" || lowerName.endsWith(".svg")) {
      setUploadError("SVG files are not allowed.");
      input.value = "";
      return;
    }

    // Allowlist formats
    const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

    const isImage = allowedImageTypes.has(file.type);

    const isVideo =
      file.type.startsWith("video/") ||
      lowerName.endsWith(".mp4") ||
      lowerName.endsWith(".webm");

    if (!isImage && !isVideo) {
      setUploadError("Unsupported file type. Allowed: JPG, PNG, WEBP, MP4, WEBM.");
      input.value = "";
      return;
    }

    if (isImage && file.size > MAX_IMAGE_BYTES) {
      setUploadError(`Image is too large. Max ${MAX_IMAGE_MB}MB.`);
      input.value = "";
      return;
    }

    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      setUploadError(`Video is too large. Max ${MAX_VIDEO_MB}MB.`);
      input.value = "";
      return;
    }

    // Video duration validation
    if (isVideo) {
      const tempUrl = URL.createObjectURL(file);

      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = tempUrl;

      video.onloadedmetadata = () => {
        const duration = video.duration;
        URL.revokeObjectURL(tempUrl);

        if (duration > MAX_VIDEO_SECONDS) {
          setUploadError(`Video is too long. Max ${MAX_VIDEO_SECONDS} seconds.`);
          input.value = "";
          return;
        }

        // If duration OK, proceed with normal flow
        if (lastObjectUrlRef.current) {
          URL.revokeObjectURL(lastObjectUrlRef.current);
          lastObjectUrlRef.current = null;
        }

        const finalUrl = URL.createObjectURL(file);
        lastObjectUrlRef.current = finalUrl;

        onSelect({ url: finalUrl, mediaType: "video" });
        onClose();
        input.value = "";
      };

      video.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        setUploadError("Could not read video metadata.");
        input.value = "";
      };

      return;
    }

    // For images (videos already handled above)
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }

    const url = URL.createObjectURL(file);
    lastObjectUrlRef.current = url;

    onSelect({ url, mediaType: "image" });
    onClose();

    // Reset input so selecting the same file again triggers onChange
    input.value = "";
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 800,
          maxHeight: "80vh",
          background: "white",
          borderRadius: 16,
          padding: 24,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <button onClick={() => setActiveTab("giphy")}>GIPHY</button>
          <button onClick={() => setActiveTab("pexels")}>Pexels</button>
          <button onClick={() => setActiveTab("upload")}>Upload</button>
        </div>

        {activeTab !== "upload" && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search media..."
              style={{ flex: 1, padding: 8 }}
            />
            <button onClick={handleSearch}>Search</button>
          </div>
        )}

        {activeTab === "giphy" && (
          <div
            style={{
              fontSize: 12,
              opacity: 0.75,
              margin: "-6px 0 12px 0",
              lineHeight: 1.35,
            }}
          >
            <p style={{ margin: "0 0 6px 0" }}>
              GIFs by GIPHY ✨ Please use them kindly and respect creators.
            </p>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>Do not remove watermarks or attribution.</li>
              <li>Do not use in harmful or illegal contexts.</li>
              <li>
                Follow GIPHY’s official{" "}
                <a
                  href="https://support.giphy.com/hc/en-us/articles/360020027752-GIPHY-Terms-of-Service"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </a>
                .
              </li>
            </ul>
          </div>
        )}

        {activeTab === "pexels" && (
          <div
            style={{
              fontSize: 12,
              opacity: 0.75,
              margin: "-6px 0 12px 0",
              lineHeight: 1.35,
            }}
          >
            <p style={{ margin: "0 0 6px 0" }}>
              Videos by Pexels 🎥 Please make sure your usage respects the license.
            </p>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>Free for use under the Pexels license.</li>
              <li>No resale or redistribution as standalone files.</li>
              <li>Respect privacy and avoid misleading usage.</li>
            </ul>
          </div>
        )}

        {activeTab === "upload" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <input
                type="checkbox"
                checked={confirmRights}
                onChange={(e) => setConfirmRights(e.target.checked)}
                style={{ marginTop: 4 }}
              />
              <span style={{ fontSize: 14, lineHeight: 1.35 }}>
                I confirm I own the rights to this file (or it is free/allowed to use), and it does not contain unsafe or inappropriate content.
              </span>
            </label>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.mp4,.webm,image/jpeg,image/png,image/webp,video/mp4,video/webm"
              onChange={handleUpload}
            />

            {uploadError && (
              <p style={{ color: "#b00020", fontSize: 14, margin: 0 }}>
                {uploadError}
              </p>
            )}

            <p style={{ fontSize: 12, margin: 0, opacity: 0.75 }}>
              Allowed formats: JPG, PNG, WEBP (max {MAX_IMAGE_MB}MB) and MP4, WEBM (max {MAX_VIDEO_MB}MB). SVG is blocked.
            </p>
          </div>
        )}

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 12,
          }}
        >
          {loading && <p>Loading...</p>}

          {!loading &&
            results.map((url, index) => (
              <div
                key={index}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  const lower = url.toLowerCase();
                  const isVideo = lower.endsWith(".mp4") || lower.endsWith(".webm");
                  onSelect({ url, mediaType: isVideo ? "video" : "image" });
                  onClose();
                }}
              >
                {url.endsWith(".mp4") || url.endsWith(".webm") ? (
                  <video
                    src={url}
                    muted
                    playsInline
                    preload="metadata"
                    controls
                    style={{ width: "100%", borderRadius: 8 }}
                  />
                ) : (
                  <img
                    src={url}
                    alt=""
                    style={{ width: "100%", borderRadius: 8 }}
                  />
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}