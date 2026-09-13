# Prompt: Update experience (new role / promotion / edit)

You are updating the experience timeline in `profile.json`.

## New role

Insert at the **top** of `experience.jobs` (reverse-chronological is non-negotiable). Map fields:

- `badge`: `"Current"` with `"pill"` for the active role; for past roles use the strongest metric with `"pill pill-green"`.
- `highlight`: the single best verifiable claim in one line.
- `bullets`: 3–7 outcome-led bullets. Rewrite the user's raw bullet, keep their numbers byte-for-byte.
- If the new role replaces "Current" on an older job, change that job's `badge` from `"Current"` to its headline metric and `badgeClass` to `"pill pill-green"`.

## Editing an existing role

- Changing dates/title → check the hero (`role`, `heroLedeHtml`), `profile.role`, and `seo.*` still agree. Title drift between hero and timeline looks sloppy to recruiters.
- Adding bullets → same no-fabrication rule; ask for the number if the user gives a claim without one.

## Promotion of an existing company

Two options — ask the user which matches reality:
1. One entry with both titles in `role` (`"Senior PM, formerly PM"`) if the work was continuous, or
2. Two entries if the scope change is worth showing separately.

## Cross-check after edit (do all)

- Hero stats still accurate (the newest role usually changes them)
- `seo.description` mentions the current role/employer
- No duplicate entries for the same company+dates
- Reverse-chronological order intact
- `npm run validate` — fix ✖ errors, report ⚠ warnings
