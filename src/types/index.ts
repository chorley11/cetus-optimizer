export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
}

export interface RangeConfig {
  mode: 'neutral' | 'accumulate_usdc' | 'accumulate_token';
  rangeLowerBps: number;  // Basis points (150 = 1.5%)
  rangeUpperBps: number;  // Basis points (250 = 2.5%)
}

export interface PoolConfig {
  address: string;
  name: string;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  feeTier: number;
  
  // Strategy
  enabled: boolean;
  positionSizeUsd: number;
  rangeMode: 'neutral' | 'accumulate_usdc' | 'accumulate_token';
  rangeLowerBps: number;
  rangeUpperBps: number;
  rebalanceThresholdPct: number;
  
  // Limits
  maxSlippageBps: number;
  minRebalanceIntervalMs: number;
}

export interface GlobalConfig {
  // Monitoring
  priceCheckIntervalMs: number;
  healthCheckIntervalMs: number;
  
  // Skim Settings
  skimPercentage: number;
  skimWalletAddress: string;
  skimThresholds: {
    usdc: number;
    sui: number;
  };
  
  // Safety
  maxTotalPositionValueUsd: number;
  emergencyWithdrawEnabled: boolean;
  
  // Notifications
  alertOnEveryRebalance: boolean;
  dailySummaryTime: string;
  weeklyReportDay: number;
}

export interface Position {
  id: number;
  poolAddress: string;
  positionId: string;
  tickLower: number;
  tickUpper: number;
  priceLower: number;
  priceUpper: number;
  liquidity: string;
  amountA: string;
  amountB: string;
  entryPrice: number;
  entryValueUsd: number;
  status: 'active' | 'closed';
  openedAt: Date;
  closedAt?: Date;
  closeReason?: 'rebalance' | 'manual' | 'emergency';
}

export interface Rebalance {
  id: number;
  poolAddress: string;
  oldPositionId: number;
  newPositionId: number;
  triggerPrice: number;
  triggerReason: 'upper_breach' | 'lower_breach' | 'manual';
  oldRange: { lower: number; upper: number };
  newRange: { lower: number; upper: number };
  feesCollected: { tokenA: string; tokenB: string; usd: number };
  skimAmount: { usdc: number; sui: number };
  gasUsed: string;
  txDigest: string;
  executedAt: Date;
}

export interface SkimWalletStatus {
  usdcBalance: number;
  suiBalance: number;
  usdcThreshold: number;
  suiThreshold: number;
  readyForDeposit: boolean;
  lastAlertSent?: Date;
}

export interface PoolMetrics {
  poolAddress: string;
  currentPrice: number;
  position?: Position;
  inRange: boolean;
  distanceToLower: number;
  distanceToUpper: number;
  shouldRebalance: boolean;
  todaysFees: number;
  todaysRebalances: number;
}

export interface HealthCheck {
  timestamp: Date;
  rpcStatus: 'healthy' | 'degraded' | 'down';
  rpcLatencyMs: number;
  walletBalanceSui: number;
  activePositions: number;
  lastRebalanceAge: number;
  lastPriceUpdateAge: number;
  errors24h: number;
  status: 'healthy' | 'warning' | 'critical';
}

