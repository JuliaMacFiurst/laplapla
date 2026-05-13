"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { dictionaries, Lang } from "@/i18n";
import { devLog } from "@/utils/devLog";

interface MediaPickerModalProps {
  lang: Lang;
  isOpen: boolean;
  isMobile?: boolean;
  onClose: () => void;
  onSelect: (payload: {
    url: string;
    mediaType: "image" | "video" | "sticker";
    previewUrl?: string;
    animationType?: "webp" | "apng" | "gif";
    source?: "giphy" | "laplapla" | "upload" | "custom";
    tags?: string[];
  }) => void;
}

type MediaPickerResult = {
  url: string;
  previewUrl?: string;
  mediaType: "image" | "video" | "sticker";
  animationType?: "webp" | "apng" | "gif";
  source?: "giphy" | "laplapla" | "upload" | "custom";
  tags?: string[];
};

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
  const [activeTab, setActiveTab] = useState<"giphy" | "pexels" | "stickers" | "upload">(
    "giphy",
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaPickerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(false);

  const t = dictionaries[lang].cats.studio.mediaPicker;

  const [confirmRights, setConfirmRights] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const MAX_IMAGE_MB = 10;
  const MAX_VIDEO_MB = 25;
  const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
  const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
  const MAX_VIDEO_SECONDS = 20;

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read uploaded file"));
      reader.readAsDataURL(file);
    });
  }

  const searchLibraryMedia = useCallback(async (
    source: "giphy" | "pexels" | "stickers",
    rawQuery: string,
    limit: number,
    requestOffset = 0,
  ) => {
    const endpoint = source === "giphy"
      ? "/api/giphy"
      : source === "stickers"
        ? "/api/giphy-stickers"
        : "/api/pexels";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: rawQuery, limit, offset: requestOffset }),
    });

    const data = await res.json().catch(() => null) as
      | { items?: Array<{ url?: string; previewUrl?: string; mediaType?: string; animationType?: string; source?: string; tags?: string[] }>; error?: string; hasMore?: boolean }
      | null;

    if (!res.ok) {
      throw new Error(data?.error || `Media search failed: ${res.status}`);
    }

    const items: MediaPickerResult[] = (data?.items || [])
      .map((item): MediaPickerResult => ({
        url: item?.url || "",
        previewUrl: item?.previewUrl,
        mediaType: source === "stickers" ? "sticker" as const : item?.mediaType === "video" ? "video" as const : "image" as const,
        animationType: item?.animationType === "apng" || item?.animationType === "gif" || item?.animationType === "webp"
          ? item.animationType
          : undefined,
        source: item?.source === "laplapla" || item?.source === "giphy" ? item.source : undefined,
        tags: item?.tags,
      }))
      .filter((item) => Boolean(item.url));

    return {
      items,
      hasMore: Boolean(data?.hasMore ?? items.length >= limit),
    };
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim() && activeTab !== "stickers") return;

    setLoading(true);
    setOffset(0);

    try {
      const nextLimit = activeTab === "stickers" ? 24 : 10;
      if (activeTab === "giphy") {
        const { items, hasMore: more } = await searchLibraryMedia("giphy", query, nextLimit);
        setResults(items);
        setHasMore(more);
      }

      if (activeTab === "pexels") {
        const { items, hasMore: more } = await searchLibraryMedia("pexels", query, nextLimit);
        setResults(items);
        setHasMore(more);
      }

      if (activeTab === "stickers") {
        const { items, hasMore: more } = await searchLibraryMedia("stickers", query, nextLimit, 0);
        setResults(items);
        setHasMore(more);
      }
    } catch (err) {
      console.error("Media search error:", err);
      setResults([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [activeTab, query, searchLibraryMedia]);

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
    if (!isOpen || activeTab === "upload") return;
    if (!query.trim() && activeTab !== "stickers") return;

    const timeoutId = window.setTimeout(() => {
      void handleSearch();
    }, activeTab === "stickers" ? 280 : 420);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeTab, handleSearch, isOpen, query]);

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

  async function handleLoadMore() {
    if (!query.trim() && activeTab !== "stickers") return;

    const pageSize = activeTab === "stickers" ? 24 : 10;
    const nextOffset = offset + pageSize;
    const nextLimit = activeTab === "stickers" ? pageSize : nextOffset + pageSize;
    setLoading(true);

    try {
      if (activeTab === "giphy") {
        const { items, hasMore: more } = await searchLibraryMedia("giphy", query, nextLimit);
        setResults(items);
        setOffset(nextOffset);
        setHasMore(more);
      }

      if (activeTab === "pexels") {
        const { items, hasMore: more } = await searchLibraryMedia("pexels", query, nextLimit);
        setResults(items);
        setOffset(nextOffset);
        setHasMore(more);
      }

      if (activeTab === "stickers") {
        const { items, hasMore: more } = await searchLibraryMedia("stickers", query, nextLimit, nextOffset);
        setResults((current) => [...current, ...items]);
        setOffset(nextOffset);
        setHasMore(more);
      }
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
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

      video.onloadedmetadata = async () => {
        const duration = video.duration;
        URL.revokeObjectURL(tempUrl);

        if (duration > MAX_VIDEO_SECONDS) {
          setUploadError(t.errorVideoTooLong);
          input.value = "";
          return;
        }

        try {
          const finalUrl = await readFileAsDataUrl(file);
          onSelect({ url: finalUrl, mediaType: "video" });
          onClose();
          input.value = "";
        } catch (error) {
          console.error("Failed to read uploaded video", error);
          setUploadError(t.errorVideoMetadata);
          input.value = "";
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        setUploadError(t.errorVideoMetadata);
        input.value = "";
      };

      return;
    }

    try {
      const url = await readFileAsDataUrl(file);
      onSelect({ url, mediaType: "image" });
      onClose();
      input.value = "";
    } catch (error) {
      console.error("Failed to read uploaded image", error);
      setUploadError(t.errorUnsupported);
      input.value = "";
    }
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
            className={`media-tab-button ${activeTab === "stickers" ? "active" : ""}`}
            onClick={() => setActiveTab("stickers")}
            style={isMobile ? { minHeight: "44px", padding: "10px 12px", borderRadius: "12px" } : undefined}
          >
            {t.tabStickers || "Stickers"}
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
              placeholder={activeTab === "stickers" ? (t.stickerSearchPlaceholder || t.searchPlaceholder) : t.searchPlaceholder}
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

        {activeTab === "stickers" && (
          <div className="media-notice" style={isMobile ? { color: "#000" } : undefined}>
            <p style={{ margin: 0 }}>
              {t.stickerNotice || "Animated sticker results prioritize LapLapLa assets first, then GIPHY stickers."}
            </p>
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
            results.map((item, index) => (
              <div
                key={`${item.mediaType}-${item.url}-${index}`}
                className={isMobile ? undefined : "media-result-item"}
                onClick={() => {
                  const lower = item.url.toLowerCase();
                  const isVideo =
                    lower.endsWith(".mp4") || lower.endsWith(".webm");
                  onSelect({
                    url: item.url,
                    mediaType: item.mediaType === "sticker" ? "sticker" : isVideo ? "video" : "image",
                    previewUrl: item.previewUrl,
                    animationType: item.animationType,
                    source: item.source,
                    tags: item.tags,
                  });
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
                {item.url.endsWith(".mp4") || item.url.endsWith(".webm") ? (
                  <video
                    src={item.url}
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
                  <Image
                    src={item.previewUrl || item.url}
                    alt={buildMediaPreviewAlt(item.url, index)}
                    className={isMobile ? undefined : "media-preview-image"}
                    width={320}
                    height={320}
                    loading="lazy"
                    unoptimized
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
