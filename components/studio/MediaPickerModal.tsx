"use client";

import { useEffect, useRef, useState } from "react";
import { dictionaries, Lang } from "@/i18n";

interface MediaPickerModalProps {
  lang: Lang;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (payload: { url: string; mediaType: "image" | "video" }) => void;
}

export default function MediaPickerModal({
  lang,
  isOpen,
  onClose,
  onSelect,
}: MediaPickerModalProps) {
  const [activeTab, setActiveTab] = useState<"giphy" | "pexels" | "upload">("giphy");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const t = dictionaries[lang].cats.studio.mediaPicker;

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
      setUploadError(t.errorConfirmRights);
      // Reset input so selecting the same file again triggers onChange
      input.value = "";
      return;
    }

    // Block SVG explicitly (XSS risk)
    const lowerName = file.name.toLowerCase();
    if (file.type === "image/svg+xml" || lowerName.endsWith(".svg")) {
      setUploadError(t.errorSvgBlocked);
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
      setUploadError(t.errorUnsupported);
      input.value = "";
      return;
    }

    if (isImage && file.size > MAX_IMAGE_BYTES) {
      setUploadError(t.errorImageTooLarge);
      input.value = "";
      return;
    }

    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      setUploadError(t.errorVideoTooLarge);
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
          setUploadError(t.errorVideoTooLong);
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
        setUploadError(t.errorVideoMetadata);
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
      className="media-modal-overlay"
      onClick={onClose}
    >
      <div
        className="media-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="media-tabs">
          <button
            className={`media-tab-button ${activeTab === "giphy" ? "active" : ""}`}
            onClick={() => setActiveTab("giphy")}
          >
            {t.tabGiphy}
          </button>
          <button
            className={`media-tab-button ${activeTab === "pexels" ? "active" : ""}`}
            onClick={() => setActiveTab("pexels")}
          >
            {t.tabPexels}
          </button>
          <button
            className={`media-tab-button ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => setActiveTab("upload")}
          >
            {t.tabUpload}
          </button>
        </div>

        {activeTab !== "upload" && (
          <div className="media-search-row">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="media-search-input"
            />
            <button
              className="media-search-button"
              onClick={handleSearch}
            >
              {t.searchButton}
            </button>
          </div>
        )}

        {activeTab === "giphy" && (
          <div className="media-notice media-notice-warning">
            <p style={{ margin: "0 0 6px 0" }}>
              {t.giphyNoticeTitle}
            </p>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>{t.giphyRule1}</li>
              <li>{t.giphyRule2}</li>
              <li>
                Follow GIPHY’s official{" "}
                <a
                  href="https://support.giphy.com/hc/en-us/articles/360020027752-GIPHY-Terms-of-Service"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.giphyTerms}
                </a>
                .
              </li>
            </ul>
          </div>
        )}

        {activeTab === "pexels" && (
          <div className="media-notice">
            <p style={{ margin: "0 0 6px 0" }}>
              {t.pexelsNoticeTitle}
            </p>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>{t.pexelsRule1}</li>
              <li>{t.pexelsRule2}</li>
              <li>{t.pexelsRule3}</li>
            </ul>
          </div>
        )}

        {activeTab === "upload" && (
          <div className="media-upload-section">
            <label className="media-upload-confirm">
              <input
                type="checkbox"
                checked={confirmRights}
                onChange={(e) => setConfirmRights(e.target.checked)}
                style={{ marginTop: 4 }}
              />
              <span style={{ fontSize: 14, lineHeight: 1.35 }}>
                {t.uploadConfirm}
              </span>
            </label>

            <input
              className="media-upload-input"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.mp4,.webm,image/jpeg,image/png,image/webp,video/mp4,video/webm"
              onChange={handleUpload}
            />

            {uploadError && (
              <p className="media-upload-error">
                {uploadError}
              </p>
            )}

            <p className="media-upload-info">
              {t.uploadFormatsInfo}
            </p>
          </div>
        )}

        <div className="media-results-grid">
          {loading && <p>{t.loading}</p>}

          {!loading &&
            results.map((url, index) => (
              <div
                key={index}
                className="media-result-item"
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
                    className="media-preview-video"
                  />
                ) : (
                  <img
                    src={url}
                    alt=""
                    className="media-preview-image"
                  />
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}