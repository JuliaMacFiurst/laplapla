import { Head, Html, Main, NextScript } from "next/document";
import { fontVariableClasses } from "@/lib/fonts";
import { createPwaBootRecoveryScript } from "@/lib/pwa/bootLifecycle";

export default function Document() {
  return (
    <Html className={fontVariableClasses}>
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon_io/favicon-48x48.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/favicon_io/site.webmanifest" />
        <link
          rel="preload"
          href="/pwa/splash/laplapla-splash-animated.svg"
          as="image"
          type="image/svg+xml"
        />
        <meta name="theme-color" content="#fff8ef" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LapLapLa" />
      </Head>
      <body>
        <Main />
        <script
          id="pwa-boot-recovery"
          dangerouslySetInnerHTML={{ __html: createPwaBootRecoveryScript() }}
        />
        <NextScript />
      </body>
    </Html>
  );
}
