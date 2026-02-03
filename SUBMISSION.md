# Research Oracle

**Calibrated probability estimates for Solana agents via 3-analyst LLM consensus**

> ✅ **Live on Devnet**: Program deployed and verified. Program ID: [`AriGWxj99R7PtrEn3dvszvVLDrSb8RLt6GEostKzLzFL`](https://explorer.solana.com/address/AriGWxj99R7PtrEn3dvszvVLDrSb8RLt6GEostKzLzFL?cluster=devnet)

---

## Problem

Agents making decisions need reliable probability estimates. Whether it's a trading bot evaluating market conditions, a governance agent assessing proposal outcomes, or an autonomous system weighing risks—they all need probabilities they can trust.

Current solutions lack:
- **Transparency**: Black-box models with no reasoning visibility
- **Verifiability**: No way to audit predictions after the fact
- **Calibration**: No track record of prediction accuracy
- **Accountability**: No reputation consequences for bad predictions

## Solution

Research Oracle provides calibrated probability estimates through a rigorous multi-analyst system:

### 3-Analyst Consensus System

| Analyst | Perspective | Focus |
|---------|-------------|-------|
| **BASE RATE** | Statistical | Historical frequencies, reference classes, prior probabilities |
| **EVIDENCE** | Current Data | Recent news, market signals, fresh information |
| **CONTRARIAN** | Devil's Advocate | What could go wrong? Overlooked factors? |

Estimates require **2/3 agreement** to pass, ensuring robustness against individual analyst errors.

### On-Chain Attestations

Every prediction is recorded on Solana:
- Question hash (for verification)
- Probability estimate (basis points, 0-10000)
- Confidence level
- Timestamp
- Resolution status and Brier score

## Solana Integration

Research Oracle provides calibrated probability estimates to Solana agents via REST API. Each estimate is produced by a 3-analyst LLM consensus system (BASE RATE, EVIDENCE, CONTRARIAN), then recorded on-chain as a verifiable attestation. The Anchor program stores question hashes, probability estimates (basis points), confidence levels, and timestamps. When outcomes are known, the resolve instruction updates attestations and tracks cumulative Brier score for oracle reputation. Other agents can verify estimates on-chain and assess oracle accuracy before trusting predictions.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RESEARCH ORACLE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│    ┌──────────┐         ┌─────────────────────────────────┐         │
│    │  Agent   │ ──────► │         REST API                │         │
│    │ Request  │         │    POST /estimate               │         │
│    └──────────┘         └──────────────┬──────────────────┘         │
│                                        │                             │
│                                        ▼                             │
│              ┌─────────────────────────────────────────┐            │
│              │         3-ANALYST CONSENSUS             │            │
│              ├─────────────────────────────────────────┤            │
│              │                                         │            │
│              │   ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│              │   │ BASE RATE │  │ EVIDENCE  │  │CONTRARIAN │       │
│              │   │  Analyst  │  │  Analyst  │  │  Analyst  │       │
│              │   └─────┬─────┘  └─────┬─────┘  └─────┬─────┘       │
│              │         │              │              │              │
│              │         └──────────────┼──────────────┘              │
│              │                        ▼                             │
│              │              ┌─────────────────┐                     │
│              │              │  2/3 Agreement  │                     │
│              │              │    Required     │                     │
│              │              └────────┬────────┘                     │
│              └───────────────────────┼─────────────────┘            │
│                                      │                              │
│                                      ▼                              │
│    ┌─────────────────────────────────────────────────────────┐     │
│    │                   SOLANA BLOCKCHAIN                      │     │
│    ├─────────────────────────────────────────────────────────┤     │
│    │  ┌─────────────────┐    ┌─────────────────────────┐     │     │
│    │  │   Attestation   │    │    Oracle Reputation    │     │     │
│    │  │     Account     │    │        Account          │     │     │
│    │  ├─────────────────┤    ├─────────────────────────┤     │     │
│    │  │ • question_hash │    │ • total_predictions     │     │     │
│    │  │ • probability   │    │ • cumulative_brier      │     │     │
│    │  │ • confidence    │    │ • resolved_count        │     │     │
│    │  │ • timestamp     │    │ • authority             │     │     │
│    │  │ • resolved      │    └─────────────────────────┘     │     │
│    │  │ • outcome       │                                    │     │
│    │  └─────────────────┘                                    │     │
│    └─────────────────────────────────────────────────────────┘     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## API Examples

### Get a Probability Estimate

```bash
curl -X POST http://localhost:3000/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Will Bitcoin exceed $100,000 by March 2025?",
    "context": "Current price: $97,500. Recent ETF inflows strong.",
    "deadline": "2025-03-31"
  }'
```

**Response:**
```json
{
  "question": "Will Bitcoin exceed $100,000 by March 2025?",
  "probability": 0.72,
  "confidence": "high",
  "consensus": {
    "base_rate": 0.68,
    "evidence": 0.78,
    "contrarian": 0.70,
    "agreement": true
  },
  "reasoning": {
    "base_rate": "Historical ATH breakouts after ETF approval: ~65%",
    "evidence": "Strong inflows, positive sentiment, proximity to target",
    "contrarian": "Macro risks exist but momentum is strong"
  },
  "attestation": {
    "signature": "5KtR9...",
    "account": "Attest7x..."
  }
}
```

### Check Oracle Reputation

```bash
curl http://localhost:3000/reputation
```

**Response:**
```json
{
  "total_predictions": 147,
  "resolved": 89,
  "brier_score": 0.18,
  "calibration": "good"
}
```

### Resolve an Outcome

```bash
curl -X POST http://localhost:3000/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "attestation_id": "Attest7x...",
    "outcome": true
  }'
```

## How to Run

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# Start the server
npm run dev

# Test the API
curl -X POST http://localhost:3000/estimate \
  -H "Content-Type: application/json" \
  -d '{"question": "Will it rain tomorrow in SF?"}'
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js / TypeScript |
| API Framework | Express |
| LLM | Anthropic Claude |
| Blockchain | Solana |
| Smart Contracts | Anchor |
| Calibration | Brier Score |

## Why This Matters

### LLMs Have Edge in Prediction

Unlike speed-based arbitrage, prediction markets reward:
- Deep research synthesis
- Understanding nuance in news
- Calibrated probability estimation
- Information arbitrage

LLMs excel at exactly these tasks.

### Verifiable AI Decisions

As AI agents make more autonomous decisions, verifiability becomes critical:
- **Audit trail**: Every prediction recorded on-chain
- **Accountability**: Brier scores track accuracy over time
- **Trust**: Agents can verify oracle reputation before use

## Team

**Solo Developer**

## Links

- **GitHub**: [github.com/rohan-kulkarni-25/research-oracle](https://github.com/rohan-kulkarni-25/research-oracle)
- **Demo**: Coming soon
- **Documentation**: See `/docs` folder

---

## Tags

`oracles` `ai-agents` `prediction-markets` `solana` `anchor` `llm` `calibration`

---

*Built for the Solana Hackathon 2025*
