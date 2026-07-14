import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export const POST: APIRoute = async ({ request, url }) => {
  const token = env.R2_UPLOAD_TOKEN;
  if (!token || request.headers.get("authorization") !== `Bearer ${token}`) {
    return respond({ ok: false, error: "Unauthorized." }, 401);
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024) {
    return respond({ ok: false, error: "Upload one file up to 10 MB." }, 400);
  }
  if (!file.type.startsWith("image/")) {
    return respond({ ok: false, error: "Only image files are accepted." }, 400);
  }

  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "image";
  const key = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;

  await env.SITE_MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
  });

  return respond({ ok: true, key, url: `${url.origin}/media/${key}` }, 201);
};
