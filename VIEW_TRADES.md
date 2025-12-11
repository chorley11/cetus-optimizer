# How to View Trades

There are several ways to view your trades and rebalances:

## 1. Telegram Bot Commands (Easiest)

### View Status
```
/status
```
Shows current status of all pools and recent activity.

### View Detailed Pool Metrics
```
/pools
```
Shows detailed metrics for each pool including:
- Current positions
- Today's fees
- Today's rebalances
- Range information

### View P&L Summary
```
/pnl
```
Shows profit/loss summary (when implemented).

## 2. Command Line Script

### View All Recent Trades
```bash
npm run trades
```

### View Today's Trades Only
```bash
npm run trades -- --today
```

### View Trades for Specific Pool
```bash
npm run trades -- --pool 0x5cf7e2ec9311d9057e43477a29bd457c51beeb1ddcd151c385a295dbb3c0fb18
```

### Limit Number of Results
```bash
npm run trades -- --limit 50
```

### Combine Options
```bash
npm run trades -- --pool 0x5cf7e2ec9311d9057e43477a29bd457c51beeb1ddcd151c385a295dbb3c0fb18 --today --limit 10
```

## 3. Direct Database Access

### Using SQLite CLI
```bash
sqlite3 data/optimizer.db
```

### Useful Queries

**View all rebalances:**
```sql
SELECT * FROM rebalances ORDER BY executed_at DESC LIMIT 20;
```

**View today's trades:**
```sql
SELECT * FROM rebalances 
WHERE DATE(executed_at) = DATE('now') 
ORDER BY executed_at DESC;
```

**View fees collected:**
```sql
SELECT 
  pool_address,
  SUM(fees_collected_usd) as total_fees,
  COUNT(*) as rebalance_count
FROM rebalances
GROUP BY pool_address;
```

**View position history:**
```sql
SELECT 
  p.*,
  r.executed_at as rebalance_time,
  r.trigger_reason
FROM positions p
LEFT JOIN rebalances r ON p.id = r.new_position_id
ORDER BY p.opened_at DESC;
```

**View skim accumulation:**
```sql
SELECT 
  SUM(usdc_amount) as total_usdc,
  SUM(sui_amount) as total_sui,
  COUNT(*) as skim_count
FROM skim_ledger;
```

## 4. View on Cetus DEX

You can also view your positions directly on Cetus DEX:

1. Go to https://app.cetus.xyz
2. Connect your wallet (use your wallet address)
3. Navigate to "Liquidity" or "Positions"
4. View all your active LP positions

## 5. View Transaction History on Sui Explorer

Each rebalance creates a transaction. You can view them on Sui Explorer:

1. Go to https://suiscan.xyz/mainnet
2. Search for your wallet address (use your actual wallet address)
3. View all transactions
4. Filter by "Cetus" or "CLMM" to see LP-related transactions

## Trade Information Available

Each trade/rebalance includes:
- **Pool**: Which pool (SUI/USDC, DEEP/SUI, WAL/SUI)
- **Time**: When the rebalance occurred
- **Trigger**: Why it rebalanced (upper_breach, lower_breach)
- **Price**: Price at time of rebalance
- **Range Change**: Old range → New range
- **Fees Collected**: Fees earned from the position
- **Skim Amount**: Profit skimmed to accumulation wallet
- **Gas Used**: Transaction cost
- **Transaction Hash**: Link to Sui Explorer

## Example Output

```
📊 TRADE HISTORY
================================================================================

Trade #1
Pool: SUI/USDC
Time: 12/11/2024, 3:45:23 PM
Trigger: upper_breach at $3.5500

Range Change:
  Old: $3.4200 - $3.5800
  New: $3.4700 - $3.6300

Fees Collected: $12.45
Skim: $1.24 USDC, 0.0037 SUI
Gas: 0.002 SUI
TX: https://suiscan.xyz/mainnet/tx/0x...
--------------------------------------------------------------------------------

📈 SUMMARY
Total Trades: 5
Total Fees: $45.20
Total Skim: $4.52 USDC, 0.0135 SUI
```

## Tips

- **Telegram**: Best for quick status checks and alerts
- **Command Line**: Best for detailed analysis and filtering
- **Database**: Best for custom queries and data analysis
- **Cetus DEX**: Best for seeing positions visually
- **Sui Explorer**: Best for transaction details and verification

