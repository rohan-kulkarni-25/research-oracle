const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'dashboard', 'state.json');

const TOKENS = {
  CLAWDICT: '0xc6A7ed1c6Bc25fAdF7e87B5D78F6fF94C09e26F6',
  BUNKER: '0xCe16Ef461d88256D2D80DFD31F0D9E7a9fD59213',
  CLAWNCH: '0xa1F72459dfA10BAD200Ac160eCd78C6b77a747be',
  ASYM: '0xca54Efb221c78bFF5F2F459E596585B88acE8A7F',
  DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
};

// Add custom token from command line
if (process.argv[2]) {
  TOKENS['CUSTOM'] = process.argv[2];
}

async function scan() {
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

  console.log('=== MARKET SCAN ===\n');

  const results = [];

  for (const [name, addr] of Object.entries(TOKENS)) {
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addr}`);
      const d = await res.json();
      const p = d.pairs?.[0];
      if (!p) continue;

      const buys = p.txns?.m5?.buys || 0;
      const sells = p.txns?.m5?.sells || 0;
      const ratio = sells > 0 ? buys / sells : (buys > 0 ? 99 : 0);
      const m5 = p.priceChange?.m5 || 0;
      const h1 = p.priceChange?.h1 || 0;

      const signal = ratio >= 1.5 && m5 >= 2 ? '🚀 ENTRY' :
                     ratio >= 1.3 ? '👀 WATCH' :
                     ratio <= 0.5 ? '🔴 AVOID' : '⚪';

      const symbol = name === 'CUSTOM' ? p.baseToken?.symbol : name;

      results.push({
        symbol,
        price: parseFloat(p.priceUsd),
        m5, h1,
        buys, sells,
        ratio,
        signal,
        liq: p.liquidity?.usd || 0
      });

      console.log(`${signal} ${symbol.padEnd(10)} | $${parseFloat(p.priceUsd).toFixed(8)} | 5m: ${m5 >= 0 ? '+' : ''}${m5}% | B/S: ${buys}/${sells} (${ratio.toFixed(2)}x) | Liq: $${Math.round(p.liquidity?.usd || 0).toLocaleString()}`);
    } catch (e) {}
  }

  // Position status
  if (state.activeTrade) {
    const t = state.activeTrade;
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${t.tokenAddress}`);
    const d = await res.json();
    const p = d.pairs?.[0];
    if (p) {
      const price = parseFloat(p.priceUsd);
      const change = ((price - t.entry) / t.entry) * 100;
      const pnl = t.position * (change / 100);

      console.log('\n=== ACTIVE POSITION ===');
      console.log(`${t.token} | Entry: $${t.entry} | Now: $${price.toFixed(9)}`);
      console.log(`Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}% | PnL: $${pnl.toFixed(2)}`);
      console.log(`Targets: TP +8% | SL -5%`);

      if (change >= 8) console.log('\n>>> TAKE PROFIT READY <<<');
      else if (change <= -5) console.log('\n>>> STOP LOSS TRIGGERED <<<');
    }
  } else {
    console.log('\n=== NO ACTIVE POSITION ===');
    const entry = results.find(r => r.signal === '🚀 ENTRY');
    if (entry) {
      console.log(`\nSuggested entry: ${entry.symbol} (${entry.ratio.toFixed(2)}x B/S, +${entry.m5}% 5m)`);
    }
  }

  console.log(`\nPortfolio: $${state.portfolio.currentValue.toFixed(2)}`);
}

scan();
