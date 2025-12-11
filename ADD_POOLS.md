# How to Add Pools to the Cetus Optimizer

## Overview

The optimizer monitors and manages liquidity positions across multiple Cetus pools. To add a new pool, you need to:

1. **Get the pool address** from Cetus DEX
2. **Add pool configuration** to `src/config/pools.ts`
3. **Add environment variable** for the pool address
4. **Set environment variable** in Railway (if deploying)

## Step-by-Step Guide

### Step 1: Find Pool Information

You need:
- **Pool Address**: The Cetus pool contract address
- **Token A Address**: First token's address (e.g., SUI, USDC, DEEP)
- **Token B Address**: Second token's address
- **Token Decimals**: Usually 9 for SUI, 6 for USDC, varies for others
- **Fee Tier**: Pool fee (e.g., 2500 = 0.25%, 10000 = 1%)

**Where to find:**
- Cetus DEX: https://app.cetus.zone/
- Sui Explorer: https://suiexplorer.com/
- Pool address format: `0x...` (64 character hex)

### Step 2: Add Pool Configuration

Edit `src/config/pools.ts` and add a new pool entry:

```typescript
{
  address: process.env.POOL_NEW_TOKEN_SUI || '',
  name: "NEW_TOKEN/SUI",  // Display name
  tokenA: { 
    address: process.env.NEW_TOKEN_ADDRESS || "0x...::newtoken::NEW_TOKEN", 
    symbol: "NEW_TOKEN", 
    decimals: 9  // Check actual decimals
  },
  tokenB: { 
    address: "0x2::sui::SUI", 
    symbol: "SUI", 
    decimals: 9 
  },
  feeTier: 2500,  // 0.25% = 2500, 1% = 10000
  enabled: true,
  positionSizeUsd: 1000,  // Initial position size in USD
  rangeMode: 'accumulate_usdc',  // Strategy: 'accumulate_usdc' or 'accumulate_token'
  rangeLowerBps: 150,  // Lower bound: 1.5x current price
  rangeUpperBps: 250,  // Upper bound: 2.5x current price
  rebalanceThresholdPct: 80,  // Rebalance when utilization > 80%
  maxSlippageBps: 50,  // Max slippage: 0.5%
  minRebalanceIntervalMs: 60000,  // Min 1 minute between rebalances
},
```

### Step 3: Add Environment Variable

Add to your `.env` file (local):

```bash
POOL_NEW_TOKEN_SUI=0x...your_pool_address_here...
NEW_TOKEN_ADDRESS=0x...token_address_if_needed...
```

### Step 4: Add to Railway (if deploying)

1. Go to Railway → Your Service → Variables
2. Add:
   - `POOL_NEW_TOKEN_SUI` = `0x...your_pool_address...`
   - `NEW_TOKEN_ADDRESS` = `0x...token_address...` (if needed)

### Step 5: Rebuild and Deploy

```bash
# Local
npm run build
npm start

# Railway will auto-deploy after you push
git add src/config/pools.ts
git commit -m "Add NEW_TOKEN/SUI pool"
git push origin main
```

## Example: Adding a USDT/SUI Pool

```typescript
// In src/config/pools.ts
{
  address: process.env.POOL_USDT_SUI || '',
  name: "USDT/SUI",
  tokenA: { 
    address: process.env.USDT_ADDRESS || "0x...::usdt::USDT", 
    symbol: "USDT", 
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
```

Then add to `.env`:
```bash
POOL_USDT_SUI=0x1234567890abcdef...your_pool_address
USDT_ADDRESS=0x9876543210fedcba...usdt_token_address
```

## Configuration Parameters Explained

| Parameter | Description | Example |
|-----------|-------------|---------|
| `address` | Cetus pool contract address | `0x5cf7e2ec...` |
| `name` | Display name for logs/Telegram | `"SUI/USDC"` |
| `tokenA/B` | Token addresses and metadata | See above |
| `feeTier` | Pool fee in basis points | `2500` = 0.25% |
| `enabled` | Whether pool is active | `true` / `false` |
| `positionSizeUsd` | Initial position size | `1000` = $1000 |
| `rangeMode` | Strategy type | `'accumulate_usdc'` |
| `rangeLowerBps` | Lower price bound (bps) | `150` = 1.5x |
| `rangeUpperBps` | Upper price bound (bps) | `250` = 2.5x |
| `rebalanceThresholdPct` | When to rebalance | `80` = 80% utilization |
| `maxSlippageBps` | Max acceptable slippage | `50` = 0.5% |
| `minRebalanceIntervalMs` | Min time between rebalances | `60000` = 1 min |

## Range Modes

- **`accumulate_usdc`**: Position accumulates USDC (or stablecoin) as price moves
- **`accumulate_token`**: Position accumulates the non-stable token

## Verification

After adding a pool:

1. **Check logs**: Should see pool initialization
2. **Telegram**: Send `/pools` to see new pool
3. **Database**: Check `positions` table for new entries

## Troubleshooting

**Pool not appearing?**
- Check pool address is correct
- Verify environment variable is set
- Check logs for initialization errors

**Price fetching fails?**
- Verify pool address is valid
- Check RPC connection
- Ensure pool exists on Cetus

**Position creation fails?**
- Check wallet has sufficient balance
- Verify token addresses are correct
- Check fee tier matches pool

## Current Pools

Currently configured pools:
- ✅ SUI/USDC
- ✅ DEEP/SUI
- ✅ WAL/SUI

See `src/config/pools.ts` for full configuration.

