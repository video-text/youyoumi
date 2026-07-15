import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import markdoc from "@astrojs/markdoc";
import react from "@astrojs/react";
import keystatic from "@keystatic/astro";

function keystaticCloudflareEnvCompat() {
  const target = "/node_modules/@keystatic/astro/dist/keystatic-astro-api.js";

  return {
    name: "keystatic-cloudflare-env-compat",
    enforce: "pre",
    transform(code, id) {
      if (!id.replaceAll("\\", "/").endsWith(target)) return;

      const envLookup = /const envVarsForCf = [^;]+;/;
      if (!envLookup.test(code)) {
        throw new Error("Keystatic Cloudflare compatibility patch no longer matches the installed adapter.");
      }

      return {
        code: code.replace(
          envLookup,
          'const envVarsForCf = (await import("cloudflare:workers")).env;',
        ),
        map: null,
      };
    },
  };
}

export default defineConfig({
  site: "https://youyoumi.asia",
  output: "server",
  adapter: cloudflare({
    imageService: "passthrough",
    platformProxy: { enabled: true },
  }),
  integrations: [react(), markdoc(), keystatic()],
  vite: {
    plugins: [keystaticCloudflareEnvCompat()],
    ssr: {
      noExternal: ["@keystatic/core", "@keystatic/astro"],
    },
  },
});
