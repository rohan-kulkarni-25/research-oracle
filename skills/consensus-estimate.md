# Skill: Consensus Estimate

Run multiple independent analyses and combine for robust estimate.

## Why Consensus?

Single LLM estimates can be:
- Biased by prompt framing
- Overconfident
- Missing perspectives

Running 3 independent analyses with different framings improves accuracy.

## The 3 Analysts

### Analyst 1: BASE RATE Analyst
Focus on historical precedent and statistics.

```
You are a BASE RATE analyst. Your job is to estimate probability
using ONLY historical data and statistics.

QUESTION: [market question]

Research:
1. How often has this type of event occurred historically?
2. What are the base rates for similar events?
3. What does statistical analysis suggest?

Ignore:
- Current news and sentiment
- Recent events (unless statistically relevant)
- Gut feelings

Provide your probability estimate based ONLY on base rates.

Format:
BASE_RATE_ESTIMATE: [0-100]%
HISTORICAL_EVIDENCE: [list key statistics]
CONFIDENCE: [HIGH/MEDIUM/LOW]
```

### Analyst 2: CURRENT EVIDENCE Analyst
Focus on recent developments and news.

```
You are a CURRENT EVIDENCE analyst. Your job is to estimate
probability using recent news and developments.

QUESTION: [market question]

Research:
1. What has happened recently that affects this?
2. What do experts and officials say?
3. What is the current trajectory?

Provide your probability estimate based on current evidence.

Format:
EVIDENCE_ESTIMATE: [0-100]%
KEY_DEVELOPMENTS: [list recent news]
CONFIDENCE: [HIGH/MEDIUM/LOW]
```

### Analyst 3: CONTRARIAN Analyst
Actively look for reasons the consensus is wrong.

```
You are a CONTRARIAN analyst. Your job is to find reasons
the market consensus might be WRONG.

QUESTION: [market question]
MARKET PRICE: [X]% YES

Research:
1. What is the market missing?
2. What could go wrong (or right) that people aren't considering?
3. Why might the obvious answer be incorrect?

Provide your probability estimate, especially if it differs from market.

Format:
CONTRARIAN_ESTIMATE: [0-100]%
MARKET_BLINDSPOTS: [what market is missing]
CONFIDENCE: [HIGH/MEDIUM/LOW]
```

## Combining Estimates

### Simple Average
```
combined = (base_rate + evidence + contrarian) / 3
```

### Confidence-Weighted
```
weights = {
  HIGH: 1.0,
  MEDIUM: 0.7,
  LOW: 0.4
}

combined = sum(estimate * weight) / sum(weights)
```

### Agreement Check
```
If all 3 agree within 10%: HIGH confidence in combined
If 2/3 agree within 10%: MEDIUM confidence
If all 3 disagree by >15%: LOW confidence, investigate
```

## Consensus Output

```json
{
  "market": "Question",
  "marketPrice": 0.65,
  "estimates": {
    "baseRate": { "estimate": 0.72, "confidence": "MEDIUM" },
    "evidence": { "estimate": 0.80, "confidence": "HIGH" },
    "contrarian": { "estimate": 0.68, "confidence": "MEDIUM" }
  },
  "combined": {
    "estimate": 0.75,
    "method": "confidence_weighted",
    "agreement": "2/3 within 10%",
    "confidence": "MEDIUM"
  },
  "mispricing": {
    "detected": true,
    "direction": "UNDERPRICED",
    "magnitude": 0.10,
    "tradeable": true
  }
}
```

## When to Trade

| Agreement | Mispricing | Action |
|-----------|------------|--------|
| 3/3 agree | > 10% | TRADE (full size) |
| 2/3 agree | > 10% | TRADE (half size) |
| 3/3 agree | 5-10% | TRADE (small size) |
| Disagree | Any | NO TRADE (more research) |
| Any | < 5% | NO TRADE (edge too small) |

## Execution Flow

```
1. Select market to analyze
2. Run 3 analyst agents IN PARALLEL
3. Collect estimates
4. Calculate combined estimate
5. Check agreement
6. If tradeable: proceed to position sizing
7. If not: log and move to next market
```
