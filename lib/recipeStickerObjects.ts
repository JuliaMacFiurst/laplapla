const SUPPORTED_STICKER_IMAGE = /\.(?:png|webp|jpe?g)$/;
const SOURCE_SHEET_IMAGE = /^source\.(?:png|webp|jpe?g)$/;

export const isRaccoonStickerObjectKey = (value: string) => {
  const fileName = value.split("/").filter(Boolean).pop()?.toLowerCase() ?? "";
  if (!fileName || fileName.startsWith(".") || SOURCE_SHEET_IMAGE.test(fileName)) {
    return false;
  }
  return SUPPORTED_STICKER_IMAGE.test(fileName);
};

export const getRecipeRaccoonStickerPrefix = (stickerSetKey: string) =>
  `stickers/raccoon-stickers/${stickerSetKey.trim()}/`;
