import 'dotenv/config';
import { existsSync } from 'fs';
import { join } from 'path';
import { Logger } from '../src/utils/logger';

/**
 * Verify deployment configuration
 * Run with: ts-node scripts/verify-deployment.ts
 */

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

const checks: CheckResult[] = [];

function check(name: string, condition: boolean, message: string): void {
  checks.push({
    name,
    status: condition ? 'pass' : 'fail',
    message,
  });
}

function warn(name: string, condition: boolean, message: string): void {
  checks.push({
    name,
    status: condition ? 'pass' : 'warning',
    message,
  });
}

async function verifyDeployment() {
  Logger.info('Verifying deployment configuration...');

  // Check required environment variables
  check(
    'MAIN_WALLET_PRIVATE_KEY',
    !!process.env.MAIN_WALLET_PRIVATE_KEY,
    process.env.MAIN_WALLET_PRIVATE_KEY 
      ? 'Wallet private key configured' 
      : 'Missing MAIN_WALLET_PRIVATE_KEY'
  );

  check(
    'SKIM_WALLET_ADDRESS',
    !!process.env.SKIM_WALLET_ADDRESS,
    process.env.SKIM_WALLET_ADDRESS
      ? 'Skim wallet address configured'
      : 'Missing SKIM_WALLET_ADDRESS'
  );

  check(
    'TELEGRAM_BOT_TOKEN',
    !!process.env.TELEGRAM_BOT_TOKEN,
    process.env.TELEGRAM_BOT_TOKEN
      ? 'Telegram bot token configured'
      : 'Missing TELEGRAM_BOT_TOKEN'
  );

  check(
    'TELEGRAM_CHAT_ID',
    !!process.env.TELEGRAM_CHAT_ID,
    process.env.TELEGRAM_CHAT_ID
      ? 'Telegram chat ID configured'
      : 'Missing TELEGRAM_CHAT_ID'
  );

  check(
    'SUI_RPC_URL',
    !!process.env.SUI_RPC_URL,
    process.env.SUI_RPC_URL
      ? `RPC URL: ${process.env.SUI_RPC_URL}`
      : 'Missing SUI_RPC_URL (will use default)'
  );

  // Check pool addresses
  warn(
    'POOL_SUI_USDC',
    !!process.env.POOL_SUI_USDC,
    process.env.POOL_SUI_USDC
      ? 'SUI/USDC pool configured'
      : 'Missing POOL_SUI_USDC (pool will be disabled)'
  );

  warn(
    'POOL_DEEP_SUI',
    !!process.env.POOL_DEEP_SUI,
    process.env.POOL_DEEP_SUI
      ? 'DEEP/SUI pool configured'
      : 'Missing POOL_DEEP_SUI (pool will be disabled)'
  );

  warn(
    'POOL_WAL_SUI',
    !!process.env.POOL_WAL_SUI,
    process.env.POOL_WAL_SUI
      ? 'WAL/SUI pool configured'
      : 'Missing POOL_WAL_SUI (pool will be disabled)'
  );

  // Check wallet format
  if (process.env.MAIN_WALLET_PRIVATE_KEY) {
    const key = process.env.MAIN_WALLET_PRIVATE_KEY;
    warn(
      'Wallet Key Format',
      key.startsWith('suiprivkey1') || key.length >= 64,
      key.startsWith('suiprivkey1')
        ? 'Wallet key format looks correct'
        : 'Wallet key format may be incorrect (should start with suiprivkey1)'
    );
  }

  // Check data directory
  const dataDir = join(process.cwd(), 'data');
  warn(
    'Data Directory',
    existsSync(dataDir) || true, // Always pass, will be created
    'Data directory will be created on first run'
  );

  // Check logs directory
  const logsDir = join(process.cwd(), 'logs');
  warn(
    'Logs Directory',
    existsSync(logsDir) || true,
    'Logs directory will be created on first run'
  );

  // Print results
  console.log('\n=== Deployment Verification Results ===\n');
  
  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const warnings = checks.filter(c => c.status === 'warning').length;

  checks.forEach(check => {
    const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${check.name}: ${check.message}`);
  });

  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${warnings} warnings\n`);

  if (failed > 0) {
    console.log('❌ Deployment verification FAILED');
    console.log('Please fix the failed checks before deploying.\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  Deployment verification passed with warnings');
    console.log('Review warnings before deploying to production.\n');
    process.exit(0);
  } else {
    console.log('✅ Deployment verification PASSED');
    console.log('Ready for deployment!\n');
    process.exit(0);
  }
}

verifyDeployment().catch(error => {
  Logger.error('Verification failed', error);
  process.exit(1);
});

