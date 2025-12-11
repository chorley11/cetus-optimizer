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
MAIN_WALLET_PRIVATE_KEY=suiprivkey1...your_private_key_here...
```

```
SKIM_WALLET_ADDRESS=0x...your_skim_wallet_address...
```

### Telegram Configuration
```
TELEGRAM_BOT_TOKEN=1234567890:ABC...your_bot_token_from_BotFather...
```

```
TELEGRAM_CHAT_ID=1234567890
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
POOL_SUI_USDC=0x...your_sui_usdc_pool_address...
```

```
POOL_DEEP_SUI=0x...your_deep_sui_pool_address...
```

```
POOL_WAL_SUI=0x...your_wal_sui_pool_address...
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

