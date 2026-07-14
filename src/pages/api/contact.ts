import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return json({ ok: false, error: "Expected JSON." }, 415);
  }

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON." }, 400);
  }

  const name = String(input.name || "").trim().slice(0, 120);
  const email = String(input.email || "").trim().toLowerCase().slice(0, 254);
  const company = String(input.company || "").trim().slice(0, 160);
  const message = String(input.message || "").trim().slice(0, 5000);
  const website = String(input.website || "").trim();

  if (website) return json({ ok: true });
  if (name.length < 2 || message.length < 10 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "Please complete all required fields." }, 400);
  }

  const ip = request.headers.get("cf-connecting-ip") || "";
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  const ipHash = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 24);

  await env.SITE_DB.prepare(
    `INSERT INTO contact_submissions (name, email, company, message, ip_hash, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(name, email, company, message, ipHash, request.headers.get("user-agent")?.slice(0, 500) || "")
    .run();

  return json({ ok: true });
};
