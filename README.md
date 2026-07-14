# youyoumi.asia

Vielumi Global marketing site on Cloudflare.

## Stack

- **Hosting:** Cloudflare Workers (Astro)
- **CMS:** Keystatic (`/keystatic` — local content editing via `npm run dev`)
- **Database:** Cloudflare D1 (`youyoumi-db`) for contact form
- **Media:** Cloudflare R2 (`youyoumi-media`) at `/media/*`
- **Domain:** https://youyoumi.asia

## Commands

```bash
npm run dev      # local preview + Keystatic admin
npm run deploy   # build + deploy to Cloudflare
npm run db:migrate
```

## Notes

- Contact inquiries are stored in D1 table `contact_inquiries`.
- Site copy/services live under `content/` and are editable with Keystatic locally, then redeploy.
- Production Keystatic writes require GitHub storage or Keystatic Cloud if you later need online admin editing.
