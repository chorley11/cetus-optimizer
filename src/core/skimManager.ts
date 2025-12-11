import { Transaction } from '@mysten/sui/transactions';
import { SuiService } from '../services/sui';
import { DatabaseService } from '../services/database';
import { TelegramService } from '../services/telegram';
import { GLOBAL_CONFIG } from '../config';
import { Logger } from '../utils/logger';
import { getCoinObjects, getCoinBalance } from '../utils/coinUtils';

export class SkimManager {
  private suiService: SuiService;
  private db: DatabaseService;
  private telegram: TelegramService;

  constructor(
    suiService: SuiService,
    db: DatabaseService,
    telegram: TelegramService
  ) {
    this.suiService = suiService;
    this.db = db;
    this.telegram = telegram;
  }

  async transferSkim(
    usdcAmount: number,
    suiAmount: number,
    poolAddress: string,
    rebalanceId: number
  ): Promise<string | null> {
    if (usdcAmount <= 0 && suiAmount <= 0) {
      return null;
    }

    try {
      const txb = new Transaction();
      const skimWalletAddress = GLOBAL_CONFIG.skimWalletAddress;

      if (!skimWalletAddress) {
        Logger.warn('Skim wallet address not configured, skipping transfer');
        return null;
      }

      const mainWalletAddress = this.suiService.getAddress();

      // Transfer SUI if amount > 0
      if (suiAmount > 0) {
        const suiAmountMist = BigInt(Math.floor(suiAmount * 1e9));
        txb.transferObjects(
          [txb.splitCoins(txb.gas, [suiAmountMist])],
          skimWalletAddress
        );
      }

      // Transfer USDC if amount > 0
      if (usdcAmount > 0) {
        try {
          // Get USDC coin type address (from environment or config)
          const usdcCoinType = process.env.USDC_COIN_TYPE || '0x...::usdc::USDC';
          
          // Check balance
          const client = this.suiService.getClient();
          const balance = await getCoinBalance(client, mainWalletAddress, usdcCoinType);
          const usdcAmountMist = BigInt(Math.floor(usdcAmount * 1e6)); // USDC has 6 decimals
          
          if (balance < usdcAmountMist) {
            Logger.warn(`Insufficient USDC balance. Have: ${balance}, Need: ${usdcAmountMist}`);
            // Record partial transfer
            const actualUsdc = Number(balance) / 1e6;
            this.db.recordSkim(poolAddress, rebalanceId, actualUsdc, suiAmount);
            return null;
          }
          
          // Get coin objects
          const coinObjects = await getCoinObjects(client, mainWalletAddress, usdcCoinType);
          
          if (coinObjects.length === 0) {
            Logger.warn('No USDC coin objects found');
            return null;
          }
          
          // If multiple coins, merge them first
          if (coinObjects.length > 1) {
            const primaryCoin = txb.object(coinObjects[0]);
            const otherCoins = coinObjects.slice(1).map(id => txb.object(id));
            txb.mergeCoins(primaryCoin, otherCoins);
          }
          
          // Split the amount needed
          const coinToTransfer = txb.splitCoins(
            txb.object(coinObjects[0]),
            [usdcAmountMist]
          );
          
          // Transfer USDC
          txb.transferObjects([coinToTransfer], skimWalletAddress);
          
          Logger.info(`USDC transfer prepared: $${usdcAmount}`);
        } catch (error) {
          Logger.error('Failed to prepare USDC transfer', error);
          // Continue with SUI transfer if USDC fails
        }
      }

      // Execute transaction if there's anything to transfer
      let txDigest: string | null = null;
      if (suiAmount > 0 || usdcAmount > 0) {
        // Check if transaction has any operations
        // If txb has operations, execute it
        try {
          txDigest = await this.suiService.executeTransaction(txb);
          
          // Record skim in database
          this.db.recordSkim(poolAddress, rebalanceId, usdcAmount, suiAmount, txDigest);

          Logger.info(`Skim transferred`, {
            usdc: usdcAmount,
            sui: suiAmount,
            txDigest,
          });
        } catch (error) {
          Logger.error('Failed to execute skim transfer transaction', error);
          // Record attempt even if transfer fails
          this.db.recordSkim(poolAddress, rebalanceId, usdcAmount, suiAmount);
        }
      } else {
        // Record even if no transfer
        this.db.recordSkim(poolAddress, rebalanceId, usdcAmount, suiAmount);
      }

      return txDigest;
    } catch (error) {
      Logger.error('Failed to transfer skim', error);
      // Don't throw - we still want to record the skim attempt
      this.db.recordSkim(poolAddress, rebalanceId, usdcAmount, suiAmount);
      return null;
    }
  }

  async checkBluefinThreshold(): Promise<void> {
    const status = this.db.getSkimWalletStatus(GLOBAL_CONFIG.skimThresholds);

    if (status.readyForDeposit) {
      // Check if we've already sent an alert recently (within last 24 hours)
      const lastAlert = status.lastAlertSent;
      const now = new Date();
      const hoursSinceLastAlert = lastAlert
        ? (now.getTime() - lastAlert.getTime()) / (1000 * 60 * 60)
        : Infinity;

      if (hoursSinceLastAlert >= 24) {
        await this.telegram.sendBluefinDepositAlert(status);
        this.db.markDepositAlertSent();
        Logger.info('Bluefin deposit alert sent', status);
      }
    }
  }
}

