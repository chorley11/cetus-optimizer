# Railway Environment Variables Setup

## Required Environment Variables

Add these to your Railway project:

### 1. Go to Railway Dashboard
- Open your project: https://railway.app/project/[your-project-id]
- Click on your service
- Go to **Variables** tab

### 2. Add Required Variables

Copy and paste these variables one by one:

#### Wallet Configuration
```
MAIN_WALLET_PRIVATE_KEY=suiprivkey1...your_private_key_here...
SKIM_WALLET_ADDRESS=0x...your_skim_wallet_address...
```

#### Telegram Configuration
```
TELEGRAM_BOT_TOKEN=1234567890:ABC...your_bot_token_from_BotFather...
TELEGRAM_CHAT_ID=1234567890
```

#### Sui Network
```
SUI_RPC_URL=https://fullnode.mainnet.sui.io
SUI_NETWORK=mainnet
```

#### Pool Addresses
```
POOL_SUI_USDC=0x...your_sui_usdc_pool_address...
POOL_DEEP_SUI=0x...your_deep_sui_pool_address...
POOL_WAL_SUI=0x...your_wal_sui_pool_address...
```

#### Optional (with defaults)
```
PRICE_CHECK_INTERVAL_MS=10000
REBALANCE_THRESHOLD_PCT=80
SKIM_PERCENTAGE=10
SKIM_WALLET_USDC_THRESHOLD=50
SKIM_WALLET_SUI_THRESHOLD=20
MAX_SLIPPAGE_BPS=50
```

### 3. Save and Redeploy

After adding all variables:
- Click **Save** or **Deploy**
- Railway will automatically redeploy with new environment variables
- Check logs to verify the application starts successfully

## Quick Copy-Paste (All at Once)

If Railway supports bulk import, you can add all variables:

```
MAIN_WALLET_PRIVATE_KEY=suiprivkey1...your_private_key_here...
SKIM_WALLET_ADDRESS=0x...your_skim_wallet_address...
TELEGRAM_BOT_TOKEN=1234567890:ABC...your_bot_token_from_BotFather...
TELEGRAM_CHAT_ID=1234567890
SUI_RPC_URL=https://fullnode.mainnet.sui.io
SUI_NETWORK=mainnet
POOL_SUI_USDC=0x...your_sui_usdc_pool_address...
POOL_DEEP_SUI=0x...your_deep_sui_pool_address...
POOL_WAL_SUI=0x...your_wal_sui_pool_address...
```

## Verification

After adding variables, check the logs:
- Should see: "Wallet initialized"
- Should see: "Cetus Optimizer initialized successfully"
- Should see: "Monitoring started"

If you see errors, check:
1. All required variables are set
2. No typos in variable names
3. Values are correct (no extra spaces)

