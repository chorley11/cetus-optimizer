import { GlobalConfig } from '../types';
import { POOL_CONFIGS } from './pools';

export const GLOBAL_CONFIG: GlobalConfig = {
  priceCheckIntervalMs: parseInt(process.env.PRICE_CHECK_INTERVAL_MS || '10000'),
  healthCheckIntervalMs: 300000,  // 5 minutes
  
  skimPercentage: parseFloat(process.env.SKIM_PERCENTAGE || '10') / 100,
  skimWalletAddress: process.env.SKIM_WALLET_ADDRESS || '',
  skimThresholds: {
    usdc: parseFloat(process.env.SKIM_WALLET_USDC_THRESHOLD || '50'),
    sui: parseFloat(process.env.SKIM_WALLET_SUI_THRESHOLD || '20'),
  },
  
  maxTotalPositionValueUsd: parseFloat(process.env.MAX_POSITION_SIZE_USD || '5000'),
  emergencyWithdrawEnabled: true,
  
  alertOnEveryRebalance: true,
  dailySummaryTime: "09:00",
  weeklyReportDay: 0,
};

export const RPC_CONFIG = {
  primary: process.env.SUI_RPC_URL || "https://fullnode.mainnet.sui.io",
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
};

export const RISK_LIMITS = {
  maxPositionSizeUsd: 1500,
  maxTotalExposureUsd: 5000,
  maxSinglePoolPct: 50,
  minWalletBalanceSui: 0.5,
  maxRebalancesPerHour: 10,
  maxSlippageBps: parseInt(process.env.MAX_SLIPPAGE_BPS || '50'),
};

export const CIRCUIT_BREAKERS = {
  consecutiveFailures: 3,
  priceDeviationPct: 20,
  volumeDropPct: 80,
  poolTvlDropPct: 50,
  consecutiveHoursOutOfRange: 24,
};

export const HEALTH_THRESHOLDS = {
  rpcLatencyWarning: 2000,
  rpcLatencyCritical: 5000,
  walletBalanceWarning: 1,
  walletBalanceCritical: 0.1,
  priceUpdateMaxAge: 60,
  errorsWarning: 5,
  errorsCritical: 20,
};

export { POOL_CONFIGS };

