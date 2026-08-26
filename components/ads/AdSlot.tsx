import { useEffect, useRef, useState } from "react";
import {
  AD_PLACEMENTS,
  AD_PREVIEW_ENABLED,
  ADS_ENABLED,
  canRenderAdPlacement,
  type AdPlacement,
} from "@/lib/ads/config";

type AdSlotProps = {
  placement: AdPlacement;
};

export default function AdSlot({ placement }: AdSlotProps) {
  const slotRef = useRef<HTMLModElement>(null);
  const [isUnfilled, setIsUnfilled] = useState(false);
  const config = AD_PLACEMENTS[placement];
  const isPreview = AD_PREVIEW_ENABLED && !ADS_ENABLED;
  const canRenderRealAd = ADS_ENABLED && config.slotId !== null;

  useEffect(() => {
    const element = slotRef.current;
    if (!element || !canRenderRealAd) return;

    const updateStatus = () => {
      setIsUnfilled(element.dataset.adStatus === "unfilled");
    };
    const observer = new MutationObserver(updateStatus);
    observer.observe(element, { attributes: true, attributeFilter: ["data-ad-status"] });
    updateStatus();

    return () => observer.disconnect();
  }, [canRenderRealAd]);

  if (!canRenderAdPlacement(placement)) return null;

  if (isPreview) {
    return (
      <div className="ad-slot-preview" data-ad-placement={placement} role="status">
        <strong>AD</strong>
        <span>{placement}</span>
      </div>
    );
  }

  if (!canRenderRealAd || isUnfilled) return null;

  return (
    <ins
      ref={slotRef}
      className="adsbygoogle ad-slot-unit"
      data-ad-slot={config.slotId}
      data-ad-placement={placement}
    />
  );
}
