import * as Sentry from "@sentry/nextjs";
import { sentryEnvironment, shouldIgnoreError } from "./sentry.shared";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: sentryEnvironment,
    release: process.env.SENTRY_RELEASE,
    sampleRate: 1,
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    initialScope: {
      tags: {
        runtime: "client",
      },
    },
    beforeSend(event) {
      if (shouldIgnoreError(event)) {
        return null;
      }

      if (event.request) {
        delete event.request.headers;
        delete event.request.cookies;
      }

      return event;
    },
  });
}
