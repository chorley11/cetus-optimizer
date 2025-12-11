# Telegram Bot Commands

## Overview

The Cetus Optimizer Telegram bot (`@cetusliqbot`) provides real-time monitoring and control of your liquidity positions. All commands are case-insensitive and can be used anytime.

## Available Commands

### 📊 Status & Monitoring

#### `/start`
**Description:** Initialize the bot and get welcome message

**Usage:**
```
/start
```

**Response:**
```
🤖 Cetus Optimizer is running!

Use /help to see all commands.
```

---

#### `/status`
**Description:** Get quick overview of all pools and their current status

**Usage:**
```
/status
```

**Response:**
```
🤖 CETUS OPTIMIZER STATUS

Uptime: 2h 15m
Health: ✅ Healthy

┌─────────┬────────┬────────┬────────┐
│ Pool    │ Status │ Range% │ 24h    │
├─────────┼────────┼────────┼────────┤
│ 0x5cf7... │ ✅ IN │   45% │        │
│ 0x51e8... │ ⚠️ OUT │  N/A │        │
└─────────┴────────┴────────┴────────┘

Reply /pools for detailed view
```

**Shows:**
- System uptime
- Health status
- Pool status (In Range / Out of Range)
- Distance to range bounds

---

#### `/pools`
**Description:** Detailed metrics for all pools

**Usage:**
```
/pools
```

**Response:**
```
📊 DETAILED POOL METRICS

SUI/USDC
Price: $1.5234
In Range: ✅
Position: 0x1234567890abcdef...
Range: $2.2851 - $3.8085
Value: $1000.00
Rebalances Today: 2
Fees Today: $12.45

DEEP/SUI
Price: $0.0234
In Range: ❌
Position: None
Rebalances Today: 0
Fees Today: $0.00
```

**Shows:**
- Current price for each pool
- Whether position is in range
- Position ID and range
- Position value
- Rebalances and fees today

---

### 💰 Financial Information

#### `/skim`
**Description:** Check skim wallet balances and Bluefin deposit status

**Usage:**
```
/skim
```

**Response:**
```
💰 SKIM WALLET STATUS

USDC: $45.23 / $50.00
SUI: 18.5 / $20.00

⏳ Accumulating...
```

**Shows:**
- Current USDC balance vs threshold
- Current SUI balance vs threshold
- Whether ready for Bluefin deposit

---

#### `/pnl`
**Description:** View profit and loss summary (Coming Soon)

**Usage:**
```
/pnl
```

**Status:** ⚠️ Not yet implemented

**Planned Features:**
- Total P&L across all pools
- Daily/weekly/monthly breakdown
- Fees collected vs gas costs
- Net profit/loss

---

### ⚙️ Pool Management

#### `/pause [POOL_NAME]`
**Description:** Pause monitoring and rebalancing for a specific pool

**Usage:**
```
/pause SUI/USDC
/pause DEEP/SUI
```

**Status:** ⚠️ Not yet implemented

**Planned Behavior:**
- Stops price monitoring for specified pool
- Prevents automatic rebalancing
- Position remains active but not managed

---

#### `/resume [POOL_NAME]`
**Description:** Resume monitoring and rebalancing for a paused pool

**Usage:**
```
/resume SUI/USDC
```

**Status:** ⚠️ Not yet implemented

**Planned Behavior:**
- Re-enables price monitoring
- Resumes automatic rebalancing
- Continues managing existing position

---

#### `/rebalance [POOL_NAME]`
**Description:** Force manual rebalance for a specific pool

**Usage:**
```
/rebalance SUI/USDC
```

**Status:** ⚠️ Not yet implemented

**Planned Behavior:**
- Immediately closes current position
- Collects fees
- Opens new position with updated range
- Useful for manual intervention

---

### 🚨 Emergency Actions

#### `/withdraw [POOL_NAME]`
**Description:** Emergency withdraw - close position and withdraw all funds

**Usage:**
```
/withdraw SUI/USDC
```

**Status:** ⚠️ Not yet implemented

**Warning:** ⚠️ This is an emergency action that will:
- Close the position immediately
- Collect all fees
- Withdraw all funds to wallet
- Stop monitoring for this pool

**Use Cases:**
- Emergency situations
- Need immediate liquidity
- Pool issues or concerns

---

### 📝 Bluefin Integration

#### `/deposited`
**Description:** Confirm that you've deposited skim wallet funds to Bluefin

