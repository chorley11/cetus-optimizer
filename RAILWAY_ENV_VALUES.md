# Railway Environment Variables - Copy & Paste

## Quick Setup Instructions

1. Go to your Railway project: https://railway.app
2. Click on your service
3. Go to **Variables** tab
4. Click **+ New Variable** for each one below
5. Copy the **exact** values (including the variable name)

## Required Variables

### Wallet Configuration
```
MAIN_WALLET_PRIVATE_KEY=suiprivkey1qph7qn7654k76hh3mdcg77wkefhaefzqwjt2fmzm7gemz3asw5dykdkvrpx
```

```
SKIM_WALLET_ADDRESS=0x18197fc88dcbce6c5bd18ceb5d782ba0eb8a17f43f26616841a9166c9802ca44
```

### Telegram Configuration
```
TELEGRAM_BOT_TOKEN=8419537848:AAFVnlMygHSdnawnraldZjdo9i1ROpITbO0
```

```
TELEGRAM_CHAT_ID=1293829515
```

### Sui Network
```
SUI_RPC_URL=https://fullnode.mainnet.sui.io
```

```
SUI_NETWORK=mainnet
```

### Pool Addresses
```
POOL_SUI_USDC=0x5cf7e2ec9311d9057e43477a29bd457c51beeb1ddcd151c385a295dbb3c0fb18
```

```
POOL_DEEP_SUI=0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab
```

```
POOL_WAL_SUI=0xe01243f37f712ef87e556afb9b1d03d0fae13f96d324ec912daffc339dfdcbd2
```

## Optional Variables (with defaults)

These have defaults but you can set them if you want:

```
PRICE_CHECK_INTERVAL_MS=10000
REBALANCE_THRESHOLD_PCT=80
SKIM_PERCENTAGE=10
SKIM_WALLET_USDC_THRESHOLD=50
SKIM_WALLET_SUI_THRESHOLD=20
MAX_SLIPPAGE_BPS=50
```

## After Adding Variables

1. Click **Save** or **Deploy**
2. Railway will automatically redeploy
3. Check logs - should see "Wallet initialized" and "Cetus Optimizer initialized successfully"
4. Test Telegram bot - send `/status` to @cetusliqbot

## Verification

After adding variables, check logs for:
- ✅ "Wallet initialized"
- ✅ "Cetus Optimizer initialized successfully"  
- ✅ "Monitoring started"
- ✅ No "not set in environment variables" errors

## Troubleshooting

**Still getting "not set" errors?**
- Make sure variable names match exactly (case-sensitive)
- No extra spaces before/after the `=`
- Click "Save" after adding each variable
- Trigger a redeploy

**Bot not responding?**
- Make sure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set
- Send `/start` to @cetusliqbot first
- Check Railway logs for Telegram errors

