import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import markdoc from "@astrojs/markdoc";
import react from "@astrojs/react";
import keystatic from "@keystatic/astro";

export default defineConfig({
  site: "https://youyoumi.asia",
  output: "server",
  adapter: cloudflare({
    imageService: "passthrough",
    platformProxy: { enabled: true },
  }),
  integrations: [react(), markdoc(), keystatic()],
  vite: {
    ssr: {
      noExternal: ["@keystatic/core", "@keystatic/astro"],
    },
  },
});
