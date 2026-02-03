/**
 * Advanced Momentum Engine v5.0
 *
 * Research-backed improvements:
 * 1. Risk allocation: 70% safe, 30% aggressive
 * 2. Multiple signal tiers (A+, A, B)
 * 3. Position sizing based on signal strength
 * 4. Momentum cascade detection
 * 5. Dynamic stop-loss based on volatility
 *
 * Sources:
 * - trysuper.co memecoin strategies
 * - altrady.com risk management
 * - nansen.ai whale tracking
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'dashboard', 'state.json');

// Base tokens we always watch (expanded list)
const BASE_TOKENS = {
  MOLT: '0xB695559b26BB2c9703ef1935c37AeaE9526bab07',
  DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed',
  BRETT: '0x532f27101965dd16442E59d40670FaF5eBB142E4',
  TOSHI: '0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4',
  HIGHER: '0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe',
  AERO: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
  VIRTUAL: '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b',
  CLANKER: '0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb'
};

// Dynamically discover trending tokens on BASE
async function discoverTrendingTokens() {
  try {
    // Get trending pairs on BASE
    const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/base');
    const data = await response.json();

    const discovered = {};

    if (data.pairs) {
      // Filter for active meme-like tokens with good liquidity
      const candidates = data.pairs
        .filter(p =>
          p.liquidity?.usd > 10000 &&  // Min $10k liquidity
          p.volume?.h1 > 1000 &&        // Active trading
          p.priceChange?.m5 !== undefined
        )
        .sort((a, b) => (b.priceChange?.m5 || 0) - (a.priceChange?.m5 || 0))
        .slice(0, 10);  // Top 10 movers

      for (const pair of candidates) {
        const symbol = pair.baseToken?.symbol;
        const addr = pair.baseToken?.address;
        if (symbol && addr && !BASE_TOKENS[symbol]) {
          discovered[symbol] = addr;
        }
      }
    }

    return discovered;
  } catch (e) {
    return {};
  }
}

// Combined token list
async function getTokensToWatch() {
  const trending = await discoverTrendingTokens();
  return { ...BASE_TOKENS, ...trending };
}

// Risk allocation strategy
const RISK_CONFIG = {
  safePercent: 0.70,        // 70% for safe plays (A+ signals only)
  aggressivePercent: 0.30,  // 30% for risky plays (A, B signals)
  maxRiskPerTrade: 0.02,    // Max 2% of portfolio per trade
  maxDailyLoss: 0.10,       // Stop trading after 10% daily loss
  maxOpenTrades: 1          // One trade at a time for now
};

// Signal tiers - lowered for faster day trading
const SIGNALS = {
  'A+': {  // Highest conviction - pure buying
    minBuys: 8,
    maxSells: 1,
    minMomentum: 3,  // Lowered from 8%
    minRatio: 8,
    positionSize: 1.0,
    takeProfit: 5,
    stopLoss: -2,
    description: 'Pure buying frenzy'
  },
  'A': {  // High conviction - strong ratio
    minBuys: 12,
    maxSells: 3,
    minMomentum: 2,  // Lowered from 10%
    minRatio: 4,
    positionSize: 0.7,
    takeProfit: 4,
    stopLoss: -2.5,
    description: 'Strong momentum cascade'
  },
  'B': {  // Medium - volume with momentum
    minBuys: 15,
    maxSells: 5,
    minMomentum: 1.5,  // Lowered from 12%
    minRatio: 3,
    positionSize: 0.5,
    takeProfit: 3.5,
    stopLoss: -2.5,
    description: 'Momentum with volume'
  }
};

const COST_MODEL = {
  SWAP_FEE: 0.006,        // Keep - accurate
  PRICE_IMPACT: 0.008,    // Double - actual higher
  SLIPPAGE_BASE: 0.025,   // 2.5% base (was 0.8%)
  SLIPPAGE_VOL_MULT: 0.003, // Add for volatile conditions
  GAS: 0.30,
  MEV_COST: 0.005         // 0.5% MEV tax on memecoins
};

function loadState() {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function saveState(state) {
  state.lastUpdate = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function fetchTokenData(address) {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    const data = await response.json();
    const pair = data.pairs?.[0];
    if (!pair) return null;

    return {
      price: parseFloat(pair.priceUsd),
      m5: pair.priceChange?.m5 || 0,
      h1: pair.priceChange?.h1 || 0,
      h6: pair.priceChange?.h6 || 0,
      buys5m: pair.txns?.m5?.buys || 0,
      sells5m: pair.txns?.m5?.sells || 0,
      buys1h: pair.txns?.h1?.buys || 0,
      sells1h: pair.txns?.h1?.sells || 0,
      volume5m: pair.volume?.m5 || 0,
      volume1h: pair.volume?.h1 || 0,
      liquidity: pair.liquidity?.usd || 10000
    };
  } catch (e) {
    return null;
  }
}

function detectRegime(marketData) {
  const tokens = Object.values(marketData);
  if (tokens.length === 0) return 'WAIT';

  const avgH1 = tokens.reduce((s, t) => s + (t.h1 || 0), 0) / tokens.length;
  const avgM5 = tokens.reduce((s, t) => s + (t.m5 || 0), 0) / tokens.length;
  const positive = tokens.filter(t => t.m5 > 0).length;
  const positiveRatio = positive / tokens.length;

  if (avgH1 > 5 && avgM5 > 2 && positiveRatio >= 0.6) return 'BULL';
  if (avgH1 < -8 || (avgM5 < -3 && positiveRatio < 0.3)) return 'BEAR';
  return 'NEUTRAL';
}

// Detect momentum cascade (research: when FOMO + media + liquidity collide)
function detectMomentumCascade(data) {
  const ratio = data.sells5m > 0 ? data.buys5m / data.sells5m : data.buys5m;
  const volumeSpike = data.volume5m > (data.volume1h / 12) * 2; // 2x average 5m volume
  const buyingFrenzy = data.buys5m > 20 && ratio > 5;
  const strongMomentum = data.m5 > 10;

  return volumeSpike && buyingFrenzy && strongMomentum;
}

// Grade the signal
function gradeSignal(data) {
  const ratio = data.sells5m > 0 ? data.buys5m / data.sells5m : data.buys5m;

  // Check each tier from highest to lowest
  for (const [grade, req] of Object.entries(SIGNALS)) {
    if (data.buys5m >= req.minBuys &&
        data.sells5m <= req.maxSells &&
        data.m5 >= req.minMomentum &&
        ratio >= req.minRatio) {
      return { grade, ...req };
    }
  }

  return null;
}

function calculateCosts(size, volatility5m = 0) {
  const swapFee = size * COST_MODEL.SWAP_FEE;
  const priceImpact = size * COST_MODEL.PRICE_IMPACT;
  const slippageRate = COST_MODEL.SLIPPAGE_BASE + (Math.abs(volatility5m) * COST_MODEL.SLIPPAGE_VOL_MULT);
  const slippage = size * slippageRate;
  const mev = size * COST_MODEL.MEV_COST;
  const gas = COST_MODEL.GAS;
  const total = swapFee + priceImpact + slippage + mev + gas;
  return {
    swapFee: Math.round(swapFee * 100) / 100,
    priceImpact: Math.round(priceImpact * 100) / 100,
    slippage: Math.round(slippage * 100) / 100,
    mev: Math.round(mev * 100) / 100,
    gas,
    total: Math.round(total * 100) / 100
  };
}

// Dynamic stop based on volatility
function calculateDynamicStop(baseStop, volatility) {
  // Widen stop for high volatility tokens
  const volAdjustment = Math.min(Math.abs(volatility) * 0.1, 1);
  return baseStop - volAdjustment;
}

// Calculate position size based on signal and risk rules
function calculatePositionSize(capital, signal, regime) {
  let baseSize = capital;

  // Apply signal multiplier
  baseSize *= signal.positionSize;

  // Reduce size in bear market
  if (regime === 'BEAR') {
    baseSize *= 0.5;
  }

  // Cap at max risk per trade (2% of portfolio at risk)
  const maxRiskAmount = capital * RISK_CONFIG.maxRiskPerTrade;
  const potentialLoss = baseSize * (Math.abs(signal.stopLoss) / 100);

  if (potentialLoss > maxRiskAmount) {
    baseSize = maxRiskAmount / (Math.abs(signal.stopLoss) / 100);
  }

  return Math.min(baseSize, capital);
}

function addThought(state, text) {
  state.thoughts.push({ time: getTime(), text });
  if (state.thoughts.length > 25) state.thoughts.shift();
  console.log(`[THOUGHT] ${text}`);
}

function addLog(state, action, detail) {
  state.logs.push({ time: getTime(), action, detail });
  if (state.logs.length > 50) state.logs.shift();
  console.log(`[${action}] ${detail}`);
}

function getMinutesSinceEntry(entryTime) {
  const now = new Date();
  const [time, period] = entryTime.split(' ');
  const [hours, mins, secs] = time.split(':').map(Number);
  let hour24 = hours;
  if (period === 'PM' && hours !== 12) hour24 += 12;
  if (period === 'AM' && hours === 12) hour24 = 0;

  const entry = new Date();
  entry.setHours(hour24, mins, secs, 0);
  return (now - entry) / 60000;
}

async function runEngine() {
  const state = loadState();

  // Initialize risk tracking if not exists
  if (!state.riskTracking) {
    state.riskTracking = {
      dailyPnL: 0,
      dailyTrades: 0,
      consecutiveLosses: 0,
      lastTradeTime: null,
      tokenCooldowns: {}  // { "CLAWNCH": 1706889600000, ... }
    };
  }
  // Ensure tokenCooldowns exists for older states
  if (!state.riskTracking.tokenCooldowns) {
    state.riskTracking.tokenCooldowns = {};
  }

  // Check daily loss limit
  if (state.riskTracking.dailyPnL <= -(state.portfolio.startingCapital * RISK_CONFIG.maxDailyLoss)) {
    addThought(state, `RISK LIMIT: Daily loss limit reached. Stopping for today.`);
    saveState(state);
    console.log(`[${getTime()}] RISK_LIMIT | $${state.portfolio.currentValue.toFixed(2)} | STOPPED`);
    return state;
  }

  // Fetch all token data - dynamically discovered + base tokens
  const TOKENS = await getTokensToWatch();
  const marketData = {};
  for (const [symbol, address] of Object.entries(TOKENS)) {
    const data = await fetchTokenData(address);
    if (data) {
      marketData[symbol] = { ...data, address };
    }
  }

  const regime = detectRegime(marketData);

  // Update market display
  state.market = {};
  for (const [symbol, data] of Object.entries(marketData)) {
    const signal = gradeSignal(data);
    const cascade = detectMomentumCascade(data);
    const ratio = data.sells5m > 0 ? data.buys5m / data.sells5m : data.buys5m;

    state.market[symbol] = {
      price: data.price,
      m5: data.m5,
      h1: data.h1,
      bs: `${data.buys5m}/${data.sells5m}`,
      ratio: ratio.toFixed(1),
      signal: signal ? signal.grade : '-',
      cascade: cascade ? '🔥' : '',
      liquidity: Math.round(data.liquidity / 1000)
    };
  }

  state.regime = { current: regime };

  // Handle active trade
  if (state.activeTrade) {
    const data = marketData[state.activeTrade.token];
    if (data) {
      const change = ((data.price - state.activeTrade.entry) / state.activeTrade.entry) * 100;
      const grossPnL = state.activeTrade.position * (change / 100);
      const minsSinceEntry = getMinutesSinceEntry(state.activeTrade.entryTime);
      const ratio = data.sells5m > 0 ? data.buys5m / data.sells5m : data.buys5m;

      state.activeTrade.current = data.price;
      state.activeTrade.change = change;
      state.activeTrade.grossPnL = grossPnL;

      if (change > (state.activeTrade.maxChange || 0)) {
        state.activeTrade.maxChange = change;
      }

      // Dynamic exit logic based on signal grade
      const signalConfig = SIGNALS[state.activeTrade.signalGrade] || SIGNALS['B'];
      const dynamicStop = calculateDynamicStop(signalConfig.stopLoss, data.m5);

      let exitReason = null;

      // Minimum hold time before exit checks (30 seconds)
      const minHoldSeconds = 30;
      if (minsSinceEntry < (minHoldSeconds / 60)) {
        // Only allow emergency stop at -8%
        if (change <= -8) {
          exitReason = 'EMERGENCY STOP';
        }
        // Skip all other exit checks during minimum hold period
      } else {
        // Take profit
        if (change >= signalConfig.takeProfit) {
          exitReason = 'TAKE PROFIT';
        }
        // Stop loss (dynamic)
        else if (change <= dynamicStop) {
          exitReason = 'STOP LOSS';
        }
        // Trailing stop: if we hit 80% of target then pull back
        else if (state.activeTrade.maxChange >= signalConfig.takeProfit * 0.8 &&
                 change <= state.activeTrade.maxChange * 0.5) {
          exitReason = 'TRAIL STOP';
        }
        // Time stop: 12 minutes flat
        else if (minsSinceEntry >= 12 && Math.abs(change) < 1.5) {
          exitReason = 'TIME STOP';
        }
        // Momentum reversal: heavy selling starts
        else if (data.sells5m > 15 && ratio < 1 && change < 2) {
          exitReason = 'MOMENTUM REVERSAL';
        }
      }

      if (exitReason) {
        const costs = calculateCosts(state.activeTrade.position);
        const netPnL = grossPnL - costs.total;

        state.tradeHistory.push({
          id: state.activeTrade.id,
          token: state.activeTrade.token,
          tokenAddress: state.activeTrade.tokenAddress,
          entry: state.activeTrade.entry,
          exit: data.price,
          position: state.activeTrade.position,
          signalGrade: state.activeTrade.signalGrade,
          grossPnL: Math.round(grossPnL * 100) / 100,
          costs: costs.total,
          netPnL: Math.round(netPnL * 100) / 100,
          result: netPnL > 0.5 ? 'WIN' : netPnL < -0.5 ? 'LOSS' : 'EVEN',
          exitReason,
          duration: Math.round(minsSinceEntry)
        });

        state.portfolio.currentValue = state.activeTrade.position + netPnL;
        if (state.portfolio.currentValue > state.portfolio.peakValue) {
          state.portfolio.peakValue = state.portfolio.currentValue;
        }

        // Update risk tracking
        state.riskTracking.dailyPnL += netPnL;
        state.riskTracking.dailyTrades++;
        if (netPnL < -0.5) {
          state.riskTracking.consecutiveLosses++;
        } else {
          state.riskTracking.consecutiveLosses = 0;
        }

        // Record cooldown for this token
        state.riskTracking.tokenCooldowns[state.activeTrade.token] = Date.now();

        addLog(state, 'EXIT', `${state.activeTrade.token} [${state.activeTrade.signalGrade}] ${exitReason} @ ${change >= 0 ? '+' : ''}${change.toFixed(1)}% | Net: ${netPnL >= 0 ? '+' : ''}$${netPnL.toFixed(2)}`);
        state.activeTrade = null;
      }
    }
  }

  // Look for entry
  if (!state.activeTrade) {
    // Skip if too many consecutive losses
    if (state.riskTracking.consecutiveLosses >= 3) {
      addThought(state, `COOLING OFF: 3 consecutive losses. Waiting for better conditions.`);
      saveState(state);
      return state;
    }

    let bestSignal = null;
    let bestGrade = null;
    let bestData = null;

    for (const [symbol, data] of Object.entries(marketData)) {
      // Check per-token cooldown (60s after exit)
      const cooldownMs = 60000;
      const lastExit = state.riskTracking.tokenCooldowns?.[symbol];
      if (lastExit && Date.now() - lastExit < cooldownMs) {
        const remainingSecs = Math.ceil((cooldownMs - (Date.now() - lastExit)) / 1000);
        addThought(state, `Skipping ${symbol} - cooling down for ${remainingSecs}s`);
        continue;
      }

      const signal = gradeSignal(data);
      const cascade = detectMomentumCascade(data);

      if (signal) {
        // In BEAR, only take A+ signals
        if (regime === 'BEAR' && signal.grade !== 'A+') continue;

        // Prefer cascade signals
        if (cascade && (!bestSignal || signal.grade < bestGrade)) {
          bestSignal = signal;
          bestGrade = signal.grade;
          bestData = { symbol, ...data };
        } else if (!bestSignal || signal.grade < bestGrade) {
          bestSignal = signal;
          bestGrade = signal.grade;
          bestData = { symbol, ...data };
        }
      }
    }

    if (bestSignal && bestData) {
      const positionSize = calculatePositionSize(state.portfolio.currentValue, bestSignal, regime);
      const costs = calculateCosts(positionSize);
      const ratio = bestData.sells5m > 0 ? bestData.buys5m / bestData.sells5m : bestData.buys5m;

      state.activeTrade = {
        id: state.tradeHistory.length + 1,
        token: bestData.symbol,
        tokenAddress: bestData.address,
        entry: bestData.price,
        current: bestData.price,
        position: positionSize,
        change: 0,
        grossPnL: 0,
        maxChange: 0,
        entryTime: getTime(),
        signalGrade: bestSignal.grade,
        costs,
        signal: `[${bestSignal.grade}] ${bestData.buys5m}/${bestData.sells5m} (${ratio.toFixed(1)}x), +${bestData.m5.toFixed(1)}%`
      };

      addLog(state, 'ENTRY', `#${state.activeTrade.id} ${bestData.symbol} [${bestSignal.grade}] @ $${bestData.price.toFixed(9)} | Size: $${positionSize.toFixed(2)} | ${bestData.buys5m}b/${bestData.sells5m}s, +${bestData.m5.toFixed(1)}%`);
      addThought(state, `SIGNAL [${bestSignal.grade}]: ${bestData.symbol} - ${bestSignal.description} | TP: +${bestSignal.takeProfit}%, SL: ${bestSignal.stopLoss}%`);
    } else {
      // Show best opportunity
      const opportunities = Object.entries(marketData)
        .map(([s, d]) => {
          const ratio = d.sells5m > 0 ? d.buys5m / d.sells5m : d.buys5m;
          return { symbol: s, m5: d.m5, buys: d.buys5m, sells: d.sells5m, ratio };
        })
        .filter(o => o.m5 > 0)
        .sort((a, b) => b.m5 - a.m5);

      const best = opportunities[0];
      if (best) {
        const missing = [];
        if (best.sells > 0) missing.push(`${best.sells} sells`);
        if (best.m5 < SIGNALS['A+'].minMomentum) missing.push(`${best.m5.toFixed(1)}% < ${SIGNALS['A+'].minMomentum}%`);
        if (best.buys < SIGNALS['A+'].minBuys) missing.push(`${best.buys} buys < ${SIGNALS['A+'].minBuys}`);

        addThought(state, `${regime}: Best: ${best.symbol} (${best.buys}/${best.sells}, +${best.m5.toFixed(1)}%) | Missing: ${missing.join(', ')}`);
      } else {
        addThought(state, `${regime}: No momentum. All tokens flat or negative.`);
      }
    }
  }

  // Update stats - filter for trades with valid netPnL
  const winTrades = state.tradeHistory.filter(t => t.result === 'WIN' && typeof t.netPnL === 'number');
  const lossTrades = state.tradeHistory.filter(t => t.result === 'LOSS' && typeof t.netPnL === 'number');
  const totalNetPnL = state.tradeHistory.reduce((s, t) => s + (t.netPnL || 0), 0);

  state.stats = {
    wins: winTrades.length,
    losses: lossTrades.length,
    winRate: (winTrades.length + lossTrades.length) > 0
      ? Math.round((winTrades.length / (winTrades.length + lossTrades.length)) * 100)
      : 0,
    totalNetPnL: Math.round(totalNetPnL * 100) / 100,
    avgWin: winTrades.length > 0
      ? Math.round((winTrades.reduce((s, t) => s + t.netPnL, 0) / winTrades.length) * 100) / 100
      : 0,
    avgLoss: lossTrades.length > 0
      ? Math.round((Math.abs(lossTrades.reduce((s, t) => s + t.netPnL, 0)) / lossTrades.length) * 100) / 100
      : 0
  };

  state.costs.total = state.tradeHistory.reduce((s, t) => s + t.costs, 0) + (state.activeTrade?.costs?.total || 0);

  saveState(state);

  const status = state.activeTrade
    ? `${state.activeTrade.token} [${state.activeTrade.signalGrade}] ${state.activeTrade.change >= 0 ? '+' : ''}${state.activeTrade.change.toFixed(1)}%`
    : 'SCANNING';

  console.log(`[${getTime()}] ${regime} | $${state.portfolio.currentValue.toFixed(2)} | ${status}`);

  return state;
}

module.exports = { runEngine };

if (require.main === module) {
  runEngine().catch(console.error);
}
