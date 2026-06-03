"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { dictionaries, Lang } from "@/i18n";
import { devInfo, devLog } from "@/utils/devLog";

interface MediaPickerModalProps {
  lang: Lang;
  isOpen: boolean;
  isMobile?: boolean;
  disableStickers?: boolean;
  onClose: () => void;
  onSelect: (payload: {
    url: string;
    mediaType: "image" | "video" | "sticker";
    sourceUrl?: string;
    sourceMediaType?: "gif" | "image" | "video" | "webm" | "mp4" | "mov";
    mediaMimeType?: string;
    mediaNormalized?: boolean;
    previewUrl?: string;
    animationType?: "webp" | "apng" | "gif" | "video";
    source?: "giphy" | "reddit" | "imgflip" | "pixabay" | "pexels" | "laplapla" | "upload" | "custom";
    tags?: string[];
  }) => void;
}

type MediaPickerResult = {
  id: string;
  url: string;
  normalizedUrl?: string;
  normalizedMediaType?: "video";
  normalizedMimeType?: string;
  sourceUrl?: string;
  previewUrl?: string;
  mediaType: "gif" | "image" | "video" | "sticker";
  sourceMediaType?: "gif" | "image" | "video" | "webm" | "mp4" | "mov";
  animationType?: "webp" | "apng" | "gif" | "video";
  source?: "giphy" | "reddit" | "imgflip" | "pixabay" | "pexels" | "laplapla" | "upload" | "custom";
  tags?: string[];
};

type MediaPickerTab = "all" | "gif" | "videos" | "stickers" | "upload";

type UnifiedMemeMedia = {
  id: string;
  provider: "giphy" | "reddit" | "imgflip" | "pixabay" | "pexels" | "laplapla";
  providerId: string;
  type: "image" | "gif" | "mp4" | "webm" | "sticker";
  preview_url: string;
  media_url: string;
  width?: number;
  height?: number;
  duration?: number;
  tags: string[];
  nsfw: boolean;
  source_url?: string;
  author?: string;
  popularity?: number;
  created_at?: string;
};

const DEFAULT_SEARCH_TYPES: UnifiedMemeMedia["type"][] = ["image", "gif", "mp4", "webm"];
const STICKER_SEARCH_TYPES: UnifiedMemeMedia["type"][] = ["sticker"];
const GIF_SEARCH_TYPES: UnifiedMemeMedia["type"][] = ["gif"];
const VIDEO_SEARCH_TYPES: UnifiedMemeMedia["type"][] = ["mp4", "webm"];

function getSearchTypes(tab: MediaPickerTab) {
  if (tab === "stickers") return STICKER_SEARCH_TYPES;
  if (tab === "gif") return GIF_SEARCH_TYPES;
  if (tab === "videos") return VIDEO_SEARCH_TYPES;
  return DEFAULT_SEARCH_TYPES;
}

function buildMediaPreviewAlt(url: string, index: number) {
  const filename = url.split("?")[0]?.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "") || "";
  const normalized = filename.replace(/[-_]+/g, " ").trim();

  return normalized || `illustration ${index + 1}`;
}

function countMediaProviders(items: UnifiedMemeMedia[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.provider] = (counts[item.provider] ?? 0) + 1;
    return counts;
  }, {});
}

