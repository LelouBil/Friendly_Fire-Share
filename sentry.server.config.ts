// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import {ProfilingIntegration} from "@sentry/profiling-node";

Sentry.init({
  dsn: "https://4d49b58ebc04413e91a12806537d4b81@o4505105132617728.ingest.sentry.io/4505105134190592",

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,
  profilesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  integrations: [
    // Add profiling integration to list of integrations
    new ProfilingIntegration(),
  ],
});
