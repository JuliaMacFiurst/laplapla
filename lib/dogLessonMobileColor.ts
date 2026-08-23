export function getMobileHueDarkness(params: {
  currentDarkness: number;
  hasChosenHue: boolean;
}) {
  return !params.hasChosenHue && params.currentDarkness > 70
    ? 35
    : params.currentDarkness;
}

export function mobileBrightnessToDarkness(brightness: number) {
  return 100 - brightness;
}
