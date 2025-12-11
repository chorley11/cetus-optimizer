import 'dotenv/config';
import { SuiClient } from '@mysten/sui/client';
import { SuiService } from './services/sui';
import { CetusService } from './services/cetus';
import { PythService } from './services/pyth';
import { DatabaseService } from './services/database';
import { TelegramService } from './services/telegram';
import { PriceMonitor } from './core/priceMonitor';
import { StrategyEngine } from './core/strategyEngine';
import { PositionManager } from './core/positionManager';
import { SkimManager } from './core/skimManager';
import { BluefinPipeline } from './core/bluefinPipeline';
import { POOL_CONFIGS, GLOBAL_CONFIG } from './config';
import { Logger } from './utils/logger';
import { PoolConfig, Position } from './types';

class CetusOptimizer {
  private suiService: SuiService;
  private cetusService: CetusService;
  private db: DatabaseService;
  private telegram: TelegramService;
  private priceMonitor: PriceMonitor;
  private strategyEngine: StrategyEngine;
  private positionManager: PositionManager;
  private skimManager: SkimManager;
  private bluefinPipeline: BluefinPipeline;
  
  private monitoringInterval: NodeJS.Timeout | null = null;
  private startTime: Date = new Date();
  private poolStates: Map<string, { paused: boolean; consecutiveFailures: number }> = new Map();
  private balanceCheckCounter: number = 0;
  private lastBalanceAlert: Date | null = null;

  constructor() {
    // Initialize services
    const rpcUrl = process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io';
    const suiClient = new SuiClient({ url: rpcUrl });
    
            this.suiService = new SuiService();
            this.cetusService = new CetusService(suiClient, (process.env.SUI_NETWORK as 'mainnet' | 'testnet') || 'mainnet', this.suiService);
            const pythService = new PythService(suiClient);
            this.db = new DatabaseService();
    this.telegram = new TelegramService(
      process.env.TELEGRAM_BOT_TOKEN || '',
      process.env.TELEGRAM_CHAT_ID || ''
    );
    
            // Initialize core components
            this.priceMonitor = new PriceMonitor(this.cetusService, this.db, pythService);
    this.strategyEngine = new StrategyEngine();
    this.positionManager = new PositionManager(
      this.cetusService,
      this.suiService,
      this.db,
      this.strategyEngine
    );
    this.skimManager = new SkimManager(this.suiService, this.db, this.telegram);
    this.bluefinPipeline = new BluefinPipeline(this.db, this.telegram);

    // Initialize pool states and validate addresses
    POOL_CONFIGS.forEach(pool => {
      // Validate pool address
      if (!pool.address || pool.address.trim() === '' || pool.address === '0x') {
        Logger.warn(`Pool ${pool.name} has invalid address - disabling`, {
          address: pool.address,
          envVar: `POOL_${pool.name.replace('/', '_').toUpperCase()}`,
        });
        pool.enabled = false; // Disable pools with invalid addresses
      } else {
        this.poolStates.set(pool.address, { paused: false, consecutiveFailures: 0 });
      }
    });

    // Setup Telegram commands
    this.setupTelegramCommands();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize wallet
      const privateKey = process.env.MAIN_WALLET_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('MAIN_WALLET_PRIVATE_KEY not set in environment variables');
      }
      this.suiService.initializeWallet(privateKey);

      // Check wallet balance
      const address = this.suiService.getAddress();
      const balance = await this.suiService.getSuiBalance(address);
      Logger.info(`Wallet initialized`, { address, balance: `${balance} SUI` });

      if (balance < 0.5) {
        Logger.warn('Low wallet balance - may not have enough gas for operations');
      }

      Logger.info('Cetus Optimizer initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize optimizer', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    Logger.info('Starting Cetus Optimizer...');
    
    await this.initialize();

    // Start monitoring loop
    const intervalMs = GLOBAL_CONFIG.priceCheckIntervalMs;
    this.monitoringInterval = setInterval(() => {
      this.monitoringLoop().catch(error => {
        Logger.error('Error in monitoring loop', error);
      });
    }, intervalMs);

    // Run immediately
    await this.monitoringLoop();

    Logger.info(`Monitoring started - checking prices every ${intervalMs}ms`);
  }

