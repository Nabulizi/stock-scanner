# Design Spec — `fundamental-analysis` skill

**Date:** 2026-06-24
**Status:** Approved (design); pending implementation plan

## Purpose

Capture the stock-scanning + earnings-analysis framework developed for the
`fundamental-screener` project as a **portable, reusable skill** so any future
session applies the same disciplined analytical lens instead of re-deriving it.

The skill encodes *how to analyze* — it is a methodology, not a tool that runs
the app.

## Scope decisions (from brainstorming)

| Decision | Choice |
|---|---|
| What the skill is | **Analysis methodology (portable lens)** — not an app-runner |
| Output style | **Structured but adaptive** — always hits the key beats, scales depth to the ask |
| Data source | **Agnostic** — works from pasted metrics, scanner output, or an earnings PDF; mentions the scanner as one optional source, depends on none |
| Structure | **Lean `SKILL.md` + reference files** |
| Name | `fundamental-analysis` (invoked `/fundamental-analysis`) |
| Location | `~/.claude/skills/fundamental-analysis/` (personal/global) |

## Non-goals (YAGNI)

- Does **not** run or depend on the `fundamental-screener` app, its dev server,
  or the TLS workaround.
- Does **not** fetch live data itself (it analyzes whatever data is provided).
- Does **not** give buy/sell/hold advice — informational only.

## File structure

```
~/.claude/skills/fundamental-analysis/
  SKILL.md                      # lean entry: triggers, workflow, output beats, guardrails
  references/
    scoring-criteria.md         # 11 metrics, 10 weighted criteria + thresholds,
                                # Strength/Risk, hard floors, the 4 adjustments, tiers
    earnings-analysis.md        # EBITDA→Earnings→FCF bridges + diagnostics +
                                # "did this change the view?" checklist
    caveats.md                  # TTM-lag, verify-live-data, peak-cycle, buyback
                                # distortion, paper-profit-vs-cash, score blind spots
```

## SKILL.md (entry file)

**Frontmatter**
- `name: fundamental-analysis`
- `description:` trigger-rich, third person — e.g. *"Use when analyzing a stock's
  fundamentals, interpreting a Strength/Risk scorecard, evaluating a ticker, or
  reading a company's earnings report to judge whether it changes the investment
  view. Covers the 11-metric Strength/Risk scoring framework, cyclical/financial/
  buyback adjustments, and the EBITDA→Earnings→FCF bridge."*

**Body sections**
1. **When to use / when not** — analyzing fundamentals, a scorecard, a ticker, or
   an earnings report. Not for intraday/technical trading.
2. **Inputs** — the 11 metrics (Market Cap, Price, YTD, 52W range/position,
   P/E TTM, P/E Fwd, Dividend Yield, FCF Yield, Revenue Growth TTM, D/E,
   EV/EBITDA). Sources: pasted data, scanner output, or an earnings PDF.
   **Missing ≠ zero** (an unavailable metric scores 0, never penalized as 0).
3. **Workflow (structured-but-adaptive):**
   1. Gather available metrics; note what's missing.
   2. Read the Strength/Risk scorecard → `references/scoring-criteria.md`.
   3. Apply adjustments + check hard floors (cyclical, financial, buyback D/E,
      benign-EQ, crowding).
   4. If an earnings report is involved → run the bridges + "did the view
      change?" → `references/earnings-analysis.md`.
   5. Surface the 1–2 caveats that matter *for this stock* →
      `references/caveats.md`.
   6. Deliver the verdict.
4. **Output beats:** `Strength X/17 · Risk Y/16 → tier`; the key drivers; the
   1–2 real caveats; **the single key question**; for earnings, what changed.
   Scale depth to the ask.
5. **Guardrails:** informational only (never buy/sell/hold advice); trust live
   data over stale training-era priors; missing ≠ zero.
6. **Pointers** to the three reference files.

## references/scoring-criteria.md

Prose mirror of the scanner's `lib/scoring.ts`:

