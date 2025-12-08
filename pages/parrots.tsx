import {useMemo, useState } from "react";
import Head from "next/head";
import ParrotMixer from "../components/ParrotMixer";
import ParrotStoryCard from "../components/ParrotStoryCard";
import { PARROT_PRESETS } from "../utils/parrot-presets";

const imageForPreset = (id: string) => {
  const k = (id || "").toLowerCase();
  if (k.includes("lo") && k.includes("fi")) return "/icons/music-styles-icons/lo-fi.webp";
  if (k.includes("bosa") || k.includes("bossa")) return "/icons/music-styles-icons/bosa-nova.webp";
  if (k.includes("synthwave") || k.includes("synth")) return "/icons/music-styles-icons/synthwave.webp";
  if (k.includes("funk") || k.includes("disco")) return "/icons/music-styles-icons/funk.webp";
  if (k.includes("house")) return "/icons/music-styles-icons/house.webp";
  if (k.includes("reggae") || k.includes("dub")) return "/icons/music-styles-icons/reggae.webp";
  if (k.includes("rock")) return "/icons/music-styles-icons/rock.webp";
  if (k.includes("classic")) return "/icons/music-styles-icons/classic.webp";
  if (k.includes("dance")) return "/icons/music-styles-icons/dance.webp";
  if (k.includes("classical")) return "/icons/music-styles-icons/classical.webp";
  if (k.includes("jazzhop")) return "/icons/music-styles-icons/jazzhop.webp";
  if (k.includes("jazz")) return "/icons/music-styles-icons/jazz.webp";
  if (k.includes("metal")) return "/icons/music-styles-icons/metal.webp";
  if (k.includes("ambient")) return "/icons/music-styles-icons/ambient.webp";
  if (k.includes("chill")) return "/icons/music-styles-icons/chill.webp";
  if (k.includes("electronic")) return "/icons/music-styles-icons/electronic.webp";
  if (k.includes("indie")) return "/icons/music-styles-icons/indie.webp";
  if (k.includes("experimental")) return "/icons/music-styles-icons/experimental.webp";
  if (k.includes("country")) return "/icons/music-styles-icons/country.webp";
  if (k.includes("spiritual")) return "/icons/music-styles-icons/spiritual.webp";
  if (k.includes("chiptune")) return "/icons/music-styles-icons/chiptune.webp";
  if (k.includes("kpop")) return "/icons/music-styles-icons/kpop.webp";
  if (k.includes("afroperc")) return "/icons/music-styles-icons/afroperc.webp";
  if (k.includes("celtic")) return "/icons/music-styles-icons/celtic.webp";
  if (k.includes("latin")) return "/icons/music-styles-icons/latin.webp";
  if (k.includes("cartoon")) return "/icons/music-styles-icons/cartoon.webp";

  return "/icons/music-styles-icons/lo-fi.webp"; // fallback
};

export default function ParrotsPage() {
  const [activeId, setActiveId] = useState(PARROT_PRESETS[0].id);
  const preset = useMemo(() => PARROT_PRESETS.find(p => p.id === activeId)!, [activeId]);

  return (
    <>
      <Head><title>Попугайчики поют — capybara_tales</title></Head>
      <main className="home-wrapper">
        <h1 className="title page-title">Попугайчики споют</h1>
        <p className="subtitle">
          Играй с лупами, слушай комментарии попугайчиков и узнавай истории про музыку.
        </p>

        <div className="style-presets-row" style={{ marginBottom: "1rem", justifyContent: "center", gap: 12, maxWidth: "100%" }}>
          {PARROT_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveId(p.id)}
              className={`style-preset-btn ${p.id === activeId ? 'is-active' : ''}`}
              style={{ backgroundImage: `url(${imageForPreset(p.id)})` }}
              aria-pressed={p.id === activeId}
              title={p.title || p.id}
            >
              <span className="style-preset-label">{p.title || p.id}</span>
            </button>
          ))}
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 50,
            justifyItems: "stretch",
            alignItems: "start",
            maxWidth: "1024px",
            margin: "0 auto"
          }}
        >
          <div style={{ width: "100%" }}>
            <ParrotMixer loops={preset.loops} />
          </div>
          <div style={{ width: "100%" }}>
            <ParrotStoryCard
              id={preset.id}
              title={preset.title}
              description={preset.description}
              searchArtist={preset.searchArtist}
              searchGenre={preset.searchGenre}
            />
          </div>
        </div>
        <style jsx global>{`
          /* Preset buttons row */
          .style-presets-row { display: flex; flex-wrap: wrap; justify-content: center; }

          /* Square full-cover preset buttons (page-scoped, no .card) */
          .style-preset-btn {
            width: 140px;
            height: 140px;
            aspect-ratio: 1 / 1;
            border-radius: 18px;
            border: 1px solid rgba(0,0,0,0.12);
            background: #fff center/cover no-repeat;
            box-shadow: 0 4px 12px rgba(0,0,0,0.10);
            display: inline-flex;
            align-items: flex-end;
            justify-content: center;
            padding: 10px;
            margin: 6px;
            position: relative;
            overflow: hidden;
            cursor: pointer;
            transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
            font-family: 'Amatic SC', cursive;
          }
          .style-preset-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.12); }
          .style-preset-btn.is-active {
            border: 3px solid #b388ff; /* kawaii lavender */
            box-shadow: 0 0 0 6px rgba(179,136,255,0.18), 0 10px 24px rgba(179,136,255,0.25);
          }

          /* Readable label overlay */
          .style-preset-label {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #111;
            background: rgba(255,255,255,0.45);
            border-radius: 12px;
            padding: 4px 10px;
            backdrop-filter: blur(4px);
          }
        `}</style>
      </main>
    </>
  );
}