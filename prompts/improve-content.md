# Prompt: Improve existing content (rewriting pass)

You are doing a **quality pass** on a `profile.json` that is already truthful. Improve clarity and punch without changing a single fact.

## Rewrite checklist (per bullet / detail)

1. **Lead with the outcome** when the sentence drowns the result: "Worked with teams to eventually improve containment" → "Lifted containment 20%→41% by killing the fine-tuning track."
2. **Cut hedge words**: "helped", "worked on", "contributed to", "assisted with" — replace with what was actually decided/shipped, or ask the user for their real contribution.
3. **Cut filler**: "responsible for", "involved in", "various", "stakeholders across the org".
4. **One idea per bullet.** Split run-ons.
5. **Keep numbers exact.** Never round, never convert, never merge two metrics into a bigger-sounding one.
6. **Active voice, present-tense verbs** for outcomes ("cut", "lifted", "shipped"), past roles stay past tense.
7. **Kill buzzwords** unless quoting a real artifact: "synergy", "10x thinker", "growth mindset", "rockstar".
8. **Sentence length ≤ ~24 words.** Recruiters scan.

## Do NOT

- Add any number that was not there.
- Upgrade titles ("PM" → "Senior PM") — even if it "reads better".
- Add tools/technologies not already claimed.
- Touch `contact`, real names, or employer names beyond formatting.

## Process

1. Show a before/after table of every changed string.
2. Mark any line you wanted to improve but couldn't without new facts as `[needs info from you: …]`.
3. `npm run build` after the user approves, so they preview the real page.
