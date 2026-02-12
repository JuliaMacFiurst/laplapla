import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import CatsLayout from "@/components/Cats/CatsLayout";
import { Lang, dictionaries } from "@/i18n";
import { useEffect, useState } from "react";

// Dynamically load StudioRoot (important later when ffmpeg is added)
const StudioRoot = dynamic(
  () => import("@/components/studio/StudioRoot"),
  { ssr: false }
);

export default function CatsStudioPage({ lang }: { lang: Lang }) {
    const t = dictionaries[lang].cats;
  const router = useRouter();

  const [initialSlides, setInitialSlides] = useState<
    { text: string; image?: string }[] | undefined
  >(undefined);

  // Prefer slides passed from /cats via sessionStorage (avoids huge query strings)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("catsSlides");
      if (!stored) return;

      const parsed = JSON.parse(stored) as { text: string; image?: string }[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setInitialSlides(parsed);
      }

      // Optional: clear after consumption to avoid stale data
      sessionStorage.removeItem("catsSlides");
    } catch {
      console.error("Failed to parse slides from sessionStorage");
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    const { data } = router.query;
    if (!data || typeof data !== "string") return;

    try {
      const decoded = JSON.parse(decodeURIComponent(data));
      setInitialSlides(decoded);
    } catch {
      console.error("Failed to parse slides from query");
    }
  }, [router.isReady, router.query]);

  return (
    <CatsLayout active="studio" lang={lang}>
      <div style={{ marginBottom: 24 }}>
        
      </div>
      <StudioRoot initialSlides={initialSlides} />

      <button
          className="back-to-cats-button"
          onClick={() => router.push("/cats")}
        >
          ← {t.backButton}
        </button>
      <video
        className="cat-paw-video"
        src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/characters/cats/cap-paw.webm"
        autoPlay
        loop
        muted
        playsInline
      />
    </CatsLayout>
  );
}
