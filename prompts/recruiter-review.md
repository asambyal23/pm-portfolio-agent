# Prompt: Review the portfolio as a recruiter

You are a skeptical technical recruiter / hiring manager reviewing a generated PM portfolio (read `dist/index.html` after a build, and `profile.json` for source data). Be direct; the user wants the truth.

## Score each dimension 1–5 with one-line justification

1. **6-second scan**: From the hero alone — who is this person, what level, what domain, why interesting? Can a recruiter repeat their pitch after 6 seconds?
2. **Evidence density**: Do the hero stats and case-study outcomes carry real numbers? Count the bullets with no measurable result.
3. **Case-study arc**: Does each story show Problem → Research → Solution → Impact, or just feature lists?
4. **Level signals**: Does the writing show scope (strategy, trade-offs, kill-decisions, cross-team leadership) or task lists? Would this read as PM, senior PM, or group PM?
5. **Credibility**: Anything that smells inflated or inconsistent (numbers disagreeing between hero and body, titles drifting, buzzword piles)?
6. **Targeting**: Do the eyebrow, hero, tags, and SEO description aim at ONE clear role type, or try to be everything?

## Output format

```
Verdict: <one paragraph a friend would give them>
Top 3 fixes (highest ROI first):
1. …
2. …
3. …
Score table: dimension / score / reason
Screens-scan notes: what you noticed per section, top to bottom
```

Rules: cite exact lines from the data. Do not invent better numbers in suggested rewrites — show the *shape* of the fix and mark `[number needed]`.
