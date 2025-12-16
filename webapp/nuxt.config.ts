import Aura from "@primeuix/themes/aura";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-22",
  ssr: true,
  devtools: { enabled: process.env.NODE_ENV !== "production" },
  modules: [
    "@nuxt/eslint",
    "@nuxtjs/tailwindcss",
    "@primevue/nuxt-module",
    "nuxt3-notifications",
  ],
  runtimeConfig: {
    public: {
      serverEndpoint:
        process.env.SERVER_URL ?? "https://k8s-images-manager.mysupercloud.dev",
    },
  },
  primevue: {
    options: {
      theme: {
        preset: Aura,
      },
    },
  },
});
