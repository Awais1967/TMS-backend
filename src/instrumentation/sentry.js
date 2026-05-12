import "../Utils/loadEnv.js";
import { initSentry } from "../Utils/sentry.js";

// Initialize Sentry before the app is imported.
// No-op when SENTRY_DSN is not set.
initSentry();
