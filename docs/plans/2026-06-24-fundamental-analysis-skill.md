# fundamental-analysis Skill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a portable `fundamental-analysis` skill that encodes the Strength/Risk scoring framework + earnings-analysis lens as a lean `SKILL.md` plus three reference files.

**Architecture:** A personal/global skill at `~/.claude/skills/fundamental-analysis/`. A short `SKILL.md` carries triggers, workflow, output beats, and guardrails; three `references/*.md` files hold the heavy detail (scoring, earnings bridges, caveats), pulled in only when needed. Data-source-agnostic; depends on no app.

**Tech Stack:** Markdown + YAML frontmatter (Claude Code skill format). No build, no runtime, no tests framework — verification is content + frontmatter validity + skill discoverability.

**Source of truth for the design:** `docs/specs/2026-06-24-fundamental-analysis-skill-design.md` (in this repo).
**Source of truth for thresholds:** `lib/scoring.ts` (in this repo) — every number below is copied from it.

## Global Constraints

- Skill files install to `~/.claude/skills/fundamental-analysis/` (NOT in any git repo — do not attempt to `git commit` the skill files; only this plan/spec are committed).
- `SKILL.md` frontmatter MUST have exactly `name` and `description` keys; `name` MUST be `fundamental-analysis` (matches the directory).
- Keep `SKILL.md` lean (target < ~150 lines); push detail into `references/`.
- Tone in all files: informational only — NEVER buy/sell/hold advice; neutral tiers (Strong / Moderate / Weak).
- Thresholds MUST match `lib/scoring.ts` exactly (listed verbatim in Task 2).
- Use `[reference](references/<file>.md)` relative links from `SKILL.md`.

---

## File structure

```
~/.claude/skills/fundamental-analysis/
  SKILL.md                      # Task 1
  references/
    scoring-criteria.md         # Task 2
    earnings-analysis.md        # Task 3
    caveats.md                  # Task 4
```
Task 5 = end-to-end validation.

---

### Task 1: Create directory + SKILL.md

**Files:**
- Create: `~/.claude/skills/fundamental-analysis/SKILL.md`

**Interfaces:**
- Produces: the skill entry point; links to the three reference files created in Tasks 2–4 (paths: `references/scoring-criteria.md`, `references/earnings-analysis.md`, `references/caveats.md`).

- [ ] **Step 1: Create the directory**

```bash
mkdir -p ~/.claude/skills/fundamental-analysis/references
```

- [ ] **Step 2: Write `SKILL.md`** with this exact frontmatter and body structure:

Frontmatter (verbatim):
```markdown
---
name: fundamental-analysis
description: Use when analyzing a stock's fundamentals, interpreting a Strength/Risk scorecard, evaluating a ticker, or reading a company's earnings report to judge whether it changes the investment view. Covers the 11-metric Strength/Risk scoring framework, cyclical/financial/buyback adjustments, and the EBITDA→Earnings→FCF bridge. Informational only — never buy/sell advice.
---
```

Body — these sections, in order, with the content shown/specified:

1. **`# Fundamental Analysis`** + one-line summary: a disciplined, multi-factor lens for evaluating a stock's fundamentals and earnings — produces a Strength/Risk read, the caveats that matter, and the single key question. Informational only.
2. **`## When to use`** — analyzing fundamentals; interpreting a scorecard/tier; evaluating a ticker; reading an earnings report to decide if the view changes. **When NOT:** intraday/technical trading; price prediction; anything needing buy/sell advice.
3. **`## Inputs (data-source-agnostic)`** — list the 11 metrics: Market Cap, Price, YTD %, 52-week range/position, P/E (TTM), P/E (Fwd), Dividend Yield, FCF Yield, Revenue Growth (TTM YoY), Debt/Equity, EV/EBITDA. Sources: pasted data, the `fundamental-screener` app output, or an earnings PDF. State the rule **"Missing ≠ zero — an unavailable metric scores 0, never penalized as 0."**
4. **`## Workflow`** — numbered, structured-but-adaptive:
   1. Gather available metrics; note what's missing.
   2. Read the Strength/Risk scorecard → [scoring-criteria](references/scoring-criteria.md).
   3. Apply the four adjustments + check hard floors (cyclical, financial/buyback D/E, benign-EQ, crowding).
   4. If an earnings report is in play → run the bridges + "did the view change?" → [earnings-analysis](references/earnings-analysis.md).
   5. Surface the 1–2 caveats that matter for THIS stock → [caveats](references/caveats.md).
   6. Deliver the verdict (depth scaled to the ask).