- **10 criteria**, each scored +1 / 0 / −1, with thresholds and tier weights:
  - ×3 (Survival & Quality): Earnings Quality (FCF yield vs earnings yield, ±1pp),
    Leverage (D/E <1.0 → +1, >2.0 → −1)
  - ×2 (Fundamental Strength): Revenue Growth (>10% / <0%), FCF Yield Level
    (>5% / <2%), P/E Compression (Fwd<TTM / Fwd>TTM)
  - ×1 (Valuation/Timing/Income): EV/EBITDA (<15 / >25), Dividend Coverage
    (FCF vs dividend), 52W Position (<40% / >90%), YTD (pos/neg), Dividend
    Yield (>1.5%, never negative)
- **Two scores:** Strength = sum of positive weighted signals (0–17);
  Risk = sum of |negative| weighted signals (0–16).
- **Hard floors → Weak:** −1 on Earnings Quality or Leverage (Tier 1
  elimination), or Risk ≥ 8.
- **Four adjustments:**
  1. Cyclical (semis/autos): neutralize P/E compression (peak-earnings trap).
  2. Leverage: neutralize D/E for financials and for buyback-distorted equity —
     negative D/E or D/E > 10 (`EXTREME_DE_RATIO`); defer to EV/EBITDA.
  3. Crowding: mega-cap ($200B+) near 52W high → cap at Moderate.
  4. Benign earnings quality: a −1 EQ is waived from the floor (still costs Risk)
     when FCF yield ≥ 2% AND revenue growth > 20% (growth/capex drag, not a
     cash-conversion flag); negative/weak FCF never qualifies.
- **Tiers by Strength:** Strong 12+, Moderate 7–11, Weak <7 (or disqualified).

## references/earnings-analysis.md

- **The three bridges:**
  - EBITDA → Earnings: subtract D&A, interest, taxes (note net-cash firms earn
    interest → a small add-back, not a drag).
  - EBITDA → FCF: subtract taxes, working-capital build (receivables), and
    **capex** (D&A drops out — non-cash; replaced by real capex).
  - Full ladder: EBITDA > Earnings > FCF, each step subtracting more real cost.
- **Diagnostics:** receivables build (Reason A — sold not yet collected), capex
  vs D&A (Reason B — cash now, spread on books), depreciation as non-cash
  (Reason C), taxes, net-cash interest.
- **"Did this change the view?" checklist:** compare fresh vs trailing; watch
  for **TTM-lag** at cyclical inflections; distinguish a benign growth drag from
  a real cash-conversion problem; recompute the scorecard on fresh numbers.

## references/caveats.md

- **What the score can't tell you:** margin trend, analyst estimate-revision
  direction, competitive moat, management quality.
- **Lived lessons:**
  - **Verify live data over stale priors** — don't flag a current price as an
    anomaly from training-era memory (the MU ~$1,020 episode); confirm against a
    live source.
  - **TTM lag** — trailing metrics badly lag reality at cyclical inflection
    points; fresh earnings beat the trailing screen.
  - **Peak-cycle trap** — for cyclicals, low forward multiples can be peak
    earnings extrapolated; trust the balance sheet, distrust trailing multiples.
  - **Buyback-distorted book equity** — D/E explodes or goes negative when
    buybacks shrink equity; the company isn't worth less; use EV/EBITDA.
  - **Paper profit ≠ cash** — receivables, capex, and depreciation drive the gap
    between earnings and free cash flow.

## Output format (example)

```
TICKER — Company (Sector): Strength X/17 · Risk Y/16 → Tier
- Key drivers: <the criteria moving the score>
- Caveat(s): <the 1–2 that matter for THIS stock>
- Key question: <the single decision-determining question>
(For earnings: what changed vs prior, and whether it shifts the view.)
```

## Success criteria

- Invoking the skill on a set of metrics reproduces the scanner's tier logic
  (Strength/Risk + adjustments + hard floors) without the app.
- Given an earnings report, it produces the bridges and a "did the view change?"
  read consistent with the methodology.
- Output is structured-but-adaptive and never gives buy/sell advice.
- The framework can be extended by editing the reference files without bloating
  `SKILL.md`.

## Open items / notes

- Spec lives in the `fundamental-screener` repo (the framework's origin); the
  skill itself installs to `~/.claude/skills/` (not version-controlled by
  default — back up separately if desired).
- Keep `scoring-criteria.md` in sync with `lib/scoring.ts` if the scanner's
  logic changes (note this in the reference file).
