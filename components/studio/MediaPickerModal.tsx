

"use client";

import { useEffect, useState } from "react";

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
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
        const res = await fetch("/api/fetch-pexels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: [query], type: "" }),
        });

        const data = await res.json();
        setResults(data.images || []);
      }
    } catch (err) {
      console.error("Media search error:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    onSelect(url);
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

        {activeTab === "upload" && (
          <input type="file" accept="image/*,video/*" onChange={handleUpload} />
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
                onClick={() => onSelect(url)}
              >
                {url.endsWith(".mp4") || url.endsWith(".webm") ? (
                  <video
                    src={url}
                    muted
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