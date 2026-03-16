# Preferred Source Whitelist

Use this list before the default market source order when the user did not explicitly provide a source.

## Rule Order

Apply rules in this order:

1. Exact company-specific rule
2. Exchange and market-specific rule
3. Domain pattern rule
4. Default official source order

If multiple whitelist rules match, prefer the most specific company rule.

## Company-Specific Rules

### Tencent

- Market: Hong Kong
- Preferred domain: `news.futunn.com`
- Preferred path pattern: `/notice/`
- Usage: search Futubull / Futu News notice pages first for annual, interim, and other report pages when they are available
- Label in notes: `preferred-source whitelist`

### Focus Media

- Market: A-share
- Preferred domain: `money.finance.sina.com.cn`
- Preferred path pattern: `/corp/view/vCB_Bulletin.php`
- Usage: search Sina Finance bulletin pages first for annual, interim, and quarterly report lists when they are available
- Label in notes: `preferred-source whitelist`

## Domain Pattern Rules

Use these when no exact company rule exists.

### Futu Notice Pages

- Domain: `news.futunn.com`
- Pattern: report or notice pages that expose downloadable filings
- Typical market fit: Hong Kong stocks, especially when the user already trusts this source

### Sina Finance Bulletin Pages

- Domain: `money.finance.sina.com.cn`
- Pattern: bulletin list pages under `/corp/view/`
- Typical market fit: A-shares with organized historical report lists

## Maintenance Rules

- Add new domains only after the user confirms they are trustworthy for filing retrieval.
- Keep the company name, market, domain, path pattern, and intended usage together in one rule.
- Prefer narrow company-specific rules over broad domain rules when a source is known to work especially well for one issuer.
- Do not remove official-source fallback behavior.
