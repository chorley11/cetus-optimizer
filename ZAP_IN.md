# Zap-In Feature: Open Positions with SUI Only

## Overview

The optimizer now supports **"zap in"** functionality, allowing you to open liquidity positions using only SUI. The system will automatically swap half of your SUI to the other token (e.g., USDC) before opening the position.

## How It Works

### Traditional Method (Before)
- Required: Both tokens (e.g., SUI + USDC)
- Manual: You had to acquire both tokens separately
- Complex: Multiple transactions and token management

### Zap-In Method (Now)
- Required: Only SUI
- Automatic: System swaps half to get the other token
- Simple: One transaction flow

## Process Flow

```
1. You provide: SUI only
   ↓
2. System calculates: How much SUI needed for position
   ↓
3. System swaps: Half of SUI → USDC (or other token)
   ↓
4. System opens: Position with both tokens
```

## Example

For a $1000 SUI/USDC position at $1.50:

**Traditional:**
- Need: ~333 SUI + ~500 USDC
- You must: Acquire USDC separately

**Zap-In:**
- Provide: ~666 SUI total
- System swaps: ~333 SUI → ~500 USDC
- System opens: Position with 333 SUI + 500 USDC

## Configuration

Zap-in is **enabled by default** for all pools. The optimizer will:

1. Check if SUI is one of the pool tokens
2. If yes, automatically swap to get both tokens
3. Open position with both tokens

### Disable Zap-In

To disable zap-in and use traditional method (both tokens required):

```typescript
// In src/index.ts or when calling openPosition
const positionId = await positionManager.openPosition(
  pool,
  priceLower,
  priceUpper,
  currentPrice,
  false  // zapWithSui = false
);
```

## Requirements

### Wallet Balance

You only need:
- **SUI**: Sufficient amount for position + swap fees
- **Gas**: Small amount of SUI for transaction fees

### Example Calculation

For $1000 position:
- **SUI needed**: ~$1000 worth (at current price)
- **Swap fee**: ~0.1-0.5% (Cetus swap fee)
- **Gas**: ~0.01-0.1 SUI
- **Total**: ~$1000 + fees in SUI

## Swap Details

### Swap Pool

The system uses the **same pool** for swapping and position creation:
- For SUI/USDC pool: Swaps happen within the pool
- Ensures best rates and minimal slippage

### Slippage Protection

- Uses `maxSlippageBps` from pool config (default: 0.5%)
- Transaction will fail if slippage exceeds threshold
- Protects against unfavorable swaps

## Benefits

1. **Simplicity**: Only need SUI, not multiple tokens
2. **Efficiency**: Automatic swap + position in one flow
3. **Convenience**: No need to acquire other tokens separately
4. **Gas Savings**: Optimized transaction flow

## Limitations

1. **Swap Fees**: Small fee for swapping (Cetus swap fee)
2. **Slippage**: Price may move slightly during swap
3. **Pool Dependency**: Requires swap liquidity in the pool

## Troubleshooting

### "Insufficient Balance"

**Problem**: Not enough SUI

**Solution**:
- Check wallet SUI balance
- Ensure you have enough for position + swap + gas
- Reduce `positionSizeUsd` if needed

### "Swap Failed"

**Problem**: Swap transaction failed

**Solution**:
- Check swap pool has sufficient liquidity
- Increase `maxSlippageBps` if slippage too high
- System will fall back to direct position creation if swap fails

### "Position Creation Failed After Swap"

**Problem**: Swap succeeded but position creation failed

**Solution**:
- Check you still have enough of both tokens
- Verify pool is active
- Check transaction logs for details

## Technical Details

### Implementation

The zap-in feature:
1. Calculates required amounts for both tokens
2. Determines swap amount needed
3. Executes swap transaction
4. Waits for confirmation
5. Opens position with both tokens

### Code Location

- **Position Opening**: `src/core/positionManager.ts` - `openPosition()` method
- **Swap Logic**: `src/services/cetus.ts` - `createSwapTx()` method
- **Configuration**: `src/config/pools.ts` - Pool settings

## Future Enhancements

Potential improvements:
- **Single Transaction**: Combine swap + position in one transaction
- **Multi-Token Zap**: Support zapping with any token, not just SUI
- **Optimized Routing**: Use best swap route across multiple pools
- **Gas Optimization**: Batch operations for better efficiency

## Usage Examples

### Automatic (Default)

Just start the optimizer - zap-in happens automatically:

```bash
npm start
```

### Manual Script

```bash
npm run open-position SUI/USDC
```

The script will use zap-in automatically if SUI is one of the tokens.

### Programmatic

```typescript
import { PositionManager } from './core/positionManager';

// Zap-in with SUI (default)
const positionId = await positionManager.openPosition(
  pool,
  priceLower,
  priceUpper,
  currentPrice,
  true  // zapWithSui
);

// Traditional method (both tokens required)
const positionId2 = await positionManager.openPosition(
  pool,
  priceLower,
  priceUpper,
  currentPrice,
  false  // zapWithSui = false
);
```

## Summary

✅ **Zap-in is enabled by default**
✅ **Only need SUI** - no need to acquire other tokens
✅ **Automatic swap** - system handles everything
✅ **Same security** - slippage protection and error handling

The optimizer now makes it much easier to provide liquidity - just ensure you have SUI!

