const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Generate a new random wallet
const wallet = ethers.Wallet.createRandom();

console.log('=== NEW TRADING WALLET GENERATED ===\n');
console.log('Address:', wallet.address);
console.log('\nSave this address - this is where you send the $50 USDC on BASE chain\n');

// Save to .env.wallet (gitignored)
const envContent = `# Trading Wallet - KEEP SECRET
# Generated: ${new Date().toISOString()}
# Chain: BASE (8453)

TRADING_WALLET_ADDRESS=${wallet.address}
TRADING_WALLET_PRIVATE_KEY=${wallet.privateKey}
TRADING_WALLET_MNEMONIC="${wallet.mnemonic.phrase}"
`;

const envPath = path.join(__dirname, '..', '.env.wallet');
fs.writeFileSync(envPath, envContent);

console.log('Private key saved to .env.wallet (gitignored)\n');
console.log('=== SECURITY NOTES ===');
console.log('1. Never share the private key');
console.log('2. This wallet is ONLY for this $50 experiment');
console.log('3. .env.wallet is in .gitignore - will not be committed');
