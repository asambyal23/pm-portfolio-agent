# Getting started (wiki)

> Target: **clone → your own portfolio in under 10 minutes**, with zero author content left behind.

## The 3 commands that matter

```bash
git clone https://github.com/<owner>/pm-portfolio-agent.git my-portfolio
cd my-portfolio
npm run init -- --clean     # YOUR profile.json + placeholder CV/photo; purges the bundled author's content
npm run dev                 # preview at http://localhost:8000
```

Anything that follows — content edits, AI-agent rewriting, publishing — builds on those.

## What `npm run init` actually does

| Flag | Effect |
|---|---|
| *(none)* | Writes `profile.json` + `assets/my-cv.pdf` + `assets/my-photo.png`. **Refuses** if `profile.json` already exists. Clears stale `dist/` + `.build-meta.json`. |
| `--force` | Same, but replaces an existing `profile.json` and resets the placeholder assets. Bundled author assets are kept. |
| `--clean` | The "make this repo mine" flag: replaces `profile.json` **and** removes the bundled author's `assets/*` (CV, photo, artifact pages), then clears generated output. |
| `--root DIR` | Scaffold into another directory (used by the test suite). |

It never touches your own files without `--force`/`--clean`, and prints every write and removal.

## Your two required inputs

The build fails fast if either is missing — with the exact command to fix it:

```bash
cp ~/Downloads/Your_CV.pdf      assets/my-cv.pdf
cp ~/Downloads/your-photo.jpg   assets/my-photo.png     # jpg/png both fine
```

Keep `site.cv` / `site.photo` in `profile.json` pointing at the filenames you used. Nothing else is mandatory: optional sections (`teardowns`, `builds`, `education.certs`, `nav`, modals) simply omit from the page when absent.

## Filling your content

Three routes, mix freely:

1. **AI agent (fastest)** — hand the agent your resume/LinkedIn text plus [`SKILL.md`](../SKILL.md) and [`prompts/portfolio-builder.md`](../prompts/portfolio-builder.md). The agent's prime directive is to never invent metrics; it asks you for missing numbers instead.
2. **By hand** — edit `profile.json`; every starter field is marked `TODO`. Field reference: [`schema.md`](../schema.md).
3. **From the finished example** — the repo's default `profile.json` is a complete real-world profile you can read as a reference (`examples/ankush-profile.json` is the same shape).

## Guardrails you will hit (on purpose)

| Guard | When | What you see |
|---|---|---|
| Placeholder guard | `npm run validate` while `TODO`/`example.com`/`your-name` remain | ⚠ `still contains N placeholder marker(s) — replace them before deploying` |
| Missing input | `npm run build` without CV/photo | ✖ `missing required file: assets/my-cv.pdf (cv)` + the exact `cp` command |
| Type errors | A section is a string instead of an array/object | ✖ names the exact JSON path + `See schema.md` — never a stack trace |
| Leftover contacts | `contactButtons` still hold the example author's email/phone/LinkedIn | ⚠ three warnings naming button vs `contact` value |
| Reserved asset name | `assets/index.html` (would overwrite the built site) | ✖ tells you to rename it |
| Bullet quality | Experience bullets without digits | ⚠ per-bullet "recruiters look for measurable outcomes" |

Warnings never fail a build. ✖ errors always do.

## Next

- [Deployment](Deployment.md) — publishing to Cloudflare Pages (**manual step**).
- [User testing](User-Testing.md) — what a first-time user hits, and the fixes shipped for it.
