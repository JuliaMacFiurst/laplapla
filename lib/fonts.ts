import localFont from "next/font/local";

export const amatic = localFont({
  src: [
    {
      path: "../assets/fonts/AmaticSC-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-amatic-sc",
});

export const caveat = localFont({
  src: [
    {
      path: "../assets/fonts/Caveat-VariableFont_wght.ttf",
      style: "normal",
      weight: "100 700",
    },
  ],
  display: "swap",
  variable: "--font-caveat",
});

export const varelaRound = localFont({
  src: [
    {
      path: "../assets/fonts/VarelaRound-Regular.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-varela-round",
});

export const nunito = localFont({
  src: [
    {
      path: "../assets/fonts/Nunito-VariableFont_wght.ttf",
      style: "normal",
      weight: "200 1000",
    },
  ],
  display: "swap",
  variable: "--font-nunito",
});

export const fontVariableClasses = [
  amatic.variable,
  caveat.variable,
  varelaRound.variable,
  nunito.variable,
].join(" ");

export const AMATIC_FONT_FAMILY = amatic.style.fontFamily;
export const CAVEAT_FONT_FAMILY = caveat.style.fontFamily;
export const VARELA_ROUND_FONT_FAMILY = varelaRound.style.fontFamily;
export const NUNITO_FONT_FAMILY = nunito.style.fontFamily;

export function resolveFontFamily(fontFamily?: string | null) {
  if (!fontFamily) {
    return AMATIC_FONT_FAMILY;
  }

  return fontFamily
    .replace(/["']?Amatic SC["']?/g, AMATIC_FONT_FAMILY)
    .replace(/["']?Caveat["']?/g, CAVEAT_FONT_FAMILY)
    .replace(/["']?Varela Round["']?/g, VARELA_ROUND_FONT_FAMILY)
    .replace(/["']?Nunito["']?/g, NUNITO_FONT_FAMILY);
}
