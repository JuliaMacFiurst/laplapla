import type { ReactNode } from "react";
import { SoundCardsPage } from "./SoundCardsPage";
import { SoundCardBacksPage } from "./SoundCardBacksPage";
import { Stage1CardBoxPage } from "./Stage1CardBoxPage";
import {
  Stage2BoxPage,
  Stage2ClueBackPage,
  Stage2VibratingCardsPage,
} from "./Stage2PrintablePages";
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
import {
  getStage2FrontCards,
} from "@/lib/shop/quests/sound-case-001/vibratingCards";
import { Stage4BoxRulesPage, Stage4CardsPage, type Stage4GestureUrls } from "./Stage4PrintablePages";

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
  "stage-2-vibrating-cards": ({ definition, context }) => {
    const cards = getStage2FrontCards(definition.locale).map((card) => ({
      card,
      illustrationUrl: requireQuestAssetUrl(
        context.assetManifest.assets[card.illustrationAssetId],
      ),
    }));
    return <Stage2VibratingCardsPage cards={cards} clue={definition.clue} locale={definition.locale} />;
  },
  "stage-2-clue-back": ({ definition }) => (
    <Stage2ClueBackPage clue={definition.clue} locale={definition.locale} />
  ),
  "stage-2-box": ({ definition, context }) => {
    return (
      <Stage2BoxPage
        locale={definition.locale}
        parrotUrl={requireQuestAssetUrl(context.assetManifest.assets["stage-2-parrot"])}
      />
    );
  },
  "stage-4-cards": ({ definition, context }) => {
    const gestureUrls: Stage4GestureUrls = {
      clap: requireQuestAssetUrl(context.assetManifest.assets["stage-4-gesture-clap"]),
      snap: requireQuestAssetUrl(context.assetManifest.assets["stage-4-gesture-snap"]),
      "knee-pat": requireQuestAssetUrl(context.assetManifest.assets["stage-4-gesture-knee-pat"]),
      pause: requireQuestAssetUrl(context.assetManifest.assets["stage-4-gesture-pause"]),
    };
    return <Stage4CardsPage locale={definition.locale} sheetNumber={definition.sheetNumber} side={definition.side} gestureUrls={gestureUrls} />;
  },
  "stage-4-box-rules": ({ definition, context }) => {
    const gestureUrls: Stage4GestureUrls = {
      clap: requireQuestAssetUrl(context.assetManifest.assets["stage-4-gesture-clap"]),
      snap: requireQuestAssetUrl(context.assetManifest.assets["stage-4-gesture-snap"]),
      "knee-pat": requireQuestAssetUrl(context.assetManifest.assets["stage-4-gesture-knee-pat"]),
      pause: requireQuestAssetUrl(context.assetManifest.assets["stage-4-gesture-pause"]),
    };
    return <Stage4BoxRulesPage locale={definition.locale} side={definition.side} gestureUrls={gestureUrls} />;
  },
};

export function renderQuestPageDefinition<TType extends QuestPageType>(
  definition: QuestPageDefinitionByType[TType],
  context: QuestPageRenderContext,
): ReactNode {
  const renderer = questPageRenderers[definition.type];
  return renderer({ definition, context });
}
