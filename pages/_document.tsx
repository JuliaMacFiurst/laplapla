import { Head, Html, Main, NextScript } from "next/document";
import { fontVariableClasses } from "@/lib/fonts";

export default function Document() {
  return (
    <Html className={fontVariableClasses}>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
