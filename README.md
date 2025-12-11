# Cetus Liquidity Optimizer

Automated liquidity management system for Cetus DEX on Sui blockchain that maximizes APY through tight concentrated liquidity bands (±2%), with profit skimming to accumulate USDC/SUI for subsequent Bluefin lending deployment.

[![CI/CD Pipeline](https://github.com/chorley11/cetus-optimizer/actions/workflows/ci.yml/badge.svg)](https://github.com/chorley11/cetus-optimizer/actions)
[![Deployment Status](https://img.shields.io/badge/deployment-ready-green)](https://railway.app)

## Features

- **Tight Band Management**: ±2% concentrated liquidity ranges (vs ±5-20% for Kriya vaults)
- **Aggressive Rebalancing**: Trigger at 80% distance to range edge
- **Directional Positioning**: Asymmetric ranges to accumulate USDC on price rises
- **Profit Skimming**: Extract 10% of USDC/SUI gains to separate accumulation wallet
- **Bluefin Pipeline**: Accumulate skims until threshold, alert for manual Bluefin deposit
- **Real-time Monitoring**: 10-second price checks, Telegram alerts for all events
- **Multi-Pool Support**: Manage SUI/USDC, DEEP/SUI, and WAL/SUI pools simultaneously

## Target Performance

- **Initial Deployment**: $3,000 across 3 pools ($1,000 each)
- **Target APY**: 200-400% net after IL and costs
- **Competitive Edge**: Tighter bands than Kriya vaults, directional profit capture

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/chorley11/cetus-optimizer.git
cd cetus-optimizer
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Verify Configuration
```bash
npm run verify
```

### 5. Build and Run
```bash
npm run build
npm start
```

## Deployment

### Railway (Recommended)
See [DEPLOY.md](DEPLOY.md) for detailed instructions.

1. Connect GitHub repository to Railway
2. Add environment variables
3. Railway auto-deploys on push

### Docker
```bash
docker build -t cetus-optimizer .
docker run -d --env-file .env cetus-optimizer
```

### VPS
```bash
npm install
npm run build
pm2 start dist/index.js --name cetus-optimizer
```

## Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute quick start guide
- **[DEPLOY.md](DEPLOY.md)** - Complete deployment instructions
- **[SETUP.md](SETUP.md)** - Setup and troubleshooting
- **[GITHUB_SETUP.md](GITHUB_SETUP.md)** - GitHub repository setup
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Pre/post deployment checklist

## GitHub Actions

This repository includes GitHub Actions workflows for:

- ✅ **CI/CD Pipeline** - Automatic build verification on every push
- ✅ **Auto Updates** - Change detection and dependency checks
- ✅ **Railway Deployment** - Optional auto-deployment to Railway

See [GITHUB_SETUP.md](GITHUB_SETUP.md) for setup instructions.

## Project Structure

```
cetus-optimizer/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config/                   # Configuration
│   ├── core/                     # Core engine components
│   ├── services/                # External service wrappers
│   ├── utils/                   # Utility functions
│   └── types/                   # TypeScript interfaces
├── .github/
│   └── workflows/               # GitHub Actions workflows
├── scripts/                     # Utility scripts
├── data/                        # SQLite database (created on run)
└── logs/                        # Application logs
```

## Environment Variables

See `.env.example` for all required variables:

- `MAIN_WALLET_PRIVATE_KEY` - Sui wallet private key
- `SKIM_WALLET_ADDRESS` - Address for profit accumulation
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `TELEGRAM_CHAT_ID` - Telegram chat ID
- `SUI_RPC_URL` - Sui RPC endpoint
- Pool addresses (POOL_SUI_USDC, POOL_DEEP_SUI, POOL_WAL_SUI)

## Telegram Commands

- `/status` - Current status of all pools
- `/pools` - Detailed pool metrics
- `/skim` - Skim wallet balances
- `/pnl` - Profit/loss summary
- `/pause [POOL]` - Pause specific pool
- `/resume [POOL]` - Resume specific pool
- `/help` - List all commands

## Development

### Prerequisites
- Node.js 20+
- TypeScript 5.0+
- Sui wallet with private key
- Telegram bot token

### Scripts
```bash
npm run build      # Build TypeScript
npm start          # Run production build
npm run dev        # Run in development mode
npm run verify     # Verify deployment configuration
npm run db:init    # Initialize database
```

## Status

- ✅ **Phase 1 (MVP)**: Complete and ready for deployment
- ⏳ **Phase 2**: Multi-pool + skimming (in progress)
- ⏳ **Phase 3**: Polish + reporting (planned)
- ⏳ **Phase 4**: Future enhancements (planned)

## License

MIT

## Author

Ben Putley

## Support

For issues and questions:
- Check [SETUP.md](SETUP.md) for common issues
- Review logs in `data/optimizer.db`
- Check Telegram alerts
- Open an issue on GitHub

---

**Ready for Phase 1 deployment!** 🚀