**Usage:**
```
/deposited
```

**Response:**
```
✅ Deposit confirmed. Tracking reset.
```

**Behavior:**
- Marks Bluefin deposit as completed
- Resets skim wallet tracking
- Starts accumulating again from zero

**When to Use:**
- After depositing to Bluefin Lending
- To reset accumulation counters
- To acknowledge deposit completion

---

### ❓ Help

#### `/help`
**Description:** Show all available commands and their descriptions

**Usage:**
```
/help
```

**Response:**
```
*CETUS OPTIMIZER COMMANDS*

/status - Current status of all pools
/pools - Detailed pool metrics
/skim - Skim wallet balances
/pnl - Profit/loss summary
/pause [POOL] - Pause specific pool
/resume [POOL] - Resume specific pool
/rebalance [POOL] - Force manual rebalance
/withdraw [POOL] - Emergency withdraw
/deposited - Confirm Bluefin deposit
/help - Show this help
```

---

## Command Examples

### Daily Check Routine
```
/status          # Quick overview
/pools           # Detailed metrics
/skim            # Check accumulation
```

### After Rebalance Alert
```
/pools           # See new position details
/status          # Verify all pools healthy
```

### Before Bluefin Deposit
```
/skim            # Check balances
# Deposit to Bluefin...
/deposited       # Confirm deposit
```

## Automatic Notifications

The bot also sends automatic alerts:

### 🔄 Rebalance Alerts
Sent when a position is rebalanced:
```
🔄 REBALANCE EXECUTED

Pool: SUI/USDC
Trigger: Price reached 80% of upper bound
Direction: Upward (bullish move)

Old Range: $2.00 - $3.00
New Range: $2.25 - $3.75
Current Price: $2.40

Fees Collected: $12.45
Skim Amount: $1.25 USDC, 0.5 SUI
Gas Used: 0.001 SUI

TX: https://suiscan.xyz/mainnet/tx/0x...
```

### 🏦 Bluefin Deposit Ready
Sent when skim wallet reaches thresholds:
```
🏦 BLUEFIN DEPOSIT READY

Current Balances:
- USDC: $50.00 ✅ (threshold: $50)
- SUI: 20.0 SUI ✅ (threshold: 20)

Recommended Action:
Deposit to Bluefin Lending

Current Bluefin APY:
- USDC Lending: ~25% APR
- SUI Lending: ~12% APR
```

### 🚨 Error Alerts
Sent when errors occur:
```
🚨 ERROR ALERT

Type: Initial Position Failed
Pool: SUI/USDC
Time: 2025-12-11T16:00:00Z

Error: Insufficient balance

Action Required:
- Check system status
- Review logs for details
```

## Bot Setup

### Prerequisites
1. Bot token set in `TELEGRAM_BOT_TOKEN`
2. Chat ID set in `TELEGRAM_CHAT_ID`
3. Bot added to your Telegram contacts

### Finding Your Chat ID
1. Message `@userinfobot` on Telegram
2. It will reply with your chat ID
3. Use that ID in `TELEGRAM_CHAT_ID`

### Bot Username
Your bot username: `@cetusliqbot`

## Troubleshooting

### Bot Not Responding
1. Check if optimizer is running
2. Verify `TELEGRAM_BOT_TOKEN` is correct
3. Verify `TELEGRAM_CHAT_ID` matches your chat
4. Send `/start` first to initialize

### Commands Not Working
1. Make sure you're messaging the correct bot (`@cetusliqbot`)
2. Check command spelling (case-insensitive)
3. For pool-specific commands, use exact pool name (e.g., "SUI/USDC")

### Not Receiving Alerts
1. Check if alerts are enabled in config
2. Verify bot is running and connected
3. Check Railway logs for Telegram errors

## Security Notes

- ⚠️ Commands are only available to the configured chat ID
- ⚠️ Emergency commands (`/withdraw`) require careful consideration
- ⚠️ Always verify transaction hashes in Sui Explorer
- ⚠️ Never share your bot token or chat ID

## Future Commands

Planned additions:
- `/config` - View current configuration
- `/set [PARAM] [VALUE]` - Update settings
- `/history` - View transaction history
- `/analytics` - Performance analytics
- `/alerts [on/off]` - Toggle notifications

## Support

For issues or questions:
1. Check logs: Railway dashboard → Logs
2. Review documentation: See `README.md`
3. Check GitHub: https://github.com/chorley11/cetus-optimizer

