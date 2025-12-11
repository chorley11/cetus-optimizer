# Phase 1 Deployment Guide

## Quick Start - Railway Deployment

### Option 1: Railway (Recommended)

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up/login with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository (or fork this one)

3. **Configure Environment Variables**
   In Railway dashboard, go to Variables tab and add:

   ```bash
   # Required
   MAIN_WALLET_PRIVATE_KEY=suiprivkey1...
   SKIM_WALLET_ADDRESS=0x...
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
   TELEGRAM_CHAT_ID=123456789
   SUI_RPC_URL=https://fullnode.mainnet.sui.io
   SUI_NETWORK=mainnet
   
   # Pool Addresses (update with actual addresses)
   POOL_SUI_USDC=0x...
   POOL_DEEP_SUI=0x...
   POOL_WAL_SUI=0x...
   
   # Optional (defaults provided)
   PRICE_CHECK_INTERVAL_MS=10000
   REBALANCE_THRESHOLD_PCT=80
   SKIM_PERCENTAGE=10
   SKIM_WALLET_USDC_THRESHOLD=50
   SKIM_WALLET_SUI_THRESHOLD=20
   MAX_SLIPPAGE_BPS=50
   ```

4. **Deploy**
   - Railway will automatically detect Node.js
   - Build will run: `npm run build`
   - Start command: `npm start`
   - Deployment happens automatically on git push

5. **Monitor**
   - Check Railway logs for startup
   - Verify Telegram bot receives `/start` command
   - Send `/status` to verify bot is running

### Option 2: Docker Deployment

1. **Build Docker Image**
   ```bash
   docker build -t cetus-optimizer .
   ```

2. **Run Container**
   ```bash
   docker run -d \
     --name cetus-optimizer \
     --restart unless-stopped \
     -e MAIN_WALLET_PRIVATE_KEY="suiprivkey1..." \
     -e SKIM_WALLET_ADDRESS="0x..." \
     -e TELEGRAM_BOT_TOKEN="123456:ABC-DEF..." \
     -e TELEGRAM_CHAT_ID="123456789" \
     -e SUI_RPC_URL="https://fullnode.mainnet.sui.io" \
     -e POOL_SUI_USDC="0x..." \
     -e POOL_DEEP_SUI="0x..." \
     -e POOL_WAL_SUI="0x..." \
     -v $(pwd)/data:/app/data \
     -v $(pwd)/logs:/app/logs \
     cetus-optimizer
   ```

3. **View Logs**
   ```bash
   docker logs -f cetus-optimizer
   ```

### Option 3: VPS/Server Deployment

1. **Install Dependencies**
   ```bash
   # Install Node.js 20+
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   ```

2. **Clone and Setup**
   ```bash
   git clone <your-repo>
   cd cetus-optimizer
   npm install
   npm run build
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your values
   ```

4. **Run with PM2**
   ```bash
   pm2 start dist/index.js --name cetus-optimizer
   pm2 save
   pm2 startup  # Follow instructions to enable auto-start
   ```

5. **Monitor**
   ```bash
   pm2 logs cetus-optimizer
   pm2 status
   ```

## Pre-Deployment Checklist

### ✅ Environment Variables
- [ ] `MAIN_WALLET_PRIVATE_KEY` - Sui wallet private key
- [ ] `SKIM_WALLET_ADDRESS` - Address for profit accumulation
- [ ] `TELEGRAM_BOT_TOKEN` - Bot token from @BotFather
- [ ] `TELEGRAM_CHAT_ID` - Your Telegram chat ID
- [ ] `SUI_RPC_URL` - Sui RPC endpoint
- [ ] Pool addresses (POOL_SUI_USDC, POOL_DEEP_SUI, POOL_WAL_SUI)

### ✅ Telegram Bot Setup
1. Create bot via @BotFather on Telegram
2. Get bot token
3. Get your chat ID (use @userinfobot)
4. Send `/start` to your bot
5. Test with `/help` command

### ✅ Wallet Setup
1. Ensure wallet has sufficient SUI for gas (recommend 2+ SUI)
2. Verify private key format (starts with `suiprivkey1`)
3. Test wallet connection before deployment

### ✅ Pool Addresses
1. Get actual Cetus pool addresses from:
   - Cetus DEX interface
   - Sui Explorer
   - Cetus documentation
2. Update in environment variables

## Post-Deployment Verification

### 1. Check Logs
```bash
# Railway
railway logs

# Docker
docker logs cetus-optimizer

# PM2
pm2 logs cetus-optimizer
```

Look for:
- ✅ "Cetus Optimizer initialized successfully"
- ✅ "Wallet initialized" with address
- ✅ "Monitoring started"
- ✅ No error messages

### 2. Test Telegram Bot
Send commands to your bot:
- `/status` - Should return pool status
- `/help` - Should show command list
- `/skim` - Should show skim wallet status

### 3. Verify Database
Check that database file is created:
```bash
# Should exist after first run
ls -la data/optimizer.db
```

### 4. Monitor First Cycle
- Wait for first price check (10 seconds)
- Check logs for price fetching
- Verify no errors in monitoring loop

## Troubleshooting

### Bot Not Responding
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check `TELEGRAM_CHAT_ID` is your chat ID
- Ensure bot is started with `/start` command
- Check Railway logs for Telegram errors

### Wallet Errors
- Verify `MAIN_WALLET_PRIVATE_KEY` format
- Check wallet has SUI balance
- Verify RPC endpoint is accessible
- Check network (mainnet vs testnet)

### Database Errors
- Ensure `data/` directory is writable
- Check disk space
- Verify file permissions

### RPC Rate Limiting
- Upgrade to paid RPC provider (Shinami, Triton)
- Increase `PRICE_CHECK_INTERVAL_MS` temporarily
- Check RPC endpoint status

### Build Failures
- Ensure Node.js 20+ is installed
- Check TypeScript compilation errors
- Verify all dependencies installed

## Monitoring & Alerts

### Railway Monitoring
- View logs in Railway dashboard
- Set up alerts for deployment failures
- Monitor resource usage

### Telegram Alerts
The bot will send:
- Rebalance notifications
- Error alerts
- Daily summaries (when implemented)
- Bluefin deposit alerts

### Health Checks
- Database file existence
- Last price update timestamp
- Active position status
- Wallet balance

## Rollback Plan

If issues occur:

1. **Pause All Pools**
   - Send `/pause all` via Telegram
   - Or stop the service

2. **Check Positions**
   - Query database for active positions
   - Verify positions on Cetus DEX

3. **Emergency Withdraw**
   - Use `/withdraw [POOL]` command
   - Or manually withdraw via Cetus interface

4. **Fix and Redeploy**
   - Fix issues in code
   - Test locally
   - Redeploy

## Support

For deployment issues:
1. Check logs first
2. Review SETUP.md for common issues
3. Verify environment variables
4. Test Telegram bot connection
5. Check wallet balance and RPC connectivity

---

**Phase 1 Deployment Status**: Ready for production deployment

