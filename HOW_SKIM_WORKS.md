# How Profit Skimming Works

## Overview

The skim wallet accumulates profits from your liquidity positions. Funds are automatically transferred when positions are rebalanced and profits are realized.

## Current Status

**Your Skim Wallet:**
- USDC: $0.00 / $50 threshold
- SUI: 0.00 / 20 threshold
- Status: ⏳ Accumulating...

**This is normal!** The wallet is empty because:
- No positions have been rebalanced yet
- No profits have been realized
- The optimizer needs time to accumulate fees

## How It Works

### 1. Position Opens
- You open a liquidity position (e.g., $1000)
- Position starts earning trading fees
- Fees accumulate while position is active

### 2. Rebalance Triggered
- Price moves out of range (80% threshold)
- Optimizer decides to rebalance
- Old position is closed
- Fees are collected

### 3. Profit Calculation
When closing a position:
```
Current Value = Original Value + Fees Collected
Profit = Current Value - Original Value
Skim Amount = Profit × 10% (default)
```

**Example:**
- Original position: $1000
- Fees collected: $50
- Current value: $1050
- Profit: $50
- Skim: $5 (10% of profit)

### 4. Skim Transfer
- 70% of skim → USDC
- 30% of skim → SUI
- Automatically transferred to skim wallet
- Recorded in database

### 5. Accumulation
- Skim amounts accumulate over time
- Tracked in database
- Shown via `/skim` command

### 6. Bluefin Deposit
When thresholds are reached:
- USDC ≥ $50 OR SUI ≥ 20
- Telegram alert sent
- You deposit to Bluefin manually
- Use `/deposited` to reset tracking

## When Will Funds Appear?

### Immediate (If Active Positions):
- Positions need to be rebalanced
- Rebalancing happens when price moves 80% out of range
- Can take hours/days depending on volatility

### Typical Timeline:
- **Day 1:** Position opens, starts earning fees
- **Day 2-7:** Fees accumulate (small amounts)
- **Day 7-30:** First rebalance likely (if price moves)
- **After Rebalance:** First skim appears in wallet

### Factors Affecting Accumulation:

1. **Market Volatility:**
   - High volatility → More rebalances → More skims
   - Low volatility → Fewer rebalances → Slower accumulation

2. **Position Size:**
   - Larger positions → More fees → Larger skims
   - Current: $1000 per pool

3. **Trading Volume:**
   - More volume → More fees → Faster accumulation
   - Depends on pool activity

4. **Price Movement:**
   - Price needs to move 80% out of range to trigger rebalance
   - Range: 1.5x - 2.5x current price (for accumulate_usdc mode)

## Checking Status

### Via Telegram:
```
/skim  - Check current balance
/status - Check all pools and positions
/pools - Detailed pool metrics
```

### Via Database:
```bash
npm run trades
```

### Via Logs:
Look for:
- "Skim transferred" messages
- Rebalance alerts
- Fee collection logs

## Expected Accumulation Rate

**Rough Estimate:**
- Small position ($1000): ~$1-5 per rebalance
- Rebalance frequency: Weekly to monthly (depends on volatility)
- Monthly accumulation: ~$5-20 USDC + SUI

**To Reach Thresholds:**
- $50 USDC: ~10-50 rebalances (2-12 months)
- 20 SUI: ~10-50 rebalances (2-12 months)

*Note: These are rough estimates. Actual rates depend on market conditions.*

## Troubleshooting

### "Still $0.00 after weeks"

**Possible Reasons:**
1. **No positions opened yet**
   - Check `/status` - should show active positions
   - Positions need to be opened first

2. **No rebalances yet**
   - Check `/pools` - see if positions are in range
   - Rebalances only happen when price moves out of range

3. **No profits made**
   - Fees might not exceed gas costs
   - Position might be at a loss

4. **Transfer failed**
   - Check Railway logs for errors
   - Verify skim wallet address is correct

### "Funds not transferring"

**Check:**
1. Skim wallet address configured?
   - `SKIM_WALLET_ADDRESS` in Railway
   - Should be your accumulation wallet

2. Main wallet has balance?
   - Need SUI for gas
   - Need USDC if skimming USDC

3. Check logs:
   - Look for "Skim transferred" messages
   - Look for transfer errors

## Configuration

### Skim Percentage:
```bash
SKIM_PERCENTAGE=10  # 10% of profits skimmed
```

### Thresholds:
```bash
SKIM_WALLET_USDC_THRESHOLD=50  # Alert at $50
SKIM_WALLET_SUI_THRESHOLD=20   # Alert at 20 SUI
```

### Skim Wallet Address:
```bash
SKIM_WALLET_ADDRESS=0x...your_wallet_address...
```

## Summary

**Current Status:** ✅ Normal - Empty wallet is expected

**What Happens Next:**
1. Positions earn fees over time
2. Price moves → Rebalance triggered
3. Profits calculated → Skim transferred
4. Funds accumulate in skim wallet
5. Threshold reached → Bluefin deposit alert

**Timeline:** Days to weeks for first skim, months to reach thresholds

**Action Required:** None - just wait for rebalances and profits! 🎯

