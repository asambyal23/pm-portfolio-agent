# profile.json schema

Every field the template understands. Optional top-level sections are omitted entirely when not needed — the build never emits empty sections. Fields ending in `Html` accept limited inline tags (`<strong>`, `<em>`, `<a href="#anchor">`); everything else is HTML-escaped automatically.

## Top-level

| Key | Required | Purpose |
|---|---|---|
| `site` | ✔ | URLs, filenames, initials, asset cache-buster |
| `seo` | ✔ | `<title>`, meta description, Open Graph / Twitter card text |
| `profile` | ✔ | Hero: name, positioning, headline stats, tags |
| `nav` | ✔ | Section links shown in the sticky header |
| `experience` | recommend | Career timeline |
| `caseStudies` | recommend | 3–6 project cards (Problem/Research/Solution/Impact) |
| `skills` | optional | Capability cards with optional tap-to-open modals |
| `teardowns` | optional | Product-teardown cards (product judgment signal) |
| `builds` | optional | Side projects / things built |
| `education` | optional | Degrees + certifications |
| `contact` | ✔ | Email / LinkedIn buttons and footer line |
| `footer` | ✔ | Footer text |

## `site`

```json
{
  "url": "https://yourname.pages.dev",
  "assetVersion": "1",
  "initials": "JD",
  "photo": "profile.jpg",
  "cv": "Your_CV.pdf"
}
```
`url` — no trailing slash; used for canonical + og:url. `assetVersion` — optional; the build appends a short hash of the shipped `styles.css`/`script.js` automatically, so any style or behaviour change busts browser caches even if you forget to bump it. `photo`/`cv` are filenames inside `assets/` — **both are required inputs**: the build exits `✖` if `assets/<photo>` or `assets/<cv>` is missing. Only two files are needed to start: the CV PDF and the profile picture. Asset filenames must not be `index.html`, `styles.css` or `script.js` (those are the built site's own files — the build refuses them), and unknown extensions are skipped with a warning.

## `seo`

```json
{
  "title": "Jane Doe - Product Manager, Fintech",
  "description": "≤155 chars, the pitch for search results",
  "ogTitle": "share-card title",
  "ogDescription": "share-card description",
  "ogImageAlt": "alt text for the share image"
}
```

## `profile`

```json
{
  "name": "Jane Doe",
  "eyebrow": "Product Manager - Fintech - Payments",
  "heroHtml": "I ship payment products people <em>trust</em>.",
  "heroLedeHtml": "One or two sentences with your strongest <strong>verifiable numbers</strong>.",
  "heroPrimaryLabel": "See my work",
  "heroPrimaryHref": "#work",
  "cvCtaLabel": "Download CV",
  "role": "PM, Payments @ PayLoop",
  "location": "London, UK - Hybrid",
  "stats": [
    { "value": "6", "suffix": "", "label": "years in fintech" },
    { "value": "1.2", "suffix": "M", "label": "users served" }
  ],
  "tags": ["3-8 recruiter-searchable keywords"]
}
```

### `profile.contactButtons[]`

```json
[
  { "type": "email",    "style": "email",    "label": "Email Me",       "href": "mailto:you@example.com" },
  { "type": "website",  "style": "ghost",    "label": "Live portfolio", "href": "https://yourname.pages.dev", "newTab": true },
  { "type": "linkedin", "style": "linkedin", "label": "LinkedIn",       "href": "https://linkedin.com/in/you", "newTab": true },
  { "type": "phone",    "style": "ghost",    "label": "+44 7700 900123", "href": "tel:+447700900123" },
  { "type": "github",   "style": "ghost",    "label": "GitHub",         "href": "https://github.com/you", "newTab": true }
]
```
`type` picks the icon (`email`, `phone`, `linkedin`, `github`, `download`, `website`); an unknown type warns and renders the label without an icon. The build warns whenever an `email` / `linkedin` / `phone` button disagrees with the `contact` block — the classic copy-the-example bug that would publish someone else's details. Order in the array = order on the page.

## `experience.jobs[]`

```json
{
  "role": "Product Manager, Payments",
  "company": "PayLoop",
  "industry": "Fintech",
  "location": "London, UK",
  "dates": "2021 - Present",
  "badge": "1.2M users",
  "badgeClass": "pill",
  "highlight": "One line, strongest verifiable claim",
  "bullets": ["Outcome-led sentences. Most should contain a number."]
}
```
Order: reverse-chronological. `badgeClass`: `"pill"` (blue) for the current role, `"pill pill-green"` (green) for metric badges.

## `caseStudies.items[]`

```json
{
  "kicker": "Company, area, dates",
  "outcome": "The number, short",
  "title": "Project name",
  "details": [
    { "label": "Problem",  "text": "…" },
    { "label": "Research", "text": "…" },
    { "label": "Solution", "text": "…" },
    { "label": "Impact",   "text": "…must contain a number…" }
  ],
  "tags": ["3-5 keywords used in the text"]
}
```

## `skills.items[]`

```json
{
  "id": "unique-slug",
  "kicker": "Small label above the title",
  "title": "Skill name",
  "description": "How you actually use it, with one proof point.",
  "more": "Tap to see … +",
  "modal": {
    "title": "Skill name: the method",
    "intro": "2-3 sentences of context",
    "steps": [ { "lead": "Step", "text": "what it means" } ],
    "result": "optional closing proof point"
  }
}
```
`modal` is optional — omit it and no popup is generated (see Jane's fixture).

## `teardowns` (optional)

`eyebrow`, `heading`, `intro`, then `cards[]` with `{ id, hint, title, paragraphs[] }` or `{ id, hint, title, ordered[] }` where `ordered[]` items are `{ lead, meta?, text, note? }`. Plus `outroHtml` and `modals[]` (`{ id, title, paragraphs[] }`, optionally `steps[]`) — modal `id` must match the card `id`.

## `builds` (optional)

`eyebrow`, `heading`, `intro`, then `cards[]` with `{ kicker, title, paragraphs[] }` plus optional `steps[]` (`{ lead, text }`) and `tags[]`.

## `education` (optional)

`eyebrow`, `heading`, `degrees[]` (`{ degree, detail }`), optional `certsEyebrow`, `certsHeading`, `certs[]` (`{ name, year }`), optional `noteHtml` (short provenance note rendered under the cert list, e.g. issuer-confirmation status).

## `contact` / `footer`

```json
{
  "eyebrow": "Open to what's next",
  "heading": "Let's build …",
  "lede": "One line on what roles/location you want.",
  "email": "you@example.com",
  "emailLabel": "Email Me",
  "linkedin": "https://linkedin.com/in/you",
  "cvLabel": "CV",
  "line": "you@example.com - +44… - City, note"
}
```
`footer`: `{ "text": "Your Name, Role" }`. The LinkedIn button in `contact` is **optional** — when `contact.linkedin` is absent the button is not rendered at all (the bundled example ships a dummy email and no LinkedIn, by design).

## `nav[]`

`{ "id": "experience", "label": "Experience" }` — `id` must match a section key that exists; the CV button is appended automatically.
