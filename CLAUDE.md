# Research Oracle Agent

## Overview
Research Oracle provides calibrated probability estimates to Solana agents via REST API. Each estimate is produced by a 3-analyst LLM consensus system (BASE RATE, EVIDENCE, CONTRARIAN), then recorded on-chain as a verifiable attestation.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY

# Development
npm run dev

# Production
npm run build && npm start
```

## API Endpoints

```bash
# Request probability estimate
curl -X POST http://localhost:3000/api/v1/estimate \
  -H "Content-Type: application/json" \
  -d '{"question": "Will Bitcoin exceed $150K by March 2026?"}'

# Get past estimate
curl http://localhost:3000/api/v1/estimates/{requestId}

# Report outcome
curl -X POST http://localhost:3000/api/v1/resolve \
  -H "Content-Type: application/json" \
  -d '{"requestId": "...", "outcome": true}'

# Get calibration stats
curl http://localhost:3000/api/v1/calibration
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Client Agents  │────▶│  Research Oracle │────▶│ Solana (devnet) │
│   (REST API)    │     │     Service      │     │  Attestations   │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                        ┌────────▼─────────┐
                        │   LLM Backbone   │
                        │ (3-analyst runs) │
                        └──────────────────┘
```

## Consensus System

The oracle runs 3 independent analyst perspectives in parallel:

| Analyst | Focus | Weight |
|---------|-------|--------|
| **BASE RATE** | Historical statistics, reference classes | By confidence |
| **EVIDENCE** | Recent news, current developments | By confidence |
| **CONTRARIAN** | What the market is missing | By confidence |

Confidence weights: HIGH=3, MEDIUM=2, LOW=1

Agreement levels:
- **3/3 agree** (within 10%): HIGH confidence
- **2/3 agree**: MEDIUM confidence
- **All disagree**: LOW confidence

## Skills

| Skill | Purpose |
|-------|---------|
| `skills/oracle-research.md` | Research framework for analysts |
| `skills/consensus-estimate.md` | 3-analyst voting system |
| `skills/track-performance.md` | Calibration tracking |

## Files

```
src/
├── index.ts                 # Express server entry
├── types.ts                 # Shared type definitions
├── api/
│   ├── routes.ts           # API endpoints
│   └── middleware.ts       # Auth, rate limiting
├── consensus/
│   ├── engine.ts           # Orchestrates 3 analysts
│   ├── analysts.ts         # Analyst prompt templates
│   └── combiner.ts         # Confidence-weighted combining
├── solana/
│   ├── client.ts           # Program interaction
│   └── types.ts            # Account types
└── state/
    ├── manager.ts          # JSON/JSONL operations
    └── calibration.ts      # Brier score tracking

programs/research-oracle/
└── src/lib.rs              # Anchor program

records/
├── oracle-state.json       # Oracle statistics
├── requests.jsonl          # All requests (append-only)
└── calibration.json        # Accuracy metrics
```

## Solana Program

The Anchor program records attestations on-chain:

- `initialize()` - Set up oracle state PDA
- `attest()` - Record estimate (question_hash, estimate in basis points, confidence)
- `resolve()` - Update with outcome, calculate Brier contribution

## Calibration

Brier Score = (probability - outcome)² where outcome is 0 or 1

Lower is better. Perfect = 0, Random = 0.25, Always wrong = 1

## Environment Variables

```
ANTHROPIC_API_KEY=   # Required for consensus engine
PORT=3000            # Server port
API_KEY=             # Optional API authentication
SOLANA_RPC_URL=      # Optional for on-chain attestation
SOLANA_PRIVATE_KEY=  # Optional for on-chain attestation
```
