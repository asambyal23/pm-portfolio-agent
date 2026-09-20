# Deployment (wiki)

> **Hosting on Cloudflare Pages is a MANUAL step.**
> Nothing in this repo auto-publishes. `git push` updates code only.
> Your site goes live only when **you** deploy `dist/` — via CLI (Option A)
> or dashboard upload (Option B).

## What lives where

- **GitHub** = source of truth for *content and code*: `profile.json`, `assets/` (CV + photo), `template/`, `build.mjs`.
- **Cloudflare Pages** = the *published site*: whatever is in `dist/` at deploy time.
- **`dist/` is gitignored** — it is built locally (`npm run build`) and uploaded, never pushed.

## Option A — CLI deploy (manual, recommended)

```bash
npm run build           # render dist/ from profile.json
npx wrangler login      # one-time: opens your browser to log into Cloudflare
npm run deploy          # publishes dist/ to Cloudflare Pages
```

- First run creates the Pages project. The name comes from `CLOUDFLARE_PROJECT_NAME` (default `pm-portfolio`) — e.g. `CLOUDFLARE_PROJECT_NAME=ankush-kumar npm run deploy` targets the existing `ankush-kumar` project so your URL never changes.
- Every later update is the same: `npm run build && npm run deploy`.
- `npm run deploy` runs the preflight gate first (refuses a stale `dist/`) and wraps `npx wrangler pages deploy dist` (downloads on demand). Prefer a token? Set `CLOUDFLARE_API_TOKEN` before running. Use `--dry-run` to preview the exact wrangler command, `--allow-stale` to bypass the staleness gate once.

## Option B — Dashboard upload (manual, no CLI)

1. `npm run build` locally so `dist/` is current.
2. Zip the **contents** of `dist/` at top level (`index.html`, `styles.css`, `script.js`, `profile.jpg`, `Your_CV.pdf`, plus any artifact pages like `eval-rubric.html`) — no nested folder.
3. dash.cloudflare.com → **Workers & Pages** → your project (e.g. `ankush-kumar`) → **Deployments** → **Create deployment** → **Direct Upload** → drag the files/zip → **Deploy**.
4. Same project = same `*.pages.dev` URL; the old deployment stays in history for rollback. Hard-refresh (`Cmd+Shift+R`) or incognito to bypass cache when verifying.

## Option C — GitHub Actions auto-deploy (optional, off by default)

Push-to-deploy only works after **you** add secrets (an agent cannot do this for you):

1. dash.cloudflare.com → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template.
2. Repo → Settings → Secrets and variables → Actions: secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; variable `CLOUDFLARE_PROJECT_NAME`.
3. Push to `main`. Without secrets the workflow builds, then **skips** deploy with a warning — pending setup is never a red build.

## Checklist before every deploy

- [ ] `npm run validate` passes (fix ✖, review ⚠)
- [ ] `dist/` rebuilt after the last content edit
- [ ] CV + photo filenames in `profile.json` match files in `assets/`
- [ ] Deploying into the **existing** Pages project (same URL), not a new one
- [ ] Verified live in incognito: home page, artifact pages, CV download