5. **`## Output beats`** — show the template verbatim:
   ```
   TICKER — Company (Sector): Strength X/17 · Risk Y/16 → Tier
   - Key drivers: <criteria moving the score>
   - Caveat(s): <the 1–2 that matter for THIS stock>
   - Key question: <the single decision-determining question>
   (Earnings: what changed vs prior, and whether it shifts the view.)
   ```
   Note: scale depth to the ask — a quick read is fine for simple questions; full breakdown when warranted.
6. **`## Guardrails`** — informational only, never buy/sell/hold; trust live data over stale training-era priors (verify current prices against a live source); missing ≠ zero.

- [ ] **Step 3: Verify frontmatter is valid and name matches the directory**

Run:
```bash
head -5 ~/.claude/skills/fundamental-analysis/SKILL.md
grep -c '^name: fundamental-analysis$' ~/.claude/skills/fundamental-analysis/SKILL.md
```
Expected: frontmatter prints with `name: fundamental-analysis` and `description:`; grep prints `1`.

- [ ] **Step 4: Verify the three reference links are present**

Run:
```bash
grep -oE 'references/[a-z-]+\.md' ~/.claude/skills/fundamental-analysis/SKILL.md | sort -u
```
Expected: `references/caveats.md`, `references/earnings-analysis.md`, `references/scoring-criteria.md`.

---

### Task 2: references/scoring-criteria.md

