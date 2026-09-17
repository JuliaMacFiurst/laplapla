import type { ReactNode } from "react";
import { CaseCoverPage } from "./CaseCoverPage";
import { SoundCardsPage } from "./SoundCardsPage";
import { SoundCardBacksPage } from "./SoundCardBacksPage";
import type {
  QuestPageDefinitionByType,
  QuestPageType,
} from "@/lib/shop/questDocument";
import type { QuestPersonalization } from "@/lib/shop/questPersonalization";
import {
  getOptionalQuestAssetUrl,
  requireQuestAssetUrl,
} from "@/lib/shop/questAssets";
import type { SoundCase001AssetManifest } from "@/lib/shop/quests/sound-case-001/assets";
import {
  getSoundCardsByIds,
  getSoundCardSheetSlot,
} from "@/lib/shop/quests/sound-case-001/soundCards";

export type QuestPageRenderContext = {
  personalization: QuestPersonalization;
  assetManifest: SoundCase001AssetManifest;
};

type QuestPageRenderer<TType extends QuestPageType> = (input: {
  definition: QuestPageDefinitionByType[TType];
  context: QuestPageRenderContext;
}) => ReactNode;

type QuestPageRendererRegistry = {
  [TType in QuestPageType]: QuestPageRenderer<TType>;
};

const questPageRenderers: QuestPageRendererRegistry = {
  "case-cover": ({ definition, context }) => {
    const decoration = definition.decorationAssetId
      ? context.assetManifest.assets[definition.decorationAssetId]
      : undefined;

    return (
      <CaseCoverPage
        personalization={context.personalization}
        decorationUrl={
          decoration ? getOptionalQuestAssetUrl(decoration) : undefined
        }
      />
    );
  },
  "sound-cards": ({ definition, context }) => {
    const cards = getSoundCardsByIds(definition.cardIds).map((card, index) => ({
      card,
      slot: getSoundCardSheetSlot(index),
      illustrationUrl: requireQuestAssetUrl(
        context.assetManifest.assets[card.illustrationAssetId],
      ),
    }));
    const unknownSoundCard = definition.unknownSoundCard
      ? {
          definition: definition.unknownSoundCard,
          parrotUrl: requireQuestAssetUrl(
            context.assetManifest.assets[
              definition.unknownSoundCard.parrotAssetId
            ],
          ),
        }
      : undefined;

    return (
      <SoundCardsPage
        cards={cards}
        locale={context.personalization.locale}
        pairId={definition.pairId}
        sheetNumber={definition.sheetNumber}
        sheetCount={definition.sheetCount}
        unknownSoundCard={unknownSoundCard}
      />
    );
  },
  "sound-card-backs": ({ definition, context }) => (
    <SoundCardBacksPage
      cards={definition.cards}
      backAssetId={definition.backAssetId}
      backUrl={requireQuestAssetUrl(
        context.assetManifest.assets[definition.backAssetId],
      )}
      sheetNumber={definition.sheetNumber}
      sheetCount={definition.sheetCount}
      pairId={definition.pairId}
      duplexMode={definition.duplexMode}
      unknownSoundCard={definition.unknownSoundCard}
    />
  ),
};

export function renderQuestPageDefinition<TType extends QuestPageType>(
  definition: QuestPageDefinitionByType[TType],
  context: QuestPageRenderContext,
): ReactNode {
  const renderer = questPageRenderers[definition.type];
  return renderer({ definition, context });
}
