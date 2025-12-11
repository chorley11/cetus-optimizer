import TelegramBot from 'node-telegram-bot-api';
import { PoolMetrics, Rebalance, SkimWalletStatus } from '../types';
import { Logger } from '../utils/logger';

export class TelegramService {
  private bot: TelegramBot | null = null;
  private chatId: string;

  constructor(token: string, chatId: string) {
    this.chatId = chatId;
    try {
      this.bot = new TelegramBot(token, { polling: true });
      Logger.info('Telegram bot initialized with polling enabled');
      
      // Handle errors
      this.bot.on('polling_error', (error) => {
        Logger.error('Telegram polling error', error);
      });
      
      // Log when bot is ready
      this.bot.on('message', (msg) => {
        Logger.debug('Received Telegram message', { from: msg.from?.username, text: msg.text });
      });
    } catch (error) {
      Logger.error('Failed to initialize Telegram bot', error);
    }
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.bot) {
      Logger.warn('Telegram bot not initialized, message not sent', { text });
      return;
    }

    try {
      await this.bot.sendMessage(this.chatId, text, { parse_mode: 'Markdown' });
    } catch (error) {
      Logger.error('Failed to send Telegram message', error);
    }
  }

  async sendRebalanceAlert(rebalance: Rebalance, poolName: string): Promise<void> {
    const direction = rebalance.triggerReason === 'upper_breach' ? 'Upward (bullish move)' : 'Downward (bearish move)';
    const emoji = rebalance.triggerReason === 'upper_breach' ? '🔄' : '🔽';

    const message = `${emoji} *REBALANCE EXECUTED*

*Pool:* ${poolName}
*Trigger:* Price reached 80% of ${rebalance.triggerReason === 'upper_breach' ? 'upper' : 'lower'} bound
*Direction:* ${direction}

*Old Range:* $${rebalance.oldRange.lower.toFixed(4)} - $${rebalance.oldRange.upper.toFixed(4)}
*New Range:* $${rebalance.newRange.lower.toFixed(4)} - $${rebalance.newRange.upper.toFixed(4)}
*Current Price:* $${rebalance.triggerPrice.toFixed(4)}

*Fees Collected:* $${rebalance.feesCollected.usd.toFixed(2)}
*Skim Amount:* $${rebalance.skimAmount.usdc.toFixed(2)} USDC, ${rebalance.skimAmount.sui.toFixed(4)} SUI
*Gas Used:* ${rebalance.gasUsed}

*TX:* https://suiscan.xyz/mainnet/tx/${rebalance.txDigest}`;

    await this.sendMessage(message);
  }

  async sendBluefinDepositAlert(status: SkimWalletStatus): Promise<void> {
    const usdcStatus = status.usdcBalance >= status.usdcThreshold ? '✅' : '❌';
    const suiStatus = status.suiBalance >= status.suiThreshold ? '✅' : '❌';

    const message = `🏦 *BLUEFIN DEPOSIT READY*

Your skim wallet has reached the deposit threshold!

*Current Balances:*
- USDC: $${status.usdcBalance.toFixed(2)} ${usdcStatus} (threshold: $${status.usdcThreshold})
- SUI: ${status.suiBalance.toFixed(2)} SUI ${suiStatus} (threshold: ${status.suiThreshold})

*Recommended Action:*
Deposit to Bluefin Lending

*Current Bluefin APY:*
- USDC Lending: ~25% APR
- SUI Lending: ~12% APR

*Steps:*
1. Connect skim wallet to Bluefin
2. Navigate to Lending tab
3. Deposit accumulated funds

Bluefin: https://trade.bluefin.io/lend

Reply /deposited to confirm and reset tracking`;

    await this.sendMessage(message);
  }

  async sendDailySummary(summary: {
    date: string;
    totalFees: number;
    totalRebalances: number;
    gasCosts: number;
    netPnl: number;
    poolBreakdown: Array<{ name: string; fees: number; rebalances: number; rangePct: number }>;
    skimAccumulation: { usdc: number; sui: number };
    portfolioValue: number;
  }): Promise<void> {
    const message = `📊 *DAILY SUMMARY - ${summary.date}*

*Overall Performance:*
- Total Fees: $${summary.totalFees.toFixed(2)}
- Rebalances: ${summary.totalRebalances}
- Gas Costs: $${summary.gasCosts.toFixed(2)}
- Net P&L: $${summary.netPnl.toFixed(2)}

*Pool Breakdown:*
\`\`\`
┌─────────┬────────┬─────────┬────────┐
│ Pool    │ Fees   │ Rebals  │ Range% │
├─────────┼────────┼─────────┼────────┤
${summary.poolBreakdown.map(p => `│ ${p.name.padEnd(7)} │ $${p.fees.toFixed(2).padStart(6)} │ ${p.rebalances.toString().padStart(7)} │ ${p.rangePct.toFixed(1).padStart(5)}% │`).join('\n')}
└─────────┴────────┴─────────┴────────┘
\`\`\`

*Skim Accumulation:*
- Today: +$${summary.skimAccumulation.usdc.toFixed(2)} USDC, +${summary.skimAccumulation.sui.toFixed(2)} SUI
- Total: $${summary.skimAccumulation.usdc.toFixed(2)} USDC, ${summary.skimAccumulation.sui.toFixed(2)} SUI

*Portfolio Value:* $${summary.portfolioValue.toFixed(2)}`;

    await this.sendMessage(message);
  }

  async sendErrorAlert(error: {
    type: string;
    pool?: string;
    message: string;
    details?: string;
  }): Promise<void> {
    const message = `🚨 *ERROR ALERT*

*Type:* ${error.type}
${error.pool ? `*Pool:* ${error.pool}\n` : ''}*Time:* ${new Date().toISOString()}

*Error:* ${error.message}
${error.details ? `\n*Details:* ${error.details}` : ''}

*Action Required:*
- Check system status
- Review logs for details`;

    await this.sendMessage(message);
  }

  async sendStatusUpdate(metrics: PoolMetrics[], uptime: string): Promise<void> {
    const poolsTable = metrics.map(m => {
      const status = m.inRange ? '✅ IN' : '⚠️ OUT';
      const rangePct = m.inRange 
        ? Math.min(m.distanceToLower, m.distanceToUpper).toFixed(0)
        : 'N/A';
      return `│ ${m.poolAddress.slice(0, 8)}... │ ${status} │ ${rangePct.padStart(5)}% │`;
    }).join('\n');

    const message = `🤖 *CETUS OPTIMIZER STATUS*

*Uptime:* ${uptime}
*Health:* ✅ Healthy

\`\`\`
┌─────────┬────────┬────────┬────────┐
│ Pool    │ Status │ Range% │ 24h    │
├─────────┼────────┼────────┼────────┤
${poolsTable}
└─────────┴────────┴────────┴────────┘
\`\`\`

Reply /pools for detailed view`;

    await this.sendMessage(message);
  }

  setupCommands(handlers: Record<string, (msg: TelegramBot.Message) => Promise<void>>): void {
    if (!this.bot) return;

    this.bot.onText(/\/start/, async (msg: TelegramBot.Message) => {
      await this.sendMessage('🤖 Cetus Optimizer is running!\n\nUse /help to see all commands.');
    });

    this.bot.onText(/\/status/, handlers.status || (() => Promise.resolve()));
    this.bot.onText(/\/pools/, handlers.pools || (() => Promise.resolve()));
    this.bot.onText(/\/skim/, handlers.skim || (() => Promise.resolve()));
    this.bot.onText(/\/pnl/, handlers.pnl || (() => Promise.resolve()));
    this.bot.onText(/\/pause (.+)/, handlers.pause || (() => Promise.resolve()));
    this.bot.onText(/\/resume (.+)/, handlers.resume || (() => Promise.resolve()));
    this.bot.onText(/\/rebalance (.+)/, handlers.rebalance || (() => Promise.resolve()));
    this.bot.onText(/\/withdraw (.+)/, handlers.withdraw || (() => Promise.resolve()));
    this.bot.onText(/\/deposited/, handlers.deposited || (() => Promise.resolve()));
    this.bot.onText(/\/help/, handlers.help || (() => Promise.resolve()));
  }
}

