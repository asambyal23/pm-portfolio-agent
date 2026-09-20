<div align="center">

# PM Portfolio Agent

**Turn your resume into a professional Product Manager portfolio with an AI agent — and publish it to Cloudflare Pages with one command (free hosting).**

> **⚠️ Hosting is a MANUAL step — pushing to GitHub does NOT publish your site.**
> `git push` only updates the code. To go live you (a human) must run `npm run deploy`
> or drag `dist/` into the Cloudflare dashboard. See [Deployment](#deployment) and the [wiki](wiki/Deployment.md).

One JSON file holds your content. One command builds the site. One more publishes it. Zero npm dependencies.

[Live demo](https://ankush-kumar.pages.dev) · [Data schema](schema.md) · [Agent skill](SKILL.md) · [Prompts](prompts/)

</div>

---

## What this is

A **reusable portfolio template + AI agent skill** for Product Managers:

- **Design** — a fast, dark-themed, recruiter-friendly single page (case studies, experience timeline, PM toolkit with tap-to-open deep-dives, teardowns, builds, education, contact). No framework, no build-time dependencies — hand-rolled CSS/JS.
- **One-command onboarding** — `npm run init` scaffolds your `profile.json` plus placeholder CV/photo so a fresh clone builds and previews immediately; `--clean` purges the bundled author's content in the same command.
- **Content/presentation split** — *everything personal lives in one `profile.json`*. The template never contains your data.
- **AI agent** — [`SKILL.md`](SKILL.md) + 7 task prompts teach any capable AI agent (Claude, ChatGPT, Cursor, …) to convert your raw resume into `profile.json`, write credible outcome-led copy, and **never fabricate a metric**.
- **Publish** — one **manual** command (`npm run deploy`) puts your site on Cloudflare Pages; `git push` never publishes (see [Deployment](#deployment)). An optional GitHub Actions workflow can automate it (see Deployment → Option C).

## Architecture

```
your resume / notes
        │
        ▼
 AI Portfolio Agent  (SKILL.md + prompts/)
        │  extracts, structures, writes
        ▼
 profile.json        (all personal content, schema in schema.md)
        │
        ▼
 npm run build       (build.mjs — zero-dependency template renderer)
        │
        ▼
 dist/               (static site: index.html + styles.css + script.js + assets)
        │
        ▼
 npm run deploy  ──►  Cloudflare Pages  ──►  https://yourname.pages.dev
        (or the optional GitHub Actions workflow — see Deployment)
```

## Quick start

```bash
git clone https://github.com/<you>/pm-portfolio-agent.git my-portfolio
cd my-portfolio

npm run init -- --clean   # scaffold YOUR profile.json + placeholder CV/photo, remove the bundled author's content
npm run dev               # preview at http://localhost:8000
```

`npm run init` alone is safe (it refuses to overwrite an existing `profile.json`); add `--clean` when you are starting fresh in a clone that already contains someone else's profile and assets. Prefer to see the finished example first? Skip `init` and just run `npm run build && npm run dev`.

Now make it yours:

1. **Replace the two required inputs — your CV and your photo.** Everything else is optional polish:
   ```bash
   cp ~/Downloads/Your_CV.pdf      assets/my-cv.pdf
   cp ~/Downloads/your-photo.jpg   assets/my-photo.png     # jpg/png both fine
   ```
   Keep `site.cv` / `site.photo` in `profile.json` pointing at whatever filenames you used. The build fails fast (with the exact `cp` command) if either is missing.
2. **Fill in your story.** Either give an AI agent your resume/LinkedIn text along with [`SKILL.md`](SKILL.md) and [`prompts/portfolio-builder.md`](prompts/portfolio-builder.md), or edit `profile.json` by hand — every starter field is marked `TODO`.
3. **Check and preview:**
   ```bash
   npm run validate   # schema + quality checks; warns about leftover TODOs, bullets without numbers, stale contact buttons
   npm run build      # renders dist/ from profile.json
   npm run dev        # http://localhost:8000
   ```
4. **Publish (MANUAL step — you do this, not git):** `npx wrangler login` (one-time), then `npm run deploy` — your site is live (see [Deployment](#deployment)). Pushing to GitHub alone changes nothing on your URL.

## Commands

| Command | What it does |
|---|---|
| `npm run init` | Scaffold `profile.json` + placeholder CV/photo (refuses to overwrite; `--force` resets, `--clean` also purges the bundled author's content) |
| `npm run build` | Render `profile.json` → `dist/` |
| `npm run build -- --profile mydata.json` | Build from a specific profile file |
| `npm run validate` | Dry-run: schema + quality checks, writes nothing |
| `npm run dev` | Build + serve `dist/` at `localhost:8000` |
| `npm test` | Smoke + QA suite (33 tests): template engine, fail-fast paths, deploy gates, cold-start reuse flow |
| `npm run preflight` | Verify `dist/` was built from the current `profile.json` + assets |
| `npm run deploy` | Preflight → publish `dist/` to Cloudflare Pages (manual, needs `wrangler login`) |
| `npm run generate` | Alias of `build` |

## Make it yours (in one line)

```bash
npm run init -- --clean && npm run dev
```

That gives you a complete, previewable site with placeholder content before you write a word — then replace the two required inputs (CV + photo), fill the `TODO`s, and the validator keeps you honest until it's ready to publish.


## Using the AI agent

Give your AI agent (Cursor, Claude, ChatGPT, Copilot Workspace, …) this repo plus your raw information, and point it at the right prompt:

| You want to… | Prompt |
|---|---|
| First portfolio from a resume | `prompts/new-portfolio.md` + `prompts/portfolio-builder.md` |
| Add/update content later | `prompts/update-portfolio.md` |
| Add one case study | `prompts/add-case-study.md` |
| New role / promotion | `prompts/update-experience.md` |
| Tighten the writing | `prompts/improve-content.md` |
| Get a recruiter-style critique | `prompts/recruiter-review.md` |
| Audit for invented claims | `prompts/check-fabrication.md` |

The agent's prime directive (see [`SKILL.md`](SKILL.md)): **never fabricate metrics, customers, revenue, or achievements.** It asks for missing numbers instead of inventing them.

## Deployment

> **🚨 Manual step — read this first.**
> Pushing to GitHub does **NOT** update your live site. The GitHub repo holds your *source*
> (`profile.json`, `assets/`, template); Cloudflare Pages holds your *published site* (`dist/`).
> Going live always requires one deliberate human action below — either the CLI deploy
> (Option A) or the dashboard upload (Option B). The agent stops at a green local build;
> only you can publish. Full walkthrough: [wiki/Deployment.md](wiki/Deployment.md).

Publishing is **free and manual** — one command, no tokens, no secrets, no CI required. Cloudflare Pages' free plan includes unlimited bandwidth and requests, 500 builds/month, a free `yourname.pages.dev` URL, and free custom-domain SSL — no credit card needed to sign up.

| Action | Publishes the site? |
|---|---|
| `git push` | ❌ No — updates code only |
| `npm run deploy` (after `wrangler login`) | ✅ Yes — deploys `dist/` to your `*.pages.dev` URL |
| Dashboard → Upload `dist/` | ✅ Yes — same result, no CLI |

### Option A — One-command publish (recommended, manual)

```bash
npm run build           # render dist/ from profile.json
npx wrangler login      # one-time: opens your browser to log into Cloudflare
npm run deploy          # publishes dist/ to Cloudflare Pages
```

- The first `npm run deploy` creates the Pages project. It defaults to `pm-portfolio`; to target **your** `*.pages.dev` URL set the project name explicitly:
  `CLOUDFLARE_PROJECT_NAME=ankush-kumar npm run deploy` (or export it once in your shell profile).
- **Every future update is the same two commands:** `npm run build && npm run deploy`.
- `npm run deploy` runs `preflight.mjs` first and **refuses a stale `dist/`** (anything in `profile.json` or `assets/` changed since the build) — rebuild, or bypass once with `--allow-stale`.
- `npm run deploy` is a thin wrapper around `npx wrangler pages deploy dist` — wrangler downloads on demand, nothing is installed. If you prefer an API token over browser login, set `CLOUDFLARE_API_TOKEN` in your shell before running it. It accepts real `wrangler pages deploy` flags only (`--branch`, `--commit-hash`, `--commit-message`, `--commit-dirty`, `--skip-caching`, `--no-bundle`, `--upload-source-maps`); typos are rejected, and `--dry-run` previews the command without deploying.

### Option B — Dashboard drag-and-drop (no CLI)

Cloudflare dashboard → **Workers & Pages → Create → Pages → Upload assets** → drag the `dist/` folder in. Repeat after each `npm run build`. Fine for occasional updates; Option A is nicer when you publish often.

### Option C — GitHub Actions auto-deploy (optional)

If you want `git push` to deploy automatically, the bundled workflow (`.github/workflows/deploy.yml`) does it — after a one-time setup **you** must do (an AI agent cannot create these):

1. Create a Cloudflare API token: **dash.cloudflare.com → My Profile → API Tokens → Create Token** → "Edit Cloudflare Workers" template → scope it to your account.
2. In your GitHub repo → **Settings → Secrets and variables → Actions**:

| Name | Type | Value |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Secret | the token from step 1 |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | dash.cloudflare.com → right sidebar "Account ID" |
| `CLOUDFLARE_PROJECT_NAME` | Variable | your Pages project name, e.g. `yourname` (defaults to `pm-portfolio`) |

3. Push to `main` (or re-run the workflow). Until the secrets exist, the workflow still **builds and validates** the site, then **skips** the deploy and prints these same instructions in the run log — pending setup is a warning, never a red ✖.

## Repository structure

```
├── SKILL.md                     # the AI agent's instructions (start here)
├── schema.md                    # profile.json field reference
├── profile.json                 # YOUR content (create from an example)
├── build.mjs                    # zero-dependency template renderer + validator
├── serve.mjs                    # tiny local preview server (npm run dev)
├── package.json                 # scripts only — zero dependencies
├── template/
│   ├── template.html            # the reusable page ({{mustache}}-style tokens)
│   ├── styles.css               # design system (edit to restyle)
│   └── script.js                # nav, scroll-reveal, modals, counters
├── assets/                      # your photo + CV (copied into dist/)
├── examples/
│   ├── ankush-profile.json      # full example (the live demo site)
│   └── test-jane-profile.json   # minimal fixture proving optional sections omit cleanly
├── prompts/                     # 7 task prompts for the agent
├── .github/workflows/deploy.yml # OPTIONAL auto-deploy (skips until secrets are set)
└── dist/                        # build output (gitignored)
```

## Customising the design

- **Colors / fonts:** edit the CSS custom properties at the top of `template/styles.css` (`--bg`, `--accent`, `--accent2`, `--gold`, `--radius`, …).
- **Layout/sections:** `template/template.html` is plain HTML with `{{tokens}}` — the mini-engine supports `{{value}}`, `{{{rawHtml}}}`, `{{#each list}}…{{/each}}`, `{{#if key}}…{{/if}}` (documented in `build.mjs`).
- **New section:** add the markup to `template/template.html` wrapped in `{{#if mysection}}…{{/if}}`, document the fields in `schema.md`, then it appears whenever a profile defines `mysection`. Keep the `.reveal` class on containers for the scroll animation and add a nav `{id, label}` entry.
- **Interactions:** `template/script.js` (mobile nav, scroll reveal, modals, stat counters) — no changes needed for content edits.

## Quality notes

- **Responsive** (desktop → mobile with hamburger nav), **accessible** (skip link, focus-visible rings, keyboard-operable modals, `prefers-reduced-motion` support), **SEO** (canonical, Open Graph, Twitter cards, meta description), **fast** (no frameworks, one CSS + one JS file, lazy photo).
- The validator flags common resume-portfolio mistakes (bullets without numbers, case studies without an Impact line, missing key fields) as ⚠ warnings — errors (✖) block the build.

## The example site

`examples/ankush-profile.json` generates the live demo: [ankush-kumar.pages.dev](https://ankush-kumar.pages.dev) — Ankush Kumar, Senior PM (AI Platforms). Its photo/CV ship in `assets/` purely as demo content; replace them with your own. `examples/test-jane-profile.json` is a minimal fixture used to test that optional sections and skill modals omit cleanly.

## Contributing

PRs welcome — especially: new template sections, validator improvements, and prompt refinements. Keep the zero-dependency philosophy: if a change needs `npm install`, think twice. The example profile is deliberately a *sample*, not a template default.

## License

[MIT](LICENSE) — use it, fork it, ship your portfolio with it.
