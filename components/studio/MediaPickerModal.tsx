"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { dictionaries, Lang } from "@/i18n";
import { devLog } from "@/utils/devLog";

interface MediaPickerModalProps {
  lang: Lang;
  isOpen: boolean;
  isMobile?: boolean;
  onClose: () => void;
  onSelect: (payload: { url: string; mediaType: "image" | "video" }) => void;
}

function buildMediaPreviewAlt(url: string, index: number) {
  const filename = url.split("?")[0]?.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "") || "";
  const normalized = filename.replace(/[-_]+/g, " ").trim();

  return normalized || `illustration ${index + 1}`;
}

export default function MediaPickerModal({
  lang,
  isOpen,
  isMobile = false,
  onClose,
  onSelect,
}: MediaPickerModalProps) {
  const [activeTab, setActiveTab] = useState<"giphy" | "pexels" | "upload">(
    "giphy",
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(false);

  const t = dictionaries[lang].cats.studio.mediaPicker;

  const [confirmRights, setConfirmRights] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const lastObjectUrlRef = useRef<string | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const MAX_IMAGE_MB = 10;
  const MAX_VIDEO_MB = 25;
  const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
  const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
  const MAX_VIDEO_SECONDS = 20;

  async function searchLibraryMedia(
    source: "giphy" | "pexels",
    rawQuery: string,
    limit: number,
  ) {
    const endpoint = source === "giphy" ? "/api/giphy" : "/api/pexels";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: rawQuery, limit }),
    });

    const data = await res.json().catch(() => null) as
      | { items?: Array<{ url?: string; mediaType?: string }>; error?: string }
      | null;

    if (!res.ok) {
      throw new Error(data?.error || `Media search failed: ${res.status}`);
    }

    return (data?.items || [])
      .map((item) => item?.url || "")
      .filter(Boolean);
  }

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
    setOffset(0);
    setHasMore(false);
  }, [activeTab]);

  useEffect(() => {
    if (!isOpen) {
      setUploadError(null);
      setConfirmRights(false);
      setShowLoadMoreButton(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isMobile) return;

    const frame = requestAnimationFrame(() => {
      const node = resultsRef.current;
      if (!node) return;
      const distanceToBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
      setShowLoadMoreButton((current) => {
        if (distanceToBottom <= 48) return true;
        if (distanceToBottom >= 120) return false;
        return current;
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [isMobile, results, loading, hasMore]);

  function handleResultsScroll() {
    if (!isMobile) return;
    const node = resultsRef.current;
    if (!node) return;
    const distanceToBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    setShowLoadMoreButton((current) => {
      if (distanceToBottom <= 48) return true;
      if (distanceToBottom >= 120) return false;
      return current;
    });
  }

  async function handleSearch() {
    if (!query.trim()) return;

    setLoading(true);
    setOffset(0);

    try {
      const nextLimit = 10;
      if (activeTab === "giphy") {
        const items = await searchLibraryMedia("giphy", query, nextLimit);
        setResults(items);
        setHasMore(items.length >= nextLimit);
      }

      if (activeTab === "pexels") {
        const items = await searchLibraryMedia("pexels", query, nextLimit);
        setResults(items);
        setHasMore(items.length >= nextLimit);
      }
    } catch (err) {
      console.error("Media search error:", err);
      setResults([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadMore() {
    if (!query.trim()) return;

    const nextOffset = offset + 10;
    const nextLimit = nextOffset + 10;
    setLoading(true);

    try {
      if (activeTab === "giphy") {
        const items = await searchLibraryMedia("giphy", query, nextLimit);
        setResults(items);
        setOffset(nextOffset);
        setHasMore(items.length >= nextLimit);
      }

      if (activeTab === "pexels") {
        const items = await searchLibraryMedia("pexels", query, nextLimit);
        setResults(items);
        setOffset(nextOffset);
        setHasMore(items.length >= nextLimit);
      }
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError(null);

    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    devLog("UPLOAD:", file.type, file.name);
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
    const allowedImageTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);

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

  const mobileOverlayStyle: CSSProperties | undefined = isMobile
    ? {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.82)",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        padding: "0",
        zIndex: 200,
      }
    : undefined;

  const mobileModalStyle: CSSProperties | undefined = isMobile
    ? {
        width: "100%",
        maxWidth: "100%",
        height: "100dvh",
        maxHeight: "100dvh",
        overflow: "auto",
        background: "#161616",
        color: "#fff",
        padding: "14px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }
    : undefined;

  return (
    <div className="media-modal-overlay" onClick={onClose} style={mobileOverlayStyle}>
      <div className="media-modal" onClick={(e) => e.stopPropagation()} style={mobileModalStyle}>
        {isMobile ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <strong style={{ color: "#fff", fontSize: "16px" }}>Add media</strong>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "999px",
                border: "none",
                background: "#2a2a2a",
                color: "#fff",
                fontSize: "18px",
              }}
            >
              ×
            </button>
          </div>
        ) : null}
        <div className="media-tabs">
          <button
            className={`media-tab-button ${activeTab === "giphy" ? "active" : ""}`}
            onClick={() => setActiveTab("giphy")}
            style={isMobile ? { minHeight: "44px", padding: "10px 12px", borderRadius: "12px" } : undefined}
          >
            {t.tabGiphy}
          </button>
          <button
            className={`media-tab-button ${activeTab === "pexels" ? "active" : ""}`}
            onClick={() => setActiveTab("pexels")}
            style={isMobile ? { minHeight: "44px", padding: "10px 12px", borderRadius: "12px" } : undefined}
          >
            {t.tabPexels}
          </button>
          <button
            className={`media-tab-button ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => setActiveTab("upload")}
            style={isMobile ? { minHeight: "44px", padding: "10px 12px", borderRadius: "12px" } : undefined}
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder={t.searchPlaceholder}
              className="media-search-input"
              style={isMobile ? {
                minWidth: 0,
                width: "100%",
                minHeight: "44px",
                boxSizing: "border-box",
              } : undefined}
            />
            <button
              className="media-search-button"
              onClick={handleSearch}
              style={isMobile ? { minHeight: "44px", borderRadius: "12px", padding: "10px 12px" } : undefined}
            >
              {t.searchButton}
            </button>
          </div>
        )}

        {activeTab === "giphy" && (
          <div className="media-notice media-notice-warning" style={isMobile ? { color: "#000" } : undefined}>
            <p style={{ margin: "0 0 6px 0" }}>{t.giphyNoticeTitle}</p>
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
          <div className="media-notice" style={isMobile ? { color: "#000" } : undefined}>
            <p style={{ margin: "0 0 6px 0" }}>{t.pexelsNoticeTitle}</p>
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
              style={isMobile ? { width: "100%", boxSizing: "border-box" } : undefined}
            />

            {uploadError && <p className="media-upload-error">{uploadError}</p>}

            <p className="media-upload-info">{t.uploadFormatsInfo}</p>
          </div>
        )}

        <div
          ref={resultsRef}
          className={isMobile ? undefined : "media-results-grid"}
          onScroll={handleResultsScroll}
          style={isMobile ? {
            overflowX: "hidden",
            overflowY: "auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignContent: "flex-start",
            flex: 1,
            minHeight: 0,
            width: "100%",
            alignItems: "flex-start",
            paddingBottom: hasMore ? "12px" : "0",
          } : undefined}
        >
          {loading && <p style={isMobile ? { width: "100%", color: "#fff" } : undefined}>{t.loading}</p>}

          {!loading &&
            results.map((url, index) => (
              <div
                key={index}
                className={isMobile ? undefined : "media-result-item"}
                onClick={() => {
                  const lower = url.toLowerCase();
                  const isVideo =
                    lower.endsWith(".mp4") || lower.endsWith(".webm");
                  onSelect({ url, mediaType: isVideo ? "video" : "image" });
                  onClose();
                }}
                style={isMobile ? {
                  overflow: "hidden",
                  borderRadius: "12px",
                  background: "#0f0f0f",
                  aspectRatio: "1 / 1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "0 0 calc((100% - 16px) / 3)",
                  width: "calc((100% - 16px) / 3)",
                  minWidth: 0,
                  minHeight: 0,
                  height: "calc((100vw - 28px - 16px - 16px) / 3)",
                  maxHeight: "120px",
                  boxSizing: "border-box",
                } : undefined}
              >
                {url.endsWith(".mp4") || url.endsWith(".webm") ? (
                  <video
                    src={url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    className="media-preview-video"
                    style={isMobile ? {
                      width: "100%",
                      height: "100%",
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                      borderRadius: "12px",
                      display: "block",
                      flex: "0 0 auto",
                    } : undefined}
                  />
                ) : (
                  <img
                    src={url}
                    alt={buildMediaPreviewAlt(url, index)}
                    className={isMobile ? undefined : "media-preview-image"}
                    style={isMobile ? {
                      width: "100%",
                      height: "100%",
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                      borderRadius: "12px",
                      display: "block",
                      flex: "0 0 auto",
                    } : undefined}
                  />
                )}
              </div>
            ))}
          {!loading && hasMore && !isMobile && (
            <div className="media-load-more-wrapper">
              <button
                className={`media-load-more-button ${loading ? "loading" : ""}`}
                disabled={loading}
                onClick={handleLoadMore}
              >
                {t.loadMore || "Загрузить ещё"}
              </button>
            </div>
          )}
        </div>
        {isMobile && hasMore ? (
          <div
            style={{
              position: "sticky",
              bottom: 0,
              minHeight: "74px",
              paddingTop: "10px",
              paddingBottom: "max(10px, env(safe-area-inset-bottom))",
              background: "linear-gradient(180deg, rgba(22,22,22,0) 0%, rgba(22,22,22,0.94) 26%, #161616 100%)",
              marginTop: "auto",
            }}
          >
            <button
              type="button"
              disabled={loading}
              onClick={handleLoadMore}
              style={{
                width: "100%",
                minHeight: "48px",
                borderRadius: "14px",
                border: "none",
                background: "#ffb3d1",
                color: "#000",
                fontSize: "15px",
                fontWeight: 700,
                boxShadow: "0 10px 24px rgba(0,0,0,0.24)",
                opacity: showLoadMoreButton || loading ? 1 : 0,
                transform: showLoadMoreButton || loading ? "translateY(0)" : "translateY(10px)",
                pointerEvents: showLoadMoreButton || loading ? "auto" : "none",
                transition: "opacity 160ms ease, transform 160ms ease",
              }}
            >
              {loading ? t.loading : t.loadMore || "Загрузить ещё"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
