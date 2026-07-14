/// <reference types="astro/client" />
/// <reference path="../worker-configuration.d.ts" />

declare namespace Cloudflare {
  interface Env {
    R2_UPLOAD_TOKEN?: string;
  }
}
