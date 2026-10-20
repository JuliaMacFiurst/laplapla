export type UnconfiguredQuestAssetSource = {
  status: "unconfigured";
};

export type ExternalQuestAssetSource = {
  status: "external";
  url: string;
};

export type QuestAssetSource =
  | UnconfiguredQuestAssetSource
  | ExternalQuestAssetSource;

type QuestAssetBase<TId extends string, TKind extends string> = {
  id: TId;
  kind: TKind;
  source: QuestAssetSource;
};

export type QuestVisualAsset<TId extends string> = QuestAssetBase<TId, "visual">;

export type QuestAudioAsset<TId extends string> = QuestAssetBase<TId, "audio">;

export type QuestAssetDefinition<TId extends string = string> =
  | QuestVisualAsset<TId>
  | QuestAudioAsset<TId>;

export type QuestAssetManifest<
  TQuestId extends string,
  TAssets extends object,
> = {
  questId: TQuestId;
  assets: TAssets;
};

export type QuestAssetIdsByKind<
  TAssets extends object,
  TKind extends QuestAssetDefinition["kind"],
> = {
  [TKey in keyof TAssets]: TAssets[TKey] extends { kind: TKind }
    ? TKey
    : never;
}[keyof TAssets] & string;

/** Optional assets may remain visibly absent while their source is unconfigured. */
export function getOptionalQuestAssetUrl(
  asset: QuestAssetDefinition,
): string | undefined {
  return asset.source.status === "external" ? asset.source.url : undefined;
}

/** Required future pages can fail explicitly instead of silently hiding missing media. */
export function requireQuestAssetUrl(asset: QuestAssetDefinition): string {
  const url = getOptionalQuestAssetUrl(asset);

  if (!url) {
    throw new Error(`Required quest asset is not configured: ${asset.id}`);
  }

  return url;
}
