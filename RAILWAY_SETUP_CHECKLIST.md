# Railway Setup Checklist

## ✅ Step-by-Step Setup

### 1. Add Environment Variables in Railway

Go to: **Railway Dashboard → Your Project → Your Service → Variables Tab**

Add these **9 required variables**:

| Variable Name | Value |
|--------------|-------|
| `MAIN_WALLET_PRIVATE_KEY` | `suiprivkey1qph7qn7654k76hh3mdcg77wkefhaefzqwjt2fmzm7gemz3asw5dykdkvrpx` |
| `SKIM_WALLET_ADDRESS` | `0x18197fc88dcbce6c5bd18ceb5d782ba0eb8a17f43f26616841a9166c9802ca44` |
| `TELEGRAM_BOT_TOKEN` | `8419537848:AAFVnlMygHSdnawnraldZjdo9i1ROpITbO0` |
| `TELEGRAM_CHAT_ID` | `1293829515` |
| `SUI_RPC_URL` | `https://fullnode.mainnet.sui.io` |
| `SUI_NETWORK` | `mainnet` |
| `POOL_SUI_USDC` | `0x5cf7e2ec9311d9057e43477a29bd457c51beeb1ddcd151c385a295dbb3c0fb18` |
| `POOL_DEEP_SUI` | `0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab` |
| `POOL_WAL_SUI` | `0xe01243f37f712ef87e556afb9b1d03d0fae13f96d324ec912daffc339dfdcbd2` |

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

## ✅ Success Indicators

After setup, you should see in logs:
- No "not set" errors
- "Wallet initialized" message
- "Monitoring started" message
- Price checks happening every 10 seconds
- Telegram bot responding to commands

