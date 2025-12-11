import 'dotenv/config';
import { SuiClient } from '@mysten/sui/client';
import { SuiService } from './services/sui';
import { CetusService } from './services/cetus';
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

  constructor() {
    // Initialize services
    const rpcUrl = process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io';
    const suiClient = new SuiClient({ url: rpcUrl });
    
    this.suiService = new SuiService();
    this.cetusService = new CetusService(suiClient, (process.env.SUI_NETWORK as 'mainnet' | 'testnet') || 'mainnet');
    this.db = new DatabaseService();
    this.telegram = new TelegramService(
      process.env.TELEGRAM_BOT_TOKEN || '',
      process.env.TELEGRAM_CHAT_ID || ''
    );
    
    // Initialize core components
    this.priceMonitor = new PriceMonitor(this.cetusService, this.db);
    this.strategyEngine = new StrategyEngine();
    this.positionManager = new PositionManager(
      this.cetusService,
      this.suiService,
      this.db,
      this.strategyEngine
    );
    this.skimManager = new SkimManager(this.suiService, this.db, this.telegram);
    this.bluefinPipeline = new BluefinPipeline(this.db, this.telegram);

    // Initialize pool states
    POOL_CONFIGS.forEach(pool => {
      this.poolStates.set(pool.address, { paused: false, consecutiveFailures: 0 });
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
      // No position - check if we should open one
      Logger.info(`No active position for ${pool.name}, would open position at current price`);
      // In production, implement initial position opening logic
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

  private setupTelegramCommands(): void {
    this.telegram.setupCommands({
      status: async (msg) => {
        const uptime = this.getUptime();
        const metrics = await this.getPoolMetrics();
        await this.telegram.sendStatusUpdate(metrics, uptime);
      },
      pools: async (msg) => {
        // Detailed pool metrics
        const metrics = await this.getPoolMetrics();
        // Send detailed view
      },
      skim: async (msg) => {
        const status = await this.bluefinPipeline.getDepositStatus();
        const message = `💰 *SKIM WALLET STATUS*

*USDC:* $${status.usdcBalance.toFixed(2)} / $${status.usdcThreshold}
*SUI:* ${status.suiBalance.toFixed(2)} / ${status.suiThreshold}

${status.readyForDeposit ? '✅ Ready for Bluefin deposit' : '⏳ Accumulating...'}`;
        // Send via telegram
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
      help: async (msg) => {
        const helpText = `*CETUS OPTIMIZER COMMANDS*

/status - Current status of all pools
/pools - Detailed pool metrics
/skim - Skim wallet balances
/pnl - Profit/loss summary
/pause [POOL] - Pause specific pool
/resume [POOL] - Resume specific pool
/rebalance [POOL] - Force manual rebalance
/withdraw [POOL] - Emergency withdraw
/deposited - Confirm Bluefin deposit
/help - Show this help`;
        // Send via telegram
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

