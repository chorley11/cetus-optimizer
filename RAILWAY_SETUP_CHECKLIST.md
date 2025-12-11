# Railway Setup Checklist

## ✅ Step-by-Step Setup

### 1. Add Environment Variables in Railway

Go to: **Railway Dashboard → Your Project → Your Service → Variables Tab**

Add these **9 required variables**:

| Variable Name | Value |
|--------------|-------|
| `MAIN_WALLET_PRIVATE_KEY` | `suiprivkey1...your_private_key_here...` |
| `SKIM_WALLET_ADDRESS` | `0x...your_skim_wallet_address...` |
| `TELEGRAM_BOT_TOKEN` | `1234567890:ABC...your_bot_token_from_BotFather...` |
| `TELEGRAM_CHAT_ID` | `1234567890` |
| `SUI_RPC_URL` | `https://fullnode.mainnet.sui.io` |
| `SUI_NETWORK` | `mainnet` |
| `POOL_SUI_USDC` | `0x...your_sui_usdc_pool_address...` |
| `POOL_DEEP_SUI` | `0x...your_deep_sui_pool_address...` |
| `POOL_WAL_SUI` | `0x...your_wal_sui_pool_address...` |

### 2. Verify Variables Are Set

After adding variables:
- Click **Save** or **Deploy**
- Railway will automatically redeploy
- Check the **Logs** tab

### 3. Check Logs for Success

Look for these messages:
```
✅ Wallet initialized
✅ Cetus Optimizer initialized successfully
✅ Monitoring started
```

### 4. Test Telegram Bot

1. Open Telegram
2. Message `@cetusliqbot`
3. Send `/start`
4. Send `/status`
5. Should get a response with pool status

## ❌ Common Issues

### "MAIN_WALLET_PRIVATE_KEY not set"

**Problem:** Variable not added or not saved in Railway

**Solution:**
1. Go to Variables tab in Railway
2. Check if `MAIN_WALLET_PRIVATE_KEY` exists
3. If not, add it with the exact value above
4. Click **Save**
5. Wait for redeploy

### Variables Not Appearing

**Problem:** Railway cache or deployment issue

**Solution:**
1. Double-check variable names (case-sensitive!)
2. Make sure no extra spaces
3. Click **Redeploy** manually
4. Check logs after redeploy

### Bot Not Responding

**Problem:** Bot polling not enabled or variables wrong

**Solution:**
1. Verify `TELEGRAM_BOT_TOKEN` is correct
2. Verify `TELEGRAM_CHAT_ID` is correct
3. Send `/start` to bot first
4. Check Railway logs for Telegram errors

## 🔍 Verify Setup

Run locally to test:
```bash
npm run check-env
```

This will show which variables are set and which are missing.

## 📝 Quick Copy-Paste for Railway

If Railway supports bulk import, paste this:

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

## ✅ Success Indicators

After setup, you should see in logs:
- No "not set" errors
- "Wallet initialized" message
- "Monitoring started" message
- Price checks happening every 10 seconds
- Telegram bot responding to commands