**Files:**
- Create: `~/.claude/skills/fundamental-analysis/references/scoring-criteria.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the scoring reference linked from `SKILL.md` Step (Workflow 2 & 3).

- [ ] **Step 1: Write the file** covering these sections with the EXACT values (copied from `lib/scoring.ts`):

**The 10 criteria** (each scored +1 / 0 / −1, multiplied by tier weight):

| # | Criterion | Weight | +1 when | −1 when |
|---|---|---|---|---|
| 1 | Earnings Quality | ×3 | FCF yield > earnings yield (1÷PE) by >1pp | FCF below EY by >1pp, or FCF < 0 |
| 2 | Leverage (D/E) | ×3 | D/E < 1.0 | D/E > 2.0 |
| 3 | Revenue Growth | ×2 | > 10% YoY | < 0% |
| 4 | FCF Yield Level | ×2 | > 5% | < 2% |
| 5 | P/E Compression | ×2 | Fwd < TTM | Fwd > TTM |
| 6 | Valuation (EV/EBITDA) | ×1 | < 15 | > 25 |
| 7 | Dividend Coverage | ×1 | FCF yield > dividend yield | FCF < dividend (non-payers: 0) |
| 8 | 52W Position | ×1 | < 40% of range | > 90% of range |
| 9 | YTD Momentum | ×1 | positive | negative |
| 10 | Dividend Yield | ×1 | > 1.5% (non-payers: 0) | never negative |

**Two scores:** Strength = sum of positive weighted signals (0–17); Risk = sum of |negative| weighted signals (0–16). Explain WHY split: "how good is the setup?" vs "how dangerous is it?" are different questions.

**Hard floors (force Weak):** −1 on Earnings Quality OR Leverage (Tier 1 elimination); OR Risk ≥ 8.

**The four adjustments:**
1. **Cyclical** (industry matches semiconductors/automobiles): neutralize P/E Compression to 0 — a low forward P/E off peak earnings is a trap, not durable growth.
2. **Leverage neutralization:** D/E scores 0 (not −1) for financials (leverage is structural) AND for buyback-distorted equity — negative D/E or D/E > 10 (`EXTREME_DE_RATIO = 10`). Defer to EV/EBITDA there.
3. **Crowding:** mega-cap (market cap ≥ $200,000,000,000) trading in the top 10% of its 52-week range → cap the tier at Moderate.
4. **Benign earnings quality:** a −1 Earnings Quality is WAIVED from the hard floor (still costs Risk points) when FCF yield ≥ 2% AND revenue growth > 20% — a growth/capex drag, not a cash-conversion flag. Negative/weak FCF never qualifies.

**Tiers (by Strength, unless floored/capped):** Strong = 12+; Moderate = 7–11; Weak = <7 (or disqualified, or Risk ≥ 8). Crowding caps at Moderate.

**Sync note (include verbatim):** "These thresholds mirror `lib/scoring.ts` in the fundamental-screener repo. If that file changes, update this reference."

- [ ] **Step 2: Verify the exact threshold values are present**

Run:
```bash
grep -E "EXTREME_DE_RATIO = 10|≥ 2%|> 20%|Risk ≥ 8|200,000,000,000|12\+" ~/.claude/skills/fundamental-analysis/references/scoring-criteria.md | wc -l
```
Expected: ≥ 5 (the key exact values are present).

---

### Task 3: references/earnings-analysis.md

**Files:**
- Create: `~/.claude/skills/fundamental-analysis/references/earnings-analysis.md`

**Interfaces:**
- Produces: the earnings reference linked from `SKILL.md` (Workflow 4).

- [ ] **Step 1: Write the file** with these sections:

**The profit ladder:** EBITDA > Earnings (net income) > Free cash flow — each step subtracts more real cost. Define each: EBITDA = profit before interest/taxes/D&A; Earnings = after them; FCF = actual cash after capex + working-capital changes.

**Bridge 1 — EBITDA → Earnings:** subtract D&A, then ± interest, − taxes. Note: a net-cash company *earns* interest → a small add-back, not a drag.

**Bridge 2 — EBITDA → FCF:** subtract taxes, the working-capital build (mostly receivables), and **capex**. Key insight: D&A drops out (non-cash) and is replaced by real capex — that swap (small smoothed D&A → big real capex) is why a heavy investor's FCF sits far below EBITDA.

**Why paper profit ≠ cash (the three reasons):**
- A: revenue booked before the customer pays (receivables) — balloons in hyper-growth.
- B: big cash spent on equipment now, but accounting spreads it (capex vs depreciation).
- C: depreciation is a cost with no cash (can make FCF exceed profit for a mature firm).

**"Did this earnings report change the view?" checklist:**
1. Recompute the scorecard on the fresh numbers.
2. Compare fresh vs the trailing (TTM) figures the screen used — watch for **TTM lag** at cyclical inflection points (the screen lags reality).
3. Distinguish a benign growth drag (strong FCF + surging revenue) from a real cash-conversion problem.
4. Separate what changed structurally (e.g. durable customer agreements) from a normal cyclical peak.

- [ ] **Step 2: Verify the bridges and checklist are present**

Run:
```bash
grep -iE "EBITDA|free cash flow|receivables|capex|TTM lag|did this|changed the view" ~/.claude/skills/fundamental-analysis/references/earnings-analysis.md | wc -l
```
Expected: ≥ 6.

---

### Task 4: references/caveats.md

**Files:**
- Create: `~/.claude/skills/fundamental-analysis/references/caveats.md`

**Interfaces:**
- Produces: the caveats reference linked from `SKILL.md` (Workflow 5).

- [ ] **Step 1: Write the file** with these two sections:

**What the score CAN'T tell you:** margin trend; analyst estimate-revision direction; competitive moat; management quality. (A high score is a hypothesis, not a verdict.)

**Lived lessons (each: the trap + the rule):**
- **Verify live data over stale priors** — don't flag a current price as an anomaly from training-era memory; confirm against a live source (the MU ~$1,020 / $1.15T episode). Rule: when data conflicts with your prior, check a live source, don't assume the feed is wrong.
- **TTM lag** — trailing metrics lag hard at cyclical inflections; fresh earnings beat the trailing screen.
- **Peak-cycle trap** — for cyclicals, cheap forward multiples can be peak earnings extrapolated; trust the balance sheet, distrust trailing multiples.
- **Buyback-distorted book equity** — buybacks shrink equity, so D/E explodes or goes negative; the company isn't worth less; use EV/EBITDA (e.g. MCD D/E ~40 is a denominator artifact).
- **Paper profit ≠ cash** — receivables + capex + depreciation drive the gap; low FCF can be heavy reinvestment (often fine), not a red flag.

- [ ] **Step 2: Verify the caveats are present**

Run:
```bash
grep -iE "estimate-revision|moat|management|live data|TTM lag|peak-cycle|buyback|paper profit" ~/.claude/skills/fundamental-analysis/references/caveats.md | wc -l
```
Expected: ≥ 6.

---

### Task 5: End-to-end validation

**Files:** none created.

- [ ] **Step 1: Confirm the file tree**

Run:
```bash
find ~/.claude/skills/fundamental-analysis -type f | sort
```
Expected:
```
/Users/nabulizi/.claude/skills/fundamental-analysis/SKILL.md
/Users/nabulizi/.claude/skills/fundamental-analysis/references/caveats.md
/Users/nabulizi/.claude/skills/fundamental-analysis/references/earnings-analysis.md
/Users/nabulizi/.claude/skills/fundamental-analysis/references/scoring-criteria.md
```

- [ ] **Step 2: Confirm the skill is discoverable**

In a NEW session (or via the skills list), confirm `fundamental-analysis` appears with its description. (Skills are loaded at session start; a fresh session is required to pick up a newly created skill.)

- [ ] **Step 3: Smoke-test the methodology against a known case**

Apply the skill's scoring rules by hand to NFLX's metrics (Strength 8 / Risk 2 → Moderate) and MU's stale-data metrics (FCF 0.88% → EQ −1, not benign → Weak). Confirm the reference's rules reproduce those tiers. Expected: both match — validating the encoded thresholds and the benign-EQ gate.

- [ ] **Step 4: Commit the plan + spec to the repo** (the only git-tracked artifacts)

```bash
cd ~/Documents/fundamental-screener
git add docs/plans/2026-06-24-fundamental-analysis-skill.md
git commit -m "docs: implementation plan for the fundamental-analysis skill"
```

---

## Self-Review

**1. Spec coverage:**
- Identity/location (spec §1) → Task 1 (dir + frontmatter `name`). ✓
- File structure (spec §2) → File structure block + Tasks 1–4. ✓
- SKILL.md sections (spec §3) → Task 1 Step 2 (all 6 sections + output beats + guardrails). ✓
- scoring-criteria (spec §4) → Task 2 (10 criteria table, two scores, hard floors, 4 adjustments, tiers, sync note). ✓
- earnings-analysis (spec §5) → Task 3 (3 bridges, 3 reasons, checklist). ✓
- caveats (spec §6) → Task 4 (can't-tell + 5 lived lessons). ✓
- Output format (spec) → Task 1 Step 2 §5 (verbatim template). ✓
- Guardrails / informational-only → Global Constraints + Task 1 §6. ✓
- Data-source-agnostic → Task 1 §3. ✓
No gaps.

**2. Placeholder scan:** No "TBD/TODO/handle edge cases/similar to Task N". Exact thresholds and the frontmatter/template are verbatim. The prose sections are specified by required content bullets + exact values, not vague "fill in." ✓

**3. Type/value consistency:** Thresholds appear once (Task 2 table) and match `lib/scoring.ts` (EXTREME_DE_RATIO=10, benign FCF≥2% & rev>20%, Risk≥8, mega-cap $200B, tiers 12+/7–11/<7). Reference filenames are identical across SKILL.md links, tasks, and validation (`scoring-criteria.md`, `earnings-analysis.md`, `caveats.md`). ✓

Notes: skill files are not git-committed (outside a repo) — only the plan/spec are. A fresh session is required for the skill to load.
