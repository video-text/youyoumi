type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
};

declare namespace App {
  interface Locals extends Runtime {}
}
