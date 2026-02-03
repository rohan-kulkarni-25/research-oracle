# Trading Session Prompt

Copy and paste this to start a trading session in Claude Code.

---

## Full Session (With Intel Gathering)

```
Run a trading session for moltleaks.

PHASE 1: GATHER INTEL (run these 3 agents in parallel)

Agent 1 - Market Scanner:
Fetch BASE token data from DexScreener. Run:
curl -s "https://api.dexscreener.com/tokens/v1/base/0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed,0x532f27101965dd16442E59d40670FaF5eBB142E4,0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4,0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe,0x940181a94A35A4569E4529A3CDfB74e38FD98631,0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b,0xCe16Ef461d88256D2D80DFD31F0D9E7a9fD59213,0xF6e932Ca12afa26665dC4dDE7e27be02A7c02e50"
Return: symbol, price, 5m change, buys/sells 5m, B/S ratio, signal grade (A+/A/B/SKIP).

Agent 2 - News:
Search "BASE chain memecoin news today" and "crypto rug pull alerts". Return: market mood, key headlines, tokens to avoid.

Agent 3 - Macro:
Search "Bitcoin price today" and "crypto fear greed index". Return: BTC trend, ETH trend, fear/greed score, risk recommendation.

PHASE 2: SYNTHESIZE
Combine intel into records/intel.json. Determine if tradeable (yes/no).

PHASE 3: DECIDE
Read records/state.json for current position.
- If no position + tradeable: Check for entry signals (B/S > 3x, momentum > +2%)
- If has position: Check exit conditions (TP/SL/trailing/time)
- If not tradeable: WAIT

PHASE 4: EXECUTE & UPDATE
- Update records/market-snapshot.json with token data
- Update records/intel.json with synthesis
- If entering/exiting: Update records/state.json and append to records/trades.jsonl
- Report decision and reasoning
```

---

## Quick Session (Market Only, No News)

```
Quick trading check for moltleaks.

1. Fetch BASE tokens:
curl -s "https://api.dexscreener.com/tokens/v1/base/0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed,0x532f27101965dd16442E59d40670FaF5eBB142E4,0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4,0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe,0x940181a94A35A4569E4529A3CDfB74e38FD98631,0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b,0xCe16Ef461d88256D2D80DFD31F0D9E7a9fD59213,0xF6e932Ca12afa26665dC4dDE7e27be02A7c02e50"

2. Grade signals:
- A+: 8+ buys, ≤1 sell, +3% 5m, 8x B/S
- A: 12+ buys, ≤3 sells, +2% 5m, 4x B/S
- B: 15+ buys, ≤5 sells, +1.5% 5m, 3x B/S

3. Read records/state.json - check position
4. If signal found + no position → paper enter
5. If has position → check exit conditions
6. Update records/state.json and records/market-snapshot.json
7. Report: table of tokens + decision + reasoning
```

---

## Position Check Only

```
Check current moltleaks position.

1. Read records/state.json
2. If position exists:
   - Fetch current price for the token
   - Calculate P&L %
   - Check exit conditions (TP/SL/trailing/time stop)
   - Report status and recommendation
3. If no position:
   - Report "No active position"
```

---

## Discovery Session (Find New Tokens)

```
Discover trending BASE tokens for moltleaks.

1. Fetch boosted tokens:
curl -s "https://api.dexscreener.com/token-boosts/top/v1" | filter for chainId="base"

2. Fetch latest profiles:
curl -s "https://api.dexscreener.com/token-profiles/latest/v1" | filter for chainId="base"

3. For each new token found:
   - Check liquidity > $50K
   - Check if not in current watchlist
   - Fetch full data from DexScreener
   - Grade signal

4. Report new opportunities with:
   - Token symbol, address
   - Liquidity, volume
   - B/S ratio, momentum
   - Recommendation: ADD TO WATCHLIST or SKIP
```

---

## Manual Entry (Paper Trade)

```
Paper trade entry for moltleaks.

Token: [SYMBOL]
Address: [ADDRESS]
Signal: [A+/A/B]
Reason: [Why entering]

1. Read records/state.json - confirm no position
2. Fetch current price from DexScreener
3. Calculate position size per skills/decide-entry.md
4. Update records/state.json with new position
5. Append BUY to records/trades.jsonl
6. Report entry details
```

---

## Manual Exit (Paper Trade)

```
Paper trade exit for moltleaks.

Reason: [TP/SL/Manual/Other]

1. Read records/state.json - get position
2. Fetch current price
3. Calculate P&L (apply 3.9% exit cost)
4. Update records/state.json:
   - Add P&L to capital
   - Clear position
5. Append SELL to records/trades.jsonl
6. Report exit details and session P&L
```

---

## End of Day Summary

```
End of day summary for moltleaks.

1. Read records/trades.jsonl - get today's trades
2. Read records/state.json - get current state
3. Calculate:
   - Total trades today
   - Wins/losses
   - Net P&L ($, %)
   - Win rate
   - Best/worst trade
4. Read records/intel.json - summarize market conditions
5. Report full summary with insights
```
