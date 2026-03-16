---
name: find-stock-report
description: Find official annual reports plus interim, semiannual, and quarterly reports for Hong Kong stocks, A-shares, and U.S. listed companies, and return downloadable source links. Use this skill when the user gives a stock name or ticker and wants the default filing set, historical report URLs, or market-specific filing searches across HKEX, CNINFO, SSE, SZSE, or SEC EDGAR.
---

# Find Stock Report

Find official report downloads for listed companies in Hong Kong, mainland China, and the United States.

## Default Request Handling

If the user only provides a stock name or ticker, return this default set:

- the last 10 years of annual reports
- the last 3 years of interim or semiannual reports
- the last 3 years of quarterly reports when that market provides them as a standard disclosure

If a market does not use the exact same report structure, map to the closest official filing and explain the mapping in notes.

## Workflow

1. Identify the company, ticker, exchange, and target year range.
2. If the user did not specify a range, use the default filing set.
3. Check the preferred-source whitelist in `references/source-whitelist.md`.
4. If the company or domain matches a whitelist rule, search that source first.
5. Otherwise use official exchange or regulator sources before any third-party site.
6. Map the requested report type by market:
   - Hong Kong: annual report, interim report, quarterly report only when officially published by the issuer or exchange source
   - A-share: annual report, semiannual report, first-quarter report, third-quarter report
   - U.S.: annual filing plus the closest half-year and quarterly disclosures
7. Collect the filing date, report title, source page URL, and direct PDF URL when available.
8. Return results in a compact table and clearly mark any missing years.

## Source Priority Rules

- First use a user-provided source when the user explicitly gives one.
- Otherwise check the preferred-source whitelist.
- If neither applies, use the default official source order from [references/official-sources.md](references/official-sources.md).
- In output notes, label whitelist hits as `preferred-source whitelist`.

## Market Rules

### Hong Kong

- If the user provides a preferred report source for a specific company, search that source first.
- Use HKEXnews first when no whitelist rule overrides it.
- Search by stock code when available because company-name matching can be inconsistent.
- Treat `annual report` and `interim report` as the primary targets.
- Quarterly reports are not universal in Hong Kong. Only include them when an official filing exists, and label missing periods clearly.
- If multiple language versions exist, prefer the language the user asked for. Otherwise prefer English title plus the official PDF link.

### A-share

- If the user provides a preferred report source for a specific company, search that source first.
- Use CNINFO first for Shenzhen and Shanghai listed companies when no whitelist rule overrides it.
- When CNINFO search is incomplete or rate-limited, fall back to the issuer pages on SSE or SZSE.
- Treat `annual report`, `semiannual report`, `first-quarter report`, and `third-quarter report` as the primary targets.
- Use the official announcement title, not a translated title you invent.

### U.S.

- Use SEC EDGAR first.
- For annual reports, prefer:
  - `10-K`
  - `20-F`
  - `40-F`
- For `中报`, map to the closest half-year official disclosure and explain the mapping:
  - domestic issuers: the Q2 `10-Q` is usually the closest half-year equivalent
  - foreign private issuers: a `6-K` or explicit half-year report may be the closest equivalent
- For quarterly reports, prefer official quarterly filings such as `10-Q`.
- Do not label every U.S. quarterly filing as `中报`; explain when only quarterly disclosures exist.

## Output Format

Use these three sections unless the user asks for something else:

### Annual Reports

Use a table with these columns:

| Company | Market | Year | Filing Date | Source | Download URL |
| --- | --- | --- | --- | --- | --- |

Include the last 10 years, newest to oldest.

### Interim Reports

Use a table with these columns:

| Company | Market | Year | Report Type | Filing Date | Source | Download URL |
| --- | --- | --- | --- | --- | --- | --- |

Include the last 3 years, newest to oldest.

### Quarterly Reports

Use a table with these columns:

| Company | Market | Year | Quarter or Type | Filing Date | Source | Download URL |
| --- | --- | --- | --- | --- | --- | --- |

Include the last 3 years, newest to oldest.
If the market does not provide standard quarterly reports, say so in this section instead of fabricating rows.

After the three sections, add:

- `Missing years or periods`: list years or quarters you could not verify
- `Notes`: explain market-specific mapping, whitelist hits, or naming differences

## Guardrails

- If the user explicitly names a preferred source, search it before the whitelist and default source order and label it as `user-provided source`.
- If a whitelist rule applies, search it before the default source order and label it as `preferred-source whitelist`.
- Prefer official regulator or exchange sources only when no higher-priority source is provided.
- Do not fabricate direct PDF links.
- Keep source page URL when a direct PDF URL is not stable or not exposed.
- Use exact filing years and dates.
- If a company is dual-listed, separate results by market.
- If a company changed name or ticker, mention it and continue the search with both identifiers.

## Tooling

- If the `browser-use` skill is available, use it for repetitive site navigation, pagination, and download-link extraction.
- If a PDF skill is available, use it only after the filing links have been found.

## References

Read [references/official-sources.md](references/official-sources.md) before searching so the correct default source is used for each market.
Read [references/source-whitelist.md](references/source-whitelist.md) before searching so preferred domains and company-specific overrides are applied consistently.
