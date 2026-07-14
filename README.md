# Vielumi Global / youyoumi.asia

Cloudflare Worker website with Astro, Keystatic, D1 contact storage, and R2 media storage.

## Local development

```powershell
npm install
npm run db:migrate:local
npm run dev
```

- Website: `http://localhost:4321`
- Keystatic: `http://localhost:4321/keystatic`

The default development mode uses the production GitHub-backed Keystatic workflow. Set
`KEYSTATIC_LOCAL_MODE=true` before starting Astro only when you intentionally want edits
written directly to the local filesystem.

## Production

1. Connect the GitHub repository in Keystatic and copy the four Keystatic variables to Cloudflare secrets/variables.
2. Set `R2_UPLOAD_TOKEN` as a Worker secret.
3. Run `npm run db:migrate:remote` after Cloudflare provisions D1.
4. Run `npm run deploy`.

Cloudflare creates the D1 database, R2 bucket, custom-domain DNS records, and SSL certificate from `wrangler.jsonc`.
