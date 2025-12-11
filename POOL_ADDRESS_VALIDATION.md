# Pool Address Validation

## Issue: "Invalid Sui Object id" Error

### Problem

The error `Invalid Sui Object id` occurs when:
1. Pool address is empty or not set
2. Pool address format is invalid
3. Pool doesn't exist on the network

### Solution

Added validation to:
- ✅ Check pool addresses before use
- ✅ Disable pools with invalid addresses
- ✅ Provide clear error messages
- ✅ Log warnings for invalid pools

## How to Fix

### 1. Check Environment Variables

Verify pool addresses are set in Railway:

```bash
# Check locally
npm run check-env
```

Look for:
- ✅ `POOL_SUI_USDC` - Should be set
- ✅ `POOL_DEEP_SUI` - Should be set  
- ✅ `POOL_WAL_SUI` - Should be set

### 2. Verify Pool Addresses

Pool addresses should:
- Start with `0x`
- Be 64+ characters long
- Be valid Sui object IDs

**Example format:**
```
0x5cf7e2ec9311d9057e43477a29bd457c51beeb1ddcd151c385a295dbb3c0fb18
```

### 3. Update Railway Variables

If a pool address is missing or invalid:

1. Go to Railway Dashboard → Your Service → Variables
2. Check if `POOL_DEEP_SUI` is set
3. If missing, add it with the correct pool address
4. If invalid, update with correct address

### 4. Disable Invalid Pools

If you don't want to use a pool:

1. Set `enabled: false` in `src/config/pools.ts`
2. Or remove the pool from `POOL_CONFIGS` array

## Error Messages

### "Pool has invalid address"

**Meaning:** Pool address is empty or not set

**Fix:**
- Set the environment variable in Railway
- Format: `POOL_DEEP_SUI=0x...your_pool_address...`

### "Invalid pool address format"

**Meaning:** Address doesn't match Sui format

**Fix:**
- Ensure address starts with `0x`
- Ensure address is 64+ characters
- Check for typos

### "Invalid Sui Object id"

**Meaning:** Address format is wrong or pool doesn't exist

**Fix:**
- Verify pool address on Cetus DEX
- Check if pool exists on mainnet
- Update with correct address

## Finding Pool Addresses

### On Cetus DEX:

1. Go to https://app.cetus.zone/
2. Navigate to the pool
3. Check the URL or pool details
4. Copy the pool contract address

### On Sui Explorer:

1. Go to https://suiexplorer.com/
2. Search for "Cetus" or pool name
3. Find the pool contract
4. Copy the object ID

## Current Status

After validation is added:
- ✅ Invalid pools are automatically disabled
- ✅ Clear error messages shown
- ✅ Warnings logged for debugging
- ✅ Valid pools continue working

## Testing

After updating pool addresses:

```bash
# Check environment
npm run check-env

# Run diagnostics
npm run diagnose

# Start optimizer
npm start
```

Check logs for:
- ✅ "Pool X has invalid address" warnings (if any)
- ✅ Successful pool connections
- ✅ Price fetching working

