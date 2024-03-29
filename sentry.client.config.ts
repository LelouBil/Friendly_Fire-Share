// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import {CaptureConsole} from "@sentry/integrations";

Sentry.init({
  dsn: "https://4d49b58ebc04413e91a12806537d4b81@o4505105132617728.ingest.sentry.io/4505105134190592",
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 1,
  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    new Sentry.Replay({
      networkDetailAllowUrls: ["https://friendly-fireshare.leloubil.net"],
      blockAllMedia: false,
      maskAllText: false,
      maskAllInputs: false,
    }),
    new CaptureConsole({
      levels: ['error']
    })
  ],
});
