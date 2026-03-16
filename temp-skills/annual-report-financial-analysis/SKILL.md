---
name: annual-report-financial-analysis
description: Analyze company annual reports, 10-K filings, and financial statements. Use this skill when the user wants ratio analysis, trend analysis, risk review, management discussion review, or a structured investment-style summary from a PDF or extracted annual report text.
---

# Annual Report Financial Analysis

## Overview

Use this skill to review a company annual report or 10-K in a repeatable way and produce a concise financial analysis. Focus on business quality, revenue and margin trends, cash flow quality, balance sheet risk, segment performance, management commentary, and disclosed risks.

If the source document is a PDF, prefer using a PDF-capable workflow first to extract or inspect the contents, then apply this skill to the extracted text and tables.

If the user specifies A-share, Hong Kong, or U.S. listed companies, adjust the reading order and red-flag checklist based on the market-specific guidance in [references/market-differences.md](references/market-differences.md).

## Workflow

1. Identify the reporting period, company name, listing market, filing type, reporting currency, and whether the document is audited.
2. Extract the main sections needed for analysis:
   - income statement
   - balance sheet
   - cash flow statement
   - management discussion
   - risk factors
   - segment or geographic disclosures
3. If the market is A-share, Hong Kong, or U.S., read [references/market-differences.md](references/market-differences.md) before forming conclusions.
4. Build a simple period-over-period view for revenue, gross margin, operating margin, net income, operating cash flow, free cash flow, debt, and share count if available.
5. Compute and explain the most relevant ratios rather than listing every possible ratio.
6. Highlight what improved, what deteriorated, and what needs follow-up.
7. End with a short analyst-style conclusion that separates facts from interpretation.

## Ratio Set

Always prefer a compact, decision-useful set:

- growth: revenue growth, operating income growth, EPS growth if available
- profitability: gross margin, operating margin, net margin, ROA, ROE when inputs are available
- liquidity: current ratio, quick ratio when inventory is material
- leverage: debt-to-equity, debt-to-assets, interest coverage if interest expense is disclosed
- cash flow: operating cash flow margin, free cash flow, free cash flow conversion
- efficiency: asset turnover, inventory turnover, receivables days when enough data exists

If inputs are missing, say so instead of fabricating calculations.

## Annual Report Focus Areas

Pay extra attention to these annual-report-specific areas:

- accounting policy changes or restatements
- one-off gains, impairments, restructuring, or unusual items
- working-capital swings that distort cash flow
- debt maturity profile and refinancing risk
- dilution, buybacks, and changes in share count
- segment concentration and geographic concentration
- management explanations that do not align with the numbers
- risk disclosures that could materially affect future earnings or cash flow

## Market Lens

Use the broadest common lens first, then apply market-specific checks:

- A-share: focus more on non-recurring profit items, subsidies, related-party dealings, customer and supplier concentration, pledge risk, and capital expenditure quality.
- Hong Kong: focus more on connected transactions, IFRS adjustments, fair-value effects, offshore holding structures, and governance or ESG narrative consistency.
- U.S.: focus more on 10-K risk factors, MD&A quality, non-GAAP reconciliation, stock-based compensation, goodwill or impairment risk, and internal control disclosures.

## Output Format

Use this structure unless the user asks for something else:

### Company Snapshot

- company
- period
- listing market
- filing type
- currency

### Key Financial Trends

- 3 to 7 bullets summarizing the most important numeric changes

### Ratio Analysis

- short bullets grouped by profitability, liquidity, leverage, and cash flow

### Management Commentary Check

- summarize whether management explanations are supported by the financials

### Risk Flags

- list concrete balance-sheet, cash-flow, customer, regulatory, or governance concerns

### Bottom Line

- 3 to 5 sentences
- separate facts, concerns, and inference

## Guardrails

- Do not present estimates as reported figures.
- Distinguish clearly between reported data and your interpretation.
- If only partial statements are available, narrow the scope and say what is missing.
- When possible, cite the section or table name from the annual report.
- If the market-specific disclosure framework is unclear, say which assumptions you made.

## References

If you need a reusable checklist for deep reviews, read [references/annual-report-checklist.md](references/annual-report-checklist.md).

If the user asks for A-share, Hong Kong, or U.S. market differences, read [references/market-differences.md](references/market-differences.md).
