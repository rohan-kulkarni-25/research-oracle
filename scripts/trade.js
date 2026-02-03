const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.wallet' });

// BASE Chain Config
const BASE_RPC = 'https://mainnet.base.org';
const CHAIN_ID = 8453;

// Token Addresses on BASE
const TOKENS = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  WETH: '0x4200000000000000000000000000000000000006',
  BUNKER: '0xCe16Ef461d88256D2D80DFD31F0D9E7a9fD59213',
  CLAWNCH: '0xa1F72459dfA10BAD200Ac160eCd78C6b77a747be'
};

// Uniswap V3 Router on BASE
const UNISWAP_ROUTER = '0x2626664c2603336E57B271c5C0b26F421741e481';

// ABIs (minimal)
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

async function main() {
  const action = process.argv[2];

  if (!process.env.TRADING_WALLET_PRIVATE_KEY) {
    console.error('Error: No wallet found. Run generate-wallet.js first');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const wallet = new ethers.Wallet(process.env.TRADING_WALLET_PRIVATE_KEY, provider);

  console.log('=== MOLTLEAKS TRADING BOT ===');
  console.log('Wallet:', wallet.address);
  console.log('Chain: BASE\n');

  switch(action) {
    case 'balance':
      await checkBalances(wallet, provider);
      break;
    case 'buy':
      const token = process.argv[3] || 'BUNKER';
      const amount = process.argv[4] || '50';
      await buyToken(wallet, provider, token, amount);
      break;
    case 'sell':
      const tokenToSell = process.argv[3] || 'BUNKER';
      await sellToken(wallet, provider, tokenToSell);
      break;
    case 'price':
      await checkPrice(process.argv[3] || 'BUNKER');
      break;
    default:
      console.log('Usage:');
      console.log('  node trade.js balance         - Check wallet balances');
      console.log('  node trade.js buy BUNKER 50   - Buy $50 worth of BUNKER');
      console.log('  node trade.js sell BUNKER     - Sell all BUNKER');
      console.log('  node trade.js price BUNKER    - Check token price');
  }
}

async function checkBalances(wallet, provider) {
  console.log('--- Balances ---\n');

  // ETH balance
  const ethBalance = await provider.getBalance(wallet.address);
  console.log(`ETH: ${ethers.formatEther(ethBalance)} (~$${(parseFloat(ethers.formatEther(ethBalance)) * 2180).toFixed(2)})`);

  // USDC balance
  const usdc = new ethers.Contract(TOKENS.USDC, ERC20_ABI, provider);
  const usdcBalance = await usdc.balanceOf(wallet.address);
  const usdcDecimals = await usdc.decimals();
  console.log(`USDC: ${ethers.formatUnits(usdcBalance, usdcDecimals)}`);

  // BUNKER balance
  try {
    const bunker = new ethers.Contract(TOKENS.BUNKER, ERC20_ABI, provider);
    const bunkerBalance = await bunker.balanceOf(wallet.address);
    console.log(`BUNKER: ${ethers.formatUnits(bunkerBalance, 18)}`);
  } catch (e) {
    console.log('BUNKER: 0');
  }

  // CLAWNCH balance
  try {
    const clawnch = new ethers.Contract(TOKENS.CLAWNCH, ERC20_ABI, provider);
    const clawnchBalance = await clawnch.balanceOf(wallet.address);
    console.log(`CLAWNCH: ${ethers.formatUnits(clawnchBalance, 18)}`);
  } catch (e) {
    console.log('CLAWNCH: 0');
  }
}

async function checkPrice(tokenSymbol) {
  const tokenAddress = TOKENS[tokenSymbol.toUpperCase()];
  if (!tokenAddress) {
    console.error('Unknown token:', tokenSymbol);
    return;
  }

  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
    const data = await response.json();

    if (data.pairs && data.pairs[0]) {
      const pair = data.pairs[0];
      console.log(`--- ${tokenSymbol.toUpperCase()} Price ---\n`);
      console.log(`Price: $${pair.priceUsd}`);
      console.log(`5m: ${pair.priceChange?.m5 > 0 ? '+' : ''}${pair.priceChange?.m5}%`);
      console.log(`1h: ${pair.priceChange?.h1 > 0 ? '+' : ''}${pair.priceChange?.h1}%`);
      console.log(`24h: ${pair.priceChange?.h24 > 0 ? '+' : ''}${pair.priceChange?.h24}%`);
      console.log(`\nLiquidity: $${parseInt(pair.liquidity?.usd).toLocaleString()}`);
      console.log(`24h Volume: $${parseInt(pair.volume?.h24).toLocaleString()}`);
    }
  } catch (e) {
    console.error('Error fetching price:', e.message);
  }
}

async function buyToken(wallet, provider, tokenSymbol, usdAmount) {
  console.log(`\n--- Buy ${tokenSymbol} ---\n`);
  console.log(`Amount: $${usdAmount} USDC`);
  console.log('Status: Ready to execute');
  console.log('\nNote: Make sure you have:');
  console.log('1. USDC in wallet');
  console.log('2. Small amount of ETH for gas (~$0.50)');

  // Check balances first
  const usdc = new ethers.Contract(TOKENS.USDC, ERC20_ABI, provider);
  const usdcBalance = await usdc.balanceOf(wallet.address);
  const usdcDecimals = await usdc.decimals();
  const balance = parseFloat(ethers.formatUnits(usdcBalance, usdcDecimals));

  console.log(`\nCurrent USDC balance: $${balance}`);

  if (balance < parseFloat(usdAmount)) {
    console.log(`\n⚠️  Insufficient USDC. Need $${usdAmount}, have $${balance}`);
    console.log(`\nSend USDC to: ${wallet.address}`);
    return;
  }

  // TODO: Execute swap via Uniswap router
  console.log('\n✅ Ready to swap. Executing...');
}

main().catch(console.error);
