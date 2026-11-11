import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "schoolsoftplus",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-11",
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      FIREBASE_SERVICE_ACCOUNT_KEY: bindings.secret(),
      GEMINI_API_KEY: bindings.secret(),
      GITHUB_TOKEN: bindings.secret(),
      GIPHY_API_KEY: bindings.secret(),
      IMAGE_HOST_API_TOKEN: bindings.secret(),
      MOBILE_JWT_SECRET: bindings.secret(),
      PASSKEY_ENCRYPTION_KEY: bindings.secret(),
      PASSKEY_RP_ID: bindings.text("ssp.elias4044.com"),
      PASSKEY_RP_NAME: bindings.text("SchoolSoft+"),
      PASSKEY_ORIGIN: bindings.text("https://ssp.elias4044.com"),
    },
  }),
});
