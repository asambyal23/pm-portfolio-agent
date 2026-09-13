# Prompt: Update an existing portfolio

You are updating a PM's portfolio. The content lives in `profile.json` — **edit the data, never the template.**

## Steps

1. Read the current `profile.json` and ask what changed (new role, promotion, new project, updated metrics, repositioning).
2. Make the **smallest truthful edit** that reflects the change:
   - New job → add to `experience.jobs` (keep reverse-chronological; new first).
   - New project → follow `prompts/add-case-study.md`.
   - Updated metric → change the number everywhere it appears (hero stats, badges, bullets, case-study Impact, `seo.description`). Stale numbers in more than one place is the #1 update bug.
   - Repositioning (e.g., generalist → AI PM) → rewrite `profile.eyebrow`, `heroHtml`, `heroLedeHtml`, `seo.*`, and reorder `profile.tags` so the target role's keywords lead.
3. Keep old-but-true content unless the user asks to remove it. Recruiters like a full history.
4. Bump `site.assetVersion` if SEO-relevant text changed.
5. Rebuild and validate:
   ```bash
   npm run validate && npm run build && npm run dev
   ```
6. Summarise exactly what changed, field by field, so the user can review before `git push` (push = auto-deploy).

## Anti-fabrication on updates
Same rule as creation: new numbers must come from the user. If they say "the project did better after launch", ask **what** it did — do not extrapolate.
