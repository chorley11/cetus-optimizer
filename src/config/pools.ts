import { PoolConfig, TokenInfo } from '../types';

export const POOL_CONFIGS: PoolConfig[] = [
  {
    address: process.env.POOL_SUI_USDC || '',
    name: "SUI/USDC",
    tokenA: { 
      address: "0x2::sui::SUI", 
      symbol: "SUI", 
      decimals: 9 
    },
    tokenB: { 
      address: process.env.USDC_ADDRESS || "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93b2::coin::COIN", // Mainnet USDC
      symbol: "USDC", 
      decimals: 6 
    },
    feeTier: 2500,  // 0.25%
    enabled: true,
    positionSizeUsd: 1000,
    rangeMode: 'accumulate_usdc',
    rangeLowerBps: 150,
    rangeUpperBps: 250,
    rebalanceThresholdPct: 80,
    maxSlippageBps: 50,
    minRebalanceIntervalMs: 60000,
  },
  {
    address: process.env.POOL_DEEP_SUI || '',
    name: "DEEP/SUI",
    tokenA: { 
      address: process.env.DEEP_ADDRESS || "0x...::deep::DEEP", 
      symbol: "DEEP", 
      decimals: 6 
    },
    tokenB: { 
      address: "0x2::sui::SUI", 
      symbol: "SUI", 
      decimals: 9 
    },
    feeTier: 2500,
    enabled: true,
    positionSizeUsd: 1000,
    rangeMode: 'accumulate_usdc',
    rangeLowerBps: 150,
    rangeUpperBps: 250,
    rebalanceThresholdPct: 80,
    maxSlippageBps: 50,
    minRebalanceIntervalMs: 60000,
  },
  {
    address: process.env.POOL_WAL_SUI || '',
    name: "WAL/SUI",
    tokenA: { 
      address: process.env.WAL_ADDRESS || "0x...::wal::WAL", 
      symbol: "WAL", 
      decimals: 9 
    },
    tokenB: { 
      address: "0x2::sui::SUI", 
      symbol: "SUI", 
      decimals: 9 
    },
    feeTier: 2500,
    enabled: true,
    positionSizeUsd: 1000,
    rangeMode: 'accumulate_usdc',
    rangeLowerBps: 150,
    rangeUpperBps: 250,
    rebalanceThresholdPct: 80,
    maxSlippageBps: 50,
    minRebalanceIntervalMs: 60000,
  },
];

