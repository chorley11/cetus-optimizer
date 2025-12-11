import 'dotenv/config';

/**
 * Check environment variables
 * Usage: ts-node scripts/check-env.ts
 */

console.log('🔍 Checking Environment Variables...\n');

const requiredVars = [
  'MAIN_WALLET_PRIVATE_KEY',
  'SKIM_WALLET_ADDRESS',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'SUI_RPC_URL',
  'POOL_SUI_USDC',
  'POOL_DEEP_SUI',
  'POOL_WAL_SUI',
];

const optionalVars = [
  'SUI_NETWORK',
  'PRICE_CHECK_INTERVAL_MS',
  'REBALANCE_THRESHOLD_PCT',
  'SKIM_PERCENTAGE',
];

let allGood = true;

console.log('Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values
    let displayValue = value;
    if (varName.includes('PRIVATE_KEY') || varName.includes('TOKEN')) {
      displayValue = `${value.slice(0, 10)}...${value.slice(-5)}`;
    } else if (varName.includes('ADDRESS') || varName.includes('POOL')) {
      displayValue = `${value.slice(0, 10)}...${value.slice(-10)}`;
    }
    console.log(`  ✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`  ❌ ${varName}: NOT SET`);
    allGood = false;
  }
});

console.log('\nOptional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✅ ${varName}: ${value}`);
  } else {
    console.log(`  ⚠️  ${varName}: Not set (using default)`);
  }
});

console.log('\n' + '='.repeat(60));

if (allGood) {
  console.log('✅ All required environment variables are set!');
  process.exit(0);
} else {
  console.log('❌ Missing required environment variables!');
  console.log('\nPlease set the missing variables in Railway:');
  console.log('1. Go to Railway dashboard');
  console.log('2. Click on your service');
  console.log('3. Go to Variables tab');
  console.log('4. Add missing variables');
  console.log('\nSee RAILWAY_ENV_VALUES.md for exact values to copy.');
  process.exit(1);
}

