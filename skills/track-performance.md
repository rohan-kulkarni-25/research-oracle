# Skill: Track Performance

Monitor predictions, outcomes, and learn from results.

## Data Files

```
records/
├── state.json           # Current portfolio state
├── predictions.jsonl    # All predictions made
├── outcomes.jsonl       # Resolved predictions
└── performance.json     # Aggregated metrics
```

## state.json Schema

```json
{
  "version": 1,
  "mode": "paper",
  "lastUpdate": "2026-02-03T23:00:00Z",

  "portfolio": {
    "capital": 50.00,
    "initial": 50.00,
    "openPositions": []
  },

  "positions": [
    {
      "id": "pos-1",
      "marketId": "market-abc",
      "question": "Will X happen?",
      "side": "YES",
      "entryPrice": 0.65,
      "shares": 7.69,
      "costBasis": 5.00,
      "entryTime": "2026-02-03T10:00:00Z",
      "myEstimate": 0.80,
      "confidence": "HIGH",
      "thesis": "Evidence shows..."
    }
  ],

  "dailyStats": {
    "date": "2026-02-03",
    "startCapital": 50.00,
    "betsPlaced": 0,
    "betsWon": 0,
    "betsLost": 0,
    "pnl": 0
  },

  "allTimeStats": {
    "totalBets": 0,
    "wins": 0,
    "losses": 0,
    "totalPnl": 0,
    "winRate": 0,
    "avgEdge": 0,
    "avgConfidence": 0
  }
}
```

## predictions.jsonl Format

One prediction per line (append-only):

```json
{"id":"pred-1","ts":"2026-02-03T10:00:00Z","market":"market-abc","question":"Will X?","side":"YES","marketPrice":0.65,"myEstimate":0.80,"confidence":"HIGH","edge":0.15,"betSize":5.00,"thesis":"Evidence shows...","analysts":{"baseRate":0.75,"evidence":0.82,"contrarian":0.78}}
```

## outcomes.jsonl Format

When market resolves:

```json
{"id":"pred-1","resolvedAt":"2026-02-15T00:00:00Z","outcome":"YES","marketPrice":0.65,"myEstimate":0.80,"actualResult":1.00,"correct":true,"pnl":1.75,"holdDays":12}
```

## Performance Metrics

### Accuracy
```javascript
const accuracy = outcomes.filter(o => o.correct).length / outcomes.length;
// Target: > 55%
```

### Calibration
```javascript
// Group predictions by confidence bucket
// Check if 80% estimates are right 80% of the time
const calibration = {
  "0.5-0.6": { predicted: 0.55, actual: 0.52 },
  "0.6-0.7": { predicted: 0.65, actual: 0.68 },
  "0.7-0.8": { predicted: 0.75, actual: 0.73 },
  "0.8-0.9": { predicted: 0.85, actual: 0.81 }
};
// Well-calibrated if predicted ≈ actual
```

### Brier Score
```javascript
// Lower is better (0 = perfect)
const brierScore = outcomes.reduce((sum, o) => {
  const predicted = o.myEstimate;
  const actual = o.actualResult;
  return sum + Math.pow(predicted - actual, 2);
}, 0) / outcomes.length;
// Target: < 0.2
```

### Edge Realization
```javascript
// Did we capture our expected edge?
const expectedPnl = predictions.reduce((sum, p) => sum + (p.edge * p.betSize), 0);
const actualPnl = outcomes.reduce((sum, o) => sum + o.pnl, 0);
const edgeRealization = actualPnl / expectedPnl;
// Target: > 0.8 (captured 80%+ of expected edge)
```

## Learning Analysis

After 10+ predictions, analyze:

```javascript
async function analyzePerformance(predictions, outcomes) {
  const prompt = `
Analyze these prediction market results:

PREDICTIONS: ${predictions.length}
WINS: ${outcomes.filter(o => o.correct).length}
LOSSES: ${outcomes.filter(o => !o.correct).length}
TOTAL P&L: $${outcomes.reduce((s, o) => s + o.pnl, 0).toFixed(2)}

DETAILS:
${outcomes.map(o => `
- ${o.question}
  Predicted: ${(o.myEstimate * 100).toFixed(0)}% | Actual: ${o.outcome}
  Edge claimed: ${(o.edge * 100).toFixed(0)}% | P&L: $${o.pnl.toFixed(2)}
  Thesis: ${o.thesis}
`).join('\n')}

Analyze:
1. What types of predictions were most accurate?
2. What types were least accurate?
3. Were we overconfident or underconfident?
4. What patterns led to wins vs losses?
5. Specific improvements to make?

Return actionable lessons.
`;

  return await runAnalysis(prompt);
}
```

## Dashboard Output

```
╔══════════════════════════════════════════════════════════════╗
║                 POLYMARKET PERFORMANCE                       ║
╠══════════════════════════════════════════════════════════════╣
║  Capital: $52.30 (+$2.30 / +4.6%)                           ║
║                                                              ║
║  STATS              ALL-TIME    LAST 7 DAYS                 ║
║  Predictions:       15          8                            ║
║  Win Rate:          60%         62.5%                        ║
║  Avg Edge:          12%         14%                          ║
║  Total P&L:         +$2.30      +$1.80                       ║
║  Brier Score:       0.18        0.15                         ║
║                                                              ║
║  OPEN POSITIONS (2)                                          ║
║  • "Will X?" - YES @ 65¢ ($5) - Est: 80%                    ║
║  • "Will Y?" - NO @ 40¢ ($3) - Est: 25%                     ║
║                                                              ║
║  RECENT OUTCOMES                                             ║
║  ✓ "Market A" - Won +$1.20 (predicted 75%, happened)        ║
║  ✗ "Market B" - Lost -$0.80 (predicted 70%, didn't)         ║
╚══════════════════════════════════════════════════════════════╝
```

## Review Schedule

- **After each resolution**: Log outcome, calculate metrics
- **Weekly**: Full performance review, identify patterns
- **After 20 predictions**: Deep analysis of calibration
- **Monthly**: Adjust strategies based on learnings
