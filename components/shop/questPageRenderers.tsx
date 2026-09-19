import type { ReactNode } from "react";
import { SoundCardsPage } from "./SoundCardsPage";
import { SoundCardBacksPage } from "./SoundCardBacksPage";
import { Stage1CardBoxPage } from "./Stage1CardBoxPage";
import type {
  QuestPageDefinitionByType,
  QuestPageType,
} from "@/lib/shop/questDocument";
import type { QuestPersonalization } from "@/lib/shop/questPersonalization";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
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
    const introCard = "introCard" in definition
      ? {
          definition: definition.introCard,
          parrotUrl: requireQuestAssetUrl(
            context.assetManifest.assets[definition.introCard.parrotAssetId],
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
        introCard={introCard}
        leadName={context.personalization.leadName}
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
      locale={context.personalization.locale}
      unknownSoundCard={definition.unknownSoundCard}
      introCard={"introCard" in definition ? definition.introCard : undefined}
    />
  ),
  "stage-1-card-box": ({ context }) => (
    <Stage1CardBoxPage
      personalization={context.personalization}
      parrotUrl={requireQuestAssetUrl(
        context.assetManifest.assets["sound-lab-parrot"],
      )}
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
