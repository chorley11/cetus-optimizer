# How to Open Positions

## Overview

The Cetus Optimizer automatically opens positions when needed, but you can also trigger manual position opening. Positions are liquidity positions on Cetus DEX that earn fees from trading activity.

## Automatic Position Opening

### When Positions Are Opened Automatically

1. **On Startup** - If a pool has no active position, the optimizer will open one automatically
2. **After Rebalancing** - When a position is rebalanced, a new position is opened with the new range
3. **After Closing** - If a position is closed and no new one exists, one will be opened

### How It Works

The optimizer checks each pool every `PRICE_CHECK_INTERVAL_MS` (default: 10 seconds):

```typescript
// From src/index.ts - monitoring loop
for (const pool of POOL_CONFIGS) {
  if (!pool.enabled) continue;
  
  const position = this.db.getActivePosition(pool.address);
  
  if (!position) {
    // No position exists - open one automatically
    await this.openInitialPosition(pool);
  } else {
    // Check if rebalance needed
    // ...
  }
}
```

### Position Parameters

Positions are opened with these settings from `src/config/pools.ts`:

- **Position Size**: `positionSizeUsd` (default: $1000)
- **Price Range**: Based on `rangeMode`, `rangeLowerBps`, `rangeUpperBps`
- **Slippage**: `maxSlippageBps` (default: 0.5%)
- **Fee Tier**: From pool configuration (e.g., 2500 = 0.25%)

## Manual Position Opening

### Via Telegram Bot

Currently, manual position opening via Telegram commands is not fully implemented. You can:

1. **Pause/Resume Pools**: `/pause POOL_NAME` or `/resume POOL_NAME`
2. **Force Rebalance**: `/rebalance POOL_NAME` (opens new position after closing old one)

### Via Code (For Development)

You can manually open a position by calling the `PositionManager.openPosition()` method:

```typescript
import { PositionManager } from './core/positionManager';
import { POOL_CONFIGS } from './config/pools';

// Get pool config
const pool = POOL_CONFIGS.find(p => p.name === 'SUI/USDC');

// Calculate price range
const currentPrice = 1.50; // Current SUI/USDC price
const priceLower = currentPrice * 1.5; // 1.5x current price
const priceUpper = currentPrice * 2.5; // 2.5x current price

// Open position
const positionId = await positionManager.openPosition(
  pool!,
  priceLower,
  priceUpper,
  currentPrice
);

console.log(`Position opened: ${positionId}`);
```

## Position Opening Process

When a position is opened, the optimizer:

1. **Calculates Position Size**
   - Determines amounts of Token A and Token B needed
   - Based on `positionSizeUsd` and current price

2. **Converts Prices to Ticks**
   - Converts price range to tick range (Cetus uses ticks)
   - Ensures ticks align with pool's `tickSpacing`

3. **Creates Transaction**
   - Builds Cetus position creation transaction
   - Includes slippage protection

4. **Simulates Transaction**
   - Pre-checks transaction before execution
   - Catches errors before spending gas

5. **Executes Transaction**
   - Sends transaction to Sui blockchain
   - Waits for confirmation

6. **Records Position**
   - Saves position to database
   - Logs position details
   - Sends Telegram notification (if enabled)

## Position Range Strategies

### Range Modes

Positions use different range strategies based on `rangeMode`:

#### `accumulate_usdc` (Default)
- **Lower Bound**: 1.5x current price (150 bps)
- **Upper Bound**: 2.5x current price (250 bps)
- **Strategy**: Accumulates USDC/stables as price moves up
- **Use Case**: Bullish on token, want stablecoin accumulation

#### `accumulate_token`
- **Lower Bound**: 0.5x current price (50 bps)
- **Upper Bound**: 1.5x current price (150 bps)
- **Strategy**: Accumulates token as price moves down
- **Use Case**: Want to accumulate more tokens

#### `neutral`
- **Lower Bound**: 0.9x current price (90 bps)
- **Upper Bound**: 1.1x current price (110 bps)
- **Strategy**: Balanced range around current price
- **Use Case**: Neutral on direction, maximize fees

### Range Calculation

```typescript
// From StrategyEngine
const currentPrice = 1.50; // SUI/USDC
const rangeLowerBps = 150; // 1.5x
const rangeUpperBps = 250; // 2.5x

const priceLower = currentPrice * (rangeLowerBps / 100);
// = 1.50 * 1.5 = $2.25

const priceUpper = currentPrice * (rangeUpperBps / 100);
// = 1.50 * 2.5 = $3.75
```

## Requirements

### Wallet Balance

Your wallet needs sufficient balance of both tokens:

- **Token A**: Amount calculated based on position size
- **Token B**: Amount calculated based on position size
- **SUI**: For gas fees (~0.01-0.1 SUI per transaction)

### Example Calculation

For a $1000 SUI/USDC position at $1.50:

- **SUI needed**: ~333 SUI (if price is $1.50)
- **USDC needed**: ~500 USDC
- **Total**: ~$1000 worth

## Monitoring Positions

### Check Active Positions

**Via Telegram:**
```
/status  - Shows all pools and positions
/pools   - Detailed pool metrics
```

**Via Database:**
```bash
npm run trades
```

**Via Code:**
```typescript
const position = db.getActivePosition(poolAddress);
if (position) {
  console.log(`Position ID: ${position.positionId}`);
  console.log(`Range: $${position.priceLower} - $${position.priceUpper}`);
  console.log(`Value: $${position.entryValueUsd}`);
}
```

### Position Status

Positions can be:
- **`active`**: Currently earning fees
- **`closed`**: Closed (rebalanced, manual, or emergency)

## Troubleshooting

### "Insufficient Balance"

**Problem**: Wallet doesn't have enough tokens

**Solution**:
1. Check wallet balance
2. Reduce `positionSizeUsd` in pool config
3. Ensure you have both tokens (not just one)

### "Transaction Simulation Failed"

**Problem**: Transaction would fail on-chain

**Solution**:
1. Check pool address is correct
2. Verify token addresses match pool
3. Check slippage settings
4. Ensure pool exists and is active

### "Position Not Opening Automatically"

**Problem**: Optimizer not opening positions on startup

**Solution**:
1. Check logs for errors
2. Verify pool is `enabled: true` in config
3. Check wallet has sufficient balance
4. Verify environment variables are set

### "Position Opens But Immediately Closes"

**Problem**: Position out of range immediately

**Solution**:
1. Check price range settings (`rangeLowerBps`, `rangeUpperBps`)
2. Verify current price is within range
3. Adjust range to be wider around current price

## Example: Opening Your First Position

1. **Start Optimizer**:
   ```bash
   npm start
   ```

2. **Check Logs**:
   ```
   [INFO] Opening initial position for SUI/USDC
   [INFO] Position opened: 0x1234...5678
   ```

3. **Verify in Telegram**:
   ```
   /status
   ```

4. **Check Database**:
   ```bash
   npm run trades
   ```

## Position Lifecycle

```
1. No Position → Open Initial Position
2. Position Active → Monitor Price
3. Price Out of Range → Rebalance (Close + Open New)
4. Position Closed → Open New Position
```

## Next Steps

- **Monitor**: Positions are monitored automatically
- **Rebalance**: Happens automatically when price moves out of range
- **Collect Fees**: Fees are collected on rebalance
- **Skim Profits**: Profits are skimmed to accumulation wallet

See `REBALANCING.md` for details on how positions are rebalanced.

