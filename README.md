# Research Oracle

**Calibrated probability estimates for Solana agents via 3-analyst LLM consensus**

[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF)](https://explorer.solana.com/address/AriGWxj99R7PtrEn3dvszvVLDrSb8RLt6GEostKzLzFL?cluster=devnet)
[![Built with Claude](https://img.shields.io/badge/Built%20with-Claude-orange)](https://claude.ai)

## Problem

Agents making decisions need reliable probability estimates. Current solutions lack transparency, verifiability, calibration tracking, and accountability.

## Solution

Research Oracle provides calibrated probability estimates through a rigorous multi-analyst system:

| Analyst | Perspective | Focus |
|---------|-------------|-------|
| **BASE RATE** | Statistical | Historical frequencies, reference classes |
| **EVIDENCE** | Current Data | Recent news, market signals |
| **CONTRARIAN** | Devil's Advocate | What could go wrong? |

Estimates require **2/3 agreement** to pass, ensuring robustness.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# Start the server
npm run dev

# Test the API
curl -X POST http://localhost:3000/api/v1/estimate \
  -H "Content-Type: application/json" \
  -d '{"question": "Will Bitcoin exceed $100K by March 2026?"}'
```

## API

### Get Probability Estimate

```bash
POST /api/v1/estimate
{
  "question": "Will X happen by Y?",
  "context": "Optional additional context"
}
```

**Response:**
```json
{
  "requestId": "uuid",
  "question": "Will X happen by Y?",
  "estimate": {
    "combined": { "estimate": 0.65, "confidence": "MEDIUM" },
    "estimates": {
      "baseRate": { "estimate": 0.60, "reasoning": "..." },
      "evidence": { "estimate": 0.70, "reasoning": "..." },
      "contrarian": { "estimate": 0.55, "reasoning": "..." }
    }
  },
  "attestation": {
    "txSignature": "...",
    "account": "..."
  }
}
```

### Check Calibration

```bash
GET /api/v1/calibration
```

## On-Chain Attestations

Every prediction is recorded on Solana devnet:
- Question hash (SHA-256)
- Probability estimate (basis points, 0-10000)
- Confidence level (LOW=0, MEDIUM=1, HIGH=2)
- Timestamp
- Resolution status and Brier score

**Program ID:** `AriGWxj99R7PtrEn3dvszvVLDrSb8RLt6GEostKzLzFL`

[View on Explorer](https://explorer.solana.com/address/AriGWxj99R7PtrEn3dvszvVLDrSb8RLt6GEostKzLzFL?cluster=devnet)

## Architecture

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────┐
│    Agent     │────▶│   Research Oracle   │────▶│    Solana    │
│   Request    │     │      REST API       │     │   Devnet     │
└──────────────┘     └──────────┬──────────┘     └──────────────┘
                                │
                     ┌──────────▼──────────┐
                     │   3-Analyst LLM     │
                     │     Consensus       │
                     │  ┌─────┬─────┬────┐ │
                     │  │BASE │EVID │CONT│ │
                     │  │RATE │ENCE │RARI│ │
                     │  └─────┴─────┴────┘ │
                     └─────────────────────┘
```

## Tech Stack

- **Runtime:** Node.js / TypeScript
- **API:** Express
- **LLM:** Anthropic Claude
- **Blockchain:** Solana (Anchor)
- **Calibration:** Brier Score

## License

MIT
