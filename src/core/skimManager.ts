import { Transaction } from '@mysten/sui/transactions';
import { SuiService } from '../services/sui';
import { DatabaseService } from '../services/database';
import { TelegramService } from '../services/telegram';
import { GLOBAL_CONFIG } from '../config';
import { Logger } from '../utils/logger';

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
      // Note: In production, you'll need to get the USDC coin object and transfer it
      // This is a simplified version
      if (usdcAmount > 0) {
        Logger.info(`USDC transfer not yet implemented - would transfer $${usdcAmount}`);
        // TODO: Implement USDC transfer using coin objects
      }

      // Execute transaction if there's anything to transfer
      let txDigest: string | null = null;
      if (suiAmount > 0) {
        txDigest = await this.suiService.executeTransaction(txb);
        
        // Record skim in database
        this.db.recordSkim(poolAddress, rebalanceId, usdcAmount, suiAmount, txDigest);

        Logger.info(`Skim transferred`, {
          usdc: usdcAmount,
          sui: suiAmount,
          txDigest,
        });
      } else {
        // Record even if no transfer (for USDC-only skims that aren't implemented yet)
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