function isVideoMediaUrl(url?: string) {
  return /\.(mp4|webm)(?:[?#]|$)/i.test(url || "");
}

export default function MediaPickerModal({
  lang,
  isOpen,
  isMobile = false,
  disableStickers = false,
  onClose,
  onSelect,
}: MediaPickerModalProps) {
  const [activeTab, setActiveTab] = useState<MediaPickerTab>("all");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaPickerResult[]>([]);
  const [stickerResults, setStickerResults] = useState<MediaPickerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [stickersHasMore, setStickersHasMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [searchedStickerQuery, setSearchedStickerQuery] = useState("");

  const t = dictionaries[lang].cats.studio.mediaPicker;

  const [confirmRights, setConfirmRights] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const MAX_IMAGE_MB = 10;
  const MAX_VIDEO_MB = 25;
  const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
  const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
  const MAX_VIDEO_SECONDS = 20;
  const SEARCH_PAGE_SIZE = isMobile ? 18 : 50;
  const tabs: Array<{ id: MediaPickerTab; label: string; hidden?: boolean }> = [
    { id: "all", label: t.tabAll },
    { id: "gif", label: t.tabGif },
    { id: "videos", label: t.tabVideos },
    { id: "stickers", label: t.tabStickers, hidden: disableStickers },
    { id: "upload", label: t.tabUpload },
  ];

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read uploaded file"));
      reader.readAsDataURL(file);
    });
  }

  const searchLibraryMedia = useCallback(async (
    rawQuery: string,
    limit: number,
    requestOffset = 0,
    types: UnifiedMemeMedia["type"][] = DEFAULT_SEARCH_TYPES,
    signal?: AbortSignal,
  ) => {
    const res = await fetch("/api/memes/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        q: rawQuery,
        limit,
        offset: requestOffset,
        lang,
        types,
      }),
    });

    const data = await res.json().catch(() => null) as
      | { items?: UnifiedMemeMedia[]; error?: string; cached?: boolean; hasMore?: boolean }
      | null;

    if (!res.ok) {
      throw new Error(data?.error || t.errorSearchFailed);
    }

    const providerCounts = countMediaProviders(data?.items || []);
    devInfo("[Studio media] loaded", {
      query: rawQuery,
      limit,
      offset: requestOffset,
      types,
      cached: Boolean(data?.cached),
      hasMore: Boolean(data?.hasMore),
      providers: providerCounts,
    });

    const items: MediaPickerResult[] = (data?.items || [])
      .map((item): MediaPickerResult => {
        const mediaUrl = item.media_url || "";
        const isRuntimeVideo = item.type === "mp4" || item.type === "webm" || isVideoMediaUrl(mediaUrl);
        const isGif = item.type === "gif";
        return {
          id: item.id,
          url: mediaUrl,
          normalizedUrl: isRuntimeVideo ? mediaUrl : undefined,
          normalizedMediaType: isRuntimeVideo ? "video" : undefined,
          normalizedMimeType: isRuntimeVideo
            ? `video/${item.type === "webm" ? "webm" : "mp4"}`
            : undefined,
          sourceUrl: item.source_url,
          previewUrl: item.preview_url,
          mediaType: item.type === "sticker"
            ? "sticker"
            : isGif
              ? "gif"
              : isRuntimeVideo
                ? "video"
                : "image",
          sourceMediaType: item.type === "mp4" || item.type === "webm" ? item.type : item.type === "gif" ? "gif" : item.type === "image" ? "image" : undefined,
          animationType: item.type === "sticker" ? "webp" : isRuntimeVideo ? "video" : item.type === "gif" ? "gif" : undefined,
          source: item.provider,
          tags: item.tags,
        };
      })
      .filter((item) => Boolean(item.url));

    return {
      items,
      hasMore: Boolean(data?.hasMore ?? items.length >= limit),
    };
  }, [lang, t.errorSearchFailed]);

  const visibleResults = useMemo(() => {
    if (activeTab === "stickers") {
      return stickerResults;
    }
    if (activeTab === "gif") {
      return results.filter((item) => item.mediaType === "gif");
    }
    if (activeTab === "videos") {
      return results.filter((item) => item.mediaType === "video");
    }
    return results;
  }, [activeTab, results, stickerResults]);

  const activeHasMore = activeTab === "stickers" ? stickersHasMore : hasMore;

  const handleSearch = useCallback(async () => {
    if (!query.trim() && activeTab !== "stickers") return;

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setLoading(true);
    setSearchError(null);

    try {
      if (activeTab === "stickers") {
        const { items, hasMore: more } = await searchLibraryMedia(query.trim(), SEARCH_PAGE_SIZE, 0, STICKER_SEARCH_TYPES, controller.signal);
        setStickerResults(items);
        setSearchedStickerQuery(query.trim());
        setStickersHasMore(more);
      } else {
        const { items, hasMore: more } = await searchLibraryMedia(query.trim(), SEARCH_PAGE_SIZE, 0, getSearchTypes(activeTab), controller.signal);
        setResults(items);
        setSearchedQuery(query.trim());
        setHasMore(more);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("Media search error:", err);
      if (activeTab === "stickers") {
        setStickerResults([]);
        setStickersHasMore(false);
      } else {
        setResults([]);
        setHasMore(false);
      }
      setSearchError(t.errorSearchFailed);
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
        setLoading(false);
      }
    }
  }, [activeTab, isMobile, query, searchLibraryMedia, t.errorSearchFailed]);

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
    if (disableStickers && activeTab === "stickers") {
      setActiveTab("all");
      return;
    }

  }, [activeTab, disableStickers]);

  useEffect(() => {
    if (!isOpen) {
      searchAbortRef.current?.abort();
      searchAbortRef.current = null;
      setLoading(false);
      setUploadError(null);
      setSearchError(null);
      setConfirmRights(false);
    }
  }, [isOpen]);

  useEffect(() => () => {
    searchAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (!query.trim() && activeTab !== "stickers") return;

    const timeoutId = window.setTimeout(() => {
      void handleSearch();
    }, 420);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeTab, handleSearch, isOpen, query]);

  async function handleLoadMore() {
    const isStickerSearch = activeTab === "stickers";
    const activeQuery = isStickerSearch
      ? searchedStickerQuery || query.trim()
      : searchedQuery || query.trim();
    if (!activeQuery) return;

    setLoading(true);
    setSearchError(null);

    try {
      const currentResults = isStickerSearch ? stickerResults : results;
      const { items, hasMore: more } = await searchLibraryMedia(
        activeQuery,
        SEARCH_PAGE_SIZE,
        currentResults.length,
        getSearchTypes(activeTab),
      );
      const mergeResults = (current: MediaPickerResult[]) => {
        const seen = new Set(current.map((item) => `${item.source}:${item.id}:${item.url}`));
        const nextItems = items.filter((item) => {
          const key = `${item.source}:${item.id}:${item.url}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return [...current, ...nextItems];
      };

      if (isStickerSearch) {
        setStickerResults(mergeResults);
        setStickersHasMore(more);
      } else {
        setResults(mergeResults);
        setHasMore(more);
      }
    } catch (err) {
      console.error("Load more error:", err);
      setSearchError(t.errorSearchFailed);
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
            <strong style={{ color: "#fff", fontSize: "16px" }}>{t.title}</strong>
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
          {tabs.filter((tab) => !tab.hidden).map((tab) => (
            <button
              key={tab.id}
              className={`media-tab-button ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              style={isMobile ? { minHeight: "44px", padding: "10px 12px", borderRadius: "12px" } : undefined}
            >
              {tab.label}
            </button>
          ))}
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
              placeholder={activeTab === "stickers" ? t.stickerSearchPlaceholder : t.searchPlaceholder}
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

        {activeTab !== "upload" && activeTab !== "stickers" && (
          <div className="media-notice media-notice-warning" style={isMobile ? { color: "#000" } : undefined}>
            <p style={{ margin: "0 0 6px 0" }}>{t.unifiedNoticeTitle}</p>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>{t.unifiedRule1}</li>
              <li>{t.unifiedRule2}</li>
              <li>
                {t.providerTermsPrefix}{" "}
                <a
                  href="https://support.giphy.com/hc/en-us/articles/360020027752-GIPHY-Terms-of-Service"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GIPHY
                </a>
                {", "}
                <a href="https://www.pexels.com/license/" target="_blank" rel="noopener noreferrer">
                  Pexels
                </a>
                {", "}
                <a href="https://pixabay.com/service/license-summary/" target="_blank" rel="noopener noreferrer">
                  Pixabay
                </a>
                {", "}
                <a href="https://www.redditinc.com/policies/content-policy" target="_blank" rel="noopener noreferrer">
                  Reddit
                </a>
                {", "}
                <a href="https://imgflip.com/terms" target="_blank" rel="noopener noreferrer">
                  Imgflip
                </a>
                {t.providerTermsSuffix}
              </li>
            </ul>
          </div>
        )}

        {activeTab === "stickers" && (
          <div className="media-notice" style={isMobile ? { color: "#000" } : undefined}>
            <p style={{ margin: 0 }}>
              {t.stickerNotice}
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
            paddingBottom: activeHasMore ? "12px" : "0",
          } : undefined}
        >
          {loading && <p style={isMobile ? { width: "100%", color: "#fff" } : undefined}>{t.loading}</p>}
          {!loading && searchError ? (
            <p style={isMobile ? { width: "100%", color: "#fff" } : undefined}>{searchError}</p>
          ) : null}

          {!loading &&
            visibleResults.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className={isMobile ? undefined : "media-result-item"}
                onClick={() => {
                  const runtimeUrl = item.mediaType === "sticker" ? item.url : item.normalizedUrl || item.url;
                  const lower = runtimeUrl.toLowerCase();
                  const isVideo =
                    item.mediaType !== "sticker" &&
                    (item.normalizedMediaType === "video" ||
                      isVideoMediaUrl(lower));
                  devInfo("[Studio media] selected", {
                    source: item.source,
                    mediaType: item.mediaType,
                    runtimeType: item.mediaType === "sticker" ? "sticker" : isVideo ? "video" : "image",
                    sourceMediaType: item.sourceMediaType,
                    url: runtimeUrl,
                    sourceUrl: item.sourceUrl,
                  });
                  onSelect({
                    url: runtimeUrl,
                    mediaType: item.mediaType === "sticker" ? "sticker" : isVideo ? "video" : "image",
                    sourceUrl: item.sourceUrl || (item.mediaType === "gif" ? item.url : undefined),
                    sourceMediaType: item.sourceMediaType,
                    mediaMimeType: item.mediaType === "sticker" ? undefined : item.normalizedMimeType,
                    mediaNormalized: item.mediaType !== "sticker" && Boolean(item.normalizedUrl),
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
                {isVideoMediaUrl(item.url) ? (
                  <video
                    src={item.url}
                    poster={item.previewUrl}
                    autoPlay={!isMobile}
                    loop
                    muted
                    playsInline
                    preload={isMobile ? "none" : "metadata"}
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
        </div>
        {activeTab !== "upload" && activeHasMore ? (
          <div
            className={isMobile ? undefined : "media-load-more-wrapper"}
            style={{
              ...(isMobile ? {
                position: "sticky",
                bottom: 0,
                paddingTop: "10px",
                paddingBottom: "max(10px, env(safe-area-inset-bottom))",
                background: "linear-gradient(180deg, rgba(22,22,22,0) 0%, rgba(22,22,22,0.94) 26%, #161616 100%)",
                marginTop: "auto",
              } : undefined),
              minHeight: "74px",
            }}
          >
            <button
              type="button"
              className={isMobile ? undefined : `media-load-more-button ${loading ? "loading" : ""}`}
              disabled={loading}
              onClick={handleLoadMore}
              style={isMobile ? {
                width: "100%",
                minHeight: "48px",
                borderRadius: "14px",
                border: "none",
                background: "#ffb3d1",
                color: "#000",
                fontSize: "15px",
                fontWeight: 700,
                boxShadow: "0 10px 24px rgba(0,0,0,0.24)",
              } : undefined}
            >
              {loading ? t.loading : t.loadMore}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
