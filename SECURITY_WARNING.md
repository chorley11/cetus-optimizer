# ⚠️ SECURITY WARNING

## Wallet Keys Were Exposed in GitHub

**Date:** December 11, 2025

### What Happened

Your wallet private keys and Telegram bot tokens were accidentally committed to the GitHub repository in documentation files:
- `RAILWAY_ENV_VALUES.md`
- `RAILWAY_ENV_SETUP.md`
- `RAILWAY_SETUP_CHECKLIST.md`

### Immediate Actions Required

#### 1. Rotate Your Wallet Private Key ⚠️ CRITICAL

**Your exposed private key has been compromised.** Anyone with access to the GitHub repository could have seen it.

**Steps:**
1. **Create a new wallet immediately**
   ```bash
   # Generate new Sui keypair
   sui client new-address ed25519
   ```

2. **Transfer all funds** from the old wallet to the new wallet
   - Move all SUI
   - Move all tokens
   - Move all positions (if possible)

3. **Update environment variables**
   - Update `MAIN_WALLET_PRIVATE_KEY` in Railway
   - Update `.env` file locally
   - Never commit the new key to GitHub

4. **Abandon the old wallet**
   - Do not use it anymore
   - Consider it compromised

#### 2. Rotate Telegram Bot Token

**Your Telegram bot token was also exposed.**

**Steps:**
1. Go to [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/revoke` command
3. Select your bot (`@cetusliqbot`)
4. Get the new token
5. Update `TELEGRAM_BOT_TOKEN` in Railway
6. Update `.env` file locally

#### 3. Check for Unauthorized Activity

**Monitor your accounts:**
- Check Sui wallet transactions
- Check Telegram bot activity
- Review Railway deployment logs
- Check for any unauthorized access

### What Was Fixed

✅ Removed all actual keys from documentation files
✅ Replaced with placeholders
✅ Updated `.gitignore` to exclude `.env` files
✅ Committed fix to GitHub

### Prevention

**Going Forward:**
- ✅ Never commit `.env` files
- ✅ Never put real keys in documentation
- ✅ Use placeholders in examples
- ✅ Use environment variables only
- ✅ Use Railway secrets (not code)

### Files That Were Fixed

- `RAILWAY_ENV_VALUES.md` - Keys removed
- `RAILWAY_ENV_SETUP.md` - Keys removed  
- `RAILWAY_SETUP_CHECKLIST.md` - Keys removed

### Git History

**Note:** The exposed keys are still in Git history. If you're concerned:
1. Consider using `git filter-branch` or BFG Repo-Cleaner to remove from history
2. Or create a new repository (less secure, but simpler)

**However:** Since the keys are already exposed, rotating them is more important than cleaning history.

### Current Status

- ✅ Documentation files fixed
- ⚠️ **YOU MUST ROTATE YOUR KEYS IMMEDIATELY**
- ⚠️ **DO NOT USE THE OLD WALLET**

### Questions?

If you need help rotating keys or have security concerns, please:
1. Rotate keys immediately (don't wait)
2. Check for unauthorized transactions
3. Update all environment variables

---

**Remember:** Security is critical. Always treat exposed keys as compromised and rotate immediately.

