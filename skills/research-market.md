# Skill: Research Market

Deep analysis of a specific market to estimate true probability.

## The Core Task

Given a market question, determine:
1. What does the evidence say?
2. What is the TRUE probability?
3. Is the market mispriced?

## Research Framework

### Step 1: Understand the Question
- What EXACTLY needs to happen for YES to win?
- What is the resolution source?
- What is the timeframe?
- Any ambiguity in the question?

### Step 2: Gather Evidence
```
PRIMARY SOURCES (most reliable):
- Official government data
- Company announcements
- Court filings
- Regulatory documents

SECONDARY SOURCES (supporting):
- News articles
- Expert analysis
- Historical precedent
- Statistical data

AVOID:
- Social media speculation
- Biased partisan sources
- Outdated information
```

### Step 3: Analyze Both Sides
```
FOR YES (probability higher):
- List 3-5 factors supporting YES
- Cite specific evidence
- Estimate impact on probability

FOR NO (probability lower):
- List 3-5 factors supporting NO
- Cite specific evidence
- Estimate impact on probability
```

### Step 4: Synthesize
```
Given:
- Factor A suggests X% probability
- Factor B suggests Y% probability
- Historical base rate is Z%

My estimate: [probability]%
Confidence: HIGH/MEDIUM/LOW
```

## Research Prompt Template

```
Analyze this Polymarket prediction:

QUESTION: [exact market question]
CURRENT PRICE: [yes]% YES / [no]% NO
RESOLUTION DATE: [date]
VOLUME: $[amount]

Your task:
1. Research this question thoroughly
2. Find verifiable facts and data
3. Estimate the TRUE probability
4. Determine if market is mispriced

Web search for:
- [relevant search terms]
- [official data sources]
- [recent news]

Provide:
1. Key evidence FOR (higher probability)
2. Key evidence AGAINST (lower probability)
3. Your probability estimate with reasoning
4. Confidence level (HIGH/MEDIUM/LOW)
5. If mispriced: direction and magnitude

Be specific. Cite sources. Show your math.
```

## Example Analysis Output

```json
{
  "market": "Will X happen by Y date?",
  "marketPrice": 0.65,
  "myEstimate": 0.82,
  "mispricing": 0.17,
  "direction": "UNDERPRICED",
  "confidence": "HIGH",
  "keyFactors": {
    "for": [
      "Official data shows 80% complete",
      "Historical precedent: 9/10 similar cases succeeded",
      "Recent announcement confirms progress"
    ],
    "against": [
      "Legal challenge pending",
      "Timeline is tight"
    ]
  },
  "sources": [
    "https://source1.gov/data",
    "https://news.com/article"
  ],
  "recommendation": "BUY YES at 65¢ (fair value ~82¢)"
}
```

## Calibration Checks

Before finalizing estimate, ask:
1. Would I bet my own money at this probability?
2. What would change my mind?
3. What am I missing?
4. Is this estimate based on evidence or hope?

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Confirmation bias | Actively seek disconfirming evidence |
| Anchoring to market price | Form estimate BEFORE looking at price |
| Overconfidence | Add 10-20% uncertainty to estimates |
| Ignoring base rates | Always check historical precedent |
| Recency bias | Weight recent news appropriately |
