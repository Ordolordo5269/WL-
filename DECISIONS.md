# Architecture Decisions

## P4 Fase A: UN Comtrade Bilateral Trade (2026-04-16)

### Decision
Store bilateral TOTAL aggregate trade flows (exports + imports) for 59 reporter economies x 5 years (2020-2024) in the existing `TradeFlow` table.

### Context
- Source: UN Comtrade Preview API (public, no key required)
- Scope: TOTAL aggregate bilateral only (HS-level detail deferred to Fase B)
- ~63K rows, 59 active reporters, 233 countries appear as partners
- M49 codes differ from ISO 3166-1 numeric for USA (842/840), France (251/250), Switzerland (757/756), Norway (579/578), Netherlands (527/528) — script includes `M49_OVERRIDES` map

### Coverage clarification
- **59 reporters**: countries that actively report to Comtrade (USA, CHN, DEU, JPN, GBR, FRA, IND, ITA, BRA, CAN, KOR, RUS, AUS, ESP, MEX, etc.)
- **233 partners**: all countries that appear as trade destinations/origins. A country like Mongolia does not report to Comtrade, but appears as a partner in USA/CHN/RUS reports. Partner-side data depends on what reporters declare — it is not self-reported by the partner.
- **Countries without data as reporters**: BGD (Bangladesh), IRQ (Iraq), DZA (Algeria) returned 0 rows. Trade *to* these countries is available from their partners' reports but trade *from* them is not.

### Methodology note
Values in TradeFlow use Comtrade methodology (IMTS 2010). They can differ 10-20% from national statistics (e.g., US Census Bureau, Brazil MDIC) due to differences in reporting: FOB vs CIF valuation, period of registration, transshipment adjustments, and re-export exclusions. Comtrade values are intercomparable globally (all countries use the same methodology), making them more suitable for cross-country ML/analytics than national statistics.

### Schema
- Added `@@unique([fromId, toId, hsCode, year])` constraint to `TradeFlow` for upsert idempotency
- Direction convention: exports = fromId (reporter) -> toId (partner), imports = fromId (partner) -> toId (reporter)

### API
- `GET /api/trade/:iso3/partners?year=2022&flow=export` — top 20 partners by valueUsd
- `percentOfTotal` is calculated against the real total across ALL partners (not just the top 20 returned)

### Frontend
- Top Trade Partners card in InternationalSection with export/import toggle, horizontal bar chart

### Cron Schedule
- Manual run only (deferred to production). Script: `npx tsx src/scripts/ingest-comtrade-bilateral.ts`
- Checkpoint resume supported via `comtrade-progress.json`
- Rate limit: 1 req/sec + exponential backoff on 429s + 60s pause on 3 consecutive empties

### Sanity checks (2026-04-16)
| Year | Rows   | USD Total   |
|------|--------|-------------|
| 2020 | 16,335 | $13.4T      |
| 2021 | 16,083 | $16.7T      |
| 2022 | 15,556 | $17.3T      |
| 2023 | 15,739 | $16.3T      |
| 2024 | 15,047 | $17.0T      |

Global trade is ~$25T exports + $25T imports. Our $13-17T coverage (~60%) is expected from 59 reporters covering the majority of world trade.

Countries without 2024 data: FRA, IND, RUS, CHE, NOR, VNM, ARE, BGD, IRQ, IRN (not yet published in Comtrade as of 2026-04-16). DZA has 2024 data despite missing 2020-2023.
