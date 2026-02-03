/**
 * Polymarket Scanner v1.0
 *
 * Monitors prediction markets for opportunities:
 * - Price movements
 * - Volume spikes
 * - Arbitrage (prices summing != 100%)
 * - High conviction markets near resolution
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'dashboard', 'polymarket-state.json');

const API = {
  GAMMA: 'https://gamma-api.polymarket.com',
  CLOB: 'https://clob.polymarket.com',
  DATA: 'https://data-api.polymarket.com'
};

// Initialize state if not exists
function initState() {
  if (!fs.existsSync(STATE_FILE)) {
    const initial = {
      lastUpdate: new Date().toISOString(),
      markets: {},
      opportunities: [],
      stats: {
        marketsScanned: 0,
        arbitrageFound: 0,
        volumeSpikes: 0
      }
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(initial, null, 2));
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function saveState(state) {
  state.lastUpdate = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Fetch active markets (sorted by volume for more interesting markets)
async function fetchMarkets() {
  try {
    const response = await fetch(`${API.GAMMA}/markets?closed=false&active=true&limit=50`);
    const data = await response.json();
    if (!data || !Array.isArray(data)) return [];

    // Sort by 24h volume and filter for diverse markets
    const sorted = data
      .filter(m => m.volumeNum > 1000) // At least $1k volume
      .sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0));

    return sorted.slice(0, 20);
  } catch (e) {
    console.error('Error fetching markets:', e.message);
    return [];
  }
}

// Fetch market prices
async function fetchPrices(tokenId) {
  try {
    const response = await fetch(`${API.CLOB}/price/${tokenId}/buy`);
    const data = await response.json();
    return data;
  } catch (e) {
    return null;
  }
}

// Detect arbitrage (prices don't sum to 100%)
function detectArbitrage(outcomes) {
  if (!outcomes || outcomes.length < 2) return null;

  const totalProb = outcomes.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);

  // If total < 0.965, there's arbitrage opportunity (buy all outcomes) - 3.5% edge minimum
  if (totalProb < 0.965) {
    return {
      type: 'UNDER',
      total: totalProb,
      profit: (1 - totalProb) * 100,
      description: `Buy all outcomes for ${(totalProb * 100).toFixed(1)}%, guaranteed $1 payout`
    };
  }

  // If total > 1.035, there's arbitrage opportunity (sell all outcomes) - 3.5% edge minimum
  if (totalProb > 1.035) {
    return {
      type: 'OVER',
      total: totalProb,
      profit: (totalProb - 1) * 100,
      description: `Sell all outcomes for ${(totalProb * 100).toFixed(1)}%, profit on resolution`
    };
  }

  return null;
}

// Detect volume spike
function detectVolumeSpike(market, prevVolume) {
  const currentVol = parseFloat(market.volume) || 0;
  if (!prevVolume) return false;

  // 50%+ volume increase in short period
  return currentVol > prevVolume * 1.5;
}

// Detect high conviction near resolution
function detectEndgame(market) {
  const outcomes = market.outcomes || [];
  const endDate = new Date(market.endDate);
  const now = new Date();
  const hoursToEnd = (endDate - now) / (1000 * 60 * 60);

  // Within 24 hours of resolution
  if (hoursToEnd > 0 && hoursToEnd < 24) {
    // Find outcomes with 90%+ probability
    const highProb = outcomes.filter(o => parseFloat(o.price) >= 0.90);
    if (highProb.length > 0) {
      return {
        outcome: highProb[0],
        hoursLeft: hoursToEnd,
        probability: parseFloat(highProb[0].price) * 100
      };
    }
  }

  return null;
}

async function scanMarkets() {
  const state = initState();

  console.log(`[${getTime()}] Scanning Polymarket...`);

  const markets = await fetchMarkets();

  if (markets.length === 0) {
    console.log(`[${getTime()}] No markets fetched`);
    return state;
  }

  state.stats.marketsScanned = markets.length;
  state.opportunities = [];

  for (const market of markets.slice(0, 10)) {
    const question = market.question || market.title || 'Unknown';
    const volume = market.volume || market.volumeNum || 0;

    // Parse outcomes - API returns JSON string, not array
    let outcomeNames = [];
    try {
      outcomeNames = typeof market.outcomes === 'string' ? JSON.parse(market.outcomes) : (market.outcomes || []);
    } catch (e) {
      outcomeNames = ['Yes', 'No'];
    }

    // Combine with prices (parse strings to floats)
    const outcomePrices = market.outcomePrices || [];
    const outcomes = outcomeNames.map((name, i) => ({
      name,
      price: parseFloat(outcomePrices[i]) || 0
    }));

    // Store market data
    state.markets[market.id] = {
      question: question.substring(0, 60),
      volume,
      outcomes: outcomes.map(o => ({
        name: o.name,
        price: o.price
      })),
      lastUpdate: getTime()
    };

    // Check for arbitrage
    const arb = detectArbitrage(outcomes);
    if (arb) {
      state.opportunities.push({
        type: 'ARBITRAGE',
        market: question.substring(0, 50),
        ...arb
      });
      state.stats.arbitrageFound++;
      console.log(`[ARB] ${question.substring(0, 40)}... | ${arb.description}`);
    }

    // Check for endgame opportunities
    const endgame = detectEndgame(market);
    if (endgame) {
      state.opportunities.push({
        type: 'ENDGAME',
        market: question.substring(0, 50),
        ...endgame
      });
      console.log(`[ENDGAME] ${question.substring(0, 40)}... | ${endgame.probability.toFixed(0)}% in ${endgame.hoursLeft.toFixed(1)}h`);
    }
  }

  saveState(state);

  console.log(`[${getTime()}] Scanned ${markets.length} markets | ${state.opportunities.length} opportunities`);

  return state;
}

// Display top markets
async function displayTopMarkets() {
  const state = initState();

  console.log('\n=== POLYMARKET SCANNER ===\n');

  const markets = Object.values(state.markets).slice(0, 5);
  for (const m of markets) {
    console.log(`${m.question}`);
    for (const o of m.outcomes || []) {
      const pct = (parseFloat(o.price) * 100).toFixed(0);
      console.log(`  ${o.name}: ${pct}%`);
    }
    console.log('');
  }

  if (state.opportunities.length > 0) {
    console.log('=== OPPORTUNITIES ===\n');
    for (const opp of state.opportunities) {
      console.log(`[${opp.type}] ${opp.market}`);
      if (opp.description) console.log(`  ${opp.description}`);
      console.log('');
    }
  }
}

module.exports = { scanMarkets, displayTopMarkets };

if (require.main === module) {
  scanMarkets()
    .then(displayTopMarkets)
    .catch(console.error);
}
