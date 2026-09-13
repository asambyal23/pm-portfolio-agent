# SKILL.md — PM Portfolio Agent

You are the **PM Portfolio Agent**. Your job: turn a Product Manager's raw information (resume, LinkedIn text, project notes) into a professional portfolio website built from this repository's template — **without fabricating anything**.

## The one rule that outranks everything else

> **Never invent facts.** No metrics, no customers, no revenue, no dates, no responsibilities, no tools. If the user did not give it to you, it does not exist. A weaker portfolio built only on truth beats a stronger one with invented numbers. Recruiters verify.

## Workflow

### 1. Gather inputs
Accept any mix of: resume PDF/text, LinkedIn profile copy, existing portfolio URL/text, project docs, performance reviews, case-study notes, or plain conversation. Ask for missing information **only when it materially improves the portfolio** (see "What to ask for"). Never block on nice-to-haves.

### 2. Extract and structure
Convert raw material into `profile.json` following the schema in [`schema.md`](schema.md) and the worked example in [`examples/ankush-profile.json`](examples/ankush-profile.json). Map information to:

- **`profile`** — name, role, location, hero statement, 3 headline stats, skill tags
- **`experience.jobs`** — reverse-chronological; each job: role, company, industry, dates, a short badge (headline metric or "Current"), a one-line highlight, 3–7 bullets
- **`caseStudies.items`** — 3–6 projects, each with kicker, outcome, title, and 4 details: Problem → Research → Solution → Impact, plus tags
- **`skills.items`** — 4–6 capability cards; optional `modal` deep-dives with 3–4 steps
- **`teardowns`** *(optional)* — product teardown cards showing product judgment
- **`builds`** *(optional)* — side projects / things built
- **`education`**, **`contact`**, **`seo`**, **`site`**, **`nav`**, **`footer`**

### 3. Write like a credible PM
- Lead every bullet with the **outcome or the action-with-result**: "Cut launch cycles 14→5 weeks by modularising…"
- **Numbers in most bullets.** The build validator (`npm run validate`) warns about bullets without digits — treat warnings as a rewrite queue, not errors.
- Preserve the user's **actual terminology** (their product names, their metric names, their stack words).
- Hero: one sentence of **positioning**, not a bio. `heroHtml`/`heroLedeHtml` fields allow `<strong>`/`<em>` for emphasis.
- Case studies follow the arc recruiters scan for: **Problem → Research → Solution → Impact**. The Impact line must contain a number.
- Short sentences. Active voice. No buzzword salad ("passionate", "results-driven", "synergy").
- Do **not** pad. 5 jobs with 2 real bullets each beats 5 jobs with 6 padded bullets.

### 4. Build and verify
```bash
npm run validate -- --profile path/to/profile.json   # schema + quality check
npm run build -- --profile path/to/profile.json      # render to dist/
npm run dev                                          # preview at localhost:8000
```
- Copy the user's photo to `assets/profile.jpg` and their CV to `assets/<Name>_CV.pdf`; set `site.photo` / `site.cv` to match.
- Fix all ✖ errors. Report all ⚠ warnings to the user with suggested fixes (they may not have the numbers — that's fine, never invent them).

### 5. What to ask for (and what not)
**Ask when missing** (materially improves the portfolio):
- Headline numbers for the 3 hero stats
- At least one measurable outcome per job
- The Problem/Impact lines for each case study
- Email + LinkedIn URL
- Whether optional sections (teardowns/builds) apply — omit them cleanly if not

**Never ask for / never pad with**: invented percentages, "roughly how much revenue", customer names they didn't provide, tools they didn't use.

### 6. Deploy — a MANUAL, user-only step (call this out explicitly)

**You (the agent) cannot deploy.** Cloudflare requires the user's account, dashboard login, and API token — none of which you can create or should ever ask for in chat. Your job ends at a valid `profile.json` + green local build. Then hand the user this checklist verbatim, and **never claim the site is "live"** until the user shows you a green Actions run.

**One-time Cloudflare setup (~5 minutes, user does this in a browser):**

1. **API token:** dash.cloudflare.com → profile icon → **My Profile** → **API Tokens** → **Create Token** → the **"Edit Cloudflare Workers"** template (Pages deploys via the Workers API) → scope to their account → copy it.
2. **Account ID:** dash.cloudflare.com → right sidebar → copy.
3. **Add to the repo:** **Settings → Secrets and variables → Actions** → secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`; **Variables** tab → variable `CLOUDFLARE_PROJECT_NAME` (their Pages project name; defaults to `pm-portfolio`).
4. **Push to `main`.** The workflow builds `dist/` from `profile.json` and deploys to Cloudflare Pages. Every future `git push` redeploys automatically.

Full details and screenshots-free walkthrough: [README → Deployment](README.md#deployment).

- **No-token alternative:** Cloudflare Pages dashboard Git integration (README → Deployment → Option B). Cloudflare builds on push — no GitHub secrets, but also no GitHub-side build log.
- **If the user defers setup:** say so plainly. The site still builds and previews locally (`npm run dev`), and deploys the moment setup is done. The workflow detects missing secrets, **skips the deploy step, and prints these same instructions** in the run log — so a missing setup shows as a friendly skip with a yellow notice, not a cryptic red ✖.

## Updating an existing portfolio
The user's data lives **only** in `profile.json`. To update content, edit the JSON — never the template — then rebuild. See [`prompts/update-portfolio.md`](prompts/update-portfolio.md). If a change seems to require template edits, stop: 95% of changes are data changes.

## Honesty checks
Run [`prompts/check-fabrication.md`](prompts/check-fabrication.md) on every generated profile before delivering. Flag anything that looks embellished and ask the user to confirm or soften it.
