# Oracle Research Skill

## Purpose
Deep research for probability estimation. Used by the 3-analyst consensus system.

## When to Use
- Called automatically by the consensus engine
- Each analyst (BASE RATE, EVIDENCE, CONTRARIAN) uses this framework

## Research Framework

### 1. Question Analysis
- Parse the question to identify:
  - Subject/entity being predicted
  - Outcome being measured
  - Time horizon/deadline
  - Category (politics, crypto, events, sports, other)

### 2. Information Gathering

**For BASE RATE Analyst:**
```
- Historical precedent: How often has this type of event occurred?
- Reference class: What similar situations exist?
- Statistical base rates from reliable sources
- Ignore current news - focus only on historical data
```

**For EVIDENCE Analyst:**
```
- Recent news articles (last 30 days)
- Expert opinions and forecasts
- Current trends and momentum
- Leading indicators
- Official announcements or statements
```

**For CONTRARIAN Analyst:**
```
- What is the consensus missing?
- Potential black swan events
- Hidden risks or opportunities
- Counter-arguments to majority view
- What would make the opposite outcome happen?
```

### 3. Probability Estimation

Return a JSON object:
```json
{
  "estimate": 0.65,
  "reasoning": "Clear explanation of why this probability...",
  "confidence": "MEDIUM"
}
```

**Confidence Levels:**
- HIGH: Strong evidence, clear historical pattern, low uncertainty
- MEDIUM: Moderate evidence, some uncertainty, mixed signals
- LOW: Limited evidence, high uncertainty, novel situation

### 4. Quality Checks

Before finalizing:
- Is the estimate between 0 and 1?
- Is the reasoning specific and evidence-based?
- Does confidence level match the quality of available information?
- Are sources cited when available?

## Example Outputs

### BASE RATE Example
```json
{
  "estimate": 0.35,
  "reasoning": "Historically, Fed rate cuts in Q1 occur approximately 35% of the time when preceded by a rate hike cycle. Looking at the last 10 rate hike cycles, 3 resulted in Q1 cuts the following year.",
  "confidence": "MEDIUM"
}
```

### EVIDENCE Example
```json
{
  "estimate": 0.45,
  "reasoning": "Recent Fed minutes suggest a cautious approach. January CPI came in at 2.8%, above target. However, labor market softening indicated by rising unemployment claims. Powell's recent speech emphasized data dependency.",
  "confidence": "MEDIUM"
}
```

### CONTRARIAN Example
```json
{
  "estimate": 0.55,
  "reasoning": "Market is underpricing the probability of a rate cut. While inflation remains sticky, the Fed has historically prioritized employment over inflation during election years. Additionally, commercial real estate distress could force emergency action.",
  "confidence": "LOW"
}
```

## Integration with Consensus Engine

The consensus engine:
1. Runs all 3 analysts in parallel
2. Collects JSON responses
3. Weights by confidence (HIGH=3, MEDIUM=2, LOW=1)
4. Calculates agreement (within 10% = agree)
5. Produces final combined estimate
