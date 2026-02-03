const fs = require('fs');
const STATE_FILE = require('path').join(__dirname, '..', 'dashboard', 'state.json');

async function forceExit() {
  const res = await fetch('https://api.dexscreener.com/latest/dex/tokens/0xCe16Ef461d88256D2D80DFD31F0D9E7a9fD59213');
  const data = await res.json();
  const price = parseFloat(data.pairs[0].priceUsd);

  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

  if (!state.activeTrade) {
    console.log('No active trade');
    return;
  }

  const trade = state.activeTrade;
  const change = ((price - trade.entry) / trade.entry) * 100;
  const grossPnL = trade.position * (change / 100);
  const costs = trade.position * 0.02;
  const netPnL = grossPnL - costs;

  state.tradeHistory.push({
    id: trade.id,
    token: trade.token,
    tokenAddress: trade.tokenAddress,
    entry: trade.entry,
    exit: price,
    entryTime: trade.entryTime,
    exitTime: new Date().toLocaleTimeString(),
    change: change,
    grossPnL: grossPnL,
    netPnL: netPnL,
    costs: costs,
    result: netPnL > 0 ? 'WIN' : 'LOSS',
    exitReason: process.argv[2] || 'Manual exit'
  });

  state.activeTrade = null;

  let totalNet = 0;
  for (const t of state.tradeHistory) {
    totalNet += t.netPnL || 0;
  }
  state.portfolio.currentValue = state.portfolio.startingCapital + totalNet;

  state.logs.push({
    time: new Date().toLocaleTimeString(),
    action: 'EXIT',
    detail: trade.token + ' EXIT | ' + (change >= 0 ? '+' : '') + change.toFixed(2) + '% | Net: $' + netPnL.toFixed(2)
  });

  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  console.log('Closed ' + trade.token);
  console.log('Change: ' + (change >= 0 ? '+' : '') + change.toFixed(2) + '%');
  console.log('Net PnL: $' + netPnL.toFixed(2));
  console.log('Portfolio: $' + state.portfolio.currentValue.toFixed(2));
}

forceExit();
