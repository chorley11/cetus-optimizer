import { TelegramBot } from 'node-telegram-bot-api';
import { DatabaseService } from '../services/database';
import { BluefinPipeline } from './bluefinPipeline';
import { PositionManager } from './positionManager';
import { PriceMonitor } from './priceMonitor';
import { POOL_CONFIGS, GLOBAL_CONFIG } from '../config';
import { Logger } from '../utils/logger';
import { PoolMetrics } from '../types';

export class TelegramCommands {
  private db: DatabaseService;
  private bluefinPipeline: BluefinPipeline;
  private positionManager: PositionManager;
  private priceMonitor: PriceMonitor;
  private poolStates: Map<string, { paused: boolean }>;

  constructor(
    db: DatabaseService,
    bluefinPipeline: BluefinPipeline,
    positionManager: PositionManager,
    priceMonitor: PriceMonitor,
    poolStates: Map<string, { paused: boolean }>
  ) {
    this.db = db;
    this.bluefinPipeline = bluefinPipeline;
    this.positionManager = positionManager;
    this.priceMonitor = priceMonitor;
    this.poolStates = poolStates;
  }

  async handleStatus(bot: TelegramBot, chatId: number): Promise<void> {
    const metrics = await this.getPoolMetrics();
    const uptime = this.getUptime();
    
    const poolsTable = metrics.map(m => {
      const pool = POOL_CONFIGS.find(p => p.address === m.poolAddress);
      const name = pool?.name || m.poolAddress.slice(0, 8);
      const status = m.inRange ? '✅ IN' : '⚠️ OUT';
      const rangePct = m.inRange 
        ? Math.min(m.distanceToLower, m.distanceToUpper).toFixed(0)
        : 'N/A';
      return `│ ${name.padEnd(9)} │ ${status} │ ${rangePct.padStart(5)}% │`;
    }).join('\n');

    const message = `🤖 *CETUS OPTIMIZER STATUS*

*Uptime:* ${uptime}
*Health:* ✅ Healthy

\`\`\`
┌───────────┬────────┬────────┬────────┐
│ Pool      │ Status │ Range% │ 24h    │
├───────────┼────────┼────────┼────────┤
${poolsTable}
└───────────┴────────┴────────┴────────┘
\`\`\`

Reply /pools for detailed view`;

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  async handlePools(bot: TelegramBot, chatId: number): Promise<void> {
    const metrics = await this.getPoolMetrics();
    
    let message = `📊 *DETAILED POOL METRICS*\n\n`;
    
    for (const metric of metrics) {
      const pool = POOL_CONFIGS.find(p => p.address === metric.poolAddress);
      const name = pool?.name || 'Unknown';
      const position = metric.position;
      
      message += `*${name}*\n`;
      message += `Price: $${metric.currentPrice.toFixed(4)}\n`;
      message += `In Range: ${metric.inRange ? '✅' : '❌'}\n`;
      
      if (position) {
        message += `Position: ${position.positionId.slice(0, 16)}...\n`;
        message += `Range: $${position.priceLower.toFixed(4)} - $${position.priceUpper.toFixed(4)}\n`;
        message += `Value: $${position.entryValueUsd.toFixed(2)}\n`;
      } else {
        message += `Position: None\n`;
      }
      
      message += `Rebalances Today: ${metric.todaysRebalances}\n`;
      message += `Fees Today: $${metric.todaysFees.toFixed(2)}\n\n`;
    }
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  async handleSkim(bot: TelegramBot, chatId: number): Promise<void> {
    const status = await this.bluefinPipeline.getDepositStatus();
    
    const message = `💰 *SKIM WALLET STATUS*

*USDC:* $${status.usdcBalance.toFixed(2)} / $${status.usdcThreshold}
*SUI:* ${status.suiBalance.toFixed(2)} / ${status.suiThreshold}

${status.readyForDeposit ? '✅ Ready for Bluefin deposit' : '⏳ Accumulating...'}`;
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  async handlePause(bot: TelegramBot, chatId: number, poolName: string): Promise<void> {
    if (poolName.toLowerCase() === 'all') {
      POOL_CONFIGS.forEach(pool => {
        const state = this.poolStates.get(pool.address);
        if (state) {
          state.paused = true;
        }
      });
      await bot.sendMessage(chatId, '✅ All pools paused');
    } else {
      const pool = POOL_CONFIGS.find(p => p.name.toLowerCase() === poolName.toLowerCase());
      if (pool) {
        const state = this.poolStates.get(pool.address);
        if (state) {
          state.paused = true;
          await bot.sendMessage(chatId, `✅ Pool ${pool.name} paused`);
        } else {
          await bot.sendMessage(chatId, `❌ Pool ${poolName} not found`);
        }
      } else {
        await bot.sendMessage(chatId, `❌ Pool ${poolName} not found`);
      }
    }
  }

  async handleResume(bot: TelegramBot, chatId: number, poolName: string): Promise<void> {
    if (poolName.toLowerCase() === 'all') {
      POOL_CONFIGS.forEach(pool => {
        const state = this.poolStates.get(pool.address);
        if (state) {
          state.paused = false;
        }
      });
      await bot.sendMessage(chatId, '✅ All pools resumed');
    } else {
      const pool = POOL_CONFIGS.find(p => p.name.toLowerCase() === poolName.toLowerCase());
      if (pool) {
        const state = this.poolStates.get(pool.address);
        if (state) {
          state.paused = false;
          await bot.sendMessage(chatId, `✅ Pool ${pool.name} resumed`);
        } else {
          await bot.sendMessage(chatId, `❌ Pool ${poolName} not found`);
        }
      } else {
        await bot.sendMessage(chatId, `❌ Pool ${poolName} not found`);
      }
    }
  }

  private async getPoolMetrics(): Promise<PoolMetrics[]> {
    const metrics: PoolMetrics[] = [];
    
    for (const pool of POOL_CONFIGS) {
      const position = this.db.getActivePosition(pool.address);
      const snapshot = this.priceMonitor.getCachedPrice(pool.address);
      
      if (snapshot) {
        // Calculate today's metrics from database
        const today = new Date().toISOString().split('T')[0];
        // In production, query database for actual metrics
        const todaysRebalances = 0; // Would query from database
        const todaysFees = 0; // Would query from database
        
        metrics.push({
          poolAddress: pool.address,
          currentPrice: snapshot.price,
          position: position || undefined,
          inRange: snapshot.inRange,
          distanceToLower: snapshot.distanceToLower,
          distanceToUpper: snapshot.distanceToUpper,
          shouldRebalance: false, // Would calculate from strategy engine
          todaysFees,
          todaysRebalances,
        });
      }
    }
    
    return metrics;
  }

  private getUptime(): string {
    // Would track start time
    return '0d 0h 0m';
  }
}

