// pages/raccoons.tsx
import { useState } from "react";
import Head from "next/head";
import MapWrapper from "@/components/Raccoons/MapWrapper";
import MapTabs from "@/components/Raccoons/MapTabs";
import { RaccoonGuide } from "@/components/Raccoons/RaccoonGuide";

export default function RaccoonsPage() {
  const [activeTab, setActiveTab] = useState<
    "country" | "river" | "sea" | "physic" | "flag" | "animal" | "culture" | "weather" | "food"
  >("country");


  return (
    <>
      <Head>
        <title className="page-title">Енотики найдут</title>
        <meta name="description" content="Интерактивная карта от енотов-исследователей" />
      </Head>

      <main className="min-h-screen bg-[#fdf6f0]">
        <div className="raccoons-home-wrapper">
          <div className="raccoons-header-container">
            <div className="raccoons-title-with-raccoon">
              <div className="raccoon-guide-block">
                <RaccoonGuide wiggle={false} raccoonLine="" />
              </div>

              <div className="raccoon-text-block">
                <h1 className="page-title">Енотики найдут!</h1>
                <p className="page-subtitle">
                  Кликайте по карте и открывайте тайны мира вместе с енотами 🦝
                </p>
              </div>
            </div>
            <MapTabs selectedTab={activeTab} setSelectedTab={setActiveTab} />
          </div>
          <MapWrapper type={activeTab} />
        </div>
      </main>
    </>
  );
}