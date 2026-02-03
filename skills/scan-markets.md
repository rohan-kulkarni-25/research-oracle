# Skill: Scan Markets

Find active Polymarket markets worth analyzing.

## API Endpoints

```javascript
const API = {
  GAMMA: 'https://gamma-api.polymarket.com',
  CLOB: 'https://clob.polymarket.com'
};
```

## Fetch Active Markets

```bash
curl -s "https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=50"
```

## Market Selection Criteria

### Good Markets (Analyze These)
- **Volume > $50K** - Enough liquidity to trade
- **Resolvable** - Has a definite answer (not opinion)
- **Near-term** - Resolves within 30 days (faster feedback)
- **Verifiable** - We can research the answer
- **Binary or few outcomes** - Simpler to analyze

### Skip These
- Opinion/subjective markets ("Will X be popular?")
- Very long-term (>6 months)
- Low volume (<$10K)
- Already at 95%+ or 5%- (no edge room)

## Market Categories

| Category | LLM Edge | Examples |
|----------|----------|----------|
| **Politics** | HIGH | Elections, policy outcomes, votes |
| **Economics** | MEDIUM | Fed rates, GDP, inflation data |
| **Sports** | LOW | Too efficient, experts dominate |
| **Crypto** | MEDIUM | ETF approvals, regulatory |
| **Events** | HIGH | Court rulings, announcements |

## Scan Output Format

```json
{
  "scanTime": "2026-02-03T23:00:00Z",
  "marketsScanned": 50,
  "candidates": [
    {
      "id": "market-id",
      "question": "Will X happen?",
      "volume": 500000,
      "currentPrice": {
        "yes": 0.65,
        "no": 0.35
      },
      "endDate": "2026-02-15",
      "category": "politics",
      "worthAnalyzing": true,
      "reason": "High volume, resolvable, near-term"
    }
  ]
}
```

## Quick Scan Command

```bash
curl -s "https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=30" | \
jq '[.[] | select(.volumeNum > 50000)] | .[] | {
  question: .question[0:70],
  volume: .volumeNum,
  yes: .outcomePrices[0],
  no: .outcomePrices[1],
  endDate: .endDate
}'
```

## Prioritization

1. **Edge potential** = |market_price - 50%|
   - Markets near 50/50 have most room for edge
   - Markets at 90/10 are harder to find mispricing

2. **Resolution proximity**
   - Closer = faster feedback = better learning
   - But need enough time to research

3. **Information availability**
   - Can we actually research this?
   - Are there official data sources?
