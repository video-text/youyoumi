import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const key = params.key;
  if (!key || key.includes("..")) return new Response("Not found", { status: 404 });

  const object = await env.SITE_MEDIA.get(key, {
    onlyIf: { etagDoesNotMatch: request.headers.get("if-none-match") || undefined },
  });
  if (!object) return new Response("Not found", { status: 404 });
  if (!("body" in object)) return new Response(null, { status: 304 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", headers.get("cache-control") || "public, max-age=86400");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
};