  private async monitoringLoop(): Promise<void> {
    try {
      // Fetch prices for all enabled pools
      const enabledPools = POOL_CONFIGS.filter(p => p.enabled);
      const snapshots = await this.priceMonitor.fetchPricesForPools(enabledPools);

      // Process each pool
      for (const pool of enabledPools) {
        const state = this.poolStates.get(pool.address);
        if (state?.paused) {
          continue;
        }

        try {
          await this.processPool(pool, snapshots.get(pool.address));
          // Reset failure counter on success
          if (state) {
            state.consecutiveFailures = 0;
          }
        } catch (error) {
          Logger.error(`Error processing pool ${pool.name}`, error);
          if (state) {
            state.consecutiveFailures++;
            if (state.consecutiveFailures >= 3) {
              state.paused = true;
              await this.telegram.sendErrorAlert({
                type: 'Pool Paused',
                pool: pool.name,
                message: 'Pool paused due to consecutive failures',
                details: `Failed ${state.consecutiveFailures} times`,
              });
            }
          }
        }
      }

      // Check Bluefin thresholds
      await this.skimManager.checkBluefinThreshold();
    } catch (error) {
      Logger.error('Error in monitoring loop', error);
    }
  }

  private async processPool(pool: PoolConfig, snapshot?: any): Promise<void> {
    if (!snapshot) {
      Logger.warn(`No price snapshot for pool ${pool.name}`);
      return;
    }

    // Get active position
    const position = this.db.getActivePosition(pool.address);

    if (!position) {
      // No position - open initial position
      Logger.info(`No active position for ${pool.name}, opening initial position`);
      
      try {
        // Calculate initial range
        const { calculateNewRange } = require('./utils/math');
        const initialRange = calculateNewRange(
          snapshot.price,
          pool.rangeLowerBps,
          pool.rangeUpperBps
        );

        // Open position with zap-in (SUI only)
        const positionId = await this.positionManager.openPosition(
          pool,
          initialRange.lower,
          initialRange.upper,
          snapshot.price,
          true  // zapWithSui = true
        );

        Logger.info(`Initial position opened for ${pool.name}`, {
          positionId,
          range: initialRange,
          price: snapshot.price,
        });

        // Send Telegram notification
        if (GLOBAL_CONFIG.alertOnEveryRebalance) {
          await this.telegram.sendMessage(
            `✅ *INITIAL POSITION OPENED*\n\n` +
            `*Pool:* ${pool.name}\n` +
            `*Range:* $${initialRange.lower.toFixed(4)} - $${initialRange.upper.toFixed(4)}\n` +
            `*Current Price:* $${snapshot.price.toFixed(4)}\n` +
            `*Position Size:* $${pool.positionSizeUsd}\n` +
            `*Position ID:* ${positionId}`
          );
        }
      } catch (error) {
        Logger.error(`Failed to open initial position for ${pool.name}`, error);
        await this.telegram.sendErrorAlert({
          type: 'Initial Position Failed',
          pool: pool.name,
          message: `Failed to open initial position: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
      return;
    }

    // Check if rebalance is needed
    const decision = this.strategyEngine.shouldRebalancePosition(snapshot, position, pool);

    if (decision.shouldRebalance && decision.newRange) {
      Logger.info(`Rebalance triggered for ${pool.name}`);

      const result = await this.positionManager.rebalancePosition(
        pool,
        position,
        decision.newRange,
        snapshot.price,
        decision.triggerReason!
      );

      if (result.success && result.skimAmount) {
        // Transfer skim
        await this.skimManager.transferSkim(
          result.skimAmount.usdc,
          result.skimAmount.sui,
          pool.address,
          0 // rebalanceId would come from positionManager
        );

        // Send Telegram alert
        if (GLOBAL_CONFIG.alertOnEveryRebalance) {
          // Create rebalance object for alert
          const rebalance = {
            id: 0,
            poolAddress: pool.address,
            oldPositionId: position.id,
            newPositionId: 0,
            triggerPrice: snapshot.price,
            triggerReason: decision.triggerReason!,
            oldRange: { lower: position.priceLower, upper: position.priceUpper },
            newRange: decision.newRange,
            feesCollected: result.feesCollected || { tokenA: '0', tokenB: '0', usd: 0 },
            skimAmount: result.skimAmount,
            gasUsed: result.gasUsed || '0',
            txDigest: result.txDigest || '',
            executedAt: new Date(),
          };
          await this.telegram.sendRebalanceAlert(rebalance, pool.name);
        }
      }
    }
  }

  private async checkWalletBalance(): Promise<void> {
    try {
      const address = this.suiService.getAddress();
      const balance = await this.suiService.getSuiBalance(address);
      
      // Only alert if balance is low and we haven't alerted recently (within 24 hours)
      const now = new Date();
      const hoursSinceLastAlert = this.lastBalanceAlert
        ? (now.getTime() - this.lastBalanceAlert.getTime()) / (1000 * 60 * 60)
        : Infinity;
      
      if (balance < 0.1 && hoursSinceLastAlert >= 24) {
        Logger.warn('Low wallet balance detected during monitoring', { balance });
        await this.telegram.sendErrorAlert({
          type: 'Low Wallet Balance',
          message: `Wallet balance is critically low: ${balance.toFixed(4)} SUI. Need at least 0.1 SUI for gas. Please add more SUI to continue operations.`,
        });
        this.lastBalanceAlert = now;
      } else if (balance < 0.5 && hoursSinceLastAlert >= 24) {
        Logger.warn('Low wallet balance detected', { balance });
        await this.telegram.sendMessage(
          `⚠️ *LOW WALLET BALANCE*\n\n` +
          `Current: ${balance.toFixed(4)} SUI\n` +
          `Recommended: 1-5 SUI\n` +
          `Address: \`${address}\`\n\n` +
          `Consider adding more SUI for reliable operations.`
        );
        this.lastBalanceAlert = now;
      }
    } catch (error) {
      Logger.error('Failed to check wallet balance during monitoring', error);
      // Don't throw - balance check failure shouldn't stop monitoring
    }
  }

  private setupTelegramCommands(): void {
    this.telegram.setupCommands({
      status: async (msg) => {
        const uptime = this.getUptime();
        const metrics = await this.getPoolMetrics();
        await this.telegram.sendStatusUpdate(metrics, uptime);
      },
      pools: async (msg) => {
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
        
        await this.telegram.sendMessage(message);
      },
      skim: async (msg) => {
        const status = await this.bluefinPipeline.getDepositStatus();
        const message = `💰 *SKIM WALLET STATUS*

*USDC:* $${status.usdcBalance.toFixed(2)} / $${status.usdcThreshold}
*SUI:* ${status.suiBalance.toFixed(2)} / ${status.suiThreshold}

${status.readyForDeposit ? '✅ Ready for Bluefin deposit' : '⏳ Accumulating...'}`;
        await this.telegram.sendMessage(message);
      },
      pnl: async (msg) => {
        // Calculate P&L from database
      },
      pause: async (msg) => {
        const match = msg.text?.match(/\/pause (.+)/);
        if (match) {
          const poolName = match[1];
          // Pause pool logic
        }
      },
      resume: async (msg) => {
        const match = msg.text?.match(/\/resume (.+)/);
        if (match) {
          const poolName = match[1];
          // Resume pool logic
        }
      },
      rebalance: async (msg) => {
        // Manual rebalance
      },
      withdraw: async (msg) => {
        // Emergency withdraw
      },
      deposited: async (msg) => {
        // Mark deposit as completed
        await this.bluefinPipeline.recordDeposit('USDC', 0);
      },
      balance: async (msg) => {
        try {
          const address = this.suiService.getAddress();
          const suiBalance = await this.suiService.getSuiBalance(address);
          
          // Get USDC balance if possible
          const client = this.suiService.getClient();
          let usdcBalance = 0;
          try {
            const { getCoinBalance } = require('../utils/coinUtils');
            const usdcCoinType = process.env.USDC_COIN_TYPE || '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93b2::coin::COIN';
            const usdcBalanceRaw = await getCoinBalance(client, address, usdcCoinType);
            usdcBalance = Number(usdcBalanceRaw) / 1e6; // USDC has 6 decimals
          } catch (error) {
            // USDC balance check failed, continue with SUI only
          }
          
          // Get all coins for other tokens
          const allCoins = await client.getCoins({ owner: address });
          const otherTokens = allCoins.data
            .filter(c => c.coinType !== '0x2::sui::SUI')
            .slice(0, 5); // Limit to first 5 other tokens
          
          let message = `💰 *WALLET BALANCE*\n\n`;
          message += `*Address:* \`${address}\`\n\n`;
          message += `*SUI:* ${suiBalance.toFixed(4)} SUI\n`;
          
          if (suiBalance < 0.1) {
            message += `⚠️ *LOW BALANCE* - Need at least 0.1 SUI for gas\n`;
          } else if (suiBalance < 1) {
            message += `⚠️ Balance is low - Consider adding more SUI\n`;
          } else {
            message += `✅ Balance sufficient\n`;
          }
          
          if (usdcBalance > 0) {
            message += `\n*USDC:* $${usdcBalance.toFixed(2)}\n`;
          }
          
          if (otherTokens.length > 0) {
            message += `\n*Other Tokens:*\n`;
            for (const coin of otherTokens) {
              const symbol = coin.coinType.split('::').pop() || 'Unknown';
              const balance = Number(coin.balance) / 1e9; // Assume 9 decimals, adjust if needed
              message += `- ${symbol}: ${balance.toFixed(4)}\n`;
            }
          }
          
          message += `\n*Gas Estimate:*\n`;
          message += `- Per transaction: ~0.01-0.1 SUI\n`;
          message += `- Recommended reserve: 1-5 SUI\n`;
          
          await this.telegram.sendMessage(message);
        } catch (error) {
          Logger.error('Failed to get wallet balance', error);
          await this.telegram.sendMessage(`❌ Failed to get wallet balance: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      help: async (msg) => {
        const helpText = `*CETUS OPTIMIZER COMMANDS*

/status - Current status of all pools
/pools - Detailed pool metrics
/balance - Check wallet balance
/skim - Skim wallet balances
/pnl - Profit/loss summary
/pause [POOL] - Pause specific pool
/resume [POOL] - Resume specific pool
/rebalance [POOL] - Force manual rebalance
/withdraw [POOL] - Emergency withdraw
/deposited - Confirm Bluefin deposit
/help - Show this help`;
        await this.telegram.sendMessage(helpText);
      },
    });
  }

  private getUptime(): string {
    const uptimeMs = Date.now() - this.startTime.getTime();
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${minutes}m`;
  }

  private async getPoolMetrics(): Promise<any[]> {
    // Get metrics for all pools
    const metrics = [];
    for (const pool of POOL_CONFIGS) {
      const position = this.db.getActivePosition(pool.address);
      const snapshot = this.priceMonitor.getCachedPrice(pool.address);
      
      if (snapshot) {
        metrics.push({
          poolAddress: pool.name,
          currentPrice: snapshot.price,
          position,
          inRange: snapshot.inRange,
          distanceToLower: snapshot.distanceToLower,
          distanceToUpper: snapshot.distanceToUpper,
          shouldRebalance: position ? this.strategyEngine.shouldRebalancePosition(snapshot, position, pool).shouldRebalance : false,
          todaysFees: 0, // Would calculate from database
          todaysRebalances: 0, // Would calculate from database
        });
      }
    }
    return metrics;
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.db.close();
    Logger.info('Cetus Optimizer stopped');
  }
}

// Main entry point
async function main() {
  const optimizer = new CetusOptimizer();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    Logger.info('Received SIGINT, shutting down gracefully...');
    optimizer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    Logger.info('Received SIGTERM, shutting down gracefully...');
    optimizer.stop();
    process.exit(0);
  });

  try {
    await optimizer.start();
  } catch (error) {
    Logger.error('Fatal error starting optimizer', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main().catch(error => {
    Logger.error('Unhandled error', error);
    process.exit(1);
  });
}

export { CetusOptimizer };

