<div align="center">

# PM Portfolio Agent

**Turn your resume into a professional Product Manager portfolio with an AI agent — and publish it to Cloudflare Pages with one command.**

One JSON file holds your content. One command builds the site. One more publishes it. Zero npm dependencies.

[Live demo](https://ankush-kumar.pages.dev) · [Data schema](schema.md) · [Agent skill](SKILL.md) · [Prompts](prompts/)

</div>

---

## What this is

A **reusable portfolio template + AI agent skill** for Product Managers:

- **Design** — a fast, dark-themed, recruiter-friendly single page (case studies, experience timeline, PM toolkit with tap-to-open deep-dives, teardowns, builds, education, contact). No framework, no build-time dependencies — hand-rolled CSS/JS.
- **Content/presentation split** — *everything personal lives in one `profile.json`*. The template never contains your data.
- **AI agent** — [`SKILL.md`](SKILL.md) + 7 task prompts teach any capable AI agent (Claude, ChatGPT, Cursor, …) to convert your raw resume into `profile.json`, write credible outcome-led copy, and **never fabricate a metric**.
- **Publish** — one command (`npm run deploy`) puts your site on Cloudflare Pages; an optional GitHub Actions workflow can automate it (see [Deployment](#deployment)).

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
git clone https://github.com/<you>/pm-portfolio-agent.git
cd pm-portfolio-agent

npm run build     # builds the bundled example (Ankush Kumar) so you can see it working
npm run dev       # preview at http://localhost:8000
```

Now make it yours:

1. **Create your data file.** Give an AI agent your resume/LinkedIn text along with [`SKILL.md`](SKILL.md) and [`prompts/portfolio-builder.md`](prompts/portfolio-builder.md), or copy the example and edit by hand:
   ```bash
   cp examples/ankush-profile.json profile.json
   ```
2. **Replace your assets:** put your photo at `assets/profile.jpg` and your CV at `assets/Your_CV.pdf`; update `site.photo` / `site.cv` in `profile.json`.
3. **Check and preview:**
   ```bash
   npm run validate   # schema + quality checks (flags bullets without numbers, missing impact lines…)
   npm run build      # renders dist/ from profile.json
   npm run dev        # http://localhost:8000
   ```
4. **Publish:** `npx wrangler login` (one-time), then `npm run deploy` — your site is live (see [Deployment](#deployment)).

## Commands

| Command | What it does |
|---|---|
| `npm run build` | Render `profile.json` → `dist/` |
| `npm run build -- --profile mydata.json` | Build from a specific profile file |
| `npm run validate` | Dry-run: schema + quality checks, writes nothing |
| `npm run dev` | Build + serve `dist/` at `localhost:8000` |
| `npm run generate` | Alias of `build` |


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

Publishing is **manual and one command** — no tokens, no secrets, no CI required:

### Option A — One-command publish (recommended)

```bash
npm run build           # render dist/ from profile.json
npx wrangler login      # one-time: opens your browser to log into Cloudflare
npm run deploy          # publishes dist/ to Cloudflare Pages
```

- The first `npm run deploy` creates the Pages project. It defaults to the project name `pm-portfolio`; to control your `*.pages.dev` URL, change the name in the `deploy` script in `package.json` (e.g. `--project-name=yourname`) **before** the first publish.
- **Every future update is the same two commands:** `npm run build && npm run deploy`.
- `npm run deploy` is a thin wrapper around `npx wrangler pages deploy dist` — wrangler downloads on demand, nothing is installed. If you prefer an API token over browser login, set `CLOUDFLARE_API_TOKEN` in your shell before running it.

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
