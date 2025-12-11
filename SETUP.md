# Setup Guide

## Installation Steps

1. **Install Dependencies**
```bash
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Build Project**
```bash
npm run build
```

4. **Run**
```bash
npm start
```

## SDK Version Notes

### @mysten/sui SDK
The code uses `Transaction` from `@mysten/sui/transactions`. Depending on your SDK version, you may need to use `TransactionBlock` instead:

- **v1.0.0+**: Use `Transaction`
- **v0.x**: Use `TransactionBlock`

If you encounter import errors, check your `@mysten/sui` version:
```bash
npm list @mysten/sui
```

To update to the latest version:
```bash
npm install @mysten/sui@latest
```

### @cetusprotocol/cetus-sui-clmm-sdk
Ensure you're using a compatible version. Check the Cetus documentation for the latest SDK version.

## Common Setup Issues

### Missing Type Declarations
If you see TypeScript errors about missing type declarations, ensure all dependencies are installed:
```bash
npm install
```

### RPC Connection Issues
If you encounter RPC rate limiting:
1. Start with the public RPC (default)
2. Upgrade to a paid provider (Shinami, Triton) if needed
3. Update `SUI_RPC_URL` in `.env`

### Wallet Initialization
Ensure your `MAIN_WALLET_PRIVATE_KEY` is in the correct format:
- Starts with `suiprivkey1`
- Full private key string (not just the seed phrase)

### Telegram Bot Setup
1. Create a bot via @BotFather on Telegram
2. Get your bot token
3. Get your chat ID (use @userinfobot)
4. Add both to `.env`

## Next Steps

After setup:
1. Verify configuration in `.env`
2. Test with a small amount first
3. Monitor Telegram alerts
4. Check logs in `data/optimizer.db`

