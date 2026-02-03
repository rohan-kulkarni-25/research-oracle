# Skill: Position Sizing

Calculate optimal bet size based on edge and confidence.

## Kelly Criterion (Modified)

The mathematically optimal bet size given edge and odds.

```javascript
function kellyBet(probability, marketPrice, bankroll) {
  // probability = our estimate (e.g., 0.75)
  // marketPrice = current YES price (e.g., 0.65)
  // bankroll = available capital (e.g., $50)

  // Edge = our probability - market probability
  const edge = probability - marketPrice;

  // Odds = potential win / potential loss
  // If we buy YES at 65¢, we win 35¢ if right, lose 65¢ if wrong
  const winAmount = 1 - marketPrice;  // 0.35
  const loseAmount = marketPrice;      // 0.65
  const odds = winAmount / loseAmount; // 0.538

  // Kelly formula: f = (p * b - q) / b
  // where p = win probability, q = lose probability, b = odds
  const p = probability;
  const q = 1 - probability;
  const b = odds;

  const kellyFraction = (p * b - q) / b;

  // Never bet more than Kelly suggests
  // Use HALF Kelly for safety (reduces variance)
  const halfKelly = kellyFraction / 2;

  // Position size in dollars
  const positionSize = Math.max(0, halfKelly * bankroll);

  return {
    fullKelly: kellyFraction,
    halfKelly: halfKelly,
    positionSize: positionSize,
    edge: edge
  };
}
```

## Position Sizing Rules

### Based on Confidence

| Confidence | Kelly Multiplier | Example ($50) |
|------------|------------------|---------------|
| HIGH | 0.5 (half Kelly) | Up to $10 |
| MEDIUM | 0.25 (quarter Kelly) | Up to $5 |
| LOW | 0 (no bet) | $0 |

### Based on Edge Size

| Edge | Action |
|------|--------|
| > 15% | Full position (max $10) |
| 10-15% | 75% position |
| 5-10% | 50% position |
| < 5% | No trade |

### Hard Limits ($50 Capital)

```javascript
const LIMITS = {
  maxSingleBet: 10,      // Never bet more than $10 (20%)
  maxDailyLoss: 15,      // Stop if down $15 (30%)
  maxOpenPositions: 3,   // Don't overconcentrate
  minBetSize: 2,         // Not worth it below $2
  feeBuffer: 0.02        // Account for 2% fees
};
```

## Position Size Calculator

```javascript
function calculatePositionSize(analysis, portfolio) {
  const { myEstimate, marketPrice, confidence } = analysis;
  const { capital, openPositions, dailyLoss } = portfolio;

  // Check if we can trade
  if (dailyLoss >= 15) {
    return { size: 0, reason: "Daily loss limit reached" };
  }

  if (openPositions.length >= 3) {
    return { size: 0, reason: "Max positions reached" };
  }

  // Calculate edge
  const edge = myEstimate - marketPrice;
  if (edge < 0.05) {
    return { size: 0, reason: "Edge too small (<5%)" };
  }

  // Calculate Kelly
  const kelly = kellyBet(myEstimate, marketPrice, capital);

  // Apply confidence multiplier
  const confMultiplier = {
    'HIGH': 0.5,
    'MEDIUM': 0.25,
    'LOW': 0
  }[confidence];

  let size = kelly.positionSize * confMultiplier;

  // Apply limits
  size = Math.min(size, 10);           // Max $10
  size = Math.min(size, capital * 0.2); // Max 20% of capital
  size = Math.max(size, 0);

  // Round to nearest dollar
  size = Math.round(size);

  // Check minimum
  if (size < 2) {
    return { size: 0, reason: "Below minimum bet size" };
  }

  return {
    size,
    edge: (edge * 100).toFixed(1) + '%',
    kellyFraction: (kelly.halfKelly * 100).toFixed(1) + '%',
    expectedValue: (size * edge).toFixed(2)
  };
}
```

## Example

```
Market: "Will X happen?"
Market Price: 65% YES
My Estimate: 80% YES
Confidence: HIGH
Capital: $50

Calculation:
- Edge: 80% - 65% = 15%
- Kelly: ~18% of bankroll = $9
- Half Kelly: $4.50
- Confidence (HIGH): × 0.5 = $4.50
- Final size: $5 (rounded)

Expected value: $5 × 15% = $0.75
```

## Output Format

```json
{
  "market": "Question",
  "side": "YES",
  "marketPrice": 0.65,
  "myEstimate": 0.80,
  "edge": "15.0%",
  "confidence": "HIGH",
  "positionSize": 5,
  "expectedValue": 0.75,
  "riskAmount": 3.25,
  "potentialWin": 1.75,
  "reasoning": "15% edge, high confidence, half-Kelly sizing"
}
```
