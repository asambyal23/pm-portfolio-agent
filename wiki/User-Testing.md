# User testing report (first-time user, `pm-portfolio-agent`)

Method: a fresh clone with the author's files deleted (only a CV PDF + a photo), a
hand-written `profile.json` for a fictional PM ("Sam Rivera"), then the documented
journey end to end: `npm run build` → `npm run validate` → `npm run test` → `npm run serve`.

## What worked first try

- Clone → add CV + photo → edit `profile.json` → `npm run build` produced a working
  portfolio; `npm run serve` served `index:200 cv:200` with the right name in the HTML.
- Optional sections (no `teardowns`, no `builds`, no `certs`, no `nav`) omitted cleanly.
- `npm test` passed 23/23 in a clone **without** the author's assets.
- Missing-asset errors named the exact file and the `cp` fix.
- Malformed JSON named the file and line (`Could not parse … : Expected double-quoted property name …`).

## Problems found (all fixed in this pass)

1. **Leftover example contact buttons could publish the example author's real email,
   phone and LinkedIn on a new user's site.** Copying the example profile and editing
   `contact` while forgetting `profile.contactButtons` is *the* likely first mistake.
   → `build.mjs` now warns on every button that disagrees with `contact`
   (email / LinkedIn / phone), e.g.
   `⚠ profile.contactButtons: email button is "…" but contact.email is "…" — update or delete the button.`
2. **Warnings were silently dropped.** The `warnings.forEach(console.error)` call ran
   before the contact-button and asset checks, so anything pushed later never printed.
   → moved after all checks, with dedupe.
3. **A wrong-typed field crashed with a raw Node stack trace** (`TypeError: … forEach is
   not a function`) — bad UX for the PM audience this tool targets.
   → every iterated section is type-checked up front:
   `✖ profile.stats must be an array, found string ("8 years"). See schema.md for the shape.`
4. Stale `.build-meta.json` from a different clone made `npm test` fail on asset drift
   (correctly — but the message now also works for the "I copied someone else's dist"
   case).

## Tips for first-time users

- The bundled example (`examples/ankush-profile.json`) has **dummy contacts** —
  no personal inbox, phone or LinkedIn — and its only live link is the demo site
  itself, so copying it never leaks someone else's details.
- After `npm run init --clean`, search your `profile.json` for leftover `TODO`
  markers before your first build — the validator flags them, but previewing is
  still the fastest check.
- Run `npm run validate` after every edit; it is offline, instant, and never writes.
- Two required files only: your CV and your photo in `assets/`, names must match
  `site.cv` / `site.photo` in `profile.json`.
