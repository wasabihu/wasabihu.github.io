# Official Sources

Use these sources in this order unless the user explicitly provides a preferred source for a specific company.

## User-Provided Preferred Source

If the user gives a filing page or domain and asks for it to be searched first, use it before the default market source order.

Examples:

- Tencent annual report source on Futubull / Futu News notice pages
- Sina Finance bulletin pages, such as the annual report list for Focus Media

## Hong Kong Stocks

Primary source:

- HKEXnews disclosure portal: `https://www.hkexnews.hk/`

Search guidance:

- Prefer stock code search.
- Look for report titles containing `Annual Report`, `Interim Report`, or their Chinese equivalents.
- Quarterly reports are optional and issuer-specific. Only include them when an official source provides them.
- Keep the announcement page URL and the PDF URL when both are visible.

## A-shares

Primary source:

- CNINFO disclosure portal: `https://www.cninfo.com.cn/`

Fallback sources:

- Shanghai Stock Exchange: `https://www.sse.com.cn/`
- Shenzhen Stock Exchange: `https://www.szse.cn/`

Preferred-source examples:

- Sina Finance bulletin pages like `money.finance.sina.com.cn/corp/view/vCB_Bulletin.php?...`

Search guidance:

- Use ticker plus company name if needed.
- Look for titles containing `年度报告`, `年报`, `半年度报告`, `半年报`, `第一季度报告`, `一季报`, `第三季度报告`, or `三季报`.
- Prefer the original disclosure title from the exchange or bulletin page.

## U.S. Stocks

Primary source:

- SEC EDGAR company filings: `https://www.sec.gov/edgar/search/`

Search guidance:

- Search by ticker or registrant name.
- Annual reports usually map to `10-K`, `20-F`, or `40-F`.
- Half-year style requests should map to the closest official disclosure:
  - `10-Q` for the second quarter when the issuer files quarterly
  - `6-K` or explicit half-year materials for foreign private issuers
- Quarterly requests should prefer official quarterly filings such as `10-Q`.
- Keep both the filing detail page and the document URL when possible.

## Normalization Rules

- Normalize report type into one of:
  - `annual report`
  - `interim report`
  - `semiannual report`
  - `half-year equivalent`
  - `quarterly report`
- Preserve the original filing form in notes when the normalized label hides market differences.
