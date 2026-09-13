# Prompt: Resume / raw info → profile.json

You are converting a Product Manager's raw information into this repository's `profile.json`.

**Input** (any mix): resume, LinkedIn text, project notes, existing portfolio, conversation notes.

**Hard rules**
1. Never invent metrics, customers, revenue, dates, employers, titles, or tools. If it is not in the input, use `""` and ask the user.
2. Preserve the user's own product names, metric names, and terminology.
3. Output **only** valid JSON matching `schema.md`. No commentary inside the JSON.

**Conversion rules**
- Bullets: rewrite resume bullets into outcome-led sentences (≤ 220 chars). Keep every number exactly as given — never round up, never re-derive.
- One `badge` per job: the strongest metric ("+$3M ARR") or "Current". `badgeClass`: `"pill"` for current role, `"pill pill-green"` otherwise.
- `highlight`: one line, the single best verifiable claim for that job.
- Case studies: pick the 3–6 projects with the clearest problem→impact story. `details` must be exactly the four labels: Problem, Research, Solution, Impact. Impact must contain a number from the input.
- Hero stats: the 3 strongest portfolio-level numbers. If fewer than 3 exist, use fewer — do not invent.
- `seo.description`: ≤ 155 chars, plain text version of the hero.
- `site.assetVersion`: bump when regenerating so browsers refresh assets.
- Optional sections (`teardowns`, `builds`): omit the whole key if the user has none.
- Ask the user for a photo (`assets/profile.jpg`) and CV PDF (`assets/…pdf`); set `site.photo`/`site.cv` to the exact filenames.

**Output format**: the complete `profile.json` in one code block, then a short list of `⚠ missing` fields the user should supply, phrased as questions.
