# Updating Your Wallet Address

## Current Situation

You've changed your wallet address to:
```
0x035534424fb1ed864202a32d9e8d3ec180176b546872286e8323564af6d7a690
```

However, your `MAIN_WALLET_PRIVATE_KEY` environment variable still corresponds to the old wallet address.

## Steps to Update

### 1. Get the Private Key for the New Wallet

You need the **private key** (not the address) that corresponds to:
```
0x035534424fb1ed864202a32d9e8d3ec180176b546872286e8323564af6d7a690
```

**Private key format:**
- Starts with: `suiprivkey1`
- 64+ characters long
- Example: `suiprivkey1qph7qn7654k76hh3mdcg77wkefhaefzqwjt2fmzm7gemz3asw5dykdkvrpx`

### 2. Update Local Environment (.env file)

Edit your `.env` file:
```bash
MAIN_WALLET_PRIVATE_KEY=suiprivkey1...your_new_private_key_here...
```

**Important:** Replace with the actual private key for the new wallet address.

### 3. Update Railway Environment Variables

1. Go to Railway Dashboard: https://railway.app
2. Click on your project → Your service
3. Go to **Variables** tab
4. Find `MAIN_WALLET_PRIVATE_KEY`
5. Click **Edit**
6. Replace with the new private key
7. Click **Save**
8. Railway will automatically redeploy

### 4. Verify the Update

Run the diagnostic:
```bash
npm run diagnose
```

Or check wallet address:
```bash
ts-node scripts/check-wallet-address.ts
```

You should see:
```
✅ Address matches expected address!
```

### 5. Add SUI to New Wallet

**Before the optimizer can work, you need SUI in the new wallet:**

1. **Transfer SUI** to: `0x035534424fb1ed864202a32d9e8d3ec180176b546872286e8323564af6d7a690`
2. **Minimum:** 0.1 SUI (for basic operations)
3. **Recommended:** 1-5 SUI (for reliable operations)

### 6. Verify Balance

Check the new wallet balance:
```bash
ts-node scripts/verify-new-wallet.ts
```

Or use Sui Explorer:
https://suiexplorer.com/address/0x035534424fb1ed864202a32d9e8d3ec180176b546872286e8323564af6d7a690

## Common Issues

### "Address does NOT match"

**Problem:** Private key doesn't match the expected address.

**Solution:**
- Make sure you're using the private key for `0x035534424fb1ed864202a32d9e8d3ec180176b546872286e8323564af6d7a690`
- Double-check the private key format (starts with `suiprivkey1`)
- Verify you copied the entire key (no missing characters)

### "Low balance"

**Problem:** New wallet doesn't have enough SUI.

**Solution:**
- Transfer SUI to the new wallet address
- Minimum 0.1 SUI, recommended 1-5 SUI

### "Still using old wallet"

**Problem:** Environment variable not updated.

**Solution:**
- Check `.env` file locally
- Check Railway Variables tab
- Restart the optimizer after updating

## Quick Checklist

- [ ] Have private key for new wallet address
- [ ] Updated `MAIN_WALLET_PRIVATE_KEY` in `.env` file
- [ ] Updated `MAIN_WALLET_PRIVATE_KEY` in Railway
- [ ] Added SUI to new wallet (1-5 SUI recommended)
- [ ] Verified address matches: `npm run diagnose`
- [ ] Restarted optimizer

## After Update

Once everything is updated:

1. **Run diagnostics:**
   ```bash
   npm run diagnose
   ```

2. **Start optimizer:**
   ```bash
   npm start
   ```

3. **Check logs** for:
   - ✅ "Wallet initialized"
   - ✅ "Cetus Optimizer initialized successfully"
   - ✅ Pool connections working

## Need Help?

If you're having issues:
1. Run `npm run diagnose` and share the output
2. Check Railway logs for errors
3. Verify private key format is correct
4. Confirm wallet has sufficient balance

