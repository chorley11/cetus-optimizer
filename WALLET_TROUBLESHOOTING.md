# Wallet Troubleshooting Guide

## Issue: Wallet Not Working on Pool

### Common Problems and Solutions

#### 1. ⚠️ Low Balance (Most Common)

**Symptom:**
- Wallet initialized successfully
- But transactions fail or positions don't open
- Error: "Insufficient balance"

**Diagnosis:**
```bash
npm run diagnose
```

Look for:
```
⚠️  WARNING: Low balance! You need at least 0.1 SUI for gas
```

**Solution:**
1. **Add SUI to your wallet**
   - Minimum: 0.1 SUI for basic operations
   - Recommended: 1-5 SUI for reliable operations
   - For multiple positions: 5-10 SUI

2. **How to add SUI:**
   - Transfer SUI from another wallet
   - Use a DEX or exchange
   - Send to your wallet address (shown in diagnose output)

3. **Check balance:**
   ```bash
   npm run diagnose
   ```

#### 2. 🔗 Pool Connectivity Issues

**Symptom:**
- Error: "Failed to parse URL from undefined"
- Pools fail to connect
- Can't fetch pool information

**Diagnosis:**
```bash
npm run diagnose
```

Look for:
```
❌ SUI/USDC: Failed to connect
   Error: Failed to parse URL from undefined
```

**Solution:**
1. **Check RPC URL:**
   ```bash
   # In your .env file
   SUI_RPC_URL=https://fullnode.mainnet.sui.io
   ```

2. **Verify RPC is accessible:**
   - Try accessing: https://fullnode.mainnet.sui.io
   - Should return JSON response

3. **Use alternative RPC (if needed):**
   ```bash
   # Option 1: Sui Foundation RPC
   SUI_RPC_URL=https://fullnode.mainnet.sui.io
   
   # Option 2: Mysten Labs RPC
   SUI_RPC_URL=https://sui-mainnet-endpoint.blockvision.org
   
   # Option 3: Your own RPC node
   SUI_RPC_URL=https://your-rpc-node.com
   ```

4. **Restart the optimizer:**
   ```bash
   npm start
   ```

#### 3. 🔑 Invalid Private Key Format

**Symptom:**
- Error: "Failed to initialize Sui wallet"
- Error: "Invalid private key"

**Diagnosis:**
```bash
npm run diagnose
```

Look for:
```
❌ Failed to initialize wallet
   Error: Invalid private key format
```

**Solution:**
1. **Check key format:**
   - Should start with: `suiprivkey1`
   - Should be 64+ characters long
   - No spaces or extra characters

2. **Example format:**
   ```
   suiprivkey1qph7qn7654k76hh3mdcg77wkefhaefzqwjt2fmzm7gemz3asw5dykdkvrpx
   ```

3. **If using hex format:**
   - Convert to Sui private key format
   - Or use `Ed25519Keypair.fromSecretKey()` directly

#### 4. 💰 Insufficient Token Balance

**Symptom:**
- Position opening fails
- Error: "Insufficient balance"
- Wallet has SUI but not other tokens

**Diagnosis:**
```bash
npm run diagnose
```

Look for:
```
⚠️  No other tokens found (you may need USDC for positions)
```

**Solution:**
1. **For SUI/USDC pool:**
   - Need both SUI and USDC
   - Or use zap-in feature (automatic swap)

2. **Check required tokens:**
   - SUI/USDC pool: Need SUI + USDC
   - DEEP/SUI pool: Need DEEP + SUI
   - WAL/SUI pool: Need WAL + SUI

3. **Zap-in feature:**
   - Automatically swaps SUI to get other token
   - Enabled by default
   - Only need SUI in wallet

#### 5. 🌐 Network Mismatch

**Symptom:**
- Transactions fail
- Wrong network errors
- Pool addresses not found

**Diagnosis:**
Check your configuration:
```bash
npm run check-env
```

**Solution:**
1. **Verify network:**
   ```bash
   # In .env file
   SUI_NETWORK=mainnet  # or testnet
   ```

2. **Match pool addresses:**
   - Mainnet pools: Use mainnet addresses
   - Testnet pools: Use testnet addresses

3. **Check RPC URL matches network:**
   - Mainnet: `https://fullnode.mainnet.sui.io`
   - Testnet: `https://fullnode.testnet.sui.io`

### Quick Diagnostic Steps

#### Step 1: Run Full Diagnosis
```bash
npm run diagnose
```

This checks:
- ✅ Wallet initialization
- ✅ Wallet balance
- ✅ RPC connection
- ✅ Pool connectivity
- ✅ Token balances
- ✅ Transaction capability

#### Step 2: Check Environment Variables
```bash
npm run check-env
```

This verifies:
- ✅ All required variables are set
- ✅ Variable formats are correct
- ✅ No missing values

#### Step 3: Check Logs
```bash
# If running locally
npm start

# Check Railway logs
# Go to Railway Dashboard → Your Service → Logs
```

Look for:
- Wallet initialization messages
- Balance warnings
- Connection errors
- Transaction failures

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Insufficient balance` | Not enough SUI | Add more SUI (1-5 recommended) |
| `Failed to parse URL` | RPC URL issue | Check `SUI_RPC_URL` in .env |
| `Invalid private key` | Wrong key format | Use `suiprivkey1...` format |
| `Pool not found` | Wrong pool address | Verify pool address matches network |
| `Transaction failed` | Low balance or network issue | Check balance and RPC connection |

### Your Current Status

Based on the diagnostic:

**✅ Working:**
- Wallet initialized successfully
- RPC connection working
- Can read from chain

**⚠️ Issues Found:**
1. **Low Balance**: 0.0005 SUI (need at least 0.1 SUI)
2. **Pool Connectivity**: RPC URL not passed to Cetus SDK correctly

### Immediate Actions

1. **Add SUI to wallet:**
   - Transfer at least 1-5 SUI to: `0x18197fc88dcbce6c5bd18ceb5d782ba0eb8a17f43f26616841a9166c9802ca44`

2. **Fix pool connectivity:**
   - Code fix applied (Cetus SDK initialization)
   - Restart optimizer after fix

3. **Verify fix:**
   ```bash
   npm run diagnose
   ```

### Still Not Working?

1. **Check Railway logs** (if deployed)
2. **Verify environment variables** in Railway dashboard
3. **Test with small amount** first
4. **Check Sui Explorer** for your wallet address
5. **Review error messages** in logs

### Getting Help

If issues persist:
1. Run `npm run diagnose` and share output
2. Check Railway logs and share errors
3. Verify wallet address and balance on Sui Explorer
4. Confirm environment variables are set correctly

