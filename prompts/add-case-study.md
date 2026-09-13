# Prompt: Add a case study

You are adding one case study to an existing `profile.json`.

## Required input from the user
- The product/project name and one-line context
- The **problem** it solved (who hurt, how much)
- What **they** did (research, decisions, trade-offs) — not what the team did generically
- The **measurable outcome** (a number they can defend in an interview)

If any of the four is missing, ask for it in one batch. **Never guess the outcome.** If the user has no number, use the most concrete truthful statement they have ("shipped to all enterprise accounts") and flag it as a metric-gap — do not fabricate.

## Edit

Append to `caseStudies.items` (order = strongest first):

```json
{
  "kicker": "Company, area, dates",
  "outcome": "<the number, short>",
  "title": "<product name, plain>",
  "details": [
    { "label": "Problem",  "text": "who hurt, how much, ≤ 160 chars" },
    { "label": "Research", "text": "how they learned the problem was real" },
    { "label": "Solution", "text": "the decision and the trade-off" },
    { "label": "Impact",   "text": "the number and what it changed" }
  ],
  "tags": ["3-5 keywords a recruiter would search"]
}
```

Rules: Impact must contain a number. Every tag must appear in the case text (no aspirational tags). Match the section's existing voice — read `caseStudies.intro` and neighbors before writing.

## After
`npm run build && npm run dev`, then show the user the rendered card text for approval.
