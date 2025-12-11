# Phase 1 Deployment Checklist

## Pre-Deployment

### Environment Setup
- [ ] Node.js 20+ installed locally (for testing)
- [ ] All dependencies installed (`npm install`)
- [ ] Project builds successfully (`npm run build`)
- [ ] Verification script passes (`npm run verify`)

### Configuration
- [ ] `.env` file created from `.env.example`
- [ ] `MAIN_WALLET_PRIVATE_KEY` configured (starts with `suiprivkey1`)
- [ ] `SKIM_WALLET_ADDRESS` configured (valid Sui address)
- [ ] `TELEGRAM_BOT_TOKEN` obtained from @BotFather
- [ ] `TELEGRAM_CHAT_ID` obtained (use @userinfobot)
- [ ] `SUI_RPC_URL` configured (default or paid provider)
- [ ] Pool addresses configured:
  - [ ] `POOL_SUI_USDC` (Cetus mainnet address)
  - [ ] `POOL_DEEP_SUI` (Cetus mainnet address)
  - [ ] `POOL_WAL_SUI` (Cetus mainnet address)

### Wallet Verification
- [ ] Wallet has sufficient SUI balance (2+ SUI recommended)
- [ ] Wallet private key format verified
- [ ] Wallet address matches expected format

### Telegram Bot Setup
- [ ] Bot created via @BotFather
- [ ] Bot token copied correctly
- [ ] Chat ID obtained correctly
- [ ] Bot started with `/start` command
- [ ] Bot responds to `/help` command

### Pool Addresses
- [ ] SUI/USDC pool address verified on Cetus DEX
- [ ] DEEP/SUI pool address verified on Cetus DEX
- [ ] WAL/SUI pool address verified on Cetus DEX
- [ ] All addresses are mainnet addresses (not testnet)

## Deployment

### Railway Deployment
- [ ] Railway account created
- [ ] New project created
- [ ] GitHub repository connected
- [ ] All environment variables added to Railway
- [ ] Deployment triggered
- [ ] Build completed successfully
- [ ] Application started successfully

### Alternative: Docker Deployment
- [ ] Docker image built (`docker build -t cetus-optimizer .`)
- [ ] Container runs successfully
- [ ] Environment variables passed correctly
- [ ] Data directory mounted (if needed)
- [ ] Container restarts on failure

### Alternative: VPS Deployment
- [ ] Server prepared (Node.js 20+, PM2 installed)
- [ ] Code cloned to server
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] PM2 process started
- [ ] PM2 auto-start configured

## Post-Deployment Verification

### Application Health
- [ ] Application logs show "Cetus Optimizer initialized successfully"
- [ ] Wallet initialized message appears
- [ ] Monitoring started message appears
- [ ] No critical errors in logs
- [ ] Database file created (`data/optimizer.db`)

### Telegram Bot
- [ ] Bot responds to `/status` command
- [ ] Bot responds to `/help` command
- [ ] Bot shows pool status correctly
- [ ] No Telegram API errors in logs

### Price Monitoring
- [ ] First price check completed (within 10 seconds)
- [ ] Price snapshots recorded in database
- [ ] No RPC errors in logs
- [ ] Price fetching works for all enabled pools

### Database
- [ ] Database file exists
- [ ] Database file is writable
- [ ] Tables created successfully
- [ ] Price snapshots being recorded

## Monitoring (First 24 Hours)

### Hour 1
- [ ] Application running without errors
- [ ] Price checks happening every 10 seconds
- [ ] Telegram bot responsive
- [ ] Database growing with snapshots

### Hour 6
- [ ] No unexpected errors
- [ ] RPC rate limits not hit (if using public RPC)
- [ ] Wallet balance sufficient
- [ ] All pools monitoring correctly

### Hour 24
- [ ] Application stable
- [ ] No memory leaks
- [ ] Database size reasonable
- [ ] Ready for Phase 2 features

## Rollback Plan

If critical issues occur:
- [ ] Know how to pause pools (`/pause all`)
- [ ] Know how to stop application
- [ ] Have backup of environment variables
- [ ] Know how to access positions manually via Cetus DEX
- [ ] Have emergency withdraw procedure documented

## Success Criteria

Phase 1 is successful when:
- ✅ Application runs continuously for 24+ hours
- ✅ Price monitoring works for all pools
- ✅ Telegram bot responds to commands
- ✅ Database logs all activity
- ✅ No critical errors occur
- ✅ Ready to add Phase 2 features (skimming, multi-pool)

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Environment**: Production / Testnet
**Notes**: _______________

