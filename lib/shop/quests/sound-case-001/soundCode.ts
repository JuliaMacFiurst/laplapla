import { STAGE_6_COORDINATE_PUZZLE } from "./scatteredSand";
import type { SoundCase001AudioAssetId } from "./assets";

export type SoundCodeDigit = 0|1|2|3|4|5|6|7|8|9;
export const SOUND_CODE_DIGITS = [
  {digit:1,icon:"🐱",assetId:"stage-6-sound-cat"}, {digit:2,icon:"🔔",assetId:"stage-6-sound-bell"},
  {digit:3,icon:"😂",assetId:"stage-3-distractor-cartoon-laugh"},
  {digit:4,icon:"🚂",assetId:"stage-6-sound-train"}, {digit:5,icon:"🐔",assetId:"stage-6-sound-chicken"},
  {digit:6,icon:"🚪",assetId:"stage-6-sound-door"}, {digit:7,icon:"🦟",assetId:"stage-6-sound-mosquito"},
  {digit:8,icon:"🎈",assetId:"stage-6-sound-balloon"}, {digit:9,icon:"🐶",assetId:"stage-6-sound-dog"},
  {digit:0,icon:"🐄",assetId:"stage-3-distractor-cow"},
] as const satisfies readonly {digit:SoundCodeDigit;icon:string;assetId:SoundCase001AudioAssetId}[];
export const STAGE_6_DECODER_DIGITS = [
  ...STAGE_6_COORDINATE_PUZZLE.latitude.missingDigits,
  ...STAGE_6_COORDINATE_PUZZLE.longitude.missingDigits,
] as const;

export function getSoundCodeIcon(digit: SoundCodeDigit) {
  return SOUND_CODE_DIGITS.find(item => item.digit === digit)!.icon;
}

export function validateStage6Decoder(values: readonly string[]) {
  return STAGE_6_DECODER_DIGITS.map((digit, index) => values[index] === String(digit));
}
