import { QuestPage } from "./QuestPage";
import {
  renderQuestPageDefinition,
  type QuestPageRenderContext,
} from "./questPageRenderers";
import {
  SOUND_CASE_001_PAGES,
  getPrintableQuestPages,
  type QuestPageDefinition,
} from "@/lib/shop/questDocument";
import type { QuestPersonalization } from "@/lib/shop/questPersonalization";
import {
  SOUND_CASE_001_ASSET_MANIFEST,
  type SoundCase001AssetManifest,
} from "@/lib/shop/quests/sound-case-001/assets";

type QuestDocumentProps = {
  personalization: QuestPersonalization;
  pages?: readonly QuestPageDefinition[];
  assetManifest?: SoundCase001AssetManifest;
};

export function QuestDocument({
  personalization,
  pages = SOUND_CASE_001_PAGES,
  assetManifest = SOUND_CASE_001_ASSET_MANIFEST,
}: QuestDocumentProps) {
  const printablePages = getPrintableQuestPages(pages);
  const renderContext: QuestPageRenderContext = {
    personalization,
    assetManifest,
  };

  return (
    <div className="quest-document" data-quest-document="sound-case-001">
      {printablePages.map((page) => (
        <QuestPage key={page.id} definition={page} locale={personalization.locale}>
          {renderQuestPageDefinition(page, renderContext)}
        </QuestPage>
      ))}
    </div>
  );
}
