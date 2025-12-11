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
MAIN_WALLET_PRIVATE_KEY=suiprivkey1qph7qn7654k76hh3mdcg77wkefhaefzqwjt2fmzm7gemz3asw5dykdkvrpx
SKIM_WALLET_ADDRESS=0x18197fc88dcbce6c5bd18ceb5d782ba0eb8a17f43f26616841a9166c9802ca44
```

#### Telegram Configuration
```
TELEGRAM_BOT_TOKEN=8419537848:AAFVnlMygHSdnawnraldZjdo9i1ROpITbO0
TELEGRAM_CHAT_ID=1293829515
```

#### Sui Network
```
SUI_RPC_URL=https://fullnode.mainnet.sui.io
SUI_NETWORK=mainnet
```

#### Pool Addresses
```
POOL_SUI_USDC=0x5cf7e2ec9311d9057e43477a29bd457c51beeb1ddcd151c385a295dbb3c0fb18
POOL_DEEP_SUI=0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab
POOL_WAL_SUI=0xe01243f37f712ef87e556afb9b1d03d0fae13f96d324ec912daffc339dfdcbd2
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
MAIN_WALLET_PRIVATE_KEY=suiprivkey1qph7qn7654k76hh3mdcg77wkefhaefzqwjt2fmzm7gemz3asw5dykdkvrpx
SKIM_WALLET_ADDRESS=0x18197fc88dcbce6c5bd18ceb5d782ba0eb8a17f43f26616841a9166c9802ca44
TELEGRAM_BOT_TOKEN=8419537848:AAFVnlMygHSdnawnraldZjdo9i1ROpITbO0
TELEGRAM_CHAT_ID=1293829515
SUI_RPC_URL=https://fullnode.mainnet.sui.io
SUI_NETWORK=mainnet
POOL_SUI_USDC=0x5cf7e2ec9311d9057e43477a29bd457c51beeb1ddcd151c385a295dbb3c0fb18
POOL_DEEP_SUI=0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab
POOL_WAL_SUI=0xe01243f37f712ef87e556afb9b1d03d0fae13f96d324ec912daffc339dfdcbd2
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

