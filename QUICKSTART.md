# Quick Start - Phase 1 Deployment

## 🚀 Railway Deployment (5 minutes)

### Step 1: Prepare Environment Variables

Create a `.env` file or prepare these values:

```bash
MAIN_WALLET_PRIVATE_KEY=suiprivkey1...
SKIM_WALLET_ADDRESS=0x...
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=123456789
SUI_RPC_URL=https://fullnode.mainnet.sui.io
SUI_NETWORK=mainnet
POOL_SUI_USDC=0x...
POOL_DEEP_SUI=0x...
POOL_WAL_SUI=0x...
```

### Step 2: Verify Configuration

```bash
npm install
npm run verify
```

### Step 3: Deploy to Railway

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Go to Variables tab → Add all environment variables
5. Railway will auto-deploy

### Step 4: Verify Deployment

1. Check Railway logs for "Cetus Optimizer initialized successfully"
2. Send `/status` to your Telegram bot
3. Monitor for first price check cycle

## ✅ Success Indicators

- ✅ Bot responds to `/status` command
- ✅ Logs show "Monitoring started"
- ✅ Database file created in `data/optimizer.db`
- ✅ No errors in Railway logs

## 🆘 Troubleshooting

**Bot not responding?**
- Check `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
- Send `/start` to bot first

**Wallet errors?**
- Verify `MAIN_WALLET_PRIVATE_KEY` format
- Ensure wallet has SUI balance

**Build fails?**
- Check Node.js version (needs 20+)
- Verify all dependencies install

## 📚 Full Documentation

- `DEPLOY.md` - Complete deployment guide
- `SETUP.md` - Setup instructions
- `README.md` - Full documentation

---

**Ready to deploy!** 🎉

